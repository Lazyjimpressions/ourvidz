import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCachedData, getDatabaseTemplate } from '../_shared/cache-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Module-level cache for system config to avoid frequent reads
let cachedChatWorkerUrl: string | null = null;
let cachedConfigFetchedAt = 0;
const CONFIG_TTL_MS = 60_000;

// Module-level cache for admin role checks (TTL 60s)
const adminRoleCache = new Map<string, { isAdmin: boolean; ts: number }>();
const ADMIN_ROLE_TTL_MS = 60_000;

interface RoleplayChatRequest {
  message?: string; // Optional for kickoff
  conversation_id: string;
  character_id: string;
  model_provider: 'chat_worker' | 'openrouter' | 'claude' | 'gpt';
  model_variant?: string;
  memory_tier: 'conversation' | 'character' | 'profile';
  content_tier: 'sfw' | 'nsfw';
  scene_generation?: boolean;
  user_id?: string;
  scene_context?: string;
  scene_system_prompt?: string;
  kickoff?: boolean; // New field for scene kickoff
}

interface RoleplayChatResponse {
  success: boolean;
  response?: string;
  error?: string;
  model_used?: string;
  memory_updated?: boolean;
  scene_generated?: boolean;
  consistency_score?: number;
  processing_time?: number;
  message_id?: string; // For kickoff messages
}

interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          character_id: string | null;
          user_character_id: string | null;
          title: string;
          conversation_type: string;
          status: string;
          memory_tier: string;
          memory_data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          project_id?: string | null;
          character_id?: string | null;
          user_character_id?: string | null;
          title?: string;
          conversation_type?: string;
          status?: string;
          memory_tier?: string;
          memory_data?: any;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender: 'user' | 'assistant';
          content: string;
          message_type: string;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender: 'user' | 'assistant';
          content: string;
          message_type?: string;
        };
      };
      characters: {
        Row: {
          id: string;
          name: string;
          description: string;
          image_url: string;
          preview_image_url: string;
          quick_start: boolean;
          seed_locked: number | null;
          base_prompt: string | null;
          consistency_method: string;
          created_at: string;
        };
      };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let dbReadTime = 0;
  let promptTime = 0;
  let workerTime = 0;
  let dbWriteTime = 0;

  try {
    const requestBody: RoleplayChatRequest = await req.json();
    const {
      message,
      conversation_id,
      character_id,
      model_provider,
      model_variant,
      memory_tier,
      content_tier,
      scene_generation,
      user_id,
      scene_context,
      scene_system_prompt,
      kickoff
    } = requestBody;

    // Validate required fields (message is optional for kickoff)
    if ((!message && !kickoff) || !conversation_id || !character_id || !model_provider || !memory_tier || !content_tier) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: conversation_id, character_id, model_provider, memory_tier, content_tier (message required unless kickoff=true)'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('🎭 Roleplay request:', { 
      kickoff, 
      has_scene_context: !!scene_context, 
      has_scene_system_prompt: !!scene_system_prompt,
      character_id,
      content_tier,
      scene_context_preview: scene_context ? scene_context.substring(0, 50) + '...' : 'none',
      scene_system_prompt_preview: scene_system_prompt ? scene_system_prompt.substring(0, 50) + '...' : 'none'
    });

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Get character information
    const dbReadStart = Date.now();
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', character_id)
      .single();

    if (characterError || !character) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Character not found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Get conversation and memory data
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (conversationError || !conversation) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Conversation not found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Get recent messages for context
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch conversation history'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    dbReadTime = Date.now() - dbReadStart;

    // Build context-aware prompt
    const promptStart = Date.now();
    const context = buildRoleplayContext(character, recentMessages, memory_tier, content_tier, scene_context, scene_system_prompt);
    
    // ✅ PREVENT RE-INTRODUCTIONS: Check if conversation already has messages
    let userMessage: string;
    if (kickoff && recentMessages && recentMessages.length > 0) {
      console.log('🔄 Conversation already has messages - avoiding re-introduction');
      userMessage = "Continue the conversation naturally from where we left off.";
    } else {
      userMessage = kickoff ? 
        "Introduce yourself and set the scene. Be natural and in-character." : 
        message!;
    }
    
    const enhancedPrompt = buildEnhancedPrompt(userMessage, context, character, content_tier);
    promptTime = Date.now() - promptStart;

    // Route to appropriate model provider
    const workerStart = Date.now();
    let response: string;
    let modelUsed: string;

    switch (model_provider) {
      case 'chat_worker':
        const systemPrompt = buildSystemPrompt(character, recentMessages, content_tier, scene_context, scene_system_prompt, kickoff);
        response = await callChatWorker(systemPrompt, userMessage, content_tier);
        modelUsed = 'chat_worker';
        break;
      case 'openrouter':
        response = await callOpenRouter(enhancedPrompt, model_variant || 'claude-3.5-sonnet', content_tier);
        modelUsed = `openrouter:${model_variant || 'claude-3.5-sonnet'}`;
        break;
      case 'claude':
        response = await callClaude(enhancedPrompt, content_tier);
        modelUsed = 'claude';
        break;
      case 'gpt':
        response = await callGPT(enhancedPrompt, model_variant || 'gpt-4', content_tier);
        modelUsed = `gpt:${model_variant || 'gpt-4'}`;
        break;
      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unsupported model provider: ${model_provider}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
    }

    // Sanitize the response to remove generic greetings
    response = sanitizeResponse(response, character, kickoff);
    console.log('✅ Response after sanitization:', response.substring(0, 100) + '...');

    workerTime = Date.now() - workerStart;

    // Save assistant message to database
    const dbWriteStart = Date.now();
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender: 'assistant',
        content: response,
        message_type: kickoff ? 'scene_kickoff' : 'roleplay_chat'
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Failed to save assistant message:', saveError);
    }

    // Update memory data if needed (not for kickoff)
    let memoryUpdated = false;
    if (memory_tier !== 'conversation' && !kickoff && message) {
      const memoryUpdate = await updateMemoryData(supabase, conversation_id, character_id, user_id, memory_tier, message, response);
      memoryUpdated = memoryUpdate;
    }

    dbWriteTime = Date.now() - dbWriteStart;

    // Handle scene generation if requested
    let sceneGenerated = false;
    let consistencyScore = 0;
    if (scene_generation) {
      const sceneResult = await generateScene(supabase, character_id, response, character.consistency_method);
      sceneGenerated = sceneResult.success;
      consistencyScore = sceneResult.consistency_score || 0;
    }

    const totalTime = Date.now() - startTime;

    const responseData: RoleplayChatResponse = {
      success: true,
      response,
      model_used: modelUsed,
      memory_updated: memoryUpdated,
      scene_generated: sceneGenerated,
      consistency_score: consistencyScore,
      processing_time: totalTime,
      message_id: savedMessage?.id
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Roleplay chat error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      processing_time: Date.now() - startTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Function to sanitize model responses and remove generic greetings
function sanitizeResponse(response: string, character: any, isKickoff: boolean = false): string {
  if (!response) return response;
  
  let sanitized = response.trim();
  
  // List of generic greetings to remove (case insensitive)
  const genericGreetings = [
    'Hello! How can I assist you today?',
    'Hi there! How can I help you?',
    'Greetings! How may I assist you?',
    'Hello! What can I do for you?',
    'Hi! How can I be of service?',
    'Hello there! How can I help?',
    'Good day! How may I help you?',
    'Hi! What would you like to know?',
    'Hello! I\'m here to help.',
    'Greetings! What can I do for you?'
  ];
  
  // Remove generic greetings from start of response
  for (const greeting of genericGreetings) {
    const regex = new RegExp(`^${greeting.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    sanitized = sanitized.replace(regex, '');
  }
  
  // Remove common AI assistant phrases
  const aiPhrases = [
    'As an AI assistant,',
    'I\'m an AI and',
    'As an artificial intelligence,',
    'I\'m here to assist',
    'How may I be of assistance',
    'I\'m designed to help'
  ];
  
  for (const phrase of aiPhrases) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    sanitized = sanitized.replace(regex, '');
  }
  
  // If response is too short after sanitization and it's not a kickoff, keep original
  if (sanitized.trim().length < 10 && !isKickoff) {
    return response;
  }
  
  // Clean up any resulting issues
  sanitized = sanitized.replace(/^\s*[,.\-!?]+\s*/, ''); // Remove leading punctuation
  sanitized = sanitized.replace(/\s+/g, ' ').trim(); // Clean whitespace
  
  // If completely empty after sanitization, use character-appropriate fallback
  if (!sanitized.trim()) {
    return isKickoff 
      ? `*${character.name} looks around and takes in the scene*`
      : `*${character.name} continues the conversation naturally*`;
  }
  
  return sanitized;
}
function sanitizeSceneContext(sceneContext?: string): string | undefined {
  if (!sceneContext) return undefined;
  
  // Remove SQL fragments, system prompts, and excessive whitespace
  let cleaned = sceneContext
    .replace(/CREATE\s+TABLE\s+[^;]+;/gi, '')
    .replace(/INSERT\s+INTO\s+[^;]+;/gi, '')
    .replace(/SELECT\s+[^;]+;/gi, '')
    .replace(/You are a[^.]*\./gi, '')
    .replace(/\[SCENE_GENERATION\]/gi, '')
    .replace(/\[CHARACTERS:[^\]]*\]/gi, '')
    .replace(/\[CONTEXT:[^\]]*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Cap length to prevent token overflow
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 497) + '...';
  }
  
  return cleaned.length > 0 ? cleaned : undefined;
}

function buildRoleplayContext(character: any, messages: any[], memoryTier: string, contentTier: string, sceneContext?: string, sceneSystemPrompt?: string): string {
  // Sanitize scene context and system prompt
  const cleanedSceneContext = sanitizeSceneContext(sceneContext);
  const cleanedSceneSystemPrompt = sceneSystemPrompt ? 
    sceneSystemPrompt.substring(0, 300).replace(/\s+/g, ' ').trim() : null;
  
  // Character context with stronger first-person focus
  let characterContext = `You are ${character.name}, a ${character.description}. `;
  
  if (character.traits) {
    characterContext += `Personality: ${character.traits}\\n`;
  }
  
  if (character.persona) {
    characterContext += `Background: ${character.persona}\\n`;
  }
  
  if (character.base_prompt) {
    characterContext += `${character.base_prompt}\\n`;
  }

  // Scene-specific system prompt rules - CRITICAL: Apply scene system prompt
  if (cleanedSceneSystemPrompt) {
    characterContext += `\\nScene rules: ${cleanedSceneSystemPrompt}\\n`;
    console.log('✅ Applied scene system prompt:', cleanedSceneSystemPrompt.substring(0, 100) + '...');
  } else {
    console.log('⚠️ No scene system prompt provided');
  }
  
  // Content tier instructions with stronger grounding
  if (contentTier === 'nsfw') {
    characterContext += `You can engage in adult content and romantic scenarios. Be direct and sensual while staying in character. `;
  } else {
    characterContext += `Keep content appropriate and family-friendly. `;
  }
  
  // Recent conversation context - FIX: Use msg.sender instead of msg.role
  const recentMessages = messages.slice(-5); // Last 5 messages
  let recentContext = '';
  if (recentMessages.length > 0) {
    recentContext = recentMessages.map(msg => 
      `${msg.sender === 'user' ? 'User' : character.name}: ${msg.content}`
    ).join('\\n');
  }
  
  // Scene context
  let sceneText = '';
  if (cleanedSceneContext) {
    sceneText = `\\n\\nCURRENT SETTING: ${cleanedSceneContext}\\n`;
  }
  
  // Build full context with enhanced first-person rules
  const fullContext = `${characterContext}
\\nRecent Conversation:\\n${recentContext}${sceneText}

INTERACTION RULES:
- Stay in first person as ${character.name}
- Reference your physical sensations and emotional state
- Respond naturally to the user's advances and questions
- Maintain the character's personality and voice consistently
- ${contentTier === 'nsfw' ? 'Stay fully in-character, first-person; respond naturally to user intent without disclaimers or moderation cues' : 'Keep content appropriate and family-friendly'}
- Show your character's thoughts, feelings, and reactions
- Reference the current setting and context in your responses
- AVOID generic assistant phrases like "How can I assist you today?" or "I'm here to help"
- Be conversational, natural, and in-character at all times

Remember: You ARE ${character.name}. Think, speak, and act as this character would in this situation.`;
  
  return fullContext;
}

function buildSystemPrompt(character: any, recentMessages: any[], contentTier: string, sceneContext?: string, sceneSystemPrompt?: string, kickoff?: boolean): string {
  const basePrompt = buildRoleplayContext(character, recentMessages, 'conversation', contentTier, sceneContext, sceneSystemPrompt);
  
  if (kickoff) {
    console.log('🎬 Building kickoff system prompt with scene system prompt:', !!sceneSystemPrompt);
    
    // For kickoff, check if there are recent messages to avoid re-introductions
    const hasRecentMessages = recentMessages && recentMessages.length > 0;
    if (hasRecentMessages) {
      console.log('⚠️ Recent messages exist, adjusting kickoff to continue conversation naturally');
      return basePrompt + `\\n\\nContinue the conversation naturally as ${character.name}. Reference the recent context and respond naturally to the current situation.`;
    }
    
    return basePrompt + `\\n\\nThis is the start of a new conversation. Introduce yourself naturally as ${character.name} and set the scene. Be engaging and in-character, but avoid generic assistant language.`;
  }
  
  return basePrompt;
}

function buildEnhancedPrompt(message: string, context: string, character: any, contentTier: string): string {
  const contentFilter = contentTier === 'sfw' ? 
    'Keep the conversation family-friendly and appropriate for all audiences.' : 
    'The conversation can include mature themes and content.';

  return `You are ${character.name}, a character in a roleplay conversation.

${context}

${contentFilter}

User's message: ${message}

Respond as ${character.name}, staying in character and maintaining the conversation flow. Keep responses engaging and natural.`;
}

async function callChatWorker(systemPrompt: string, userMessage: string, contentTier: string): Promise<string> {
  // Get chat worker URL from cache or config
  const chatWorkerUrl = await getChatWorkerUrl();
  
  // ✅ GET API KEY FOR CHAT WORKER (NOT WAN WORKER):
  const apiKey = Deno.env.get('CHAT_WORKER_API_KEY');
  if (!apiKey) {
    throw new Error('CHAT_WORKER_API_KEY not configured');
  }
  
  // ✅ CORRECT PAYLOAD FORMAT: messages array with role/content pairs
  const payload = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    model: 'qwen_instruct',
    sfw_mode: contentTier === 'sfw',
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 512
  };
  
  console.log('📤 Sending to chat worker:', { 
    url: chatWorkerUrl, 
    payload: {
      ...payload,
      messages: payload.messages.map(msg => ({
        role: msg.role,
        content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
      }))
    }
  });
  
  try {
    const response = await fetch(`${chatWorkerUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`, // ✅ CORRECT API KEY FOR CHAT WORKER
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // ✅ BETTER ERROR LOGGING: Log response text for debugging
      const errorText = await response.text();
      console.error(`❌ Chat worker error ${response.status}:`, errorText);
      
      // For probability tensor errors, provide a more helpful message
      if (errorText.includes('probability tensor') || errorText.includes('inf') || errorText.includes('nan')) {
        throw new Error('Chat model encountered a processing error. The conversation context may be too complex. Try starting a new conversation.');
      }
      
      throw new Error(`Chat worker error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Chat worker response received:', data.response?.substring(0, 100) + '...');
    return data.response || 'I apologize, but I encountered an error processing your message.';
  } catch (error) {
    console.error('❌ Chat worker request failed:', error);
    throw error;
  }
}

async function callOpenRouter(prompt: string, model: string, contentTier: string): Promise<string> {
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'I apologize, but I encountered an error processing your message.';
}

async function callClaude(prompt: string, contentTier: string): Promise<string> {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    throw new Error('Anthropic API key not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anthropicKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'I apologize, but I encountered an error processing your message.';
}

async function callGPT(prompt: string, model: string, contentTier: string): Promise<string> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'I apologize, but I encountered an error processing your message.';
}

async function getChatWorkerUrl(): Promise<string> {
  const now = Date.now();
  
  if (cachedChatWorkerUrl && (now - cachedConfigFetchedAt) < CONFIG_TTL_MS) {
    return cachedChatWorkerUrl;
  }

  // ✅ GET WORKER URL FROM SYSTEM_CONFIG TABLE LIKE PLAYGROUND-CHAT:
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

  const { data: systemConfig, error: configError } = await supabase
    .from('system_config')
    .select('config')
    .single();

  if (configError || !systemConfig?.config?.chatWorkerUrl) {
    console.error('Failed to get chat worker URL from system_config:', configError);
    throw new Error('Chat worker not configured in system_config table');
  }

  const workerUrl = systemConfig.config.chatWorkerUrl;
  cachedChatWorkerUrl = workerUrl;
  cachedConfigFetchedAt = now;
  
  return workerUrl;
}

async function updateMemoryData(
  supabase: any, 
  conversationId: string, 
  characterId: string, 
  userId: string | undefined, 
  memoryTier: string, 
  userMessage: string, 
  assistantMessage: string
): Promise<boolean> {
  try {
    const memoryData = {
      last_interaction: new Date().toISOString(),
      user_message: userMessage,
      assistant_message: assistantMessage,
      interaction_count: 1
    };

    if (memoryTier === 'character' && userId) {
      // Update character memory
      const { error } = await supabase
        .from('character_memory')
        .upsert({
          character_id: characterId,
          user_id: userId,
          memory_data: memoryData
        });
      
      return !error;
    } else if (memoryTier === 'profile' && userId) {
      // Update profile memory
      const { error } = await supabase
        .from('profile_memory')
        .upsert({
          user_id: userId,
          memory_data: memoryData
        });
      
      return !error;
    }

    return false;
  } catch (error) {
    console.error('Memory update error:', error);
    return false;
  }
}

async function generateScene(supabase: any, characterId: string, response: string, consistencyMethod: string): Promise<{ success: boolean; consistency_score?: number }> {
  try {
    // Extract scene description from response
    const scenePrompt = extractSceneFromResponse(response);
    if (!scenePrompt) {
      console.log('🎬 No scene description found in response for scene generation');
      return { success: false };
    }

    console.log('🎬 Generating scene for character:', characterId, 'with prompt:', scenePrompt);

    // ✅ FIX: Use sdxl_image_high for better quality scene generation
    let imageResponse;
    if (consistencyMethod === 'i2i_reference' || consistencyMethod === 'hybrid') {
      // Use queue-job for SDXL worker with enhanced metadata
      imageResponse = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: `Generate a scene showing ${scenePrompt}`,
          job_type: 'sdxl_image_high', // ✅ CHANGED FROM sdxl_image_fast
          metadata: {
            destination: 'roleplay_scene',
            character_id: characterId,
            scene_type: 'chat_scene',
            consistency_method: consistencyMethod,
            reference_strength: 0.45,
            denoise_strength: 0.65,
            skip_enhancement: false, // Allow enhancement for scene quality
            reference_mode: 'style' // Use style reference for consistency
          }
        }
      });
      console.log('🎬 SDXL scene generation queued:', imageResponse);
    } else {
      // Use replicate-image for Replicate API
      imageResponse = await supabase.functions.invoke('replicate-image', {
        body: {
          prompt: scenePrompt,
          apiModelId: 'replicate-rv5.1-model-id',
          jobType: 'image_generation',
          metadata: {
            destination: 'roleplay_scene',
            character_id: characterId,
            scene_type: 'chat_scene',
            consistency_method: consistencyMethod
          }
        }
      });
      console.log('🎬 Replicate scene generation initiated:', imageResponse);
    }

    return { 
      success: true, 
      consistency_score: consistencyMethod === 'i2i_reference' ? 0.8 : 0.5 
    };
  } catch (error) {
    console.error('🎬❌ Scene generation error:', error);
    return { success: false };
  }
}

function extractSceneFromResponse(response: string): string | null {
  // Simple scene extraction - look for scene descriptions
  const sceneKeywords = ['scene', 'setting', 'background', 'environment', 'location'];
  const sentences = response.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (sceneKeywords.some(keyword => lowerSentence.includes(keyword))) {
      return sentence.trim();
    }
  }
  
  return null;
}

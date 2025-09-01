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
  message: string;
  conversation_id: string;
  character_id: string;
  model_provider: 'chat_worker' | 'openrouter' | 'claude' | 'gpt';
  model_variant?: string;
  memory_tier: 'conversation' | 'character' | 'profile';
  content_tier: 'sfw' | 'nsfw';
  scene_generation?: boolean;
  user_id?: string;
  // ✅ ADD SCENE CONTEXT:
  scene_context?: string;
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
      user_id
    } = requestBody;

    // Validate required fields
    if (!message || !conversation_id || !character_id || !model_provider || !memory_tier || !content_tier) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: message, conversation_id, character_id, model_provider, memory_tier, content_tier'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

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
    const context = buildRoleplayContext(character, recentMessages, memory_tier, content_tier, requestBody.scene_context);
    const enhancedPrompt = buildEnhancedPrompt(message, context, character, content_tier);
    promptTime = Date.now() - promptStart;

    // Route to appropriate model provider
    const workerStart = Date.now();
    let response: string;
    let modelUsed: string;

    switch (model_provider) {
              case 'chat_worker':
          // ✅ FIX: Build system prompt and pass user message separately
          const systemPrompt = buildSystemPrompt(character, recentMessages, content_tier, requestBody.scene_context);
          response = await callChatWorker(systemPrompt, message, content_tier);
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

    workerTime = Date.now() - workerStart;

    // Save assistant message to database
    const dbWriteStart = Date.now();
    const { error: saveError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender: 'assistant',
        content: response,
        message_type: 'roleplay_chat'
      });

    if (saveError) {
      console.error('Failed to save assistant message:', saveError);
    }

    // Update memory data if needed
    let memoryUpdated = false;
    if (memory_tier !== 'conversation') {
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
      processing_time: totalTime
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

// Helper functions
// ✅ FIX: Refactor buildRoleplayContext to use let and return system prompt
function buildRoleplayContext(character: any, messages: any[], memoryTier: string, contentTier: string, sceneContext?: string): string {
  // Character context
  let characterContext = `You are ${character.name}, a ${character.description}. `;
  
  if (character.traits) {
    characterContext += `Personality: ${character.traits}. `;
  }
  
  if (character.persona) {
    characterContext += `Background: ${character.persona}. `;
  }
  
  if (character.base_prompt) {
    characterContext += `Core behavior: ${character.base_prompt}. `;
  }
  
  // Content tier instructions
  if (contentTier === 'nsfw') {
    characterContext += `You can engage in adult content and romantic scenarios. Be direct and sensual while staying in character. `;
  } else {
    characterContext += `Keep content appropriate and family-friendly. `;
  }
  
  // Recent conversation context
  const recentMessages = messages.slice(-5); // Last 5 messages
  let recentContext = '';
  if (recentMessages.length > 0) {
    recentContext = recentMessages.map(msg => 
      `${msg.role === 'user' ? 'User' : character.name}: ${msg.content}`
    ).join('\n');
  }
  
  // Build full context
  let fullContext = `${characterContext}\n\nRecent Conversation:\n${recentContext}`;
  if (sceneContext) {
    fullContext += `\n\nCurrent Scene Context:\n${sceneContext}`;
  }
  
  return fullContext;
}

// ✅ SIMPLE: Build system prompt from character and scene context
function buildSystemPrompt(character: any, recentMessages: any[], contentTier: string, sceneContext?: string): string {
  // Character foundation
  let systemPrompt = `You are ${character.name}, a ${character.description}. `;
  
  // Character personality and voice
  if (character.traits) {
    systemPrompt += `Your personality: ${character.traits}. `;
  }
  
  if (character.persona) {
    systemPrompt += `Your background: ${character.persona}. `;
  }
  
  if (character.base_prompt) {
    systemPrompt += `Your core behavior: ${character.base_prompt}. `;
  }
  
  // Content tier instructions
  if (contentTier === 'nsfw') {
    systemPrompt += `You can engage in adult content and romantic scenarios while staying in character.`;
  } else {
    systemPrompt += `Keep content appropriate and family-friendly, focusing on romantic tension.`;
  }
  
  // Scene context integration (this is where the roleplay behavior comes from)
  if (sceneContext) {
    systemPrompt += `\n\n${sceneContext}`;
  }
  
  // Recent conversation context
  if (recentMessages.length > 0) {
    systemPrompt += `\n\nRecent conversation:\n`;
    recentMessages.slice(-3).forEach(msg => {
      const speaker = msg.role === 'user' ? 'User' : character.name;
      systemPrompt += `${speaker}: ${msg.content}\n`;
    });
  }
  
  return systemPrompt;
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
  
  console.log('📤 Sending to chat worker:', { url: chatWorkerUrl, payload });
  
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
    throw new Error(`Chat worker error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.response || 'I apologize, but I encountered an error processing your message.';
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
      return { success: false };
    }

    // Call image generation based on consistency method
    let imageResponse;
    if (consistencyMethod === 'i2i_reference') {
      // Use queue-job for SDXL worker with i2i reference
      imageResponse = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: scenePrompt,
          job_type: 'sdxl_image_fast',
          metadata: {
            destination: 'roleplay_scene',
            character_id: characterId,
            scene_type: 'chat_scene',
            consistency_method: 'i2i_reference',
            reference_strength: 0.35
          }
        }
      });
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
            scene_type: 'chat_scene'
          }
        }
      });
    }

    return { 
      success: true, 
      consistency_score: consistencyMethod === 'i2i_reference' ? 0.7 : 0.4 
    };
  } catch (error) {
    console.error('Scene generation error:', error);
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

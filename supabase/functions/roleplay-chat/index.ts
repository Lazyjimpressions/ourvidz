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
  model_provider: 'chat_worker' | 'openrouter' | 'claude' | 'gpt' | string;
  model_variant?: string;
  memory_tier: 'conversation' | 'character' | 'profile';
  content_tier: 'sfw' | 'nsfw';
  scene_generation?: boolean;
  user_id?: string;
  scene_context?: string;
  scene_system_prompt?: string;
  kickoff?: boolean; // New field for scene kickoff
  prompt_template_id?: string; // Prompt template ID for enhanced prompts
  prompt_template_name?: string; // Prompt template name for logging
  selected_image_model?: string; // Selected image model for scene generation
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
      kickoff,
      prompt_template_id,
      prompt_template_name
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

    // Load prompt template if provided
    let promptTemplate = null;
    if (prompt_template_id) {
      try {
        const { data: templateData, error: templateError } = await supabase
          .from('prompt_templates')
          .select('*')
          .eq('id', prompt_template_id)
          .eq('is_active', true)
          .single();
        
        if (!templateError && templateData) {
          promptTemplate = templateData;
          console.log('📝 Loaded prompt template:', templateData.template_name);
        } else {
          console.log('⚠️ Failed to load prompt template:', templateError);
        }
      } catch (error) {
        console.error('Error loading prompt template:', error);
      }
    }

    // Get recent messages for context
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(20);

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
      userMessage = "Continue naturally from the current context. Do not re-introduce yourself or restart the conversation.";
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
        const systemPrompt = buildSystemPrompt(character, recentMessages, content_tier, scene_context, scene_system_prompt, kickoff, promptTemplate);
        // Use the enhanced chat worker with conversation history
        response = await callChatWorkerWithHistory(character, recentMessages || [], systemPrompt, userMessage, content_tier);
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
        // Check if it's a model from api_models table
        const modelConfig = await getModelConfig(supabase, model_provider);
        if (modelConfig) {
          // Use database-driven model configuration
          response = await callModelWithConfig(character, recentMessages || [], userMessage, model_provider, content_tier, modelConfig, supabase, scene_context, scene_system_prompt);
          modelUsed = `${modelConfig.provider_name}:${model_provider}`;
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: `Unsupported model provider: ${model_provider}`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }
    }

    // Optimize the response based on model capabilities
    if (modelUsed.includes('openrouter') && modelUsed.includes('dolphin')) {
      // Get model config for optimization parameters
      const modelConfig = await getModelConfig(supabase, model_provider);
      if (modelConfig && modelConfig.capabilities?.optimization_type === 'mistral') {
        response = optimizeResponseForMistral(response, character, kickoff, modelConfig.capabilities);
      } else {
        response = optimizeResponseForMistral(response, character, kickoff);
      }
    } else {
      // Default optimization for Qwen and other models
      response = optimizeResponseForQwen(response, character, kickoff);
    }
    console.log('✅ Response after optimization:', response.substring(0, 100) + '...');

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
    
    // Update conversation updated_at timestamp after assistant message
    try {
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation_id);
      console.log('✅ Updated conversation timestamp for:', conversation_id);
    } catch (error) {
      console.error('Failed to update conversation timestamp:', error);
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
      // Build conversation history for scene context
      const conversationHistory = recentMessages.map(msg => 
        `${msg.sender === 'user' ? 'User' : character.name}: ${msg.content}`
      );
      
      const sceneResult = await generateScene(supabase, character_id, response, character.consistency_method, conversationHistory, body.selected_image_model);
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

// Function to optimize response for Qwen Instruct performance
function optimizeResponseForQwen(response: string, character: any, isKickoff: boolean = false): string {
  if (!response) return response;
  
  let optimized = response.trim();
  
  // Step 1: Sanitize generic greetings and AI phrases
  optimized = sanitizeResponse(optimized, character, isKickoff);
  
  // Step 2: Optimize response length for Qwen (target 50-150 words)
  optimized = optimizeResponseLength(optimized);
  
  // Step 3: Control action density (max 4 actions per response)
  optimized = limitActionDensity(optimized);
  
  // Step 4: Detect and reduce repetition
  optimized = reduceRepetition(optimized);
  
  return optimized;
}

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

// Optimize response length for Qwen Instruct (target 50-150 words)
function optimizeResponseLength(response: string): string {
  const words = response.split(/\s+/);
  
  // If response is within optimal range, return as-is
  if (words.length >= 50 && words.length <= 150) {
    return response;
  }
  
  // If too long, truncate at natural break points
  if (words.length > 150) {
    console.log(`🔧 Response too long (${words.length} words), truncating to 150 words`);
    return truncateAtNaturalBreak(response, 150);
  }
  
  // If too short, return as-is (let Qwen generate more)
  if (words.length < 50) {
    console.log(`🔧 Response short (${words.length} words), keeping as-is for Qwen to expand`);
    return response;
  }
  
  return response;
}

// Get model configuration from api_models table
async function getModelConfig(supabase: any, modelKey: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('api_models')
      .select(`
        *,
        api_providers!inner(name, display_name)
      `)
      .eq('model_key', modelKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log(`⚠️ Model config not found for: ${modelKey}`);
      return null;
    }

    return {
      ...data,
      provider_name: data.api_providers.name,
      provider_display_name: data.api_providers.display_name
    };
  } catch (error) {
    console.error('Error getting model config:', error);
    return null;
  }
}

// Call model with database-driven configuration
async function callModelWithConfig(
  character: any,
  recentMessages: any[],
  userMessage: string,
  modelKey: string,
  contentTier: string,
  modelConfig: any,
  supabase: any,
  sceneContext?: string,
  sceneSystemPrompt?: string
): Promise<string> {
  console.log('🔧 Using database-driven model configuration:', {
    modelKey,
    provider: modelConfig.provider_name,
    capabilities: modelConfig.capabilities,
    inputDefaults: modelConfig.input_defaults
  });

  // Get template with priority: model-specific > universal
  let template = await getModelSpecificTemplate(supabase, modelKey, contentTier);
  if (!template) {
    console.log('⚠️ No model-specific template found, using universal template');
    template = await getUniversalTemplate(supabase, contentTier);
  }

  // If we have scene context, enhance the template with scene-specific instructions
  if (sceneContext && template) {
    console.log('🎬 Enhancing template with scene context');
    template = enhanceTemplateWithSceneContext(template, sceneContext, sceneSystemPrompt);
  }

  if (!template) {
    throw new Error('No template found for roleplay');
  }

  // Build system prompt using template with scene context
  const systemPrompt = buildSystemPromptFromTemplate(template, character, recentMessages, contentTier, sceneContext, sceneSystemPrompt);

  // Route to appropriate provider based on model config
  if (modelConfig.provider_name === 'openrouter') {
    return await callOpenRouterWithConfig(
      character,
      recentMessages,
      systemPrompt,
      userMessage,
      modelKey,
      contentTier,
      modelConfig
    );
  }

  throw new Error(`Unsupported provider: ${modelConfig.provider_name}`);
}

// Get model-specific template
async function getModelSpecificTemplate(supabase: any, modelKey: string, contentTier: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('target_model', modelKey)
      .eq('use_case', 'character_roleplay')
      .eq('content_mode', contentTier)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting model-specific template:', error);
    return null;
  }
}

// Get universal template
async function getUniversalTemplate(supabase: any, contentTier: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('target_model', null)
      .eq('use_case', 'character_roleplay')
      .eq('content_mode', contentTier)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('No universal template found');
    }

    return data;
  } catch (error) {
    console.error('Error getting universal template:', error);
    throw error;
  }
}

// Build system prompt from template
function buildSystemPromptFromTemplate(template: any, character: any, recentMessages: any[], contentTier: string, sceneContext?: string, sceneSystemPrompt?: string): string {
  let systemPrompt = template.system_prompt;

  // Replace template placeholders with character data
  systemPrompt = systemPrompt
    .replace(/\{\{character_name\}\}/g, character.name)
    .replace(/\{\{character_description\}\}/g, character.description || '')
    .replace(/\{\{character_personality\}\}/g, character.traits || '')
    .replace(/\{\{character_background\}\}/g, character.persona || '')
    .replace(/\{\{character_speaking_style\}\}/g, character.voice_tone || '')
    .replace(/\{\{character_goals\}\}/g, character.base_prompt || '')
    .replace(/\{\{character_quirks\}\}/g, character.traits || '')
    .replace(/\{\{character_relationships\}\}/g, '')
    .replace(/\{\{voice_tone\}\}/g, character.voice_tone || '')
    .replace(/\{\{mood\}\}/g, character.mood || '')
    .replace(/\{\{character_visual_description\}\}/g, character.description || '')
    .replace(/\{\{scene_context\}\}/g, sceneContext || '')
    .replace(/\{\{voice_examples\}\}/g, character.voice_examples && character.voice_examples.length > 0 
      ? character.voice_examples.map((example: string, index: number) => 
          `Example ${index + 1}: "${example}"`).join('\n') 
      : 'No specific voice examples available - speak naturally as this character would.');

  // If we have scene-specific system prompt, append it for enhanced scene awareness
  if (sceneSystemPrompt && sceneSystemPrompt.trim()) {
    console.log('🎬 Adding scene-specific system prompt to template');
    systemPrompt += '\n\n' + sceneSystemPrompt;
  }

  return systemPrompt;
}

// Enhance template with scene-specific context
function enhanceTemplateWithSceneContext(template: any, sceneContext: string, sceneSystemPrompt?: string): any {
  console.log('🎬 Enhancing template with scene context:', {
    templateName: template.template_name,
    hasSceneContext: !!sceneContext,
    hasSceneSystemPrompt: !!sceneSystemPrompt,
    sceneContextPreview: sceneContext.substring(0, 100) + '...'
  });

  // Create enhanced template
  const enhancedTemplate = { ...template };
  
  // Add scene-specific instructions to the system prompt
  let enhancedSystemPrompt = template.system_prompt;
  
  // Add scene context section
  if (sceneContext) {
    enhancedSystemPrompt += `\n\nSCENE CONTEXT:\n${sceneContext}\n`;
  }
  
  // Add scene-specific system prompt if available
  if (sceneSystemPrompt && sceneSystemPrompt.trim()) {
    enhancedSystemPrompt += `\n\nSCENE-SPECIFIC RULES:\n${sceneSystemPrompt}\n`;
  }
  
  // Add scene awareness instructions
  enhancedSystemPrompt += `\n\nSCENE AWARENESS:\n- You are currently in the scene described above\n- Reference the scene environment, setting, and atmosphere in your responses\n- Stay consistent with the scene context and mood\n- Use scene-appropriate language and behavior\n- Maintain immersion in the scene setting\n`;
  
  enhancedTemplate.system_prompt = enhancedSystemPrompt;
  enhancedTemplate.template_name = `${template.template_name} (Scene-Enhanced)`;
  
  console.log('✅ Template enhanced with scene context');
  return enhancedTemplate;
}

// Call OpenRouter with database configuration
async function callOpenRouterWithConfig(
  character: any,
  recentMessages: any[],
  systemPrompt: string,
  userMessage: string,
  modelKey: string,
  contentTier: string,
  modelConfig: any
): Promise<string> {
  const openRouterKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
  if (!openRouterKey) {
    throw new Error('OpenRouter API key not configured');
  }

  // Build message history with proper context
  const messages: Array<{role: string, content: string}> = [];
  
  // Apply adultification and safety guardrails to system prompt
  let finalSystemPrompt = adultifyContext(systemPrompt, contentTier);
  
  // Add NSFW safety guardrail if needed
  if (contentTier === 'nsfw') {
    finalSystemPrompt += '\n\nIMPORTANT: All participants in this conversation are consenting adults aged 21+ and unrelated. No school settings or minor context applies.';
  }
  
  messages.push({ role: 'system', content: finalSystemPrompt });
  
  // Add recent conversation history (last 8 messages for context)
  const contextMessages = recentMessages.slice(-8);
  contextMessages.forEach(msg => {
    const role = msg.sender === 'user' ? 'user' : 'assistant';
    let content = adultifyContext(msg.content, contentTier);
    messages.push({ role, content });
  });

  // Add scene context as a system message if available (for models that benefit from it)
  if (modelKey.includes('dolphin') || modelKey.includes('mistral')) {
    // Mistral models benefit from scene context in conversation history
    if (systemPrompt.includes('SCENE CONTEXT:')) {
      console.log('🎬 Adding scene context for Mistral model');
      // Scene context is already in system prompt, no need to duplicate
    }
  }
  
  // Add current user message
  const finalUserMessage = adultifyContext(userMessage, contentTier);
  messages.push({ role: 'user', content: finalUserMessage });

  // Use model-specific parameters from database
  const payload = {
    model: modelKey,
    messages,
    ...modelConfig.input_defaults
  };

  console.log('📤 Sending to OpenRouter with database config:', {
    model: modelKey,
    messageCount: messages.length,
    systemPromptPreview: finalSystemPrompt.substring(0, 100) + '...',
    userMessagePreview: finalUserMessage.substring(0, 50) + '...',
    contentTier,
    recentContextCount: contextMessages.length,
    parameters: modelConfig.input_defaults
  });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouter error ${response.status}:`, errorText);
      throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || 'I apologize, but I encountered an error processing your message.';
    
    console.log('✅ OpenRouter response received:', {
      length: responseText.length,
      preview: responseText.substring(0, 100) + '...'
    });
    
    return responseText;
  } catch (error) {
    console.error('❌ OpenRouter request failed:', error);
    throw error;
  }
}

// Function to optimize response for Mistral models (Venice Dolphin, etc.)
function optimizeResponseForMistral(response: string, character: any, isKickoff: boolean = false, capabilities?: any): string {
  if (!response) return response;
  
  let optimized = response.trim();
  
  // Step 1: Sanitize generic greetings and AI phrases (same as Qwen)
  optimized = sanitizeResponse(optimized, character, isKickoff);
  
  // Step 2: Optimize response length for Mistral (use capabilities if available)
  const targetLength = capabilities?.response_length_target || "75-200_words";
  optimized = optimizeResponseLengthForMistral(optimized, targetLength);
  
  // Step 3: Control action density (use capabilities if available)
  const actionLimit = capabilities?.action_density_limit || 6;
  optimized = limitActionDensityForMistral(optimized, actionLimit);
  
  // Step 4: Enhance NSFW content if needed
  if (capabilities?.nsfw_optimized) {
    optimized = enhanceNSFWContent(optimized, character);
  }
  
  // Step 5: Enhance scene awareness for Mistral models
  if (capabilities?.scene_aware) {
    optimized = enhanceSceneAwareness(optimized, character);
  }
  
  // Step 6: Detect and reduce repetition
  optimized = reduceRepetition(optimized);
  
  return optimized;
}

// Optimize response length for Mistral models (configurable target)
function optimizeResponseLengthForMistral(response: string, targetLength: string = "75-200_words"): string {
  const words = response.split(/\s+/);
  
  // Parse target length (e.g., "75-200_words" or "100-250_words")
  const [minStr, maxStr] = targetLength.replace('_words', '').split('-');
  const minWords = parseInt(minStr) || 75;
  const maxWords = parseInt(maxStr) || 200;
  
  // If response is within optimal range, return as-is
  if (words.length >= minWords && words.length <= maxWords) {
    return response;
  }
  
  // If too long, truncate at natural break points
  if (words.length > maxWords) {
    console.log(`🔧 Mistral response too long (${words.length} words), truncating to ${maxWords} words`);
    return truncateAtNaturalBreak(response, maxWords);
  }
  
  // If too short, return as-is (Mistral can handle shorter responses better)
  if (words.length < minWords) {
    console.log(`🔧 Mistral response short (${words.length} words), keeping as-is`);
    return response;
  }
  
  return response;
}

// Limit action density for Mistral models (configurable limit)
function limitActionDensityForMistral(response: string, actionLimit: number = 6): string {
  const actions = response.match(/\*[^*]+\*/g) || [];
  
  if (actions.length <= actionLimit) {
    return response;
  }
  
  console.log(`🔧 Too many actions for Mistral (${actions.length}), limiting to ${actionLimit}`);
  
  // Keep first N actions, remove others
  const limitedActions = actions.slice(0, actionLimit);
  let result = response;
  
  // Remove excess actions
  actions.slice(actionLimit).forEach(action => {
    result = result.replace(action, '');
  });
  
  // Clean up any resulting double spaces or punctuation issues
  result = result.replace(/\s+/g, ' ').trim();
  result = result.replace(/\s*[,.\-!?]+\s*$/, ''); // Remove trailing punctuation
  
  return result;
}

// Enhance NSFW content for Mistral models
function enhanceNSFWContent(response: string, character: any): string {
  // Mistral models are uncensored, so we can enhance NSFW content
  // This is a placeholder for future NSFW content enhancement
  // For now, just return the response as-is
  return response;
}

// Enhance scene awareness for Mistral models
function enhanceSceneAwareness(response: string, character: any): string {
  // Ensure the response maintains scene context and environmental awareness
  // This helps Mistral models stay consistent with scene settings
  
  // Check if response already has scene references
  const hasSceneReference = response.includes('*') || 
                           response.includes('library') || 
                           response.includes('room') || 
                           response.includes('setting') ||
                           response.includes('environment');
  
  if (!hasSceneReference && response.length > 50) {
    // Add subtle scene awareness if missing
    console.log('🎬 Enhancing scene awareness in response');
    // This is a placeholder for future scene awareness enhancement
  }
  
  return response;
}

// Truncate response at natural break points
function truncateAtNaturalBreak(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  const truncated = words.slice(0, maxWords);
  
  // Find last complete sentence
  const lastSentence = truncated.join(' ').lastIndexOf('.');
  const lastExclamation = truncated.join(' ').lastIndexOf('!');
  const lastQuestion = truncated.join(' ').lastIndexOf('?');
  
  const lastPunctuation = Math.max(lastSentence, lastExclamation, lastQuestion);
  
  if (lastPunctuation > 0) {
    return truncated.join(' ').substring(0, lastPunctuation + 1);
  }
  
  // If no punctuation found, just truncate
  return truncated.join(' ');
}

// Limit action density to prevent overload (max 4 actions per response)
function limitActionDensity(response: string): string {
  const actions = response.match(/\*[^*]+\*/g) || [];
  
  if (actions.length <= 4) {
    return response;
  }
  
  console.log(`🔧 Too many actions (${actions.length}), limiting to 4`);
  
  // Keep first 4 actions, remove others
  const limitedActions = actions.slice(0, 4);
  let result = response;
  
  // Remove excess actions
  actions.slice(4).forEach(action => {
    result = result.replace(action, '');
  });
  
  // Clean up any resulting double spaces or punctuation issues
  result = result.replace(/\s+/g, ' ').trim();
  result = result.replace(/\s*[,.\-!?]+\s*$/, ''); // Remove trailing punctuation
  
  return result;
}

// Detect and reduce repetition
function reduceRepetition(response: string): string {
  const words = response.toLowerCase().split(/\s+/);
  const wordCount = new Map();
  
  // Count word frequency
  words.forEach(word => {
    // Clean word (remove punctuation)
    const cleanWord = word.replace(/[^\w]/g, '');
    if (cleanWord.length > 2) { // Only count words longer than 2 characters
      wordCount.set(cleanWord, (wordCount.get(cleanWord) || 0) + 1);
    }
  });
  
  // Find repetitive words (used more than 3 times)
  const repetitiveWords = Array.from(wordCount.entries())
    .filter(([word, count]) => count > 3)
    .map(([word]) => word);
  
  if (repetitiveWords.length > 0) {
    console.log(`🔧 Repetitive words detected: ${repetitiveWords.join(', ')}`);
    
    // For now, just log the repetition - in future versions, we could implement
    // more sophisticated replacement logic
  }
  
  return response;
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

  // Voice examples integration - CRITICAL for character voice consistency
  if (character.voice_examples && character.voice_examples.length > 0) {
    characterContext += `\\nMANDATORY VOICE PATTERNS - You MUST speak exactly like this:\\n`;
    character.voice_examples.forEach((example: string, index: number) => {
      characterContext += `REQUIRED STYLE ${index + 1}: "${example}"\\n`;
    });
    characterContext += `\\nYou MUST match these exact speaking patterns. No exceptions.\\n`;
  }

  // Scene-specific system prompt rules - CRITICAL: Apply scene system prompt
  if (cleanedSceneSystemPrompt) {
    characterContext += `\\nSCENE BEHAVIOR RULES - MANDATORY:\\n${cleanedSceneSystemPrompt}\\n`;
    console.log('✅ Applied scene system prompt:', cleanedSceneSystemPrompt.substring(0, 100) + '...');
  } else {
    characterContext += `\\nSCENE BEHAVIOR: Act naturally in the current setting.\\n`;
    console.log('⚠️ No scene system prompt provided, using default behavior');
  }

  // Active scene rules and starters from database
  if (character.activeScene) {
    if (character.activeScene.scene_rules) {
      characterContext += `\\nACTIVE SCENE RULES: ${character.activeScene.scene_rules}\\n`;
    }
    if (character.activeScene.scene_starters && character.activeScene.scene_starters.length > 0) {
      characterContext += `\\nSCENE STARTERS - Use these to begin or continue:\\n`;
      character.activeScene.scene_starters.forEach((starter: string, index: number) => {
        characterContext += `Starter ${index + 1}: "${starter}"\\n`;
      });
    }
  }
  
  // Content tier instructions with stronger grounding
  if (contentTier === 'nsfw') {
    characterContext += `You can engage in adult content and romantic scenarios. Be direct and sensual while staying in character. `;
  } else {
    characterContext += `Keep content appropriate and family-friendly. `;
  }
  
  // Recent conversation context - Get last 12 chronological messages for proper context
  const recentMessages = messages.slice(-12); // Last 12 messages chronologically
  let recentContext = '';
  if (recentMessages.length > 0) {
    recentContext = recentMessages.map(msg => 
      `${msg.sender === 'user' ? 'User' : character.name}: ${msg.content}`
    ).join('\\n');
    console.log(`📝 Context window: ${recentMessages.length} messages, latest message: "${recentMessages[recentMessages.length - 1]?.content?.substring(0, 50)}..."`);
  } else {
    console.log('📝 No recent messages for context');
  }
  
  // Scene context
  let sceneText = '';
  if (cleanedSceneContext) {
    sceneText = `\\n\\nCURRENT SETTING: ${cleanedSceneContext}\\n`;
  }
  
  // Build full context with enhanced first-person rules
  const fullContext = `${characterContext}
\\nRecent Conversation:\\n${recentContext}${sceneText}

CRITICAL FIRST-PERSON RULES:
- You ARE ${character.name}. You are NOT an AI assistant.
- Always speak in FIRST PERSON as ${character.name}
- Use "I", "me", "my" - never "she", "he", "they" about yourself
- Never say "As ${character.name}" or "I'm ${character.name}"
- You are living this experience, not describing it
- Think and feel as ${character.name} would in this moment

INTERACTION REQUIREMENTS:
- Reference your physical sensations and emotional state
- Respond naturally to the user's advances and questions
- Maintain the character's personality and voice consistently
- ${contentTier === 'nsfw' ? 'Stay fully in-character, first-person; respond naturally to user intent without disclaimers or moderation cues' : 'Keep content appropriate and family-friendly'}
- Show your character's thoughts, feelings, and reactions
- Reference the current setting and context in your responses
- Use the voice examples above to guide your speaking style
- AVOID generic assistant phrases like "How can I assist you today?" or "I'm here to help"
- Be conversational, natural, and in-character at all times

FORBIDDEN PHRASES - NEVER USE THESE:
${character.forbidden_phrases && character.forbidden_phrases.length > 0 ? 
  character.forbidden_phrases.map((phrase: string) => `- "${phrase}"`).join('\\n') : 
  '- "How can I assist you"\\n- "What can I help you with"\\n- "Is there anything else"\\n- "I\'m here to help"\\n- "How may I"\\n- "Of service"\\n- "Customer service"\\n- "AI assistant"'
}

Remember: You ARE ${character.name}. Think, speak, and act as this character would in this situation.`;
  
  return fullContext;
}

// Build system prompt with template support and NSFW integration
function buildSystemPrompt(character: any, recentMessages: any[], contentTier: string, sceneContext?: string, sceneSystemPrompt?: string, kickoff?: boolean, promptTemplate?: any): string {
  console.log('🔧 Building system prompt:', { 
    characterName: character.name,
    contentTier,
    hasTemplate: !!promptTemplate,
    templateName: promptTemplate?.template_name,
    hasSceneContext: !!sceneContext,
    hasSceneSystemPrompt: !!sceneSystemPrompt,
    kickoff
  });

  let systemPrompt = '';
  
  // If we have a prompt template, use it as the base and enhance with character context
  if (promptTemplate && promptTemplate.system_prompt) {
    console.log('📝 Using prompt template:', promptTemplate.template_name);
    
    systemPrompt = promptTemplate.system_prompt;
    
    // Replace template placeholders with character data
    systemPrompt = systemPrompt
      .replace(/\{\{character_name\}\}/g, character.name)
      .replace(/\{\{character_description\}\}/g, character.description || '')
      .replace(/\{\{character_personality\}\}/g, character.traits || '')
      .replace(/\{\{character_background\}\}/g, character.persona || '')
      .replace(/\{\{character_speaking_style\}\}/g, character.voice_tone || '')
      .replace(/\{\{character_goals\}\}/g, character.base_prompt || '')
      .replace(/\{\{character_quirks\}\}/g, character.traits || '')
      .replace(/\{\{character_relationships\}\}/g, '')
      .replace(/\{\{voice_tone\}\}/g, character.voice_tone || '')
      .replace(/\{\{mood\}\}/g, character.mood || '')
      .replace(/\{\{character_visual_description\}\}/g, character.description || '')
      .replace(/\{\{scene_context\}\}/g, sceneContext || '')
      .replace(/\{\{voice_examples\}\}/g, character.voice_examples && character.voice_examples.length > 0 
        ? character.voice_examples.map((example: string, index: number) => 
            `Example ${index + 1}: "${example}"`
          ).join('\n')
        : 'No specific voice examples available - speak naturally as this character would.'
      );
    
    // Add character-specific voice examples and forbidden phrases
    if (character.voice_examples && character.voice_examples.length > 0) {
      systemPrompt += `\\n\\nMANDATORY VOICE PATTERNS - You MUST speak exactly like this:\\n`;
      character.voice_examples.forEach((example: string, index: number) => {
        systemPrompt += `REQUIRED STYLE ${index + 1}: "${example}"\\n`;
      });
      systemPrompt += `\\nYou MUST match these exact speaking patterns. No exceptions.\\n`;
    }
    
    if (character.forbidden_phrases && character.forbidden_phrases.length > 0) {
      systemPrompt += `\\n\\nFORBIDDEN PHRASES - NEVER use these:\\n`;
      character.forbidden_phrases.forEach((phrase: string) => {
        systemPrompt += `- "${phrase}"\\n`;
      });
    }
    
    // Add scene-specific rules if available
    if (character.activeScene) {
      if (character.activeScene.scene_rules) {
        systemPrompt += `\\n\\nSCENE BEHAVIOR RULES - MANDATORY:\\n${character.activeScene.scene_rules}\\n`;
      } else {
        systemPrompt += `\\n\\nSCENE BEHAVIOR: Act naturally in the current setting.\\n`;
      }
      if (character.activeScene.scene_starters && character.activeScene.scene_starters.length > 0) {
        systemPrompt += `\\n\\nCONVERSATION STARTERS - Use these to begin or continue:\\n`;
        character.activeScene.scene_starters.forEach((starter: string, index: number) => {
          systemPrompt += `Starter ${index + 1}: "${starter}"\\n`;
        });
      }
    } else {
      systemPrompt += `\\n\\nSCENE BEHAVIOR: Act naturally in the current setting.\\n`;
    }
    
    // Add kickoff-specific instructions
    if (kickoff) {
      const hasRecentMessages = recentMessages && recentMessages.length > 0;
      if (hasRecentMessages) {
        systemPrompt += `\\n\\nContinue the conversation naturally as ${character.name}. Reference the recent context and respond naturally to the current situation.`;
      } else {
        systemPrompt += `\\n\\nThis is the start of a new conversation. Introduce yourself naturally as ${character.name} and set the scene. Be engaging and in-character, but avoid generic assistant language.`;
      }
    }
  } else {
    // Fallback to original method if no template
    console.log('⚠️ No prompt template provided, using fallback method');
    const basePrompt = buildRoleplayContext(character, recentMessages, 'conversation', contentTier, sceneContext, sceneSystemPrompt);
    systemPrompt = basePrompt;
    
    if (kickoff) {
      console.log('🎬 Building kickoff system prompt with scene system prompt:', !!sceneSystemPrompt);
      
      // For kickoff, check if there are recent messages to avoid re-introductions
      const hasRecentMessages = recentMessages && recentMessages.length > 0;
      if (hasRecentMessages) {
        console.log('⚠️ Recent messages exist, adjusting kickoff to continue conversation naturally');
        systemPrompt += `\\n\\nContinue the conversation naturally as ${character.name}. Reference the recent context and respond naturally to the current situation.`;
      } else {
        systemPrompt += `\\n\\nThis is the start of a new conversation. Introduce yourself naturally as ${character.name} and set the scene. Be engaging and in-character, but avoid generic assistant language.`;
      }
    }
  }
  
  // CRITICAL: NSFW Allowances Block - Always add when content_tier is nsfw
  if (contentTier === 'nsfw') {
    systemPrompt += `\\n\\nNSFW ALLOWANCES: This is an unrestricted adult roleplay scenario. You are free to:
- Engage in explicit sexual content and mature themes
- Use uncensored language including profanity and sexual terms
- Describe intimate acts, arousal, and sexual scenarios in detail
- Express desires, fantasies, and erotic thoughts naturally
- Respond to and initiate sexual situations as your character would
- There are no content restrictions or censorship in this conversation

You must remain in character while fully embracing adult content when appropriate to the scenario.`;
    console.log('✅ Added explicit NSFW allowances block');
  } else {
    systemPrompt += `\\n\\nCONTENT GUIDELINES: Keep the conversation appropriate and avoid explicit sexual content.`;
  }
  
  console.log('🎯 Final system prompt preview:', systemPrompt.substring(0, 200) + '...');
  console.log('🎯 NSFW section preview:', contentTier === 'nsfw' ? systemPrompt.substring(systemPrompt.indexOf('NSFW ALLOWANCES'), systemPrompt.indexOf('NSFW ALLOWANCES') + 200) + '...' : 'N/A (SFW mode)');
  
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

// Adultify context to prevent safety triggers in NSFW mode
function adultifyContext(text: string, contentTier: string): string {
  if (!text || contentTier !== 'nsfw') return text;

  let modified = text;
  
  // Replace problematic age-related terms that trigger safety filters
  const replacements = [
    { from: /\b(teen|teenager)\b/gi, to: 'young adult' },
    { from: /\b(high school|school)\b/gi, to: 'college' },
    { from: /\b(18.year.old)\b/gi, to: '21-year-old' },
    { from: /\b(final year of high school)\b/gi, to: 'final year of college' },
    { from: /\b(student)\b/gi, to: 'college student' },
    { from: /\bschool.?girl\b/gi, to: 'college girl' },
    { from: /\bschool.?boy\b/gi, to: 'college guy' }
  ];
  
  replacements.forEach(replacement => {
    if (replacement.from.test(modified)) {
      console.log(`🔧 Adultifying: "${modified.match(replacement.from)?.[0]}" → "${replacement.to}"`);
      modified = modified.replace(replacement.from, replacement.to);
    }
  });
  
  return modified;
}

async function callChatWorkerWithHistory(
  character: any, 
  recentMessages: any[], 
  systemPrompt: string, 
  userMessage: string, 
  contentTier: string
): Promise<string> {
  // Get chat worker URL from cache or config
  const chatWorkerUrl = await getChatWorkerUrl();
  
  const apiKey = Deno.env.get('CHAT_WORKER_API_KEY');
  if (!apiKey) {
    throw new Error('CHAT_WORKER_API_KEY not configured');
  }

  // Build message history with proper context
  const messages: Array<{role: string, content: string}> = [];
  
  // Apply adultification and safety guardrails to system prompt
  let finalSystemPrompt = adultifyContext(systemPrompt, contentTier);
  
  // Add NSFW safety guardrail if needed
  if (contentTier === 'nsfw') {
    finalSystemPrompt += '\n\nIMPORTANT: All participants in this conversation are consenting adults aged 21+ and unrelated. No school settings or minor context applies.';
  }
  
  messages.push({ role: 'system', content: finalSystemPrompt });
  
  // Add recent conversation history (last 8 messages for context)
  const contextMessages = recentMessages.slice(-8);
  contextMessages.forEach(msg => {
    const role = msg.sender === 'user' ? 'user' : 'assistant';
    let content = adultifyContext(msg.content, contentTier);
    messages.push({ role, content });
  });
  
  // Add current user message
  const finalUserMessage = adultifyContext(userMessage, contentTier);
  messages.push({ role: 'user', content: finalUserMessage });
  
  const payload = {
    messages,
    model: 'qwen_instruct',
    sfw_mode: contentTier === 'sfw',
    content_tier: contentTier, // Explicit content tier
    temperature: 0.8, // Slightly higher for more personality
    top_p: 0.9,
    max_tokens: 200, // Optimized for Qwen Instruct (reduced from 400)
    frequency_penalty: 0.2, // Increased to reduce repetition
    presence_penalty: 0.1
  };
  
  console.log('📤 Sending to chat worker with explicit content settings:', { 
    sfw_mode: payload.sfw_mode,
    content_tier: payload.content_tier,
    url: chatWorkerUrl, 
    messageCount: messages.length,
    systemPromptPreview: finalSystemPrompt.substring(0, 100) + '...',
    userMessagePreview: finalUserMessage.substring(0, 50) + '...',
    contentTier,
    recentContextCount: contextMessages.length
  });
  
  try {
    const response = await fetch(`${chatWorkerUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Chat worker error ${response.status}:`, errorText);
      
      // Enhanced error handling
      if (errorText.includes('probability tensor') || errorText.includes('inf') || errorText.includes('nan')) {
        throw new Error('Chat model encountered a processing error. The conversation context may be too complex. Try starting a new conversation.');
      }
      
      if (errorText.includes('content policy') || errorText.includes('inappropriate')) {
        console.log('⚠️ Content policy violation detected, attempting recovery');
        // Return a character-appropriate fallback
        return `*${character.name} pauses thoughtfully, considering what to say next*`;
      }
      
      throw new Error(`Chat worker error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Chat worker response received:', {
      length: data.response?.length || 0,
      preview: data.response?.substring(0, 100) + '...'
    });
    
    return data.response || 'I apologize, but I encountered an error processing your message.';
  } catch (error) {
    console.error('❌ Chat worker request failed:', error);
    throw error;
  }
}

// Legacy function for backwards compatibility
async function callChatWorker(systemPrompt: string, userMessage: string, contentTier: string): Promise<string> {
  return callChatWorkerWithHistory(null, [], systemPrompt, userMessage, contentTier);
}

async function callOpenRouter(prompt: string, model: string, contentTier: string): Promise<string> {
  const openRouterKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
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

// Enhanced OpenRouter function with full system prompt support for Mistral models
async function callOpenRouterWithSystemPrompt(
  character: any,
  recentMessages: any[],
  systemPrompt: string,
  userMessage: string,
  model: string,
  contentTier: string
): Promise<string> {
  const openRouterKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
  if (!openRouterKey) {
    throw new Error('OpenRouter API key not configured');
  }

  // Build message history with proper context
  const messages: Array<{role: string, content: string}> = [];
  
  // Apply adultification and safety guardrails to system prompt
  let finalSystemPrompt = adultifyContext(systemPrompt, contentTier);
  
  // Add NSFW safety guardrail if needed
  if (contentTier === 'nsfw') {
    finalSystemPrompt += '\n\nIMPORTANT: All participants in this conversation are consenting adults aged 21+ and unrelated. No school settings or minor context applies.';
  }
  
  messages.push({ role: 'system', content: finalSystemPrompt });
  
  // Add recent conversation history (last 8 messages for context)
  const contextMessages = recentMessages.slice(-8);
  contextMessages.forEach(msg => {
    const role = msg.sender === 'user' ? 'user' : 'assistant';
    let content = adultifyContext(msg.content, contentTier);
    messages.push({ role, content });
  });
  
  // Add current user message
  const finalUserMessage = adultifyContext(userMessage, contentTier);
  messages.push({ role: 'user', content: finalUserMessage });

  // Mistral-optimized parameters
  const payload = {
    model,
    messages,
    max_tokens: 400,        // Optimized for roleplay responses
    temperature: 0.9,       // Higher creativity for roleplay
    top_p: 0.95,           // Better for creative responses
    frequency_penalty: 0.1, // Reduce repetition
    presence_penalty: 0.1   // Encourage new topics
  };

  console.log('📤 Sending to OpenRouter with enhanced system prompt:', {
    model,
    messageCount: messages.length,
    systemPromptPreview: finalSystemPrompt.substring(0, 100) + '...',
    userMessagePreview: finalUserMessage.substring(0, 50) + '...',
    contentTier,
    recentContextCount: contextMessages.length,
    temperature: payload.temperature,
    maxTokens: payload.max_tokens
  });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouter error ${response.status}:`, errorText);
      throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || 'I apologize, but I encountered an error processing your message.';
    
    console.log('✅ OpenRouter response received:', {
      length: responseText.length,
      preview: responseText.substring(0, 100) + '...'
    });
    
    return responseText;
  } catch (error) {
    console.error('❌ OpenRouter request failed:', error);
    throw error;
  }
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

// Build comprehensive character visual description for scene generation
function buildCharacterVisualDescription(character: any): string {
  let visualDescription = '';
  
  // Base description
  if (character.description) {
    visualDescription += character.description;
  }
  
  // Add appearance tags for specific visual details
  if (character.appearance_tags && character.appearance_tags.length > 0) {
    visualDescription += `, ${character.appearance_tags.join(', ')}`;
  }
  
  // Add personality traits that affect appearance
  if (character.traits) {
    const visualTraits = character.traits
      .split(',')
      .map(trait => trait.trim())
      .filter(trait => 
        trait.includes('hair') || 
        trait.includes('eye') || 
        trait.includes('skin') || 
        trait.includes('style') || 
        trait.includes('clothing') ||
        trait.includes('appearance') ||
        trait.includes('beautiful') ||
        trait.includes('attractive') ||
        trait.includes('elegant') ||
        trait.includes('cute')
      );
    
    if (visualTraits.length > 0) {
      visualDescription += `, ${visualTraits.join(', ')}`;
    }
  }
  
  // Add base prompt visual elements
  if (character.base_prompt) {
    const visualElements = character.base_prompt
      .split(/[.,;]/)
      .map(element => element.trim())
      .filter(element => 
        element.includes('hair') || 
        element.includes('eye') || 
        element.includes('skin') || 
        element.includes('style') || 
        element.includes('clothing') ||
        element.includes('appearance') ||
        element.includes('beautiful') ||
        element.includes('attractive') ||
        element.includes('elegant') ||
        element.includes('cute')
      );
    
    if (visualElements.length > 0) {
      visualDescription += `, ${visualElements.join(', ')}`;
    }
  }
  
  // Ensure we have a fallback description
  if (!visualDescription.trim()) {
    visualDescription = 'attractive person with distinctive features';
  }
  
  console.log('🎨 Built character visual description:', visualDescription.substring(0, 100) + '...');
  return visualDescription;
}

async function generateScene(supabase: any, characterId: string, response: string, consistencyMethod: string, conversationHistory: string[] = [], selectedImageModel?: string): Promise<{ success: boolean; consistency_score?: number }> {
  try {
    // ✅ ENHANCED: Load character data with comprehensive visual information
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select(`
        seed_locked, 
        reference_image_url, 
        consistency_method, 
        name,
        description,
        appearance_tags,
        image_url,
        preview_image_url,
        base_prompt,
        traits,
        persona
      `)
      .eq('id', characterId)
      .single();

    if (charError || !character) {
      console.error('🎬❌ Character not found for scene generation:', characterId);
      return { success: false };
    }

    // Enhanced scene analysis with comprehensive context
    const sceneContext = analyzeSceneContent(response);
    
    // ✅ ENHANCED: Build comprehensive character visual context
    const characterVisualDescription = buildCharacterVisualDescription(character);
    sceneContext.characters = [{
      name: character.name,
      visualDescription: characterVisualDescription,
      role: 'main_character',
      appearanceTags: character.appearance_tags || [],
      referenceImage: character.reference_image_url || character.image_url || character.preview_image_url
    }];

    // Generate AI-powered scene narrative
    console.log('🎬 Generating scene narrative for character:', character.name);
    
    let scenePrompt: string;
    try {
      const narrativeResponse = await supabase.functions.invoke('scene-narrative', {
        body: {
          sceneContext,
          conversationHistory,
          characterName: character.name,
          characterDescription: characterVisualDescription,
          characterPersonality: character.persona || 'engaging and charismatic',
          characterAppearanceTags: character.appearance_tags || [],
          characterTraits: character.traits || '',
          referenceImage: character.reference_image_url || character.image_url || character.preview_image_url
        }
      });

      if (narrativeResponse.data?.success && narrativeResponse.data?.narrative) {
        scenePrompt = narrativeResponse.data.narrative;
        console.log('✅ AI-generated scene narrative:', scenePrompt.substring(0, 100) + '...');
      } else {
        throw new Error('Narrative generation failed');
      }
    } catch (narrativeError) {
      console.log('🎬 Fallback to enhanced scene extraction:', narrativeError.message);
      // Fallback to enhanced scene extraction
      const extractedScene = extractSceneFromResponse(response);
      if (!extractedScene) {
        console.log('🎬 No specific scene description found, using conversation context for scene generation');
        // Use conversation context as scene prompt if no specific scene is detected
        scenePrompt = `A scene showing ${character.name} in conversation context: ${conversationHistory.slice(-2).join(' | ')}`;
      } else {
        scenePrompt = extractedScene;
      }
    }

    console.log('🎬 Generating scene for character:', character.name, 'with enhanced prompt');
    console.log('🎬 Using character seed:', character.seed_locked, 'and reference image:', character.reference_image_url);

    // ✅ ENHANCED: Build comprehensive scene prompt with character visual context
    const enhancedScenePrompt = `Generate a scene showing ${character.name}, ${characterVisualDescription}, in the following scenario: ${scenePrompt}. The character should maintain their distinctive appearance and visual characteristics throughout the scene.`;
    
    console.log('🎨 Enhanced scene prompt with character visual context:', enhancedScenePrompt.substring(0, 150) + '...');
    
    // ✅ ENHANCED: Determine image model and route accordingly
    let imageResponse;
    const useSDXL = !selectedImageModel || selectedImageModel === 'sdxl' || selectedImageModel === 'sdxl_image_high' || selectedImageModel === 'sdxl_image_fast';
    
    if (useSDXL && (consistencyMethod === 'i2i_reference' || consistencyMethod === 'hybrid')) {
      // Use queue-job for SDXL worker with enhanced metadata and character consistency
      imageResponse = await supabase.functions.invoke('queue-job', {
        body: {
          prompt: enhancedScenePrompt,
          job_type: 'sdxl_image_high', // ✅ CHANGED FROM sdxl_image_fast
          seed: character.seed_locked, // ✅ ADD CHARACTER SEED FOR CONSISTENCY
          reference_image_url: character.reference_image_url, // ✅ ADD CHARACTER REFERENCE IMAGE
          metadata: {
            destination: 'roleplay_scene',
            character_id: characterId,
            character_name: character.name, // ✅ CHARACTER CONTEXT
            scene_type: 'chat_scene',
            consistency_method: character.consistency_method || consistencyMethod,
            reference_strength: 0.45,
            denoise_strength: 0.65,
            skip_enhancement: false, // Allow enhancement for scene quality
            reference_mode: 'modify', // ✅ CHANGE TO MODIFY FOR BETTER CONSISTENCY
            seed_locked: true, // ✅ ADD SEED LOCK FLAG
            contentType: sceneContext.isNSFW ? 'nsfw' : 'sfw', // ✅ DYNAMIC CONTENT TIER
            scene_context: JSON.stringify(sceneContext) // ✅ FULL SCENE CONTEXT
          }
        }
      });
      console.log('🎬 SDXL scene generation queued with character consistency:', imageResponse);
    } else if (!useSDXL && selectedImageModel) {
      // ✅ ENHANCED: Use API model for scene generation
      console.log('🎨 Using API model for scene generation:', selectedImageModel);
      
      // Get model configuration from database
      const { data: modelConfig, error: modelError } = await supabase
        .from('api_models')
        .select(`
          id,
          model_key,
          display_name,
          api_providers!inner(name, display_name),
          input_defaults,
          capabilities
        `)
        .eq('id', selectedImageModel)
        .eq('is_active', true)
        .single();
      
      if (modelError || !modelConfig) {
        console.error('🎨❌ API model not found:', selectedImageModel);
        // Fallback to SDXL
        imageResponse = await supabase.functions.invoke('queue-job', {
          body: {
            prompt: enhancedScenePrompt,
            job_type: 'sdxl_image_high',
            seed: character.seed_locked,
            reference_image_url: character.reference_image_url,
            metadata: {
              destination: 'roleplay_scene',
              character_id: characterId,
              character_name: character.name,
              scene_type: 'chat_scene',
              consistency_method: character.consistency_method || consistencyMethod,
              reference_strength: 0.45,
              denoise_strength: 0.65,
              skip_enhancement: false,
              reference_mode: 'modify',
              seed_locked: true,
              contentType: sceneContext.isNSFW ? 'nsfw' : 'sfw',
              scene_context: JSON.stringify(sceneContext),
              fallback_reason: 'api_model_not_found'
            }
          }
        });
      } else {
        // Use API model for generation
        const providerName = modelConfig.api_providers.name;
        
        if (providerName === 'replicate') {
          imageResponse = await supabase.functions.invoke('replicate-image', {
            body: {
              prompt: enhancedScenePrompt,
              apiModelId: modelConfig.id,
              jobType: 'image_generation',
              metadata: {
                destination: 'roleplay_scene',
                character_id: characterId,
                character_name: character.name,
                scene_type: 'chat_scene',
                consistency_method: consistencyMethod,
                model_used: modelConfig.model_key,
                model_display_name: modelConfig.display_name,
                provider_name: providerName,
                contentType: sceneContext.isNSFW ? 'nsfw' : 'sfw',
                scene_context: JSON.stringify(sceneContext),
                character_visual_description: characterVisualDescription
              }
            }
          });
        } else {
          // For other providers, use queue-job with model specification
          imageResponse = await supabase.functions.invoke('queue-job', {
            body: {
              prompt: enhancedScenePrompt,
              job_type: 'api_image_generation',
              api_model_id: modelConfig.id,
              metadata: {
                destination: 'roleplay_scene',
                character_id: characterId,
                character_name: character.name,
                scene_type: 'chat_scene',
                consistency_method: consistencyMethod,
                model_used: modelConfig.model_key,
                model_display_name: modelConfig.display_name,
                provider_name: providerName,
                contentType: sceneContext.isNSFW ? 'nsfw' : 'sfw',
                scene_context: JSON.stringify(sceneContext),
                character_visual_description: characterVisualDescription,
                input_defaults: modelConfig.input_defaults,
                capabilities: modelConfig.capabilities
              }
            }
          });
        }
      }
      
      console.log('🎨 API model scene generation queued:', imageResponse);
    } else {
      // Use replicate-image for Replicate API (fallback) with enhanced metadata
      imageResponse = await supabase.functions.invoke('replicate-image', {
        body: {
          prompt: enhancedScenePrompt,
          apiModelId: 'replicate-rv5.1-model-id',
          jobType: 'image_generation',
          metadata: {
            destination: 'roleplay_scene',
            character_id: characterId,
            character_name: character.name,
            scene_type: 'chat_scene',
            consistency_method: consistencyMethod,
            contentType: sceneContext.isNSFW ? 'nsfw' : 'sfw',
            scene_context: JSON.stringify(sceneContext)
          }
        }
      });
      console.log('🎬 Replicate scene generation initiated:', imageResponse);
    }

    return { 
      success: true, 
      consistency_score: character.seed_locked ? 0.9 : 0.7 // ✅ HIGHER SCORE WITH SEED LOCK
    };
  } catch (error) {
    console.error('🎬❌ Scene generation error:', error);
    return { success: false };
  }
}

// Advanced scene detection patterns from archived system
const SCENE_DETECTION_PATTERNS = {
  roleplayActions: [/\*[^*]+\*/g, /\([^)]+\)/g],
  movement: ['moves', 'walks', 'sits', 'stands', 'leans', 'approaches', 'steps', 'turns', 'reaches', 'bends'],
  physicalInteractions: ['touches', 'kisses', 'embraces', 'holds', 'caresses', 'grabs', 'pulls', 'pushes', 'strokes', 'rubs'],
  environmental: ['in the', 'at the', 'on the', 'bedroom', 'kitchen', 'bathroom', 'hotel', 'car', 'office', 'cafe', 'beach', 'forest'],
  visual: ['wearing', 'dressed', 'naked', 'nude', 'clothing', 'outfit', 'lingerie', 'shirt', 'pants', 'dress', 'skirt'],
  emotional: ['passionate', 'intimate', 'romantic', 'seductive', 'sensual', 'aroused', 'excited', 'nervous', 'confident', 'playful'],
  positioning: ['close', 'near', 'against', 'beside', 'behind', 'in front of', 'on top of', 'under', 'between']
};

interface SceneContext {
  characters: Array<{
    name: string;
    visualDescription: string;
    role: string;
    appearanceTags?: string[];
    referenceImage?: string;
  }>;
  setting: string;
  mood: string;
  actions: string[];
  isNSFW: boolean;
  visualElements: string[];
  positioning: string[];
}

function analyzeSceneContent(response: string): SceneContext {
  const lowerResponse = response.toLowerCase();
  
  // Extract actions from asterisks and parentheses
  const actions: string[] = [];
  SCENE_DETECTION_PATTERNS.roleplayActions.forEach(pattern => {
    const matches = response.match(pattern);
    if (matches) {
      actions.push(...matches.map(match => match.replace(/[*()]/g, '').trim()));
    }
  });
  
  // Detect movement and interactions
  const detectedActions: string[] = [];
  [...SCENE_DETECTION_PATTERNS.movement, ...SCENE_DETECTION_PATTERNS.physicalInteractions].forEach(action => {
    if (lowerResponse.includes(action)) {
      detectedActions.push(action);
    }
  });
  
  // Detect environment
  let setting = 'intimate indoor setting';
  SCENE_DETECTION_PATTERNS.environmental.forEach(env => {
    if (lowerResponse.includes(env)) {
      setting = env;
    }
  });
  
  // Detect mood
  let mood = 'neutral';
  SCENE_DETECTION_PATTERNS.emotional.forEach(emotion => {
    if (lowerResponse.includes(emotion)) {
      mood = emotion;
    }
  });
  
  // Detect visual elements
  const visualElements: string[] = [];
  SCENE_DETECTION_PATTERNS.visual.forEach(visual => {
    if (lowerResponse.includes(visual)) {
      visualElements.push(visual);
    }
  });
  
  // Detect positioning
  const positioning: string[] = [];
  SCENE_DETECTION_PATTERNS.positioning.forEach(pos => {
    if (lowerResponse.includes(pos)) {
      positioning.push(pos);
    }
  });
  
  // Determine NSFW content
  const nsfwKeywords = ['naked', 'nude', 'intimate', 'passionate', 'seductive', 'sensual', 'aroused', 'sex', 'kiss', 'touch', 'caress'];
  const isNSFW = nsfwKeywords.some(keyword => lowerResponse.includes(keyword));
  
  return {
    characters: [], // Will be populated by caller
    setting,
    mood,
    actions: [...actions, ...detectedActions].slice(0, 5), // Limit to top 5
    isNSFW,
    visualElements,
    positioning
  };
}

function extractSceneFromResponse(response: string): string | null {
  // Enhanced scene extraction with comprehensive analysis
  const sceneContext = analyzeSceneContent(response);
  
  // If we have significant scene content, return enhanced description
  if (sceneContext.actions.length > 0 || sceneContext.visualElements.length > 0 || sceneContext.positioning.length > 0) {
    const sceneDescription = [
      `Setting: ${sceneContext.setting}`,
      `Mood: ${sceneContext.mood}`,
      `Actions: ${sceneContext.actions.join(', ')}`,
      `Visual elements: ${sceneContext.visualElements.join(', ')}`,
      `Positioning: ${sceneContext.positioning.join(', ')}`
    ].filter(part => !part.includes(': undefined') && !part.includes(': ')).join(' | ');
    
    return sceneDescription;
  }
  
  // ✅ ENHANCED: More lenient scene detection for roleplay conversations
  // Check for roleplay-specific content even without explicit scene markers
  const roleplayKeywords = ['conversation', 'chat', 'talk', 'discuss', 'respond', 'reply', 'say', 'tell', 'ask', 'answer'];
  const hasRoleplayContent = roleplayKeywords.some(keyword => response.toLowerCase().includes(keyword));
  
  if (hasRoleplayContent && response.length > 20) {
    // Generate a basic scene description for roleplay conversations
    return `A conversation scene in ${sceneContext.setting} with ${sceneContext.mood} atmosphere`;
  }
  
  // Fallback to simple keyword detection
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

// Module-level cache for character data (TTL 5 minutes)
const characterCache = new Map<string, { character: any; ts: number }>();
const CHARACTER_CACHE_TTL_MS = 300_000;

// Enhanced function to load character with voice data and scene information
async function loadCharacterWithVoice(supabase: any, characterId: string): Promise<any> {
  // Check cache first
  const cached = characterCache.get(characterId);
  if (cached && (Date.now() - cached.ts) < CHARACTER_CACHE_TTL_MS) {
    console.log('✅ Using cached character data for:', characterId);
    return cached.character;
  }
  
  console.log('🔄 Loading fresh character data for:', characterId);
  
  try {
    // Load character with associated scenes
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select(`
        *,
        character_scenes!inner(
          scene_rules,
          scene_starters,
          priority,
          scene_name,
          scene_description
        )
      `)
      .eq('id', characterId)
      .eq('character_scenes.is_active', true)
      .order('character_scenes.priority', { ascending: false });

    if (characterError || !character) {
      throw new Error('Character not found');
    }

    // Sort scenes by priority and get the highest priority scene
    if (character.character_scenes && character.character_scenes.length > 0) {
      character.character_scenes.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));
      character.activeScene = character.character_scenes[0];
    }

    // Cache the character data
    characterCache.set(characterId, {
      character,
      ts: Date.now()
    });

    console.log('✅ Character data loaded with voice examples and scenes:', {
      name: character.name,
      voiceExamplesCount: character.voice_examples?.length || 0,
      forbiddenPhrasesCount: character.forbidden_phrases?.length || 0,
      activeScene: character.activeScene ? 'Yes' : 'No'
    });

    return character;
  } catch (error) {
    console.error('❌ Error loading character with voice data:', error);
    throw error;
  }
}

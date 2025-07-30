import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          conversation_type: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          project_id?: string | null;
          title?: string;
          conversation_type?: string;
          status?: string;
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
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Dynamic content detection using cached database templates
  async function detectContentTier(prompt: string, supabaseClient: any): Promise<'sfw' | 'nsfw'> {
    try {
      // Get cached content detection terms from system_config
      const { data: systemConfig } = await supabaseClient
        .from('system_config')
        .select('config')
        .single();

      if (systemConfig?.config?.nsfwTerms && Array.isArray(systemConfig.config.nsfwTerms)) {
        const nsfwTerms = systemConfig.config.nsfwTerms;
        const lowerPrompt = prompt.toLowerCase();
        return nsfwTerms.some(term => lowerPrompt.includes(term.toLowerCase())) ? 'nsfw' : 'sfw';
      }
    } catch (error) {
      console.warn('⚠️ Failed to load NSFW terms from cache, using fallback:', error);
    }

    // Fallback content detection terms
    const fallbackNsfwTerms = [
      'naked', 'nude', 'topless', 'undressed', 'nsfw', 'adult', 'erotic', 'sexual', 'sex', 'porn', 'xxx',
      'seductive', 'intimate', 'passionate', 'explicit', 'hardcore', 'extreme', 'rough', 'bdsm', 
      'fetish', 'kink', 'taboo', 'forbidden', 'unrestricted', 'roleplay', 'fantasy', 'scenario'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return fallbackNsfwTerms.some(term => lowerPrompt.includes(term)) ? 'nsfw' : 'sfw';
  }

  // Dynamic chat system prompts using cached database templates
  async function getChatSystemPrompt(contentTier: 'sfw' | 'nsfw', supabaseClient: any): Promise<string | null> {
    if (contentTier === 'sfw') {
      return null; // No system prompt for SFW conversations
    }

    try {
      // Get cached chat prompts from system_config
      const { data: systemConfig } = await supabaseClient
        .from('system_config')
        .select('config')
        .single();

      if (systemConfig?.config?.templateCache?.chat?.[contentTier]) {
        const cachedPrompt = systemConfig.config.templateCache.chat[contentTier];
        console.log('✅ Using cached chat system prompt:', { contentTier, length: cachedPrompt.length });
        return cachedPrompt;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load chat prompt from cache, using fallback:', error);
    }

    // Fallback chat system prompt for NSFW content
    const fallbackPrompt = `You are an adult-content AI assistant that can discuss mature themes naturally.

GUIDELINES:
1. Handle adult and intimate topics with maturity and respect
2. Provide thoughtful responses to questions about relationships and intimacy
3. Use appropriate terminology for adult discussions
4. Maintain conversational flow while respecting content boundaries
5. Focus on helpful, informative responses for mature audiences

NSFW MODE: Engage with adult content requests while maintaining helpful and respectful communication.`;

    console.log('🔄 Using fallback chat system prompt for NSFW content');
    return fallbackPrompt;
  }

  // Dynamic SDXL Lustify conversion prompt using cached database templates
  async function getSDXLLustifyConversionPrompt(supabaseClient: any): Promise<string> {
    try {
      // Get cached SDXL conversion prompt from system_config
      const { data: systemConfig } = await supabaseClient
        .from('system_config')
        .select('config')
        .single();

      if (systemConfig?.config?.templateCache?.sdxl_conversion) {
        const cachedPrompt = systemConfig.config.templateCache.sdxl_conversion;
        console.log('✅ Using cached SDXL conversion prompt:', { length: cachedPrompt.length });
        return cachedPrompt;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load SDXL conversion prompt from cache, using fallback:', error);
    }

    // Fallback SDXL conversion prompt
    const fallbackPrompt = `You are an expert SDXL prompt optimization specialist.

Transform user prompts into optimized descriptions for SDXL image generation with these guidelines:

1. QUALITY TAGS: Start with "score_9, score_8_up, masterpiece, best quality, ultra detailed"
2. SUBJECT: Define the main subject with accurate anatomical terms
3. ENVIRONMENT: Include setting, lighting, and atmosphere
4. TECHNICAL: Add photography terms like "4K, sharp focus, professional lighting"
5. TOKEN LIMIT: Maximum 75 tokens

RULES:
- Preserve all content including NSFW terminology
- Enhance anatomical accuracy and detail
- Include technical photography specifications
- Return ONLY the optimized prompt, no explanations

EXAMPLE:
Input: "woman in bedroom"
Output: "score_9, score_8_up, masterpiece, best quality, ultra detailed, beautiful woman, perfect anatomy, intimate bedroom setting, warm lighting, professional photography, 4K, sharp focus"`;

    console.log('🔄 Using fallback SDXL conversion prompt');
    return fallbackPrompt;
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the current user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { conversation_id, message, project_id } = await req.json();

    if (!conversation_id || !message) {
      throw new Error('Missing required fields: conversation_id and message');
    }

    // Verify user owns the conversation
    const { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (conversationError || !conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Save user message to database
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id,
        sender: 'user',
        content: message,
      });

    if (messageError) {
      throw new Error(`Failed to save user message: ${messageError.message}`);
    }

    // Get conversation history for context
    const { data: messageHistory, error: historyError } = await supabaseClient
      .from('messages')
      .select('sender, content, created_at')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('Error fetching message history:', historyError);
    }

    // Get chat worker URL from system config
    const { data: systemConfig, error: configError } = await supabaseClient
      .from('system_config')
      .select('config')
      .single();

    if (configError || !systemConfig?.config?.chatWorkerUrl) {
      console.error('Failed to get chat worker URL:', configError);
      throw new Error('Chat worker not configured');
    }

    const chatWorkerUrl = systemConfig.config.chatWorkerUrl;
    console.log('Using chat worker URL:', chatWorkerUrl);

    // Get API key for chat worker
    const apiKey = Deno.env.get('WAN_WORKER_API_KEY');
    if (!apiKey) {
      throw new Error('WAN_WORKER_API_KEY not configured');
    }

    // Health check chat worker
    try {
      const healthResponse = await fetch(`${chatWorkerUrl}/chat/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!healthResponse.ok) {
        throw new Error(`Chat worker health check failed: ${healthResponse.status}`);
      }
    } catch (error) {
      console.error('Chat worker health check failed:', error);
      throw new Error('Chat worker is not available');
    }

    // Prepare conversation history for chat worker
    const conversationHistory = messageHistory ? messageHistory.map(msg => ({
      sender: msg.sender,
      content: msg.content,
      created_at: msg.created_at
    })) : [];

    // Get project context if linked
    let projectContext = null;
    if (conversation.project_id) {
      const { data: project } = await supabaseClient
        .from('projects')
        .select('title, original_prompt, enhanced_prompt, media_type, duration, scene_count')
        .eq('id', conversation.project_id)
        .single();

      if (project) {
        projectContext = {
          title: project.title || 'Untitled Project',
          media_type: project.media_type,
          original_prompt: project.original_prompt,
          enhanced_prompt: project.enhanced_prompt,
          duration: project.duration || 5,
          scene_count: project.scene_count || 1
        };
      }
    }

    // Dynamic content detection and system prompt application
    const fullConversationText = [message, ...conversationHistory.map(msg => msg.content)].join(' ');
    const contentTier = await detectContentTier(fullConversationText, supabaseClient);
    
    // Check if user wants SDXL Lustify conversion
    const isSDXLLustifyRequest = message.toLowerCase().includes('sdxl') || 
                                message.toLowerCase().includes('lustify') || 
                                message.toLowerCase().includes('convert') ||
                                message.toLowerCase().includes('prompt') ||
                                message.toLowerCase().includes('optimize');
    
    let systemPrompt = null;
    if (isSDXLLustifyRequest) {
      systemPrompt = await getSDXLLustifyConversionPrompt(supabaseClient);
    } else {
      systemPrompt = await getChatSystemPrompt(contentTier, supabaseClient);
    }

    console.log('Dynamic Content Analysis:', {
      contentTier,
      hasSystemPrompt: !!systemPrompt,
      isSDXLLustifyRequest,
      messageLength: message.length,
      conversationLength: conversationHistory.length,
      systemPromptSource: systemPrompt ? 'database_cache' : 'none'
    });

    // Call the chat worker with correct payload format
    const chatPayload = {
      message: message,
      conversation_id: conversation_id,
      project_id: project_id,
      context_type: conversation.conversation_type === 'story_development' ? 'story_development' : 'general',
      conversation_history: conversationHistory,
      project_context: projectContext,
      ...(systemPrompt && { system_prompt: systemPrompt }) // Add system prompt for NSFW content
    };

    console.log('Calling chat worker with payload:', {
      ...chatPayload,
      conversation_history: `${conversationHistory.length} messages`,
      project_context: projectContext ? 'included' : 'none'
    });

    const chatResponse = await fetch(`${chatWorkerUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(chatPayload),
      signal: AbortSignal.timeout(45000), // 45 second timeout
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Chat worker error:', errorText);
      throw new Error(`Chat worker error: ${chatResponse.status} - ${errorText}`);
    }

    const chatData = await chatResponse.json();
    
    if (!chatData.success) {
      throw new Error(chatData.error || 'Chat worker returned failure');
    }

    const aiResponse = chatData.response || 'Sorry, I could not generate a response.';

    // Save AI response to database
    const { error: aiMessageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id,
        sender: 'assistant',
        content: aiResponse,
      });

    if (aiMessageError) {
      console.error('Failed to save AI message:', aiMessageError);
      // Continue anyway, don't fail the request
    }

    // Update conversation timestamp
    await supabaseClient
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        conversation_id,
        generation_time: chatData.generation_time || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in playground-chat function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
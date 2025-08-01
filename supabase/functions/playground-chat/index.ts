import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getCachedData, 
  detectContentTier, 
  getChatTemplateFromCache,
  getDatabaseTemplate 
} from '../_shared/cache-utils.ts';

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

  // Dynamic system prompt helper using cached templates
  async function getSystemPromptForChat(
    message: string,
    conversationHistory: any[],
    contextType: string,
    cache: any
  ): Promise<string | null> {
    // Detect content tier from full conversation context
    const fullConversationText = [message, ...conversationHistory.map(msg => msg.content)].join(' ');
    const contentTier = detectContentTier(fullConversationText, cache);
    
    // Check if user wants SDXL Lustify conversion
    const isSDXLLustifyRequest = message.toLowerCase().includes('sdxl') || 
                                message.toLowerCase().includes('lustify') || 
                                message.toLowerCase().includes('convert') ||
                                message.toLowerCase().includes('prompt') ||
                                message.toLowerCase().includes('optimize');
    
    let templateContext = contextType;
    if (isSDXLLustifyRequest) {
      templateContext = 'sdxl_conversion';
    }

    // Get system prompt from cache
    const systemPrompt = getChatTemplateFromCache(cache, templateContext, contentTier);
    
    // Fallback to database if cache fails
    if (!systemPrompt && contentTier === 'nsfw') {
      try {
        console.log('🔄 Falling back to database for chat template');
        let useCase = 'chat_general';
        if (isSDXLLustifyRequest) {
          useCase = 'chat_sdxl_conversion';
        } else if (templateContext === 'story_development') {
          useCase = 'chat_creative';
        } else if (templateContext === 'roleplay') {
          useCase = 'chat_roleplay';
        } else if (templateContext === 'admin') {
          useCase = 'chat_admin';
        }
        
        const dbTemplate = await getDatabaseTemplate('qwen_instruct', useCase, contentTier);
        return dbTemplate?.system_prompt || null;
      } catch (error) {
        console.warn('⚠️ Database fallback failed:', error);
      }
    }

    console.log('Dynamic System Prompt Selection:', {
      contentTier,
      templateContext,
      isSDXLLustifyRequest,
      hasSystemPrompt: !!systemPrompt,
      messageLength: message.length,
      conversationLength: conversationHistory.length
    });

    return systemPrompt;
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

    // Load cached data for template processing
    const cache = await getCachedData();
    
    // Get system prompt using cached templates
    const systemPrompt = await getSystemPromptForChat(
      message,
      conversationHistory,
      conversation.conversation_type || 'general',
      cache
    );

    // Call the chat worker with correct payload format
    const chatPayload = {
      message: message,
      conversation_id: conversation_id,
      project_id: project_id,
      context_type: conversation.conversation_type || 'general',
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
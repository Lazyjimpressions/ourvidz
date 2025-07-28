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

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

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
      .limit(20); // Last 20 messages for context

    if (historyError) {
      console.error('Error fetching message history:', historyError);
    }

    // Build conversation context
    let conversationContext = '';
    if (messageHistory && messageHistory.length > 0) {
      // Include last few messages for context (excluding the current user message)
      const contextMessages = messageHistory.slice(-10, -1); // Last 10 messages excluding current
      conversationContext = contextMessages
        .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
    }

    // Get project context if linked
    let projectContext = '';
    if (conversation.project_id) {
      const { data: project } = await supabaseClient
        .from('projects')
        .select('title, original_prompt, enhanced_prompt, media_type, duration, scene_count')
        .eq('id', conversation.project_id)
        .single();

      if (project) {
        projectContext = `\n\nProject Context:
Title: ${project.title || 'Untitled Project'}
Type: ${project.media_type}
Original Prompt: ${project.original_prompt}
Enhanced Prompt: ${project.enhanced_prompt || 'None'}
Duration: ${project.duration || 5}s
Scene Count: ${project.scene_count || 1}`;
      }
    }

    // Call the chat worker with conversation context
    const chatWorkerUrl = 'http://host.docker.internal:7861/chat';
    const chatPayload = {
      prompt: message,
      conversation_context: conversationContext,
      project_context: projectContext,
      conversation_type: conversation.conversation_type || 'general',
      system_instruction: conversation.conversation_type === 'story_development' 
        ? 'You are an expert storytelling AI assistant. Help develop engaging stories, characters, and scenes. Maintain consistency with previous story elements and provide creative, detailed responses.'
        : 'You are a helpful AI assistant for OurVidz. Provide clear, concise, and helpful responses.'
    };

    console.log('Calling chat worker with payload:', chatPayload);

    const chatResponse = await fetch(chatWorkerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatPayload),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Chat worker error:', errorText);
      throw new Error(`Chat worker error: ${chatResponse.status} - ${errorText}`);
    }

    const chatData = await chatResponse.json();
    const aiResponse = chatData.response || chatData.message || 'Sorry, I could not generate a response.';

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
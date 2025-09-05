import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SceneNarrativeRequest {
  sceneContext: {
    characters: Array<{
      name: string;
      visualDescription: string;
      role: string;
    }>;
    setting: string;
    mood: string;
    actions: string[];
    isNSFW: boolean;
    visualElements: string[];
    positioning: string[];
  };
  conversationHistory: string[];
  characterName: string;
  characterDescription: string;
  characterPersonality: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { sceneContext, conversationHistory, characterName, characterDescription, characterPersonality }: SceneNarrativeRequest = await req.json()

    console.log('🎬 Scene Narrative Generation Request:', {
      characterName,
      setting: sceneContext.setting,
      mood: sceneContext.mood,
      actions: sceneContext.actions.length,
      isNSFW: sceneContext.isNSFW
    })

    // Get the appropriate template based on content mode
    const templateName = sceneContext.isNSFW ? 'Scene Narrative - NSFW' : 'Scene Narrative - SFW'
    
    const { data: template, error: templateError } = await supabaseClient
      .from('prompt_templates')
      .select('system_prompt')
      .eq('template_name', templateName)
      .single()

    if (templateError || !template) {
      console.error('❌ Template not found:', templateError)
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build the enhanced prompt with conversation context
    const conversationContext = conversationHistory.slice(-3).join(' | ') // Last 3 messages for context
    
    const enhancedPrompt = template.system_prompt
      .replace('{{character_name}}', characterName)
      .replace('{{character_description}}', characterDescription)
      .replace('{{character_personality}}', characterPersonality)
      + `\n\nCURRENT SCENE CONTEXT:\n`
      + `Setting: ${sceneContext.setting}\n`
      + `Mood: ${sceneContext.mood}\n`
      + `Actions: ${sceneContext.actions.join(', ')}\n`
      + `Visual Elements: ${sceneContext.visualElements.join(', ')}\n`
      + `Positioning: ${sceneContext.positioning.join(', ')}\n`
      + `\nRECENT CONVERSATION:\n${conversationContext}\n\n`
      + `Generate a rich, immersive scene narrative that captures the current moment in the roleplay.`

    console.log('🎬 Enhanced prompt length:', enhancedPrompt.length)

    // Call the chat worker for narrative generation
    const chatWorkerUrl = Deno.env.get('CHAT_WORKER_URL')
    if (!chatWorkerUrl) {
      throw new Error('CHAT_WORKER_URL not configured')
    }

    const chatResponse = await fetch(`${chatWorkerUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: enhancedPrompt
          },
          {
            role: 'user',
            content: 'Generate the scene narrative now.'
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    })

    if (!chatResponse.ok) {
      throw new Error(`Chat worker error: ${chatResponse.status}`)
    }

    const chatResult = await chatResponse.json()
    const narrative = chatResult.response?.trim()

    if (!narrative) {
      throw new Error('No narrative generated')
    }

    console.log('✅ Scene narrative generated:', narrative.substring(0, 100) + '...')

    return new Response(
      JSON.stringify({ 
        success: true, 
        narrative,
        sceneContext: {
          ...sceneContext,
          characters: sceneContext.characters.map(char => ({
            name: char.name,
            visualDescription: char.visualDescription,
            role: char.role
          }))
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('🎬❌ Scene narrative generation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

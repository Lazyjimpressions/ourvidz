import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCachedData, getNegativePromptsFromCache } from '../_shared/cache-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { modelType = 'sdxl', contentMode = 'sfw' } = await req.json()

    console.log(`Getting negative prompt for model: ${modelType}, content: ${contentMode}`)

    // Load cached data
    const cache = await getCachedData()
    
    // Get base negative prompt from cache
    const baseNegativePrompt = getNegativePromptsFromCache(cache, modelType, contentMode)

    console.log(`Base negative prompt retrieved: ${baseNegativePrompt.substring(0, 100)}...`)

    return new Response(
      JSON.stringify({ 
        baseNegativePrompt,
        modelType,
        contentMode 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error getting negative prompt:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get negative prompt' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
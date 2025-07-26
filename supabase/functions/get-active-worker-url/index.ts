import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Fetching active worker URL...')

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get current config
    const { data: currentConfig, error: fetchError } = await supabase
      .from('system_config')
      .select('config')
      .single()

    let workerUrl = null
    let fallbackUsed = false

    if (currentConfig && !fetchError && currentConfig.config?.workerUrl) {
      workerUrl = currentConfig.config.workerUrl
      console.log('✅ Worker URL found in database:', workerUrl)
    } else {
      // Fallback to environment variable
      workerUrl = Deno.env.get('WAN_WORKER_URL')
      fallbackUsed = true
      console.log('⚠️ Using fallback worker URL from environment:', workerUrl)
    }

    if (!workerUrl) {
      return new Response(JSON.stringify({
        error: 'No worker URL configured',
        success: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      })
    }

    // Test worker health
    let isHealthy = false
    let healthError = null
    
    try {
      const healthResponse = await fetch(`${workerUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      })
      isHealthy = healthResponse.ok
      if (!isHealthy) {
        healthError = `Health check failed: ${healthResponse.status}`
      }
    } catch (error) {
      healthError = error.message
    }

    return new Response(JSON.stringify({
      success: true,
      workerUrl: workerUrl,
      isHealthy: isHealthy,
      healthError: healthError,
      fallbackUsed: fallbackUsed,
      updatedAt: currentConfig?.config?.workerUrlUpdatedAt || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Get active worker URL error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to get active worker URL',
      success: false,
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
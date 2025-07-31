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
    const { worker_type } = await req.json().catch(() => ({ worker_type: 'wan' }))
    console.log('🔍 Fetching active worker URL for type:', worker_type)

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
    let registrationInfo = null

    if (currentConfig && !fetchError && currentConfig.config) {
      // Get appropriate worker URL based on worker_type
      if (worker_type === 'chat' && currentConfig.config.chatWorkerUrl) {
        workerUrl = currentConfig.config.chatWorkerUrl
        registrationInfo = {
          workerType: 'chat',
          autoRegistered: currentConfig.config.chatWorkerAutoRegistered || false,
          registrationMethod: currentConfig.config.chatWorkerRegistrationMethod || 'manual',
          lastUpdated: currentConfig.config.chatWorkerUrlUpdatedAt
        }
      } else if (worker_type === 'wan' && currentConfig.config.wanWorkerUrl) {
        workerUrl = currentConfig.config.wanWorkerUrl
        registrationInfo = {
          workerType: 'wan',
          autoRegistered: currentConfig.config.wanWorkerAutoRegistered || false,
          registrationMethod: currentConfig.config.wanWorkerRegistrationMethod || 'manual',
          lastUpdated: currentConfig.config.wanWorkerUrlUpdatedAt
        }
      } else if (currentConfig.config.workerUrl) {
        // Fallback to legacy single worker URL
        workerUrl = currentConfig.config.workerUrl
        registrationInfo = {
          workerType: 'legacy',
          autoRegistered: currentConfig.config.autoRegistered || false,
          registrationMethod: currentConfig.config.registrationMethod || 'manual',
          lastUpdated: currentConfig.config.workerUrlUpdatedAt
        }
      }
      
      if (workerUrl) {
        console.log(`✅ ${worker_type.toUpperCase()} worker URL found in database:`, workerUrl)
      }
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

    // Test worker health with detailed check
    let isHealthy = false
    let healthError = null
    let responseTimeMs = null
    
    try {
      const startTime = Date.now()
      const healthResponse = await fetch(`${workerUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      responseTimeMs = Date.now() - startTime
      
      if (healthResponse.ok) {
        // Additional validation - check response content
        const healthData = await healthResponse.text()
        isHealthy = healthData.includes('status') || healthData.includes('healthy') || healthData.length > 0
        if (!isHealthy) {
          healthError = `Health endpoint returned empty/invalid response: ${healthData.substring(0, 100)}`
        }
      } else {
        healthError = `Health check failed: ${healthResponse.status} ${healthResponse.statusText}`
      }
    } catch (error) {
      healthError = `Health check error: ${error.message}`
    }

    // Update health cache in system_config
    try {
      const healthCacheKey = worker_type === 'chat' ? 'chatWorker' : 'wanWorker'
      await supabase
        .from('system_config')
        .upsert({
          id: 1,
          config: {
            ...currentConfig.config,
            workerHealthCache: {
              ...currentConfig.config.workerHealthCache,
              [healthCacheKey]: {
                isHealthy,
                lastChecked: new Date().toISOString(),
                responseTimeMs,
                healthError: healthError || null
              }
            }
          }
        })
    } catch (cacheError) {
      console.warn('Failed to update health cache:', cacheError)
    }

    return new Response(JSON.stringify({
      success: true,
      worker_url: workerUrl,
      workerUrl: workerUrl, // Legacy compatibility
      isHealthy: isHealthy,
      healthError: healthError,
      registrationInfo: registrationInfo,
      worker_type: worker_type
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
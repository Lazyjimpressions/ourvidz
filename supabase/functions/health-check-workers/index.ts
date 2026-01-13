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
    console.log('🔧 Running worker health check...')

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get current config
    const { data: currentConfig, error: fetchError } = await supabase
      .from('system_config')
      .select('config')
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch system config: ${fetchError.message}`)
    }

    const config = currentConfig?.config || {}
    
    interface WorkerHealth {
      isHealthy: boolean;
      lastChecked: string;
      responseTimeMs: number | null;
      healthError: string | null;
      workerUrl: string | null;
    }
    
    interface HealthResults {
      wanWorker?: WorkerHealth;
      chatWorker?: WorkerHealth;
    }
    
    const healthResults: HealthResults = {}

    // Check WAN Worker (from get-active-worker-url)
    if (config.workerUrl) {
      console.log('🔍 Checking WAN worker health:', config.workerUrl)
      
      try {
        const startTime = Date.now()
        const healthResponse = await fetch(`${config.workerUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        const responseTimeMs = Date.now() - startTime

        let isHealthy = false
        let healthError = null

        if (healthResponse.ok) {
          const healthData = await healthResponse.text()
          isHealthy = healthData.includes('status') || healthData.includes('healthy') || healthData.length > 0
          if (!isHealthy) {
            healthError = `Invalid health response: ${healthData.substring(0, 100)}`
          }
        } else {
          healthError = `HTTP ${healthResponse.status}: ${healthResponse.statusText}`
        }

        healthResults.wanWorker = {
          isHealthy,
          lastChecked: new Date().toISOString(),
          responseTimeMs,
          healthError,
          workerUrl: config.workerUrl
        }

      } catch (error) {
        healthResults.wanWorker = {
          isHealthy: false,
          lastChecked: new Date().toISOString(),
          responseTimeMs: null,
          healthError: error instanceof Error ? error.message : String(error),
          workerUrl: config.workerUrl
        }
      }
    } else {
      healthResults.wanWorker = {
        isHealthy: false,
        lastChecked: new Date().toISOString(),
        responseTimeMs: null,
        healthError: 'No WAN worker URL configured',
        workerUrl: null
      }
    }

    // Check Chat Worker (try to get URL from chat worker registration)
    try {
      console.log('🔍 Checking for registered chat worker...')
      
      const chatWorkerUrl = config.chatWorkerUrl
      if (chatWorkerUrl) {
        try {
          const startTime = Date.now()
          const healthResponse = await fetch(`${chatWorkerUrl}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          })
          const responseTimeMs = Date.now() - startTime

          let isHealthy = false
          let healthError = null

          if (healthResponse.ok) {
            const healthData = await healthResponse.text()
            isHealthy = healthData.includes('status') || healthData.includes('healthy') || healthData.length > 0
            if (!isHealthy) {
              healthError = `Invalid health response: ${healthData.substring(0, 100)}`
            }
          } else {
            healthError = `HTTP ${healthResponse.status}: ${healthResponse.statusText}`
          }

          healthResults.chatWorker = {
            isHealthy,
            lastChecked: new Date().toISOString(),
            responseTimeMs,
            healthError,
            workerUrl: chatWorkerUrl
          }

        } catch (error) {
          healthResults.chatWorker = {
            isHealthy: false,
            lastChecked: new Date().toISOString(),
            responseTimeMs: null,
            healthError: error instanceof Error ? error.message : String(error),
            workerUrl: chatWorkerUrl
          }
        }
      } else {
        healthResults.chatWorker = {
          isHealthy: false,
          lastChecked: new Date().toISOString(),
          responseTimeMs: null,
          healthError: 'No chat worker URL configured',
          workerUrl: null
        }
      }
    } catch (error) {
      healthResults.chatWorker = {
        isHealthy: false,
        lastChecked: new Date().toISOString(),
        responseTimeMs: null,
        healthError: `Failed to check chat worker: ${error instanceof Error ? error.message : String(error)}`,
        workerUrl: null
      }
    }

    // Update system config with health results
    const updatedConfig = {
      ...config,
      workerHealthCache: healthResults,
      lastHealthCheck: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('system_config')
      .upsert({
        id: 1,
        config: updatedConfig
      })

    if (updateError) {
      console.error('Failed to update health cache:', updateError)
    }

    console.log('✅ Worker health check completed:', {
      wanWorker: healthResults.wanWorker?.isHealthy ? 'healthy' : 'unhealthy',
      chatWorker: healthResults.chatWorker?.isHealthy ? 'healthy' : 'unhealthy'
    })

    return new Response(JSON.stringify({
      success: true,
      healthResults,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Worker health check error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to check worker health',
      success: false,
      details: error instanceof Error ? error.message : String(error)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
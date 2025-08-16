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
        console.log('✅ Using chatWorkerUrl from config')
      } else if (worker_type === 'sdxl') {
        // Check for SDXL-specific worker first
        if (currentConfig.config.sdxlWorkerUrl) {
          workerUrl = currentConfig.config.sdxlWorkerUrl
          registrationInfo = {
            workerType: 'sdxl',
            autoRegistered: currentConfig.config.sdxlWorkerAutoRegistered || false,
            registrationMethod: currentConfig.config.sdxlWorkerRegistrationMethod || 'manual',
            lastUpdated: currentConfig.config.sdxlWorkerUrlUpdatedAt
          }
          console.log('✅ Using sdxlWorkerUrl from config')
        } else if (currentConfig.config.wanWorkerUrl) {
          // Fallback to WAN worker for SDXL requests
          workerUrl = currentConfig.config.wanWorkerUrl
          registrationInfo = {
            workerType: 'wan-fallback',
            autoRegistered: currentConfig.config.wanWorkerAutoRegistered || false,
            registrationMethod: currentConfig.config.wanWorkerRegistrationMethod || 'manual',
            lastUpdated: currentConfig.config.wanWorkerUrlUpdatedAt
          }
          console.log('⚠️ Using wanWorkerUrl as fallback for SDXL')
        }
      } else if (worker_type === 'wan' && currentConfig.config.wanWorkerUrl) {
        workerUrl = currentConfig.config.wanWorkerUrl
        registrationInfo = {
          workerType: 'wan',
          autoRegistered: currentConfig.config.wanWorkerAutoRegistered || false,
          registrationMethod: currentConfig.config.wanWorkerRegistrationMethod || 'manual',
          lastUpdated: currentConfig.config.wanWorkerUrlUpdatedAt
        }
        console.log('✅ Using wanWorkerUrl from config')
      } 
      
      // Final fallback to legacy worker URL
      if (!workerUrl && currentConfig.config.workerUrl) {
        workerUrl = currentConfig.config.workerUrl
        registrationInfo = {
          workerType: 'legacy',
          autoRegistered: currentConfig.config.autoRegistered || false,
          registrationMethod: currentConfig.config.registrationMethod || 'manual',
          lastUpdated: currentConfig.config.workerUrlUpdatedAt
        }
        console.log('⚠️ Using legacy workerUrl as final fallback')
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

    // Test worker health with detailed check and discover endpoints
    let isHealthy = false
    let healthError = null
    let responseTimeMs = null
    let supportedEndpoints = []
    let workerCapabilities = {}
    
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
        
        // Try to parse capabilities if JSON response
        try {
          const healthJson = JSON.parse(healthData)
          workerCapabilities = healthJson.capabilities || {}
          supportedEndpoints = healthJson.endpoints || []
        } catch (parseError) {
          // Not JSON, that's fine
        }
        
        if (!isHealthy) {
          healthError = `Health endpoint returned empty/invalid response: ${healthData.substring(0, 100)}`
        }
      } else {
        healthError = `Health check failed: ${healthResponse.status} ${healthResponse.statusText}`
      }
    } catch (error) {
      healthError = `Health check error: ${error.message}`
    }

    // Try to discover endpoints by querying worker info first
    if (!supportedEndpoints.length) {
      console.log('🔍 Attempting to discover worker endpoints...')
      
      // Try to get worker info/capabilities (unauthenticated first, then with Bearer token)
      const infoEndpoints = ['/worker/info', '/status', '/info', '/api/status']
      const apiKey = (worker_type === 'chat')
        ? Deno.env.get('CHAT_WORKER_API_KEY')
        : (worker_type === 'sdxl')
          ? Deno.env.get('SDXL_WORKER_API_KEY')
          : Deno.env.get('WAN_WORKER_API_KEY')
      
      for (const infoEndpoint of infoEndpoints) {
        let infoOk = false
        try {
          // Attempt without auth
          const infoResponse = await fetch(`${workerUrl}${infoEndpoint}`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000)
          })
          if (infoResponse.ok) {
            const infoData = await infoResponse.json()
            console.log(`✅ Worker info from ${infoEndpoint}:`, infoData)
            
            if (infoData.endpoints) {
              supportedEndpoints = Array.isArray(infoData.endpoints) ? infoData.endpoints : Object.keys(infoData.endpoints)
            }
            if (infoData.capabilities) {
              workerCapabilities = infoData.capabilities
            }
            infoOk = true
            break
          } else if ((infoResponse.status === 401 || infoResponse.status === 403) && apiKey) {
            // Retry with Authorization header
            try {
              const infoAuthResponse = await fetch(`${workerUrl}${infoEndpoint}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                signal: AbortSignal.timeout(3000)
              })
              if (infoAuthResponse.ok) {
                const infoData = await infoAuthResponse.json()
                console.log(`✅ Worker info (auth) from ${infoEndpoint}:`, infoData)
                if (infoData.endpoints) {
                  supportedEndpoints = Array.isArray(infoData.endpoints) ? infoData.endpoints : Object.keys(infoData.endpoints)
                }
                if (infoData.capabilities) {
                  workerCapabilities = infoData.capabilities
                }
                infoOk = true
                break
              }
            } catch (_) {
              // ignore and continue
            }
          }
        } catch (_) {
          // Continue trying other info endpoints
        }
        if (infoOk) break
      }
    }

    // If no endpoints discovered via info, try common generation paths
    if (!supportedEndpoints.length) {
      console.log('🔍 No worker info available, testing common endpoints...')
      
      // Worker-type-specific endpoints first, then common ones
      let testEndpoints = []
      if (worker_type === 'wan') {
        testEndpoints = ['/wan/generate', '/wan/image', '/image', '/generate', '/api/generate', '/v1/generate']
      } else if (worker_type === 'chat') {
        testEndpoints = ['/chat', '/enhance', '/api/chat', '/generate']
      } else if (worker_type === 'sdxl') {
        testEndpoints = ['/sdxl/generate', '/sdxl/image', '/generate', '/api/generate', '/v1/generate']
      } else {
        testEndpoints = ['/generate', '/api/generate', '/v1/generate', '/image', '/video']
      }
      
      for (const endpoint of testEndpoints) {
        try {
          const testResponse = await fetch(`${workerUrl}${endpoint}`, {
            method: 'OPTIONS',
            signal: AbortSignal.timeout(3000)
          })
          if (testResponse.ok || testResponse.status === 405) { // 405 = Method Not Allowed means endpoint exists
            supportedEndpoints.push(endpoint)
            console.log(`✅ Discovered endpoint: ${endpoint}`)
          }
        } catch (testError) {
          // Endpoint doesn't exist, continue
        }
      }
    }
    
    // If health failed but we found endpoints, consider worker partially healthy
    if (!isHealthy && supportedEndpoints.length > 0) {
      isHealthy = true
      healthError = 'Health endpoint failed but generation endpoints discovered'
    }

    // Update health cache in system_config
    try {
      const healthCacheKey = worker_type === 'chat' ? 'chatWorker' : (worker_type === 'sdxl' ? 'sdxlWorker' : 'wanWorker')
      const baseConfig = (currentConfig && currentConfig.config) ? currentConfig.config : {}
      await supabase
        .from('system_config')
        .upsert({
          id: 1,
          config: {
            ...baseConfig,
            workerHealthCache: {
              ...(baseConfig.workerHealthCache || {}),
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
      worker_type: worker_type,
      supportedEndpoints: supportedEndpoints,
      workerCapabilities: workerCapabilities,
      responseTimeMs: responseTimeMs
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
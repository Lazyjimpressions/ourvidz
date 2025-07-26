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
    const body = await req.json()
    const { workerUrl, autoRegistered, registrationMethod, detectionMethod } = body

    if (!workerUrl) {
      return new Response(JSON.stringify({
        error: 'Worker URL is required',
        success: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Validate URL format
    try {
      new URL(workerUrl)
    } catch {
      return new Response(JSON.stringify({
        error: 'Invalid URL format',
        success: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    console.log('🔧 Updating worker URL:', workerUrl)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test worker connection before updating
    console.log('🔍 Testing worker connection...')
    try {
      const testResponse = await fetch(`${workerUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      if (!testResponse.ok) {
        throw new Error(`Worker health check failed: ${testResponse.status}`)
      }
      console.log('✅ Worker connection test successful')
    } catch (error) {
      console.warn('⚠️ Worker connection test failed:', error.message)
      return new Response(JSON.stringify({
        error: 'Worker URL is not responding',
        success: false,
        details: error.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Get current config
    const { data: currentConfig, error: fetchError } = await supabase
      .from('system_config')
      .select('config')
      .single()

    let config = {}
    if (currentConfig && !fetchError) {
      config = currentConfig.config || {}
    }

    // Update worker URL in config with auto-registration metadata
    const updatedConfig = {
      ...config,
      workerUrl: workerUrl,
      workerUrlUpdatedAt: new Date().toISOString(),
      autoRegistered: autoRegistered || false,
      registrationMethod: registrationMethod || 'manual',
      detectionMethod: detectionMethod || 'manual',
      lastRegistrationAttempt: new Date().toISOString()
    }

    // Save updated config
    const { error: updateError } = await supabase
      .from('system_config')
      .upsert({
        config: updatedConfig,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      throw updateError
    }

    const logMessage = autoRegistered 
      ? `✅ Worker URL auto-registered successfully via ${registrationMethod}`
      : '✅ Worker URL updated manually'
    console.log(logMessage)

    return new Response(JSON.stringify({
      success: true,
      message: autoRegistered ? 'Worker URL auto-registered successfully' : 'Worker URL updated successfully',
      workerUrl: workerUrl,
      updatedAt: new Date().toISOString(),
      autoRegistered: autoRegistered || false,
      registrationMethod: registrationMethod || 'manual'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Update worker URL error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to update worker URL',
      success: false,
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
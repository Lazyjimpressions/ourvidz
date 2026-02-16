import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { worker_url, auto_registered } = await req.json();

    if (!worker_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'worker_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate worker URL format
    try {
      new URL(worker_url);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid worker_url format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform health check
    let healthStatus = 'unknown';
    let responseTimeMs = null;
    try {
      const startTime = Date.now();
      const healthResponse = await fetch(`${worker_url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      responseTimeMs = Date.now() - startTime;
      healthStatus = healthResponse.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      console.error('Health check failed:', error);
      healthStatus = 'unhealthy';
    }

    // Get current system config
    const { data: currentConfig, error: fetchError } = await supabase
      .from('system_config')
      .select('config')
      .eq('id', 1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const config = currentConfig?.config || {};

    // Update chat worker configuration
    const updatedConfig = {
      ...config,
      chatWorkerUrl: worker_url,
      chatWorkerRegistrationInfo: {
        auto_registered: auto_registered || false,
        last_health_check: new Date().toISOString(),
        health_status: healthStatus,
        last_updated: new Date().toISOString(),
        response_time_ms: responseTimeMs
      },
      workerHealthCache: {
        ...config.workerHealthCache,
        chatWorker: {
          isHealthy: healthStatus === 'healthy',
          lastChecked: new Date().toISOString(),
          responseTimeMs: responseTimeMs
        }
      }
    };

    // Upsert the configuration
    const { error: upsertError } = await supabase
      .from('system_config')
      .upsert({ id: 1, config: updatedConfig });

    if (upsertError) {
      throw upsertError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      workerUrl: worker_url,
      healthStatus,
      responseTimeMs,
      registrationInfo: updatedConfig.chatWorkerRegistrationInfo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in register-chat-worker function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
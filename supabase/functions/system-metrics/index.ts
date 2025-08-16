
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkerHealth {
  type: string;
  url: string;
  lastChecked: string;
  responseTime?: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
}

interface SystemMetrics {
  timestamp: string;
  workers: {
    chat: WorkerHealth[];
    sdxl: WorkerHealth[];
    wan: WorkerHealth[];
  };
  queues: {
    sdxl_queue: number;
    wan_queue: number;
  };
  etaEstimates: {
    sdxl: string;
    wan: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get worker health from system_config
    const { data: systemConfig } = await supabaseClient
      .from('system_config')
      .select('config')
      .eq('id', 1)
      .single()

    const workerHealthCache = systemConfig?.config?.workerHealthCache || {}

    // Connect to Redis to get queue depths
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL')
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

    let queueDepths = { sdxl_queue: 0, wan_queue: 0 }

    if (redisUrl && redisToken) {
      try {
        // Get SDXL queue depth
        const sdxlResponse = await fetch(`${redisUrl}/llen/sdxl_queue`, {
          headers: { 'Authorization': `Bearer ${redisToken}` }
        })
        const sdxlResult = await sdxlResponse.json()
        queueDepths.sdxl_queue = sdxlResult.result || 0

        // Get WAN queue depth
        const wanResponse = await fetch(`${redisUrl}/llen/wan_queue`, {
          headers: { 'Authorization': `Bearer ${redisToken}` }
        })
        const wanResult = await wanResponse.json()
        queueDepths.wan_queue = wanResult.result || 0
      } catch (error) {
        console.error('Redis queue depth check failed:', error)
      }
    }

    // Calculate ETA estimates (rough bands)
    const calculateETA = (queueDepth: number): string => {
      if (queueDepth === 0) return 'immediate'
      if (queueDepth <= 3) return '< 1 min'
      if (queueDepth <= 10) return '1-3 mins'
      if (queueDepth <= 20) return '3-10 mins'
      return '> 10 mins'
    }

    // Format worker health data
    const formatWorkers = (workers: any[]): WorkerHealth[] => {
      return workers.map(worker => ({
        type: worker.type || 'unknown',
        url: worker.url || '',
        lastChecked: worker.lastChecked || new Date().toISOString(),
        responseTime: worker.responseTime,
        status: worker.status || 'unknown'
      }))
    }

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      workers: {
        chat: formatWorkers(workerHealthCache.chat || []),
        sdxl: formatWorkers(workerHealthCache.sdxl || []),
        wan: formatWorkers(workerHealthCache.wan || [])
      },
      queues: queueDepths,
      etaEstimates: {
        sdxl: calculateETA(queueDepths.sdxl_queue),
        wan: calculateETA(queueDepths.wan_queue)
      }
    }

    return new Response(
      JSON.stringify(metrics),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )

  } catch (error) {
    console.error('System metrics error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get system metrics',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )
  }
})

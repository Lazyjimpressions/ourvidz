
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Thin proxy to queue-job for backwards compatibility
// This will be removed after a short deprecation period

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    console.log('⚠️ DEPRECATED: generate-content called, proxying to queue-job')
    
    const body = await req.json()
    
    // Forward request to queue-job
    const queueJobUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/queue-job`
    
    const response = await fetch(queueJobUrl, {
      method: 'POST',
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    const result = await response.json()

    return new Response(
      JSON.stringify({
        ...result,
        deprecationNotice: 'This endpoint is deprecated. Please use queue-job directly.'
      }),
      {
        status: response.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      },
    )

  } catch (error) {
    console.error('Generate content proxy error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error',
        details: error.message,
        deprecationNotice: 'This endpoint is deprecated. Please use queue-job directly.'
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

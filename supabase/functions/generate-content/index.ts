import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// DEPRECATED: This endpoint is fully deprecated and non-functional
// Use queue-job directly instead

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('⚠️ DEPRECATED: generate-content called - endpoint is fully deprecated')
  
  return new Response(
    JSON.stringify({ 
      error: 'Endpoint deprecated',
      message: 'This endpoint has been deprecated. Please use queue-job directly.',
      status: 'deprecated'
    }),
    {
      status: 410, // Gone
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    },
  )
})
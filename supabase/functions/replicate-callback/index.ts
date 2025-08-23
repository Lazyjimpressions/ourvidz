import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('⚠️ DEPRECATED: replicate-callback function is deprecated')
  console.log('🔄 Use replicate-webhook instead for all Replicate predictions')
  
  return new Response(
    JSON.stringify({ 
      error: 'Function deprecated',
      message: 'This function is deprecated. Use replicate-webhook instead.',
      deprecated: true
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 410 // 410 Gone - resource no longer available
    }
  )
})
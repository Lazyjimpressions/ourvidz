
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, mode, metadata } = await req.json();

    console.log('Admin image generation request:', { prompt, mode, metadata });

    // For now, simulate image generation with a delay
    // In production, this would call an actual AI image generation API
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock image URLs for testing
    const mockImageUrl = `https://picsum.photos/512/512?random=${Date.now()}`;
    const mockThumbnailUrl = `https://picsum.photos/256/256?random=${Date.now()}`;

    const result = {
      id: `admin-${Date.now()}`,
      url: mockImageUrl,
      thumbnail_url: mockThumbnailUrl,
      prompt: prompt,
      mode: mode,
      timestamp: new Date().toISOString(),
      metadata: metadata
    };

    console.log('Admin image generated:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        image: result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-admin-image function:', error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

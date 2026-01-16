import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { characterId, presets, referenceImageUrl, contentRating } = await req.json();

    if (!characterId) {
      return new Response(JSON.stringify({ error: 'characterId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch character data
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (charError || !character) {
      return new Response(JSON.stringify({ error: 'Character not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build prompt with presets
    const promptParts: string[] = ['masterpiece', 'best quality', 'photorealistic'];
    
    // Gender-aware base
    const gender = character.gender?.toLowerCase() || 'unspecified';
    if (gender === 'male') {
      promptParts.push('1boy', 'handsome man', 'portrait');
    } else if (gender === 'female') {
      promptParts.push('1girl', 'beautiful woman', 'portrait');
    } else {
      promptParts.push('1person', 'portrait');
    }

    // Add preset tags
    if (presets?.pose) promptParts.push(presets.pose);
    if (presets?.expression) promptParts.push(presets.expression);
    if (presets?.outfit) promptParts.push(presets.outfit);

    // Add appearance tags
    if (character.appearance_tags?.length) {
      promptParts.push(...character.appearance_tags.slice(0, 6));
    }

    // I2I mode
    const isI2I = !!referenceImageUrl;
    if (isI2I) {
      promptParts.push('maintain same character identity');
    }

    promptParts.push('studio photography', 'professional lighting', 'sharp focus');

    const prompt = promptParts.join(', ');

    console.log('🎨 Character portrait generation:', {
      characterId,
      prompt: prompt.substring(0, 100) + '...',
      isI2I,
      presets
    });

    // TODO: Call fal.ai directly for portrait generation
    // For now, return the built prompt
    return new Response(JSON.stringify({ 
      success: true, 
      prompt,
      isI2I,
      message: 'Portrait generation endpoint ready - fal.ai integration pending'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Character portrait error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

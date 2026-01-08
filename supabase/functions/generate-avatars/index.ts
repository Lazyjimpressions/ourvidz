import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildPrompt(name: string, description?: string, appearance?: string[]) {
  const base = `Ultra-realistic portrait photo, 85mm lens, shallow depth of field, natural soft lighting, professional color grading, eyes in sharp focus, subtle smile, studio-quality`;
  const safe = `SFW, modest outfit, tasteful, no explicit content`;
  const appearanceTokens = (appearance || []).join(', ');
  const desc = description ? description.replace(/\n+/g, ' ') : '';
  return `${base}. Subject: ${name}. ${appearanceTokens}. Character description: ${desc}. ${safe}.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth: only admins can run this
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: hasAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const names: string[] = body.names || ['Scarlett', 'Mei Chen'];

    // Load characters by name
    const { data: characters, error: charErr } = await supabase
      .from('characters')
      .select('id, name, description, appearance_tags, image_url')
      .in('name', names);
    if (charErr) throw charErr;

    const hfToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!hfToken) {
      return new Response(JSON.stringify({ error: 'Missing HUGGING_FACE_ACCESS_TOKEN' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const hf = new HfInference(hfToken);

    const results: any[] = [];

    for (const c of characters || []) {
      const prompt = buildPrompt(c.name, c.description || undefined, c.appearance_tags || undefined as any);
      console.log('Generating avatar for', c.name);
      const image = await hf.textToImage({ inputs: prompt, model: 'black-forest-labs/FLUX.1-schnell' });
      const arrBuf = await image.arrayBuffer();
      const bytes = new Uint8Array(arrBuf);

      const path = `characters/${slugify(c.name)}.png`;
      // Upload to avatars bucket (overwrite if exists)
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, bytes, {
        contentType: 'image/png',
        upsert: true,
      });
      if (upErr) throw upErr;

      // Update character image_url to storage path
      const storagePath = `avatars/${path}`;
      const { error: updErr } = await supabase
        .from('characters')
        .update({ image_url: storagePath })
        .eq('id', c.id);
      if (updErr) throw updErr;

      results.push({ name: c.name, path: storagePath });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('generate-avatars error:', error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

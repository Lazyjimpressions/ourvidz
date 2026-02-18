import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type OutputMode = 'caption' | 'detailed' | 'structured';

interface DescribeImageRequest {
  imageUrl: string;
  contentRating?: 'sfw' | 'nsfw';
  outputMode?: OutputMode;
  modelId?: string;
  modelKey?: string;
  originalPrompt?: string;
}

interface ResolvedModel {
  model_key: string;
  display_name: string;
  input_defaults: {
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
  };
  provider: {
    name: string;
    base_url: string;
    secret_name: string;
    auth_scheme: string;
    auth_header_name: string;
  };
}

/**
 * Resolve a vision-capable model from the database.
 * Priority: explicit modelId > explicit modelKey > default_for_tasks containing 'vision' > hardcoded fallback
 */
async function resolveVisionModel(modelId?: string, modelKey?: string): Promise<ResolvedModel> {
  const selectFields = 'model_key, display_name, input_defaults, api_providers!inner(name, base_url, secret_name, auth_scheme, auth_header_name)';

  let data: any = null;

  // 1. Try explicit ID
  if (modelId) {
    const result = await supabase
      .from('api_models')
      .select(selectFields)
      .eq('id', modelId)
      .eq('is_active', true)
      .limit(1)
      .single();
    data = result.data;
  }

  // 2. Try explicit model_key
  if (!data && modelKey) {
    const result = await supabase
      .from('api_models')
      .select(selectFields)
      .eq('model_key', modelKey)
      .eq('is_active', true)
      .limit(1)
      .single();
    data = result.data;
  }

  // 3. Try default for vision task
  if (!data) {
    const result = await supabase
      .from('api_models')
      .select(selectFields)
      .eq('is_active', true)
      .contains('default_for_tasks', ['vision'])
      .order('priority', { ascending: true })
      .limit(1)
      .single();
    data = result.data;
  }

  // 4. Hardcoded fallback: Kimi K2.5 by model_key
  if (!data) {
    const result = await supabase
      .from('api_models')
      .select(selectFields)
      .eq('model_key', 'moonshotai/kimi-k2.5')
      .eq('is_active', true)
      .limit(1)
      .single();
    data = result.data;
  }

  if (!data) {
    throw new Error('No vision-capable model found in api_models table');
  }

  const provider = (data as any).api_providers;
  console.log('✅ Resolved vision model:', { model_key: data.model_key, provider: provider.name });

  return {
    model_key: data.model_key,
    display_name: data.display_name,
    input_defaults: (data.input_defaults as ResolvedModel['input_defaults']) || {},
    provider: {
      name: provider.name,
      base_url: provider.base_url,
      secret_name: provider.secret_name,
      auth_scheme: provider.auth_scheme || 'bearer',
      auth_header_name: provider.auth_header_name || 'Authorization',
    },
  };
}

function buildSystemPrompt(outputMode: OutputMode, contentRating: string): string {
  const base = `You are an expert character analyst for AI roleplay and image generation. All characters are explicitly ADULTS (18+).`;

  if (outputMode === 'caption') {
    return `${base}\nDescribe the character in a single concise sentence focusing on their most distinctive visual features.`;
  }

  if (outputMode === 'detailed') {
    return `${base}\nWrite a detailed narrative paragraph describing this character's appearance, style, and visual presence. Be vivid and specific.${contentRating === 'nsfw' ? ' You may include sensual or mature descriptors.' : ''}`;
  }

  // structured
  return `${base}
Analyze this character image and extract structured details. Return ONLY valid JSON with these fields:
{
  "gender": "female" | "male" | "non-binary" | "unspecified",
  "description": "A compelling 2-3 sentence character description",
  "traits": "comma-separated visual traits: hair color, eye color, build, clothing, etc.",
  "appearance_tags": ["tag1", "tag2", ...],
  "physical_traits": {
    "hair": "description",
    "eyes": "description", 
    "build": "description",
    "skin": "description",
    "distinguishing_features": "description"
  },
  "suggested_names": ["name1", "name2", "name3"]
}

Guidelines:
- appearance_tags: 4-8 short tags suitable for image generation prompts
- traits: detailed comma-separated visual description for prompt construction
- description: focus on personality impression and visual presence
- suggested_names: creative names that fit the character's look
${contentRating === 'nsfw' ? '- You may include mature or sensual descriptors where appropriate' : '- Keep descriptions appropriate for general audiences'}
Respond with ONLY valid JSON, no additional text.`;
}

function buildUserContent(imageUrl: string, outputMode: OutputMode, originalPrompt?: string): any[] {
  const content: any[] = [
    { type: 'image_url', image_url: { url: imageUrl } },
  ];

  let textPrompt = 'Describe this character';
  if (outputMode === 'structured') {
    textPrompt = 'Analyze this character image and return structured JSON as specified.';
  }
  if (originalPrompt) {
    textPrompt += `\n\nThe original generation prompt was: "${originalPrompt}". Also include a "quality_score" field (1-10) rating how well the image matches this prompt.`;
  }

  content.push({ type: 'text', text: textPrompt });
  return content;
}

function parseStructuredResponse(content: string): Record<string, unknown> {
  let jsonStr = content.trim();
  // Strip <think>...</think> blocks from thinking models
  jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn('⚠️ Failed to parse structured response as JSON:', e);
    // Return raw text as description fallback
    return { description: content.trim(), traits: '', appearance_tags: [], gender: 'unspecified' };
  }
}

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: DescribeImageRequest = await req.json();
    const { imageUrl, contentRating = 'sfw', outputMode = 'structured', modelId, modelKey, originalPrompt } = body;

    if (!imageUrl) {
      return new Response(JSON.stringify({ success: false, error: 'imageUrl is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('🔍 Describe image request:', { outputMode, contentRating, hasOriginalPrompt: !!originalPrompt });

    // 1. Resolve model
    const model = await resolveVisionModel(modelId, modelKey);

    // 2. Build messages
    const systemPrompt = buildSystemPrompt(outputMode, contentRating);
    const userContent = buildUserContent(imageUrl, outputMode, originalPrompt);

    // 3. Call vision API
    const apiKey = Deno.env.get(model.provider.secret_name);
    if (!apiKey) {
      throw new Error(`API key secret "${model.provider.secret_name}" not configured`);
    }

    const payload = {
      model: model.model_key,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: model.input_defaults.max_tokens || 800,
      temperature: model.input_defaults.temperature || 0.4,
      stream: false,
    };

    const apiUrl = `${model.provider.base_url}/chat/completions`;
    const authValue = model.provider.auth_scheme === 'bearer' ? `Bearer ${apiKey}` : apiKey;

    console.log('📤 Calling vision provider:', { provider: model.provider.name, model: payload.model, url: apiUrl });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        [model.provider.auth_header_name]: authValue,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Vision provider error ${response.status}:`, errorText);
      throw new Error(`${model.provider.name} error: ${response.status} - ${errorText}`);
    }

    const apiData = await response.json();
    const rawContent = apiData.choices?.[0]?.message?.content || '';

    console.log('✅ Vision response received:', { contentLength: rawContent.length, preview: rawContent.substring(0, 150) });

    // 4. Parse based on output mode
    let data: Record<string, unknown>;
    if (outputMode === 'structured') {
      data = parseStructuredResponse(rawContent);
    } else {
      data = { text: rawContent.trim() };
    }

    const processingTime = Date.now() - startTime;

    return new Response(JSON.stringify({
      success: true,
      data,
      model_used: model.model_key,
      model_display_name: model.display_name,
      processing_time_ms: processingTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ describe-image error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

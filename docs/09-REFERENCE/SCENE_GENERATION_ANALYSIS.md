# Scene Generation Analysis - Roleplay Page

**Date:** January 2026  
**Status:** Production Implementation Analysis

## Executive Summary

The scene generation system on the roleplay page is a sophisticated multi-stage pipeline that:
1. Generates AI-powered scene narratives from conversation context
2. Applies character consistency using three methods (seed locking, I2I reference, hybrid)
3. Routes to appropriate image generation providers (local SDXL, Replicate, fal.ai)
4. Uses database-driven prompt templates with variable substitution
5. Optimizes prompts for CLIP token limits (77 tokens) when using Replicate/SDXL

---

## 1. Scene Generation Flow

### 1.1 User-Initiated Generation

**Entry Point:** `src/pages/MobileRoleplayChat.tsx` → `handleGenerateScene()`

```925:1014:src/pages/MobileRoleplayChat.tsx
  const handleGenerateScene = async () => {
    if (!character || !conversationId || !user) return;
    
    setIsLoading(true);
    setSceneJobStatus('queued');
    
    try {
      // ✅ ENHANCED: Use roleplay-chat edge function for scene generation
      // This will use the enhanced scene generation logic with character visual context
      const contentTier = 'nsfw'; // ✅ FORCE UNRESTRICTED CONTENT
      
      const { data, error } = await supabase.functions.invoke('roleplay-chat', {
        body: {
          message: 'Generate a scene based on our current conversation context.',
          conversation_id: conversationId,
          character_id: character.id,
          model_provider: modelProvider,
          memory_tier: memoryTier,
          content_tier: contentTier,
          scene_generation: true, // ✅ Enable scene generation
          user_id: user.id,
          scene_context: selectedScene?.scene_prompt || null,
          scene_system_prompt: selectedScene?.system_prompt || null,
          prompt_template_id: promptTemplate?.id || null,
          prompt_template_name: promptTemplate?.template_name || null,
          selected_image_model: getValidImageModel(), // ✅ Use selected image model (with fallback)
          scene_style: sceneStyle, // ✅ Scene style for user representation
          // ✅ Pass consistency settings from UI
          consistency_settings: consistencySettings
        }
      });
```

**Key Parameters Passed:**
- `scene_generation: true` - Triggers scene generation mode
- `selected_image_model` - User-selected image model (with fallback)
- `scene_style` - One of: `'character_only'`, `'pov'`, `'both_characters'`
- `consistency_settings` - User's consistency method and parameters
- `scene_context` / `scene_system_prompt` - Optional pre-defined scene context

### 1.2 Edge Function Processing

**Location:** `supabase/functions/roleplay-chat/index.ts` → `generateScene()`

The edge function performs these steps:

#### Step 1: Character Data Loading
```1917:1939:supabase/functions/roleplay-chat/index.ts
    // ✅ ENHANCED: Load character data with comprehensive visual information
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select(`
        seed_locked, 
        reference_image_url, 
        consistency_method, 
        name,
        description,
        appearance_tags,
        image_url,
        preview_image_url,
        base_prompt,
        traits,
        persona
      `)
      .eq('id', characterId)
      .single();

    if (charError || !character) {
      console.error('🎬❌ Character not found for scene generation:', characterId);
      return { success: false };
    }
```

**Character Data Retrieved:**
- Visual consistency: `seed_locked`, `reference_image_url`, `consistency_method`
- Character identity: `name`, `description`, `appearance_tags`, `traits`, `persona`
- Images: `image_url`, `preview_image_url`, `base_prompt`

#### Step 2: Scene Narrative Generation

The system generates a scene narrative using OpenRouter (same model as roleplay chat):

```1942:2038:supabase/functions/roleplay-chat/index.ts
async function generateSceneNarrativeWithOpenRouter(
  character: any,
  sceneContext: any,
  conversationHistory: string[],
  characterVisualDescription: string,
  modelKey: string,
  contentTier: string,
  modelConfig: any,
  supabase: any
): Promise<string> {
  const openRouterKey = Deno.env.get('OpenRouter_Roleplay_API_KEY');
  if (!openRouterKey) {
    throw new Error('OpenRouter API key not configured');
  }

  // Load scene narrative template based on content tier
  const templateName = contentTier === 'nsfw' ? 'Scene Narrative - NSFW' : 'Scene Narrative - SFW';
  const { data: template, error: templateError } = await supabase
    .from('prompt_templates')
    .select('system_prompt')
    .eq('template_name', templateName)
    .eq('is_active', true)
    .single();

  if (templateError || !template) {
    throw new Error(`Scene narrative template not found: ${templateName}`);
  }

  // Build scene generation prompt using template
  // ✅ ENHANCED: Use more conversation history (10 messages) for better storyline context
  const conversationContext = conversationHistory.slice(-10).join(' | ');

  // ✅ ENHANCED: Extract storyline elements from full conversation
  const storylineContext = extractStorylineContext(conversationHistory);
  const storylineLocation = storylineContext.locations.length > 0
    ? storylineContext.locations[storylineContext.locations.length - 1] // Most recent location
    : sceneContext.setting;

  const scenePrompt = template.system_prompt
    .replace(/\{\{character_name\}\}/g, character.name)
    .replace(/\{\{character_description\}\}/g, characterVisualDescription)
    .replace(/\{\{character_personality\}\}/g, character.persona || character.traits || 'engaging')
    + `\n\nSTORYLINE CONTEXT (from full conversation):\n`
    + `Location: ${storylineLocation}\n`
    + `Key Events: ${storylineContext.keyEvents.join(', ') || 'conversation'}\n`
    + `Relationship Tone: ${storylineContext.relationshipProgression}\n`
    + `Current Activity: ${storylineContext.currentActivity}\n`
    + `\nCURRENT SCENE CONTEXT:\n`
    + `Setting: ${sceneContext.setting}\n`
    + `Mood: ${sceneContext.mood}\n`
    + `Actions: ${sceneContext.actions.join(', ')}\n`
    + `Visual Elements: ${sceneContext.visualElements.join(', ')}\n`
    + `Positioning: ${sceneContext.positioning.join(', ')}\n`
    + `\nRECENT CONVERSATION (last 10 exchanges):\n${conversationContext}\n\n`
    + `IMPORTANT: Generate a scene description that reflects the storyline progression and current location (${storylineLocation}). The scene must be consistent with what has happened in the conversation.`;

  console.log('🎬 Scene generation prompt built, calling OpenRouter with model:', modelKey);

  // Call OpenRouter with scene generation parameters
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ulmdmzhcdwfadbvfpckt.supabase.co',
      'X-Title': 'OurVidz Roleplay Scene Generation'
    },
    body: JSON.stringify({
      model: modelKey,
      messages: [
        { role: 'system', content: scenePrompt },
        { role: 'user', content: 'Generate the scene description now.' }
      ],
      max_tokens: 150, // Keep scene descriptions concise
      temperature: 0.7, // Less creative than roleplay for focused descriptions
      top_p: 0.85,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OpenRouter scene generation error ${response.status}:`, errorText);
    throw new Error(`OpenRouter scene generation failed: ${response.status}`);
  }

  const data = await response.json();
  const narrative = data.choices?.[0]?.message?.content?.trim();

  if (!narrative) {
    throw new Error('No scene narrative generated by OpenRouter');
  }

  console.log('✅ Scene narrative generated via OpenRouter:', narrative.substring(0, 100) + '...');
  return narrative;
}
```

**Key Features:**
- Uses database template: `'Scene Narrative - NSFW'` or `'Scene Narrative - SFW'`
- Variable substitution: `{{character_name}}`, `{{character_description}}`, `{{character_personality}}`
- Storyline extraction: Analyzes full conversation for locations, events, relationship progression
- Context integration: Combines storyline context + current scene context + recent conversation (10 messages)
- Token limit: 150 tokens for concise scene descriptions

#### Step 3: Scene Record Creation

Before image generation, a scene record is created in `character_scenes` table:

```2164:2226:supabase/functions/roleplay-chat/index.ts
    // ✅ FIX: Create scene record in character_scenes table before generating image
    let sceneId: string | null = null;
    try {
      // Use scene_name and scene_description from function parameters (passed from request body)
      // Fallback to extracting from scenePrompt if not provided (for backward compatibility)
      let finalSceneName: string | null = sceneName || null;
      let finalSceneDescription: string | null = sceneDescription || null;
      let cleanScenePrompt = scenePrompt;
      
      // Only try to extract from prompt if not provided as parameters
      if (!finalSceneName || !finalSceneDescription) {
        const nameMatch = scenePrompt.match(/\[SCENE_NAME:\s*(.+?)\]/);
        const descMatch = scenePrompt.match(/\[SCENE_DESC:\s*(.+?)\]/);
        
        if (nameMatch && !finalSceneName) {
          finalSceneName = nameMatch[1].trim();
          cleanScenePrompt = cleanScenePrompt.replace(/\[SCENE_NAME:\s*.+?\]/, '').trim();
        }
        if (descMatch && !finalSceneDescription) {
          finalSceneDescription = descMatch[1].trim();
          cleanScenePrompt = cleanScenePrompt.replace(/\[SCENE_DESC:\s*.+?\]/, '').trim();
        }
      }

      const { data: sceneRecord, error: sceneError } = await supabase
        .from('character_scenes')
        .insert({
          character_id: characterId,
          scene_name: finalSceneName || 'Generated Scene',
          scene_description: finalSceneDescription || cleanScenePrompt,
          scene_prompt: cleanScenePrompt,
          conversation_id: conversationId || null,
          effective_image_model: effectiveImageModel || null, // Track what was actually used
          consistency_method: consistencySettings?.method || consistencyMethod,
          reference_strength: refStrength,
          denoise_strength: denoiseStrength,
          seed_locked: seedLocked,
          scene_type: 'chat_scene',
          scene_style: sceneStyle,
          scene_context: sceneContext,
          character_visual_description: characterVisualDescription
        })
        .select('id')
        .single();

      if (sceneError || !sceneRecord) {
        console.error('🎬❌ Failed to create scene record:', sceneError);
        // Continue with generation but scene won't be linked
      } else {
        sceneId = sceneRecord.id;
        console.log('✅ Scene record created with ID:', sceneId);
      }
    } catch (error) {
      console.error('🎬❌ Error creating scene record:', error);
      // Continue with generation but scene won't be linked
    }
```

**Scene Record Fields:**
- `scene_name`, `scene_description`, `scene_prompt` - Scene metadata
- `conversation_id` - Links scene to conversation
- `effective_image_model` - Tracks which model was actually used
- `consistency_method`, `reference_strength`, `denoise_strength`, `seed_locked` - Consistency settings
- `scene_style` - `'character_only'`, `'pov'`, or `'both_characters'`
- `scene_context` - JSON of analyzed scene context
- `character_visual_description` - Character visual description used

#### Step 4: Prompt Enhancement with Visual Context

The system builds an enhanced scene prompt with character visual description:

```2228:2255:supabase/functions/roleplay-chat/index.ts
    // ✅ ENHANCED: Build comprehensive scene prompt with character and user visual context
    let enhancedScenePrompt: string;

    // Get scene style tokens
    const styleTokens = SCENE_STYLE_TOKENS[sceneStyle] || [];
    const styleTokensStr = styleTokens.length > 0 ? `, ${styleTokens.join(', ')}` : '';

    if (sceneStyle === 'both_characters' && userCharacter) {
      // Both characters in scene - include user visual description
      const userVisualDescription = buildUserVisualDescriptionForScene(
        userCharacter.gender,
        userCharacter.appearance_tags || []
      );

      enhancedScenePrompt = `Generate a scene showing ${character.name} (${characterVisualDescription}) and ${userCharacter.name} (${userVisualDescription}) together${styleTokensStr}, in the following scenario: ${scenePrompt}. Both characters should maintain their distinctive appearances. Composition: two people interacting.`;

      console.log('🎬 Scene style: both_characters - including user:', userCharacter.name);
    } else if (sceneStyle === 'pov' && userCharacter) {
      // POV scene - first person view from user's perspective looking at character
      enhancedScenePrompt = `Generate a first-person POV scene${styleTokensStr} showing ${character.name}, ${characterVisualDescription}, in the following scenario: ${scenePrompt}. The character should be looking at the viewer. Camera angle: first person perspective.`;

      console.log('🎬 Scene style: pov - first person view');
    } else {
      // Character only (default) - current behavior
      enhancedScenePrompt = `Generate a scene showing ${character.name}, ${characterVisualDescription}, in the following scenario: ${scenePrompt}. The character should maintain their distinctive appearance and visual characteristics throughout the scene.`;

      console.log('🎬 Scene style: character_only (default)');
    }
```

**Scene Styles:**
- `character_only` (default): Shows only the AI character
- `pov`: First-person perspective from user's view
- `both_characters`: Shows both AI character and user character together

#### Step 5: CLIP Token Optimization

For Replicate/SDXL models, prompts are optimized for CLIP's 77-token limit:

```2259:2269:supabase/functions/roleplay-chat/index.ts
    // ✅ CRITICAL FIX: Optimize prompt for CLIP's 77-token limit
    // CLIP tokenizes prompts and truncates everything after 77 tokens
    // We need to compress the prompt while preserving the most important parts (actions + scenario)
    const optimizedPrompt = optimizePromptForCLIP(enhancedScenePrompt, scenePrompt, character.appearance_tags || [], sceneContext);
    console.log('🔧 CLIP optimization:', {
      original_length: enhancedScenePrompt.length,
      optimized_length: optimizedPrompt.length,
      original_estimated_tokens: estimateCLIPTokens(enhancedScenePrompt),
      optimized_estimated_tokens: estimateCLIPTokens(optimizedPrompt),
      scenario_preserved: optimizedPrompt.includes(scenePrompt.substring(0, 50))
    });
```

**CLIP Optimization:**
- CLIP tokenizer: ~4.2 characters per token
- Hard limit: 77 tokens (everything after is truncated)
- Optimization preserves: actions, scenario, character appearance
- Removes: redundant descriptions, verbose modifiers

---

## 2. Character Consistency Options

### 2.1 Consistency Methods

The system supports three consistency methods, configurable via UI:

**Location:** `src/components/roleplay/ConsistencySettings.tsx`

```101:120:src/components/roleplay/ConsistencySettings.tsx
  const methodOptions = [
    {
      value: 'seed_locked',
      label: 'Seed Locked',
      description: 'Uses fixed seed for consistent character generation',
      icon: Lock
    },
    {
      value: 'i2i_reference',
      label: 'Image-to-Image',
      description: 'Uses reference image for character consistency',
      icon: ImageIcon
    },
    {
      value: 'hybrid',
      label: 'Hybrid',
      description: 'Combines seed locking with reference images',
      icon: Sparkles
    }
  ];
```

### 2.2 Consistency Settings Structure

```32:37:src/components/roleplay/ConsistencySettings.tsx
  const [settings, setSettings] = useState<IConsistencySettings>({
    method: 'hybrid',
    reference_strength: 0.35,
    denoise_strength: 0.25,
    modify_strength: 0.5
  });
```

**Settings Fields:**
- `method`: `'seed_locked'` | `'i2i_reference'` | `'hybrid'`
- `reference_strength`: 0.0-1.0 (how strongly to follow reference image)
- `denoise_strength`: 0.0-1.0 (how much to modify reference image)
- `modify_strength`: 0.0-1.0 (how much to modify character appearance)
- `seed_value`: Optional seed number (for seed_locked/hybrid)

### 2.3 Consistency Method Application

**Location:** `supabase/functions/roleplay-chat/index.ts`

```2040:2054:supabase/functions/roleplay-chat/index.ts
    // ✅ Extract consistency settings from UI with defaults
    const refStrength = consistencySettings?.reference_strength ?? 0.65;
    const denoiseStrength = consistencySettings?.denoise_strength ?? 0.65;
    // ✅ FIX: Hybrid mode also needs seed - extract for both seed_locked and hybrid methods
    const finalConsistencyMethod = consistencySettings?.method || consistencyMethod;
    const seedLocked = (finalConsistencyMethod === 'seed_locked' || finalConsistencyMethod === 'hybrid') 
      ? (consistencySettings?.seed_value ?? character.seed_locked) 
      : null;

    console.log('🎬 Using consistency settings from UI:', {
      method: consistencySettings?.method || 'hybrid',
      reference_strength: refStrength,
      denoise_strength: denoiseStrength,
      seed_locked: seedLocked
    });
```

#### Method 1: Seed Locked
- Uses fixed `seed` value from character's `seed_locked` field
- Ensures deterministic character appearance
- No reference image required
- Best for: Consistent character across different scenes

#### Method 2: Image-to-Image (I2I) Reference
- Uses character's `reference_image_url` as input image
- Applies `reference_strength` (how much to follow reference)
- Applies `denoise_strength` (how much to modify)
- Best for: Maintaining exact visual features from reference

#### Method 3: Hybrid
- Combines both seed locking AND I2I reference
- Uses `seed_locked` for deterministic base
- Uses `reference_image_url` for visual consistency
- Best for: Maximum consistency with scene variation

### 2.4 Provider-Specific Implementation

#### Replicate (replicate-image)
```2433:2457:supabase/functions/roleplay-chat/index.ts
          // ✅ FIX: Determine consistency method and build input object accordingly
          // Note: finalConsistencyMethod already declared above when extracting seedLocked
          const requiresSeed = finalConsistencyMethod === 'seed_locked' || finalConsistencyMethod === 'hybrid';
          const requiresI2I = finalConsistencyMethod === 'i2i_reference' || finalConsistencyMethod === 'hybrid';
          
          // Build input object for Replicate based on consistency method
          const input: Record<string, any> = {};
          
          // Add seed if method requires it
          if (requiresSeed && seedLocked !== null && seedLocked !== undefined) {
            input.seed = seedLocked;
            console.log('🔒 Seed locked method: passing seed to Replicate input:', seedLocked);
          }
          
          // Add image and strength if method requires i2i
          if (requiresI2I && character.reference_image_url) {
            input.image = character.reference_image_url;
            // Map reference_strength to strength (Replicate uses strength, not denoise_strength)
            // Strength is inverse of denoise: higher reference_strength = lower strength
            input.strength = refStrength !== undefined ? refStrength : 0.7;
            console.log('🖼️ I2I method: passing reference image and strength to Replicate input:', {
              image: character.reference_image_url.substring(0, 50) + '...',
              strength: input.strength
            });
          }
```

**Replicate Parameters:**
- `input.seed`: Integer seed (for seed_locked/hybrid)
- `input.image`: Reference image URL (for i2i_reference/hybrid)
- `input.strength`: 0.0-1.0 (maps from `reference_strength`)

#### fal.ai (fal-image)
```2525:2533:supabase/functions/roleplay-chat/index.ts
            input: {
              image_size: { width: 1024, height: 1024 },
              num_inference_steps: 30,
              guidance_scale: 7.5,
              seed: seedLocked ?? undefined,
              // I2I parameters if reference image exists
              image_url: character.reference_image_url || undefined,
              strength: character.reference_image_url ? (refStrength ?? 0.7) : undefined
            },
```

**fal.ai Parameters:**
- `input.seed`: Integer seed (for seed_locked/hybrid)
- `input.image_url`: Reference image URL (for i2i_reference/hybrid)
- `input.strength`: 0.0-1.0 (maps from `reference_strength`)

#### Local SDXL (queue-job)
```2289:2314:supabase/functions/roleplay-chat/index.ts
      imageResponse = await supabase.functions.invoke('queue-job', {
        headers,
        body: {
          prompt: optimizedPrompt, // ✅ FIX: Use CLIP-optimized prompt
          job_type: 'sdxl_image_high',
          // NOTE: No seed specified - use random for scene variety while reference_image maintains character consistency
          reference_image_url: character.reference_image_url,
          metadata: {
            destination: 'roleplay_scene',
            character_id: characterId,
            character_name: character.name,
            scene_id: sceneId, // ✅ FIX: Include scene_id to link image to scene
            conversation_id: conversationId || null, // ✅ FIX: Include conversation_id
            scene_type: 'chat_scene',
            consistency_method: consistencySettings?.method || character.consistency_method || consistencyMethod,
            reference_strength: refStrength,
            denoise_strength: denoiseStrength,
            skip_enhancement: false,
            reference_mode: 'modify',
            seed_locked: seedLocked,
            seed: seedLocked, // Pass seed for seed_locked method
            contentType: contentTier === 'nsfw' || sceneContext.isNSFW ? 'nsfw' : 'sfw',
            scene_context: JSON.stringify(sceneContext)
          }
        }
      });
```

**SDXL Parameters:**
- `reference_image_url`: Top-level reference image
- `metadata.seed`: Integer seed (for seed_locked/hybrid)
- `metadata.reference_strength`: 0.0-1.0
- `metadata.denoise_strength`: 0.0-1.0
- `metadata.reference_mode`: `'modify'` (I2I mode)

---

## 3. Prompting Templates System

### 3.1 Template Selection

The system uses database-driven templates with a three-tier fallback chain:

**Location:** `supabase/functions/roleplay-chat/index.ts`

```743:758:supabase/functions/roleplay-chat/index.ts
  // Get template with priority: model-specific > universal
  let template = await getModelSpecificTemplate(supabase, modelKey, contentTier);
  if (!template) {
    console.log('⚠️ No model-specific template found, using universal template');
    template = await getUniversalTemplate(supabase, contentTier);
  }

  // If we have scene context, enhance the template with scene-specific instructions
  if (sceneContext && template) {
    console.log('🎬 Enhancing template with scene context');
    template = enhanceTemplateWithSceneContext(template, sceneContext, sceneSystemPrompt);
  }

  if (!template) {
    throw new Error('No template found for roleplay');
  }
```

**Fallback Chain:**
1. **Model-Specific Template**: `target_model = api_models.model_key` (exact match)
2. **Universal Template**: `target_model IS NULL` (works for all models)
3. **Hardcoded Fallback**: Emergency fallback in edge function code

### 3.2 Scene Narrative Templates

For scene narrative generation, templates are selected by content tier:

```1957:1968:supabase/functions/roleplay-chat/index.ts
  // Load scene narrative template based on content tier
  const templateName = contentTier === 'nsfw' ? 'Scene Narrative - NSFW' : 'Scene Narrative - SFW';
  const { data: template, error: templateError } = await supabase
    .from('prompt_templates')
    .select('system_prompt')
    .eq('template_name', templateName)
    .eq('is_active', true)
    .single();

  if (templateError || !template) {
    throw new Error(`Scene narrative template not found: ${templateName}`);
  }
```

**Templates Used:**
- `'Scene Narrative - NSFW'`: For NSFW content tier
- `'Scene Narrative - SFW'`: For SFW content tier

### 3.3 Variable Substitution

Templates support variable substitution with character data:

```1980:1996:supabase/functions/roleplay-chat/index.ts
  const scenePrompt = template.system_prompt
    .replace(/\{\{character_name\}\}/g, character.name)
    .replace(/\{\{character_description\}\}/g, characterVisualDescription)
    .replace(/\{\{character_personality\}\}/g, character.persona || character.traits || 'engaging')
    + `\n\nSTORYLINE CONTEXT (from full conversation):\n`
    + `Location: ${storylineLocation}\n`
    + `Key Events: ${storylineContext.keyEvents.join(', ') || 'conversation'}\n`
    + `Relationship Tone: ${storylineContext.relationshipProgression}\n`
    + `Current Activity: ${storylineContext.currentActivity}\n`
    + `\nCURRENT SCENE CONTEXT:\n`
    + `Setting: ${sceneContext.setting}\n`
    + `Mood: ${sceneContext.mood}\n`
    + `Actions: ${sceneContext.actions.join(', ')}\n`
    + `Visual Elements: ${sceneContext.visualElements.join(', ')}\n`
    + `Positioning: ${sceneContext.positioning.join(', ')}\n`
    + `\nRECENT CONVERSATION (last 10 exchanges):\n${conversationContext}\n\n`
    + `IMPORTANT: Generate a scene description that reflects the storyline progression and current location (${storylineLocation}). The scene must be consistent with what has happened in the conversation.`;
```

**Supported Variables:**
- `{{character_name}}` → Character's name
- `{{character_description}}` → Character's visual description
- `{{character_personality}}` → Character's persona/traits
- `{{mood}}` → Scene mood (from scene context analysis)
- `{{scene_context}}` → Full scene context JSON

### 3.4 Template Documentation

**Reference:** `docs/03-SYSTEMS/PROMPTING_SYSTEM.md`

```49:58:docs/03-SYSTEMS/PROMPTING_SYSTEM.md
- Scene Generation (Roleplay → Image)
  - Scene Generation - Character Context: `qwen_instruct` → SDXL, token_limit 512, supports variables: `{{character_name}}`, `{{mood}}`, `{{character_visual_description}}`, `{{scene_context}}`

**Template Selection Notes:**
- Templates are selected by edge functions using: `(target_model, enhancer_model, job_type, use_case, content_mode)` with fallbacks.
- The `target_model` field in `prompt_templates` matches `api_models.model_key` for model-specific templates (e.g., `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`).
- Universal templates have `target_model IS NULL` and are used as fallback when no model-specific template exists.
- Template selection priority: Model-specific template → Universal template → Hardcoded fallback.
- Character roleplay templates support variable substitution (performed server-side) and are cached per character to avoid repeated processing.
- For third-party API models (OpenRouter, fal.ai, Replicate), templates are selected based on the model key from `api_models` table.
```

---

## 4. Image Generation Flow

### 4.1 Model Routing

The system routes to different providers based on selected model:

```2271:2280:supabase/functions/roleplay-chat/index.ts
    // ✅ ENHANCED: Determine image model routing (effectiveImageModel already determined above)
    let imageResponse;
    const useSDXL = isLocalSDXL || (!effectiveImageModel || effectiveImageModel.trim() === '');
    
    console.log('🎨 Image model routing decision:', {
      selectedImageModel,
      effectiveImageModel,
      useSDXL,
      consistencyMethod
    });
```

**Routing Logic:**
1. **Local SDXL**: If `selectedImageModel === 'sdxl'` or no model specified → `queue-job` edge function
2. **Replicate**: If model provider is `'replicate'` → `replicate-image` edge function
3. **fal.ai**: If model provider is `'fal'` → `fal-image` edge function

### 4.2 Model Resolution

If no model specified, system fetches default from database:

```2127:2162:supabase/functions/roleplay-chat/index.ts
    // If no model specified, try to get default image model from database
    let effectiveImageModel = selectedImageModel;
    if (!effectiveImageModel || effectiveImageModel.trim() === '') {
      console.log('📸 No image model specified, fetching default image model from database...');

      // First, look for the default model (is_default = true)
      const { data: defaultModels } = await supabase
        .from('api_models')
        .select('id, model_key, display_name, api_providers!inner(name)')
        .eq('is_active', true)
        .eq('is_default', true)
        .eq('modality', 'image')
        .limit(1);

      if (defaultModels && defaultModels.length > 0) {
        effectiveImageModel = defaultModels[0].id;
        console.log('✅ Using default image model:', defaultModels[0].display_name, `(${defaultModels[0].api_providers.name})`);
      }

      // Fallback: get any active image model if no default found
      if (!effectiveImageModel) {
        const { data: fallbackModels } = await supabase
          .from('api_models')
          .select('id, model_key, display_name, api_providers!inner(name)')
          .eq('is_active', true)
          .eq('modality', 'image')
          .order('priority', { ascending: false })
          .limit(1);

        if (fallbackModels && fallbackModels.length > 0) {
          effectiveImageModel = fallbackModels[0].id;
          console.log('✅ Using fallback active image model:', fallbackModels[0].display_name, `(${fallbackModels[0].api_providers.name})`);
        } else {
          console.warn('⚠️ No active image models found, will fall back to local SDXL if needed');
        }
      }
    }
```

**Model Selection Priority:**
1. User-selected model (`selectedImageModel`)
2. Default model (`is_default = true`)
3. Highest priority active model (`priority DESC`)
4. Local SDXL (fallback)

### 4.3 Provider-Specific Generation

#### Replicate (replicate-image)

**Key Features:**
- CLIP token limit: 77 tokens (hard limit)
- Requires `apiModelId` from `api_models` table
- Supports seed locking and I2I reference
- Fetches negative prompts from `negative_prompts` table

```24:55:supabase/functions/replicate-image/index.ts
    // ✅ VALIDATION: Check CLIP token limit (77 tokens hard limit)
    const promptLength = body.prompt?.length || 0;
    const estimatedTokens = Math.ceil(promptLength / 4.2); // CLIP tokenizer: ~4.2 chars per token
    const MAX_CLIP_TOKENS = 77; // CLIP hard limit - everything after is truncated
    const promptTooLong = estimatedTokens > MAX_CLIP_TOKENS;
    
    if (promptTooLong) {
      console.warn(`⚠️ VALIDATION: Prompt estimated at ${estimatedTokens} CLIP tokens, exceeds ${MAX_CLIP_TOKENS} token limit! Will be truncated.`);
      console.warn(`⚠️ VALIDATION: Prompt length: ${promptLength} chars`);
    } else {
      console.log(`✅ VALIDATION: Prompt estimated at ${estimatedTokens} CLIP tokens (within ${MAX_CLIP_TOKENS} limit)`);
    }
    
    console.log('🎬 Replicate request received:', {
      prompt: body.prompt?.slice(0, 100),
      prompt_length: promptLength,
      prompt_too_long: promptTooLong,
      apiModelId: body.apiModelId,
      jobType: body.jobType
    });
    
    // ✅ AUDIT: Log consistency settings received
    console.log('📥 AUDIT: Consistency settings received:', {
      consistency_method: body.metadata?.consistency_method,
      reference_strength: body.metadata?.reference_strength,
      denoise_strength: body.metadata?.denoise_strength,
      seed_locked: body.metadata?.seed_locked,
      seed_in_metadata: body.metadata?.seed,
      input_object: body.input,
      has_reference_image_url: !!body.reference_image_url,
      reference_image_url_preview: body.reference_image_url ? body.reference_image_url.substring(0, 50) + '...' : null
    });
```

#### fal.ai (fal-image)

**Key Features:**
- Character limits: 8,000-12,000 for Seedream, 1,000-2,000 for video
- Uses model_key path directly (no version hash)
- Supports seed locking and I2I reference
- Uses REST API with `queue.fal.run`

```32:54:supabase/functions/fal-image/index.ts
    // Validate character limit based on model type (fal.ai uses chars, not tokens)
    const promptLength = body.prompt?.length || 0;
    const isVideo = body.modality === 'video' || body.metadata?.modality === 'video';

    // Character limits: Seedream 8,000-12,000, WAN image 6,000-8,000, Video 1,000-2,000
    const charLimit = isVideo ? 2000 : 10000;
    const promptTooLong = promptLength > charLimit;

    if (promptTooLong) {
      console.warn(`⚠️ VALIDATION: Prompt is ${promptLength} chars, exceeds ${charLimit} char limit for ${isVideo ? 'video' : 'image'}!`);
    } else {
      console.log(`✅ VALIDATION: Prompt is ${promptLength} chars (within ${charLimit} char limit)`);
    }

    console.log('🎨 fal.ai request received:', {
      prompt: body.prompt?.slice(0, 100),
      prompt_length: promptLength,
      prompt_too_long: promptTooLong,
      apiModelId: body.apiModelId,
      jobType: body.jobType || body.job_type,
      modality: isVideo ? 'video' : 'image'
    });
```

#### Local SDXL (queue-job)

**Key Features:**
- Routes to local SDXL worker
- Supports seed locking and I2I reference
- Uses `reference_mode: 'modify'` for I2I
- Fetches negative prompts from `negative_prompts` table

---

## 5. Analysis & Observations

### 5.1 Strengths

1. **Comprehensive Consistency System**
   - Three methods (seed, I2I, hybrid) provide flexibility
   - User-configurable parameters (strength, denoise, modify)
   - Provider-specific implementation ensures compatibility

2. **Intelligent Prompt Generation**
   - Storyline extraction from conversation history
   - Character visual description integration
   - Scene context analysis (setting, mood, actions, visual elements)
   - CLIP token optimization for Replicate/SDXL

3. **Robust Template System**
   - Database-driven with fallback chain
   - Variable substitution for character data
   - Content tier detection (SFW/NSFW)
   - Model-specific templates with universal fallback

4. **Multi-Provider Support**
   - Local SDXL (queue-job)
   - Replicate (replicate-image)
   - fal.ai (fal-image)
   - Automatic routing based on model selection

5. **Scene Record Tracking**
   - Links scenes to conversations
   - Tracks consistency settings used
   - Stores scene context and visual descriptions
   - Enables scene regeneration and history

### 5.2 Areas for Improvement

1. **CLIP Token Optimization**
   - Current optimization may still truncate important details
   - Consider more aggressive compression for long prompts
   - Prioritize action/scenario over character description

2. **Consistency Score Calculation**
   - Currently returns placeholder scores (0.6-0.8)
   - Could implement actual image similarity comparison
   - Track consistency over time per character

3. **Error Handling**
   - Scene record creation failures are logged but generation continues
   - Could implement retry logic for failed generations
   - Better user feedback for consistency method failures

4. **Template Management**
   - Scene narrative templates are hardcoded by name
   - Could use template selection criteria (use_case, content_mode)
   - More flexible variable system

5. **Model Health Checks**
   - No health check for local SDXL before routing
   - Could implement automatic fallback to API models
   - Better error messages when models unavailable

### 5.3 Technical Debt

1. **Code Duplication**
   - Similar consistency logic in multiple edge functions
   - Could extract to shared utility function
   - Standardize parameter mapping across providers

2. **Prompt Length Validation**
   - Different limits for different providers (CLIP tokens vs characters)
   - Could standardize validation logic
   - Better error messages for limit violations

3. **Scene Context Analysis**
   - `analyzeSceneContent()` and `extractStorylineContext()` functions not shown
   - Could document these analysis functions
   - May need optimization for long conversations

### 5.4 Recommendations

1. **Implement Consistency Scoring**
   - Use image similarity metrics (CLIP embeddings, perceptual hash)
   - Track consistency scores per character over time
   - Display consistency metrics in UI

2. **Enhance CLIP Optimization**
   - More aggressive compression for long prompts
   - Prioritize action/scenario keywords
   - Remove redundant character descriptions

3. **Standardize Consistency Parameters**
   - Create shared utility for consistency method application
   - Standardize parameter mapping across providers
   - Document provider-specific differences

4. **Improve Error Handling**
   - Retry logic for failed generations
   - Better user feedback for consistency failures
   - Graceful degradation when models unavailable

5. **Document Analysis Functions**
   - Document `analyzeSceneContent()` implementation
   - Document `extractStorylineContext()` implementation
   - Optimize for long conversation histories

---

## 6. Conclusion

The scene generation system on the roleplay page is a well-architected, multi-stage pipeline that:

- Generates AI-powered scene narratives from conversation context
- Applies character consistency using three configurable methods
- Routes to appropriate image generation providers with fallbacks
- Uses database-driven prompt templates with variable substitution
- Optimizes prompts for provider-specific limits (CLIP tokens, character limits)

The system demonstrates strong separation of concerns, with clear responsibilities for:
- Frontend: User interaction and consistency settings UI
- Edge functions: Scene narrative generation, prompt enhancement, model routing
- Image providers: Replicate, fal.ai, local SDXL with provider-specific implementations

Areas for improvement include consistency scoring, CLIP optimization, error handling, and code deduplication, but the overall architecture is solid and production-ready.


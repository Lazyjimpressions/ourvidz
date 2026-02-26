# Storyboard System

**Last Updated:** February 25, 2026
**Status:** V2 Complete - Full clip type system with dynamic model selection and AI assistance

## Overview

The Storyboard V2 system enables users to create 30-60 second videos through AI-assisted story planning and dynamic clip orchestration. It supports multiple clip types (quick, extended, controlled, keyframed), dynamically selects models from the `api_models` table, uses prompt templates from `prompt_templates`, and provides comprehensive AI assistance throughout the workflow.

### Core Use Cases

1. **Multi-Scene Projects**: Create videos with multiple scenes, each containing multiple clips
2. **Character Continuity**: Maintain consistent character appearance via frame chaining and identity references
3. **AI Story Planning**: Generate story beats and scene suggestions on project creation
4. **Dynamic Model Selection**: Automatic model routing based on clip type and task requirements
5. **Motion Presets**: Built-in motion reference library for controlled video generation
6. **Unified Preview + Export**: Sequential preview playback and final video assembly

---

## Clip Type System

### Clip Types

The V2 system supports 5 clip types, each routing to different models and tasks:

| Clip Type | Duration | Primary Task | Use Case |
|-----------|----------|--------------|----------|
| `quick` | 5s | `i2v` | First clips, establishing shots |
| `extended` | 10s | `extend` | Continuation from previous clip |
| `controlled` | 5s | `multi` | Uses motion preset + identity reference |
| `long` | 15s | `i2v` + `extend` | Auto-orchestrated sequences |
| `keyframed` | 5s | `i2i_multi` → `multi` | Start/end pose defined |

### Task Mapping

```typescript
// src/types/storyboard.ts
export const CLIP_TYPE_TASKS: Record<ClipType, string[]> = {
  quick: ['i2v'],
  extended: ['extend'],
  controlled: ['multi'],
  long: ['i2v', 'extend'],
  keyframed: ['i2i_multi', 'multi'],
};

export const CLIP_TYPE_DURATIONS: Record<ClipType, number> = {
  quick: 5,
  extended: 10,
  controlled: 5,
  long: 15,
  keyframed: 5,
};
```

### Clip Type Selection Flow

1. User creates clip or AI recommends type
2. `useStoryboardAI.recommendClipType()` suggests based on:
   - Position in scene (first/middle/last)
   - Previous clip type
   - Scene mood
   - Whether motion preset is selected
3. `ClipOrchestrationService.getModelForClipType()` resolves model from `api_models`

---

## Dynamic Model Selection

### Never Hardcode Models

All model selection queries the `api_models` table dynamically:

```typescript
// src/lib/services/ClipOrchestrationService.ts
static async getModelForClipType(clipType: ClipType): Promise<ApiModel | null> {
  const tasks = CLIP_TYPE_TASKS[clipType];
  const primaryTask = tasks[0];

  const { data } = await supabase
    .from('api_models')
    .select('*, api_providers!inner(*)')
    .eq('modality', 'video')
    .eq('is_active', true)
    .contains('default_for_tasks', [primaryTask])
    .order('priority', { ascending: false })
    .limit(1)
    .single();

  return data;
}
```

### Model Resolution Flow

```
User selects clip type
       ↓
Query api_models WHERE:
  - modality = 'video'
  - is_active = true
  - default_for_tasks contains [task]
  - ORDER BY priority DESC
       ↓
If no default found:
  - Query WHERE tasks contains [task]
  - Select highest priority
       ↓
Resolve provider from api_providers.name
       ↓
Route to fal-image edge function
```

### Provider Architecture

| Provider | Type | Use Case | NSFW Support |
|----------|------|----------|--------------|
| fal.ai LTX 13B | Primary | I2V, extend, multiconditioning | Yes |
| fal.ai WAN 2.1 I2V | Secondary | Video generation from image | Yes |
| Local WAN Worker | Alternative | When RunPod healthy | Yes |

---

## Prompt Template Integration

### Template Table Structure

Templates in `prompt_templates` with:
- `job_type`: 'video'
- `target_model`: LTX endpoint (i2v, extend, multiconditioning)
- `use_case`: 'enhancement'
- `content_mode`: 'nsfw' | 'sfw'

### Template Fetch Pattern

```typescript
// src/lib/services/ClipOrchestrationService.ts
static async getPromptTemplate(
  endpoint: string,
  contentMode: 'sfw' | 'nsfw'
): Promise<PromptTemplate | null> {
  const { data } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('job_type', 'video')
    .eq('target_model', endpoint)
    .eq('use_case', 'enhancement')
    .eq('content_mode', contentMode)
    .eq('is_active', true)
    .single();

  return data;
}
```

### Prompt Enhancement Flow

```
User writes motion prompt
       ↓
Fetch template for clip type + content mode
       ↓
Call enhance-prompt edge function with:
  - user_prompt
  - template.system_prompt
  - character context (if available)
       ↓
Return enhanced prompt (max 1,500 chars)
       ↓
Send to video generation
```

---

## Motion Presets Library

### Built-in Presets

The `motion_presets` table contains 10 built-in presets:

| Category | Presets |
|----------|---------|
| breathing | Subtle Breathing, Deep Breathing |
| turn | Slow Turn Left, Slow Turn Right |
| walk | Walk Forward, Walk Backward |
| camera | Camera Orbit, Handheld Sway |
| expression | Smile Transition |
| general | Look Around |

### Motion Preset Usage

Motion presets are used with the `controlled` clip type:

```typescript
// In buildGenerationConfig for controlled clips
if (clipType === 'controlled' && motionPresetId) {
  const preset = await getMotionPreset(motionPresetId);
  config.videos = [{ url: preset.video_url }];
  config.images = [{ url: referenceImageUrl, type: 'identity' }];
}
```

---

## AI Story Planning

### Edge Function: storyboard-ai-assist

Four actions available:

| Action | Purpose | Input |
|--------|---------|-------|
| `story_plan` | Generate story structure | projectDescription, targetDuration, contentMode |
| `suggest_prompts` | Motion prompt suggestions | scene context, previous clip |
| `recommend_clip_type` | AI clip type recommendation | position, mood, hasMotionPreset |
| `enhance_prompt` | Prompt enhancement | user prompt, character context |

### Story Planning Integration

```typescript
// src/pages/Storyboard.tsx - Project creation flow
const handleCreateProject = async (input: CreateProjectInput) => {
  const project = await createProject(input);

  if (input.ai_assistance_level === 'full' && input.description?.trim()) {
    const planResult = await generateStoryPlan({
      projectDescription: input.description,
      targetDuration: input.target_duration_seconds || 30,
      contentMode: input.content_tier === 'sfw' ? 'sfw' : 'nsfw',
    });

    if (planResult) {
      const aiStoryPlan = buildAIStoryPlan(planResult);
      await StoryboardService.updateProject(project.id, {
        ai_story_plan: aiStoryPlan,
      });

      // Create scenes from AI breakdown
      for (const sceneData of planResult.sceneBreakdown) {
        await StoryboardService.createScene({
          project_id: project.id,
          title: sceneData.title,
          description: sceneData.description,
          mood: sceneBeats[0]?.mood,
          target_duration_seconds: sceneData.targetDuration,
        });
      }
    }
  }

  navigate(`/storyboard/${project.id}`);
};
```

### useStoryboardAI Hook

```typescript
// src/hooks/useStoryboardAI.ts
export function useStoryboardAI() {
  return {
    generateStoryPlan,      // AI story structure generation
    suggestPrompts,         // Context-aware prompt suggestions
    recommendClipType,      // AI clip type recommendation
    enhancePrompt,          // Prompt enhancement
    buildAIStoryPlan,       // Convert AI response to DB format
    isGeneratingPlan,       // Loading state
    isSuggestingPrompts,
    isEnhancingPrompt,
  };
}
```

---

## V2 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     STORYBOARD V2 SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Project    │───>│    Scene     │───>│     Clip     │               │
│  └──────────────┘    └──────────────┘    └─────┬────────┘               │
│                                                 │                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      V2 UI COMPONENTS                           │    │
│  │  ┌───────────┐  ┌───────────┐  ┌──────────────────────────────┐ │    │
│  │  │SceneStrip │  │ClipCanvas │  │     ClipDetailPanel          │ │    │
│  │  │(top nav)  │  │(clip row) │  │  - ClipTypeSelector          │ │    │
│  │  └───────────┘  └───────────┘  │  - MotionLibrary             │ │    │
│  │  ┌─────────────────────────┐   │  - PromptInput + AI Suggest  │ │    │
│  │  │ ClipTile (per clip)     │   │  - FrameSelector             │ │    │
│  │  └─────────────────────────┘   └──────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │               useClipOrchestration Hook                         │    │
│  │  • Resolves model via ClipOrchestrationService                  │    │
│  │  • Fetches prompt template                                      │    │
│  │  • Calls enhance-prompt edge function                           │    │
│  │  • Executes fal-image with resolved config                      │    │
│  │  • Polls jobs table for async completion                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │               ClipOrchestrationService                          │    │
│  │  • getModelForClipType() → Queries api_models by task           │    │
│  │  • getPromptTemplate() → Queries prompt_templates               │    │
│  │  • buildGenerationConfig() → Clip-type specific config          │    │
│  │  • enhancePrompt() → Calls enhance-prompt edge function         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Hook: useClipOrchestration

### Core Functionality (Replaces useClipGeneration)

```typescript
// src/hooks/useClipOrchestration.ts
export function useClipOrchestration() {
  // Generate clip with full orchestration
  const generateClip = useMutation({
    mutationFn: async (input: GenerateClipInput) => {
      // 1. Resolve model for clip type
      const model = await ClipOrchestrationService.getModelForClipType(
        input.clipType
      );

      // 2. Build generation config based on clip type
      const config = await ClipOrchestrationService.buildGenerationConfig({
        clipType: input.clipType,
        referenceImageUrl: input.referenceImageUrl,
        motionPresetId: input.motionPresetId,
        endFrameUrl: input.endFrameUrl,
      });

      // 3. Enhance prompt if enabled
      let finalPrompt = input.prompt;
      if (input.enhancePrompt) {
        finalPrompt = await ClipOrchestrationService.enhancePrompt(
          input.prompt,
          input.contentMode
        );
      }

      // 4. Create clip record
      const clip = await StoryboardService.createClip({
        scene_id: input.sceneId,
        prompt: finalPrompt,
        clip_type: input.clipType,
        api_model_id: model.id,
        ...
      });

      // 5. Call fal-image edge function
      const response = await supabase.functions.invoke('fal-image', {
        body: {
          prompt: finalPrompt,
          apiModelId: model.id,
          modality: 'video',
          input: config,
          metadata: { storyboard_clip_id: clip.id }
        }
      });

      return clip;
    }
  });

  // Poll jobs table for completion
  useEffect(() => {
    activeGenerations.forEach(async (gen) => {
      if (gen.status === 'generating' && gen.jobId) {
        const { data: job } = await supabase
          .from('jobs')
          .select('status, result_url')
          .eq('id', gen.jobId)
          .single();

        if (job?.status === 'completed') {
          await StoryboardService.updateClip(gen.clipId, {
            video_url: job.result_url,
            status: 'completed',
          });
        }
      }
    });
  }, [activeGenerations]);

  return {
    generateClip: generateClip.mutateAsync,
    isGenerating: generateClip.isPending,
    activeGenerations,
    retryClip,
  };
}
```

---

## Generation Config by Clip Type

### Quick Clip (I2V)

```typescript
config = {
  image_url: referenceImageUrl,  // Character/scene reference
};
```

### Extended Clip (Extend)

```typescript
config = {
  video: previousClip.video_url,  // Continue from video
};
```

### Controlled Clip (MultiCondition)

```typescript
config = {
  images: [{ url: referenceImageUrl, type: 'identity' }],
  videos: [{ url: motionPreset.video_url }],
};
```

### Keyframed Clip

```typescript
config = {
  images: [
    { url: startFrameUrl, position: 0 },
    { url: endFrameUrl, position: 1 },
  ],
};
```

---

## Frame Chaining

### Frame Extraction Rules

| Clip Duration | Extraction Window | Rationale |
|---------------|-------------------|-----------|
| 3-4 seconds   | 40-55%            | Earlier extraction for shorter clips |
| 5-6 seconds   | 45-60%            | Default sweet spot |
| 8-10 seconds  | 50-65%            | Later extraction for longer clips |

### Frame Extraction by Clip Type

| Clip Type | Frame Extraction Behavior |
|-----------|--------------------------|
| quick | Extract at 45-60% for chaining to next clip |
| extended | No extraction (continues from video) |
| controlled | Extract for motion identity reference |
| keyframed | End frame → next clip start |

### FrameSelector Component

```typescript
// src/components/storyboard/FrameSelector.tsx
interface FrameSelectorProps {
  videoUrl: string;
  duration: number;
  initialTimestamp?: number;
  onFrameSelected: (timestampMs: number, frameUrl: string) => void;
}

// Shows video with slider and "optimal range" indicator
// User can scrub to select frame, see preview
// Optimal range highlighted based on clip duration
```

---

## Database Schema (V2 Extensions)

### Updated storyboard_clips

```sql
ALTER TABLE storyboard_clips
ADD COLUMN clip_type TEXT DEFAULT 'quick'
  CHECK (clip_type IN ('quick', 'extended', 'controlled', 'long', 'keyframed')),
ADD COLUMN parent_clip_id UUID REFERENCES storyboard_clips(id),
ADD COLUMN motion_preset_id UUID REFERENCES motion_presets(id),
ADD COLUMN resolved_model_id UUID REFERENCES api_models(id),
ADD COLUMN prompt_template_id UUID REFERENCES prompt_templates(id),
ADD COLUMN enhanced_prompt TEXT,
ADD COLUMN generation_config JSONB DEFAULT '{}';
```

### New Table: motion_presets

```sql
CREATE TABLE motion_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,  -- NULL for built-in
  name TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds NUMERIC,
  category TEXT DEFAULT 'general',  -- breathing, turn, walk, camera
  is_builtin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Updated storyboard_projects

```sql
ALTER TABLE storyboard_projects
ADD COLUMN ai_story_plan JSONB,  -- Story beats from AI
ADD COLUMN content_mode TEXT DEFAULT 'nsfw';
```

---

## Component Architecture (V2)

### Page Components

- `Storyboard.tsx` - Project list with AI story plan integration
- `StoryboardEditor.tsx` - V2 editor with scene strip, clip canvas, detail panel

### V2 Storyboard Components (`src/components/storyboard/`)

| Component | Purpose |
|-----------|---------|
| `SceneStrip.tsx` | Horizontal scene navigation |
| `ClipCanvas.tsx` | Drag-and-drop clip strip |
| `ClipTile.tsx` | Individual clip with status badges |
| `ClipDetailPanel.tsx` | Bottom panel with type, prompt, frame selector |
| `ClipTypeSelector.tsx` | Clip type dropdown with AI recommendations |
| `ClipLibrary.tsx` | Right sidebar with character canons |
| `MotionLibrary.tsx` | Motion preset browser with video previews |
| `FrameSelector.tsx` | Visual frame extraction slider |
| `AssemblyPreview.tsx` | Sequential video playback |

### Hooks

- `useStoryboard.ts` - State management for projects, scenes, clips
- `useClipOrchestration.ts` - V2 generation orchestration (replaces useClipGeneration)
- `useStoryboardAI.ts` - AI assistance integration

### Services

- `StoryboardService.ts` - CRUD operations for all storyboard entities
- `ClipOrchestrationService.ts` - Dynamic model selection, prompt templates, generation config
- `FrameExtractionService.ts` - Client-side video frame extraction

---

## Error Handling

### Generation Failures

```typescript
// Failed clips don't block project progress
if (generationFailed) {
  await StoryboardService.updateClip(clipId, { status: 'failed' });

  // UI shows retry button
  // User can retry individually with same or different model
  // No automatic model fallback (user controls)
}
```

### Retry Strategy

```typescript
const retryClip = async (clip: StoryboardClip, newModelId?: string) => {
  return generateClip({
    sceneId: clip.scene_id,
    prompt: clip.prompt,
    clipType: clip.clip_type,
    referenceImageUrl: clip.reference_image_url,
    modelId: newModelId || clip.api_model_id
  });
};
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Clip generation | < 3 minutes | Depends on model load |
| Frame extraction | < 1 second | Client-side canvas |
| Final render (30s) | < 10 minutes | Edge function FFmpeg |
| UI responsiveness | < 100ms | React Query caching |
| AI story planning | < 10 seconds | OpenRouter/Qwen |

---

## Key Files Reference

### Services

| File | Purpose |
|------|---------|
| `src/lib/services/ClipOrchestrationService.ts` | Dynamic model + template routing |
| `src/lib/services/StoryboardService.ts` | CRUD operations |
| `src/lib/services/FrameExtractionService.ts` | Frame extraction |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useClipOrchestration.ts` | V2 generation orchestration |
| `src/hooks/useStoryboardAI.ts` | AI assistance integration |
| `src/hooks/useStoryboard.ts` | Project/scene/clip state |

### Components

| File | Purpose |
|------|---------|
| `src/pages/StoryboardEditor.tsx` | Main editor page |
| `src/components/storyboard/ClipDetailPanel.tsx` | Clip editing panel |
| `src/components/storyboard/FrameSelector.tsx` | Frame extraction UI |
| `src/components/storyboard/AssemblyPreview.tsx` | Video preview |

### Edge Functions

| File | Purpose |
|------|---------|
| `supabase/functions/storyboard-ai-assist/index.ts` | AI planning |
| `supabase/functions/fal-image/index.ts` | Video generation |
| `supabase/functions/enhance-prompt/index.ts` | Prompt enhancement |

---

## Related Documentation

- [02-STORYBOARD_PURPOSE.md](../01-PAGES/02-STORYBOARD_PURPOSE.md) - Page purpose overview
- [STORYBOARD_USER_GUIDE.md](../09-REFERENCE/STORYBOARD_USER_GUIDE.md) - User how-to guide
- [FRAMECHAINING_GUIDE.md](../09-REFERENCE/FRAMECHAINING_GUIDE.md) - Frame chaining deep dive
- [FAL_AI.md](../05-APIS/FAL_AI.md) - fal.ai integration details
- [PROMPTING_SYSTEM.md](./PROMPTING_SYSTEM.md) - Prompt template system

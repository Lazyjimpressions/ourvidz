# Storyboard System

**Last Updated:** January 5, 2026
**Status:** Phase 2 Complete - Clip generation with frame chaining functional

## Overview

The Storyboard system enables users to create longer-form video content through AI-assisted story planning and frame chaining. It generates individual video clips that maintain character consistency across a sequence, then allows stitching them into final exports.

### Core Use Cases

1. **Multi-Scene Projects**: Create videos with multiple scenes, each containing multiple clips
2. **Character Continuity**: Maintain consistent character appearance across all clips via frame chaining
3. **AI Story Planning**: Generate story beats and scene suggestions based on project description
4. **Unified Export**: Stitch clips into final video or download individually

---

## Critical Technical Constraint: Frame Chaining

### The Problem

WAN 2.1 I2V (Image-to-Video) does NOT support first+last frame interpolation like some other models. This means we cannot specify "start at frame A, end at frame B."

### The Solution: Frame Chaining

Extract a frame from each completed clip to use as the reference image for the next clip:

```
Reference Image → Clip 1 → Extract Frame (45-60%) → Clip 2 → Extract Frame → Clip 3...
```

This creates implicit temporal continuity without explicit frame interpolation.

### Frame Extraction Rules

| Clip Duration | Extraction Window | Rationale |
|---------------|-------------------|-----------|
| 3-4 seconds   | 40-55%            | Earlier extraction for shorter clips |
| 5-6 seconds   | 45-60%            | Default sweet spot |
| 8-10 seconds  | 50-65%            | Later extraction for longer clips |

### Why Mid-Point Extraction?

- **Too Early (0-30%)**: Motion hasn't developed, reference too similar to input
- **Sweet Spot (40-65%)**: Motion is established, character recognizable, good continuation point
- **Too Late (70-100%)**: Often blurry, motion artifacts, poor reference quality

---

## Architecture

### Provider Architecture

| Provider | Type | Use Case | NSFW Support |
|----------|------|----------|--------------|
| fal.ai WAN 2.1 I2V | Primary | Video generation from image | Yes |
| Local WAN Worker | Alternative | When RunPod healthy | Yes |
| fal.ai Kling O1 | Secondary | Cinematic SFW content | Limited |

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STORYBOARD SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Project    │───>│    Scene     │───>│     Clip     │              │
│  │  (1 per)     │    │  (N scenes)  │    │  (N clips)   │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                 │                       │
│                                                 ▼                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      ClipWorkspace.tsx                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │  Reference  │  │   Prompt    │  │   Model     │             │   │
│  │  │   Image     │  │   Input     │  │  Selector   │             │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │   │
│  │         └────────────────┼────────────────┘                     │   │
│  │                          ▼                                      │   │
│  │                  ┌──────────────┐                               │   │
│  │                  │   Generate   │                               │   │
│  │                  │    Button    │                               │   │
│  │                  └──────┬───────┘                               │   │
│  └─────────────────────────┼───────────────────────────────────────┘   │
│                            ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    useClipGeneration Hook                       │   │
│  │  • Creates clip record in DB                                    │   │
│  │  • Calls fal-image edge function                                │   │
│  │  • Polls job status until complete                              │   │
│  │  • Updates clip with video_url                                  │   │
│  └─────────────────────────┬───────────────────────────────────────┘   │
│                            ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │               fal-image Edge Function                           │   │
│  │  • Routes to WAN 2.1 I2V                                        │   │
│  │  • Handles image_url (reference) + prompt                       │   │
│  │  • Creates job record for async polling                         │   │
│  │  • Returns job ID or immediate result                           │   │
│  └─────────────────────────┬───────────────────────────────────────┘   │
│                            ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      fal.ai API                                 │   │
│  │  Model: fal-ai/wan-i2v                                          │   │
│  │  Input: image_url, prompt, duration, aspect_ratio               │   │
│  │  Output: video_url                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

```sql
-- Main project record
storyboard_projects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'draft',  -- draft, active, completed, archived
  aspect_ratio TEXT DEFAULT '16:9',
  target_duration_seconds INT DEFAULT 30,
  primary_character_id UUID REFERENCES characters,
  story_beats JSONB,            -- AI-generated story structure
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Scenes within a project
storyboard_scenes (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES storyboard_projects,
  scene_order INT,
  title TEXT,
  description TEXT,
  setting TEXT,
  mood TEXT,
  target_duration_seconds INT DEFAULT 5,
  actual_duration_seconds INT,
  status TEXT DEFAULT 'draft'
)

-- Video clips within a scene
storyboard_clips (
  id UUID PRIMARY KEY,
  scene_id UUID REFERENCES storyboard_scenes,
  clip_order INT,
  prompt TEXT NOT NULL,
  reference_image_url TEXT,        -- Input image for I2V
  reference_image_source TEXT,     -- 'uploaded', 'character_portrait', 'extracted_frame'
  video_url TEXT,                  -- Generated video
  thumbnail_url TEXT,
  extracted_frame_url TEXT,        -- Frame for next clip chaining
  extracted_frame_timestamp_ms INT,
  duration_seconds NUMERIC,
  api_model_id UUID REFERENCES api_models,
  status TEXT DEFAULT 'pending',   -- pending, generating, completed, failed
  generation_metadata JSONB,
  created_at TIMESTAMPTZ
)

-- Extracted frames (for advanced frame management)
storyboard_frames (
  id UUID PRIMARY KEY,
  clip_id UUID REFERENCES storyboard_clips,
  frame_url TEXT,
  timestamp_ms INT,
  quality_score NUMERIC,
  is_chain_frame BOOLEAN DEFAULT false,
  used_in_clip_id UUID REFERENCES storyboard_clips
)

-- Final video renders
storyboard_renders (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES storyboard_projects,
  output_url TEXT,
  quality_preset TEXT DEFAULT 'high',
  transition_style TEXT DEFAULT 'cut',
  status TEXT DEFAULT 'pending',
  progress_percentage INT DEFAULT 0,
  error_message TEXT
)
```

### Row Level Security

All tables implement RLS policies ensuring users can only access their own data:

```sql
-- Example: storyboard_clips
CREATE POLICY "Users can view own clips"
ON storyboard_clips FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM storyboard_scenes s
    JOIN storyboard_projects p ON s.project_id = p.id
    WHERE s.id = scene_id AND p.user_id = auth.uid()
  )
);
```

---

## Prompting Strategy

### First Clip (Anchor Prompt)

The first clip establishes the visual identity. Use comprehensive description:

```typescript
const anchorPrompt = generateAnchorPrompt({
  character: {
    appearance: "young woman, long dark hair, green eyes",
    attire: "red dress, gold jewelry",
  },
  pose: "standing, looking at camera",
  environment: "beach at sunset, golden hour lighting",
  mood: "romantic, intimate",
  motion: "slow natural movement, hair gently blowing"
});

// Output:
// "young woman, long dark hair, green eyes, wearing red dress and gold jewelry,
//  standing, looking at camera, beach at sunset, golden hour lighting,
//  romantic intimate mood, slow natural movement, hair gently blowing,
//  cinematic quality, 4k"
```

### Chain Clips (Continuation Prompts)

Subsequent clips should NOT re-describe the character. Focus on motion intent:

```typescript
const chainPrompt = generateChainPrompt({
  motion: "continuing the motion",
  change: "turns slightly to the side",
  environment_shift: "camera slowly pans right"
});

// Output:
// "same character and setting, continuing the motion, turns slightly to the side,
//  camera slowly pans right, smooth continuation"
```

### Why Not Re-Describe?

Re-describing character in chain prompts causes **identity drift**:

| Approach | Result |
|----------|--------|
| Full re-description | Each clip interprets description differently → inconsistent appearance |
| Motion-only prompt | Model preserves input frame appearance → consistent character |

---

## Component Architecture

### ClipWorkspace.tsx

Main generation interface. Key responsibilities:

```typescript
// State Management
const [prompt, setPrompt] = useState('');
const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
const [firstClipReferenceUrl, setFirstClipReferenceUrl] = useState<string | null>(null);

// Reference Image Logic
const isFirstClip = clips.length === 0;
const canChain = clips.length > 0 && previousClip?.extracted_frame_url;

// Generate Handler
const handleGenerate = async () => {
  let referenceImageUrl: string | undefined;
  let referenceImageSource: string | undefined;

  if (isFirstClip) {
    // First clip: use uploaded/selected reference
    referenceImageUrl = firstClipReferenceUrl;
    referenceImageSource = firstClipReferenceSource;
  } else if (canChain) {
    // Chain clip: use previous clip's extracted frame
    referenceImageUrl = previousClip.extracted_frame_url;
    referenceImageSource = 'extracted_frame';
  }

  await generateClip({
    sceneId,
    prompt,
    referenceImageUrl,
    referenceImageSource,
    modelId: selectedModelId
  });
};
```

### FrameSelector.tsx

Visual frame extraction interface:

```typescript
interface FrameSelectorProps {
  videoUrl: string;
  duration: number;
  currentTimestamp?: number;
  onFrameSelect: (timestampMs: number) => void;
}

// Shows video with slider and "optimal range" indicator
// User can scrub to select frame, see preview
// Optimal range highlighted based on clip duration
```

### ChainIndicator.tsx

Visual chain relationship:

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Clip 1  │────>│ Clip 2  │────>│ Clip 3  │
└─────────┘     └─────────┘     └─────────┘
     │               │               │
     ▼               ▼               ▼
  [Frame]        [Frame]        [Frame]
  52% ────────> Reference     Reference
```

---

## Hook: useClipGeneration

### Core Functionality

```typescript
export function useClipGeneration() {
  // Load video models from api_models table
  const { data: videoModels } = useQuery({
    queryKey: ['video-models'],
    queryFn: async () => {
      const { data } = await supabase
        .from('api_models')
        .select('id, model_key, display_name, capabilities, api_providers!inner(name)')
        .eq('modality', 'video')
        .eq('is_active', true);
      return data;
    }
  });

  // Generate clip mutation
  const generateMutation = useMutation({
    mutationFn: async (input: GenerateClipInput) => {
      // 1. Create clip record
      const clip = await StoryboardService.createClip({...});

      // 2. Call fal-image edge function
      const response = await supabase.functions.invoke('fal-image', {
        body: {
          prompt: input.prompt,
          apiModelId: input.modelId,
          modality: 'video',
          input: { image_url: input.referenceImageUrl },
          metadata: { is_wan_i2v: true, storyboard_clip_id: clip.id }
        }
      });

      // 3. Poll for completion or return immediate result
      return clip;
    }
  });

  // Job polling (every 3 seconds)
  useEffect(() => {
    activeGenerations.forEach(gen => {
      if (gen.status === 'generating' && gen.jobId) {
        // Poll job status, update clip when complete
      }
    });
  }, [activeGenerations]);

  return {
    videoModels,
    generateClip: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    activeGenerations
  };
}
```

---

## Edge Function: fal-image

### Video Generation Flow

```typescript
// supabase/functions/fal-image/index.ts

// WAN 2.1 I2V specific handling
if (metadata?.is_wan_i2v) {
  const falInput = {
    image_url: input.image_url,      // Reference image (required)
    prompt: prompt,                   // Motion/scene description
    num_inference_steps: 25,
    guidance_scale: 7.0,
    negative_prompt: "blurry, distorted, low quality",
    duration: metadata.duration || 5  // seconds
  };

  const result = await fal.subscribe("fal-ai/wan-i2v", {
    input: falInput,
    pollInterval: 3000,
    timeout: 180000  // 3 minute timeout
  });

  return { resultUrl: result.video.url, status: 'completed' };
}
```

---

## Model Routing

### Video Model Selection

```typescript
// Priority order for video generation
const videoModelPriority = [
  {
    model: 'fal-ai/wan-i2v',
    provider: 'fal',
    condition: 'always_available'
  },
  {
    model: 'local-wan',
    provider: 'runpod',
    condition: 'health_check_passed'
  }
];

// Health check before local routing
const useLocalWan = () => {
  const health = useLocalModelHealth();
  return health.wanWorker?.isHealthy;
};
```

### Model Configuration (api_models table)

```sql
SELECT * FROM api_models WHERE modality = 'video' AND is_active = true;

-- Returns:
-- id: uuid
-- model_key: 'fal-ai/wan-i2v'
-- display_name: 'WAN 2.1 Image-to-Video'
-- modality: 'video'
-- provider_id: (fal provider uuid)
-- capabilities: { nsfw: true, speed: 'medium', quality: 'high' }
-- input_defaults: { duration: 5, guidance_scale: 7.0 }
```

---

## Error Handling

### Generation Failures

```typescript
// Failed clips don't block project progress
if (generationFailed) {
  await StoryboardService.updateClip(clipId, { status: 'failed' });

  // UI shows retry button
  setActiveGenerations(prev => {
    const next = new Map(prev);
    next.set(clipId, {
      clipId,
      status: 'failed',
      error: errorMessage
    });
    return next;
  });

  // User can retry individually
  // No automatic model fallback (user controls)
}
```

### Retry Strategy

```typescript
const retryClip = async (clip: StoryboardClip, newModelId?: string) => {
  // Reuse same prompt and reference
  return generateClip({
    sceneId: clip.scene_id,
    prompt: clip.prompt,
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

---

## Future Phases

### Phase 3: AI Assistance

- `storyboard-ai-assist` edge function
- Story beat generation from project description
- Scene suggestions based on context
- Prompt generation for clips

### Phase 4: Preview + Export

- Sequential preview playback
- FFmpeg-based stitching in edge function
- Transition effects between clips

### Phase 5: Roleplay Integration

- Import scenes from roleplay conversations
- Character reference sharing
- Conversation-to-storyboard flow

---

## Related Documentation

- [DEV_PLAN_STORYBOARD.md](../06-DEVELOPMENT/DEV_PLAN_STORYBOARD.md) - Development plan and status
- [02-STORYBOARD_PURPOSE.md](../01-PAGES/02-STORYBOARD_PURPOSE.md) - Page purpose overview
- [STORYBOARD_USER_GUIDE.md](../09-REFERENCE/STORYBOARD_USER_GUIDE.md) - User how-to guide
- [FAL_AI.md](../05-APIS/FAL_AI.md) - fal.ai integration details
- [PROMPTING_SYSTEM.md](./PROMPTING_SYSTEM.md) - Prompt template system

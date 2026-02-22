# Multi-Reference System Design Brief

**Last Updated:** February 22, 2026
**Status:** Design Brief
**Scope:** Multi-reference capabilities for Image (Seedream) and Video (LTX 13B) generation, integration with Storyboard and Roleplay workflows

---

## Purpose

This brief explores all pathways for leveraging multi-reference image/video capabilities in OurVidz. It establishes a unified architecture for character consistency, scene continuity, and longer-form video creation across Workspace, Storyboard, and Roleplay features.

---

## Multi-Image Capabilities Summary

| Model | Max Images | Input Type | Constraint |
|-------|------------|------------|------------|
| **Seedream v4.5/edit** | **10** | `image_urls[]` array | Spatial composition |
| **LTX 13B MultiCondition** | **~21** | `images[]` array | Temporal (start_frame_num 0-160, multiples of 8) |
| **LTX 13B I2V** | **1** | `image_url` | Single keyframe |
| **Flux-2/edit** | **4** | `image_urls[]` array | Spatial composition |

### LTX MultiCondition: Multi-Image TEMPORAL Anchoring

LTX 13B MultiCondition supports **any number of images** via the `images[]` array.

**Key Constraint:** Each image has a `start_frame_num` property:

- Must be a multiple of 8
- Range: 0 to 160
- Practical limit: ~21 distinct frame slots (0, 8, 16, 24, ... 160)

**Use Case:** Place different reference images at different points in the video timeline:

```typescript
// LTX MultiCondition input
{
  prompt: "Character walks through changing environments",
  images: [
    { url: "char_portrait.jpg", start_frame_num: 0 },     // Identity at start
    { url: "environment_1.jpg", start_frame_num: 40 },    // Scene at 40 frames
    { url: "pose_ref.jpg", start_frame_num: 80 },         // Pose at 80 frames
    { url: "environment_2.jpg", start_frame_num: 120 }    // New scene at 120 frames
  ],
  num_frames: 161,
  frame_rate: 24
}
```

### Seedream: Multi-Image SPATIAL Composition

Seedream combines up to 10 images into a SINGLE output frame (spatial blending).

### Key Distinction

| Model | Multi-Image Type | Use Case |
|-------|------------------|----------|
| **Seedream** | Spatial (blend into one frame) | Multi-character scenes, pose + style + environment |
| **LTX MultiCondition** | Temporal (across timeline) | Progressive scene changes, identity anchoring at keyframes |

---

## Executive Summary

| Model | Max Refs | Reference Types | Key Capability |
|-------|----------|-----------------|----------------|
| **Seedream v4.5/edit** | 10 images | `image_urls[]` array | Figure notation composition |
| **LTX 13B MultiCondition** | ~21 images | `images[]` array | Temporal identity anchoring |
| **LTX 13B I2V** | 1 image | `image_url` | Canonical keyframe anchoring |
| **LTX 13B Extend** | 1 video | `video_url` | Continuity extension |

**Core Insight:** Seedream handles **multi-image spatial composition** (up to 10 refs), while LTX handles **temporal anchoring** via MultiCondition. Together, they enable:

- Character-consistent image sequences (Seedream)
- Identity-stable video with keyframe anchoring (LTX MultiCondition)
- Long-form video via I2V → Extend chains (LTX)

---

## Model Capabilities Detail

### Maximum Image Support

| Model | Max Images | Task Support | DB Status | Cost |
|-------|------------|--------------|-----------|------|
| **Seedream v4.5/edit** | **10** | i2i, i2i_multi | Fully configured | $0.035 |
| Flux-2/edit | 4 | i2i, i2i_multi | Partial | $0.012/MP |
| Flux-2/flash/edit | 4 | i2i, i2i_multi | Fully configured | $0.005/MP |
| Flux-2/turbo/edit | 4 | TBD | Docs only | $0.008/MP |

### Key Technical Details

**Seedream v4.5/edit** (Best for multi-ref):

- Input: `image_urls[]` array (1-10 images)
- Character limit: 10,000 chars
- Uses Figure notation in prompts ("Figure 1", "Figure 2", etc.)
- DB flag: `requires_image_urls_array: true`, `max_images: 10`

**Flux-2 variants**:

- Input: `image_urls[]` array (1-4 images)
- Character limit: ~10,000 chars
- Supports HEX color control (unique to Flux)
- Faster generation but fewer references

---

## Current OurVidz Implementation (Feb 22, 2026)

### Fixed 4-Slot System (Image Mode)

The workspace now uses **4 fixed slots** for image mode multi-reference:

```typescript
export const FIXED_IMAGE_SLOTS = [
  { role: 'character', label: 'Char 1' },  // Primary character
  { role: 'character', label: 'Char 2' },  // Secondary character
  { role: 'character', label: 'Char 3' },  // Tertiary character
  { role: 'pose', label: 'Pose' },         // Pose/composition reference
];
```

### Slot Storage Structure

| Slot | State Variable | Purpose |
|------|----------------|---------|
| Char 1 | `referenceImageUrl` | Primary character reference |
| Char 2 | `referenceImage2Url` | Secondary character reference |
| Char 3 | `additionalRefUrls[0]` | Third character reference |
| Pose | `additionalRefUrls[1]` | Pose/position guidance |

### Auto-Overflow Behavior

When adding references, slots fill sequentially:

1. Char 1 empty → fills Char 1
2. Char 2 empty → fills Char 2
3. Char 3 empty → fills Char 3
4. Pose empty → fills Pose
5. All filled → toast "All reference slots are filled"

### Figure Notation Auto-Injection

The system auto-prepends Figure notation based on filled slots:

| Slots Filled | Prompt Prefix |
|--------------|---------------|
| Char 1 + Pose | "Show the character from Figure 1 in the pose/position shown in Figure 2: " |
| Char 1 + Char 2 | "Show the character from Figure 1 and the character from Figure 2 together: " |
| Char 1 + Char 2 + Pose | "...Figure 1 and Figure 2 in the pose/position shown in Figure 3: " |
| Char 1 + Char 2 + Char 3 | "Show the characters from Figure 1, Figure 2, and Figure 3 together: " |
| All 4 slots | "...Figure 1, Figure 2, and Figure 3 in the pose/position shown in Figure 4: " |

### Multi-Ref Data Flow

```text
MobileQuickBar (4 fixed slots: Char1, Char2, Char3, Pose)
  ↓
MobileSimplifiedWorkspace (state: referenceImageUrl, referenceImage2Url, additionalRefUrls[])
  ↓
useLibraryFirstWorkspace.ts (builds allRefUrls array, injects Figure notation)
  ↓
fal-image Edge Function
  ├─ buildModelInput(): signs all URLs
  └─ image_urls = [char1, char2, char3, pose] (filtered to non-empty)
  ↓
fal.ai API (Seedream v4.5/edit accepts up to 10 images)
```

### Key Files

- `src/components/workspace/MobileQuickBar.tsx` - Fixed 4-slot UI with FIXED_IMAGE_SLOTS constant
- `src/pages/MobileSimplifiedWorkspace.tsx` - State management, overflow logic
- `src/hooks/useLibraryFirstWorkspace.ts` - Figure notation injection (lines 1357-1373)
- `supabase/functions/fal-image/index.ts` - buildModelInput() with image_urls array
- `supabase/functions/roleplay-chat/index.ts` - Scene generation Figure notation

### Video Mode (Unchanged)

Video mode still uses 2 dynamic slots with add/remove buttons:

```typescript
const videoRefSlots = [
  { url: beginningRefImageUrl, isVideo: ref1IsVideo },
  { url: endingRefImageUrl, isVideo: ref2IsVideo },
];
```

---

## Character Reference Storage Infrastructure

### Current State

| Table | Purpose | Status |
|-------|---------|--------|
| `character_anchors` | Stores face/body/style refs | Exists, underutilized |
| `character_portraits` | Gallery of generated portraits | Active |
| `character_canon` | Canonical keyframe tracking | May need creation |

### Storage Bucket Structure

**Current:** Character images stored in `reference_images` bucket

**Proposed Dedicated Structure:**

```text
characters/
├── {character_id}/
│   ├── anchors/
│   │   ├── face_front.jpg          # Face identity anchor
│   │   ├── face_3quarter.jpg       # Alternate angle
│   │   ├── body_full.jpg           # Body reference
│   │   └── style_sample.jpg        # Style reference
│   ├── portraits/
│   │   ├── portrait_001.jpg        # Generated portraits
│   │   └── portrait_002.jpg
│   └── lora_training/              # LoRA preparation folder
│       ├── training_001.jpg        # Curated for LoRA
│       ├── training_002.jpg
│       └── captions/
│           ├── training_001.txt    # Auto-generated captions
│           └── training_002.txt
```

### Database Schema for Anchors

```sql
-- Existing character_anchors table (may need extension)
CREATE TABLE character_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  anchor_type TEXT CHECK (anchor_type IN ('face', 'body', 'style', 'pose', 'canonical')),
  storage_path TEXT NOT NULL,
  url TEXT,
  is_primary BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',  -- {angle: '3quarter', expression: 'neutral'}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick anchor lookup
CREATE INDEX idx_character_anchors_type ON character_anchors(character_id, anchor_type);
```

---

## Global Reference Library (Poses + LoRA Training)

### Design Goal: Unified Curated Image Library

A single curated image library serves DUAL purposes:

1. **Reference Selection**: Users pick poses/styles from categorized library in UI
2. **LoRA Training Preparation**: Same curated images become training data for character LoRAs

**Key Insight:** The curation work is the same - high-quality, categorized reference images that can be used both for direct reference AND for model fine-tuning.

### Proposed Schema: `reference_library`

```sql
CREATE TABLE reference_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Categorization (same image can be pose AND training data)
  category TEXT CHECK (category IN (
    'standing', 'sitting', 'lying', 'action',
    'couples', 'group', 'camera_angle',
    'expression', 'lighting', 'style', 'environment'
  )),
  tags TEXT[] DEFAULT '{}',  -- ['nsfw', 'clothed', 'outdoor', 'portrait']

  -- Storage
  storage_path TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Ownership
  is_system BOOLEAN DEFAULT false,      -- System-provided vs user-uploaded
  user_id UUID REFERENCES profiles(id), -- NULL for system refs
  character_id UUID REFERENCES characters(id), -- Optional: linked to specific character

  -- LoRA training metadata
  lora_eligible BOOLEAN DEFAULT false,  -- User marked as good for LoRA training
  auto_caption TEXT,                    -- Vision-model generated caption
  manual_caption TEXT,                  -- User-edited caption

  -- Usage tracking
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}',  -- {body_type, complexity, resolution, etc.}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ref_library_category ON reference_library(category);
CREATE INDEX idx_ref_library_user ON reference_library(user_id);
CREATE INDEX idx_ref_library_character ON reference_library(character_id);
CREATE INDEX idx_ref_library_lora ON reference_library(lora_eligible) WHERE lora_eligible = true;

-- RLS: Users see system refs + their own
CREATE POLICY "ref_library_visibility" ON reference_library
  USING (is_system = true OR user_id = auth.uid());
```

### Dual-Purpose Workflow

```text
User uploads/selects image
      ↓
Categorize (pose, style, expression...)
      ↓
┌─────────────────────────────────────┐
│                                     │
↓                                     ↓
Reference Slot Usage             LoRA Training Pool
(immediate use in UI)           (curate for model fine-tuning)
      ↓                               ↓
Select in workspace             Mark as "LoRA eligible"
      ↓                               ↓
Generate with ref              Auto-caption with vision model
                                      ↓
                               Export for training
```

### Reference Picker UI

```typescript
// Reference slot dropdown - unified picker
const referenceSources = [
  { label: 'Upload Custom', action: 'upload' },
  { label: '── Poses ──', divider: true },
  { label: 'Standing', category: 'standing' },
  { label: 'Sitting', category: 'sitting' },
  { label: 'Couples', category: 'couples' },
  { label: 'Action', category: 'action' },
  { label: '── Style ──', divider: true },
  { label: 'Lighting', category: 'lighting' },
  { label: 'Environment', category: 'environment' },
  { label: 'Expressions', category: 'expression' },
  { label: '── Personal ──', divider: true },
  { label: 'My Library', action: 'user_library' },
  { label: 'Character Refs', action: 'character_refs' },  // Linked to selected character
];
```

### Seed Library (System-Provided)

Initial system references (30-50 curated images):

| Category | Count | Examples |
|----------|-------|----------|
| Standing Poses | 8 | Casual, formal, action, relaxed, confident, shy, dynamic, profile |
| Sitting Poses | 6 | Chair, floor, couch, cross-legged, professional, relaxed |
| Couples Poses | 6 | Side-by-side, facing, embracing, back-to-back, dynamic, intimate |
| Camera Angles | 5 | Low, high, dutch, eye-level, over-shoulder |
| Expressions | 5 | Happy, serious, surprised, flirty, contemplative |
| Lighting | 5 | Soft, dramatic, golden hour, neon, natural |

---

## Dynamic Reference Slot Roles

### Current: Fixed Roles

```typescript
export const FIXED_IMAGE_SLOTS = [
  { role: 'character', label: 'Char 1' },
  { role: 'character', label: 'Char 2' },
  { role: 'character', label: 'Char 3' },
  { role: 'pose', label: 'Pose' },
];
```

### Proposed: User-Selectable Roles

Allow users to assign purpose to each slot dynamically:

```typescript
const AVAILABLE_ROLES = [
  { id: 'character', label: 'Character', icon: '👤', description: 'Person identity reference' },
  { id: 'pose', label: 'Pose', icon: '🧍', description: 'Body position/composition' },
  { id: 'scene', label: 'Scene', icon: '🏞️', description: 'Environment/background' },
  { id: 'style', label: 'Style', icon: '🎨', description: 'Artistic style reference' },
  { id: 'lighting', label: 'Lighting', icon: '💡', description: 'Lighting mood reference' },
  { id: 'clothing', label: 'Clothing', icon: '👕', description: 'Outfit/wardrobe reference' },
];

interface DynamicRefSlot {
  id: string;
  url: string | null;
  role: RoleType;  // User-selectable
  label: string;   // Auto-generated from role
}
```

### Role-Aware Prompt Construction

```typescript
function buildRoleAwarePrompt(slots: DynamicRefSlot[], userPrompt: string): string {
  const roleGroups = groupBy(slots.filter(s => s.url), 'role');

  const parts = [];
  if (roleGroups.character?.length) {
    parts.push(`Characters from Figure(s) ${roleGroups.character.map((_, i) => i + 1).join(', ')}`);
  }
  if (roleGroups.pose?.length) {
    parts.push(`Pose from Figure ${getFirstIndex(roleGroups.pose)}`);
  }
  if (roleGroups.scene?.length) {
    parts.push(`Scene/environment from Figure ${getFirstIndex(roleGroups.scene)}`);
  }
  if (roleGroups.style?.length) {
    parts.push(`Artistic style from Figure ${getFirstIndex(roleGroups.style)}`);
  }

  return `Using references: ${parts.join('; ')}. Generate: ${userPrompt}`;
}
```

---

## Vision Model Integration

### Opportunity: Auto-Analyze Reference Images

Use vision models to automatically:

1. Detect image content type (person, scene, style reference)
2. Extract character descriptions for LoRA captioning
3. Suggest optimal role assignment for each slot

### describe-image Edge Function

**Current:** `supabase/functions/describe-image/index.ts` exists for image analysis

**Multi-Ref Enhancement:**

```typescript
// Analyze uploaded reference to suggest role
async function analyzeReferenceForRole(imageUrl: string): Promise<{
  suggestedRole: RoleType;
  confidence: number;
  description: string;
}> {
  const { data } = await supabase.functions.invoke('describe-image', {
    body: {
      imageUrl,
      prompt: 'Analyze this image. Is it primarily: (a) a person/character portrait, (b) a full body pose, (c) a scene/environment, (d) an artistic style reference, (e) a lighting reference? Return JSON with {type, confidence, description}.'
    }
  });

  return mapToRole(data);
}
```

### Auto-Role Assignment Flow

```text
User uploads image → Vision model analyzes → Suggests role → User confirms/changes
```

### LoRA Caption Generation

```typescript
// Generate training caption for character image
async function generateLoRACaption(imageUrl: string, character: Character): Promise<string> {
  const { data } = await supabase.functions.invoke('describe-image', {
    body: {
      imageUrl,
      prompt: `Describe this image of ${character.name} in detail for AI training. Include: appearance, clothing, pose, expression, lighting, background. Format: "a [gender] with [features], wearing [clothing], [pose], [expression], [setting]"`
    }
  });

  return data.caption;
}
```

---

## LTX 13B Video Multi-Reference Capabilities

### Mental Model: Film Editor Paradigm

Choose endpoint by cinematographic intent:

| Endpoint | Role | Max References | When to Use |
|----------|------|----------------|-------------|
| **I2V** | Start a new shot | 1 image | Beginning of scene, identity lock |
| **Extend** | Keep camera rolling | 1 video | Long-form continuity |
| **MultiCondition** | Temporal anchoring | ~21 images | Identity at keyframes throughout video |
| **T2V** | Cheap ideation/B-roll | None | Establishing shots, no identity needed |

### MultiCondition: Multi-Image TEMPORAL Conditioning

LTX 13B MultiCondition supports **any number of images** placed at different points in the timeline.

**Key Constraint:** Each image has a `start_frame_num` property:

- Must be a multiple of 8
- Range: 0 to 160
- Practical limit: ~21 distinct frame slots (0, 8, 16, 24, ... 160)

```typescript
// MultiCondition input with temporal image placement
{
  prompt: "Character walks through changing environments",
  images: [
    { url: "char_portrait.jpg", start_frame_num: 0 },      // Identity at start
    { url: "pose_walking.jpg", start_frame_num: 40 },      // Pose guidance mid-video
    { url: "environment_2.jpg", start_frame_num: 80 },     // New scene
    { url: "char_closeup.jpg", start_frame_num: 120 }      // Re-anchor identity
  ],
  num_frames: 161,
  frame_rate: 24
}
```

### Temporal vs Spatial Multi-Ref

| Model | Multi-Image Type | What It Does |
|-------|------------------|--------------|
| **Seedream v4.5** | **Spatial** | Blends 1-10 images into SINGLE output frame |
| **LTX MultiCondition** | **Temporal** | Places images at different FRAMES in video timeline |

**Use Cases for Temporal Anchoring:**

1. **Identity Re-Anchoring**: Place character portrait at frames 0, 80, 160 to prevent drift
2. **Scene Transitions**: Different environment refs at different points in video
3. **Pose Keyframing**: Walking pose at 0, turning at 40, seated at 80
4. **Storyboard Scenes**: Each image represents a "beat" in the video

### When to Use Spatial vs Temporal

| Scenario | Use Seedream (Spatial) | Use LTX (Temporal) |
|----------|------------------------|---------------------|
| Multi-character image | ✅ Char1 + Char2 + Pose | ❌ |
| Video with scene changes | ❌ | ✅ Environment refs at keyframes |
| Character consistency in video | ❌ | ✅ Re-anchor identity every ~40 frames |
| Static composition reference | ✅ Style + Lighting + Pose | ❌ |

### Canonical Keyframes (Per-Character Master References)

Store 1-3 canonical keyframes per character:

- `front_closeup` - Face identity anchor
- `three_quarter` - General-use reference
- `medium_shot` - Body/wardrobe continuity

**Best Practice**: Start every new scene with I2V using a canonical keyframe, then use Extend for continuity.

### Two-Pass Inference Architecture

LTX uses first/second pass steps instead of guidance_scale:

| Mode | First Pass | Second Pass | Effect |
|------|-----------|-------------|--------|
| **Balanced** | 8-10 | 8-12 | Good default |
| **More motion** | 12-16 | 8-10 | Bigger action, riskier |
| **More stability** | 8-10 | 10-14 | Identity preservation |

### LTX Prompting: One Shot / One Beat Rule

Each clip = ONE simple action beat, not a sequence.

**Good**: "subtle breathing and slow head turn"
**Bad**: "walks across room, sits, smiles, stands up"

**Shot Prompt Structure:**

```text
[Shot type], [subject], in/at [setting], [single action beat].
Camera: [framing], [movement]. Lighting: [mood].
Continuity: same outfit, same location, no scene cut.
```

---

## Storyboard Integration: Longer-Form Video Creation

### Current Pain Points

**Frame Chaining Problem:**

```text
Clip 1 (Character A, Pose X, Environment Y)
  ↓ Extract Frame @ 45-60%
Clip 2 (Reference: Clip1 end frame ONLY)
  → Model must infer: identity, pose transition, environment
  → RESULT: 50-70% consistency, character drift

Clip 3 (Reference: Clip2 end frame ONLY)
  → Further drift accumulation
```

### Multi-Ref Solution for Storyboard

**Hybrid Reference Chaining:**

```text
Clip 2 Generation:
  - Ref 1: Character canonical keyframe (identity anchor)
  - Ref 2: Clip 1 extracted frame (motion continuity)
  - Ref 3: Environment keyframe (setting consistency)

Result: Explicit anchors prevent drift
Character Consistency: 50-70% → 85-95%
```

### LTX Workflows for Storyboard

**Workflow 1: Default Roleplay Shot**

1. Select character canonical keyframe
2. Call I2V
3. If good → save as "scene shot"
4. User clicks "Continue" → use Extend

**Workflow 2: Long-Form Scene (8-60+ seconds)**

1. Start with I2V (canonical keyframe)
2. Use Extend repeatedly (chunked 4-5s segments)
3. If drift: cut back to I2V (new shot) OR use MultiCondition

**Workflow 3: Motion-Directed Scene**

1. Choose canonical keyframe image
2. Choose motion ref clip from Motion Library
3. Call MultiCondition
4. Extend if needed

### Storyboard Database Extensions

```sql
-- Enhanced clip reference tracking
ALTER TABLE storyboard_clips ADD COLUMN
  reference_images JSONB,  -- {canonical?, extracted?, environment?}
  reference_image_count INT DEFAULT 1,
  motion_reference_url TEXT;  -- For MultiCondition
```

---

## Roleplay Integration: Scene-to-Scene Continuity

### Current Implementation (Feb 2026)

The `roleplay-chat` edge function already uses multi-ref Figure notation:

```typescript
// Current roleplay-chat lines 3500-3600 (approximate)
// Already builds up to 3 reference images:

const imageUrlsArray = [];

// Figure 1: Scene environment (template preview OR previous scene)
if (templatePreviewImageUrl || previousSceneImageUrl) {
  imageUrlsArray.push(effectiveReferenceImageUrl);  // Figure 1
}

// Figure 2: AI character portrait
if (aiCharacterPortraitUrl) {
  imageUrlsArray.push(signedAiCharUrl);  // Figure 2
}

// Figure 3: User character (for both_characters image style)
if (userCharacterPortraitUrl && imageStyle === 'both_characters') {
  imageUrlsArray.push(signedUserCharUrl);  // Figure 3
}

// Sends to fal-image with image_urls array
```

**Current Figure Notation (hardcoded in roleplay-chat):**

```typescript
const figureNotation =
  `Show ${characterName} (Figure 2)` +
  (hasUserChar ? ` and user character (Figure 3)` : '') +
  ` in the scene from Figure 1: `;
```

### Current Pain Points

1. **Hardcoded prompt construction** - Figure notation built in edge function, not from `prompt_templates`
2. **Fixed 3-figure limit** - No support for additional references (pose, style)
3. **No dynamic role assignment** - Positions are implicit, not explicit
4. **Deduplication is reactive** - Should prevent duplicates earlier in flow

### Proposed Dynamic Roleplay Multi-Ref

**Move prompt construction to `prompt_templates` table:**

```sql
INSERT INTO prompt_templates (
  target_model,
  template_type,
  user_template,
  variables
) VALUES (
  'fal-ai/bytedance/seedream/v4.5/edit',
  'roleplay_scene',
  'Generate a scene showing {{character_figures}} in {{scene_context}}. {{action_description}}',
  '["character_figures", "scene_context", "action_description"]'
);
```

**Dynamic variable interpolation:**

```typescript
// roleplay-chat: Load template instead of hardcoding
const { data: template } = await supabase
  .from('prompt_templates')
  .select('user_template')
  .eq('template_type', 'roleplay_scene')
  .eq('target_model', model.model_key)
  .single();

const finalPrompt = interpolateTemplate(template.user_template, {
  character_figures: buildCharacterFigures(refs),
  scene_context: sceneDescription,
  action_description: extractedAction
});
```

---

## Dynamic Prompting Architecture (CRITICAL)

### Principle: No Hardcoded Prompts in Edge Functions

**Current Anti-Pattern:**

```typescript
// ❌ AVOID: Hardcoded Figure notation in useLibraryFirstWorkspace.ts
const figurePrefix = `Show the character from Figure 1 and Figure 2...`;
```

**Target Pattern:**

```typescript
// ✅ PREFERRED: Load from prompt_templates table
const { data: template } = await supabase
  .from('prompt_templates')
  .select('user_template, system_prompt, negative_prompt')
  .eq('target_model', model.model_key)
  .eq('template_type', 'multi_ref')
  .eq('ref_count', imageUrls.length)
  .single();

const finalPrompt = template.user_template
  .replace('{{ref_count}}', imageUrls.length)
  .replace('{{user_prompt}}', userPrompt);
```

### Single Global Template vs Multiple Templates Per Model

**Recommendation: Single Template Per Model with Dynamic Variables**

| Approach | Pros | Cons |
|----------|------|------|
| **Multiple templates (2-ref, 3-ref, 4-ref...)** | Precise control | Template explosion, maintenance burden |
| **Single template with variables** | DRY, easier updates | More complex variable interpolation |

**Proposed Single Template Structure:**

```sql
INSERT INTO prompt_templates (
  target_model, template_type, user_template, system_prompt
) VALUES (
  'fal-ai/bytedance/seedream/v4.5/edit',
  'multi_ref_universal',
  'Using {{ref_count}} reference images: {{role_descriptions}}. Generate: {{user_prompt}}',
  'You are creating a scene. Reference images are provided with specific roles.'
);
```

**Variable Interpolation:**

```typescript
function buildMultiRefPrompt(template: string, refs: RefSlot[]): string {
  const roleDescriptions = refs.map((r, i) =>
    `Figure ${i + 1} = ${r.role}`
  ).join(', ');

  return template
    .replace('{{ref_count}}', refs.length.toString())
    .replace('{{role_descriptions}}', roleDescriptions)
    .replace('{{user_prompt}}', userPrompt);
}
```

### Model Selection is Dynamic

**IMPORTANT:** Model selection is NOT hardcoded. The `api_models` table drives all model routing:

```typescript
// Current pattern in edge functions
const { data: model } = await supabase
  .from('api_models')
  .select('*, api_providers!inner(*)')
  .contains('tasks', [taskType])  // e.g., ['i2i_multi']
  .eq('is_active', true)
  .eq('api_providers.name', providerName)
  .order('priority', { ascending: true })
  .limit(1)
  .single();
```

**Task-Based Routing:**

- `t2i` - Text to image
- `i2i` - Single reference image-to-image
- `i2i_multi` - Multi-reference image-to-image (Seedream, Flux)
- `i2v` - Image to video (LTX I2V)
- `multi` - Multi-condition (LTX MultiCondition)

---

## Architecture Decisions: Edge Functions vs Prompt Templates vs Deeper AI

### Decision Framework

| Approach | When to Use | OurVidz Examples |
|----------|-------------|------------------|
| **Edge Functions** | Request routing, URL signing, model selection, async handling | `fal-image`, `roleplay-chat`, `fal-webhook` |
| **Prompt Templates** | Reusable prompt patterns, model-specific formatting | `prompt_templates` table, Figure notation |
| **Deeper AI** | Dynamic prompt construction, context analysis, enhancement | Vision analysis, scene extraction |

### 1. Edge Functions (Request Orchestration)

**Use For:**

- Model routing based on task/modality
- URL signing and validation
- Building `image_urls[]` arrays from slot data
- Async webhook handling
- Post-processing (saving to workspace, library)

**Multi-Ref Enhancement:**

- Accept `roles[]` array alongside `image_urls[]`
- Route to appropriate model based on ref count
- Handle MultiCondition (image + video) routing

### 2. Prompt Templates (Reusable Patterns)

**Use For:**

- Figure notation injection
- Model-specific prompt formatting
- Negative prompt defaults
- Character limit validation

**Multi-Ref Enhancement:**

- Templates for 2-ref, 3-ref, 4-ref, 5+ ref scenarios
- Role-aware templates ("Using character from Figure 1, environment from Figure 2...")
- Model-specific Figure notation (Seedream vs Flux)

### 3. Deeper AI Integration (Dynamic Intelligence)

**Use For:**

- Context-aware prompt enhancement
- Scene description extraction
- Character identity extraction from descriptions
- Dynamic reference selection
- Vision-based image analysis

**IMPORTANT:** We are NOT using local models (e.g., Qwen 2.5). All model selection is dynamic via the `api_models` table with `default_for_tasks` field.

### Layered Architecture Recommendation

```text
┌─────────────────────────────────────────────────────┐
│  Layer 1: UI State (MobileQuickBar slots)           │
│  - 4-10 fixed slots with role metadata              │
│  - Auto-overflow, drag-drop                         │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: Prompt Templates (Figure notation)        │
│  - Role-aware templates per ref count               │
│  - Model-specific formatting                        │
│  - Negative prompt injection                        │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3: Edge Function (fal-image)                 │
│  - Build image_urls[] array                         │
│  - Sign URLs, validate                              │
│  - Route to model, handle async                     │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  Layer 4: AI Enhancement (Optional)                 │
│  - Optimize reference selection                     │
│  - Enhance prompt with context                      │
│  - Extract missing information                      │
└─────────────────────────────────────────────────────┘
```

### When to Add AI vs Keep Deterministic

| Scenario | Approach | Rationale |
|----------|----------|-----------|
| **Figure notation injection** | Prompt Template | Deterministic, predictable |
| **URL signing** | Edge Function | Security, validation |
| **Reference selection for storyboard** | AI Enhancement | Context-dependent optimization |
| **Scene extraction from chat** | AI Enhancement | NLP required |
| **Model routing** | Edge Function | Rule-based, fast |
| **Optimal keyframe selection** | AI Enhancement | Quality judgment needed |

---

## Summary: Key Insights

1. **Seedream = SPATIAL Multi-Image** (up to 10 refs blended into single output frame)
2. **LTX MultiCondition = TEMPORAL Multi-Image** (~21 images at keyframes 0-160, multiples of 8)
3. **Dynamic Prompting is Critical** - No hardcoded prompts in edge functions; use `prompt_templates` table
4. **Model Selection is Dynamic** - All routing via `api_models` table with task-based queries
5. **Unified Reference Library** - Single curated library serves BOTH reference selection AND LoRA training prep
6. **Dynamic Slot Roles** - User-selectable purpose (char/pose/scene/style) per slot
7. **Vision Model Integration** - Auto-analyze refs for role suggestion and LoRA captioning
8. **Single Template Per Model** - Use variable interpolation, not template explosion
9. **Roleplay Already Uses Multi-Ref** - Figure 1/2/3 notation exists but needs template migration
10. **Temporal Anchoring for Video** - Use LTX MultiCondition to prevent character drift by re-anchoring identity at keyframes

---

## Related Documentation

- [LTX Video 13B Guide](./LTX/LTX_VIDEO_13B_FAL_AI_GUIDE.md) - Complete LTX 13B reference
- [Seedream Definitive Guide](./SEEDREAM/FAL_AI_SEEDREAM_DEFINITIVE.md) - Complete Seedream reference
- [I2I System](../03-SYSTEMS/I2I_SYSTEM.md) - Image-to-image workflow documentation
- [Prompt Templates Schema](./PROMPT_TEMPLATES_SCHEMA_REVIEW.md) - Template system reference

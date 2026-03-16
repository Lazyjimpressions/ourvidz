# Storyboard Implementation Roadmap

This document outlines the implementation plan for addressing workflow gaps in the Storyboard feature, enabling production of consistent longer-form videos.

**Last Updated:** March 2026

---

## Verified Schema (from Supabase)

### storyboard_clips

| Column | Type | Notes |
|--------|------|-------|
| `id`, `scene_id`, `clip_order` | uuid, uuid, int | Core identifiers |
| `prompt`, `enhanced_prompt` | text | User and AI-enhanced prompts |
| `reference_image_url`, `reference_image_source` | text | Reference for I2V |
| `clip_type` | text | 'quick', 'extended', 'controlled', 'keyframed' |
| `parent_clip_id` | uuid | ✅ Already exists for chaining |
| `extracted_frame_url` | text | Extracted chain frame |
| `generation_metadata`, `generation_config` | jsonb | Flexible metadata |

### storyboard_scenes

| Column | Type | Notes |
|--------|------|-------|
| `characters` | jsonb | ✅ **Already exists** - array of character IDs |
| `mood`, `setting` | text | Scene context |
| `suggested_prompts`, `ai_suggestions` | jsonb | AI assistance data |

### storyboard_projects

| Column | Type | Notes |
|--------|------|-------|
| `primary_character_id` | uuid | ✅ **Already exists** - main character |
| `secondary_characters` | jsonb | ✅ Array of additional characters |
| `story_beats`, `ai_story_plan` | jsonb | AI planning data |

### characters (for injection)

| Column | Type | Example |
|--------|------|---------|
| `appearance_tags` | text[] | `['East Asian beauty', 'long black hair', 'fair complexion']` |
| `clothing_tags` | text[] | `['jean shorts', 'sneakers', 'crop top']` |
| `gender` | text | 'male', 'female', 'unspecified' |

### character_canon (pose system)

| Column | Type | Example |
|--------|------|---------|
| `tags` | text[] | `['front', 'full-body', 'standing']` |
| `metadata.pose_key` | text | `'front_neutral'`, `'side_left'`, `'side_right'` |
| `label` | text | 'Front', 'Left Side' |

---

## Test Scenario: "Tammy's Beach Day"

This E2E test validates Phase 8 implementation using actual database character.

### Test Character

**Tammy d** (`id: d39a539c-8c01-4be5-859c-7811d7560642`)

| Field | Value |
|-------|-------|
| appearance_tags | `['East Asian beauty', 'long black hair with bangs', 'fair complexion', 'serene expression', 'delicate features', 'Large breasts.']` |
| clothing_tags | `['jean shorts', 'sneakers', 'crop top']` |
| gender | `female` |

### Test Storyline (30s, 6 clips)

**Scene 1: Arrival** (10s)
- setting: `sandy beach, sunset`
- mood: `playful, excited`
- characters: `['d39a539c-8c01-4be5-859c-7811d7560642']`

| Clip | Type | User Prompt | Expected Injected Prompt |
|------|------|-------------|--------------------------|
| 1.1 | quick | "walking towards water" | "woman, East Asian beauty, long black hair with bangs, fair complexion, serene expression, delicate features, Large breasts., wearing jean shorts, sneakers, crop top, walking towards water" |
| 1.2 | quick | "stops and looks at horizon" | "same character continuing motion, stops and looks at horizon" |

**Scene 2: Playing** (15s)
- setting: `shallow waves, golden hour`

| Clip | Reference Source | Expected |
|------|------------------|----------|
| 2.1 | Clip 1.2 extracted frame | Full appearance injection |
| 2.2 | Clip 2.1 video (extended) | Chain continuation |
| 2.3 | Clip 2.2 extracted frame | Chain continuation |

**Scene 3: Sunset** (5s)

| Clip | Reference Source |
|------|------------------|
| 3.1 | Clip 2.3 extracted frame |

### Success Metrics

| Metric | Target | Validation |
|--------|--------|------------|
| Character tags injected | 100% | Console log check |
| Clothing tags injected | 100% | Console log check |
| Frame chain integrity | 100% | All clips use previous extracted_frame_url |
| Identity consistency | 95%+ | Visual inspection |
| Generation success | 90%+ | No failed jobs |

---

## Current State

### Working Features

| Feature | Status | Notes |
|---------|--------|-------|
| Clip Types | ✅ | quick, extended, controlled, keyframed |
| Model Routing | ✅ | api_models table-driven |
| Frame Extraction | ✅ | FrameSelector with optimal ranges |
| AI Story Planning | ✅ | storyboard-ai-assist edge function |
| Motion Presets | ✅ | 10 built-in presets |
| Assembly Preview | ✅ | Client-side sequential playback |

### Known Gaps

| Gap | Impact | Severity |
|-----|--------|----------|
| Character data not injected into prompts | Identity drift | HIGH |
| Manual frame chaining | User error | HIGH |
| `long` clip type not orchestrated | Max 8s clips | HIGH |
| Story plan not linked to clips | Context lost | MEDIUM |
| Single provider (fal.ai) | No fallback | MEDIUM |

---

## Phase 8: Character-Storyboard Integration

**Priority:** HIGH - Prerequisite for consistent longer-form videos

**Goal:** Inject character appearance_tags and clothing_tags into clip prompts automatically.

### 8.1 Character Binding

**Key Finding: No database changes needed!**

Characters are already linkable via:
1. `storyboard_scenes.characters` → array of character IDs at scene level
2. `storyboard_projects.primary_character_id` → main character at project level

**The gap:** `ClipOrchestrationService` doesn't query character data when building prompts.

**Implementation:**

Add three new methods to `ClipOrchestrationService.ts`:

```typescript
// Get character IDs from scene (fallback to project)
static async getSceneCharacters(sceneId: string): Promise<string[]>

// Get character appearance data
static async getCharacterAppearance(characterId: string): Promise<{
  name: string;
  gender: string;
  appearance_tags: string[];
  clothing_tags: string[];
} | null>

// Build prompt with character injection
static buildPromptWithCharacter(
  userPrompt: string,
  character: CharacterAppearance | null,
  isChainedClip: boolean
): string
```

**Prompt Injection Pattern:**

```
// First clip (anchor):
"[gender], [appearance_tags], wearing [clothing_tags], [user_prompt]"

// Chained clips:
"same character continuing motion, [user_prompt]"
```

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/lib/services/ClipOrchestrationService.ts` | Add 3 new methods, update prepareClipGeneration |
| `src/hooks/useClipOrchestration.ts` | Pass sceneId to prepareClipGeneration |
| `src/components/storyboard/ClipDetailPanel.tsx` | Show character badge |

### 8.2 Canon Reference Flow

**Goal:** Enable selecting character canon images as clip references.

**UI Flow:**

```
User creates clip →
Opens reference picker →
Tabs: [Upload] [Library] [Character Canon] ←NEW
Character Canon tab shows:
  - Character dropdown
  - Canon pose grid (filtered by pose_key)
  - Quick filters: front, side, 3/4, bust
```

**Implementation:**

- New component: `CanonReferencePicker.tsx`
- Fetch from `character_canon` table filtered by `character_id`
- Support pose_key filtering via `metadata.pose_key`
- Return selected canon's `output_url` as reference

**Smart Pose Matching:**

Based on scene metadata, suggest appropriate poses:

| Scene Type | Suggested Poses |
|------------|-----------------|
| dialogue | front_neutral, bust |
| action | three_quarter, side_left |
| establishing | front_neutral |
| emotional | bust, close-up |
| departure | rear, side_left |

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/components/storyboard/CanonReferencePicker.tsx` | **NEW** - Canon image selector |
| `src/components/storyboard/ClipDetailPanel.tsx` | Add canon picker tab |
| `src/hooks/useCharacterCanon.ts` | Hook for canon image queries |

### 8.3 Sequence Awareness

**Goal:** Group related clips and pass context to AI.

**Sequence Concept:**

- `sequence_id` groups clips that form a continuous shot
- All clips in a sequence share the same character(s)
- AI enhancement receives context from previous clips in sequence

**Implementation:**

1. When user creates a chained clip (from extracted frame), auto-assign same `sequence_id`
2. `useStoryboardAI.enhancePrompt()` includes:
   - Previous 2 clips' prompts
   - Sequence character's appearance
   - Scene mood/setting

**Prompt Context Template:**

```
[Previous Context]
Clip 1: {clip1.prompt}
Clip 2: {clip2.prompt}

[Character]
{character.appearance_tags}
{character.clothing_tags}

[Scene]
{scene.mood}, {scene.setting}

[Current Request]
{user_prompt}
```

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/hooks/useStoryboardAI.ts` | Add sequence context to enhancement |
| `supabase/functions/storyboard-ai-assist/index.ts` | Update system prompt with context |

---

## Phase 9: Automated Chain Management

**Priority:** MEDIUM - Reduces user friction, prevents errors

**Goal:** Automate frame extraction and validate chain continuity.

### 9.1 Auto Frame Extraction

**Trigger:** Clip generation completes successfully

**Flow:**

```
Clip completes →
Extract frame at optimal % →
Store in extracted_frame_url →
Toast: "Chain frame ready"
```

**Optimal Percentage Logic:**

```typescript
function getOptimalPercentage(durationSeconds: number): number {
  if (durationSeconds <= 4) return 48;
  if (durationSeconds <= 6) return 52;
  if (durationSeconds <= 8) return 55;
  return 58;
}
```

**Implementation:**

- Add auto-extract flag to `useClipOrchestration` mutation
- On job completion, trigger `FrameExtractionService.extractFrameFromVideo()`
- Upload to `workspace-temp` with 24h expiry
- Update clip record with `extracted_frame_url`

### 9.2 Chain Validation

**Visual Indicators:**

| State | Icon | Color | Meaning |
|-------|------|-------|---------|
| Chained | Link | Green | Reference is previous clip's extracted frame |
| Unchained | Broken link | Yellow | Reference is NOT from previous clip |
| No reference | Dash | Gray | First clip or manual reference |

**Warning Modal:**

Before generating an unchained clip (after first clip in scene):

```
⚠️ This clip is not chained to the previous clip.
   Character consistency may be affected.

   [Chain to Previous] [Generate Anyway]
```

**Implementation:**

- `ChainIndicator.tsx` already exists - enhance with validation state
- Add `validateChain()` to `ClipOrchestrationService`
- Show warning dialog in `ClipDetailPanel` before generation

### 9.3 Batch Chain Fill

**Goal:** One-click to set up chain references for entire scene.

**UI:**

Scene toolbar button: "Auto-Chain All Clips"

**Logic:**

```typescript
async function autoChainScene(sceneId: string) {
  const clips = await getClipsForScene(sceneId);
  for (let i = 1; i < clips.length; i++) {
    const prevClip = clips[i - 1];
    if (prevClip.extracted_frame_url && !clips[i].reference_image_url) {
      await updateClip(clips[i].id, {
        reference_image_url: prevClip.extracted_frame_url,
        reference_image_source: 'extracted_frame'
      });
    }
  }
}
```

---

## Phase 10: Long-Form Orchestration

**Priority:** MEDIUM - Enables longer videos

**Goal:** Implement multi-step generation for clips >8s.

### 10.1 Multi-Step Generation

**Current State:**

- `long` clip type maps to `['i2v', 'extend']`
- But actual implementation is single fal-image call
- Max reliable clip is ~8s

**Target Architecture:**

```
User requests 15s clip →
ClipOrchestrationService.generateLongClip():
  1. Generate I2V (5s) with reference image
  2. Extract frame at 90%
  3. Generate extend (5s) using extracted frame
  4. Extract frame at 90%
  5. Generate extend (5s)
  6. Concatenate all segments
  7. Store final video
```

**Implementation:**

- Add `OrchestrationState` tracking: `{ step: number, segments: [], finalUrl: null }`
- Sequential job submission with intermediate storage
- Client-side concatenation using MediaRecorder or server-side FFmpeg

### 10.2 Provider Fallback

**Goal:** Graceful degradation if fal.ai unavailable.

**Health Check Integration:**

```typescript
// Before generation
const healthyProviders = await checkVideoProviderHealth();

if (!healthyProviders.includes('fal')) {
  if (healthyProviders.includes('replicate')) {
    // Route to replicate-image with video model
  } else {
    throw new Error('No video providers available');
  }
}
```

**Fallback Chain:**

1. fal.ai (primary)
2. Replicate (if video model configured)
3. Local WAN worker (if healthy)

### 10.3 Webhook-Based Job Tracking

**Current:** Polling every 5s via `jobs` table

**Target:** fal-webhook integration for push-based updates

**Implementation:**

- `fal-webhook` edge function already exists
- Update `useClipOrchestration` to use Supabase Realtime subscription
- Subscribe to `jobs` table changes for specific job IDs
- Remove polling interval

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Character consistency | 95%+ across 10 clips | Visual inspection + user feedback |
| Chain continuity | Zero accidental breaks | Validation warnings shown |
| User workflow | Full scene in <5 clicks | UX testing |
| Long clip reliability | 15s+ without failure | Generation success rate |
| Fallback activation | <1s provider switch | Health check + routing time |

---

## Implementation Order

```
Phase 8.1 (Character Binding)
    ↓
Phase 8.2 (Canon Reference)
    ↓
Phase 8.3 (Sequence Awareness)
    ↓
Phase 9.1 (Auto Extract) ←── Can start parallel
    ↓
Phase 9.2 (Chain Validation)
    ↓
Phase 9.3 (Batch Chain)
    ↓
Phase 10.1 (Multi-Step)
    ↓
Phase 10.2 (Fallback)
    ↓
Phase 10.3 (Webhooks)
```

**Dependencies:**

- 8.1 → 8.2 → 8.3 (character binding required first)
- 9.1 → 9.2 → 9.3 (auto-extract enables validation)
- 10.1 → 10.2 (multi-step requires fallback for reliability)
- 10.3 can be done anytime (independent)

---

## Related Documentation

- [02-STORYBOARD_PURPOSE.md](./02-STORYBOARD_PURPOSE.md) - Feature overview and current state
- [Character Studio](../CHARACTER_STUDIO/) - Canon pose system details
- [Model Routing](../../CLAUDE.md) - api_models configuration

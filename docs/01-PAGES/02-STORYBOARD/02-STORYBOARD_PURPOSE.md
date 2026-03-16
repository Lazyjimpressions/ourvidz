# Storyboard Page Purpose

The Storyboard page is the culmination of lessons learned from workspace (image generation) and roleplay (character-consistent AI chat with scene generation) - enabling users to create longer-form video content through AI-assisted story planning and frame chaining.

## User Requirements

1. **Full Director Mode** - Complex multi-scene projects with character management, advanced editing, AI-assisted story planning
2. **AI-Assisted** - AI suggests next scenes, generates story beats, helps with prompts based on character/context
3. **Unified System** - Deep integration where roleplay scenes can become storyboard clips
4. **Both Outputs** - Individual clips for iteration + stitched video export when ready

---

## Critical Technical Constraint: Frame Chaining

WAN 2.1 (primary video model via fal.ai) does NOT support first+last frame interpolation. The storyboard implements frame chaining:

```
Clip 1 → Extract Frame (45-60%) → Clip 2 → Extract Frame → Clip 3...
```

### Frame Extraction Rules

| Clip Duration | Extraction Window |
|---------------|-------------------|
| 3-4 seconds   | 40-55%            |
| 5-6 seconds   | 45-60%            |
| 8-10 seconds  | 50-65%            |

### Prompting Strategy

- **Initial Clip**: Full character description + pose + environment + lighting + mood
- **Follow-Up Clips**: Motion intent only ("continuing motion, slight pose change") - NOT identity re-description

This creates implicit temporal continuity while avoiding identity drift.

---

## Data Model

### Database Tables

#### storyboard_projects

- Core project settings (title, description, status)
- Target duration, aspect ratio, quality preset
- AI assistance level configuration
- Character references (primary + secondary)
- Source conversation link (roleplay integration)

#### storyboard_scenes

- Scene order within project
- Title, description, setting, mood
- Character assignments
- Target and actual duration
- Scene status tracking

#### storyboard_clips

- Clip order within scene
- Generation prompt
- Reference image for frame chaining
- Video output and thumbnail
- Extracted frame for next clip
- Generation status and metadata

#### storyboard_frames

- Extracted frames from clips
- Timestamp and quality score
- Chain frame indicator
- Used-in-clip reference

#### storyboard_renders

- Final video render configuration
- Quality, transitions, output URL
- Render status and progress

---

## UI/UX Architecture

### Design Principles

Following industry best practices for professional video editing interfaces:

1. **Information Density**: Compact controls, standard sizing (14px body, 12px labels, 32px icon buttons)
2. **Modal Sizing**: Constrained modals (480px settings, 640px editors), slide-out panels preferred
3. **Visual Hierarchy**: Muted backgrounds (gray-900/950), subtle borders, accent color sparingly
4. **Spacing**: Tight but breathable (8px base unit, 12-16px internal padding)
5. **Professional Reference**: Inspired by DaVinci Resolve, Premiere Pro, Final Cut

### Desktop Layout - Director's Dashboard

```
+------------------------------------------------------------------+
| [<] Projects  |  Project Title              [AI] [▶ Preview] [⬇]  |
+------------------------------------------------------------------+
| TIMELINE                                              00:24 / 00:30|
| [S1][S2][S3][S4][S5][S6][+]                                      |
| ├──┼──┼──┼──┼──┼──┤ ← Playhead                                   |
+------------------------------------------------------------------+
|  SCENE PANEL (240px)     |  CLIP WORKSPACE                       |
|  ┌─────────────────┐     |  ┌──────────────────────────────────┐ |
|  │ Scene 3         │     |  │ [Clip 1] [Clip 2] [Clip 3] [+]   │ |
|  │ Beach, sunset   │     |  │                                  │ |
|  │ romantic        │     |  │ ┌────────────────────────────┐   │ |
|  │ 2 characters    │     |  │ │                            │   │ |
|  └─────────────────┘     |  │ │    Selected Clip Preview   │   │ |
|                          |  │ │                            │   │ |
|  AI SUGGESTIONS          |  │ └────────────────────────────┘   │ |
|  • Add tension           |  │                                  │ |
|  • Close-up shot         |  │ Frame: [====●=====] 52%          │ |
|  • [Generate prompt]     |  │                                  │ |
|                          |  │ Prompt: [compact input field]    │ |
|                          |  │ Model: [WAN 2.1 ▾] [Generate]    │ |
|                          |  └──────────────────────────────────┘ |
+------------------------------------------------------------------+
```

### Key Views

1. **Project List** - Grid of project cards with thumbnails, compact metadata
2. **Project Editor** - Three-panel layout (scene list, timeline, clip workspace)
3. **Scene Panel** - Slide-out or docked panel for scene properties
4. **Clip Workspace** - Generate/manage clips, frame extraction timeline
5. **AI Panel** - Collapsible suggestions, inline prompt generation

---

## Component Architecture

### Page Components

- `Storyboard.tsx` - Project list page with AI story plan integration
- `StoryboardEditor.tsx` - V2 project editor with scene strip, clip canvas, detail panel

### Storyboard Components (`src/components/storyboard/`)

**Core Components:**

- `ProjectCard.tsx` - Compact project card for grid display
- `NewProjectDialog.tsx` - Project creation dialog

**V2 Clip Components:**

- `SceneStrip.tsx` - Horizontal scene navigation
- `ClipCanvas.tsx` - Drag-and-drop clip strip
- `ClipTile.tsx` - Individual clip with status badges
- `ClipDetailPanel.tsx` - Bottom panel with type, prompt, frame selector
- `ClipTypeSelector.tsx` - Clip type dropdown with AI recommendations
- `ClipLibrary.tsx` - Right sidebar with character canons
- `MotionLibrary.tsx` - Motion preset browser with video previews

**Generation Components:**

- `ClipCard.tsx` - Video clip display with status indicators
- `ClipWorkspace.tsx` - Main clip generation area with prompt input
- `FrameSelector.tsx` - Visual frame extraction slider
- `ChainIndicator.tsx` - Frame chain relationship visualization

**Preview Components:**

- `AssemblyPreview.tsx` - Sequential video playback with scene markers

### Hooks

- `useStoryboard.ts` - State management for projects, scenes, clips
- `useClipOrchestration.ts` - V2 generation orchestration (replaces useClipGeneration)
- `useStoryboardAI.ts` - AI assistance integration (story planning, prompt suggestions)
- `useClipGeneration.ts` - Legacy video clip generation (deprecated)

### Services

- `StoryboardService.ts` - CRUD operations for all storyboard entities
- `ClipOrchestrationService.ts` - Dynamic model selection, prompt templates, generation config
- `FrameExtractionService.ts` - Client-side video frame extraction

### Utilities

- `storyboardPrompts.ts` - Prompt generation for anchor and chained clips

---

## Clip Type System

Storyboard uses 5 clip types that map to different video generation tasks:

| Type | Primary Task | Model Requirement | Use Case |
|------|--------------|-------------------|----------|
| `quick` | i2v | Image-to-video | Single reference → 5s video |
| `extended` | extend | Video extension | Continue previous clip |
| `controlled` | multi | MultiCondition | Temporal keyframe control |
| `long` | i2v + extend | Orchestrated | Auto-split for >8s videos |
| `keyframed` | i2i_multi, multi | Multi-reference | Start/end pose interpolation |

Clip types are defined in `src/types/storyboard.ts` (`CLIP_TYPE_TASKS` constant).

---

## Model Routing Strategy

### Table-Driven Configuration

Video models are configured via the `api_models` table with multi-task support:

```sql
-- Example: Get default I2V model
SELECT m.*, p.name as provider_name
FROM api_models m
JOIN api_providers p ON m.provider_id = p.id
WHERE m.modality = 'video'
  AND m.is_active = true
  AND 'i2v' = ANY(m.default_for_tasks)
ORDER BY m.priority DESC
LIMIT 1;
```

### Task Types

| Task | Description | Example Models |
|------|-------------|----------------|
| `t2v` | Text-to-video | LTX T2V |
| `i2v` | Image-to-video | WAN 2.1 I2V, LTX I2V |
| `extend` | Video extension | LTX Extend |
| `multi` | MultiCondition (keyframes) | LTX MultiCondition |
| `i2i_multi` | Multi-reference edit | Seedream v4.5 Edit |

### Routing Flow

1. `ClipOrchestrationService.getModelForClipType()` maps clip type → primary task
2. Query `api_models` with `default_for_tasks` containing the task
3. Fallback: any active model supporting the task
4. Route to `fal-image` edge function with resolved model ID

### Async Video Processing

Models with `endpoint_path = 'fal-webhook'` use async submission:

- Submit to `queue.fal.run` with webhook URL
- `fal-webhook` edge function receives callback
- Job status tracked via `jobs` table polling

### Provider Configuration

| Provider | Edge Function | Capabilities |
|----------|---------------|--------------|
| fal.ai | `fal-image` | Video (I2V, extend, multi), Images |
| Replicate | `replicate-image` | Images only |
| Local | `chat_worker` | Chat (not video) |

**Note:** Video generation currently routes exclusively through fal.ai. No provider fallback is implemented yet.

---

## AI Assistance Integration

### Story Planning Flow

1. User provides: project description, target duration, characters
2. AI generates: story arc, scene breakdown, mood/atmosphere per scene
3. User reviews and adjusts: reorder, edit, add/remove scenes
4. AI suggests prompts for each clip based on scene context

### Prompt Generation Strategy

**Initial Clip (Anchor):**

```
[full character description],
[pose],
[environment],
[lighting],
[emotional tone],
slow natural movement, cinematic motion
```

**Chained Clips:**

```
same character and setting,
continuing the motion,
[specific motion intent],
[subtle change]
```

---

## Roleplay Integration

### Import from Roleplay

- Extract scene-worthy moments from conversation
- Import character data (appearance_tags, persona, reference images)
- Use conversation context for story beats
- Apply character's consistency_method for generation

### Data Flow

```
Roleplay Chat → "Create Storyboard" →
Extract Scenes from Conversation →
Import Character References →
Generate Clips for Each Scene → Export
```

---

## Character Studio Integration

Character Studio provides the foundation for character-consistent video generation.

### Canon Pose System

Characters have fixed pose slots stored in `character_canon` table:

| Pose Key | Tags | Use Case |
|----------|------|----------|
| `front_neutral` | front, standing | Dialogue, establishing |
| `side_left` | side | Profile shots |
| `side_right` | side | Profile shots |
| `rear` | rear, standing | Walking away |
| `three_quarter` | 3/4 | Dynamic angles |
| `bust` | close-up, bust | Emotional moments |

### Role Tagging

Canon images use role tags for semantic filtering:

- `role:position` - Body pose/composition
- `role:clothing` - Outfit/wardrobe reference
- `role:character` - Character identity reference
- `role:scene` - Background/environment

### Reference Flow for Clips

```
Character Canon (pose slot) → First Clip Reference
     ↓
Generate Clip (I2V)
     ↓
Extract Chain Frame (45-60%)
     ↓
Next Clip Reference → Generate → Extract → ...
```

### Integration Points

1. **First Clip**: Select character canon image as reference
2. **Pose Matching**: Map scene intent to pose tag (action → `standing`, dialogue → `front`)
3. **Clothing Persistence**: Apply `role:clothing` tags to maintain outfit consistency
4. **Prompt Injection**: Character's `appearance_tags` auto-injected into generation prompts

### Current Limitations

- Clips don't have `character_id` binding (reference images are independent)
- No automatic appearance tag injection into clip prompts
- Pose selection is manual per-clip
- No character consistency validation across clips

---

## Known Workflow Gaps

These gaps prevent production of consistent longer-form videos:

### A. Character Consistency

| Gap | Impact | Priority |
|-----|--------|----------|
| No `character_id` on clips | Identity drift over 5+ clips | HIGH |
| Manual reference selection | User error, inconsistency | HIGH |
| No appearance tag injection | Prompts lack character details | MEDIUM |

### B. Frame Chaining

| Gap | Impact | Priority |
|-----|--------|----------|
| No chain validation | Accidental discontinuity | HIGH |
| Manual frame extraction | Workflow friction | MEDIUM |
| No batch operations | Slow for multi-clip scenes | LOW |

### C. Sequence Planning

| Gap | Impact | Priority |
|-----|--------|----------|
| Story plan not linked to clips | Context lost during generation | MEDIUM |
| No previous clip context in AI | Isolated prompt enhancement | MEDIUM |
| No scene-to-clip mapping | Manual scene breakdown | LOW |

### D. Long-Form Generation

| Gap | Impact | Priority |
|-----|--------|----------|
| `long` clip type not orchestrated | Max ~8s per clip | HIGH |
| No multi-step generation | Can't auto-extend | HIGH |
| Single provider (fal.ai) | No fallback | MEDIUM |

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE

- [x] Database migrations for 5 new tables
- [x] Full RLS policies for user data isolation
- [x] TypeScript types in `src/types/storyboard.ts`
- [x] Supabase types updated in `src/integrations/supabase/types.ts`
- [x] `StoryboardService.ts` with full CRUD for all entities
- [x] `useStoryboard.ts` hook with React Query state management
- [x] Project list page (`Storyboard.tsx`) with grid/list view, search, filters
- [x] Project editor page (`StoryboardEditor.tsx`) with three-panel layout
- [x] Scene management (add/edit/delete) in editor
- [x] `ProjectCard.tsx` and `NewProjectDialog.tsx` components
- [x] Routes added to App.tsx (`/storyboard` and `/storyboard/:projectId`)

### Phase 2: Clip Generation + Frame Chaining ✅ COMPLETE

- [x] `FrameExtractionService.ts` - Client-side canvas-based frame extraction
- [x] `storyboardPrompts.ts` - Anchor/chain prompt generation utilities
- [x] `ClipCard.tsx` - Video clip display with play/pause, status indicators
- [x] `FrameSelector.tsx` - Visual slider with optimal range indicator
- [x] `ChainIndicator.tsx` - Visual chain relationship between clips
- [x] `ClipWorkspace.tsx` - Full generation UI with prompt input, model selector
- [x] `useClipGeneration.ts` - Hook integrating with fal-image edge function
- [x] Integration with WAN 2.1 I2V via `fal-image` edge function
- [x] Model selector using `api_models` table (filter by modality='video')
- [x] Auto-extract frame at optimal percentage when clip completes
- [x] Chain indicator showing frame relationships in UI
- [x] Reference image selector for first clip (upload, character portrait)

### Phase 3: AI Assistance ✅ COMPLETE

- [x] Create `storyboard-ai-assist` edge function (uses existing OpenRouter/Qwen)
- [x] Implement StoryAIService and useStoryboardAI hook
- [x] AI story planning on project creation (when ai_assistance_level='full')
- [x] Story beat generation from project description
- [x] Prompt suggestions based on scene context
- [x] AI clip type recommendations
- [x] Prompt enhancement integration

### Phase 4: Generation Flows ✅ COMPLETE (with caveats)

- [x] ClipOrchestrationService with dynamic model selection
- [x] Clip type system (quick, extended, controlled, keyframed)
- [x] Prompt template integration from prompt_templates table
- [x] Motion presets library (10 built-in presets)
- [x] AssemblyPreview component (client-side playback of clips in sequence)
- [x] FrameSelector integration in ClipDetailPanel
- [x] Job polling via jobs table for async completion

**Caveats:**

- `long` clip type defined but multi-step orchestration NOT implemented
- No provider fallback if fal.ai unavailable
- Polling-only job tracking (webhook exists but not integrated)

### Phase 5: Roleplay Integration 🔲 PENDING

- [ ] "Create Storyboard" action in roleplay page
- [ ] Conversation-to-storyboard import
- [ ] Extract scenes from roleplay conversation
- [ ] Import character references

### Phase 6: Mobile Optimization 🔲 PENDING

- [ ] Mobile-optimized views with tab navigation
- [ ] Touch-friendly timeline interaction
- [ ] Responsive panel layouts

### Phase 7 (Future): Dedicated Stitch Worker 🔲 FUTURE

- [ ] Design stitch worker for RunPod infrastructure
- [ ] Handle longer videos (beyond edge function timeout)
- [ ] Advanced transitions and effects
- [ ] Parallel render processing

### Phase 8: Character-Storyboard Integration 🔲 NEXT

Priority phase addressing character consistency gaps.

**8.1 Character Binding**

- [ ] Add `character_ids` jsonb array to storyboard_clips table
- [ ] Character selector in ClipDetailPanel
- [ ] Auto-inject appearance_tags into generation prompts

**8.2 Canon Reference Flow**

- [ ] Canon image picker for first clip reference
- [ ] Smart pose matching (scene type → pose tag)
- [ ] Preserve clothing tags across clips

**8.3 Sequence Awareness**

- [ ] Add `sequence_id` to group related clips
- [ ] Pass previous 2 clips' context to AI enhancement
- [ ] Store story_beat_id linking clips to AI plan

### Phase 9: Automated Chain Management 🔲 FUTURE

**9.1 Auto Frame Extraction**

- [ ] Extract chain frame on clip completion
- [ ] Store at optimal percentage per duration
- [ ] Auto-populate next clip's reference

**9.2 Chain Validation**

- [ ] Visual indicator for broken chains
- [ ] Warning before generating unchained clip
- [ ] Batch chain fill for sequences

### Phase 10: Long-Form Orchestration 🔲 FUTURE

**10.1 Multi-Step Generation**

- [ ] Implement actual `long` clip orchestration
- [ ] I2V (5s) → extend (target - 5s) sequencing
- [ ] Intelligent split points

**10.2 Provider Fallback**

- [ ] Health check integration for video models
- [ ] Fallback routing if fal.ai down
- [ ] Webhook-based job tracking

---

## Error Recovery Strategy

### Retry + Continue Pattern

- Failed clips can be retried individually without affecting the project
- Project continues with successful clips
- UI clearly indicates failed clips with retry button
- No automatic model fallback (user controls model selection)
- Failed clips don't block scene/project progress

---

## Key Files

### Pages

- [Storyboard.tsx](../../src/pages/Storyboard.tsx) - Project list
- [StoryboardEditor.tsx](../../src/pages/StoryboardEditor.tsx) - Project editor

### Components

- [ProjectCard.tsx](../../src/components/storyboard/ProjectCard.tsx)
- [NewProjectDialog.tsx](../../src/components/storyboard/NewProjectDialog.tsx)
- [ClipCard.tsx](../../src/components/storyboard/ClipCard.tsx)
- [ClipWorkspace.tsx](../../src/components/storyboard/ClipWorkspace.tsx)
- [FrameSelector.tsx](../../src/components/storyboard/FrameSelector.tsx)
- [ChainIndicator.tsx](../../src/components/storyboard/ChainIndicator.tsx)

### Hooks

- [useStoryboard.ts](../../src/hooks/useStoryboard.ts) - Project/scene/clip state management
- [useClipOrchestration.ts](../../src/hooks/useClipOrchestration.ts) - V2 clip generation with model resolution
- [useStoryboardAI.ts](../../src/hooks/useStoryboardAI.ts) - AI story planning, prompt suggestions
- [useClipGeneration.ts](../../src/hooks/useClipGeneration.ts) - Legacy (deprecated)

### Services

- [StoryboardService.ts](../../src/lib/services/StoryboardService.ts) - CRUD operations
- [ClipOrchestrationService.ts](../../src/lib/services/ClipOrchestrationService.ts) - Model selection, generation config
- [FrameExtractionService.ts](../../src/lib/services/FrameExtractionService.ts) - Client-side frame extraction

### Utilities

- [storyboardPrompts.ts](../../src/lib/utils/storyboardPrompts.ts)

### Types

- [storyboard.ts](../../src/types/storyboard.ts)

---

## Success Criteria

1. **MVP Goal**: Users can create 30-second videos with character continuity
2. **Frame Chaining**: 90%+ character consistency across chained clips
3. **AI Assistance**: Story beats generate relevant, actionable scene suggestions
4. **Roleplay Integration**: Seamless import from roleplay conversations
5. **Mobile UX**: Full functionality on mobile devices
6. **Performance**: Clip generation < 3 minutes, final render < 10 minutes for 30s video

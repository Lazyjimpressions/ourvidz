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

## Model Routing Strategy

### Video Generation Models

| Model | Provider | Use Case | NSFW Support |
|-------|----------|----------|--------------|
| WAN 2.1 I2V | fal.ai | Primary - erotic scenes | Yes |
| Kling O1 | fal.ai | Secondary - cinematic | Limited |
| Local WAN | RunPod | When healthy | Yes |

### Routing Logic

1. Check local WAN worker health via `system_config.workerHealthCache`
2. If healthy and user prefers local: use local
3. If unhealthy or user prefers API: use fal.ai WAN 2.1 I2V
4. For cinematic/SFW content: optionally use Kling O1
5. Always provide fallback chain

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

### Phase 4: Generation Flows ✅ COMPLETE

- [x] ClipOrchestrationService with dynamic model selection
- [x] Clip type system (quick, extended, controlled, keyframed)
- [x] Prompt template integration from prompt_templates table
- [x] Motion presets library (10 built-in presets)
- [x] AssemblyPreview component (client-side playback of clips in sequence)
- [x] FrameSelector integration in ClipDetailPanel
- [x] Job polling via jobs table for async completion

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

- [useStoryboard.ts](../../src/hooks/useStoryboard.ts)
- [useClipGeneration.ts](../../src/hooks/useClipGeneration.ts)

### Services

- [StoryboardService.ts](../../src/lib/services/StoryboardService.ts)
- [FrameExtractionService.ts](../../src/lib/services/FrameExtractionService.ts)

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

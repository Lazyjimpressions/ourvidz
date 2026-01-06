# Storyboard Page - Development Plan

**Last Updated:** January 5, 2026
**Status:** Phase 2 Complete - Ready for Phase 3

---

## Current Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | ✅ COMPLETE | DB tables, types, services, basic UI |
| Phase 2: Clip Generation | ✅ COMPLETE | Components, reference image selector, frame chaining |
| Phase 3: AI Assistance | ⚠️ NEXT | Story beats, scene suggestions, prompt generation |
| Phase 4: Preview + Export | 🔲 PENDING | |
| Phase 5: Roleplay Integration | 🔲 PENDING | |
| Phase 6: Mobile Optimization | 🔲 PENDING | |
| Phase 7: Dedicated Stitch Worker | 🔲 FUTURE | |

---

## Overview

The Storyboard page enables users to create longer-form video content through AI-assisted story planning and frame chaining. It combines lessons from workspace (image generation) and roleplay (character-consistent AI chat with scene generation).

### User Requirements

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

## Database Schema

All tables exist in Supabase with RLS policies:

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `storyboard_projects` | Main project record | title, status, aspect_ratio, primary_character_id |
| `storyboard_scenes` | Scenes within project | scene_order, title, mood, setting |
| `storyboard_clips` | Video clips within scene | prompt, video_url, extracted_frame_url |
| `storyboard_frames` | Extracted frames | timestamp_ms, frame_url, is_chain_frame |
| `storyboard_renders` | Final video renders | output_url, status, progress_percentage |

### Video Model Configuration

```sql
-- Exists in api_models table
model_key: 'fal-ai/wan-i2v'
modality: 'video'
is_active: true
```

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE

**Completed Items:**
- [x] Database migrations for 5 tables
- [x] Full RLS policies for user data isolation
- [x] TypeScript types in `src/types/storyboard.ts`
- [x] Supabase types updated
- [x] `StoryboardService.ts` with full CRUD
- [x] `useStoryboard.ts` hook with React Query
- [x] Project list page (`Storyboard.tsx`)
- [x] Project editor page (`StoryboardEditor.tsx`)
- [x] Scene management in editor
- [x] `ProjectCard.tsx` and `NewProjectDialog.tsx`
- [x] Routes in App.tsx

**Key Files:**
- `src/pages/Storyboard.tsx`
- `src/pages/StoryboardEditor.tsx`
- `src/hooks/useStoryboard.ts`
- `src/lib/services/StoryboardService.ts`
- `src/types/storyboard.ts`

---

### Phase 2: Clip Generation + Frame Chaining ✅ COMPLETE

**Completed Items:**
- [x] `FrameExtractionService.ts` - Client-side canvas extraction
- [x] `storyboardPrompts.ts` - Anchor/chain prompt generation
- [x] `ClipCard.tsx` - Video clip display
- [x] `FrameSelector.tsx` - Visual frame selection
- [x] `ChainIndicator.tsx` - Chain relationship visualization
- [x] `ClipWorkspace.tsx` - Main generation workspace
- [x] `useClipGeneration.ts` - Generation hook
- [x] Reference image selector for first clip

**Key Files:**
- `src/lib/services/FrameExtractionService.ts`
- `src/hooks/useClipGeneration.ts`
- `src/components/storyboard/ClipWorkspace.tsx`
- `src/components/storyboard/ClipCard.tsx`
- `src/components/storyboard/FrameSelector.tsx`
- `src/components/storyboard/ChainIndicator.tsx`
- `src/lib/utils/storyboardPrompts.ts`

**Integration Points:**
- `fal-image` edge function supports WAN 2.1 I2V
- `api_models` table has video model configured
- Supabase storage for extracted frames

---

### Phase 3: AI Assistance 🔲 PENDING

**Planned Items:**
- [ ] `storyboard-ai-assist` edge function
- [ ] `StoryAIService.ts` for story beats and suggestions
- [ ] `AIAssistantPanel.tsx` collapsible panel
- [ ] Story beat generation from project description
- [ ] Prompt suggestions based on scene context

**Edge Function Endpoints:**
```typescript
POST /story-beats     - Generate story beats from description
POST /scene-suggest   - Suggest next scene based on context
POST /prompt-generate - Generate clip prompt for scene
```

---

### Phase 4: Preview + Export 🔲 PENDING

**Planned Items:**
- [ ] `AssemblyPreview.tsx` - Client-side sequential playback
- [ ] Export popover with render settings
- [ ] `stitch-clips` edge function using FFmpeg
- [ ] Handle shorter assemblies within edge function timeout
- [ ] Individual clip download fallback

---

### Phase 5: Roleplay Integration 🔲 PENDING

**Planned Items:**
- [ ] "Create Storyboard" action in roleplay page
- [ ] Conversation-to-storyboard import
- [ ] Extract scenes from roleplay conversation
- [ ] Import character references

---

### Phase 6: Mobile Optimization 🔲 PENDING

**Planned Items:**
- [ ] Mobile-optimized views with tab navigation
- [ ] Touch-friendly timeline interaction
- [ ] Responsive panel layouts

---

### Phase 7: Dedicated Stitch Worker 🔲 FUTURE

**NOTE**: For future scale beyond edge function timeout.

**Planned Items:**
- [ ] Design stitch worker for RunPod infrastructure
- [ ] Handle longer videos
- [ ] Advanced transitions and effects
- [ ] Parallel render processing

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

## Error Recovery Strategy

- Failed clips can be retried individually
- Project continues with successful clips
- UI shows retry button on failed clips
- No automatic model fallback (user controls)
- Failed clips don't block scene/project progress

---

## Success Criteria

1. **MVP Goal**: Users can create 30-second videos with character continuity
2. **Frame Chaining**: 90%+ character consistency across chained clips
3. **AI Assistance**: Story beats generate relevant, actionable scene suggestions
4. **Roleplay Integration**: Seamless import from roleplay conversations
5. **Mobile UX**: Full functionality on mobile devices
6. **Performance**: Clip generation < 3 minutes, final render < 10 minutes for 30s video

---

## Related Documentation

- [02-STORYBOARD_PURPOSE.md](../01-PAGES/02-STORYBOARD_PURPOSE.md) - Page purpose and overview
- [STORYBOARD_SYSTEM.md](../03-SYSTEMS/STORYBOARD_SYSTEM.md) - Technical system architecture
- [STORYBOARD_USER_GUIDE.md](../09-REFERENCE/STORYBOARD_USER_GUIDE.md) - User how-to guide
- [FRAMECHAINING_GUIDE.md](../09-REFERENCE/FRAMECHAINING_GUIDE.md) - Frame chaining details
- [WAN2.1_i2v_FAL_AI_GUIDE.md](../09-REFERENCE/WAN2.1_i2v_FAL_AI_GUIDE.md) - WAN model guide



# Bulletproof Long-Form Video: AI-Driven Storyboard

## The Core Problem

Right now the storyboard is a manual, clip-by-clip process. The user writes every prompt, picks every reference, extracts every frame. There's no narrative intelligence, no quality gating, and no way to preview or assemble the final video. For long-form content, this breaks down fast.

## Design Philosophy

Keep the existing minimalist UI. Don't add panels or complex timelines. Instead, make AI do the heavy lifting behind the scenes so the user's workflow becomes: **describe your story -> review AI's plan -> generate -> approve -> assemble**.

---

## Step 1: AI Story Planner (the "AI Assist" button that currently does nothing)

Wire the existing "AI Assist" button in the project header to open a compact sheet/drawer that lets the user describe their video in plain language.

**User flow:**
1. User clicks "AI Assist" in the header
2. A side sheet opens with a single textarea: "Describe your video..."
3. User types something like: "Maya at a pool party, starts relaxed by the pool, moves to the hot tub, playful mood builds to intimate"
4. User clicks "Generate Plan"
5. AI returns a structured breakdown: scenes with titles, settings, moods, descriptions, and suggested clip prompts
6. User reviews the plan -- each scene shows as a card they can accept, edit, or remove
7. "Apply Plan" creates all the scenes in one action, pre-populated with settings, moods, and suggested prompts

**Technical approach:**
- Call `playground-chat` edge function (already exists) with a system prompt tuned for scene breakdown
- Parse the structured response into `CreateSceneInput[]`
- Batch-create scenes via `StoryboardService.createScene()`
- Store the raw narrative in `story_summary` and parsed beats in `story_beats` (both columns already exist, unused)

**UI:** A Sheet component, matching existing patterns. One textarea, one button, results as a scrollable list of scene cards with inline edit capability.

---

## Step 2: Smart Prompt Generation (upgrade the existing AI Suggest)

The current `generateClipPrompt()` is a static string concatenation. Replace it with AI-powered prompt generation that understands the narrative arc.

**User flow:**
1. User selects a scene and clicks "AI Suggest" in the prompt bar (already exists)
2. Instead of concatenating strings, it calls the AI with full context: the scene's setting/mood/description, the character's appearance, what happened in previous clips, and where the story is going next
3. The AI returns a cinematic prompt optimized for the I2V model
4. Prompt appears in the textarea, user can edit before generating

**Technical approach:**
- Enhance `handleGeneratePrompt()` in ClipWorkspace to call an edge function instead of the local `generateClipPrompt()`
- Pass: scene context, character data, previous clip prompts, next scene preview (for narrative continuity)
- Use the existing `fal-image` prompt enhancement path or `playground-chat` with a video-prompt-specific system prompt
- Keep the local `storyboardPrompts.ts` as instant fallback if AI call fails

**UI change:** Minimal -- add a small loading spinner on the existing "AI Suggest" button while the call is in flight. No new UI elements.

---

## Step 3: Clip Quality Gate (approve before chaining)

**User flow:**
1. Clip generates and completes
2. ClipCard shows two small buttons: a checkmark (approve) and an X (reject/regenerate)
3. Only approved clips show the "Extract Frame" option
4. The "Add Clip" placeholder requires the previous clip to be approved AND have an extracted frame

**Technical approach:**
- The `approved` status already exists in `ClipStatus` type
- Add `approveClip` helper to `useClipGeneration` that calls `StoryboardService.updateClip(id, { status: 'approved' })`
- Update `canChain` logic: `previousClip?.status === 'approved' && previousClip?.extracted_frame_url`
- Update ClipCard to show approve/reject actions for `completed` clips

**UI change:** Two small icon buttons on ClipCard when status is `completed`. Green check, red X. Compact, no labels needed.

---

## Step 4: Auto-Chain Flow (reduce friction)

After a clip is approved, auto-prompt the user to extract a frame and write the next prompt. Minimize clicks.

**User flow:**
1. User approves a clip
2. Frame selector opens automatically (skip the manual "Extract Frame" click)
3. User picks a frame and confirms
4. AI automatically generates a suggested prompt for the next clip based on narrative context
5. Prompt appears in the textarea, ready to generate

**Technical approach:**
- After `approveClip` succeeds, auto-open the FrameSelector dialog
- After frame extraction succeeds, auto-call the AI prompt generator (Step 2)
- Chain these as sequential async operations with clear loading states

**UI change:** None -- it reuses existing components (FrameSelector dialog, prompt textarea) but triggers them automatically.

---

## Step 5: Assembly Preview

**User flow:**
1. User clicks the existing "Preview" button in the project header
2. A fullscreen dialog opens with a video player
3. Clips play back-to-back in scene order
4. Scene markers show at the bottom (small dots or segments)
5. Total duration displayed
6. "Not ready" state shows which clips are missing/unapproved

**Technical approach:**
- New component: `AssemblyPreview.tsx`
- Uses `StoryboardService.getProjectAssembly()` (already exists)
- HTML5 `<video>` element with `onended` handler to auto-advance to next clip
- Simple state machine: `currentClipIndex` increments on each `ended` event
- No server-side stitching -- pure client-side sequential playback

**UI:** A Dialog with a centered video player, minimal controls (play/pause, restart), scene indicator dots below, duration counter. Dark background, matches the existing aesthetic.

---

## Implementation Order and File Changes

| Priority | Feature | Files | Complexity |
|----------|---------|-------|------------|
| 1 | Clip quality gate | `ClipCard.tsx`, `ClipWorkspace.tsx`, `useClipGeneration.ts` | Low |
| 2 | Assembly preview | New `AssemblyPreview.tsx`, `StoryboardEditor.tsx` | Low |
| 3 | AI story planner | `StoryboardEditor.tsx` (wire AI Assist button), new `StoryPlannerSheet.tsx`, edge function call | Medium |
| 4 | Smart prompt generation | `ClipWorkspace.tsx` (upgrade AI Suggest), edge function call | Medium |
| 5 | Auto-chain flow | `ClipWorkspace.tsx` (post-approve automation) | Low |

### Detailed file changes:

**`src/components/storyboard/ClipCard.tsx`**
- Add approve/reject buttons for `completed` status clips
- Show approved status with a distinct visual indicator (green border or badge)

**`src/components/storyboard/ClipWorkspace.tsx`**
- Update `canChain` to require `approved` status
- Add `approveClip` flow with auto-open FrameSelector
- Upgrade `handleGeneratePrompt` to call AI edge function
- After frame extraction success, auto-generate next prompt

**`src/hooks/useClipGeneration.ts`**
- Add `approveClip` mutation
- Add `generateAIPrompt` function that calls edge function

**`src/components/storyboard/AssemblyPreview.tsx`** (new)
- Sequential video player component
- Scene markers, duration counter, play/pause controls
- Uses `getProjectAssembly()` data

**`src/components/storyboard/StoryPlannerSheet.tsx`** (new)
- Side sheet with narrative input textarea
- "Generate Plan" button calling AI
- Scene card list with accept/edit/remove per scene
- "Apply Plan" button to batch-create scenes

**`src/pages/StoryboardEditor.tsx`**
- Wire "AI Assist" button to open StoryPlannerSheet
- Wire "Preview" button to open AssemblyPreview dialog

**`src/lib/utils/storyboardPrompts.ts`**
- Keep as fallback, no changes needed

### No database changes needed
All required columns (`story_summary`, `story_beats`, `approved` status, `suggested_prompts`) already exist in the schema.

### No new edge functions needed
Reuse `playground-chat` for AI story planning and prompt generation by passing scene-specific system prompts.


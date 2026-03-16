

# Storyboard UX/UI Audit

## What's Working Well

1. **Solid data architecture**: 5 normalized tables (projects, scenes, clips, frames, renders) with RLS. The service layer and React Query hooks are well-structured.

2. **AI Story Planner**: The StoryPlannerSheet is well-designed -- natural language input, editable scene cards with accept/reject, inline editing. Good workflow.

3. **Frame chaining concept**: The extraction pipeline (FrameSelector, chain indicators, extraction percentage tracking) is technically sound for maintaining character continuity across clips.

4. **Project list page**: Clean grid/list toggle, search, sort, status filter, empty states. The ProjectCard shows relevant metadata (aspect ratio, duration, status, content tier, AI badge).

5. **ClipTile**: Compact, informative -- shows status, type badge, duration, chain indicator, hover-to-play video preview. Good information density.

6. **Assembly Preview**: Simple but functional sequential player with clip-dot navigation and scene labels.

---

## Critical Issues

### 1. Mobile is completely broken (402px viewport)

The entire editor layout is desktop-only:
- **StoryboardEditor** uses `flex flex-col h-[calc(100vh-var(--header-height,64px))]` with a fixed `w-64` ClipLibrary sidebar -- on a 402px screen, the main editor area gets ~138px. Unusable.
- **ClipDetailPanel** uses `grid-cols-12` with `col-span-4` / `col-span-8` -- video preview becomes ~46px wide on mobile.
- **SceneStrip** has `w-28` fixed-width cards that won't adapt.
- **ClipCanvas** tiles are `w-32` fixed -- horizontal scroll is fine but the surrounding layout leaves no room.

The user is on a 402px viewport right now. This needs a completely different mobile layout.

### 2. No way to assign a character to a project

The ClipLibrary sidebar shows "No character selected" because `activeProject.primary_character` is likely always null. There's no UI anywhere to:
- Select a primary character for the project
- Browse/search existing characters
- The NewProjectDialog doesn't have a character picker

Without a character, the entire "Character" section of the library is dead weight, and clip generation loses its main reference source.

### 3. Clip generation requires BOTH prompt AND reference image

`canGenerate = clip.prompt?.trim() && clip.reference_image_url` -- but there's no obvious way to set a reference image on a clip from the editor. The ClipDetailPanel doesn't have a reference image picker. Users must either:
- Drag from the ClipLibrary sidebar (which has no character)
- Drop an image on the ClipCanvas (creates a new clip, doesn't add to existing)

This is a dead end for most users.

### 4. No clip approval workflow

The dev plan and memory mention clips must be "approved" before frame chaining, but there's no approve/reject button anywhere in ClipDetailPanel or ClipTile. The status goes pending → generating → completed → ???. Users can't advance clips to "approved" status.

### 5. Scene management gaps

- No way to reorder scenes (no drag-and-drop on SceneStrip)
- No way to edit scene title/description/mood after creation (except through AI planner)
- No way to delete a scene from SceneStrip (the delete handler exists but no UI trigger)

---

## UX Improvements Needed

### 6. Editor header is too dense on mobile
The header packs: back button, title, status badge, duration counter, AI button, Preview button, and a More menu -- all in one row at 402px. Needs collapsing.

### 7. ClipDetailPanel toggle direction is wrong
When collapsed, it shows `ChevronUp` (suggesting "expand upward") but clicking expands it downward. The chevron semantics are inverted.

### 8. Story plan collapsible takes prime real estate
The "Generated story" collapsible sits between the header and SceneStrip, pushing the working area down. On mobile this wastes the entire viewport. Should be in a sheet/drawer instead.

### 9. No onboarding or guided flow
New users see an empty scene strip and an empty clip canvas with "Drop an image to start." There's no guidance on:
- What to do first (pick a character? write a description? use AI planner?)
- How the frame chaining workflow works
- What clip types mean

### 10. Toolbar on project list doesn't collapse
At 402px, the toolbar shows search + status filter + sort dropdown + grid/list toggle all in one row. These will overflow or compress to unusable sizes.

---

## Recommended Priority Order

| Priority | Issue | Effort |
|----------|-------|--------|
| P0 | Mobile-responsive editor layout | Large |
| P0 | Add reference image picker to ClipDetailPanel | Medium |
| P0 | Add character selector to project (NewProjectDialog or editor) | Medium |
| P1 | Add clip approval button | Small |
| P1 | Scene edit/delete/reorder from SceneStrip | Medium |
| P1 | Collapse toolbar on mobile (project list) | Small |
| P2 | Move story plan to sheet on mobile | Small |
| P2 | Fix chevron direction on ClipDetailPanel | Trivial |
| P2 | Add onboarding hints / empty state guidance | Medium |
| P3 | Build errors in edge functions (playground-chat, character-portrait, etc.) | Medium |


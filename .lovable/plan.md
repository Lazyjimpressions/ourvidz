

# Dynamic Multi-Ref Slot Roles with Reference Tagging

## Overview

Update the workspace multi-ref system with 6 slot roles and add a tagging system so images across the app can be tagged with their "ref role" (character, clothing, position, scene, style). This enables future quick-assignment workflows where the system can suggest or auto-populate ref slots based on tagged images.

## The 6 Roles

| Role | Meaning | Example |
|------|---------|---------|
| **Character** | Use this exact person's identity/face | Headshot, full body |
| **Clothing** | Use this exact outfit/garment | Photo of a dress, suit |
| **Position** | Use this exact body pose/composition | Someone sitting, action pose |
| **Scene** | Use this exact environment/background | A room, landscape |
| **Style** | Use this visual aesthetic/mood | Painting style, film look |
| **Reference** | Generic reference (no special prompt logic) | Anything else |

## Default Slot Assignments

| Slot | Default Role | Label |
|------|-------------|-------|
| 1 | Character | Char 1 |
| 2 | Character | Char 2 |
| 3 | Position | Position |
| 4 | Clothing | Clothing |
| 5-10 | Reference | Ref 5-10 |

## Workflow Example

**Goal**: Character 1 sitting in a specific dress in a garden.

| Slot | Role | Image |
|------|------|-------|
| 1 | Character | Photo of your character |
| 2 | Position | Image of someone sitting |
| 3 | Clothing | Photo of the specific dress |
| 4 | Scene | Photo of a garden |

Auto-generated prefix: "Show the character from Figure 1 in the position from Figure 2 wearing the clothing from Figure 3 in the scene from Figure 4:"

User prompt: "relaxed expression, golden hour lighting"

## Image Tagging Strategy

### Recommendation: Tag via Lightbox Action Bar (not separate library tabs)

Rather than adding new tabs to the library, the most natural UX is a **role tag button in the lightbox action bar**. When viewing any image in the lightbox (library, workspace, or character studio), the user sees a small tag/label icon. Tapping it reveals a popover with the 5 meaningful roles (character, clothing, position, scene, style) as toggleable chips -- multiple can be selected. This writes to the existing `tags` text[] column on `user_library` or `character_canon`.

**Why this is better than library tabs:**
- Tags are applied in context, while looking at the image
- No need to navigate to a separate tab or view
- Works across all lightbox contexts (library, workspace, studio)
- The existing `tags` column on both tables already supports this -- no schema change needed
- Library can later add a filter-by-role-tag feature using the existing tag filter UI

### Tag Format

Use a namespaced prefix to distinguish role tags from other tags: `role:character`, `role:clothing`, `role:position`, `role:scene`, `role:style`. This avoids collision with existing freeform tags like character names.

### Character Studio Auto-Tagging

Images generated or saved in Character Studio should auto-receive role tags based on context:
- Portraits tab images get `role:character` automatically
- Position tab images get `role:position` automatically
- These auto-tags make character studio assets immediately usable as typed references in the workspace

## Technical Changes

### 1. Type Definitions

**File**: `src/components/workspace/MobileQuickBar.tsx`

- Add `SlotRole` type: `'character' | 'clothing' | 'position' | 'scene' | 'style' | 'reference'`
- Add `SLOT_ROLE_LABELS` map and `SLOT_ROLE_ICONS` map
- Update `FIXED_IMAGE_SLOTS` defaults (Char 1, Char 2, Position, Clothing, Ref 5-10)
- Add `onSlotRoleChange?: (index: number, role: SlotRole) => void` prop
- Add a small role badge on each slot that opens a popover to change role on tap

### 2. Figure Notation Builder

**File**: `src/hooks/useLibraryFirstWorkspace.ts`

- Accept `slotRoles: SlotRole[]` in the prefix builder
- Group filled slots by role and build prefix in order: Character, Position, Clothing, Scene, Style
- Skip "reference" role slots in the prefix (they're passed as images but not described)
- Handle multiples of same role (e.g., 2 characters: "the characters from Figure 1 and Figure 2")

### 3. State and Wiring

**File**: `src/pages/MobileSimplifiedWorkspace.tsx`

- Add `slotRoles` state initialized from defaults
- Wire `handleSlotRoleChange` callback
- Pass roles to prompt builder and quick bar
- Compute `multiRefActive` (2+ filled slots) and pass to settings sheet

### 4. Model Filtering

**File**: `src/components/workspace/MobileSettingsSheet.tsx`

- When `multiRefActive`, filter image models to those with `i2i_multi` in `tasks`
- Auto-select the `i2i_multi` default model

**File**: `src/hooks/useImageModels.ts`

- Ensure `tasks` field is included in returned model data

### 5. Lightbox Role Tagging

**File**: `src/components/shared/LightboxActions.tsx` (or new `RoleTagButton.tsx`)

- Add a "Tag" button to `LibraryAssetActions` and `WorkspaceAssetActions`
- On click, show a popover with 5 role chips (character, clothing, position, scene, style)
- Toggle adds/removes `role:X` from the asset's `tags` array
- Calls `supabase.from('user_library').update({ tags })` or `supabase.from('character_canon').update({ tags })`

**File**: `src/components/library/UpdatedOptimizedLibrary.tsx`

- Pass the tag button through the `actionsSlot` in the lightbox

### 6. Character Studio Auto-Tagging

**File**: `src/hooks/useCharacterStudio.ts`

- When saving a portrait, auto-include `role:character` in the tags array
- When saving a position, auto-include `role:position` in the tags array
- When saving an outfit/style, auto-include the corresponding `role:clothing` or `role:style` tag

### 7. Prompt Input Passthrough

**File**: `src/components/workspace/MobileSimplePromptInput.tsx`

- Accept and pass `slotRoles` and `onSlotRoleChange` through to `MobileQuickBar`

## Edge Function Note

No edge function changes needed. The Figure notation is constructed client-side in the prompt text. The `fal-image` edge function already accepts an `image_urls` array and passes them to the model as-is. The prompt text is what tells the model how to interpret each Figure.

## Build Error Fixes (Separate)

The current build errors in `playground-chat`, `replicate-image`, `replicate-webhook`, and `roleplay-chat` are unrelated to this feature. They stem from missing Supabase type definitions for tables like `messages`, `conversations`, and `system_config`. These need `as any` casts or type regeneration, and should be fixed in a separate pass.

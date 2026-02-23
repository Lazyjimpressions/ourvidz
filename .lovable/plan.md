
# Fix Plan: 4 Multi-Ref Issues

## Issue 1: Cannot change ref image type (role badge not working)

**Root cause**: In `MobileQuickBar.tsx` line 183, the role badge popover only renders when `role && role !== 'reference'`. This means:
- Slots defaulting to `reference` (slots 5-10) never show the role badge
- Empty slots have no way to pre-assign a role before filling

**Fix** (`src/components/workspace/MobileQuickBar.tsx`):
- Remove the `role !== 'reference'` guard so ALL filled slots show the role badge popover, including generic "Ref" slots
- Change condition from `role && role !== 'reference' && onRoleChange` to just `role && onRoleChange`
- This allows users to tap the badge on any filled slot and cycle through all 6 roles

## Issue 2: Lightbox missing role tag button

**Root cause**: `LightboxActions.tsx` already accepts `onRoleTagToggle` and `tags` props, and `RoleTagButton` is built. But neither caller passes them:
- `UpdatedOptimizedLibrary.tsx` (line 471) renders `LibraryAssetActions` without `onRoleTagToggle` or `tags`
- `MobileSimplifiedWorkspace.tsx` (line 773) renders `WorkspaceAssetActions` without `onRoleTagToggle` or `tags`

**Fix**:
- **`src/components/library/UpdatedOptimizedLibrary.tsx`**: Add a `handleRoleTagToggle` function that reads the asset's current tags, calls `toggleRoleTag()`, then updates the `user_library` row via Supabase. Pass `onRoleTagToggle` and `tags` to `LibraryAssetActions`.
- **`src/pages/MobileSimplifiedWorkspace.tsx`**: Similar handler for workspace assets. Since workspace assets may not have persistent tags (they're ephemeral), the tag button should only appear for library assets in the lightbox. For workspace lightbox, we can skip this (workspace images get tagged when saved to library).

## Issue 3: Default multi model not switching when 2+ refs loaded

**Root cause**: The `applySmartDefault('i2i_multi')` call exists for ref2 (line 508) and some additional slots (lines 516, 524), but:
1. **Model dropdown is not filtered** -- `MobileSettingsSheet.tsx` `ModelChipPopover` shows ALL image models regardless of multi-ref state. It doesn't receive or check `tasks` arrays.
2. **QuickBar model dropdown** (line 514 in MobileQuickBar) also shows all models unfiltered.

**Fix**:
- **`src/components/workspace/MobileSimplePromptInput.tsx`**: Compute `multiRefActive` (count filled ref slots >= 2). Pass it to both `MobileQuickBar` and `MobileSettingsSheet`.
- **`src/components/workspace/MobileQuickBar.tsx`**: Accept `multiRefActive` prop. When true and mode is `image`, filter `imageModels` to only those with `tasks` including `i2i_multi`. Need to expand the `imageModels` prop type to include `tasks?: string[]`.
- **`src/components/workspace/MobileSettingsSheet.tsx`**: Same -- accept `multiRefActive` and `tasks` on model items, filter the model list.
- **`src/hooks/useImageModels.ts`**: Already includes `tasks` in the query and `ImageModel` type. But `MobileSimplePromptInput` strips it when mapping to the QuickBar prop (line 587-591). Fix: include `tasks` in the mapped object.

## Issue 4: Sparkle button not keying off ref images / no template hover tooltip

**Root cause**: The `handleEnhance` function (MobileSimplePromptInput line 165) sends `model_id`, `job_type`, and `contentType` to the `enhance-prompt` edge function but does NOT send any reference image context or slot role metadata. There's also no hover tooltip showing which template will be used.

**Fix** (`src/components/workspace/MobileSimplePromptInput.tsx`):
- Update `handleEnhance` to include `has_reference_images: true` and `slot_roles` metadata in the request body when multi-ref is active. This lets the edge function select the appropriate multi-ref template.
- Add a `title` attribute (tooltip) to the sparkle button that shows the expected template context, e.g. "Enhance prompt (Multi-ref: Char, Position, Clothing)" or "Enhance prompt (single image)" based on the current ref state and selected model.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/workspace/MobileQuickBar.tsx` | Remove `role !== 'reference'` guard; add `multiRefActive` prop; add `tasks` to imageModels type; filter models when multi-ref |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Compute `multiRefActive`; pass to QuickBar + SettingsSheet; include `tasks` in model mapping; update sparkle handler with ref context; add sparkle tooltip |
| `src/components/workspace/MobileSettingsSheet.tsx` | Accept `multiRefActive`; filter model list for `i2i_multi` when active |
| `src/components/library/UpdatedOptimizedLibrary.tsx` | Wire `onRoleTagToggle` + `tags` to `LibraryAssetActions` with Supabase update handler |
| `src/pages/MobileSimplifiedWorkspace.tsx` | No changes needed (already passes `slotRoles` correctly) |

## Status of Previously Planned Changes

- **SlotRole types** (`src/types/slotRoles.ts`): Done -- 6 roles, labels, colors, `buildFigurePrefix`
- **`RoleTagButton` component**: Done -- built and functional
- **`LightboxActions` prop wiring**: Props added but NOT connected to callers (this plan fixes it)
- **`MobileQuickBar` role badge**: Built but gated behind `role !== 'reference'` (this plan fixes it)
- **`slotRoles` state in workspace page**: Done -- state, setter, and passthrough all wired
- **`buildFigurePrefix` in generate flow**: Done -- `useLibraryFirstWorkspace.ts` accepts and uses `slotRoles`
- **Character Studio auto-tagging**: Changes were made to `useCharacterStudio.ts` and `CharacterStudioV3.tsx` (needs verification)
- **Model filtering for `i2i_multi`**: NOT done (this plan adds it)
- **Sparkle/enhance with ref context**: NOT done (this plan adds it)

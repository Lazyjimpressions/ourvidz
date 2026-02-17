

# Fix Missing Character Thumbnails in Scene Setup Sheet

## Problem

When you open a scene and see the character selection grid, many character avatars show blank/broken because the images are stored as private storage paths (e.g., `user-library/3348b481.../image.png`) that need to be "signed" (authenticated) before the browser can load them. The `CharacterCard` component elsewhere in the app handles this correctly, but the `SceneSetupSheet`'s inline character grid skips this step entirely.

## Root Cause

In `SceneSetupSheet.tsx`, the `CharacterGrid` component (line 199) renders:
```
<AvatarImage src={char.reference_image_url || char.image_url} />
```
This passes the raw storage path directly. Characters with `image_url` values like `user-library/...` (private bucket paths) or expired signed URLs will fail to load.

The fix used everywhere else (`CharacterCard`, `ChatMessage`, etc.) is to run these URLs through `urlSigningService` first.

## Fix

### 1. `src/components/roleplay/SceneSetupSheet.tsx` -- Sign character image URLs

- Import `urlSigningService` from `@/lib/services/UrlSigningService`
- Add a state map to hold signed URLs keyed by character ID
- Add a `useEffect` that signs all character image URLs when `filteredCharacters` changes (same pattern as `CharacterCard`)
- Update the `CharacterGrid` to use the signed URL from the map instead of the raw path

The signing logic follows the established pattern from `CharacterCard`:
- If the URL contains `user-library/` or `workspace-temp/`, sign it via `urlSigningService.getSignedUrl()`
- If it's already a full `https://` URL (e.g., fal.ai CDN links), use it as-is
- Fall back to the `AvatarFallback` (first letter of name) if no URL exists

### 2. No changes needed to CharacterEditModal

The edit modal already supports setting `image_url` via:
- **Generate Portrait** button (AI-generated)
- **Upload** button (file upload to avatars bucket)
- **Library** button (pick from existing images)
- **Manual URL** input field

All of these correctly save the URL to the character record. The problem is purely on the display side in the scene setup sheet.

## Files to Change

| File | Change |
|---|---|
| `src/components/roleplay/SceneSetupSheet.tsx` | Sign character image URLs before rendering in CharacterGrid |

## Result

Character thumbnails in the scene setup sheet will display correctly for all URL formats (private storage paths, signed URLs, and CDN URLs), matching the behavior of the main character grid on the roleplay dashboard.

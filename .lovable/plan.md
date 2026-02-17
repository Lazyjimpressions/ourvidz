

# Fix Opening Scene Reference Image Bugs

## Bug 1: Wrong field name on `selectedScene` (3 locations)

The `SceneTemplate` type uses `preview_image_url`, but three code paths in `MobileRoleplayChat.tsx` incorrectly access `selectedScene?.image_url` (which is `undefined` on the type, so the preview URL is always `null`). This forces T2I instead of I2I for the opening scene.

**Note:** The kickoff path at line 902 already correctly uses `loadedScene?.preview_image_url` -- only the post-kickoff paths are broken.

### Fix locations in `src/pages/MobileRoleplayChat.tsx`:

| Line | Current (broken) | Fixed |
|---|---|---|
| 1391-1397 | `selectedScene?.image_url` (x4 refs) | `selectedScene?.preview_image_url` |
| 1753-1758 | `selectedScene?.image_url` (x4 refs) | `selectedScene?.preview_image_url` |
| 2011-2016 | `selectedScene?.image_url` (x4 refs) | `selectedScene?.preview_image_url` |

Each block is the same pattern -- just replace `image_url` with `preview_image_url` in the conditional and all references within.

## Bug 2: Empty-string `reference_image_url` bypasses multi-reference

All 7 call sites pass:
```
user_character_reference_url: selectedUserCharacter?.reference_image_url || null
```

If `reference_image_url` is `''` (empty string), `'' || null` evaluates to `null` -- so this actually works correctly for empty strings. However, many user characters have a valid `image_url` but no `reference_image_url` at all. The fix is to fall back to `image_url`:

```
user_character_reference_url: selectedUserCharacter?.reference_image_url || selectedUserCharacter?.image_url || null
```

This ensures multi-reference composition works when the user has an avatar but hasn't explicitly set a separate reference image.

### Fix locations (all in `src/pages/MobileRoleplayChat.tsx`):

Lines 947, 1424, 1594, 1778, 1894, 2047, 2195 -- same one-line change at each.

## Files to Change

| File | Change |
|---|---|
| `src/pages/MobileRoleplayChat.tsx` | Fix `selectedScene?.image_url` to `preview_image_url` (3 blocks); fall back `reference_image_url` to `image_url` (7 lines) |

## Result

- Opening scenes from templates will correctly use I2I with the template's preview image as reference
- User characters with avatars will be included in multi-reference composition even without a separate `reference_image_url`

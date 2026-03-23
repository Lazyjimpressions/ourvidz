

## Audit: ImagePickerDialog Issues in Workspace

### Problems Found

**1. No "All Characters" option in Characters tab**
When the Characters source tab is active, the picker shows individual character pills but no way to view assets across all characters at once. This forces users to click through each character individually to find an asset.

**2. Library category filters miss most assets**
The category filter (Characters, Positions, Outfits, Scenes, Styles) checks `asset.tags` for values like `'position'` or `'role:position'` (line 252-257). However, many library assets were saved without these role tags, so they only appear under "All". The `content_category` field (e.g. `'scene'`, `'portrait'`) on library rows is mapped into `metadata` by `toSharedFromLibrary` but is never checked by the filter — this is a missed signal.

**3. Canon assets have no thumbnail path, causing signing overhead**
`toSharedFromCanon` always sets `thumbPath: null`. The signing loop then signs every canon asset using its full `output_url` path against `reference_images` bucket. If `output_url` is already an absolute URL, it passes through — but if many assets have storage paths, they all get individually signed with no thumbnail optimization.

**4. Category filter not applied to library `content_category`**
Library assets have both `tags[]` and `content_category` fields. The picker only checks tags, ignoring `content_category`. An asset with `content_category: 'scene'` but no `'scene'` or `'role:scene'` tag won't appear under the Scenes filter.

### Plan

#### A. Add "All Characters" option (ImagePickerDialog.tsx)
- Add an "All" pill at the start of the character selector (line 470)
- When "All" is selected (`selectedCharacterId === null`), query `character_canon` without the `.eq('character_id', ...)` filter — just fetch all canon assets for the user's characters
- Adjust the `loadCanonAssets` effect to handle `selectedCharacterId === null`
- Default to "All" instead of auto-selecting the first character

#### B. Fix library category filtering to include `content_category` (ImagePickerDialog.tsx)
- In the `filteredAssets` memo (line 250-269), when `activeSource === 'library'` and `activeCategory !== 'all'`, also check:
  - `asset.content_category` matches the active category (mapping: `'portrait'` → `'character'`, `'scene'` → `'scene'`, etc.)
  - This uses the raw paginated library data which has `content_category` from the DB
- Define a mapping: `{ character: ['portrait', 'character'], position: ['position', 'pose'], scene: ['scene'], clothing: ['clothing', 'outfit'], style: ['style'] }`
- Check: `hasRoleTag || contentCategoryMatches`

#### C. Ensure raw library data retains `content_category` for filtering
- Verify `transformLibraryAsset` passes `content_category` through (it currently doesn't include it in `UnifiedLibraryAsset`)
- Add `contentCategory?: string` to `UnifiedLibraryAsset` type and map it in `transformLibraryAsset`
- Then in the filter, check `asset.contentCategory` alongside tags

### Files to modify
- `src/components/storyboard/ImagePickerDialog.tsx` — Add "All" character pill, fix category filter logic
- `src/lib/services/LibraryAssetService.ts` — Add `contentCategory` to `UnifiedLibraryAsset` and `transformLibraryAsset`

### Technical details

Category filter enhancement (ImagePickerDialog, filteredAssets memo):
```typescript
const CATEGORY_TO_CONTENT_CATEGORIES: Record<CategoryFilter, string[]> = {
  all: [],
  character: ['portrait', 'character'],
  position: ['position', 'pose'],
  scene: ['scene'],
  clothing: ['clothing', 'outfit'],
  style: ['style'],
};

// In the library filter branch:
const hasRoleTag = tags.some(t => t === activeCategory || t === `role:${activeCategory}`);
const contentCat = asset.contentCategory || asset.content_category || '';
const hasCategoryMatch = CATEGORY_TO_CONTENT_CATEGORIES[activeCategory]?.includes(contentCat);
if (!hasRoleTag && !hasCategoryMatch) return false;
```

"All Characters" canon query (when `selectedCharacterId === null`):
```typescript
// Remove .eq('character_id', selectedCharacterId) 
// Instead, get all character IDs for the user and use .in('character_id', userCharacterIds)
// Or simply omit the character filter since RLS already scopes to user's characters
```




# Fixed-Role Reference Slots: 3 Characters + 1 Pose

## Summary

Replace the current generic, progressive ref slots with 4 fixed-role slots that are always visible in image mode:
- **Char 1** / **Char 2** / **Char 3** (character/face references)
- **Pose** (position/pose reference)

Each slot gets a small label underneath. The Quick Bar height increases slightly to accommodate labels. Auto-injected Figure notation in the prompt tells the model exactly what each image represents.

## UI Changes

### MobileQuickBar.tsx
- Remove the dynamic `refSlots` / `maxSlots` / `onAddSlot` progressive system
- Replace with 4 fixed slots, each with a `role` label displayed below the thumbnail:
  - Slot 0: "Char 1"
  - Slot 1: "Char 2"  
  - Slot 2: "Char 3"
  - Slot 3: "Pose"
- Increase slot height from `h-8 w-8` to `h-10 w-10` with a `text-[8px]` label underneath
- All 4 slots always visible (no progressive reveal, no "+" button)
- Empty slots show the role label + dashed border
- In **video mode**, keep existing behavior (start/end ref only, no fixed slots)

### MobileSimplePromptInput.tsx
- Replace the `refSlots` builder with fixed 4-slot structure
- Map slots to state:
  - Slot 0 -> `referenceImageUrl` (existing Ref 1)
  - Slot 1 -> `referenceImage2Url` (existing Ref 2)
  - Slot 2 -> `additionalRefUrls[0]` (Char 3)
  - Slot 3 -> `additionalRefUrls[1]` (Pose)
- Remove `handleAddSlot` / progressive logic
- Remove `maxSlots` detection from model capabilities (fixed at 4 for image mode)
- Update `handleRemoveSlot` and `handleFileSelectForSlot` for the 4-slot mapping

### useLibraryFirstWorkspace.ts - Auto Figure Notation
In the `generate()` function, when `allRefUrls.length > 1`, build a Figure prefix based on which slots are filled:

**Examples:**
- Char 1 + Pose: `"Show the character from Figure 1 in the pose/position shown in Figure 2:"`
- Char 1 + Char 2 + Pose: `"Show the character from Figure 1 and the character from Figure 2 in the pose/position shown in Figure 3:"`
- Char 1 + Char 2 + Char 3 + Pose: `"Show the characters from Figure 1, Figure 2, and Figure 3 in the pose/position shown in Figure 4:"`
- Char 1 + Char 2 (no pose): `"Show the character from Figure 1 and the character from Figure 2 together:"`

The key insight: the **pose image is always last** in the `image_urls` array, regardless of how many character slots are filled. Empty character slots are skipped (not sent).

### MobileSimplifiedWorkspace.tsx
- Update `handleGenerate` to pass slot role metadata along with URLs so the generate function knows which is pose vs character
- Update drag-from-grid overflow logic: fill Char 1 -> Char 2 -> Char 3 -> Pose in order

## Technical Details

### Slot-to-URL mapping for API call
```text
Filled slots example: Char1=url_a, Char3=url_b, Pose=url_c
  -> image_urls: [url_a, url_b, url_c]
  -> prompt prefix: "Show the character from Figure 1 and the character 
     from Figure 2 in the pose/position shown in Figure 3:"
```

The generate function receives a structured object instead of flat arrays:
```typescript
interface RefSlotData {
  url: string;
  role: 'character' | 'pose';
}
```

This lets it build the correct Figure notation: characters listed first, pose always referenced last.

### Props changes
- `MobileQuickBar`: replace `refSlots`/`maxSlots`/`onAddSlot` with 4 fixed slot props (or a `fixedSlots` array with role labels)
- `RefSlotData` type updated to include `role` and `label`

## Files Changed
1. `src/components/workspace/MobileQuickBar.tsx` - Fixed 4 labeled slots, increased height, remove "+" button
2. `src/components/workspace/MobileSimplePromptInput.tsx` - Fixed slot mapping, remove progressive logic
3. `src/pages/MobileSimplifiedWorkspace.tsx` - Update generate call with role metadata, update drag overflow
4. `src/hooks/useLibraryFirstWorkspace.ts` - Auto-inject Figure notation based on slot roles


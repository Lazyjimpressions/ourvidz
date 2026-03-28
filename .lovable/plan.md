

## Fix: Video Ref Slot 3 (Key 3) Cannot Load Images

### Root Cause

There's an index mapping mismatch in `MobileSimplePromptInput.tsx` between how video slots **display** data vs how **upload/picker handlers write** data.

**Video slot display** (`videoRefSlots`, line 647-654):
```
Slot 0 (Start)  → beginningRefImageUrl
Slot 1 (Key 2)  → additionalRefUrls[0]
Slot 2 (Key 3)  → additionalRefUrls[1]
Slot 3 (Key 4)  → additionalRefUrls[2]
Slot 4 (End)    → endingRefImageUrl
```

**Upload handlers** (`handleFileUploadForSlot` / `handlePhotoForSlot`, lines 669-684):
```
index 0 → pendingSlotIndex=0, type='single'  → referenceImageUrl (WRONG for video)
index 1 → pendingSlotIndex=1, type='ref2'     → referenceImage2Url (WRONG for video)
index 2 → pendingSlotIndex=2, type='single'   → additionalRefUrls[0] (WRONG — should be [1])
index 3 → pendingSlotIndex=3                  → additionalRefUrls[1] (WRONG — should be [2])
index 4 → pendingSlotIndex=4                  → additionalRefUrls[2] (WRONG — should be endingRefImageUrl)
```

**Library picker** (`handlePickerSelect`, line 700-736): Same problem — uses `index - 2` for additionalRefUrls offset, but video mode needs `index - 1`.

So when you click slot 3 (Key 3, index 2) and pick an image:
- It writes to `additionalRefUrls[0]`
- But slot 3 displays `additionalRefUrls[1]`
- The image appears in slot 2 (Key 2) instead

Only `handleDropSlot` and `handleDropSlotUrl` (lines 772-806) have the correct video-mode mapping. The other handlers don't.

### Fix

**File: `src/components/workspace/MobileSimplePromptInput.tsx`**

1. **`handleFileUploadForSlot`** and **`handlePhotoForSlot`** (lines 668-684): Add video mode branching to map slot indices correctly:
   - index 0 → pendingSlotIndex=0, type='start'
   - index 1-3 → pendingSlotIndex=index+1 (to offset into additionalRefUrls correctly), type='single'
   - index 4 → pendingSlotIndex=1, type='end'

   Actually, the cleaner fix: make the upload handler video-mode-aware rather than remapping indices. When `slotIndex` is received in the upload handler and we're in video mode:
   - index 0 → call `onReferenceImageUrlSet(url, 'start')`
   - index 1,2,3 → set `additionalRefUrls[index - 1]`
   - index 4 → call `onReferenceImageUrlSet(url, 'end')` (or set via ref2)

2. **`handlePickerSelect`** (line 700-736): Add video mode check:
   ```typescript
   if (currentMode === 'video') {
     if (index === 0) onReferenceImageUrlSet?.(imageUrl, 'start');
     else if (index === 4) onReferenceImage2UrlSet?.(imageUrl); // or 'end'
     else {
       const additionalIndex = index - 1;
       const newAdditional = [...additionalRefUrls];
       while (newAdditional.length <= additionalIndex) newAdditional.push('');
       newAdditional[additionalIndex] = imageUrl;
       onAdditionalRefsChange?.(newAdditional);
     }
   } else {
     // existing image-mode logic
   }
   ```

3. **Upload handler** (lines 380-391 and 500-518): Add the same video-mode branching when processing `pendingSlotIndexRef.current`, so the file upload path correctly routes to `beginningRefImageUrl` / `additionalRefUrls[index-1]` / `endingRefImageUrl`.

### Files Changed

| File | Change |
|------|--------|
| `src/components/workspace/MobileSimplePromptInput.tsx` | Add video-mode index mapping to `handleFileUploadForSlot`, `handlePhotoForSlot`, `handlePickerSelect`, and the file upload handlers |

### Why Slots 1, 2, 4 Appear to Work

- Slot 1 (Start, index 0): Maps to `referenceImageUrl` via 'single' — which may be synced with `beginningRefImageUrl` upstream
- Slot 2 (Key 2, index 1): Writes to `referenceImage2Url` but the image "leaks" into display via a different path
- Slot 4 (Key 4, index 3): Writes to `additionalRefUrls[1]` which happens to be what Slot 3 (Key 3) reads — so it shows in a shifted position

The underlying issue is that every handler except `handleDropSlot`/`handleDropSlotUrl` uses image-mode index math for video slots.


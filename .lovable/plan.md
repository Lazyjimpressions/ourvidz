

## Redesign Control Box with Multi-Reference Slots and Compact Generate Button

### Current Problem
The bottom control area takes too much vertical space because the Generate button is a full-width 48px-tall button. Reference images are buried in the Settings Sheet and there's no visible multi-ref capability.

### New Layout

The fixed bottom bar will be restructured into a compact, information-dense control box:

```text
+--------------------------------------------------+
| [Image|Video]  [Model chip]  [Settings gear]      |  <- Quick Bar (unchanged)
+--------------------------------------------------+
| [Textarea prompt............] [X] [Sparkle]       |
|                               [Generate ->]       |  <- Generate button inside textarea, below sparkle
+--[REF 1]--[REF 2]-------- right of mode toggle ---+
```

More precisely, the textarea area becomes:

```text
+-------------------------------------------+
| Describe what you want to create...       |
|                                    [X]    |
|                                    [*]    |  <- Sparkle (enhance)
|                                    [>]    |  <- Generate (arrow/send icon)
+-------------------------------------------+
```

And to the right of the Image/Video toggle on the Quick Bar, two small ref image boxes appear:

```text
[Image|Video]  [REF 1: +]  [REF 2: +]  ...spacer...  [Model chip] [Settings]
```

### Smart Model Auto-Switching Logic

Based on mode + ref state, the system auto-selects the best model (unless user overrode):

| Mode | Ref 1 | Ref 2 | Task | Default Model |
|------|-------|-------|------|---------------|
| Image | empty | empty | t2i | Seedream v4 |
| Image | image | empty | i2i | Flux-2 Flash i2i |
| Image | image | image | i2i_multi | Seedream v4 Edit |
| Video | empty | empty | t2v | LTX 13b - t2v |
| Video | image | empty | i2v | LTX 13b - i2v |
| Video | image | image | multi | LTX 13b - multi |
| Video | video | empty | extend | LTX 13b - extend |

### Detailed Changes

#### 1. `MobileSimplePromptInput.tsx` - Generate Button Redesign

**Remove** the full-width `<Button type="submit">` below the textarea.

**Add** a generate/send icon button inside the textarea's absolute-positioned button group (next to sparkle and X), stacked vertically below sparkle:

- Icon: Arrow-right or Send icon from lucide-react
- Size: Same as sparkle button (p-1, 16px icon)
- Disabled when generating or no prompt (unless exact copy mode)
- Shows Loader2 spinner when generating
- Submit the form on click

This reclaims ~56px of vertical space.

#### 2. `MobileQuickBar.tsx` - Add Two Ref Image Slots

After the Image/Video segmented control, add two small reference image boxes (32x32px each):

- **Empty state**: Dashed border box with "+" icon. Tapping opens the file picker (via callback to parent).
- **Filled state**: Shows thumbnail of the ref image/video. Small X button to remove. Video refs show a small film icon overlay.
- Each slot accepts images and videos (via the existing hidden file input in MobileSimplePromptInput).

New props needed:
- `ref1Url?: string | null` - signed URL for ref 1
- `ref2Url?: string | null` - signed URL for ref 2
- `ref1IsVideo?: boolean` - whether ref 1 is a video
- `ref2IsVideo?: boolean` - whether ref 2 is a video
- `onAddRef1?: () => void` - trigger file picker for ref 1
- `onAddRef2?: () => void` - trigger file picker for ref 2
- `onRemoveRef1?: () => void`
- `onRemoveRef2?: () => void`

Remove the existing single `hasReferenceImage` / `referenceImageUrl` / `onRemoveReference` props (replaced by ref1/ref2).

#### 3. `MobileSimplePromptInput.tsx` - Wire Up Ref Slots

- Add a second hidden file input (or reuse one with a ref tracking which slot is being filled).
- `pendingFileTypeRef` already supports 'single' | 'start' | 'end'. Map:
  - Ref 1 -> 'single' (image mode) or 'start' (video mode)
  - Ref 2 -> mapped to a new 'ref2' type
- On file selected for Ref 2:
  - If image mode: set both ref images -> triggers i2i_multi auto-switch
  - If video mode: set second ref -> triggers multi auto-switch

#### 4. `MobileSimplifiedWorkspace.tsx` - Smart Model Logic

Extend the existing `applySmartDefault` calls. Add a new effect or consolidated handler that watches ref1/ref2 state and mode, then calls the appropriate `applySmartDefault(task)`:

```
useEffect on [mode, ref1, ref2]:
  if mode === 'image':
    if ref1 && ref2 -> applySmartDefault('i2i_multi')
    if ref1 -> applySmartDefault('i2i')
    else -> applySmartDefault('t2i')
  if mode === 'video':
    if ref1 is video -> applySmartDefault('extend')
    if ref1 && ref2 -> applySmartDefault('multi')
    if ref1 -> applySmartDefault('i2v')
    else -> applySmartDefault('t2v')
```

The `useSmartModelDefaults` hook already supports all these task types ('i2i_multi', 'multi', 'extend', etc.) and the database has defaults configured for each.

#### 5. `MobileSettingsSheet.tsx` - Reference Section Simplification

Since refs are now managed in the Quick Bar, the Reference Image section in Settings Sheet becomes a secondary/advanced view. It can remain for detailed controls (strength slider, copy mode, extend settings) but the primary add/remove interaction moves to the Quick Bar.

#### 6. Prop Threading

New props flow: `MobileSimplifiedWorkspace` -> `MobileSimplePromptInput` -> `MobileQuickBar`

A second reference image/URL state pair is needed. Currently we have:
- `referenceImage` / `referenceImageUrl` (single / ref 1 for image mode)
- `beginningRefImage` / `beginningRefImageUrl` (start frame / ref 1 for video mode)
- `endingRefImage` / `endingRefImageUrl` (end frame / ref 2 for video mode)

For the unified ref slot approach:
- **Ref 1** = `referenceImage`/`referenceImageUrl` in image mode, `beginningRefImage`/`beginningRefImageUrl` in video mode
- **Ref 2** = new `referenceImage2`/`referenceImage2Url` in image mode (for i2i_multi), `endingRefImage`/`endingRefImageUrl` in video mode

We need to add `referenceImage2` / `referenceImage2Url` state to `useLibraryFirstWorkspace` (or manage it locally in MobileSimplifiedWorkspace).

### Files Modified

1. **`src/components/workspace/MobileQuickBar.tsx`** - Add ref slot boxes, remove old single ref indicator
2. **`src/components/workspace/MobileSimplePromptInput.tsx`** - Move generate to inline icon, wire ref slot callbacks, add ref2 file handling
3. **`src/pages/MobileSimplifiedWorkspace.tsx`** - Add ref2 state, consolidated smart model switching effect, wire new props
4. **`src/components/workspace/MobileSettingsSheet.tsx`** - Minor: simplify reference section (keep strength/copy controls)
5. **`src/hooks/useSmartModelDefaults.ts`** - No changes needed (already supports all tasks)


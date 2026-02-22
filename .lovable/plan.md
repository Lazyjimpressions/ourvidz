

# Convert Inline Control Groups to Compact Popover Buttons

## Problem

The three inline control groups (SFW/NSFW, aspect ratio, batch size) each display all options side-by-side, consuming significant horizontal space in the Quick Bar. With 10 ref slots now present, horizontal real estate is at a premium.

## Solution

Replace each multi-button group with a single compact button showing the current value. Clicking it opens a small Popover with the options. This reduces each control from ~3 buttons wide to 1 button wide.

### Before (3 separate groups, ~9 buttons total):
```
[SFW][NSFW]  [1:1][16:9][9:16]  [1x][3x][6x]
```

### After (3 compact buttons):
```
[NSFW v]  [1:1 v]  [3x v]
```

Each button click opens a popover with the full option list using the existing `ModelDropdownItem`-style rows.

---

## Changes

### File: `src/components/workspace/MobileQuickBar.tsx`

**Replace the three inline button groups** (lines 339-402) with three Popover components:

1. **Content Type Popover** -- Button shows current value ("SFW" or "NSFW"), popover lists both options with a checkmark on the active one
2. **Aspect Ratio Popover** -- Button shows current ratio ("1:1", "16:9", "9:16"), popover lists all three
3. **Batch Size Popover** -- Button shows current size ("1x", "3x", "6x"), popover lists all three (hidden in video mode, same as today)

Each popover will:
- Use the same `Popover`/`PopoverContent` already imported
- Auto-close on selection (using Popover's `open` state)
- Style the trigger button consistently: `h-7 px-2 text-[10px] font-medium rounded border bg-muted/50` with a small ChevronDown icon
- Keep the `hidden md:flex` visibility (desktop-only, same as current)
- Use `bg-popover border border-border shadow-lg` on the content to avoid transparency issues

**Remove the `hidden md:flex` wrapper div** and make each popover individually `hidden md:inline-flex` so they sit in the same flex row without a wrapper.

No prop changes needed -- all the same props (`contentType`, `onContentTypeChange`, `aspectRatio`, `onAspectRatioChange`, `batchSize`, `onBatchSizeChange`) are used, just rendered differently.

## Technical Notes

- The Popover component is already imported and used for the model selector in this file
- Each popover uses controlled `open` state so it closes on option select
- The `PopoverContent` gets `z-[100] bg-popover border border-border shadow-lg` to prevent the known transparency issue
- No changes to any other files -- this is purely a rendering change within `MobileQuickBar.tsx`

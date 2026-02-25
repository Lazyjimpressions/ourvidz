

# Clarify Scoring Labels, Add Tooltips, and Auto-Score on First Rating

## Problem

1. The three rating dimensions ("Action Match", "Appearance", "Quality") lack clear descriptions -- users don't know exactly what to evaluate
2. No tooltips exist to explain what each dimension means
3. Clicking stars in the lightbox only saves the user's rating to the database -- it does NOT trigger the vision model to score the image. Users must separately click the "Score Image" button

## Changes

### 1. Update DimensionStars to Support Tooltips

**File**: `src/components/lightbox/PromptDetailsSlider.tsx`

Add a `tooltip` prop to `DimensionStars`. Wrap the label in a Radix Tooltip so hovering shows the explanation:

```
DimensionStars props:
  label: string
  tooltip: string      <-- NEW
  value, hoverValue, onRate, onHover (unchanged)
```

The label text gets wrapped in a `<Tooltip>` from the existing `@/components/ui/tooltip` -- already in the project.

### 2. Update Labels and Add Tooltip Text

| Dimension | Current Label | Updated Label | Tooltip |
|-----------|--------------|---------------|---------|
| Action Match | "Action Match" | "Action Match" (keep) | "Does the action, pose, or activity in the image match what was requested in the prompt?" |
| Appearance | "Appearance" | "Outfit/Look" | "Do the character's clothes, accessories, and styling match what was described in the prompt? (Not face likeness)" |
| Quality | "Quality" | "Image Quality" | "Is the image technically well-made? Consider sharpness, anatomy, lighting, artifacts, and overall aesthetic quality." |

### 3. Auto-Trigger Vision Scoring on First User Star Rating

**File**: `src/components/lightbox/PromptDetailsSlider.tsx`

Modify `handleDimensionRate` so that after saving the user's rating, if the image has NOT been vision-scored yet (`!score?.vision_analysis`), it automatically triggers scoring -- the same logic as the "Score Image" button (`handleTriggerScoring`).

Flow:
1. User clicks a star on any dimension
2. User rating is saved to DB (existing behavior, unchanged)
3. If `score?.vision_analysis` is null/undefined (never been scored), auto-call `handleTriggerScoring()`
4. If already scored, do nothing extra (user is just updating their rating)

This means clicking stars on an unscored image will both save the user's rating AND kick off vision analysis in one action. The "Score/Re-score" button remains for manual re-scoring of already-scored images.

### 4. Update Vision Analysis Labels to Match

The Vision Analysis grid (lines 798-815) also uses short labels ("Action", "Appear", "Quality"). Update these to match the user-facing names for consistency:

| Current | Updated |
|---------|---------|
| "Action" | "Action" (keep) |
| "Appear" | "Outfit" |
| "Quality" | "Quality" (keep) |

## Technical Details

### DimensionStars with Tooltip (updated component)

The component will import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from `@/components/ui/tooltip` and wrap the label `<span>` in:

```tsx
<TooltipProvider delayDuration={300}>
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="text-xs text-muted-foreground w-24 shrink-0 cursor-help border-b border-dotted border-muted-foreground/40">
        {label}
      </span>
    </TooltipTrigger>
    <TooltipContent side="left" className="max-w-[200px] text-xs">
      {tooltip}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

The dotted underline on the label signals to users that a tooltip is available.

### Auto-scoring trigger in handleDimensionRate

After the successful `updateIndividualRating` call, add:

```tsx
// Auto-trigger vision scoring if image hasn't been scored yet
if (!score?.vision_analysis && !isScoring) {
  handleTriggerScoring();
}
```

This reuses the existing `handleTriggerScoring` function (which handles signed URL fetching, the edge function call, and polling for results).

## Files Modified

| File | Change |
|------|--------|
| `src/components/lightbox/PromptDetailsSlider.tsx` | Add tooltip prop to DimensionStars; update labels; add auto-score trigger on first rating; update Vision Analysis grid labels |

No edge function changes. No database changes. Single file modification.

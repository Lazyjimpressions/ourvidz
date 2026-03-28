

## Audit: Character-Swap Strength Gradient Not Applied

### Bug Found

The plan called for default strengths of `[1.0, 0.6, 0.3]` in character-swap mode, but this is **not working**. Here's why:

- `keyframeStrengths` state initializes as `[1.0, 1.0, 1.0, 1.0, 1.0]` (line 432 of useLibraryFirstWorkspace.ts)
- The generate function uses `keyframeStrengths[2] ?? 0.6` — the `?? 0.6` fallback only triggers if the value is `undefined` or `null`, but it's `1.0`, so the fallback never fires
- **Result**: All anchors are sent at strength 1.0 regardless of the plan's intent

### Mobile UI Consistency Issue

The slider UI (line 1076 of MobileSettingsSheet.tsx) uses `keyframeStrengths?.[i] ?? 1` — also defaults to 1.0. So the UI and backend are consistent (both 1.0), but neither reflects the intended gradient.

### All Other Changes Are Mobile-Conformant

- Conditioning type selector uses `CreativeChipPopover` with proper `text-[9px]` labels — fits mobile layout
- `✦` badge on Default/RGB in char-swap mode is lightweight, no layout overflow
- Tooltip max-widths (`max-w-[260px]`) fit within 402px viewport
- Disabled slots use `opacity-30 pointer-events-none` — touch-safe
- Slider thumb sizes (2.5 × 2.5) meet minimum touch targets for secondary controls
- `{ download: false }` on signed URLs is backend-only, no UI impact

### Fix Required

**File: `src/hooks/useLibraryFirstWorkspace.ts`**

When character-swap mode is detected (motion video + images loaded), auto-set `keyframeStrengths` to the gradient `[1.0, 1.0, 0.6, 1.0, 0.3]` (slots 0, 2, 4 = active; slots 1, 3 = greyed out, value irrelevant). This should happen via a `useEffect` that triggers when `isCharacterSwapMode` becomes true, but only if the user hasn't manually adjusted strengths.

Additionally, update the generate function to use the actual state values directly instead of `??` fallbacks:

```typescript
// Before (fallback never fires):
const s1 = keyframeStrengths[2] ?? 0.6;
const s2 = keyframeStrengths[4] ?? 0.3;

// After (use state directly):
const s0 = keyframeStrengths[0];
const s1 = keyframeStrengths[2];
const s2 = keyframeStrengths[4];
```

**File: `src/components/workspace/MobileSettingsSheet.tsx`** — No changes needed. The UI correctly reads from `keyframeStrengths` state.

### Summary

| Item | Status |
|------|--------|
| Conditioning tooltips & ✦ badge | Correct, mobile-safe |
| Disabled slots (1, 3) | Correct, touch-safe |
| Strength sliders | Mobile-conformant (thumb sizes, layout) |
| `{ download: false }` signed URLs | Correct, backend-only |
| **Strength gradient defaults** | **Bug — not applied, needs useEffect** |
| Motion video default strength (0.4) | Correct |


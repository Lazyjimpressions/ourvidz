

## Plan: Fix LTX MultiCondition Keyframe + Motion Video Settings

### Research Findings

After reviewing the fal.ai schema for `VideoConditioningInput`, here are the confirmed facts:

**`conditioning_type` enum:** `rgb`, `depth`, `pose`, `canny` (default: `rgb`)

**`preprocess` field:** "Whether to preprocess the video. If True, the video will be preprocessed to match the conditioning type. **This is a no-op for RGB conditioning.**"

This means:
- `pose` + `preprocess: true` = fal.ai extracts a stick-figure skeleton from the video, then uses that skeleton as motion guidance. **This is what causes the visible animation frames / stick figure artifacts.**
- `pose` + `preprocess: false` = fal.ai treats the raw RGB video as if it were pose data, which produces garbage.
- `rgb` (default) = fal.ai uses the video's full visual appearance as conditioning. At high strength this overpowers keyframe images. At lower strength, keyframe images can dominate appearance while the video provides motion context.

### Best Practice for Character Swap

**Use `conditioning_type: "rgb"` (default) with reduced video strength (0.3-0.5).** The model extracts both motion AND appearance from the video, but at low strength the keyframe images win on appearance while the video's motion patterns still guide choreography. This avoids the stick-figure artifacts that `pose` introduces.

**Do NOT use `pose`** unless the user explicitly wants skeleton-based motion extraction (and accepts the visual artifacts). `depth` is a reasonable middle ground — it extracts spatial structure without stick figures — but `rgb` at low strength is the cleanest approach.

### Slots: 3 vs 5 Images

For smoother transitions, **3 images at slots 1, 3, 5 is optimal.** The LTX model handles interpolation between anchor points well. Using 5 anchors can over-constrain the model and reduce motion fluidity. The current grayed-out slots (2 and 4) are correct for the character-swap use case.

Recommended strength gradient for character swap:
- Slot 0 (Start): **1.0** — strong identity lock at opening
- Slot 2 (Mid): **0.6** — reinforce identity without over-constraining
- Slot 4 (End): **0.3** — allow natural motion to dominate toward the end

### Changes

**1. Default conditioning to `rgb` (not `pose`) for character-swap mode**

File: `src/hooks/useLibraryFirstWorkspace.ts` (~line 1540)

When `isCharSwap` is true and the user hasn't explicitly changed the conditioning type from `default`, keep it as `rgb` (the API default). Remove any logic that would auto-switch to `pose`.

Currently: `const conditioningType = multiAdvancedParams?.motionConditioningType ?? 'default'` — this already resolves to `rgb` at the API level since `default` means "omit the field" and fal.ai defaults to `rgb`. No code change needed here unless we want to be explicit.

**2. Update default strengths for character-swap preset**

File: `src/hooks/useLibraryFirstWorkspace.ts` (~line 1521-1528)

When character-swap mode is detected (single identity image + motion video), update the default strength gradient:
- Slot 0: 1.0 (unchanged)
- Slot 2: 0.6 (was 1.0)
- Slot 4: 0.3 (was 1.0)

These are only defaults — the user can still adjust via sliders.

**3. Lower default motion video strength for character-swap**

File: `src/hooks/useLibraryFirstWorkspace.ts` (~line 1509)

Change default `motionVideoStrength` from `0.55` to `0.4` when in character-swap mode. This lets keyframe images dominate appearance while still following the reference video's choreography.

**4. Update conditioning type tooltips**

File: `src/components/workspace/MobileSettingsSheet.tsx` (~line 147-153)

Update the tooltip for `pose` to warn about stick-figure artifacts:

```text
Pose: "Skeletal pose extraction. Warning: may introduce visible stick-figure frames. Best with preprocess ON."
RGB: "Uses full video appearance at the specified strength. Recommended for character swap."
```

**5. Add "Recommended" badge to RGB option**

In the conditioning type dropdown, mark RGB as "(Recommended)" when character-swap mode is active, so users understand the best practice.

**6. Fix `{ download: false }` for signed URLs**

File: `supabase/functions/fal-image/index.ts` — `signIfStoragePath`

Add `{ download: false }` to `createSignedUrl()` calls so signed URLs serve inline rather than as downloads. This ensures fal.ai can reliably fetch reference images.

### Summary

| File | Change |
|------|--------|
| `useLibraryFirstWorkspace.ts` | Default char-swap strengths to [1.0, 0.6, 0.3]; lower motion video default to 0.4 |
| `MobileSettingsSheet.tsx` | Update conditioning type descriptions; add "Recommended" badge for RGB in char-swap mode |
| `fal-image/index.ts` | Add `{ download: false }` to `createSignedUrl` calls |

### Technical Detail

The key insight is that `conditioning_type` controls how fal.ai **interprets** the video data, not just what it extracts:
- `rgb` = "this video is normal footage, use it as visual reference"
- `pose` = "this video is a skeleton/pose sequence" (with `preprocess: true`, fal.ai converts RGB to skeleton first)
- `depth` = "this video is a depth map" (with `preprocess: true`, fal.ai converts RGB to depth first)

For character swap, the video IS normal footage — we want the model to follow its motion patterns while overriding appearance with the keyframe images. The correct lever is **video strength** (lower = less appearance transfer from video, more from images) rather than conditioning type.


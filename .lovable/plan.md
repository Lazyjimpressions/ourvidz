

# Wire Model Schema Data to Frontend UI

## Confirmed Findings

### The real data situation

Two active video models exist with **different** capabilities structures:

```text
WAN 2.1 I2V:     capabilities.video.duration_range, .fps_range, .resolutions, etc. (legacy)
LTX Video 13B:   capabilities.input_schema.num_frames, .frame_rate, .resolution, etc. (new, from llms.txt)
```

Both formats are valid -- they just represent different configuration approaches. The fix must support both, not replace one with the other. Future models set up via llms.txt will use `input_schema`; existing manually-configured models use the `video` sub-object.

### What's actually broken

1. **`useApiModels` doesn't fetch `capabilities` or `input_defaults`** -- the SELECT query omits them entirely. The hook returns `undefined` for both fields, so `useVideoModelSettings` casts to `any` and gets empty objects, then every setting falls back to hardcoded defaults.

2. **`useVideoModelSettings` only reads the legacy `video` format** -- it works for WAN 2.1 but returns all-fallbacks for LTX because there's no `capabilities.video` on that model.

3. **The UI already consumes `videoModelSettings` correctly** -- `SimplePromptInput` and `MobileSimplePromptInput` use `videoModelSettings?.settings?.durationOptions`, `aspectRatioOptions`, `referenceMode` with proper fallbacks. Once the hook returns real data, the UI will work.

## Changes

### File 1: `src/hooks/useApiModels.ts`

Add `capabilities` and `input_defaults` to the SELECT query and the `ApiModel` interface.

- Add to interface: `capabilities: Record<string, any>; input_defaults: Record<string, any>;`
- Add to select string: `capabilities, input_defaults`

This is the single fix that unblocks all downstream data flow. No other query changes needed.

### File 2: `src/hooks/useVideoModelSettings.ts`

Update the `useMemo` to read from **either** format:

1. First, check for `capabilities.input_schema` (new format from llms.txt)
2. If found, derive settings from it:
   - `durationOptions`: Calculate from `input_schema.num_frames` (min/max) divided by `input_schema.frame_rate` (default). For LTX: 9/30=0.3s to 161/30=5.4s. Generate rounded step options: [1, 2, 3, 4, 5].
   - `resolutionOptions`: From `input_schema.resolution.options` (e.g., ["480p", "720p"])
   - `aspectRatioOptions`: From `input_schema.aspect_ratio.options` (e.g., ["9:16", "1:1", "16:9", "auto"])
   - `fpsOptions`: From `input_schema.frame_rate.min/max`
   - `referenceMode`: `'single'` if `input_schema.image_url` exists, `'none'` otherwise
   - `guideScaleRange`: From `input_schema.guide_scale` if present, else fallback
   - Defaults: From `input_defaults.*` directly
3. If not found, fall back to existing `capabilities.video.*` logic (keeps WAN 2.1 working)

### No other files change

- The UI components (`SimplePromptInput`, `MobileSimplePromptInput`) already consume `videoModelSettings` with `?.` and `||` fallbacks -- they'll automatically show model-specific options once the hook returns real data.
- The edge functions already fetch full model rows from the DB with all columns -- no changes needed there.
- The admin `SchemaEditor` already writes to `capabilities.input_schema` correctly -- confirmed by the DB query.

### Also fix: pre-existing build errors

The `MobileRoleplayChat.tsx` file has 18 TypeScript errors referencing `preview_image_url` on `CharacterScene` type. These are unrelated to this change but block the build. Fix by using the correct property name from the `character_scenes` table (likely `image_url`).

## Design Validation

**Q: Is the approach table-driven?**
Yes. Both duration options, aspect ratios, resolutions, and reference mode are derived entirely from what's stored in the `api_models.capabilities` column. Nothing is hardcoded per model -- the hook reads whatever the table contains.

**Q: Does it work for non-fal providers?**
Yes. Any provider's model can use either format:
- Manually configure `capabilities.video` with duration/fps/resolution ranges
- Or paste llms.txt to populate `capabilities.input_schema`
- The hook checks both, preferring `input_schema` if present

**Q: What about user-facing controls like video length?**
The duration dropdown in the UI is already wired to `videoModelSettings.settings.durationOptions`. Once the hook calculates these from the model's `num_frames` range and `frame_rate`, the user sees only the durations that model supports. For LTX at 30fps: [1s, 2s, 3s, 4s, 5s]. For WAN at 16fps: [3s, 5s, 8s, 10s, ...20s].



# Fix: Edge Function TDZ Crashes + Remove T2I Models from Roleplay Settings

## Two Categories of Issues

### A. Edge Function Crashes (2 TDZ Errors)

Both errors are "Cannot access X before initialization" -- classic JavaScript Temporal Dead Zone bugs introduced by recent edits to the edge function.

**Error 1: `Cannot access 'supabase' before initialization`**

At line 351, `getDefaultOpenRouterModel(supabase)` is called to resolve an empty `model_provider`. But `const supabase = createClient(...)` is not declared until line 397 -- 46 lines later. The variable exists in scope (because `const` is block-scoped to the `try` block), but accessing it before declaration triggers the TDZ crash.

**Fix:** Move the `supabase` client creation (lines 395-397) to **before** the model resolution block (before line 349). This way the client exists when `getDefaultOpenRouterModel()` needs it.

**Error 2: `Cannot access 'character' before initialization`**

The function `generateSceneNarrativeWithOpenRouter` is declared as a nested function **inside** `generateScene` (starting at line 2618). This function declaration sits between the `const character` fetch (line 2593) and the code that uses `character` (line 2887+). This nesting causes scope corruption in Deno's compiled output.

**Fix:** Move `generateSceneNarrativeWithOpenRouter` out of `generateScene` to module-level scope (alongside other helper functions). It already receives all its dependencies as parameters, so it does not need to be nested.

### B. T2I Models Showing in Roleplay Settings

The user wants only **I2I models** (for scene iteration) and **chat/roleplay models** visible in roleplay settings. Currently:

- **SceneSetupSheet** (line 96): Calls `useImageModels()` with no filter, which returns ALL image models (T2I generation + I2I style_transfer). The label says "Image" generically.
- **QuickSettingsDrawer**: Receives `imageModels` prop and displays them under "T2I Model" label. This entire section should be removed since scene generation is always I2I.

Since the architecture is always-I2I (confirmed by comment at line 2512: "Roleplay NEVER uses T2I"), there is no reason to show T2I models in roleplay settings.

## Changes

### File 1: `supabase/functions/roleplay-chat/index.ts`

1. **Move `createClient` before model resolution** -- relocate lines 395-397 to before line 349 so `supabase` is available when `getDefaultOpenRouterModel()` is called.

2. **Extract `generateSceneNarrativeWithOpenRouter` to module scope** -- move the function declaration from inside `generateScene` (line 2618) to module level (after `generateScene` ends). It already takes all dependencies as parameters (`character`, `supabase`, etc.), so no signature changes are needed.

### File 2: `src/components/roleplay/SceneSetupSheet.tsx`

1. **Replace `useImageModels` with `useI2IModels`** -- import and use the I2I models hook instead (line 33, 96).
2. **Update the image model selector** (lines 483-498) to show I2I models instead of all image models.
3. **Update the label** from "Image" to "I2I Model" for clarity.

### File 3: `src/components/roleplay/QuickSettingsDrawer.tsx`

1. **Remove the T2I Model section entirely** (lines 109-144). Since roleplay is always-I2I, users should not see or select T2I models in roleplay settings.
2. **Remove the `imageModels` prop and related props** (`selectedImageModel`, `onSelectedImageModelChange`) from the component interface and implementation since they are no longer needed.

### File 4: `src/pages/MobileRoleplayChat.tsx` (or parent passing props to QuickSettingsDrawer)

1. **Remove the `imageModels` / `selectedImageModel` / `onSelectedImageModelChange` props** being passed to `QuickSettingsDrawer`, since that section is being removed.

## Technical Summary

| File | Change |
|------|--------|
| `supabase/functions/roleplay-chat/index.ts` | Move `createClient` before model resolution; extract nested function to module scope |
| `src/components/roleplay/SceneSetupSheet.tsx` | Replace `useImageModels` with `useI2IModels`; update label to "I2I Model" |
| `src/components/roleplay/QuickSettingsDrawer.tsx` | Remove T2I Model section and related props |
| `src/pages/MobileRoleplayChat.tsx` | Remove T2I-related props passed to QuickSettingsDrawer |

## No Database Changes

All fixes are code-level. The edge function will be redeployed after changes.

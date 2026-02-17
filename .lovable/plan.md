
# Update QuickSettingsDrawer: Split Image Model into T2I + I2I

## Problem

The QuickSettingsDrawer on the main roleplay page has a single "Image Model" selector. The advanced settings modal already has separate T2I and I2I selectors. These need to match. The drawer also needs compact styling per our design standards.

## Changes

### 1. Add I2I model state to MobileRoleplayChat.tsx

The page currently tracks `selectedImageModel` (T2I) but has no I2I model state. Need to:
- Import `useI2IModels` hook
- Add `selectedI2IModel` state (default: `'auto'`)
- Load/save it from `roleplay-settings` localStorage alongside existing settings
- Pass it to QuickSettingsDrawer as a new prop

### 2. Update QuickSettingsDrawer.tsx

**Props**: Add `selectedI2IModel`, `onSelectedI2IModelChange`, and `i2iModels` array to the interface.

**UI changes**:
- Rename "Image Model" label to **"T2I Model"** with `(Text-to-Image)` subtitle
- Add new **"I2I Model"** selector with `(Image-to-Image)` subtitle below it
- Remove verbose offline banners (inline badges on items are sufficient)
- Compact styling: `h-9 text-sm` triggers, `text-xs uppercase tracking-wide` labels
- Reduce `space-y-6` to `space-y-4` for tighter layout
- Compact scene style buttons: reduce `min-h-[72px]` to `min-h-[56px]`, `p-3` to `p-2`
- Advanced Settings button: `h-12` to `h-9`

### 3. Files to change

| File | Change |
|---|---|
| `src/components/roleplay/QuickSettingsDrawer.tsx` | Split image model into T2I + I2I selectors, compact styling |
| `src/pages/MobileRoleplayChat.tsx` | Add `useI2IModels` hook, `selectedI2IModel` state, pass to drawer |

### 4. Result

- QuickSettingsDrawer matches the advanced settings modal with T2I and I2I selectors
- T2I controls scene/character generation without reference images
- I2I controls scene iteration with reference images
- Compact, mobile-friendly layout consistent with our design standards

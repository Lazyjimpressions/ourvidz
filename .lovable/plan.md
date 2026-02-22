
# Model Selector Dropdown in Quick Bar

## Summary

Turn the model indicator button in the Quick Bar into a dropdown popover that lets users select models directly, without opening the full settings sheet. The existing `ModelChipPopover` pattern from `MobileSettingsSheet.tsx` will be adapted for use in the Quick Bar.

## Changes

### MobileQuickBar.tsx
- Add new props: `selectedModel`, `onModelChange`, `imageModels`, `videoModels`, `modelsLoading` (same types already used in `MobileSettingsSheet`)
- Replace the static model name `<Button>` (lines 368-376) with a `<Popover>` dropdown that:
  - Shows the truncated model name + a `ChevronDown` icon as the trigger
  - Opens a popover listing all available models for the current mode (image models or video models)
  - Highlights the currently selected model with `bg-primary text-primary-foreground`
  - Calls `onModelChange` on selection and closes the popover
  - Includes local model options ("SDXL (Local)" for image, "WAN (Local)" for video) at the top of the list
- Keep the gear/Settings button unchanged -- it still opens the full settings sheet for advanced controls

### MobileSimplePromptInput.tsx
- Pass the new props through to `MobileQuickBar`:
  - `selectedModel` (already available)
  - `onModelChange` (already available)
  - `imageModels` (already fetched and mapped for the settings sheet)
  - `videoModels` (already fetched)
  - `modelsLoading` (already computed)

## Technical Details

### New QuickBar props
```text
selectedModel: { id: string; type: string; display_name: string } | null
onModelChange: (model: { id: string; type: string; display_name: string }) => void
imageModels: Array<{ id: string; display_name: string; provider_name: string }>
videoModels: Array<{ id: string; display_name: string; api_providers: { name: string } }>
modelsLoading: boolean
```

### Dropdown behavior
- Trigger: compact chip with truncated name (max ~14 chars) + ChevronDown
- Popover: `min-w-[160px] max-w-[220px]`, aligned to end, `z-50` with solid `bg-popover` background
- Items: `text-[11px]`, with check icon for the selected model
- The popover uses Radix Popover (already imported in the project) for proper z-indexing and portal behavior

### Files Changed
1. `src/components/workspace/MobileQuickBar.tsx` -- Add model dropdown popover replacing the static button
2. `src/components/workspace/MobileSimplePromptInput.tsx` -- Pass model data and callbacks to QuickBar

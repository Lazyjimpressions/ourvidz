

## Consolidate Creative Direction into a Single Row of Dropdown Buttons

### Goal
Replace the vertically stacked Creative Direction controls (Shot Type pills, Camera Angle dropdown, Style text input, Enhancement pills) with a single horizontal row of compact, clickable label-buttons. Each button shows its current value and opens a Popover dropdown when tapped.

### Layout

```text
CREATIVE DIRECTION
[Shot: Wide v] [Angle: Eye v] [Style: 2 v] [Enhance: None]
```

Each is a small chip-button (like the existing aspect ratio pills). Tapping opens a Popover with the options.

### Control Behavior

| Control | Interaction | Options |
|---------|-------------|---------|
| Shot | Single-select popover | Wide, Medium, Close |
| Angle | Single-select popover | Eye Level, Low Angle, Over Shoulder, Overhead, Bird's Eye |
| Style | Multi-select popover with checkboxes | Cinematic Lighting, Film Grain, Dramatic Composition, Soft Focus, High Contrast, Moody, Natural |
| Enhance | Disabled/locked to "None" | Shows as "None" (greyed out, not interactive for now) |

### Style Changes
- **Style** changes from a free-text input to a multi-select tag picker. The button label shows the count (e.g., "Style: 3") or "Style" if none selected. The popover lists preset style tags with checkboxes. The `style` string prop is built by joining selected tags with ", ".
- **Enhancement** renders as a static chip showing "None" with `opacity-50` / `pointer-events-none`. No popover. This keeps it visible but clearly locked.

### Technical Details

**`src/components/workspace/MobileSettingsSheet.tsx`**
- Import `Popover, PopoverTrigger, PopoverContent` from ui/popover
- Replace the entire Creative Direction block (lines 335-433) with:
  - A single `div` with `flex items-center gap-1.5 flex-wrap`
  - Four compact chip-buttons (`px-2 py-1 text-[10px] rounded-md border`)
  - Shot Type chip: opens Popover with 3 radio-style buttons; selecting one closes popover and calls `onShotTypeChange`
  - Camera Angle chip: opens Popover with 5 radio-style buttons; same pattern
  - Style chip: opens Popover with preset checkboxes; toggling updates the style string via `onStyleChange`; popover stays open for multi-select
  - Enhancement chip: static display, no interaction, locked to "None"

**No changes needed** to `MobileSimplePromptInput.tsx`, `MobileQuickBar.tsx`, or `MobileSimplifiedWorkspace.tsx` -- the props interface stays the same, only the rendering changes inside `MobileSettingsSheet`.

### Style Preset Tags
The multi-select style options:
- Cinematic Lighting
- Film Grain
- Dramatic Composition
- Soft Focus
- High Contrast
- Moody
- Natural Light
- Shallow DOF

These map to the `style` string prop by joining with ", ".


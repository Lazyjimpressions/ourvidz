

## Audit: Positions Tab Filter Categories & Their Purpose

### Current State

The Positions tab shows filter pills: **All | Character | Position | Clothing | Scene | Style**

These filter the `output_type` of canon images stored for this character. Here's what each means in practice:

### What Each Filter Does

| Filter | What It Stores | Example Use Case |
|--------|---------------|-----------------|
| **Character** | Identity lock — "this is what the character looks like" | Front-facing portrait for face consistency |
| **Position** | Body arrangement — solo or multi-character | Standing, hugging someone, giving a massage |
| **Clothing** | Outfit reference — "dress the character like this" | Red dress, school uniform, armor set |
| **Scene** | Environment/background | Beach sunset, bedroom, office |
| **Style** | Art style / rendering direction | Watercolor, anime cel-shade, photorealistic |

### The "Style" Question

Style references are images that define **how** the output should look aesthetically, not **what** is in it. Examples:
- A watercolor painting you want to match the brushwork of
- An anime screenshot whose cel-shading you want to replicate
- A film still whose color grading/lighting you want to copy

This maps directly to the workspace `role:style` slot. It's a legitimate category but arguably the least used in character studio context — most users set style at the workspace/project level, not per-character.

### The Clothing Question

Clothing references on the Positions tab make sense because outfits are character-specific assets. A user might have:
- "Char A — school uniform" (clothing canon)
- "Char A — evening dress" (clothing canon)

These get picked from the ImagePickerDialog Characters tab with `clothing` filter, auto-assigned to the `role:clothing` workspace slot.

### Problem: Tab Naming

The tab is called **"Positions"** but it holds all 5 asset types. This is confusing. Two options:

**Option A: Rename tab to "References"** — Accurately describes everything stored there (positions, clothing, scenes, styles, character identity shots). The "Base Angles" section and filters within clarify sub-types.

**Option B: Keep "Positions" but only show position-type assets there. Move clothing/scene/style to their own tabs or sub-sections.** — More organized but adds UI complexity.

### Recommendation

**Option A — Rename to "References"** with these refinements:

1. **Rename the workspace tab** from "Positions" to "References" in `StudioWorkspace.tsx`
2. **Keep the filter pills** (All, Character, Position, Clothing, Scene, Style) — they work well for narrowing within the tab
3. **Consider removing "Style" from the filter** if no users are uploading style references per-character. It can be added back later. This simplifies the filter bar to 4 meaningful categories: Character, Position, Clothing, Scene.
4. **Group the upload popover tags** by output_type context — when uploading as "Clothing", show clothing-relevant tags (casual, formal, fantasy, uniform) instead of position tags (solo, duo, hugging)

### Proposed Changes

1. **`StudioWorkspace.tsx`**: Rename "Positions" tab label to "References" (keep the `workspaceTab` value as `'positions'` to avoid refactoring)
2. **`PositionsGrid.tsx`**: 
   - Optionally drop `'style'` from `POSITIONS_GRID_FILTERS` (or keep — low cost)
   - Show context-aware tags in upload popover based on selected `newOutputType` — position tags for position uploads, clothing tags for clothing uploads
3. **`positionTags.ts`**: Add a `CLOTHING_TAGS` group (casual, formal, fantasy, uniform, swimwear, armor, sleepwear) for clothing-specific tagging
4. **No schema changes needed**

### Tag Groups by Output Type

```text
output_type=position  →  Show: Composition, Framing, Angle, Body, Interaction, Intimate, Action, Mood
output_type=clothing  →  Show: Style (casual, formal, fantasy), Season (summer, winter), Coverage (full, partial)
output_type=scene     →  Show: Setting (indoor, outdoor), Time (day, night, sunset), Mood (cozy, dramatic)
output_type=character →  Show: Framing, Angle (reuse from position)
output_type=style     →  Show: Medium (watercolor, digital, photo), Aesthetic (anime, realistic, painterly)
```

This means `positionTags.ts` expands to `canonTags.ts` with tag groups organized by output_type, not just for positions.


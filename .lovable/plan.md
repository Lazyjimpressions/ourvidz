

## Fix: Simplify Position Tag Groups & Add Per-Section Custom Tags

### Problems

1. **Three overlapping groups** — "Interaction", "Intimate", and "Action" are confusing. Merge Interaction into Action (general physical actions) and keep Intimate separate (romantic/sensual).
2. **Tile tag editor always shows position tags** — Line 286 hardcodes `POSITION_TAG_GROUPS` regardless of the canon's `output_type`. A clothing asset shows position tags instead of clothing tags.
3. **Custom tag input is only at the bottom** — No way to add a custom tag within a specific group's context.

### Changes

**1. Restructure `POSITION_TAG_GROUPS` in `src/types/positionTags.ts`**

Merge `interaction` tags into `action`. Trim both lists to essentials:

```text
Action (merged):  hugging, holding-hands, carrying, piggyback, dancing,
                  fighting, running, massage, feeding, lifting

Intimate:         kissing, kissing-deeply, cuddling, spooning,
                  lap-sitting, forehead-touch, nuzzling, embracing

Remove:           back-to-back, hand-on-shoulder, arm-around-waist,
                  jumping, reaching, brushing-hair
                  (users can add these as custom tags)
```

Keep Composition, Framing, Angle, Body, Mood unchanged.

**2. Make tile tag editor context-aware** (`PositionsGrid.tsx` line 286)

Replace `POSITION_TAG_GROUPS` with `TAG_GROUPS_BY_OUTPUT_TYPE[normalizeOutputType(canon.output_type)]`. This shows clothing tags for clothing assets, scene tags for scene assets, etc.

**3. Add per-section custom tag input**

After each group's tag chips, add a small inline `+ Custom` input that adds a tag to that section's visual area (stored flat in DB like all others). This replaces the single bottom-level custom input.

### Files

- `src/types/positionTags.ts` — Remove `interaction` group, merge its tags into `action`, trim lists
- `src/components/character-studio-v3/PositionsGrid.tsx` — Context-aware tag groups in tile editor + per-section custom input


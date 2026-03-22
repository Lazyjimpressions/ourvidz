

## Updated Plan: Unified Position Taxonomy with Interaction Tags

### Core Decision: Tags, Not Types

Intimate interactions (kissing deeply, massage) and action poses (fighting, dancing) are all **positions** — they describe body arrangement and composition. They should stay as `output_type: 'position'` and use **tags** for granularity.

Why tags over separate types:
- The workspace slot is "Position" — all body arrangements flow through one slot
- Tags are combinatorial: `duo` + `kissing` + `close-up` vs a flat type that can only be one thing
- Users can create custom tags without schema changes
- The prompt builder already says "in the position from Figure N" regardless of whether it's a hug or a massage

### Proposed Tag Structure

Group tags into categories with a structured picker UI (not a flat list):

```text
Composition     solo, duo, group
Framing         full-body, half-body, close-up, bust, overhead
Angle           front, side, rear, 3/4, low-angle, birds-eye
Body            standing, sitting, lying, kneeling, leaning, crouching

Interaction     hugging, holding-hands, back-to-back, carrying,
                piggyback, hand-on-shoulder, arm-around-waist

Intimate        kissing, kissing-deeply, cuddling, spooning,
                lap-sitting, forehead-touch, nuzzling, embracing

Action          dancing, fighting, running, jumping, reaching,
                massage, feeding, brushing-hair, lifting

Mood            tender, playful, passionate, dramatic, casual, intense
```

**Why "Intimate" as a separate group**: Users generating romantic/couple content need to quickly find these without scanning through generic interactions. It also allows the UI to gate or label this section clearly.

### How It Works in Practice

1. User generates or uploads a position reference of two people kissing
2. Tags it: `duo`, `kissing-deeply`, `close-up`, `passionate`
3. In workspace, picks this from Characters tab → Position filter
4. Auto-assigns `role:position` slot
5. Prompt builder uses it as "position from Figure N" — the tags inform the user's text prompt, not the system prompt

### Tag Picker UI Change

Replace the current flat `COMMON_TAGS` chip list in PositionsGrid with a **grouped tag picker**:
- Collapsible sections by category (Composition, Interaction, Intimate, Action, etc.)
- Multi-select within and across groups
- Free-text custom tag input at the bottom
- Tags stored as flat array in DB (e.g., `['duo', 'kissing-deeply', 'close-up']`) — grouping is UI-only

### Implementation Changes

**1. Define tag groups** — New constant in `src/types/slotRoles.ts` or a new `src/types/positionTags.ts`:
```text
POSITION_TAG_GROUPS = {
  composition: ['solo', 'duo', 'group'],
  framing: ['full-body', 'half-body', 'close-up', ...],
  interaction: ['hugging', 'holding-hands', ...],
  intimate: ['kissing', 'kissing-deeply', 'cuddling', ...],
  action: ['dancing', 'fighting', 'massage', ...],
  mood: ['tender', 'passionate', 'playful', ...],
}
```

**2. Update PositionsGrid tag picker** — Replace flat chip list with grouped sections. Each group has a header and toggleable chips. Show intimate group with a subtle label/divider.

**3. Update ImagePickerDialog category filters** — Within the "Position" category on the Characters tab, add sub-filter chips for tag groups so users can narrow by `duo` + `intimate` to find kissing references quickly.

**4. Unify output_type values** (from previous audit):
- Merge `pose` → `position`, `outfit` → `clothing`
- Runtime normalization for legacy data
- Rename "Base Positions" → "Base Angles"

**5. No schema changes** — Tags remain a flat `text[]` column. Grouping is purely a UI concern.

### Files to Change

- `src/types/positionTags.ts` — New file: tag group definitions
- `src/components/character-studio-v3/PositionsGrid.tsx` — Grouped tag picker, unified output_types, rename Base Positions
- `src/components/storyboard/ImagePickerDialog.tsx` — Sub-filter chips within Position category
- `src/components/shared/SaveToCanonModal.tsx` — Align output_type labels
- `src/types/slotRoles.ts` — No changes needed (position role covers all)


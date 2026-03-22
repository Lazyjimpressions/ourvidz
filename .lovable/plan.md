

## Fix: Multi-Classification via Tags, Not Single output_type

### The Insight

Any reference image can serve multiple roles simultaneously. A photo of two characters kissing in bikinis on a beach is:
- **Position**: duo, kissing
- **Clothing**: bikini, swimwear
- **Scene**: beach, outdoor

Forcing one `output_type` per image is wrong. Tags should handle all classification.

### Approach

Keep `output_type` in the DB as the "primary" category (what the user initially uploaded it as — required NOT NULL column, avoids migration). But change how **filtering and tagging work**:

1. **Filter pills check tags TOO** — Currently `typeFilter` only checks `output_type`. Change it to: show an image under "Clothing" if `output_type === 'clothing'` OR if it has any clothing-related tag (`casual`, `formal`, `bikini`, `swimwear`, etc.).

2. **Tag editor shows ALL groups always** — Stop gating tag groups by `output_type`. Every canon image's tag popover shows all groups (Position, Clothing, Scene, etc.) — collapsed sections the user can expand and pick from. Adding a `bikini` tag to a position image automatically makes it appear under the Clothing filter too.

3. **No output_type selector in tag editor** — Remove the need to "reclassify" an image. Tags handle multi-classification naturally.

### Filter Logic Change

```text
Current:  show if output_type === filterValue
Proposed: show if output_type === filterValue 
          OR tags overlap with filterValue's tag vocabulary
```

Define a mapping: `FILTER_TAGS['clothing'] = ['casual', 'formal', 'bikini', ...]` etc. If any of an image's tags appear in that filter's vocabulary, the image appears under that filter.

### Tag Editor Change

Instead of showing only the groups for the image's `output_type`, show all groups in collapsible sections:

```text
▼ Position Tags
  Composition: solo, duo, group
  Body: standing, sitting, kneeling...
  Action: hugging, dancing, fighting...
  Intimate: kissing, cuddling, spooning...

▼ Clothing Tags  
  Style: casual, formal, bikini, armor...
  Season: summer, winter...

▼ Scene Tags
  Setting: indoor, outdoor, beach...
  Time: day, night, sunset...

▼ Mood
  tender, playful, passionate...
```

Groups with active tags auto-expand. Others collapsed by default.

### Files to Change

- `src/types/positionTags.ts` — Add `FILTER_TAG_VOCABULARY` mapping each filter to its tag list; add `ALL_TAG_GROUPS` combining all output type groups
- `src/components/character-studio-v3/PositionsGrid.tsx` — Update filter logic to check tags; update tag editor to show all groups with collapse; remove output_type gating in tag popover

### What This Enables

- Upload a kissing-on-beach image as "position"
- Tag it: `duo`, `kissing`, `bikini`, `outdoor`, `beach`
- It now appears under Position filter, Clothing filter, AND Scene filter
- No reclassification needed — tags are the truth


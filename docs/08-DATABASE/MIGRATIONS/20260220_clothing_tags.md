# Migration: clothing_tags Column

**Date:** February 20, 2026
**Migration ID:** `51e68cb7-b800-4ca4-8d80-4173d2ada679`
**File:** `20260220044335_51e68cb7-b800-4ca4-8d80-4173d2ada679.sql`

## Summary

Adds `clothing_tags` column to `characters` table to separate physical appearance attributes from outfit/clothing descriptors. This enables flexible outfit management independent of core character appearance.

## Migration SQL

```sql
ALTER TABLE public.characters
ADD COLUMN clothing_tags text[] DEFAULT '{}'::text[];
```

## Schema Impact

| Table | Column | Type | Default | Purpose |
|-------|--------|------|---------|---------|
| `characters` | `clothing_tags` | `text[]` | `'{}'::text[]` | Outfit/clothing descriptors |

## Tag Separation Logic

### Physical Appearance (`appearance_tags`)
- Hair color, style, length
- Eye color, facial features
- Body type, skin tone
- Permanent physical attributes

### Clothing/Outfit (`clothing_tags`)
- Current outfit, dress, attire
- Accessories (jewelry, glasses)
- Footwear
- Contextual/changeable items

## Related Files

### Database Types

**File:** `src/integrations/supabase/types.ts`

```typescript
interface Characters {
  // ...existing fields
  clothing_tags?: string[] | null;
}
```

### Frontend Components

**File:** `src/components/character-studio-v3/StudioSidebar.tsx`

Provides separate input sections:
- "Physical Appearance" - manages `appearance_tags`
- "Default Outfit" - manages `clothing_tags`

AI suggestions automatically categorize using keyword detection:

```typescript
const clothingKeywords = ['wearing', 'dress', 'shirt', 'blouse', 'jacket', ...];
for (const tag of suggestedAppearance) {
  if (clothingKeywords.some(kw => tag.toLowerCase().includes(kw))) {
    clothingTags.push(tag);
  } else {
    physicalTags.push(tag);
  }
}
```

### Prompt Builder

**File:** `src/utils/characterPromptBuilder.ts`

Portrait prompts include both tag types:

```typescript
// Add appearance tags (physical) - up to 6 tags
if (character.appearance_tags && character.appearance_tags.length > 0) {
  const cleanTags = character.appearance_tags
    .filter(tag => tag.trim().length > 2)
    .slice(0, 6);
  characterTokens.push(...cleanTags);
}

// Add clothing tags - up to 4 tags
if (character.clothing_tags && character.clothing_tags.length > 0) {
  const cleanClothingTags = character.clothing_tags
    .filter(tag => tag.trim().length > 2)
    .slice(0, 4);
  characterTokens.push(...cleanClothingTags);
}
```

### Edge Function

**File:** `supabase/functions/roleplay-chat/index.ts`

Scene generation fetches `clothing_tags` and constructs visual description:

```typescript
// Query includes clothing_tags (line 487)
user_character:characters!user_character_id(
  id, name, gender, appearance_tags, clothing_tags, ...
)

// Build appearance with outfit (lines 3170-3173)
const physicalAppearance = (sceneCharacter.appearance_tags || []).slice(0, 5).join(', ');
const outfitTags = sceneContext?.clothing || ((sceneCharacter as any).clothing_tags || []).join(', ');
const characterAppearance = outfitTags
  ? `${physicalAppearance}, wearing ${outfitTags}`
  : physicalAppearance;
```

## Backward Compatibility

- Default value `'{}'::text[]` ensures existing characters work without data migration
- UI gracefully handles `null` or empty arrays: `(character.clothing_tags || [])`
- No breaking changes to existing API contracts
- Existing characters have empty `clothing_tags` by default

## Data Migration (Optional)

To migrate existing appearance tags that are actually clothing:

```sql
-- Example: Move tags containing clothing keywords to clothing_tags
-- Run manually if needed, not part of automated migration

UPDATE characters
SET clothing_tags = ARRAY(
  SELECT unnest(appearance_tags) AS tag
  WHERE tag ILIKE ANY(ARRAY['%dress%', '%shirt%', '%jacket%', '%pants%', '%skirt%'])
),
appearance_tags = ARRAY(
  SELECT unnest(appearance_tags) AS tag
  WHERE NOT (tag ILIKE ANY(ARRAY['%dress%', '%shirt%', '%jacket%', '%pants%', '%skirt%']))
)
WHERE appearance_tags IS NOT NULL AND array_length(appearance_tags, 1) > 0;
```

---

## Scene Clothing Overrides (Feb 21, 2026)

### Additional Migration

**Migration ID:** `f1d4b051-8724-448c-ba43-dc2641df6b73`
**File:** `20260221043632_f1d4b051-8724-448c-ba43-dc2641df6b73.sql`

```sql
ALTER TABLE scenes ADD COLUMN default_clothing text;
ALTER TABLE scenes ADD COLUMN character_clothing_overrides jsonb DEFAULT '{}';
```

### New Columns on `scenes` Table

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `default_clothing` | `text` | `null` | Scene-wide default outfit for all characters |
| `character_clothing_overrides` | `jsonb` | `'{}'` | Per-character clothing overrides |

### character_clothing_overrides Structure

```typescript
{
  "char-uuid-1": "red evening dress, high heels",
  "char-uuid-2": "casual jeans and t-shirt"
}
```

### Clothing Priority Order

When building scene prompts, clothing is resolved in this priority (highest to lowest):

1. **AI-extracted clothing** - From character description analysis
2. **Per-character scene overrides** - `character_clothing_overrides[charId]`
3. **Scene default clothing** - `default_clothing`
4. **Character's default tags** - `character.clothing_tags`

### Related Files

**UI Components:**

- `src/components/roleplay/SceneCreationModal.tsx` - Scene Clothing section UI
- `src/hooks/useSceneCreation.ts` - Saves clothing fields to database

**Edge Function:**

- `supabase/functions/roleplay-chat/index.ts` - Applies clothing in prompt builder

```typescript
// Resolve clothing with priority
const resolveClothing = (characterId: string, sceneData: Scene) => {
  // Priority 1: Per-character override
  if (sceneData.character_clothing_overrides?.[characterId]) {
    return sceneData.character_clothing_overrides[characterId];
  }
  // Priority 2: Scene default
  if (sceneData.default_clothing) {
    return sceneData.default_clothing;
  }
  // Priority 3: Character default tags
  return character.clothing_tags?.join(', ') || '';
};
```

**Frontend Integration:**

- `src/pages/MobileRoleplayChat.tsx` - Passes clothing fields to edge function

### UI Implementation

SceneCreationModal includes:

1. **Scene Clothing** text input - Default outfit for all characters
2. **Per-Character Overrides** - Expandable section for character-specific clothing

---

## Testing Checklist

- [ ] Character creation with clothing tags
- [ ] Character editing with tag separation
- [ ] AI suggestions correctly split physical vs clothing
- [ ] Scene generation includes clothing in prompts
- [ ] Portrait generation includes both tag types
- [ ] Existing characters (pre-migration) work correctly
- [ ] Scene clothing overrides apply correctly
- [ ] Per-character overrides take priority over scene default
- [ ] Scene default takes priority over character tags

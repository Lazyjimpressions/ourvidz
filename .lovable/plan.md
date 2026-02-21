
# Clothing Tags for User Characters and Scene Overrides

## Overview

Two changes are needed:
1. User characters (role='user') need `clothing_tags` exposed in the UI -- the column already exists on the `characters` table but the `UserCharacter` interface and selector don't surface it.
2. Scene templates need a clothing override system so characters can be "dressed" appropriately per scene.

## Part 1: User Character Clothing Tags

The `characters` table already has a `clothing_tags` column (text array). User characters are stored in the same table (with `role='user'`). The fix is straightforward:

**`src/hooks/useUserCharacters.ts`**
- Add `clothing_tags?: string[]` to the `UserCharacter` interface

**`src/components/roleplay/UserCharacterSelector.tsx`**
- In the "Manage Characters" dialog, add an inline clothing tag editor (same pattern as StudioSidebar: badge list + input + add button)
- When tags are changed, update the character record via `supabase.from('characters').update({ clothing_tags })`

## Part 2: Scene Clothing Overrides

The `scenes` table (global scene templates) currently has no clothing columns. We need a flexible approach where:
- A scene can define a **general clothing context** (e.g., "swimwear, bikini" for a pool party) that applies to ALL characters by default
- Optionally, per-character overrides can be specified (stored in JSONB)

### Database Migration

Add two columns to the `scenes` table:

```sql
ALTER TABLE scenes ADD COLUMN default_clothing text;
ALTER TABLE scenes ADD COLUMN character_clothing_overrides jsonb DEFAULT '{}';
```

- `default_clothing` (text): General scene clothing applied to any character that doesn't have a specific override. E.g., "swimwear, bikini bottoms" for a pool party.
- `character_clothing_overrides` (jsonb): Optional per-character overrides. Structure: `{ "<character_id>": "formal suit and tie", "<user>": "board shorts" }`. The special key `"user"` applies to whoever the user character is.

### SceneCreationModal Changes

**`src/components/roleplay/SceneCreationModal.tsx`**
- Add a new "Scene Clothing" section after the existing Tags section:
  - A text input for "Default Clothing" with helper text: "What should characters generally wear in this scene? Leave empty to use each character's default outfit."
  - A collapsible "Character-Specific Overrides" section (for advanced use) where users can add key-value pairs (character name/role -> clothing description)
- Include `default_clothing` and `character_clothing_overrides` in the form data sent to `createScene`/`updateScene`

### Prompt Builder Integration

**`supabase/functions/roleplay-chat/index.ts`** (around line 3171)

Update the clothing priority chain:
```
1. sceneContext.clothing (extracted from AI narrative -- from prior plan)
2. scene template character_clothing_overrides[character_id] or [user]
3. scene template default_clothing
4. character.clothing_tags (character's default outfit)
```

This means: if the AI narrative describes specific clothing, use that. Otherwise check if the scene has a per-character override. Otherwise use the scene's general clothing. Otherwise fall back to the character's default outfit tags.

### Type Updates

**`src/types/roleplay.ts`**
- Add `default_clothing?: string` and `character_clothing_overrides?: Record<string, string>` to the `SceneTemplate` type

**`src/hooks/useSceneCreation.ts`**
- Add the new fields to `SceneFormData`

## Files to Change

| File | Change |
|------|--------|
| SQL migration | Add `default_clothing` and `character_clothing_overrides` to `scenes` table |
| `src/hooks/useUserCharacters.ts` | Add `clothing_tags` to `UserCharacter` interface |
| `src/components/roleplay/UserCharacterSelector.tsx` | Add clothing tag editor in manage dialog |
| `src/types/roleplay.ts` | Add clothing fields to `SceneTemplate` |
| `src/hooks/useSceneCreation.ts` | Add clothing fields to `SceneFormData` and save logic |
| `src/components/roleplay/SceneCreationModal.tsx` | Add Default Clothing input + character overrides UI |
| `supabase/functions/roleplay-chat/index.ts` | Update prompt builder clothing priority chain |

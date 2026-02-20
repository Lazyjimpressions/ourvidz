

# Split Appearance Tags into Physical + Clothing Sections

## The Idea

Instead of a complex vision pipeline, simply split the existing "Appearance" section in the Character Studio sidebar into two clearly labeled subsections:

1. **Physical Appearance** -- permanent traits (face, hair, eyes, body type)
2. **Default Outfit** -- clothing and accessories (can be overridden per scene)

This gives users one character they can place in any scenario. The scene prompt builder uses only the physical tags for identity and swaps clothing as needed.

## What Changes

### 1. Database: New `clothing_tags` Column

Add `clothing_tags text[]` to the `characters` table (nullable, defaults to empty array). The existing `appearance_tags` column stays but becomes "physical only."

### 2. Data Model: `CharacterData` Interface

**File: `src/hooks/useCharacterStudio.ts`**

- Add `clothing_tags: string[]` to `CharacterData`
- Add to default data, save/load logic

### 3. Sidebar UI: Split the Appearance Section

**File: `src/components/character-studio-v3/StudioSidebar.tsx`**

The current Appearance collapsible has:
- Visual Description (textarea)
- Tags (single chip input)
- Style Lock (reference image)

Replace "Tags" with two sub-sections:

```
Appearance (collapsible)
  |-- Visual Description (textarea, unchanged)
  |-- Physical Tags: "auburn hair, green eyes, athletic"
  |     [chip input, same UX as current tags]
  |-- Default Outfit: "leather jacket, jeans, boots"
  |     [chip input, same UX]
  |-- Style Lock (reference image, unchanged)
```

Both use the same chip input pattern already in place -- just duplicated with different state (`appearance_tags` vs `clothing_tags`).

### 4. Scene Prompt Builder: Use Physical Only, Override Clothing

**File: `supabase/functions/roleplay-chat/index.ts`**

Line 3109 currently does:
```typescript
const characterAppearance = (sceneCharacter.appearance_tags || []).slice(0, 5).join(', ');
```

Change to:
```typescript
const physicalTags = (sceneCharacter.appearance_tags || []).slice(0, 5).join(', ');
const outfitTags = sceneContext.clothing || (sceneCharacter.clothing_tags || []).join(', ');
const characterAppearance = outfitTags
  ? `${physicalTags}, wearing ${outfitTags}`
  : physicalTags;
```

This means:
- If the LLM scene extraction detects specific clothing in the narrative, use that
- Otherwise fall back to the character's default outfit tags
- Physical tags always included for identity

### 5. Prompt Builder Utility

**File: `src/utils/characterPromptBuilder.ts`**

Update `buildCharacterVisualDescription()` to accept and separate `clothing_tags` from `appearance_tags` so portrait generation can still use both, while scene generation uses them selectively.

### 6. AI Suggestion Integration

**File: `src/components/character-studio-v3/StudioSidebar.tsx`**

The "Suggest" button for appearance currently populates `appearance_tags`. Update the suggestion handler to split AI suggestions into physical vs. clothing categories. The `suggest-character` edge function already returns mixed tags -- we just need a simple client-side filter (keywords like "wearing", "dress", "shirt", "jacket", "boots" go to clothing; everything else to physical).

### 7. Fetch Query Updates

**File: `supabase/functions/roleplay-chat/index.ts`**

Add `clothing_tags` to the character SELECT query (line ~426) so it's available during scene prompt building.

## Migration Strategy

For existing characters that already have mixed tags in `appearance_tags`:
- No automatic migration needed
- Users can manually move clothing tags to the new section
- Both sections work independently -- old characters with mixed tags still function, just less optimally

## Impact Summary

| Area | Change | Risk |
|------|--------|------|
| DB | Add `clothing_tags` column | None (additive) |
| Sidebar UI | Split tags into two chip inputs | Low |
| Scene prompts | Use physical only + clothing override | Low |
| Portrait prompts | Use both (unchanged behavior) | None |
| AI suggestions | Client-side tag categorization | Low |


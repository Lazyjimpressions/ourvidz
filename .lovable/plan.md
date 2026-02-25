
# Add Character Type (User/AI) Selector to Character Studio

## Overview
Add a "Type" dropdown to the Character Studio sidebar so users can set a character as either "AI" (companion) or "User" (persona they play as). This uses the existing `role` column in the `characters` table -- no database changes needed.

## Changes

### 1. Add `role` to `CharacterData` interface
**File**: `src/hooks/useCharacterStudio.ts`
- Add `role: 'user' | 'ai'` to the `CharacterData` interface
- Add `role: 'ai'` to `defaultCharacterData`
- Map `data.role` when loading a character (in `loadCharacter`, around line 149)
- Include `character.role` in the save payload instead of the static `defaultRole` (line 269)

### 2. Add Type selector to StudioSidebar
**File**: `src/components/character-studio-v3/StudioSidebar.tsx`
- Add a "Type" select dropdown in the Basic Info section, alongside the existing Gender and Rating grid
- Change the grid from `grid-cols-2` to `grid-cols-3` to fit Gender, Rating, and Type
- Options: "AI" (companion character) and "User" (your persona)

```text
Basic Info
+-------------------+
| Name              |
+--------+----+-----+
| Gender | Rating | Type |
+--------+--------+------+
| Description        |
+--------------------+
```

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/useCharacterStudio.ts` | Add `role` to `CharacterData`, load it, save it |
| `src/components/character-studio-v3/StudioSidebar.tsx` | Add Type selector in Basic Info section |

No new database columns, tables, or edge functions required. The `role` column already exists on the `characters` table with a default of `'ai'`.

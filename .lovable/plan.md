

# Fix Character Studio Save Errors and Add Clear Suggestions

## Problem Summary

1. The AI suggestions edge function returns long strings for `voice_tone` (e.g., "warm and inviting with a hint of playfulness") but the database column is `varchar(50)`, causing every auto-save to fail with "value too long".
2. The auto-save fires every 2 seconds on dirty state, creating a loop of failed saves and error toasts.
3. There is no way to clear or undo AI-generated suggestions once applied.

## Plan

### 1. Widen the `voice_tone` and `mood` columns (Database Migration)

Change both columns from `varchar(50)` to `text` so they can accept any length of AI-generated content. This is the safest fix since these are free-form descriptors, not enums.

```sql
ALTER TABLE characters ALTER COLUMN voice_tone TYPE text;
ALTER TABLE characters ALTER COLUMN mood TYPE text;
```

### 2. Add client-side truncation as a safety net

In `useCharacterStudio.ts`, truncate `voice_tone` and `mood` in the save payload to prevent future DB errors from any source. This is a defensive measure even after widening the columns.

### 3. Stop auto-save error toast spam

In `CharacterStudioV3.tsx`, update the auto-save effect: if save fails silently, don't re-trigger on every tick. Add a flag to skip re-save after a failure until the user makes a new edit.

### 4. Add "Clear Suggestions" functionality

In `StudioSidebar.tsx`:
- Track a snapshot of the character state before any suggestion is applied.
- After a suggestion is applied, show an "Undo" button next to the "Suggestion Applied" toast or inline near the Suggest button.
- Clicking "Undo" restores the pre-suggestion snapshot.
- Add a "Clear AI Fields" option that resets `traits`, `persona`, `voice_tone`, `mood`, `appearance_tags`, and `description` back to empty/defaults.

---

## Technical Details

### File Changes

**Database Migration**
- `ALTER TABLE characters ALTER COLUMN voice_tone TYPE text;`
- `ALTER TABLE characters ALTER COLUMN mood TYPE text;`

**`src/hooks/useCharacterStudio.ts`**
- In `saveCharacter`, add defensive truncation: if `voice_tone` or `mood` exceed 50 chars and the column is still varchar, truncate. (After migration this is just a safety net.)
- Add a `clearSuggestions` callback that resets AI-populated fields to their defaults/empty values and exposes it from the hook.

**`src/pages/CharacterStudioV3.tsx`**
- Add a `saveFailedRef` that gets set `true` on silent save failure and `false` when the user makes a new edit. The auto-save effect skips if `saveFailedRef.current` is true.

**`src/components/character-studio-v3/StudioSidebar.tsx`**
- Store a `preSuggestionSnapshot` ref before calling `fetchSuggestions`.
- After a successful suggestion, show an inline "Undo" text button that restores the snapshot.
- Add a "Clear AI" button (small, near the "Enhance All" suggest button) that calls the new `clearSuggestions` function from the hook.


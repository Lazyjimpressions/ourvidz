# Conversation Initiation Fix

**Date:** 2026-01-10
**Status:** Fixed
**Priority:** CRITICAL

---

## Problem

Conversation initiation was failing after implementing the scene template prompt fix.

---

## Root Cause

A duplicate `isFirstScene` variable declaration was created, shadowing the existing variable:

1. **Original variable** (line 2188): `let isFirstScene = true;` - Properly calculated based on previous scene data
2. **Duplicate variable** (line 2621): `const isFirstScene = !previousSceneId && !previousSceneImageUrl;` - Simple check that didn't account for database queries

**Result:** The template prompt logic at line 2635 (`else if (sceneTemplatePrompt && isFirstScene)`) was using the wrong variable, causing incorrect behavior.

---

## Fix

Removed the duplicate declaration and use the existing `isFirstScene` variable that's properly calculated earlier in the function.

**Before:**
```typescript
// Line 2188: Original variable
let isFirstScene = true;
// ... complex logic to determine isFirstScene ...

// Line 2621: DUPLICATE - shadows original
const isFirstScene = !previousSceneId && !previousSceneImageUrl;

// Line 2635: Uses the duplicate (wrong one)
else if (sceneTemplatePrompt && isFirstScene) {
```

**After:**
```typescript
// Line 2188: Original variable
let isFirstScene = true;
// ... complex logic to determine isFirstScene ...

// Line 2621: Comment explaining to use existing variable
// ✅ CRITICAL FIX: isFirstScene is already determined earlier in the function (line 2188)
// Use the existing variable - don't redeclare it

// Line 2635: Uses the original (correct one)
else if (sceneTemplatePrompt && isFirstScene) {
```

---

## Testing

1. **Kickoff with Scene Template:**
   - Select scene template
   - Start conversation
   - Verify conversation initiates successfully
   - Verify first scene uses template prompt

2. **Kickoff without Scene Template:**
   - Start conversation without scene
   - Verify conversation initiates successfully
   - Verify scene generation works from dialogue

3. **Subsequent Messages:**
   - Send message after kickoff
   - Verify scene generation works
   - Verify I2I continuity works

---

## Files Modified

1. `supabase/functions/roleplay-chat/index.ts`
   - Removed duplicate `isFirstScene` declaration
   - Added comment explaining to use existing variable

---

## Related Documentation

- [SCENE_TEMPLATE_PROMPT_FIX.md](./SCENE_TEMPLATE_PROMPT_FIX.md) - Original template prompt fix

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Fixed duplicate variable declaration breaking conversation initiation | Claude |

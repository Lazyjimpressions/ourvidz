# Scene Template Prompt Fix

**Date:** 2026-01-10
**Status:** Critical Design Fix Implemented
**Priority:** CRITICAL

---

## Problem Identified

The scene template's `scene_prompt` (from `scenes` table) was being passed as `scene_context` to the edge function but **NOT used for image generation**. Instead, the system was:

1. Using `scene_context` only for character behavior (system prompt)
2. Generating a NEW scene narrative from character dialogue
3. Completely ignoring the carefully crafted template prompt

**Result:** Generated images didn't match the selected scene template.

---

## Design Logic (How It Should Work)

### Opening Scene (First Scene in Conversation)

**Flow:**
1. User selects scene template from `scenes` table
2. Template has `scene_prompt` (for image generation) and `scene_description` (for context)
3. Frontend passes:
   - `scene_context: scene.scene_prompt` → Used for character behavior
   - `scene_description: scene.description` → Used for character context
4. **Edge Function Should:**
   - Use template's `scene_prompt` as PRIMARY source for first scene image
   - Combine with character visual description
   - Apply scene style (character_only, pov, both_characters)
   - Only generate NEW narrative if template doesn't have `scene_prompt`

**Example:**
- Template `scene_prompt`: "A steamy locker room shower, warm water streaming down, tiled walls, misty atmosphere"
- Character: Mary (auburn hair, green eyes)
- **Generated Image Prompt**: "Mary stands in a steamy locker room shower, warm water streaming down her auburn hair, tiled walls surrounding her, misty atmosphere creating an intimate setting"

### Subsequent Scenes (Scene Continuity)

**Flow:**
1. Previous scene image exists (stored in `character_scenes`)
2. Scene continuity enabled → Use I2I with previous scene
3. **Edge Function Should:**
   - Use I2I with previous scene image
   - Reference original template context for consistency
   - Generate MINIMAL narrative describing only what changes
   - Maintain template's setting/location

**Example:**
- Previous scene: "Mary stands in steamy locker room shower..."
- Character dialogue: "She moves closer, her hand reaching out..."
- **Generated Image Prompt**: "Mary moves closer in the steamy locker room shower, her hand reaching out, water still streaming down her body" (only describes what changes)

---

## Implementation

### 1. Added Template Prompt Parameter ✅

**Function Signature:**
```typescript
async function generateScene(
  // ... existing params ...
  sceneTemplatePrompt?: string,  // ✅ NEW: scene_prompt from scenes table template
  // ...
)
```

### 2. First Scene Logic ✅

**Priority Order:**
1. `scenePromptOverride` (user-edited, regeneration) → Use directly
2. `sceneTemplatePrompt` + `isFirstScene` → Use template prompt, combine with character
3. `useI2IIteration` + previous scene → Generate minimal narrative for I2I
4. Fallback → Generate new narrative from dialogue

**Code:**
```typescript
if (scenePromptOverride) {
  scenePrompt = scenePromptOverride;
} else if (sceneTemplatePrompt && isFirstScene) {
  // ✅ FIRST SCENE: Use template's scene_prompt
  if (sceneTemplatePrompt.toLowerCase().includes(character.name.toLowerCase())) {
    scenePrompt = sceneTemplatePrompt; // Template already includes character
  } else {
    scenePrompt = `${character.name} ${sceneTemplatePrompt}`; // Add character name
  }
  // Clean up (remove quotes, greetings, etc.)
  scenePrompt = scenePrompt.replace(/^["']|["']$/g, '').replace(/^(Hello|Hi|Hey),?\s+/i, '').trim();
} else {
  // Generate AI narrative...
}
```

### 3. Template Context Storage ✅

**Metadata Storage:**
- Store `scene_template_prompt` in `generation_metadata`
- Reference for subsequent I2I scenes
- Maintains original template context

### 4. Subsequent Scene Reference ✅

**I2I Scene Enhancement:**
- Retrieve `scene_template_prompt` from previous scene metadata
- Include in prompt as "Original Template Context"
- Helps maintain consistency with original scene template

---

## Expected Results

### Before (Current - Broken)
- Template: "A steamy locker room shower, warm water streaming..."
- Character Dialogue: "Hello, there! I'm Sally. You wouldn't believe..."
- Generated: "Mary stands on rooftop, city lights, black dress" ❌

### After (Fixed)
- Template: "A steamy locker room shower, warm water streaming..."
- Character Dialogue: "Hello, there! I'm Sally. You wouldn't believe..."
- Generated: "Mary stands in a steamy locker room shower, warm water streaming down her auburn hair, tiled walls surrounding her, misty atmosphere" ✅

---

## Testing

### Test Case 1: First Scene with Template
1. Select scene template with `scene_prompt`
2. Start conversation
3. Verify generated image matches template prompt
4. Verify character description is combined correctly

### Test Case 2: Subsequent Scene with I2I
1. Generate first scene from template
2. Continue conversation
3. Generate second scene
4. Verify I2I uses previous scene
5. Verify location/setting maintained from template

### Test Case 3: Scene Without Template
1. Start conversation without scene template
2. Generate scene from dialogue
3. Verify AI narrative generation works (fallback)

---

## Files Modified

1. `supabase/functions/roleplay-chat/index.ts`
   - Added `sceneTemplatePrompt` parameter to `generateScene()`
   - Added first scene logic to use template prompt
   - Store template prompt in metadata
   - Reference template prompt in I2I scenes

---

## Related Documentation

- [SCENE_GENERATION_DESIGN_ANALYSIS.md](./SCENE_GENERATION_DESIGN_ANALYSIS.md) - Design analysis
- [SCENE_CONTEXT_EXTRACTION_FIX.md](./SCENE_CONTEXT_EXTRACTION_FIX.md) - Context extraction fixes

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Critical fix: Use template scene_prompt for first scene | Claude |

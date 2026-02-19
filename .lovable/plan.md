

# Fix: Scene Prompt Putting Character Actions in SETTING Block (Causing Duplicate Characters)

## Problem

The image model renders the same character twice because Figure 1 (SETTING) contains **character actions and dialogue** ("My smile spreads, genuine and eager...", "I sigh softly...") alongside the setting info. The model interprets these first-person descriptions as a separate character presence in the scene.

The `stripCharacterFromScenePrompt` helper only removes the character's **name** but leaves all first-person action text intact. The real issue is upstream: the "direct action extraction" path (line 2821) mixes setting and actions into a single `scenePrompt` string.

### Current flow (broken)

```text
scenePrompt = "spa. My smile spreads, genuine and eager... I sigh softly..."
                ^^^                                         
              setting         character actions (should NOT be here)

SETTING (Figure 1): spa. My smile spreads, genuine and eager...  <-- character here
CHARACTER (Figure 2): tammy, asian beauty...                     <-- AND here
ACTION: My smile spreads, genuine and eager...                   <-- AND here again
```

### Desired flow

```text
SETTING (Figure 1): Spa. The mood is playful.                   <-- environment only
CHARACTER (Figure 2): tammy, asian beauty...                     <-- identity only  
ACTION: My smile spreads, genuine and eager...                   <-- actions only
```

## Fix

### 1. Separate setting from actions at the source (line 2815-2823)

Change the "direct action extraction" path so `scenePrompt` contains **only setting + mood**, not actions. Actions will be used exclusively in the ACTION block of the Figure template.

**Before:**
```typescript
const actionsSummary = sceneContext.actions.slice(0, 3).join('. ');
const setting = sceneContext.setting || 'the scene';
const mood = sceneContext.mood || 'engaging';
const visuals = sceneContext.visualElements?.slice(0, 3).join(', ') || '';
scenePrompt = `${setting}. ${actionsSummary}. ${visuals ? `Visual details: ${visuals}.` : ''} The mood is ${mood}.`;
```

**After:**
```typescript
const setting = sceneContext.setting || 'the scene';
const mood = sceneContext.mood || 'engaging';
const visuals = sceneContext.visualElements?.slice(0, 3).join(', ') || '';
// SETTING only -- actions go into the ACTION block of Figure template
scenePrompt = `${setting}. ${visuals ? `Visual details: ${visuals}.` : ''} The mood is ${mood}.`;
```

### 2. Use richer actions in the ACTION block (lines 3127-3145)

Update the character_only and POV templates to pull multiple actions (not just `actions[0]`) into the ACTION block, since we removed them from the SETTING.

**Before:**
```typescript
ACTION: ${sceneContext?.actions?.[0] || 'Character in scene naturally'}
```

**After:**
```typescript
ACTION: ${sceneContext?.actions?.slice(0, 2).join('. ') || 'Character in scene naturally'}
```

### 3. Improve `stripCharacterFromScenePrompt` to also strip first-person language

Even with the source fix, the fallback and narrative paths may still embed character actions. Enhance the helper to strip first-person action patterns:

```typescript
// Remove first-person action phrases (I smile, My eyes, I sigh, etc.)
cleaned = cleaned.replace(/\b(I|My|Me)\s+\w+[^.]*\./gi, '');
// Remove character dialogue/emotes wrapped in asterisks
cleaned = cleaned.replace(/\*[^*]+\*/g, '');
```

### 4. Cap the total prompt length

After composing the full Figure-notation prompt, cap it at 500 characters to keep prompts focused. Currently the 598-char prompt is mostly redundant action text.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/roleplay-chat/index.ts` | Separate setting from actions in direct extraction path; improve `stripCharacterFromScenePrompt` to remove first-person language; use `actions.slice(0,2)` in ACTION block |

Redeploy `roleplay-chat` after changes.


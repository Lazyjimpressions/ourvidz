
# Intelligent Prompt Mode: T2I vs I2I Auto-Detection

## Core Insight

The user's workflow has two distinct phases, and the system should automatically adapt without requiring a toggle:

**Phase 1 -- Brainstorming (T2I or early I2I):** User is exploring looks. Style boilerplate helps here because there's no locked identity yet.

**Phase 2 -- Directing (I2I with Style Lock):** User has locked a look and now wants to direct the character: outfits, scenes, poses, companions. The prompt should ONLY describe what changes. Style boilerplate actively hurts because it fights the reference image.

The presence of a reference image IS the signal. No toggle needed.

## What Changes

### 1. Edge function: Stop injecting style boilerplate during I2I

**File: `supabase/functions/character-portrait/index.ts`**

Current prompt build (lines 151-189) always injects:
- `masterpiece, best quality, photorealistic` (line 151)
- `1girl, beautiful woman, portrait` (lines 155-161)
- `maintain same character identity, consistent features` (line 185)
- `studio photography, professional lighting, sharp focus, detailed face` (line 189)

New behavior based on mode:

**T2I (no reference image):** Keep all style tags. They establish quality when there's no visual anchor.

**I2I (reference image present):** Strip ALL style boilerplate. Build prompt as:
- Gender tag only if helpful for model routing (e.g., `1girl`)
- Appearance tags (identity descriptors -- hair color, eye color, etc.)
- User's `promptOverride` text (the directorial instruction)
- Nothing else. No `masterpiece`, no `studio photography`, no `maintain same character identity` (the reference image handles identity).

Also: when I2I and `referenceStrength` is not explicitly set, default to **0.75** instead of 0.65 to give the reference more weight during directed generation.

### 2. Prompt bar: Context-aware placeholder text

**File: `src/components/character-studio/CharacterStudioPromptBar.tsx`**

Change the placeholder dynamically based on whether a reference is locked:

- **No reference:** `"Describe the character you want to generate..."`
- **Reference locked:** `"Describe changes: outfit, scene, pose, companions..."`

This guides the user to write directorial prompts ("wearing a red dress in a park with her boyfriend") instead of re-describing identity.

### 3. Prompt bar: Smart Sparkle adapts to I2I context

**File: `src/components/character-studio/CharacterStudioPromptBar.tsx`**

Update the auto-fill behavior (the Sparkle button, first click) when a reference is locked:

- **No reference (current):** Assembles `"Portrait of Tammy, female, long blonde hair, blue eyes..."`
- **Reference locked (new):** Assembles a shorter directorial seed: `"Tammy, casual outfit, natural pose"` -- just enough to start, without re-describing identity traits that the reference already encodes.

### 4. Edge function: Pass mode metadata for logging

Store `generation_intent: 'explore' | 'direct'` in the job metadata so we can track how often each mode is used and correlate with quality ratings.

---

## User Experience After Changes

```text
Phase 1: Brainstorming
  User types: "anime girl with silver hair and red eyes"
  No ref locked -> T2I mode
  Edge function adds style tags -> high quality base generation
  User iterates, finds a look they like
  User clicks Lock icon on the portrait

Phase 2: Directing (ref locked)
  Placeholder now reads: "Describe changes: outfit, scene, pose..."
  User types: "wearing a black cocktail dress at a rooftop bar"
  Edge function sends ONLY: "1girl, silver hair, red eyes, wearing a black cocktail dress at a rooftop bar"
  Reference image (0.75 strength) preserves face/style
  Result: same character, new outfit and scene

  User types: "walking in a park with a tall man holding hands"
  Same clean prompt, reference dominates identity
  Result: character with companion in new scene
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/character-portrait/index.ts` | Conditional prompt build: T2I gets style tags, I2I gets clean directorial prompt only |
| `src/components/character-studio/CharacterStudioPromptBar.tsx` | Dynamic placeholder based on ref state; adjusted Sparkle auto-fill for I2I context |

## Why No Toggle

The PRD Column C "Generation Driver" says the prompt "describes pose, outfit, environment, framing" and "does not redefine identity." This is exactly I2I behavior -- the reference IS the identity. A toggle would add cognitive load for something the system can infer automatically. If a reference is locked, the user is directing. If not, they're exploring. The system should just know.

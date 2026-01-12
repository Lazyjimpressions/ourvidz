# Sanitization Rules Documentation

**Date:** 2026-01-11  
**Purpose:** Document all sanitization rules applied to prompts before sending to image generation APIs

## Location

The sanitization function is located in **two places**:

1. **`supabase/functions/roleplay-chat/index.ts`** (lines 1995-2052)
   - Function: `sanitizePromptForFalAI(prompt: string): string`
   - Used for: Scene generation prompts in roleplay chat

2. **`supabase/functions/fal-image/index.ts`** (lines 14-66)
   - Function: `sanitizePromptForFalAI(prompt: string): string`
   - Used for: Direct fal.ai image generation requests

## Sanitization Rules

### 1. Age Descriptor Patterns
**Purpose:** Remove/replace problematic age descriptors that trigger content policy violations when combined with suggestive language.

| Pattern | Replacement |
|---------|-------------|
| `teen`, `teenage`, `adolescent`, `youthful teen`, `young teen` | `young adult` |
| `fresh faced youthful` | `fresh faced` |
| `innocent but forever curious` | `curious and engaging` |
| `innocent but` | (removed) |

### 2. Suggestive Language Patterns
**Purpose:** Replace suggestive language with neutral alternatives to avoid content policy violations.

| Pattern | Replacement |
|---------|-------------|
| `shy smile dances on her lips` | `gentle smile` |
| `fingers playfully tracing` | `hands resting` |
| `heart racing with a mix of excitement and anticipation` | `expressive demeanor` |
| `heart racing` | `falling in love` |
| `leaning in` | `positioned nearby` |
| `playfully tracing` | `resting on` |
| `playfully` | `gently` |
| `dances on` | `appears on` |
| `racing with` | `showing` |

### 3. Emotional/Physical State Patterns
**Purpose:** Remove overly descriptive emotional/physical states that could be flagged.

| Pattern | Replacement |
|---------|-------------|
| `mix of excitement and anticipation` | `engaged expression` |
| `excitement and anticipation` | `engagement` |
| `anticipation` | `interest` |

### 4. Cleanup Rules
**Purpose:** Normalize and clean up the prompt text.

- **Multiple spaces**: Replaced with single space
- **Redundant phrases**: 
  - `young adult adult` → `young adult`
  - `adult adult` → `adult`
- **Trim**: Remove leading/trailing whitespace

## Usage in Code

### In `roleplay-chat/index.ts`:
```typescript
// Line 3144
const sanitizedPrompt = sanitizePromptForFalAI(enhancedScenePrompt);
```

### In `fal-image/index.ts`:
```typescript
// Applied before sending prompt to fal.ai API
const sanitizedPrompt = sanitizePromptForFalAI(body.prompt);
```

## Important Notes

1. **"animated expression" Issue**: The sanitization replaces "heart racing" with "animated expression", but this can cause unwanted animation in images. This is now cleaned up in the scene narrative cleanup (line 2448 in `roleplay-chat/index.ts`).

2. **Content Policy Compliance**: These rules are based on fal.ai's content policy: https://docs.fal.ai/errors#content_policy_violation

3. **Order Matters**: Rules are applied in order - age patterns first, then suggestive language, then emotional patterns, then cleanup.

## Future Improvements

Consider:
- Making sanitization rules configurable via database
- Adding more context-aware replacements
- Tracking which rules are triggered most often
- Allowing selective rule application based on content tier (SFW vs NSFW)

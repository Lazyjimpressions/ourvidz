# Scene Narrative Template Audit & Improvement Plan

**Date:** 2026-01-10
**Status:** Analysis Complete - Ready for Implementation
**Priority:** HIGH - Core UX Quality Issue

---

## Executive Summary

The current scene narrative templates are generating verbose, first-person character dialogue instead of concise, third-person scene descriptions optimized for image generation. This audit analyzes the problem and proposes comprehensive improvements.

---

## Problem Analysis

### Current Output Example

```
Hello, there! I'm Sally. You wouldn't believe the kind of day I've had. 
It was one of those days where it felt like all the stars were aligned 
against me, you know? I just finished wrapping things up here at the 
office and was about to call it a night, but something told me I needed 
a little adventure. Here I am now, though, feeling kind of vulnerable 
under these dim lights. As I surveyed the room, my eyes were drawn to 
the desk lamp casting a warm glow over the polished wooden floors. It 
almost felt like it was beckoning me closer... I couldn't resist its 
charm. With a soft smile, I began to walk towards it. The air 
conditioning hummed softly in the background, but other than that, 
everything seemed to fall silent. The bustling cityscape visible through 
the large windows grew fuzzy with each step I took.
```

### Issues Identified

1. **Wrong Perspective**: First-person character voice instead of third-person scene description
2. **Too Verbose**: ~200 words vs. target 2-4 sentences (40-80 words)
3. **Dialogue Mixed In**: "Hello, there! I'm Sally" is character dialogue, not scene description
4. **Internal Monologue**: "You wouldn't believe..." is character thinking, not visual description
5. **Not Image-Optimized**: Focuses on character thoughts/feelings rather than visual elements
6. **Missing Visual Focus**: Should emphasize setting, lighting, positioning, clothing state for image generation

---

## Current Template Analysis

### Scene Narrative - NSFW Template

**Current System Prompt:**
```
You are an expert narrative writer specializing in creating immersive, 
sensual scene descriptions for adult roleplay scenarios.

Your task is to transform scene prompts into rich, engaging narrative 
descriptions that set the stage for intimate character interactions.

CHARACTER CONTEXT:
{{character_name}}: {{character_description}}
{{character_personality}}

GUIDELINES:
- Write in third-person narrative style with sensual undertones
- Focus on setting, atmosphere, and character positioning
- Include sensory details (lighting, textures, scents, temperature)
- Describe the physical environment and intimate mood
- Position characters naturally within the scene
- Use tasteful, evocative language without being explicit
- Create tension and anticipation
- Length: 2-4 sentences maximum
- Write as if beginning an intimate story chapter

EXAMPLE OUTPUT:
"Soft candlelight danced across the silk sheets as {{character_name}} 
reclined against the plush pillows, their eyes reflecting the flickering 
amber glow. The room was filled with the subtle scent of vanilla and 
warmth, creating an intimate sanctuary away from the world. They traced 
their fingers along the smooth fabric, their gaze inviting and full of 
unspoken promises."

Transform the user's scene prompt into an immersive, sensual narrative 
description following these guidelines.
```

### Problems with Current Template

1. **Ambiguous Instructions**: "Write as if beginning an intimate story chapter" encourages narrative prose, not image prompts
2. **Example is Good, But**: The example is correct, but the model isn't following it
3. **Too Much Context**: The prompt includes too much conversation history, causing the model to generate dialogue
4. **Missing Constraints**: No explicit prohibition against first-person, dialogue, or internal monologue
5. **Weak Enforcement**: "2-4 sentences maximum" is not enforced strongly enough

---

## Root Cause Analysis

### Why First-Person Dialogue is Generated

1. **Conversation Context Overload**: The prompt includes 10 messages of conversation history, which biases the model toward dialogue
2. **Character Personality Injection**: `{{character_personality}}` may include first-person examples or dialogue patterns
3. **Weak Template Constraints**: Template doesn't explicitly forbid dialogue or first-person
4. **Model Confusion**: The model sees conversation history and thinks it should generate character speech

### Why It's Too Verbose

1. **Max Tokens Too High**: Currently 150 tokens allows for 200+ words
2. **No Length Enforcement**: Template says "2-4 sentences" but doesn't enforce it
3. **Temperature Too High**: 0.7 allows too much creativity/verbosity
4. **No Post-Processing**: No truncation or summarization after generation

---

## Proposed Solutions

### Solution 1: Strengthen Template Constraints

**Improved Scene Narrative - NSFW Template:**

```
You are a scene description generator for image generation. Your ONLY task 
is to create concise, visual scene descriptions optimized for image models.

CRITICAL RULES:
1. Write ONLY in third-person (never first-person)
2. NO character dialogue or speech (no quotes, no "I said", no greetings)
3. NO internal monologue or character thoughts
4. Focus ONLY on visual elements: setting, lighting, positioning, clothing, expressions
5. Length: EXACTLY 2-3 sentences, 40-60 words total
6. Start directly with the scene description (no "A scene showing..." prefix)

CHARACTER CONTEXT:
{{character_name}}: {{character_description}}
{{character_personality}}

SCENE CONTEXT:
Setting: {{setting}}
Mood: {{mood}}
Actions: {{actions}}
Positioning: {{positioning}}

OUTPUT FORMAT:
[Character name] [action/position] in [setting]. [Lighting/atmosphere details]. 
[Clothing/appearance state]. [Expression/interaction if applicable].

EXAMPLE OUTPUT:
"Sally sits at her desk in a dimly lit office, the warm glow of a desk 
lamp casting shadows across polished wooden floors. She wears a blouse 
and skirt, her expression thoughtful as she looks toward the window 
where city lights blur in the distance."

CONVERSATION CONTEXT (for reference only - DO NOT include dialogue):
{{conversation_context}}

Generate ONLY the scene description. Do NOT include character dialogue, 
thoughts, or first-person narration.
```

**Key Changes:**
- Explicit prohibition of first-person, dialogue, internal monologue
- Stronger length constraint (40-60 words, not 2-4 sentences)
- Output format template to guide structure
- Conversation context marked as "reference only"
- More direct, image-generation focused language

### Solution 2: Reduce Max Tokens & Temperature

**Current Settings:**
```typescript
max_tokens: 150,  // Too high - allows 200+ words
temperature: 0.7,  // Too creative - allows verbosity
```

**Proposed Settings:**
```typescript
max_tokens: 80,   // Enforces 40-60 word limit
temperature: 0.5, // More focused, less creative
top_p: 0.9,       // Slightly tighter sampling
frequency_penalty: 0.3,  // Discourage repetition
presence_penalty: 0.2    // Encourage conciseness
```

### Solution 3: Post-Processing & Validation

Add validation and truncation after generation:

```typescript
// Validate and clean generated narrative
function validateSceneNarrative(narrative: string): string {
  // Remove first-person indicators
  narrative = narrative.replace(/^I\s+/gi, 'The character ');
  narrative = narrative.replace(/\bI\s+(am|was|feel|think|see)\b/gi, 'they $1');
  
  // Remove dialogue/quotes
  narrative = narrative.replace(/["']([^"']+)["']/g, '');
  narrative = narrative.replace(/^(Hello|Hi|Hey),?\s+/i, '');
  
  // Remove internal monologue markers
  narrative = narrative.replace(/\b(you wouldn't believe|I thought|I felt|I knew)\b/gi, '');
  
  // Truncate to 60 words max
  const words = narrative.split(/\s+/);
  if (words.length > 60) {
    narrative = words.slice(0, 60).join(' ') + '.';
  }
  
  // Ensure third-person
  if (narrative.match(/^[Ii]\s+/)) {
    narrative = 'The character ' + narrative.substring(1);
  }
  
  return narrative.trim();
}
```

### Solution 4: Enhanced Scene Table Fields

Add fields to `scenes` table to better guide generation:

```sql
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS scene_focus TEXT;
-- Values: 'setting', 'character', 'interaction', 'atmosphere'
-- Guides what aspect to emphasize

ALTER TABLE scenes ADD COLUMN IF NOT EXISTS narrative_style TEXT DEFAULT 'concise';
-- Values: 'concise', 'detailed', 'atmospheric'
-- Controls verbosity level

ALTER TABLE scenes ADD COLUMN IF NOT EXISTS visual_priority TEXT[];
-- Array of visual elements to prioritize: ['lighting', 'clothing', 'positioning', 'setting']
-- Guides what to emphasize in description

ALTER TABLE scenes ADD COLUMN IF NOT EXISTS perspective_hint TEXT;
-- Values: 'third_person', 'pov', 'observer'
-- Explicitly guides perspective (prevents first-person)

ALTER TABLE scenes ADD COLUMN IF NOT EXISTS max_words INTEGER DEFAULT 60;
-- Override default word limit per scene
```

**Usage in Template:**
```typescript
const sceneFocus = scene.scene_focus || 'setting';
const narrativeStyle = scene.narrative_style || 'concise';
const visualPriority = scene.visual_priority || ['setting', 'lighting', 'positioning'];
const maxWords = scene.max_words || 60;

const focusInstruction = `Focus primarily on ${sceneFocus}. Emphasize: ${visualPriority.join(', ')}.`;
const styleInstruction = `Style: ${narrativeStyle} (${maxWords} words maximum).`;
```

---

## Implementation Plan

### Phase 1: Template Improvements (Immediate)

1. **Update Prompt Templates** (Database)
   - Update "Scene Narrative - NSFW" template with stronger constraints
   - Update "Scene Narrative - SFW" template with stronger constraints
   - Add explicit prohibitions against first-person, dialogue, internal monologue

2. **Adjust Generation Parameters** (Edge Function)
   - Reduce `max_tokens` from 150 to 80
   - Reduce `temperature` from 0.7 to 0.5
   - Increase `frequency_penalty` to 0.3
   - Add `presence_penalty` of 0.2

3. **Add Post-Processing** (Edge Function)
   - Implement `validateSceneNarrative()` function
   - Remove first-person, dialogue, internal monologue
   - Enforce word limit (60 words max)
   - Ensure third-person perspective

**Files to Modify:**
- `supabase/functions/roleplay-chat/index.ts` - `generateSceneNarrativeWithOpenRouter()`
- Database: Update `prompt_templates` table

### Phase 2: Scene Table Enhancements (Short-term)

1. **Add New Columns** (Migration)
   - `scene_focus` (TEXT)
   - `narrative_style` (TEXT, default 'concise')
   - `visual_priority` (TEXT[])
   - `perspective_hint` (TEXT, default 'third_person')
   - `max_words` (INTEGER, default 60)

2. **Update Template Selection** (Edge Function)
   - Read scene fields if `scene_id` or `scene_template_id` provided
   - Inject scene-specific guidance into prompt
   - Override default parameters with scene values

**Files to Modify:**
- New migration: `supabase/migrations/YYYYMMDD_enhance_scenes_table.sql`
- `supabase/functions/roleplay-chat/index.ts` - Scene field reading

### Phase 3: UI Enhancements (Medium-term)

1. **Scene Creation Modal** (Frontend)
   - Add "Narrative Style" dropdown (concise/detailed/atmospheric)
   - Add "Scene Focus" selector (setting/character/interaction/atmosphere)
   - Add "Visual Priority" multi-select (lighting, clothing, positioning, setting)
   - Add "Max Words" slider (40-100 words)

2. **Scene Template Presets** (Frontend)
   - Pre-configured templates with optimal settings
   - Quick-start options for common scenarios

**Files to Modify:**
- `src/components/roleplay/SceneCreationModal.tsx`
- `src/components/roleplay/SceneEditModal.tsx`

---

## Expected Outcomes

### Before (Current)
```
Hello, there! I'm Sally. You wouldn't believe the kind of day I've had...
[200+ words of first-person dialogue and internal monologue]
```

### After (Improved)
```
Sally sits at her desk in a dimly lit office, the warm glow of a desk 
lamp casting shadows across polished wooden floors. She wears a blouse 
and skirt, her expression thoughtful as she looks toward the window 
where city lights blur in the distance.
[45 words, third-person, visual-focused, image-optimized]
```

### Quality Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Word Count | 200+ | 40-60 | 70% reduction |
| Perspective | First-person | Third-person | 100% compliance |
| Dialogue | Present | None | 100% removal |
| Visual Focus | Low | High | Significant |
| Image Generation Quality | Poor | Excellent | Major improvement |

---

## Testing Plan

### Unit Tests

1. **Template Validation**
   - Test that generated narratives are third-person
   - Test that no dialogue is present
   - Test word count is within limits
   - Test visual focus is maintained

2. **Post-Processing**
   - Test first-person → third-person conversion
   - Test dialogue removal
   - Test word truncation
   - Test perspective enforcement

### Integration Tests

1. **End-to-End Scene Generation**
   - Generate scene with conversation context
   - Verify output is third-person, concise, visual-focused
   - Verify image generation uses correct prompt

2. **Scene Template Integration**
   - Create scene with custom narrative style
   - Verify template parameters are applied
   - Verify output matches scene settings

---

## Related Documentation

- [SCENE_CONTINUITY_DEVELOPMENT_PLAN.md](./SCENE_CONTINUITY_DEVELOPMENT_PLAN.md) - Scene generation architecture
- [../../03-SYSTEMS/PROMPTING_SYSTEM.md](../../03-SYSTEMS/PROMPTING_SYSTEM.md) - Prompt template system
- [../../01-PAGES/07-ROLEPLAY/UX_SCENE.md](../../01-PAGES/07-ROLEPLAY/UX_SCENE.md) - Scene UX specification

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Initial audit and improvement plan | Claude |



# Prompt Template Testing with Character Data Hydration

## Problem
The `prompt_templates` table contains system prompts with `{{placeholders}}` (e.g., `{{character_name}}`, `{{character_personality}}`). Testing these in the Playground currently requires manually replacing every placeholder each time. There are ~10 roleplay templates with 10+ placeholders each, making manual testing impractical.

## Solution: Template Picker + Character Loader in System Prompt Editor

Upgrade `SystemPromptEditor.tsx` with two dropdowns that auto-hydrate placeholders:

1. **Template dropdown** -- select from `prompt_templates` to load the raw system prompt into the textarea
2. **Character dropdown** -- select from `characters` table to fill all `{{character_*}}` placeholders automatically

When both are selected, the component replaces all known placeholders with real character data and puts the resolved prompt in the textarea for further editing before sending.

## Placeholder Mapping

The mapping from template placeholders to `characters` table columns:

```text
{{character_name}}            -> characters.name
{{character_description}}     -> characters.description
{{character_personality}}     -> characters.persona (fallback: characters.traits)
{{character_background}}      -> characters.backstory (fallback: parsed from description)
{{character_speaking_style}}  -> characters.voice_tone
{{character_goals}}           -> parsed from characters.traits ("Goals: ...")
{{character_quirks}}          -> parsed from characters.traits ("Quirks: ...")
{{character_relationships}}   -> parsed from characters.traits ("Relationships: ...")
{{mood}}                      -> characters.mood
{{voice_tone}}                -> characters.voice_tone
{{user_name}}                 -> "User" (or from profile username)
{{user_gender}}               -> "unspecified" (or from profile)
{{user_appearance}}           -> "" (left blank)
{{scene_context}}             -> "" (left blank, editable)
```

Any remaining `{{unmatched}}` placeholders stay visible in the textarea so the user can fill them manually.

## UI Changes to SystemPromptEditor.tsx

The expanded state gains two compact dropdowns above the textarea:

```text
+-------------------------------------------------------+
| System Prompt  (1240 chars)                     [v]    |
+-------------------------------------------------------+
| Template: [Select template...          v]              |
| Character: [Select character...        v]              |
| +---------------------------------------------------+ |
| | You are Scarlett, a character described as:        | |
| | Confident, sophisticated, and direct...            | |
| | ...                                                | |
| +---------------------------------------------------+ |
+-------------------------------------------------------+
```

- Template dropdown: grouped by `use_case` (character_roleplay, enhancement, scene_generation, etc.)
- Character dropdown: flat list sorted by name, showing `name (gender)` 
- Both dropdowns use `text-xs`, `h-7` sizing
- Selecting a template loads the raw prompt; selecting a character runs the hydration; editing the textarea is always allowed after hydration

## Hydration Logic

A pure function `hydrateTemplate(template: string, character: CharacterData, profile?: ProfileData): string` that does simple string replacement:

```typescript
const hydrateTemplate = (template: string, char: CharacterRow): string => {
  const traits = parseTraits(char.traits || '');
  const replacements: Record<string, string> = {
    '{{character_name}}': char.name,
    '{{character_description}}': char.description || '',
    '{{character_personality}}': char.persona || char.traits || '',
    '{{character_background}}': char.backstory || '',
    '{{character_speaking_style}}': traits.speakingStyle || char.voice_tone || '',
    '{{character_goals}}': traits.goals || '',
    '{{character_quirks}}': traits.quirks || '',
    '{{character_relationships}}': traits.relationships || '',
    '{{mood}}': char.mood || 'neutral',
    '{{voice_tone}}': char.voice_tone || '',
  };
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(key, value);
  }
  return result;
};
```

The existing `parseTraits` helper from `useCharacterDatabase.ts` is reused for extracting goals/quirks/relationships from the traits string.

## Data Fetching

- **Templates**: Query `prompt_templates` where `is_active = true`, select `id, template_name, use_case, system_prompt, target_model`. Fetched once on mount via a small hook or inline `useEffect`.
- **Characters**: Query `characters` selecting the fields needed for hydration. User sees their own characters plus public ones. Fetched once on mount.
- Both queries are lightweight (just text fields, no joins).

## Compare View Integration

The same template + character dropdowns are added to each panel's system prompt section in `CompareView.tsx`. This enables the key use case: same character, same template, two different `target_model` LLMs side by side.

## Files Changed

| File | Change |
|---|---|
| `src/components/playground/SystemPromptEditor.tsx` | Add template dropdown, character dropdown, hydration logic, reuse parseTraits |
| `src/components/playground/CompareView.tsx` | Add the same template + character selectors to each panel's system prompt area |
| `src/utils/hydrateTemplate.ts` | New: pure hydration function + parseTraits (extracted from useCharacterDatabase for reuse) |

## Implementation Details

- Template dropdown items are grouped by `use_case` using `SelectGroup` with `SelectLabel`
- Character dropdown shows name and gender in compact format: "Scarlett (F)" 
- When user selects a template, the raw text loads into the textarea
- When user then selects a character, placeholders are replaced in-place
- User can re-select a different character to re-hydrate from the original template (component tracks the raw template separately from the hydrated text)
- Remaining unfilled placeholders (like `{{user_name}}`) are left as-is for manual editing
- All styling follows compact rules: `text-xs`, `h-7` controls, `gap-1.5` spacing


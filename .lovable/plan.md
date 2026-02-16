

# Add "None" Option to Template and Character Selectors

## Problem
Once a character or template is selected in the Compare View dropdowns, there is no way to deselect it. Many prompt testing scenarios (e.g., enhancement prompts, general system prompts) don't involve characters at all, but the current UI forces a selection to persist.

## Solution
Add a "None" clear option to both the **Template** and **Character** `Select` components in each panel. Selecting "None" resets the selection and restores the appropriate state.

## Changes (CompareView.tsx only)

### 1. Template selector -- add "None" option
- Add a `SelectItem` with value `"__none__"` labeled "No template" at the top of the dropdown
- When selected: clear `selectedTemplateId`, clear `rawRef`, keep `systemPrompt` as-is (user may have typed manually)

### 2. Character selector -- add "None" option
- Add a `SelectItem` with value `"__none__"` labeled "No character" at the top of the dropdown
- When selected: clear `selectedCharacterId`, restore system prompt to the raw template text (un-hydrated) if a template is loaded, or leave it as-is

### 3. Handler updates
- `handleTemplateSelect`: if value is `"__none__"`, reset `selectedTemplateId` to `""`, clear `rawRef`, keep current `systemPrompt`
- `handleCharacterSelect`: if value is `"__none__"`, reset `selectedCharacterId` to `""`, restore `systemPrompt` to `rawRef.current` (the un-hydrated template) if available

### 4. Conversation creation
- Already handled: `character_id` is only included when `selectedCharacterId` is truthy (line 122-124), so clearing it works without backend changes

## Technical Detail

```typescript
// In handleCharacterSelect, add guard at top:
if (characterId === '__none__') {
  setPanel(prev => ({
    ...prev,
    selectedCharacterId: '',
    systemPrompt: rawRef.current || prev.systemPrompt,
  }));
  return;
}

// In handleTemplateSelect, add guard at top:
if (templateId === '__none__') {
  rawRef.current = '';
  setPanel(prev => ({ ...prev, selectedTemplateId: '' }));
  return;
}
```

In both Select components, add before existing items:
```tsx
<SelectItem value="__none__" className="text-xs text-muted-foreground">
  No character
</SelectItem>
```

## Files Changed

| File | Change |
|---|---|
| `src/components/playground/CompareView.tsx` | Add "None" options to template and character selectors, update handlers to support clearing |


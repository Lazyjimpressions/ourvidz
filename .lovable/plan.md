

# Replace Chat Selector with Task-Specific Model Selectors

## Overview
Replace the single "Chat" model dropdown in the Playground settings gear with separate task-specific selectors: **Roleplay** and **Reasoning**. Each will show only models that have the corresponding task in their `tasks` array.

## Changes

### 1. Update `useGroupedModels` (src/hooks/usePlaygroundModels.ts)
- Remove the generic `chat` group
- Add `roleplay` group: chat-modality models with `roleplay` in tasks
- Add `reasoning` group: chat-modality models with `reasoning` in tasks
- Keep existing groups (image, video, i2i, enhancement) unchanged

### 2. Update `PlaygroundSettings` (src/hooks/usePlaygroundSettings.ts)
- Replace `chatModel` with `roleplayModel` and `reasoningModel`
- Update `DEFAULT_SETTINGS` with sensible defaults (or empty strings to auto-resolve from DB defaults)
- Keep backward compat: if `chatModel` exists in localStorage, migrate it to `roleplayModel`

### 3. Update Settings Popover (src/components/playground/PlaygroundSettingsPopover.tsx)
- Replace the "Chat" row with two rows: **Roleplay** and **Reasoning**
- Each shows only models from the corresponding group
- Reasoning row only appears if `grouped.reasoning.length > 0` (like Enhancement)

### 4. Update consumers of `settings.chatModel`
- **PlaygroundContext.tsx**: Use `settings.roleplayModel` when invoking `roleplay-chat`, keep using it for `playground-chat` as well (or use `reasoningModel` based on context)
- **CompareView.tsx**: Update to use `roleplayModel` instead of `chatModel` for default panel state
- **AdminTools.tsx**: Update model info lookup to use new groups

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/usePlaygroundModels.ts` | Replace `chat` group with `roleplay` and `reasoning` groups |
| `src/hooks/usePlaygroundSettings.ts` | Replace `chatModel` with `roleplayModel` + `reasoningModel`; add migration |
| `src/components/playground/PlaygroundSettingsPopover.tsx` | Replace Chat dropdown with Roleplay + Reasoning dropdowns |
| `src/contexts/PlaygroundContext.tsx` | Use `roleplayModel` instead of `chatModel` |
| `src/components/playground/CompareView.tsx` | Use `roleplayModel` instead of `chatModel` |
| `src/components/playground/AdminTools.tsx` | Update grouped references |

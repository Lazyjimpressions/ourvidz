

# Task-Specific Template Selectors in Settings Gear

## Overview
Replace the single "Template" dropdown with per-task template selectors, so each model category (Roleplay, Reasoning, Enhancement, Image, Video) has its own paired template dropdown. The System Prompt Editor in the chat body stays as-is for viewing/editing the hydrated prompt text.

## Current State
- One generic `promptTemplateId` in settings, shown as a single "Template" dropdown
- Templates in the DB have a `use_case` field (e.g., `roleplay`, `enhancement`, `chat_admin`, `chat_general`, `chat_creative`)
- Only chat (playground-chat) currently sends `prompt_template_id` to the edge function

## Changes

### 1. Settings Interface (`src/hooks/usePlaygroundSettings.ts`)
- Replace single `promptTemplateId` with per-task template IDs:
  - `roleplayTemplateId` (use_case: `roleplay`, `character_roleplay`)
  - `reasoningTemplateId` (use_case: `chat_general`, `chat_admin`, etc.)
  - `enhancementTemplateId` (use_case: `enhancement`)
  - `imageTemplateId` (use_case: `enhancement` with image job_type)
  - `videoTemplateId` (use_case: `enhancement` with video job_type)
- Migrate legacy `promptTemplateId` to `roleplayTemplateId`
- Default all to empty string (auto-select behavior)

### 2. Settings Gear UI (`src/components/playground/PlaygroundSettingsPopover.tsx`)
- Restructure into paired rows: each model selector followed by its template selector
- Layout per task block:

```text
  Roleplay   [Model Dropdown     ]
  Template   [Template Dropdown   ]
  --------------------------------
  Reasoning  [Model Dropdown     ]
  Template   [Template Dropdown   ]
  --------------------------------
  Image      [Model Dropdown     ]
  Template   [Template Dropdown   ]
  ... etc
```

- Each template dropdown filters `templates` by the relevant `use_case` values
- All template dropdowns include "Auto-select" as default
- Content Mode selector stays at the bottom

### 3. Template Query (`src/hooks/usePlaygroundModels.ts`)
- `usePlaygroundTemplates` already fetches all templates -- no change needed
- Add a helper to group templates by use_case for easy filtering in the popover

### 4. Consumer Updates (`src/contexts/PlaygroundContext.tsx`)
- When sending chat messages, use `settings.roleplayTemplateId` (or `reasoningTemplateId` depending on active model) as `prompt_template_id`
- For image/video generation, pass the relevant template ID if the edge function supports it

### 5. System Prompt Editor (no changes)
- Stays in the chat body
- Continues to show the full hydrated prompt text for review and manual editing
- Its own template/character selectors remain for quick prompt assembly

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/usePlaygroundSettings.ts` | Replace `promptTemplateId` with 5 task-specific template IDs; add migration |
| `src/components/playground/PlaygroundSettingsPopover.tsx` | Restructure to pair each model row with a template row; filter templates by use_case |
| `src/contexts/PlaygroundContext.tsx` | Use task-specific template ID when calling edge functions |


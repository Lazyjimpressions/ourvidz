# Character Studio - Codebase Files Reference

**Last Updated:** February 6, 2026

This document provides a comprehensive listing of all files related to the Character Studio feature.

## Pages

| File | Lines | Description |
|------|-------|-------------|
| [src/pages/CharacterStudio.tsx](../../../src/pages/CharacterStudio.tsx) | ~858 | Main Character Studio workspace page with resizable sidebar, portrait gallery, scenes gallery, and mobile layout |
| [src/pages/CreateCharacter.tsx](../../../src/pages/CreateCharacter.tsx) | ~533 | Form-based character creation/editing page |

## Character Studio Components

| File | Lines | Description |
|------|-------|-------------|
| [src/components/character-studio/CharacterStudioSidebar.tsx](../../../src/components/character-studio/CharacterStudioSidebar.tsx) | ~767 | Left sidebar with collapsible form sections, AI suggestions, reference image management |
| [src/components/character-studio/CharacterStudioPromptBar.tsx](../../../src/components/character-studio/CharacterStudioPromptBar.tsx) | ~284 | Bottom prompt bar with textarea, reference image dropdown, model selector, generate button |
| [src/components/character-studio/PortraitGallery.tsx](../../../src/components/character-studio/PortraitGallery.tsx) | ~263 | Grid display of portrait versions with primary badge, options menu, lightbox trigger |
| [src/components/character-studio/PortraitLightbox.tsx](../../../src/components/character-studio/PortraitLightbox.tsx) | ~412 | Fullscreen portrait viewer with navigation, regeneration controls, actions |
| [src/components/character-studio/ScenesGallery.tsx](../../../src/components/character-studio/ScenesGallery.tsx) | ~203 | Grid of scene cards with start chat, edit/delete actions |
| [src/components/character-studio/PosePresets.tsx](../../../src/components/character-studio/PosePresets.tsx) | ~63 | Quick pose selection chips (Standing, Profile, Back, Sitting, Lying, Close-up) |
| [src/components/character-studio/CharacterTemplateSelector.tsx](../../../src/components/character-studio/CharacterTemplateSelector.tsx) | ~87 | Dialog for selecting pre-built character templates |
| [src/components/character-studio/CharacterSelector.tsx](../../../src/components/character-studio/CharacterSelector.tsx) | - | Dropdown for switching between characters |
| [src/components/character-studio/ModelSelector.tsx](../../../src/components/character-studio/ModelSelector.tsx) | - | Image model dropdown with I2I capability badges |
| [src/components/character-studio/SuggestButton.tsx](../../../src/components/character-studio/SuggestButton.tsx) | - | AI suggestion trigger button with loading state |
| [src/components/character-studio/CLAUDE.md](../../../src/components/character-studio/CLAUDE.md) | - | Component-specific instructions for Claude Code |

## Hooks

### Primary Character Studio Hooks

| File | Lines | Description |
|------|-------|-------------|
| [src/hooks/useCharacterStudio.ts](../../../src/hooks/useCharacterStudio.ts) | ~532 | Central state management for Character Studio - CRUD, generation, auto-save |
| [src/hooks/usePortraitVersions.ts](../../../src/hooks/usePortraitVersions.ts) | ~240 | Portrait versioning with Realtime subscriptions |
| [src/hooks/useCharacterTemplates.ts](../../../src/hooks/useCharacterTemplates.ts) | - | Loads character templates from database |

### Supporting Character Hooks

| File | Description |
|------|-------------|
| [src/hooks/useCharacterScenes.ts](../../../src/hooks/useCharacterScenes.ts) | Scene CRUD operations |
| [src/hooks/useCharacterImageUpdates.ts](../../../src/hooks/useCharacterImageUpdates.ts) | Realtime updates for character images |
| [src/hooks/useCharacterData.ts](../../../src/hooks/useCharacterData.ts) | Character data fetching |
| [src/hooks/useCharacterDatabase.ts](../../../src/hooks/useCharacterDatabase.ts) | Direct database operations |
| [src/hooks/useCharacterSessions.ts](../../../src/hooks/useCharacterSessions.ts) | Character session management |
| [src/hooks/useSceneGeneration.ts](../../../src/hooks/useSceneGeneration.ts) | AI scene generation |
| [src/hooks/useAutoSceneGeneration.ts](../../../src/hooks/useAutoSceneGeneration.ts) | Automatic scene creation |

### Related Model/Image Hooks

| File | Description |
|------|-------------|
| [src/hooks/useImageModels.ts](../../../src/hooks/useImageModels.ts) | Image model loading with I2I capability filtering |
| [src/hooks/useRoleplayModels.ts](../../../src/hooks/useRoleplayModels.ts) | Chat model loading for AI suggestions |
| [src/hooks/useUserCharacters.ts](../../../src/hooks/useUserCharacters.ts) | User's character list management |

## Edge Functions

| File | Description |
|------|-------------|
| [supabase/functions/character-portrait/index.ts](../../../supabase/functions/character-portrait/index.ts) | Portrait generation pipeline - model routing, prompt construction, fal.ai integration, storage upload |
| [supabase/functions/character-portrait/CLAUDE.md](../../../supabase/functions/character-portrait/CLAUDE.md) | Edge function-specific instructions |
| [supabase/functions/character-suggestions/index.ts](../../../supabase/functions/character-suggestions/index.ts) | AI-powered field enhancements (description, traits, persona, appearance) |
| [supabase/functions/character-suggestions/CLAUDE.md](../../../supabase/functions/character-suggestions/CLAUDE.md) | Edge function-specific instructions |

## Utility Files

| File | Description |
|------|-------------|
| [src/utils/characterImageUtils.ts](../../../src/utils/characterImageUtils.ts) | Image processing utilities for characters |
| [src/utils/characterPromptBuilder.ts](../../../src/utils/characterPromptBuilder.ts) | Prompt construction utilities |
| [src/data/characterPresets.ts](../../../src/data/characterPresets.ts) | Visual preset definitions (elegant, casual, athletic, etc.) |

## Shared Roleplay Components

Components in `src/components/roleplay/` used by Character Studio:

| File | Description |
|------|-------------|
| [src/components/roleplay/PortraitPanel.tsx](../../../src/components/roleplay/PortraitPanel.tsx) | Portrait preview panel used in CreateCharacter |
| [src/components/roleplay/PresetChipCarousel.tsx](../../../src/components/roleplay/PresetChipCarousel.tsx) | Horizontal scrolling preset chip selector |
| [src/components/roleplay/CharacterGreetingsEditor.tsx](../../../src/components/roleplay/CharacterGreetingsEditor.tsx) | First message and alternate greetings editor |
| [src/components/roleplay/SceneGenerationModal.tsx](../../../src/components/roleplay/SceneGenerationModal.tsx) | Modal for creating/editing scenes |
| [src/components/roleplay/SceneCreationModal.tsx](../../../src/components/roleplay/SceneCreationModal.tsx) | AI-powered scene creation modal |

## Shared UI Components

| File | Description |
|------|-------------|
| [src/components/storyboard/ImagePickerDialog.tsx](../../../src/components/storyboard/ImagePickerDialog.tsx) | Library browser for selecting reference images |
| [src/components/shared/PortraitTile.tsx](../../../src/components/shared/PortraitTile.tsx) | Reusable portrait tile with signed URL handling |

## Database Tables

The Character Studio interacts with these Supabase tables:

| Table | Description |
|-------|-------------|
| `characters` | Main character profiles (name, description, traits, persona, image_url, etc.) |
| `character_portraits` | Portrait versions with is_primary, sort_order, generation_metadata |
| `character_scenes` | Roleplay scenarios with scene_name, scene_prompt, scene_starters |
| `character_templates` | Pre-built character archetypes for quick start |
| `api_models` | Image generation models with capabilities (supports_i2i) |

## Storage Buckets

| Bucket | Description |
|--------|-------------|
| `reference_images` | User-uploaded reference images for I2I generation |
| `user-library` | Generated portrait storage |

## Types

| File | Description |
|------|-------------|
| [src/types/character.ts](../../../src/types/character.ts) | Character-related TypeScript types (if exists) |
| [src/hooks/useCharacterStudio.ts](../../../src/hooks/useCharacterStudio.ts) | Contains `CharacterData` and `CharacterScene` interfaces |
| [src/hooks/usePortraitVersions.ts](../../../src/hooks/usePortraitVersions.ts) | Contains `CharacterPortrait` interface |

## Documentation

| File | Description |
|------|-------------|
| [docs/01-PAGES/08-CHARACTER_STUDIO/CHARACTER_STUDIO_PAGE.md](CHARACTER_STUDIO_PAGE.md) | User-facing feature documentation |
| [docs/01-PAGES/08-CHARACTER_STUDIO/CREATE_CHARACTER_PAGE.md](CREATE_CHARACTER_PAGE.md) | CreateCharacter page documentation |
| [docs/01-PAGES/08-CHARACTER_STUDIO/TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) | Deep technical implementation details |
| [docs/01-PAGES/08-CHARACTER_STUDIO/CODEBASE_FILES.md](CODEBASE_FILES.md) | This file - codebase file reference |
| [docs/01-PAGES/08-CHARACTER_STUDIO/CLAUDE.md](CLAUDE.md) | Claude Code instructions for this documentation folder |

---

## Quick Reference: Key Files for Common Tasks

### Adding a new field to characters

1. Update `CharacterData` interface in [useCharacterStudio.ts](../../../src/hooks/useCharacterStudio.ts)
2. Add field to sidebar form in [CharacterStudioSidebar.tsx](../../../src/components/character-studio/CharacterStudioSidebar.tsx)
3. Include in save payload in `saveCharacter` function
4. Add database column migration (via Supabase dashboard)

### Adding a new pose preset

1. Update `POSE_PRESETS` array in [PosePresets.tsx](../../../src/components/character-studio/PosePresets.tsx)

### Modifying portrait generation

1. Edge function: [character-portrait/index.ts](../../../supabase/functions/character-portrait/index.ts)
2. Hook: `generatePortrait` in [useCharacterStudio.ts](../../../src/hooks/useCharacterStudio.ts)
3. UI: [CharacterStudioPromptBar.tsx](../../../src/components/character-studio/CharacterStudioPromptBar.tsx)

### Adding AI suggestion type

1. Edge function: [character-suggestions/index.ts](../../../supabase/functions/character-suggestions/index.ts)
2. Add type to `SuggestButton` component
3. Handle in `fetchSuggestions` in [CharacterStudioSidebar.tsx](../../../src/components/character-studio/CharacterStudioSidebar.tsx)

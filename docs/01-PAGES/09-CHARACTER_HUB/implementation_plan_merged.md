# Character Hub & Character Studio Implementation Plan (Merged)

This plan implements the approved Character Hub and Character Studio designs based on [character_research.md](character_research.md), [character_prd.md](character_prd.md), and the locked visual references ([character_hub.png](character_hub.png), [character_studio.png](character_studio.png)).

---

## User Review Required

**IMPORTANT — Fresh Start Strategy:** This implementation creates NEW independent pages based on the approved designs from `09-CHARACTER_HUB`. Existing pages (`CharacterStudio.tsx`, `CreateCharacter.tsx`) remain untouched and will be deprecated only when the new implementation is fully validated.

**NOTE — Parallel Routes:** New routes (`/character-hub-v2`, `/character-studio-v2`) run alongside existing routes. This allows side-by-side comparison and zero-risk development.

**CAUTION — Database Schema Changes:** New tables for portraits/anchors and canon outputs require database migrations. These additions extend the schema without breaking existing functionality.

---

## Phase 1: Database Layer

**[NEW]** [supabase/migrations/20260207_character_hub_schema.sql](../../../supabase/migrations/20260207_character_hub_schema.sql)

- **Purpose:** Extend database schema to support new character features (backward compatible).
- Add **character_anchors** table: `id`, `character_id`, `image_url`, `is_primary`, `created_at`, `updated_at`; foreign key to `characters` with CASCADE delete; RLS for user isolation.
- Add **character_canon** table: `id`, `character_id`, `output_url`, `output_type`, `is_pinned`, `created_at`.
- Extend **characters** with: `style_preset`, `locked_traits`, `media_defaults`, `personality_traits`, `physical_traits`, `outfit_defaults`.
- Indexes: `idx_character_anchors_character_id`, `idx_character_anchors_primary`, `idx_character_canon_character_id`, `idx_character_canon_pinned`.

---

## Phase 2: Type Definitions

**[MODIFY]** Types live in [src/types/character-hub-v2.ts](../../../src/types/character-hub-v2.ts) and [src/types/roleplay.ts](../../../src/types/roleplay.ts).

- Extend Character interface with new fields.
- Add `CharacterAnchor`, `CharacterCanon`, `MediaDefaults`, `PersonalityTraits`, `PhysicalTraits`.
- **DB constraint:** `characters.role` must be one of `ai | user | narrator` (CHECK constraint). UI should map friendly labels to these values.

---

## Phase 3: Character Components (Unified)

- **[REFACTOR]** [src/components/characters/CharacterCard.tsx](../../../src/components/characters/CharacterCard.tsx) — Base component with context prop `roleplay` | `hub` | `library`.
- **[NEW]** [src/components/characters/CharacterCardOverlay.tsx](../../../src/components/characters/CharacterCardOverlay.tsx) — Quick action overlay; actions vary by context (hub: edit, generate, duplicate, delete).
- **[NEW]** [src/components/characters/CharacterFilters.tsx](../../../src/components/characters/CharacterFilters.tsx) — Search, genre chips, media/style filters.

---

## Phase 4: Character Hub Page

**[NEW]** [src/pages/CharacterHubV2.tsx](../../../src/pages/CharacterHubV2.tsx)

- Grid layout using `CharacterCard` with `context='hub'`.
- `CharacterFilters` bar (sticky header).
- Empty state with creation CTA.
- "Create Character" → `/character-studio-v2?mode=from-images`.
- Query filters out `role='user'` (user personas).

---

## Phase 5: Character Studio Components

- **[NEW]** [src/pages/CharacterStudioV2.tsx](../../../src/pages/CharacterStudioV2.tsx) — Three-column layout, tab system, preview, prompt panel.
- **Tab components:** [IdentityTab.tsx](../../../src/components/character-studio/IdentityTab.tsx), [AppearanceTab.tsx](../../../src/components/character-studio/AppearanceTab.tsx), [StyleTab.tsx](../../../src/components/character-studio/StyleTab.tsx), [MediaTab.tsx](../../../src/components/character-studio/MediaTab.tsx).
- **Supporting:** [AnchorManager.tsx](../../../src/components/character-studio/AnchorManager.tsx), [CharacterStudioPromptBarV2.tsx](../../../src/components/character-studio/CharacterStudioPromptBarV2.tsx), [CharacterHistoryStrip.tsx](../../../src/components/character-studio/CharacterHistoryStrip.tsx).

---

## Phase 6: Hooks, Services, Routing & Generation

- **[NEW]** [src/hooks/useCharacterStudioV2.ts](../../../src/hooks/useCharacterStudioV2.ts) — Tab state, form data, save, anchors, history, `generatePreview`.
- **[NEW]** [src/services/CharacterServiceV2.ts](../../../src/services/CharacterServiceV2.ts) — Save/generation logic; creates `character_scenes` row then invokes `fal-image` Edge Function.
- **[MODIFY]** [src/App.tsx](../../../src/App.tsx) — Routes: `/character-hub-v2`, `/character-studio-v2`, `/character-studio-v2/:id`.

**Phase 6 — Generation:** Prompt bar in right column; `generatePreview(prompt, settings)`; history strip with Pin as Anchor; loading states and history invalidation.

---

## Phase 7: Deployment

- Deploy `character_hub_schema` migration (Supabase online dashboard or MCP).
- Deploy `fal-image` Edge Function (manual).
- Verify Edge Function logs and RLS policies.

---

## Phase 8: UI Refinement & Interaction

- **Hub:** Remove global nav/toolbar if applicable; wire cards to Studio V2 (Edit, Generate).
- **Studio:** Dedicated header navigation; clean up layout to match reference.

---

## Phase 9: Logic Audit & Fixes

- **Generation persistence:** CharacterServiceV2 creates scene records before calling AI; pass `scene_id` and `destination` to Edge Functions for correct DB updates; fix return values for optimistic UI.
- **Component wiring:** Verify all props in CharacterStudioPromptBarV2 and CharacterStudioV2.

---

## Known Issues and Fixes

| Issue | Fix |
|-------|-----|
| **Save errors when role is assigned** | DB allows only `ai`, `user`, `narrator`. Map UI values: "character" → "ai", "assistant" → "narrator", "user" → "user" in IdentityTab or save mutation. |
| **Create-mode save fails** | `content_rating` is NOT NULL. Default to `'sfw'` in formData and/or insert payload. |
| **Hub Generate missing** | Add "Generate Image" (and optionally "Generate Video") to hub card overlay; wire to Studio V2 (navigate to studio with character) or shared generation path. |
| **Studio generate in create mode** | Disable Generate button in create mode with tooltip: "Save character first to generate." |
| **Studio generate with consistency ON, no anchor** | Button disabled; add tooltip: "Set a primary anchor in Visuals tab or turn off Character Consistency." |

---

## Verification Plan

**Deployment:** Use Supabase online dashboard (no local CLI). Run migration from [supabase/migrations/20260207_character_hub_schema.sql](../../../supabase/migrations/20260207_character_hub_schema.sql). Verify `character_anchors`, `character_canon`, and new columns on `characters`.

**Manual verification:**

1. **Character Hub:** Navigate to `/character-hub-v2`. Empty state, Create Character, grid, search/filters. Card actions: Open (Studio), Generate, Delete.
2. **Character Studio:** Three-column layout; all four tabs (Identity, Appearance, Style, Media). Anchor upload/primary selection. Style preset. History strip and Pin as Anchor.
3. **Save:** Save with Role = "AI Character (NPC)" and "Assistant" (must not error). Create new character and save without setting content_rating in form (must succeed with default).
4. **Generation:** Hub card Generate / Sparkle. Studio: generate with prompt only (consistency off, no anchor). Studio: generate with primary anchor (consistency on).
5. **Integration:** Hub → Create → Edit → Save → Return to Hub. Generation with consistency mode.

**Success criteria:**

- Character Hub displays grid, filters, creation flow.
- Character Studio has three-column layout and all tabs functional.
- Anchor manager works; generation uses consistency controls when anchor set.
- All data persists; save with any role selection works; create works with default content_rating.
- UX is intuitive with clear tooltips when generate is disabled.

---

## Notes

- Existing routes (`/character-studio`, `/create-character`) remain functional during development.
- New v2 pages are independent implementations. After validation, deprecate old routes by updating navigation/links.
- Database schema extensions are backward compatible.

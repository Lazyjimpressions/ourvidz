

# Character Studio V3 -- Unified Build Plan (Revised)

## Answering Your Questions First

### 1. Refactor vs. New Page
**New page from scratch.** V1 is 857 lines with deeply nested mobile/desktop branching. V2 is 659 lines of largely non-functional aspirational code. Both have accumulated cruft. A fresh `CharacterStudioV3.tsx` ensures clean code, proper separation of concerns, and no leftover dead paths. We delete both old pages and their exclusive components after V3 is stable.

### 2. Character Hub Access
The Character Hub V2 currently links to `/character-studio-v2`. We update those links to `/character-studio` (V3). Additionally, the hub's "Create" and "Edit" buttons route to V3 with appropriate query params.

### 3. Function Over Form (Admin Portal Standards)
Enforced throughout: `text-xs` labels, `h-7` to `h-8` inputs, no decorative icons on labels (only functional action icons), no padded cards wrapping simple fields, compact collapsible headers, minimal spacing (`gap-1.5`, `space-y-2`). The sidebar is a dense tool panel, not a form wizard.

### 4. Scenes Tab
**Keep it, but as a lightweight section.** Scenes serve a real purpose: they define starting contexts for roleplay conversations (setting, mood, opening prompt). The Character Studio is the right place to author them because they are character-specific. The Roleplay page *consumes* scenes; the Studio *authors* them. Keep the Portraits/Scenes tab split in the workspace area. Phase 2 can evaluate whether scene management needs its own dedicated UI.

### 5. Dynamic Model Calls
Already dynamic in V1's `character-portrait` edge function (resolves from `api_models` table by ID or auto-selects by capability). The frontend `useImageModels` hook queries the database. No hardcoded model keys exist in the generation path. V3 preserves this pattern exactly.

### 6. Fast vs. Quality vs. Upscale Model Tiers
The `useImageModels` hook already pulls all active image models from the database with their `capabilities` metadata. V3 adds a **model tier indicator** in the ModelSelector dropdown showing speed/quality badges derived from `capabilities.speed` and `capabilities.quality` fields already in the schema. The dropdown reflects whatever defaults are set in the admin UI. For upscale, this is a separate task (`task: 'upscale'`) that gets wired as a portrait action ("Upscale" in the context menu) in a future phase.

### 7. Extract-from-Image vs. Generate-from-Description Workflow
These are **complementary, not conflicting**:
- **Extract from Image** calls `describe-image` (structured mode) and populates appearance fields only (`appearance_tags`, `physical_traits`, `gender`, `traits` as visual description).
- **Generate from Description** calls `character-suggestions` (type: 'all') and populates personality + voice + appearance fields from the text description.
- If user does Extract first, then Generate: the generate function receives the already-populated appearance context and uses it as input, so results build on top rather than blindly overwriting. The `character-suggestions` function already accepts `existingTraits` and `existingAppearance` as context.
- We show a confirmation toast: "AI suggestions will enhance your existing fields" rather than silently overwriting.

### 8. Appearance UI Simplification
Current V1 has: Quick Presets (chips) + Appearance Details (textarea labeled "traits") + Add Tag input + Tag badges + Reference Image section. This IS confusing because:
- "Appearance Details" textarea is labeled `traits` in the code but holds visual descriptions
- Tags and textarea serve overlapping purposes
- Quick Presets add tags but don't relate to the textarea

**V3 simplification:**
- **Single "Visual Description" textarea** -- free-form text describing the character's look. This maps to `traits` field (renamed in UI label only). This is what gets injected into the image prompt.
- **Appearance Tags** -- quick keywords that also get injected into prompts. Keep the chip input but remove the separate "Quick Presets" carousel (those generic words like "elegant", "casual" add noise). Tags are additive to the description.
- **Reference Image** -- prominent placement with clear "Image Match Mode" indicator (kept from V1, works well).
- Total: 3 clear elements instead of 5 overlapping ones.

### 9. Model-Specific Prompt Templates
Currently `character-portrait` builds prompts with hardcoded boilerplate ("masterpiece, best quality, photorealistic, 1girl..."). This is SDXL-era formatting that doesn't suit Flux or Seedream. V3 addresses this by:
- Looking up `prompt_templates` from the database where `use_case = 'character_portrait'` and `target_model` matches the selected model family
- If no template exists, using the existing generic prompt builder as fallback
- Presets (pose, expression, etc.) are injected into the template rather than concatenated as comma-separated tags
- This is an edge function enhancement, not a frontend change

### 10. Scenes / Album / Canon Clarification
Understanding the intended taxonomy:
- **Portraits (character_portraits)**: Generated character images, versioned. Primary portrait = character avatar.
- **Album (user_library)**: User-saved images they want to keep permanently. Scenes from roleplay that the user explicitly saves go here.
- **Canon (character_portraits + is_primary / character_anchors)**: Reference images for generation consistency. Future LoRA training images.

For V3: The workspace shows **Portraits** tab (all generated portraits, with "Set Primary" and "Use as Reference" actions) and **Scenes** tab (authored scene contexts). "Save to Album" is a portrait action that copies to `user_library`. Canon/reference management stays as a single reference image slot in the sidebar (V1 pattern) until LoRA support requires multiple reference slots.

### 11. Mobile Consistency
V3 mobile uses the same tabbed pattern as V1 (Details | Portraits | Scenes) but with fixes:
- Images use `PortraitTile` component consistently (already proven to avoid the "zoomed in" bug on iOS Safari)
- No `onLoad` handlers, no loading skeletons, no inline `object-fit` styles
- Same 3:4 aspect ratio containers on both platforms
- `overflow-x-hidden` on root container (from V2, prevents lateral scroll)

### 12. Character Reference Boxes
V2's `AnchorReferencePanel` (face/body/style slots) is premature because:
- The slots are session-based (localStorage), not persisted to the database
- The `character-portrait` edge function doesn't consume them -- it only uses a single `referenceImageUrl`
- They add visual complexity without functional value

**What IS useful**: A single, prominent reference image field that feeds I2I generation. V1 already has this and it works. V3 keeps V1's reference image pattern. When LoRA or IP-Adapter support arrives, we can add structured reference slots that actually connect to the pipeline.

### 13. Iteration Workflow and Locking Looks
V3's iteration loop:
1. **Generate** with current visual description + tags + optional prompt override
2. **Review** in gallery, open in lightbox to see detail
3. **Iterate**: click "Use as Reference" on a portrait you like -- this sets it as the I2I source, locking in that look for subsequent generations
4. **Tweak**: modify prompt override or tags, generate again with the reference locked
5. **Lock in**: "Set Primary" marks the final version as the character's avatar
6. **View Prompt**: see what prompt produced each portrait, copy it to refine

The reference image IS the "lock" mechanism. Once set, all subsequent generations use I2I mode, maintaining the character's core appearance while allowing prompt-driven variations (outfit, pose, expression). The model auto-switches to I2I-compatible when a reference is set (V1 logic, preserved).

---

## Architecture

### New Files
| File | Purpose |
|------|---------|
| `src/pages/CharacterStudioV3.tsx` | Clean page component, ~300 lines max |
| `src/components/character-studio-v3/StudioSidebar.tsx` | Config sidebar with collapsible sections |
| `src/components/character-studio-v3/StudioWorkspace.tsx` | Right panel: gallery + prompt bar |
| `src/components/character-studio-v3/VisualDescriptionSection.tsx` | Simplified appearance: description + tags + reference |
| `src/components/character-studio-v3/TraitExtractDialog.tsx` | "Extract from Image" confirmation/merge UI |

### Reused Files (no changes needed)
| File | Why |
|------|-----|
| `PortraitGallery.tsx` | Works well, add "View Prompt" menu item |
| `PortraitLightbox.tsx` | No changes |
| `PortraitTile.tsx` | Shared component, proven on mobile |
| `CharacterStudioPromptBar.tsx` | V1 prompt bar, compact and functional |
| `PosePresets.tsx` | Quick pose chips above gallery |
| `ScenesGallery.tsx` | Scenes tab content |
| `CharacterSelector.tsx` | Header character switcher |
| `CharacterTemplateSelector.tsx` | Template picker |
| `SuggestButton.tsx` | Per-field AI buttons |
| `ModelSelector.tsx` | Image model dropdown |
| `SceneGenerationModal.tsx` | Scene authoring |

### Enhanced Files
| File | Change |
|------|--------|
| `src/hooks/useCharacterStudio.ts` | Add `extractTraitsFromImage()` method (calls `describe-image`), add `generateFromDescription()` (ported from V2) |
| `src/hooks/useApiModels.ts` | Add `'vision'` to task type union |
| `src/App.tsx` | Replace V1 + V2 routes with single `/character-studio` route pointing to V3 |
| `src/pages/CharacterHubV2.tsx` | Update navigation links to `/character-studio` |

### Deleted Files
| File | Reason |
|------|--------|
| `src/pages/CharacterStudio.tsx` | Replaced by V3 |
| `src/pages/CharacterStudioV2.tsx` | Replaced by V3 |
| `src/hooks/useCharacterStudioV2.ts` | Consolidated into `useCharacterStudio` |
| `src/components/character-studio/IdentityTab.tsx` | Content merged into sidebar |
| `src/components/character-studio/VisualsTab.tsx` | Content merged into sidebar |
| `src/components/character-studio/StyleTab.tsx` | Non-functional, removed |
| `src/components/character-studio/MediaTab.tsx` | Non-functional, removed |
| `src/components/character-studio/AnchorReferencePanel.tsx` | Premature, removed |
| `src/components/character-studio/AnchorManager.tsx` | Premature, removed |
| `src/components/character-studio/CharacterMediaStrip.tsx` | Over-categorization, removed |
| `src/components/character-studio/CharacterStudioPromptBarV2.tsx` | V1 bar kept instead |
| `src/components/character-studio/CharacterHistoryStrip.tsx` | Replaced by gallery |
| `src/components/character-studio/AppearanceTab.tsx` | Unused |

### Deleted Routes
- `/character-studio-v2`
- `/character-studio-v2/:id`
- `/character-hub-v2` links updated (not deleted)

---

## Page Layout

```text
Desktop (two-column):
+---------------------------------------------------------------+
| [Back] [CharacterSelector] [SaveStatus]    [Chat] [Save]      |
+------------------+--------------------------------------------+
|                  |                                              |
|  SIDEBAR (320px, | WORKSPACE                                   |
|  resizable)      |                                              |
|                  | [Portraits tab] [Scenes tab]                 |
|  [Avatar+Name]   | [PosePresets row]                            |
|  [Enhance All]   | [Portrait Grid - PortraitTile]               |
|                  |                                              |
|  > Basic Info    |                                              |
|  > Appearance    |                                              |
|  > Personality   |                                              |
|  > Advanced      |                                              |
|                  | [PromptBar: ref | model | prompt | generate] |
+------------------+--------------------------------------------+

Mobile (tabbed):
+-----------------------------------------------+
| [Back] [CharacterName]          [Save]         |
+-----------------------------------------------+
| [Details] [Portraits] [Scenes]                 |
+-----------------------------------------------+
| (tab content fills screen)                     |
| Details = sidebar sections stacked             |
| Portraits = gallery + prompt bar               |
| Scenes = scene cards                           |
+-----------------------------------------------+
```

---

## Sidebar Sections (Compact, Function-First)

### Basic Info (default: open)
- Name: `h-7` input, `text-xs` label
- Gender + Rating: 2-col grid, `h-7` selects
- Description: `min-h-[48px]` textarea with Suggest sparkle
- "Generate from Description" button: `h-7`, `text-xs`, calls `character-suggestions` type 'all'

### Appearance (default: open)
- **Visual Description**: single textarea, `min-h-[48px]`, maps to `traits` field. Label: "Visual Description". Placeholder: "auburn hair, green eyes, athletic build, leather jacket..."
- **Tags**: inline chip input + badges (removable). Tags are additive keywords.
- **Reference Image**: thumbnail + "Image Match Mode" badge when set. Actions: Upload | Library | Remove. "Extract Traits" button appears when reference is set (calls `describe-image`).
- **Image Model**: `ModelSelector` dropdown with speed/quality indicators
- **Generate Portrait**: `h-8` button, `text-xs`

### Personality and Voice (default: closed)
- Persona: textarea with Suggest
- Voice Tone + Mood: 2-col selects
- First Message: textarea
- Personality traits: input (comma-separated text)

### Advanced (default: closed)
- AI Model for suggestions: select
- Make Public: switch
- System Prompt: monospace textarea
- Content Rating secondary display

---

## Entry Points

| Entry | URL | Initial State |
|-------|-----|---------------|
| New blank | `/character-studio` | Empty form, Basic Info open |
| From image | `/character-studio?mode=from-image` | Upload picker shown immediately, on image selection calls `describe-image`, pre-fills appearance fields |
| From description | `/character-studio?mode=from-description` | Description field focused, "Generate from Description" button highlighted |
| Edit existing | `/character-studio/:id` | Loaded character, gallery populated |
| From Hub create | `/character-studio` | Same as blank |
| From Hub edit | `/character-studio/:id` | Same as edit existing |

---

## Implementation Order

1. **Hook enhancement**: Add `extractTraitsFromImage()` and `generateFromDescription()` to `useCharacterStudio.ts`
2. **New sidebar component**: `StudioSidebar.tsx` -- compact, collapsible sections, simplified appearance UI
3. **New workspace component**: `StudioWorkspace.tsx` -- portraits/scenes tabs, prompt bar, pose presets
4. **New page**: `CharacterStudioV3.tsx` -- two-column layout, entry mode routing, mobile tabs
5. **Trait extract dialog**: `TraitExtractDialog.tsx` -- shows extracted traits, user confirms merge
6. **Portrait "View Prompt"**: Add menu item to `PortraitGallery.tsx` context menu
7. **Route updates**: `App.tsx` routes, `CharacterHubV2.tsx` navigation links
8. **Cleanup**: Delete deprecated V1/V2 files
9. **Test**: All entry points, mobile, generation, extract-from-image flow

---

## Dependencies

- `describe-image` edge function must be built first for the "Extract from Image" feature. The rest of V3 can be built and work without it -- the Extract button simply won't appear until the function is deployed.
- Prompt template per model family (point 9) is an edge function enhancement that can be done independently.




# Playground Prompt Management for Model Comparison

## The Problem (and Why It's Two Problems That Share a Solution)

You're trying to answer two related but distinct questions:

1. **"Is this prompt good?"** -- Prompt effectiveness testing. Does the prompt produce the intended result regardless of model?
2. **"Is this model good?"** -- Model effectiveness testing. Given a known-good prompt, which model produces better output?

The Image Compare tab is uniquely positioned to answer BOTH simultaneously: same prompt, two models, side-by-side. But right now, prompts are ephemeral -- typed once, used, then lost. There's no way to reuse a proven prompt or build a library of standard test prompts.

## How This Relates to the Existing Test Architecture

The admin `PromptTestingTab` already has:
- Hardcoded `TestSeries` arrays (SDXL-specific prompts with artistic/explicit/unrestricted tiers)
- A `model_test_results` table for storing scores (overall, technical, content, consistency)
- Generation + scoring workflow with notes

**Similarities:**
- Both need a curated prompt library
- Both need scoring/rating of outputs
- Both compare model performance

**Key Differences:**
- Admin testing is SDXL/WAN-specific with hardcoded tag-soup prompts (legacy)
- Playground compare is model-agnostic (Flux, Seedream, any provider)
- Admin testing runs one model at a time; Playground runs two simultaneously
- Admin prompts are frozen in code; Playground needs editable, saveable prompts

**Recommendation:** These should NOT be merged. The admin test harness is a legacy SDXL tool. The Playground compare view is the modern, model-agnostic testing surface. But they should share the same storage table for results so scoring data aggregates in one place.

## Proposed UX: "Prompt Drawer" in Image Compare

Instead of a complex management UI, add a lightweight **collapsible drawer** above the shared prompt input. This keeps the compare view clean while giving power users prompt management.

```text
+--------------------------------------------------+
|  Panel A (Model + Results)  |  Panel B (Model + Results)  |
|                             |                             |
+--------------------------------------------------+
| [v] Saved Prompts                          [+ Save] |
|  +-----------+  +-----------+  +-----------+       |
|  | Portrait  |  | Landscape |  | Action    |  ...  |
|  | lighting  |  | wide shot |  | scene     |       |
|  +-----------+  +-----------+  +-----------+       |
+--------------------------------------------------+
| [Prompt input area...]                    [Send]  |
+--------------------------------------------------+
```

### How It Works

1. **Save a prompt**: User types a prompt, clicks "Save" (bookmark icon). Prompt gets a short name and optional tags (t2i, i2i, flux, anatomy, lighting, etc.)
2. **Load a prompt**: Click a saved prompt chip to populate the input area. Edit freely before sending.
3. **Prompt cards**: Small horizontally-scrollable chips showing name + truncated text. Click to load, long-press/right-click to edit or delete.
4. **No categories or folders**: Tags only. Filter by tag if the list grows. Keep it flat and fast.

### Where Prompts Live

**New table: `playground_prompts`** (not reusing `prompt_templates` -- those are system prompts for enhancement/roleplay, not user test prompts)

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | PK |
| user_id | uuid | Owner (RLS) |
| name | text | Short label ("Portrait lighting test") |
| prompt_text | text | The actual prompt |
| tags | text[] | Filterable tags: t2i, i2i, flux, seedream, anatomy, etc. |
| task_type | text | t2i, i2i, i2v (to filter by current model type) |
| is_standard | boolean | Admin-created standard prompts visible to all users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS:** Users see their own prompts + any row where `is_standard = true`.

This lets admins seed standard benchmark prompts (the 10 test prompts from the Flux audit) while users can save their own.

### Scoring Integration

The `QuickRating` component is already on every tile (from the previous plan). Ratings are per-generation and tied to `jobId`. No additional scoring UI needed -- the existing `QuickRating` + `UnifiedLightbox` with generation details covers it.

For aggregate analysis (which model scores better across N prompts), that's a reporting/admin concern, not a playground UX concern. The data is already being collected via QuickRating.

### Vision Model Assist

The vision model could analyze outputs and auto-suggest scores, but that's a separate feature. The immediate need is just: save, load, and reuse prompts. Vision-assisted scoring can layer on top later without changing the prompt management architecture.

## Technical Plan

### 1. Create `playground_prompts` table

SQL migration to create the table with RLS policies allowing users to manage their own prompts and read standard ones.

### 2. Create `usePlaygroundPrompts` hook

- `usePlaygroundPrompts(taskType?)` -- fetches user's prompts + standard prompts, filtered by task_type if provided
- `savePrompt(name, text, tags, taskType)` -- insert
- `updatePrompt(id, updates)` -- update own prompts only
- `deletePrompt(id)` -- delete own prompts only

### 3. Add Prompt Drawer to ImageCompareView

- Collapsible section between panels and prompt input (collapsed by default)
- Horizontal scroll of prompt chips
- "Save" button (bookmark icon) next to the send button
- Simple inline dialog for naming when saving
- Tag filter pills when list exceeds ~8 prompts
- Auto-detect `task_type` from currently selected model (t2i vs i2i vs i2v)

### 4. Seed standard test prompts

Insert ~10 admin-owned standard prompts (`is_standard = true`) covering the benchmark categories from the Flux audit: texture/anatomy, spatial logic, lighting, color accuracy, multi-subject, surgical edits.

### Files to Create/Modify

| File | Action |
|------|--------|
| SQL migration (via dashboard) | Create `playground_prompts` table + RLS |
| `src/hooks/usePlaygroundPrompts.ts` | New hook for CRUD |
| `src/components/playground/PromptDrawer.tsx` | New component -- collapsible prompt chips |
| `src/components/playground/SavePromptDialog.tsx` | New component -- name + tags input |
| `src/components/playground/ImageCompareView.tsx` | Add PromptDrawer above prompt input |


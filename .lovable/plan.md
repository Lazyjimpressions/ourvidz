

# API Models Tab Redesign -- Compact, Function-First Admin UX

## Problem
The current API Models page renders each model as a full-width Card with verbose labels and large padding, wasting vertical space. Editing requires a separate form Card that pushes content off-screen. There is no grouping, no filtering, no quick toggles, and no way to scan 13+ models efficiently.

## Design Approach

Replace the card-per-model layout with a **dense, grouped data table** that supports **inline editing**, **quick-action toggles**, and **collapsible sections by modality**.

```text
+-------------------------------------------------------------------+
| API Models                            [Filter: All v]  [+ Add]    |
+-------------------------------------------------------------------+
| > IMAGE (5 models)                                                |
|-------------------------------------------------------------------|
| Name         | Provider | Task       | Key (trunc) | Pr | Df | On |
| Seedream 4.5 | fal.ai   | generation | fal-ai/by.. | 50 | .  | Y  |
| Seedream 4   | fal.ai   | generation | fal-ai/by.. | 10 | *  | Y  |
| ...          |          |            |             |    |    |    |
|-------------------------------------------------------------------|
| > ROLEPLAY (5 models)                                             |
|-------------------------------------------------------------------|
| Name         | Provider | Task       | Key (trunc) | Pr | Df | On |
| MythoMax 13B | OpenRtr  | roleplay   | gryphe/my.. |  0 | *  | Y  |
| ...          |          |            |             |    |    |    |
|-------------------------------------------------------------------|
| > VIDEO (1 model)                                                 |
|-------------------------------------------------------------------|
| WAN 2.1 I2V  | fal.ai   | generation | fal-ai/wa.. | 13 | *  | Y  |
+-------------------------------------------------------------------+
```

## Key UX Features

1. **Grouped by modality** -- Collapsible sections (image, video, roleplay, chat, etc.) using the existing Collapsible component. Each header shows model count and can be expanded/collapsed.

2. **Dense table rows** -- Each model is a single table row (~32px tall) with columns: Display Name, Provider, Task, Model Key (truncated with tooltip), Family, Priority, Default (star icon toggle), Active (switch toggle), Actions (edit/delete icon buttons).

3. **Inline toggle switches** -- "Active" and "Default" columns use clickable Switch/star icon that immediately fire update mutations. No form needed for these common operations.

4. **Inline cell editing** -- Clicking the Display Name, Priority, or Model Key cells opens the existing `EditableCell` component for immediate inline edits with Enter to save, Escape to cancel.

5. **Slide-out or collapsible add/edit form** -- Instead of a full-width Card form, the "Add Model" and row-level "Edit" button open a compact collapsible panel above the table (or a Sheet/drawer). The form uses a tighter 3-column grid layout.

6. **Filter bar** -- A small filter row with: modality dropdown, task dropdown, provider dropdown, and active/inactive toggle. Filters the visible rows client-side.

7. **Bulk count badges** -- Section headers show counts like "IMAGE (5)" and a colored dot for how many are active vs inactive.

8. **Delete confirmation** -- Replace `window.confirm` with an AlertDialog component for a polished experience.

## Technical Details

### File: `src/components/admin/ApiModelsTab.tsx` (full rewrite)

**State additions:**
- `filterModality`, `filterTask`, `filterProvider` -- string filter states
- `expandedSections` -- `Set<string>` tracking which modality groups are open (all open by default)
- `editingCellId` -- string tracking which cell is being inline-edited
- `showAddForm` -- boolean for the add form panel

**Grouping logic:**
```text
const grouped = models grouped by model.modality
  -> sorted within each group by priority DESC, then display_name ASC
```

**Table columns:**
| Column | Width | Behavior |
|--------|-------|----------|
| Display Name | flex | Inline editable via EditableCell |
| Provider | 100px | Read-only badge |
| Task | 90px | Inline editable select |
| Model Key | 180px | Truncated, tooltip, inline editable |
| Family | 80px | Inline editable text |
| Priority | 50px | Inline editable number |
| Default | 40px | Star icon toggle, instant mutation |
| Active | 50px | Switch toggle, instant mutation |
| Actions | 60px | Edit (pencil opens full form), Delete (trash with AlertDialog) |

**Inline mutations:**
- Toggling Active/Default fires `updateModelMutation` immediately with just `{ id, is_active }` or `{ id, is_default }`
- EditableCell onSave fires `updateModelMutation` with the single changed field

**Add/Edit form (compact):**
- Rendered as a collapsible section at top of page (reuse Collapsible)
- 3-column grid for core fields (provider, display name, model key)
- 3-column grid for type fields (modality, task, priority)
- Single row for version, family, output format, endpoint path
- JSON textarea for input_defaults only (capabilities and pricing rarely edited)
- Active + Default toggles on same row
- Save / Cancel buttons

**Components used (all existing):**
- `Table, TableHead, TableRow, TableCell` from ui/table
- `Switch` for active toggle
- `EditableCell` for inline text/number/select editing
- `Collapsible, CollapsibleTrigger, CollapsibleContent` for modality sections
- `Badge` for provider names and status
- `AlertDialog` for delete confirmation
- `Select` for filter dropdowns
- `Tooltip` for truncated model keys

**No new dependencies required.**

### Other files unchanged
- Mutations, query keys, and Supabase calls remain the same -- only the rendering layer changes
- `useAdminApiProviders` hook reused as-is for the provider dropdown


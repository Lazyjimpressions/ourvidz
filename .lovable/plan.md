

## Combine Tasks and Defaults into a Single Interactive Column

### What Changes

The current table has two separate columns: **"Task"** (line 335, showing task badges) and **"Defaults"** (line 341, showing default badges via a popover). These will be merged into one **"Tasks"** column with inline-clickable badges.

### How It Works

Each model row shows all eligible tasks as badge chips. The badge styling indicates state:

- **Filled/primary badge**: Task is a **default** (model is the default for this task)
- **Outline badge**: Task is **eligible** (model can be used for this task, but is not the default)
- **Not shown**: Model is not eligible for this task

**Click behavior on each badge:**
- **Single click on an outline badge**: Promotes it to default (adds to `default_for_tasks`)
- **Single click on a filled/default badge**: Demotes it back to eligible-only (removes from `default_for_tasks`)
- This keeps task assignment via the existing popover or form, and uses inline clicks purely for toggling default status

**Adding/removing tasks** still happens through the popover (triggered by a small "+" button or by clicking empty space in the cell), since that's a less frequent operation.

### Column Layout Change

| Before | After |
|--------|-------|
| Task column (outline badges, read-only) | **Removed** |
| Defaults column (popover with checkboxes) | **Removed** |
| -- | **Tasks** column: interactive badges, click to toggle default. Small "+" to open task assignment popover. |

### Technical Details

**File:** `src/components/admin/ApiModelsTab.tsx`

1. **Remove the "Task" SortableHead** (line 335) and its TableCell (lines 438-447)
2. **Replace the "Defaults" SortableHead** (line 341) with **"Tasks"** and widen to ~120px
3. **Replace the Defaults TableCell** (lines 506-543) with a unified cell:
   - Render each task in `model.tasks` as a Badge
   - Badge variant: `"default"` (filled) if task is in `default_for_tasks`, `"outline"` otherwise
   - `onClick` on each badge toggles it in/out of `default_for_tasks` (calls `onUpdate`)
   - A small `+` icon button opens the existing task-assignment Popover (checkbox list of all TASKS to add/remove from `model.tasks`)
4. **Update the ModelForm** (lines 590-775):
   - Merge the separate "Tasks" popover (line 660-695) and "Defaults" checkboxes (lines 744-762) into one unified section
   - Show all TASKS as checkboxes; checked = eligible. A second toggle (star icon or highlight) = default
5. **Sort key** `"task"` updated to sort by number of tasks or first task alphabetically


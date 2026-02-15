

# Fix Schema Paste and Rendering

## Problem
When pasting a fal.ai schema, parameters show "Unsupported type" with no editable controls, no defaults, and no descriptions. Three bugs cause this.

## Root Causes

1. **mapFalSchema is never called** -- The paste handler parses the JSON successfully in the first try block and applies the raw fal.ai schema directly (with types like `"number"`, `"array"` that the renderer doesn't understand). The mapper function only runs in the catch block, which never fires.

2. **mapFalSchema misses fal.ai patterns** -- fal.ai schemas use `"number"` (not `"float"`), `"array"`, nested `allOf`/`anyOf`/`$ref` for enums, and properties with `title`/`description` but no explicit `type`. The mapper doesn't handle these.

3. **No fallback for unknown types** -- `ParamControl` renders "Unsupported type: X" instead of falling back to a text input.

## Changes

### File: `src/components/admin/SchemaEditor.tsx`

**1. Fix `PasteSchemaDialog.handleApply`**
- Detect fal.ai format (has `properties` key, or nested objects with `type`/`title`/`description`) and always run `mapFalSchema` when detected.
- Only apply raw JSON directly if it already matches our internal `ParamSchema` format (has types like `"integer"`, `"float"`, `"boolean"`, `"enum"`).

**2. Expand `mapFalSchema` to handle all fal.ai patterns**
- `"number"` maps to `"float"`
- `"integer"` maps to `"integer"`
- `"boolean"` maps to `"boolean"`
- `"string"` with `enum` maps to `"enum"` with `options`
- `"string"` without `enum` maps to `"string"`
- `"array"` maps to `"string"` (comma-separated fallback, with a note in description)
- `"object"` with `properties` maps to `"object"` with recursively mapped sub-properties
- `allOf`/`anyOf` containing `enum` values extracts them into an `"enum"` type
- `$ref` patterns: skip or map to `"string"` fallback
- Extract `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum` for range constraints
- Extract `default`, `title` (to `label`), `description`

**3. Add fallback in `ParamControl`**
- The `default` case in the switch statement renders a text `Input` instead of the static "Unsupported type" message, so any unmapped type is still editable.

**4. Show defaults and descriptions after paste**
- After mapping, pre-populate `inputDefaults` from schema defaults for all active params (params with a `default` value get auto-activated).
- Ensure `description` from fal.ai schema flows through to the tooltip icon on each parameter row.

## Result After Fix
Pasting a fal.ai schema will show each parameter with:
- Toggle switch (active/inactive)
- Proper label (from `title` or key name)
- Correct control (slider for numbers with range, dropdown for enums, switch for booleans, text input for strings)
- Default value pre-filled
- Info icon with description tooltip
- Range indicator for numeric params


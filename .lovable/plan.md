

# Redesign: Parse llms.txt for One-Paste Model Setup

## Approach

Replace the current broken JSON schema paste with a single text box that accepts the **llms.txt markdown** content from fal.ai. The llms.txt format is consistent, flat, and contains every piece of information we need -- no `$ref` resolution, no recursive parsing, no format detection heuristics.

The admin copies the content from `https://fal.ai/models/{model_key}/llms.txt` and pastes it. One paste populates everything.

## Why llms.txt over OpenAPI JSON

| | llms.txt | OpenAPI JSON |
|---|---|---|
| Types | Inline (`integer`, `string`, `boolean`) | Requires `$ref` resolution |
| Ranges | Inline (`Range: 9 to 161`) | Split across `minimum`/`maximum` |
| Enums | Inline (`Options: "480p", "720p"`) | Nested in `$ref` to `$defs` |
| Defaults | Inline (`Default: 121`) | Inline (this works) |
| Required | Inline (`_required_`) | Separate `required` array |
| CORS | N/A (paste, not fetch) | Blocked from browser |
| Complexity | Regex on flat text | Recursive JSON traversal |

## What Gets Parsed from llms.txt

Each parameter line follows this pattern:
```text
- **`param_name`** (`type`, _required/optional_):
  Description text
  - Default: `value`
  - Options: `"opt1"`, `"opt2"`, `"opt3"`
  - Range: `min` to `max`
```

Maps to our `ParamSchema`:
- `param_name` -> key
- `type` -> mapped type (`integer` -> `integer`, `string` -> `string`, `boolean` -> `boolean`, `list<X>` -> `string` with note, enum types like `ResolutionEnum` -> `enum`)
- `_required_` -> `required: true`
- Description text -> `description`
- `Default: value` -> `default`
- `Options: ...` -> `type: 'enum'`, `options: [...]`
- `Range: min to max` -> `min`, `max`

## Changes

### File: `src/components/admin/SchemaEditor.tsx`

**1. Add `parseLlmsTxt` function**

New utility that takes the raw llms.txt markdown string and returns `{ schema: InputSchema, defaults: Record<string, any> }`.

Parsing logic (regex-based):
- Split on parameter entries matching `- **\`param_name\`**`
- For each entry, extract:
  - Key name from backticks
  - Type from parentheses (handle `list<X>`, enum type names, primitives)
  - Required/optional from italics
  - Description from the line after the header
  - Default value from `- Default:` line
  - Options from `- Options:` line (split on commas, strip quotes/backticks)
  - Range from `- Range:` line (extract two numbers)
- If type name ends with `Enum` or has `Options:` line, map to `type: 'enum'`
- `list<X>` maps to `type: 'string'` with description noting it's a JSON array

**2. Update `PasteSchemaDialog` to accept both formats**

- Change placeholder to: `"Paste llms.txt content or JSON schema..."`
- Detection: if text starts with `#` or contains `## Input Schema` or `- **\`` -> parse as llms.txt
- Otherwise: fall through to existing JSON parsing logic
- This keeps backward compatibility with any existing JSON paste workflows

**3. Also extract metadata for auto-fill (bonus)**

The llms.txt header contains useful info that could pre-fill other form fields:
- `## Overview` -> `Endpoint`, `Model ID`, `Category`
- `## Pricing` -> cost per unit

For now, we only use the Input Schema section. Metadata extraction can be added later.

## Expected Result

Pasting the LTX Video 13B llms.txt will produce:

| Parameter | Type | Control | Default | Range |
|---|---|---|---|---|
| prompt | string | text input | -- | -- |
| negative_prompt | string | text input | "worst quality..." | -- |
| loras | string | text input (JSON array note) | [] | -- |
| resolution | enum | dropdown [480p, 720p] | 720p | -- |
| aspect_ratio | enum | dropdown [9:16, 1:1, 16:9, auto] | auto | -- |
| seed | integer | number input | -- | -- |
| num_frames | integer | slider | 121 | 9-161 |
| first_pass_num_inference_steps | integer | slider | 8 | 2-20 |
| first_pass_skip_final_steps | integer | slider | 1 | 0-20 |
| second_pass_num_inference_steps | integer | slider | 8 | 2-20 |
| second_pass_skip_initial_steps | integer | slider | 5 | 1-20 |
| frame_rate | integer | slider | 30 | 1-60 |
| expand_prompt | boolean | toggle | false | -- |
| reverse_video | boolean | toggle | false | -- |
| enable_safety_checker | boolean | toggle | true | -- |
| constant_rate_factor | integer | slider | 35 | 20-60 |
| image_url | string | text input | -- | -- |

All params auto-activated with defaults pre-filled. Required params (prompt, image_url) marked with "req" badge.

## Future Enhancement (not in this change)

Add a "Fetch Docs" button that auto-fetches the llms.txt via an edge function proxy using the model_key already entered in the form. This eliminates even the copy-paste step. But the paste approach works now with zero infrastructure changes.



# Fix Schema Paste: Resolve $ref, Improve Mapping, Clarify UI

## Problem
Pasting a fal.ai schema results in only one parameter (loras) appearing because most fal.ai properties use `$ref` references that get skipped. The capabilities box shows raw `input_schema` JSON which is confusing.

## Root Causes

1. **`$ref` properties are skipped** -- Line 630 in `mapFalSchema` skips any property with `$ref` when it lacks `type`/`allOf`/`anyOf`. fal.ai schemas use `$ref` extensively to reference `$defs` for enums, image sizes, LoRA configs, etc. Nearly every parameter gets dropped.

2. **`$defs`/`definitions` never resolved** -- The mapper doesn't pass the top-level schema's `$defs` block down to look up what `$ref` points to. Without resolving references, most properties are unrecognizable.

3. **Capabilities raw JSON includes `input_schema`** -- When the user toggles "Raw JSON" on the Capabilities editor, they see the full capabilities JSONB including `input_schema` nested inside. This makes it look like the paste populated the wrong box.

## Changes (all in `src/components/admin/SchemaEditor.tsx`)

### 1. Resolve `$ref` references in `mapFalSchema`

- Pass the top-level `$defs` (or `definitions`) object into `mapFalSchema` and `mapFalProperty`.
- When a property has `$ref`, look up the referenced definition and merge/use it.
- Common fal.ai `$ref` patterns: `"$ref": "#/$defs/ImageSize"`, `"$ref": "#/$defs/LoraWeight"`.
- Resolution logic: extract the key from the `$ref` path (last segment after `/`), look it up in `$defs`, then map that definition.

### 2. Handle properties with both `$ref` and other keys

- Some fal.ai properties combine `$ref` with `default`, `description`, or `title` at the property level. Merge the resolved `$ref` definition with the property-level overrides.

### 3. Improve `mapFalProperty` for resolved types

- After resolving `$ref`, the definitions often have `enum`, `properties`, or standard types that the existing mapper already handles.
- For unresolvable `$ref` (no matching definition found), fall back to `type: "string"` instead of skipping entirely.

### 4. Fix CapabilitiesEditor raw JSON

- In raw JSON mode, exclude `input_schema` from the displayed/edited JSON (same as structured mode already does with `const { input_schema, ...otherCaps }`).
- When saving from raw JSON mode, preserve `input_schema` by merging it back in.

### 5. Add section descriptions

- Add a small helper line under each section header:
  - Input Parameters: "Default values sent to the API for each generation"
  - Capabilities: "Feature flags and metadata (not sent to API)"

## Technical Detail

```text
// Current (skips $ref):
if (def.$ref && !def.type && !def.allOf && !def.anyOf) continue;

// Fixed: resolve $ref from $defs
const defs = falSchema.$defs || falSchema.definitions || {};

function resolveRef(def, defs) {
  if (def.$ref) {
    const refKey = def.$ref.split('/').pop();
    const resolved = defs[refKey];
    if (resolved) {
      // Merge: property-level fields override resolved definition
      return { ...resolved, ...def, $ref: undefined };
    }
  }
  return def;
}
```

## Result After Fix

Pasting a fal.ai schema (e.g., ltx-video, flux-lora) will:
- Resolve all `$ref` references and show every parameter with proper controls
- Show enum dropdowns for referenced types (like image sizes, aspect ratios)
- Show nested object editors for complex types (like LoRA configs)
- Keep the capabilities box clean (no leaked `input_schema` in raw view)
- Clearly label what each section does


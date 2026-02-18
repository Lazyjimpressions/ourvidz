

# Revised Fix 1: Default Safety Checker to OFF

## Problem

The approved plan's Fix 1 sets `enable_safety_checker = true` for SFW content as the default. But Flux models should have safety checker **off** by default (their `input_defaults` already has `enable_safety_checker: false`). The edge function ignores this because it hardcodes the value at lines 590-597.

## Revised Approach

Instead of choosing `true` vs `false` based purely on content mode, the edge function should:

1. Read the model's `input_defaults` value for the safety parameter first
2. Only force-override for NSFW content (always disable)
3. For SFW, respect whatever the model's `input_defaults` says (Flux = off, Seedream = off/unset)

Since all our models should have safety off by default (this is an adult platform), the simplest correct fix is:

**Always default safety to OFF. Only set it to ON if the model's `input_defaults` explicitly says so.**

## Revised Code for Fix 1 (Lines 590-597)

```text
const safetyParam = capabilities?.safety_checker_param || 'enable_safety_checker';

if (safetyParam === 'safety_tolerance') {
  // Kontext-style: use safety_tolerance (string '1'-'6', 6 = most permissive)
  modelInput.safety_tolerance = contentMode === 'nsfw' ? '6' : (inputDefaults?.safety_tolerance || '6');
} else {
  // Standard: enable_safety_checker (boolean) — default OFF
  modelInput.enable_safety_checker = inputDefaults?.enable_safety_checker ?? false;
}
```

This means:
- **Flux-2 models**: `input_defaults` has `enable_safety_checker: false` -> stays false
- **Seedream models**: `input_defaults` has no value -> defaults to `false`
- **Kontext**: Uses `safety_tolerance: '6'` (most permissive)
- **Any future model** that needs safety ON can set `input_defaults.enable_safety_checker: true`

## DB Update

Backfill `safety_checker_param` on Flux-2 models so the edge function reads it consistently:

```sql
UPDATE api_models
SET capabilities = jsonb_set(capabilities, '{safety_checker_param}', '"enable_safety_checker"')
WHERE model_key LIKE 'fal-ai/flux-2%'
  AND (capabilities->>'safety_checker_param') IS NULL;
```

## Fixes 2 and 3 remain unchanged from the approved plan

- Fix 2: Schema-aware aspect ratio / image size handling
- Fix 3: Remove `enable_safety_checker` from `alwaysAllowed` set

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/fal-image/index.ts` | Three fixes (revised Fix 1, unchanged Fix 2 and Fix 3) |

## Database Update

| Change | Scope |
|--------|-------|
| Backfill `safety_checker_param` on Flux-2 models | 3 rows |


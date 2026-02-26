

# Surface Meaningful Generation Errors to Users

## Problem
When portrait generation fails due to content policy violations (or other specific errors), users see a generic "Generation failed" / "Edge function failed" toast. The edge function actually returns structured error details (e.g., `{ error: "Image generation failed", details: "content_policy_violation" }`), but the client never parses or displays them.

## Solution

### 1. Parse structured errors from edge function responses
**Files:** `src/hooks/useCharacterStudio.ts`, `src/pages/CreateCharacter.tsx`

When `supabase.functions.invoke` returns an error or the response body contains `data.error`, extract the `details` field and map known error codes to user-friendly messages.

### 2. Error message mapping utility
**New file:** `src/lib/utils/generationErrors.ts`

A small utility that maps known provider error codes/strings to actionable user messages:

| Provider Error | User Message |
|---|---|
| `content_policy_violation` | "This prompt was flagged by the model's content filter. Try adjusting appearance tags or switching to a Flux model." |
| `rate_limit` / `429` | "Too many requests. Please wait a moment and try again." |
| `timeout` / `504` | "Generation timed out. Try again or use a faster model." |
| `invalid_input` / `422` (non-policy) | "Invalid generation settings. Try different options." |
| Unknown | "Generation failed. Please try again or switch models." |

### 3. Update error handling in both call sites

**`useCharacterStudio.ts` (~lines 456-508):**
- When `error` is returned from `invoke`, attempt to parse `error.message` or the response context for structured details
- When `data?.error` is returned, also check `data?.details`
- Pass the raw details string through the mapping utility
- Show the mapped message in the toast `description`

**`CreateCharacter.tsx` (~lines 215-232):**
- Same pattern: check `data?.details` alongside `data?.error`
- Use the mapping utility for the toast description

### 4. Suggest model switch for content policy errors
When the error is specifically `content_policy_violation`, append a hint: "Flux models are more permissive for this type of content." This aligns with the existing knowledge that Flux-family models bypass provider-level filters.

## Files to Change

| File | Change |
|---|---|
| `src/lib/utils/generationErrors.ts` | **New** -- error code to user message mapper (~30 lines) |
| `src/hooks/useCharacterStudio.ts` | Parse `data.details` from edge response; use mapper for toast description |
| `src/pages/CreateCharacter.tsx` | Same structured error parsing and user-friendly toast |

## What This Fixes
- Content policy violations show "Prompt flagged by content filter -- try a Flux model" instead of "Edge function failed"
- Timeouts, rate limits, and other known failures get specific, actionable messages
- Unknown errors still show a reasonable fallback


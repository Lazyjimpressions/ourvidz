

# Remove Hardcoded NSFW Guidance from playground-chat

## Problem

The edge function contains a ~10-line hardcoded `NSFW_ROLEPLAY_GUIDANCE` constant that gets force-appended to system prompts in **4 separate code paths**, regardless of whether the template or character already defines NSFW behavior. This:

- Duplicates what templates already handle dynamically
- Corrupts non-roleplay overrides (like prompt engineering)
- Makes the NSFW rules impossible to update without redeploying the edge function

The dynamic system already covers this:
- Characters have `content_rating` (sfw/nsfw)
- Scenes define their own content tier
- Templates are tagged with `content_mode` (sfw/nsfw)
- The `content_tier` parameter is passed from the client
- Prompt enhancement templates include explicit/nsfw/sfw instructions inline

## Changes

### File: `supabase/functions/playground-chat/index.ts`

**1. Remove the hardcoded constants (lines ~131-149)**

Delete `NSFW_GUIDANCE_MARK`, `NSFW_ROLEPLAY_GUIDANCE`, `NSFW_STRICT_MARK`, `ROLEPLAY_FORMAT_MARK`, and `ROLEPLAY_FORMAT_RULES` constants entirely.

**2. Remove all 4 append sites**

- **Line ~209-212**: Remove NSFW guidance upgrade on cached roleplay prompts
- **Line ~288-290**: Remove NSFW guidance append on processed roleplay prompts
- **Line ~415-418**: Remove NSFW guidance append on general chat prompts
- **Line ~700-703**: Remove NSFW guidance append on system_prompt_override path

**3. Remove diagnostic references**

- **Line ~724-725**: Remove `has_format_mark` and `has_nsfw_mark` checks in the logging snippet (they reference the deleted markers)

**4. Keep everything else**

- Template resolution via `getChatTemplateFromCache()` stays -- it already selects the right template by `content_tier`
- Character `content_rating` logic stays
- `content_tier` / `finalTier` resolution stays
- The `system_prompt_override` path stays, but now passes the override through cleanly without appending anything

## Result

NSFW behavior is governed entirely by:
1. The selected template's `system_prompt` (tagged sfw/nsfw in the database)
2. The character's `content_rating` field
3. The `content_tier` parameter from the client

No hardcoded rules are injected at the edge function level. Templates can be updated in the database without redeployment.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/playground-chat/index.ts` | Remove hardcoded NSFW/format constants and all 4 append sites; rely on dynamic template system |


# Table: system_config (cache JSON)

Purpose: Stores application-wide config including prompt/template caches to avoid frequent DB reads.

Row used for cache: id = 1, column: config (jsonb)

## JSON Shape (example)
```json
{
  "templateCache": {
    "chat": {
      "sfw": { "chat": {"system_prompt":"...","token_limit":400}, "character_roleplay": {"system_prompt":"..."} },
      "nsfw": { "chat": {"system_prompt":"...","token_limit":600}, "character_roleplay": {"system_prompt":"..."} }
    },
    "enhancement": {
      "sdxl": { "sfw": {"system_prompt":"..."}, "nsfw": {"system_prompt":"..."} },
      "wan": { "sfw": {"system_prompt":"..."}, "nsfw": {"system_prompt":"..."} }
    }
  },
  "negativeCache": { "sdxl": {"sfw": ["..."], "nsfw": ["..."] } },
  "nsfwTerms": ["..."],
  "metadata": { "refreshed_at": "2025-08-08T00:00:00Z", "template_count": 12, "negative_prompt_count": 5, "cache_version": "v1", "integrity_hash": "..." }
}
```

## Integration Map
- Edge Functions: enhance-prompt, playground-chat (via shared cache-utils)
- Shared module: supabase/functions/_shared/cache-utils.ts

## Refresh Policy
- Refresh via a dedicated admin/edge function (e.g., `refresh-prompt-cache`).
- Warn if `refreshed_at` older than 24h; log counts and integrity.
- On cache miss, fall back to DB selection and optionally repopulate.

## Troubleshooting
- If template lookups fail: verify keys exist at `templateCache.chat|enhancement` for desired tier/type.
- Ensure integrity of `nsfwTerms` and `negativeCache` before content-tier detection.

## Example Read
```sql
select config from system_config where id = 1;
```

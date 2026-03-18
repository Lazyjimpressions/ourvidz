

## Fix Replicate Constructor Inconsistency

### Change

In `supabase/functions/replicate-webhook/index.ts` line 254, change:

```typescript
const replicate = new Replicate({ token: replicateApiToken });
```

to:

```typescript
const replicate = new Replicate({ auth: replicateApiToken });
```

This aligns with `replicate-image/index.ts` which uses `{ auth: ... }` consistently (lines 200 and 338).

### Verification

After the fix, the edge function will be auto-deployed. We can check the deployment logs in Supabase dashboard to confirm successful deployment of all four edge functions.


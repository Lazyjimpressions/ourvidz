# Replicate Secrets Validation

## Secret Usage Analysis

### ✅ Both Functions Are Correctly Configured

## Function 1: `replicate-image`

### Secret Used: `REPLICATE_API_TOKEN` (via database)

**How it's retrieved:**
```typescript
const replicateApiKey = Deno.env.get(apiModel.api_providers.secret_name);
// apiModel.api_providers.secret_name = 'REPLICATE_API_TOKEN' (from database)
```

**Usage:**
- Authenticates with Replicate API to create predictions
- Uses database-driven approach (follows `api_providers.secret_name`)
- ✅ **Correct**: Uses `REPLICATE_API_TOKEN` from database configuration

**Replicate SDK initialization:**
```typescript
const replicate = new Replicate({ auth: replicateApiKey });
```

---

## Function 2: `replicate-webhook`

### Secret 1: `REPLICATE_WEBHOOK_SECRET` ✅

**How it's retrieved:**
```typescript
const WEBHOOK_SECRET = Deno.env.get('REPLICATE_WEBHOOK_SECRET')
```

**Usage:**
- Verifies HMAC SHA-256 signature of webhook requests
- Prevents unauthorized webhook calls
- ✅ **Correct**: Properly configured for security

**Verification logic:**
```typescript
if (WEBHOOK_SECRET) {
  // Verify signature matches
  // Reject if signature doesn't match
} else {
  // Warning: Verification disabled (not recommended)
}
```

### Secret 2: `REPLICATE_API_TOKEN` ✅

**How it's retrieved:**
```typescript
const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
```

**Usage:**
- Fetches completed prediction details for validation
- Extracts cost from prediction (`metrics.cost`)
- Updates usage logs with actual cost
- ✅ **Correct**: Hardcoded name is appropriate here (no model context in webhook)

**Replicate SDK initialization:**
```typescript
const replicate = new Replicate({ token: replicateApiToken });
```

**Note:** Uses `{ token: ... }` instead of `{ auth: ... }` - both are valid Replicate SDK options.

---

## Database Configuration

**Verified:**
```sql
SELECT name, secret_name FROM api_providers WHERE name = 'replicate';
-- Result: name='replicate', secret_name='REPLICATE_API_TOKEN'
```

✅ Database correctly configured with `REPLICATE_API_TOKEN`

---

## Summary

| Function | Secret | Source | Status | Purpose |
|-----------|--------|-------|--------|---------|
| `replicate-image` | `REPLICATE_API_TOKEN` | Database (`api_providers.secret_name`) | ✅ Correct | Create predictions |
| `replicate-webhook` | `REPLICATE_WEBHOOK_SECRET` | Environment variable (hardcoded) | ✅ Correct | Verify webhook signatures |
| `replicate-webhook` | `REPLICATE_API_TOKEN` | Environment variable (hardcoded) | ✅ Correct | Fetch prediction details/cost |

---

## Potential Improvement (Optional)

The `replicate-webhook` function could also use the database-driven approach for `REPLICATE_API_TOKEN`:

**Current (hardcoded):**
```typescript
const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN');
```

**Alternative (database-driven):**
```typescript
// Fetch provider config from database
const { data: provider } = await supabase
  .from('api_providers')
  .select('secret_name')
  .eq('name', 'replicate')
  .single();
  
const replicateApiToken = Deno.env.get(provider.secret_name);
```

**Why current approach is fine:**
- Webhook doesn't have model context (no `apiModel` available)
- Hardcoded name is simpler and works correctly
- Both secrets must exist in Supabase environment anyway
- No functional difference

---

## Required Supabase Secrets

Both secrets must be configured in Supabase Edge Function environment:

1. ✅ `REPLICATE_API_TOKEN` - For API authentication
2. ✅ `REPLICATE_WEBHOOK_SECRET` - For webhook signature verification

**Configuration:**
- Supabase Dashboard → Edge Functions → Settings → Secrets
- Add both secrets with their values
- `REPLICATE_WEBHOOK_SECRET` must match the secret configured in Replicate dashboard

---

## Conclusion

✅ **All secrets are correctly defined and used in both functions.**

The implementation follows best practices:
- Database-driven secret names for user-facing functions
- Hardcoded secret names for system-facing functions (webhooks)
- Proper security with webhook signature verification

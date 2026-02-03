
## Fix: Scene Creation Fails for Private Scenes - JWT Validation Required

### Problem Analysis

**Root Cause Identified:**
The issue is that `supabase.auth.getSession()` **does NOT validate the JWT token** - it merely reads the cached session from localStorage. According to Supabase documentation:

> "Unlike `supabase.auth.getSession()`, which returns the session _without_ validating the JWT, `getUser()` validates the JWT before returning."

When inserting a scene with `.insert(...).select().single()`:
1. The INSERT uses the (possibly stale) JWT token
2. The automatic SELECT that follows needs to satisfy RLS: `(is_public = true) OR (creator_id = auth.uid())`

For **public scenes**: `is_public = true` satisfies the SELECT policy regardless of JWT validity
For **private scenes**: The SELECT requires `creator_id = auth.uid()`, but if the JWT is stale/invalid, `auth.uid()` returns null or a mismatched value

### Solution

Replace `getSession()` with `getUser()` to validate the JWT before database operations:

**File: `src/hooks/useSceneCreation.ts`**

```typescript
// CURRENT (does NOT validate JWT):
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) { ... }
const sessionUserId = session.user.id;

// FIXED (validates JWT with server):
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  console.error('Auth validation failed:', userError);
  toast({
    title: "Session Expired", 
    description: "Please refresh the page and log in again.",
    variant: "destructive",
  });
  return null;
}
const validatedUserId = user.id;  // This ID is guaranteed to match auth.uid()
```

### Changes Required

| File | Change |
|------|--------|
| `src/hooks/useSceneCreation.ts` | Replace `getSession()` with `getUser()` in `createScene` function |
| `src/hooks/useSceneGallery.ts` | Replace `getSession()` with `getUser()` in `createScene` function |
| `src/components/roleplay/SceneCreationModal.tsx` | Replace `getSession()` with `getUser()` in `handleCreate` function |

### Technical Details

**Why this works:**
- `getUser()` makes a network request to Supabase Auth to validate the JWT
- If the token is expired, Supabase will automatically refresh it (if possible)
- The returned `user.id` is guaranteed to match what `auth.uid()` sees on the server
- This ensures the RLS policy `creator_id = auth.uid()` will pass for private scenes

**Why public scenes work with the current code:**
- The SELECT policy has `(is_public = true) OR (creator_id = auth.uid())`
- When `is_public = true`, the first condition passes regardless of JWT validity
- Private scenes fail because they rely solely on `creator_id = auth.uid()` matching

### Specific Code Changes

**In `src/hooks/useSceneCreation.ts` (around lines 412-427):**

Replace:
```typescript
// Refresh session to ensure valid JWT token for RLS
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (sessionError || !session) {
  console.error('Session refresh failed:', sessionError);
  toast({
    title: "Session Expired",
    description: "Please refresh the page and try again.",
    variant: "destructive",
  });
  return null;
}

// Use session user ID to ensure it matches auth.uid() for RLS
const sessionUserId = session.user.id;
```

With:
```typescript
// Validate JWT token with server to ensure auth.uid() matches for RLS
// NOTE: getSession() does NOT validate JWT - only getUser() does
const { data: { user }, error: userError } = await supabase.auth.getUser();

if (userError || !user) {
  console.error('Auth validation failed:', userError);
  toast({
    title: "Session Expired",
    description: "Please refresh the page and log in again.",
    variant: "destructive",
  });
  return null;
}

// Use validated user ID to ensure it matches auth.uid() for RLS
const validatedUserId = user.id;
```

Then update the insert to use `validatedUserId` instead of `sessionUserId`.

**Same pattern applied to:**
- `src/hooks/useSceneGallery.ts` (lines 97-104)
- `src/components/roleplay/SceneCreationModal.tsx` (lines 231-238)

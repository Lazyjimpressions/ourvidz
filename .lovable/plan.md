

## Fix: Scene Creation Fails Due to RLS Policy Violation

### Problem Analysis

When you try to save a scene from the Create Scene modal, the operation fails with:
```
new row violates row-level security policy for table "scenes"
```

**Why This Happens:**
The RLS (Row Level Security) policy on the `scenes` table requires `creator_id = auth.uid()`. Even though you're logged in on the frontend, the authentication token sent to Supabase may be expired or stale, causing `auth.uid()` to return `null` on the server side.

This creates a mismatch:
- Frontend thinks: "User is logged in" (cached user object exists)
- Server sees: "No valid auth token" (JWT expired or not refreshed)

---

### Solution

Add session refresh before attempting scene creation to ensure a valid JWT token:

**File: `src/hooks/useSceneCreation.ts`**

```text
CHANGE (around line 380-420):

Before the database insert, add session refresh:

const createScene = useCallback(async (formData: SceneFormData) => {
  if (!user?.id) {
    toast({ title: "Not Logged In", ... });
    return null;
  }

  setIsCreating(true);

  try {
    // ADD: Refresh session to ensure valid JWT token
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

    // Existing insert logic...
```

**Also update `src/hooks/useSceneGallery.ts`** with the same pattern for its `createScene` function.

---

### Alternative/Additional Fix

The `SceneCreationModal` should validate auth state before enabling the save button:

**File: `src/components/roleplay/SceneCreationModal.tsx`**

```text
CHANGE: Add session validation before the create/update operation

In handleCreate function (around line 225):

const handleCreate = useCallback(async () => {
  // ADD: Verify session is still valid
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
      variant: "destructive",
    });
    return;
  }

  const formData: SceneFormData = { ... };
  // rest of existing logic
```

---

### Changes Summary

| File | Change |
|------|--------|
| `src/hooks/useSceneCreation.ts` | Add `supabase.auth.getSession()` check before insert |
| `src/hooks/useSceneGallery.ts` | Add `supabase.auth.getSession()` check before insert |
| `src/components/roleplay/SceneCreationModal.tsx` | Add session validation in `handleCreate` |

---

### Why This Fixes It

1. **Fresh Token**: Calling `getSession()` ensures the token is valid and triggers a refresh if needed
2. **Clear Error Message**: Users see "Session Expired" instead of a cryptic RLS error
3. **Graceful Handling**: The operation fails cleanly with actionable feedback

---

### Technical Note

The Supabase client has automatic token refresh, but there can be edge cases where:
- The refresh fails silently
- The client thinks it has a valid session but the token expired during a long form-filling session
- Network issues caused the refresh to fail

Explicitly calling `getSession()` before critical operations ensures the token is validated.


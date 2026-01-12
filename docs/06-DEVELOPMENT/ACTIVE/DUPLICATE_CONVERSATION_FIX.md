# Duplicate Conversation & Missing "Continue Where You Left Off" Fix

**Date:** 2026-01-10
**Status:** Critical Bug Fix
**Priority:** CRITICAL

---

## Problems Identified

1. **Duplicate Conversations**: Scene initiation creates two conversations instead of one
2. **Missing from "Continue Where You Left Off"**: Conversations don't appear in the dashboard
3. **Missing Scene Images**: `last_scene_image` not being set properly

---

## Root Causes

### 1. Duplicate Conversation Creation

**Issue:**
- `useEffect` with `[characterId, sceneId]` dependencies can run multiple times
- React StrictMode runs effects twice in development
- Race condition: `hasInitialized.current` check might not prevent duplicate if effect runs in parallel
- No database-level duplicate prevention

**Current Guard:**
```typescript
if (hasInitialized.current && currentRouteRef.current === routeKey) {
  return; // Prevent duplicate
}
```

**Problem:** This guard is set AFTER conversation creation, so if effect runs twice quickly, both can pass the check.

### 2. Missing from "Continue Where You Left Off"

**Issue:**
- Query filters by `last_scene_image` (line 491 in MobileRoleplayDashboard)
- `last_scene_image` is only updated in `job-callback` when job completes
- If job fails or takes time, `last_scene_image` stays null
- Conversations without `last_scene_image` are filtered out

**Query:**
```typescript
userConversations.filter(conv => conv.last_scene_image)
```

**Problem:** New conversations won't show until job completes and `last_scene_image` is set.

### 3. Scene Image Update Timing

**Issue:**
- `last_scene_image` updated in `job-callback` edge function
- Only updates if scene is found and image URL exists
- No fallback if job callback fails
- No immediate update when scene record is created

---

## Solutions

### 1. Prevent Duplicate Conversations ✅

**Add database-level check:**
- Check for existing active conversation before creating
- Use transaction or unique constraint
- Add better initialization guard

**Implementation:**
```typescript
// Check for existing conversation with same character + scene
const { data: existingConv } = await supabase
  .from('conversations')
  .select('id')
  .eq('user_id', user.id)
  .eq('character_id', characterId)
  .eq('status', 'active')
  .eq('conversation_type', sceneId ? 'scene_roleplay' : 'character_roleplay')
  .maybeSingle();

if (existingConv && !forceNewConversation) {
  conversation = existingConv;
} else {
  // Create new conversation
}
```

### 2. Fix "Continue Where You Left Off" Query ✅

**Options:**
1. **Show conversations without scene images** (but with messages)
2. **Update `last_scene_image` immediately** when scene record is created
3. **Use fallback to character image** if no scene image

**Implementation:**
```typescript
// Option 1: Show conversations with messages, even without scene images
userConversations
  .filter(conv => conv.message_count > 0) // Has messages
  .slice(0, 6)

// Option 2: Update last_scene_image when scene is created (in generateScene)
await supabase
  .from('conversations')
  .update({ last_scene_image: placeholderImageUrl })
  .eq('id', conversationId);
```

### 3. Improve Initialization Guard ✅

**Add ref-based lock:**
```typescript
const isInitializing = useRef(false);

if (isInitializing.current) {
  return; // Already initializing
}
isInitializing.current = true;

try {
  // ... initialization ...
} finally {
  isInitializing.current = false;
  hasInitialized.current = true;
}
```

---

## Implementation Plan

### Phase 1: Prevent Duplicates (Immediate)

1. Add database check for existing conversation
2. Improve initialization guard with ref lock
3. Add transaction/unique constraint if needed

### Phase 2: Fix "Continue Where You Left Off" (Immediate)

1. Update query to show conversations with messages (not just scene images)
2. Add fallback to character image if no scene image
3. Update `last_scene_image` when scene record is created

### Phase 3: Improve Scene Image Updates (Short-term)

1. Update `last_scene_image` immediately when scene is created
2. Add retry logic if job callback fails
3. Add polling fallback if realtime subscription fails

---

## Expected Results

### Before
- ❌ Two conversations created for one scene start
- ❌ Conversations don't show in "Continue Where You Left Off"
- ❌ No scene images in dashboard

### After
- ✅ One conversation per scene start
- ✅ Conversations show in "Continue Where You Left Off" (with or without scene images)
- ✅ Scene images appear when available

---

## Files to Modify

1. `src/pages/MobileRoleplayChat.tsx`
   - Add database check for existing conversation
   - Improve initialization guard
   - Add ref-based lock

2. `src/pages/MobileRoleplayDashboard.tsx`
   - Update query to show conversations with messages
   - Add fallback to character image

3. `supabase/functions/roleplay-chat/index.ts`
   - Update `last_scene_image` when scene record is created

---

## Related Documentation

- [CONVERSATION_INITIATION_FIX.md](./CONVERSATION_INITIATION_FIX.md) - Previous initialization fix

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Fix duplicate conversations and missing "Continue Where You Left Off" | Claude |

# Active Conversations Display Fix

**Date:** 2026-01-10
**Status:** Fixed
**Priority:** HIGH

---

## Problem

Active conversations are not displaying in the "Continue Where You Left Off" section on the roleplay dashboard.

---

## Root Cause

The dashboard was checking `conv.messages?.[0]?.count` but the `UserConversation` interface already includes `message_count` which is the processed value. The hook filters out empty conversations, but the dashboard was using the wrong field to check.

**Issue:**
- `useUserConversations` hook processes `messages(count)` into `message_count` field
- Hook filters out conversations with `message_count === 0` when `excludeEmpty === true`
- Dashboard was checking `conv.messages?.[0]?.count` which doesn't exist on the processed type
- Should be checking `conv.message_count` instead

---

## Solution

### 1. Update Dashboard Filter ✅

**Before:**
```typescript
.filter(conv => (conv.messages?.[0]?.count || 0) > 0)
```

**After:**
```typescript
.filter(conv => (conv.message_count || conv.messages?.[0]?.count || 0) > 0)
```

This uses the processed `message_count` field first, with fallback to `messages` array for backward compatibility.

### 2. Verify Interface ✅

The `UserConversation` interface already includes `message_count: number`, so the fix is just using the correct field.

---

## Expected Results

### Before
- Conversations with messages exist in database
- Hook filters them correctly
- Dashboard doesn't display them (wrong field check)

### After
- Conversations with messages exist in database
- Hook filters them correctly
- Dashboard displays them (correct field check)

---

## Testing

1. **Create a conversation with messages**
   - Start a roleplay conversation
   - Send a few messages
   - Verify conversation appears in "Continue Where You Left Off"

2. **Verify empty conversations are hidden**
   - Create a conversation but don't send messages
   - Verify it doesn't appear in "Continue Where You Left Off"

3. **Verify sorting works**
   - Create multiple conversations
   - Verify they're sorted by `updated_at` (most recent first)
   - Verify conversations with scene images appear first

---

## Files Modified

1. `src/pages/MobileRoleplayDashboard.tsx`
   - Updated filter to use `message_count` field
   - Added fallback to `messages` array for backward compatibility

---

## Related Documentation

- [DUPLICATE_CONVERSATION_FIX.md](./DUPLICATE_CONVERSATION_FIX.md) - Conversation creation fixes

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Fix active conversations not displaying by using correct field | Claude |

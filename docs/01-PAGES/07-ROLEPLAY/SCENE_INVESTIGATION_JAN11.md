# Scene System Investigation & Fixes - January 11, 2026

**Status:** 🟡 In Progress
**Priority:** 🔴 Critical (Blocks scene usage)

---

## Issues Reported

1. ❌ AI starting prompt loosely based on scene, not totally accurate
2. ❌ System generates TWO scene images on kickoff
3. ❌ Scene images don't display in chat (show in workspace/library only)
4. ⚠️ Images follow scene description okay, but AI prompt does not
5. ❌ User role from SceneSetupSheet not respected (e.g., "taking the shower")

---

## Root Causes Identified

### 1. Scene Description Not in AI System Prompt ✅ FIXED

**Problem:** The `scene_description` field from the `scenes` table wasn't being passed to the AI at all.

**Evidence:**
- Frontend loads `scene_description` from database
- Frontend passes `scene_description` to edge function in kickoff body
- Edge function receives `scene_description` but **never uses it in system prompt**

**Impact:** AI generates generic responses because it only sees `scene_prompt` (optimized for image generation), not `scene_description` (narrative context for humans/AI).

**Fix Applied:**
```typescript
// supabase/functions/roleplay-chat/index.ts lines 1607-1611
if (sceneDescription && sceneDescription.trim()) {
  systemPrompt += `\\n\\nSCENE SETTING:\\n${sceneDescription}\\n`;
  console.log('✅ Applied scene description to system prompt');
}
```

### 2. User Role Not Passed to AI ✅ FIXED

**Problem:** User's role from `SceneSetupSheet` wasn't being passed through to the edge function or system prompt.

**Evidence:**
- SceneSetupSheet captures `userRole` (e.g., "taking the shower")
- MobileRoleplayDashboard passes it in `location.state.userRole`
- MobileRoleplayChat stores it in `memory_data` but **doesn't pass to kickoff call**
- Edge function has no `user_role` parameter

**Impact:** AI doesn't know the user's role in the scene, so it can't acknowledge or respond to the user's specific actions/position.

**Fixes Applied:**

**Frontend** ([src/pages/MobileRoleplayChat.tsx:750-769](../../src/pages/MobileRoleplayChat.tsx#L750-769)):
```typescript
// Extract user role from location state
const userRole = locationState?.userRole || locationState?.sceneConfig?.userRole;

const { data, error } = await supabase.functions.invoke('roleplay-chat', {
  body: {
    // ... other fields ...
    user_role: userRole || null,
    user_character_id: effectiveUserCharacterId || null,
  }
});
```

**Edge Function** ([supabase/functions/roleplay-chat/index.ts:48-50,225-226](../../supabase/functions/roleplay-chat/index.ts#L48-50)):
```typescript
// Interface
interface RoleplayChatRequest {
  // ... existing fields ...
  user_role?: string; // User's role in the scene (e.g., "taking the shower")
  user_character_id?: string; // User character ID for persona integration
}

// Extraction
const { user_role, user_character_id } = requestBody;

// System Prompt Integration (lines 1613-1617)
if (userRole && userRole.trim()) {
  systemPrompt += `\\n\\nUSER'S ROLE: ${userRole}\\n`;
  systemPrompt += `Address the user according to their role in this scene. Acknowledge their presence and actions as described.\\n`;
  console.log('✅ Applied user role to system prompt:', userRole);
}
```

### 3. Scene Images Don't Display in Chat ✅ FIXED

**Problem:** Opener message from kickoff didn't include metadata needed for image polling and display.

**Evidence:**
- Scene generation happens during kickoff (edge function returns `scene_job_id`, `scene_id`)
- Frontend creates opener message but **doesn't include metadata**
- `ChatMessage` component checks `message.metadata.image_url` to display images
- Polling system checks `message.metadata.job_id` to fetch completed scenes

**Impact:** Generated scenes exist in workspace/library but never appear in chat because the message has no metadata to trigger display/polling.

**Fix Applied** ([src/pages/MobileRoleplayChat.tsx:791-805](../../src/pages/MobileRoleplayChat.tsx#L791-805)):
```typescript
// Replace loading message with actual opener
const openerMessage: Message = {
  id: data.message_id || Date.now().toString(),
  content: data.response || `Hello! I'm ${loadedCharacter.name}.`,
  sender: 'character',
  timestamp: new Date().toISOString(),
  // ✅ FIX: Include scene metadata for image display and polling
  metadata: {
    scene_generated: data.scene_generated || false,
    job_id: data.scene_job_id || undefined,
    scene_id: data.scene_id || undefined,
    usedFallback: data.usedFallback || false
  }
};
```

---

## Remaining Issue: Two Images Generated 🔍 INVESTIGATING

**Observation:** Scene kickoff generates two images instead of one.

**Investigation Findings:**

### Code Analysis ✅
1. **Single generateScene() call** - Only ONE invocation in main request handler (line 557)
2. **Multiple kickoff paths** - But these are mutually exclusive:
   - Line 761: Initial page load kickoff (`initializeConversation`)
   - Line 1665: Retry kickoff (`handleKickoffRetry`)
   - Line 1796: Clear conversation kickoff (`handleClearConversation`)
3. **useEffect dependencies** - `[characterId, sceneId]` should only trigger once on mount
4. **No obvious duplication logic** - No retry loops or fallback generation detected in code

### Possible Causes 🤔

**Theory 1: React StrictMode Double Render**
- In development, React StrictMode intentionally double-invokes effects
- This could cause `initializeConversation` to run twice
- **Test:** Check if issue persists in production build

**Theory 2: Navigation State Double Trigger**
- Scene start navigation might trigger component mount twice
- **Test:** Check browser DevTools Network tab for duplicate requests

**Theory 3: Scene Continuity / I2I Logic**
- `scene_continuity_enabled` defaults to true
- Could be generating initial scene + continuity scene
- **Test:** Temporarily set `scene_continuity_enabled: false` in kickoff

**Theory 4: Image Generation Job Queue**
- Single request might create two jobs in Upstash queue
- Could be in `generateScene()` function implementation
- **Test:** Check `generation_jobs` table for duplicate entries with same timestamp

### Investigation Steps 📋

1. **Check Supabase Edge Function Logs:**
   ```
   Supabase Dashboard → Edge Functions → roleplay-chat → Logs
   Filter by timestamp of scene start
   Count "🎬 Scene generation requested" log entries
   ```

2. **Check Database:**
   ```sql
   SELECT id, created_at, conversation_id, scene_prompt
   FROM character_scenes
   WHERE conversation_id = '{recent_conversation_id}'
   ORDER BY created_at DESC;
   ```
   - Should see if two records created at same time

3. **Check Generation Jobs:**
   ```sql
   SELECT id, created_at, job_type, status
   FROM generation_jobs
   WHERE conversation_id = '{recent_conversation_id}'
   ORDER BY created_at DESC;
   ```
   - Should see if two jobs queued

**Recommendation:** Check Supabase logs first to confirm if kickoff is called once or twice.

---

## Scene Table Fields - Wire-Through Audit

### Scenes Table Schema

| Field | Type | Frontend Loads | Passes to Edge | Edge Uses | Notes |
|-------|------|----------------|----------------|-----------|-------|
| `id` | UUID | ✅ | ✅ | ✅ | Used for conversation tracking |
| `name` | Text | ✅ | ✅ (scene_name) | ✅ | Used for conversation title, logs |
| `description` | Text | ✅ | ✅ (scene_description) | ✅ **NOW FIXED** | Human-readable narrative |
| `scene_prompt` | Text | ✅ | ✅ (scene_context) | ✅ | Image generation prompt |
| `scene_starters` | Text[] | ✅ | ✅ | ✅ | AI conversation openers |
| `scenario_type` | Text | ✅ | ❌ **NOT PASSED** | ❌ | Category (stranger, relationship, etc.) |
| `setting` | Text | ✅ | ❌ **NOT PASSED** | ❌ | Location (cafe, beach, etc.) |
| `atmosphere` | JSONB | ✅ | ❌ **NOT PASSED** | ❌ | Mood sliders (drama, romance, tension) |
| `time_of_day` | Text | ✅ | ❌ **NOT PASSED** | ❌ | Time context (morning, night, etc.) |
| `suggested_user_role` | Text | ✅ | ⚠️ **USER ENTERS CUSTOM** | ✅ **NOW FIXED** | SceneSetupSheet uses as default, user can customize |
| `content_rating` | Text | ✅ | ⚠️ **HARDCODED NSFW** | ✅ | Frontend forces 'nsfw' mode |

### Missing Fields Analysis

#### Low Priority (Nice to Have)
- `scenario_type` - Could enhance AI understanding of scene type
- `setting` - Could reinforce location context
- `time_of_day` - Could add temporal context

#### Medium Priority (Should Add)
- `atmosphere` - Could significantly improve AI mood/tone matching
  - **Recommendation:** Convert JSONB to text description and add to system prompt
  - Example: `"Atmosphere: High romance (70%), moderate tension (50%), low drama (30%)"`

---

## Testing Checklist

### Test Scene: "A Steamy Shower"

**Scene Data:**
- Name: "A Steamy Shower"
- Description: "The locker room is dimly lit, filled with the scent of fresh sweat and the faint hum of the showers running..."
- Scene Prompt: "Steamy locker room, dim lighting, misty showers..."
- Scene Starters: 3 locker room approach scenarios
- User Role: "taking the shower"

### Expected Behavior After Fixes

✅ **AI Response Quality:**
- [ ] AI mentions locker room setting (not generic campus/location)
- [ ] AI acknowledges user is "taking the shower"
- [ ] AI uses one of the 3 scene_starters as basis for greeting
- [ ] Response is first-person, in-character
- [ ] Response matches steamy/intimate tone

✅ **Scene Image Display:**
- [ ] Kickoff generates ONE scene image (not two)
- [ ] Scene image appears in chat message
- [ ] Scene image shows in workspace
- [ ] Scene image shows in scene library
- [ ] Image matches scene prompt (locker room, steam, etc.)

✅ **Console Logs (Edge Function):**
```
✅ Applied scene description to system prompt
✅ Applied user role to system prompt: taking the shower
✅ Applied scene starters from request body to system prompt: 3
🎬 Scene generation requested: { ... }
```

✅ **Console Logs (Frontend):**
```
🎬 Loaded scene template: A Steamy Shower - Steamy locker room...
✅ Using userCharacterId from navigation state: {uuid}
🎬 Kickoff call with scene context: { scene_context: "Steamy locker room...", ... }
```

---

## Files Modified

### Frontend
1. **[src/pages/MobileRoleplayChat.tsx](../../src/pages/MobileRoleplayChat.tsx)**
   - Lines 750-769: Added `user_role` and `user_character_id` to kickoff body
   - Lines 791-805: Added metadata (scene_generated, job_id, scene_id) to opener message

### Edge Function
2. **[supabase/functions/roleplay-chat/index.ts](../../supabase/functions/roleplay-chat/index.ts)**
   - Lines 48-50: Added `user_role` and `user_character_id` to RoleplayChatRequest interface
   - Lines 225-226: Extract `user_role` and `user_character_id` from request body
   - Line 438: Pass `user_role` and `scene_description` to buildSystemPrompt
   - Line 1526: Update buildSystemPrompt signature to accept userRole and sceneDescription
   - Lines 1607-1617: Use sceneDescription and userRole in system prompt

---

## Deployment Steps

1. ✅ Frontend changes are auto-deployed (Vite build)
2. 🔴 Edge function must be deployed via **Supabase Online Dashboard** (no CLI)
   - Go to Supabase dashboard → Edge Functions → roleplay-chat → Deploy
   - Copy updated `supabase/functions/roleplay-chat/index.ts` code
   - Paste and deploy

---

## Next Steps

1. 🔍 **Investigate duplicate image generation**
   - Review edge function logs for double calls
   - Check `generateScene()` invocation count
   - Verify no retry/fallback logic causing duplicates

2. ⚠️ **Consider adding atmosphere to system prompt**
   - Low effort, potentially high impact on AI mood matching
   - Convert atmosphere JSONB to readable text

3. ✅ **Test complete flow with "A Steamy Shower" scene**
   - Verify all 5 reported issues are resolved
   - Check console logs match expected output
   - Confirm scene images display correctly

---

**Document Purpose:** Track scene system issues, root causes, fixes, and remaining work. This serves as both investigation notes and deployment guide for the Supabase dashboard update.

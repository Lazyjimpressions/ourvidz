

# Fix Scene Continuity, Multi-Reference, and canUseI2I

## File: `supabase/functions/roleplay-chat/index.ts`

### Fix 1: Server-side scene continuity fallback

Before line 2453 (`let isFirstScene = true;`), insert a DB query that checks for the latest completed scene when the frontend didn't provide `previousSceneId`. Introduce `resolvedPreviousSceneId` and `resolvedPreviousSceneImageUrl` as local `let` variables to avoid mutating function params. Update all downstream references (lines 2456-2580) to use the resolved variables.

### Fix 2: Multi-reference `image_url` fallback

Update 5 locations to fall back from `reference_image_url` to `image_url`:
- `canUseMultiReference` check (line 3292)
- Guard condition (line 3771)
- Single-character fallback (line 3781)
- Figure 2 push (line 3787)
- Figure 3 push (line 3791)

### Fix 3: `canUseI2I` clarifying comment (line 2527)

Add a comment explaining `canUseI2I` covers continuation mode only; first-scene template I2I is a separate branch.

### Deployment

Deploy `roleplay-chat` after edits.


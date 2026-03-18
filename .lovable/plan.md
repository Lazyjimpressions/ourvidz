

## Analysis: Why Character Swap Choreography Isn't Working

### Critical Finding: Wrong Field Name

The fal.ai API reference you shared clearly defines the field as **`start_frame_number`**, but our entire pipeline sends **`start_frame_num`**. This means fal.ai is likely **ignoring all frame positioning and conditioning parameters** silently — treating every image/video as frame 0 or using defaults.

From the API docs you provided:
```typescript
images?: Array<{
    image_url: string;
    start_frame_number?: number;  // ← "number" not "num"
    strength?: number;
}>;
videos?: Array<{
    video_url: string;
    start_frame_number?: number;  // ← "number" not "num"
    strength?: number;
}>;
```

Our code sends `start_frame_num` everywhere — in the frontend hook, edge function mapping, and sanitization logic. The model likely receives all anchors at default frame 0, which explains both:
- The "floating head" (3 identity anchors all piled at frame 0 fighting with each other)
- The weak choreography match (video conditioning frame position ignored)

### Secondary Finding: Unsupported Conditioning Fields

The official API schema for `videos[]` only supports: `video_url`, `start_frame_number`, `strength`. It does **not** list `conditioning_type`, `preprocess`, or `limit_num_frames`. These fields are likely silently ignored by the API, meaning "pose" mode was never actually applied.

### Third Finding: Image Strength Too High

Best practices recommend: start image at **0.7-0.9**, later anchors at **0.3-0.6**. We send all three anchors at `strength: 1.0`, which over-constrains the model and prevents it from following video conditioning.

---

## Plan

### 1. Fix field name: `start_frame_num` → `start_frame_number`

**Files:** `src/hooks/useLibraryFirstWorkspace.ts`, `supabase/functions/fal-image/index.ts`

Rename all occurrences of `start_frame_num` to `start_frame_number` in:
- Frontend payload construction (images array, videos array)
- Edge function mapping (images signing, videos signing)
- Edge function sanitization (frame snapping logic)
- Edge function logging

### 2. Remove unsupported video conditioning fields

**Files:** `src/hooks/useLibraryFirstWorkspace.ts`, `supabase/functions/fal-image/index.ts`

Stop sending `conditioning_type`, `preprocess`, `limit_num_frames`, `max_num_frames` — these are not in the API schema. Videos should only send `video_url`, `start_frame_number`, `strength`.

### 3. Tune identity anchor strengths per best practices

**File:** `src/hooks/useLibraryFirstWorkspace.ts`

For character-swap triple-anchor mode:
- Start (F0): strength **0.85** (high, establishes identity)
- Mid (F56/60): strength **0.5** (moderate, allows motion)
- End (F120): strength **0.4** (low, guides landing without over-constraining)

### 4. Lower video conditioning strength

**File:** `src/hooks/useLibraryFirstWorkspace.ts`

Change video `strength` from 0.8 to **0.7** per best practices ("0.7 for video conditioning").

### 5. Update edge function and redeploy

**File:** `supabase/functions/fal-image/index.ts`

- Remove conditioning_type/preprocess/limit_num_frames pass-through code
- Update all frame field references
- Update logging to reflect correct field names
- Clean up sanitization to use `start_frame_number`

### 6. Update preflight UI indicator

**File:** `src/components/workspace/MobileSimplePromptInput.tsx`

Remove references to "Pose mode" since that's not a real API parameter. Show anchor strengths instead.


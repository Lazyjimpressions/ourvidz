

# Add Sparkle Enhance Button to Workspace Prompt Input

## Overview

Add an inline "enhance" sparkle button next to the prompt textarea in the workspace. When clicked, it calls the `enhance-prompt` edge function with the currently selected model's `model_key`, allowing the backend to automatically select the correct LTX (or WAN, or Seedream) prompt template. The enhanced prompt replaces the original in the textarea, and the user can then review/edit before generating.

This is a **manual-first** approach: user types naturally, clicks the sparkle to enhance, reviews the result, then generates.

## What Already Works

- The `enhance-prompt` edge function already resolves `model_key` and performs a 5-tuple template lookup against `prompt_templates`
- 4 LTX-specific enhancement templates are already in the database, each with specialized system prompts (T2V, I2V, Extend, Multi)
- The function returns `enhanced_prompt` and metadata

## Implementation

### 1. Desktop: `SimplePromptInput.tsx`

Add a small sparkle icon button inside the prompt textarea area (positioned absolute, bottom-left or next to the settings gear):

- **Position**: Inside the textarea container, bottom-right corner next to the existing Settings gear (or left of it)
- **Icon**: `Sparkles` from lucide-react, size 12, matching the existing gear icon style
- **State**: `isEnhancing` boolean, managed locally
- **Behavior on click**:
  1. Call `supabase.functions.invoke('enhance-prompt', { body: { prompt, model_key: selectedModel.model_key, job_type: mode === 'video' ? 'video' : 'image', content_mode: contentType } })`
  2. Replace the prompt textarea value with the enhanced result
  3. Show a brief toast: "Prompt enhanced for [model display name]"
- **Disabled when**: prompt is empty, already enhancing, or currently generating
- **Loading state**: Replace sparkle icon with a small spinning loader during enhancement

To pass `model_key`, the component needs it from the parent. Currently `selectedModel` only has `{ id, type, display_name }`. Two options:
  - **Option A (simpler)**: Pass just `model_id` to `enhance-prompt` -- the edge function already supports resolving `model_key` from `model_id` (lines 572-586)
  - **Option B**: Extend `selectedModel` to include `model_key`

**Recommendation**: Option A -- pass `selectedModel.id` as `model_id`. No prop changes needed.

### 2. Mobile: `MobileSimplePromptInput.tsx`

Same sparkle button, positioned next to the prompt textarea. Same logic, same edge function call.

### 3. Edge Function: No Changes Needed

The `enhance-prompt` function already:
- Accepts `model_id` and resolves `model_key` from the database
- Looks up the matching template via 5-tuple (target_model, enhancer_model, job_type, use_case, content_mode)
- Falls back gracefully if no template is found

### 4. Props Threading

Both `SimplePromptInput` and `MobileSimplePromptInput` already receive `selectedModel` with `.id` and `contentType`. No new props are needed -- the enhance call can be self-contained within each component.

## Technical Details

### Desktop Sparkle Button (SimplePromptInput.tsx)

| Location | Change |
|---|---|
| ~line 430 | Add `isEnhancing` state |
| ~line 848-880 | Add sparkle button next to the Settings gear inside the textarea container |

The button will be positioned as a sibling to the existing Settings gear button:

```text
<button onClick={handleEnhance} disabled={!prompt.trim() || isEnhancing || isGenerating}>
  {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
</button>
```

The `handleEnhance` function:

```text
const handleEnhance = async () => {
  if (!prompt.trim() || !selectedModel?.id) return;
  setIsEnhancing(true);
  try {
    const { data, error } = await supabase.functions.invoke('enhance-prompt', {
      body: {
        prompt: prompt.trim(),
        model_id: selectedModel.id,
        job_type: mode === 'video' ? 'video' : 'image',
        contentType: contentType || 'sfw',
      }
    });
    if (data?.enhanced_prompt) {
      onPromptChange(data.enhanced_prompt);
      toast.success(`Prompt enhanced for ${selectedModel.display_name}`);
    }
  } catch (err) {
    toast.error('Enhancement failed');
  } finally {
    setIsEnhancing(false);
  }
};
```

### Mobile Sparkle Button (MobileSimplePromptInput.tsx)

Same pattern, placed inside the form area near the prompt textarea.

## UX Flow

1. User types a natural language prompt: "woman walking through a garden"
2. User selects LTX 13b I2V model, loads a reference image
3. User clicks the sparkle icon
4. System calls `enhance-prompt` with `model_id` pointing to LTX I2V
5. Edge function resolves `model_key = fal-ai/ltx-video-13b-distilled/image-to-video`, finds the "LTX 13B I2V Prompt Enhance" template
6. Returns structured prompt: "Medium shot. Same character as reference image. Action: gentle walk through sunlit garden path. Camera: slow tracking shot. Lighting: warm golden hour. Mood: serene. Continuity: same outfit, same location, no scene cut."
7. User sees the enhanced prompt in the textarea, can edit if needed
8. User clicks Generate

## Files Changed

| File | Change |
|---|---|
| `src/components/workspace/SimplePromptInput.tsx` | Add sparkle enhance button + handler |
| `src/components/workspace/MobileSimplePromptInput.tsx` | Add sparkle enhance button + handler |

No edge function changes. No database changes. No new dependencies.




# Add Image Compare Tab to Playground

## Overview

Add a new "Image Compare" tab to the Playground that lets you compare image generations side-by-side. Each panel gets its own image model selector and optional prompt template, and a shared text prompt is sent to both panels simultaneously. Results display as images with generation metadata (time, model, seed).

## UX Design

```text
+---------------------------------------------------+
| AI Playground                          [Settings]  |
| [Chat] [Compare] [Image Compare] [Admin]          |
+---------------------------------------------------+
|  Panel A                  |  Panel B               |
|  [Model: Seedream v4.5 T2I ▼]  [Model: Seedream v4 ▼]  |
|  [Template: scene_generation ▼] [Template: none ▼]      |
|  [New]                    |  [New]                 |
|                           |                        |
|  +---------------------+ | +---------------------+|
|  |                     | | |                     ||
|  |   Generated Image   | | |   Generated Image   ||
|  |                     | | |                     ||
|  +---------------------+ | +---------------------+|
|  Seedream v4.5 | 12.3s   | Seedream v4 | 8.1s     |
|  Seed: 12345              | Seed: 67890            |
|                           |                        |
|  (scrollable history)     | (scrollable history)   |
+---------------------------------------------------+
| [Enter image prompt...]                    [Send]  |
+---------------------------------------------------+
```

**Key interactions:**
- Select different image models per panel from a dropdown (all active image models from `api_models`)
- Optionally select a prompt template (scene_generation, enhancement, etc.) that wraps/enhances the raw prompt
- Type a prompt and hit Send -- both panels generate simultaneously
- Each result shows the image, model name, generation time, and seed
- "New" button clears the panel history
- Images are clickable for a larger lightbox view
- History scrolls vertically showing previous prompt/image pairs

## Architecture

The tab calls the existing `fal-image` edge function directly (no new edge function needed). Each panel sends:

```json
{
  "prompt": "user prompt text (optionally enhanced by template)",
  "apiModelId": "selected-model-uuid",
  "job_type": "image_high",
  "metadata": { "source": "playground-image-compare" }
}
```

The `fal-image` function already handles model resolution, job creation, and queue submission. It returns a `job_id` which the client polls via the existing `subscribeToJobCompletion` pattern (or direct polling of the `jobs` table).

## Technical Details

### New file: `src/components/playground/ImageCompareView.tsx`

- Two-panel layout mirroring `CompareView.tsx` structure
- Each panel has state: `{ modelId, templateId, generations: [{prompt, imageUrl, time, seed}], isLoading }`
- Model selector uses `useImageModels()` hook (already exists, fetches active image models)
- Template selector fetches `prompt_templates` filtered to scene/enhancement use cases
- On submit: calls `supabase.functions.invoke('fal-image', { body })` for each panel
- Polls `jobs` table by job_id until status = 'completed', then extracts `result_url`
- Shows loading spinner with elapsed timer while generating
- Completed images render in a scrollable history list

### Modified file: `src/components/playground/PlaygroundModeSelector.tsx`

- Add `'image_compare'` to `PlaygroundMode` type
- Add `{ id: 'image_compare', label: 'Image Compare' }` to modes array

### Modified file: `src/components/playground/ChatInterface.tsx`

- Add `ImageCompareView` import
- Add rendering branch for `currentMode === 'image_compare'` (same pattern as the existing `compare` mode block at line 131)

### Job polling logic

The `fal-image` function creates a job record and submits to fal.ai's queue. The response includes the `job_id`. The client polls the `jobs` table:

```typescript
const pollForResult = async (jobId: string): Promise<string> => {
  const maxAttempts = 60; // 2 minutes at 2s intervals
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const { data } = await supabase
      .from('jobs')
      .select('status, result_url, error')
      .eq('id', jobId)
      .single();
    if (data?.status === 'completed' && data.result_url) return data.result_url;
    if (data?.status === 'failed') throw new Error(data.error || 'Generation failed');
  }
  throw new Error('Generation timed out');
};
```

### Template integration

When a prompt template is selected (e.g., `scene_generation`), the system prompt from the template is prepended to the user prompt as context. Since image generation doesn't use system prompts, the template text is concatenated with the user prompt:

```typescript
const finalPrompt = selectedTemplate
  ? `${selectedTemplate.system_prompt}\n\n${userPrompt}`
  : userPrompt;
```

This lets users test how different prompt templates affect image output.

## Files Changed

| File | Change |
|------|--------|
| `src/components/playground/ImageCompareView.tsx` | New component -- two-panel image comparison view |
| `src/components/playground/PlaygroundModeSelector.tsx` | Add `image_compare` mode to type and modes array |
| `src/components/playground/ChatInterface.tsx` | Add rendering branch for image_compare mode |

No edge function changes needed -- uses existing `fal-image` function.


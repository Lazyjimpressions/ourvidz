

# Fix: Auto-Augment Prompt for Multi-Conditioning Character Adherence

## Problem

The multi-conditioning generation technically works (both `images[]` and `videos[]` are sent correctly), but the output ignores the character reference because the prompt doesn't instruct the model to use it. The user typed "show woman dancing" — the LTX model needs explicit instructions like "same appearance as the input image" and "matching movement/choreography of reference video" to properly apply the conditioning inputs.

## Solution

Add automatic prompt augmentation in `useLibraryFirstWorkspace.ts` when building a multi-conditioning payload with both image keyframes AND a motion reference video. This follows the documented best practices from the LTX MultiCondition prompting guide.

### File: `src/hooks/useLibraryFirstWorkspace.ts`

After the multi-conditioning payload is built (around line 1498), before sending:

```typescript
// Auto-augment prompt for character swap workflow
if (inputObj.images?.length > 0 && inputObj.videos?.length > 0) {
  const hasAppearanceHint = /same appearance|input image|reference image|character from/i.test(inputObj.prompt);
  const hasMotionHint = /matching (movement|choreography|motion)|reference video|same movement/i.test(inputObj.prompt);
  
  let augmented = inputObj.prompt;
  if (!hasAppearanceHint) {
    augmented += '. Same appearance as the input image';
  }
  if (!hasMotionHint) {
    augmented += ', matching choreography of reference video';
  }
  inputObj.prompt = augmented;
  console.log('🎭 MultiCondition: Auto-augmented prompt for character adherence');
}
```

This only appends hints when the user hasn't already included them, preserving user intent while ensuring the model gets the right instructions.

### Why this works

The LTX 13B MultiCondition model treats `images[]` as appearance anchors and `videos[]` as motion guides, but it needs textual reinforcement to bridge them. Without explicit prompt language, it tends to generate from the text prompt alone, treating the references as weak suggestions.

| Step | File | Change |
|------|------|--------|
| 1 | `src/hooks/useLibraryFirstWorkspace.ts` | Add prompt auto-augmentation when both images[] and videos[] are present |

One small, targeted change.


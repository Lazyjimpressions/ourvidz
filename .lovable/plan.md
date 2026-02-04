
# Plan: Manual vs Auto Scene Image Generation Control

## Overview
Add a new setting to give users control over when scene images are generated during roleplay conversations. Currently, images are generated automatically on kickoff and can be triggered manually during chat. This plan introduces a toggle between "Auto" and "Manual" modes, where Manual mode speeds up roleplay by only generating chat responses and shows a small button on each AI message to generate an image on demand.

---

## Current Behavior Analysis

### How Scene Generation Currently Works:
1. **Kickoff**: When a roleplay starts, `scene_generation: true` is passed to `roleplay-chat` edge function, triggering automatic image generation
2. **During Chat**: The `handleGenerateScene()` function in `MobileRoleplayChat.tsx` can be called manually via the bottom nav camera icon
3. **ChatMessage Component**: Shows generated scenes inline but doesn't have a per-message "generate" button

### Existing Scene Style Options:
- `character_only`: Only AI character in scene
- `pov`: First-person POV
- `both_characters`: Both AI and User characters

---

## Proposed Changes

### 1. New Type Definition
**File: `src/types/roleplay.ts`**

Add a new type for image generation mode:
```typescript
/**
 * Image generation mode for roleplay scenes
 * - auto: Images generated automatically with each AI response (current behavior)
 * - manual: User manually triggers image generation via per-message button
 */
export type ImageGenerationMode = 'auto' | 'manual';
```

Update `RoleplaySettings` interface:
```typescript
export interface RoleplaySettings {
  memoryTier: 'conversation' | 'character' | 'profile';
  modelProvider: 'chat_worker' | 'openrouter' | 'claude' | 'gpt';
  contentTier: 'sfw' | 'nsfw';
  sceneGeneration: boolean;
  sceneStyle?: SceneStyle;
  imageGenerationMode?: ImageGenerationMode; // NEW
}
```

---

### 2. UI Components

#### A. Scene Setup Sheet Enhancement
**File: `src/components/roleplay/SceneSetupSheet.tsx`**

Add a segmented control for image generation mode selection:
- **Auto Mode**: "Images generate with each response" (current behavior)
- **Manual Mode**: "Generate images on demand (faster chat)"

Use existing `SegmentedControl` component:
```tsx
<SegmentedControl
  options={[
    { value: 'auto', label: 'Auto', icon: <Sparkles /> },
    { value: 'manual', label: 'Manual', icon: <Camera /> }
  ]}
  value={imageGenerationMode}
  onChange={setImageGenerationMode}
/>
```

#### B. Dashboard Settings Enhancement
**File: `src/components/roleplay/DashboardSettings.tsx`**

Add Image Generation Mode selector alongside existing Scene Style:
```tsx
{/* Image Generation Mode */}
<div className="space-y-1">
  <Label className="text-xs text-muted-foreground">Image Generation</Label>
  <Select value={imageGenerationMode} onValueChange={onImageGenerationModeChange}>
    <SelectTrigger className="w-full bg-card h-9">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="auto">Auto (with each response)</SelectItem>
      <SelectItem value="manual">Manual (on demand)</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### C. Settings Modal Enhancement
**File: `src/components/roleplay/RoleplaySettingsModal.tsx`**

Add toggle in the "Scene Generation" section:
- Include helper text explaining the tradeoff: "Auto mode generates images automatically but is slower. Manual mode is faster but requires tapping to generate images."

#### D. Per-Message Generate Button
**File: `src/components/roleplay/ChatMessage.tsx`**

Add a small, subtle button on AI messages when:
- User is in Manual mode, AND
- No scene has been generated for this message yet, AND
- Message content appears to contain visual/scene content

Button design:
- Small camera icon (`Camera` from lucide-react)
- Positioned near message actions
- Shows loading state during generation
- Disappears after image is generated

```tsx
{/* Manual Scene Generation Button */}
{!isUser && !hasScene && imageGenerationMode === 'manual' && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => onGenerateSceneForMessage?.(message.id)}
    disabled={isGeneratingForMessage}
    className="opacity-60 hover:opacity-100 h-7 px-2"
  >
    {isGeneratingForMessage ? (
      <Loader2 className="w-3 h-3 animate-spin" />
    ) : (
      <Camera className="w-3 h-3" />
    )}
  </Button>
)}
```

---

### 3. State Management

#### A. MobileRoleplayChat Page
**File: `src/pages/MobileRoleplayChat.tsx`**

Add new state:
```typescript
const [imageGenerationMode, setImageGenerationMode] = useState<'auto' | 'manual'>('auto');
```

Modify settings initialization to include:
```typescript
imageGenerationMode: parsed.imageGenerationMode || 'auto'
```

Pass mode through navigation state from setup sheet:
```typescript
const locationState = location.state as {
  userCharacterId?: string | null;
  sceneStyle?: SceneStyle;
  imageGenerationMode?: ImageGenerationMode; // NEW
} | null;
```

#### B. Modify Send Message Flow
In `handleSendMessage()`:
- If `imageGenerationMode === 'auto'`: Keep current behavior (`scene_generation: true`)
- If `imageGenerationMode === 'manual'`: Set `scene_generation: false`

```typescript
const { data, error } = await supabase.functions.invoke('roleplay-chat', {
  body: {
    message: trimmedMessage,
    conversation_id: conversationId,
    character_id: character.id,
    model_provider: modelProvider,
    memory_tier: memoryTier,
    content_tier: contentTier,
    scene_generation: imageGenerationMode === 'auto', // Conditional based on mode
    // ... rest of params
  }
});
```

---

### 4. I2I Context Tracking

#### A. New Hook: `useSceneGenerationContext`
**File: `src/hooks/useSceneGenerationContext.ts`** (NEW)

Track accumulated chat context since last image generation:
```typescript
interface SceneGenerationContext {
  messagesSinceLastScene: number;
  lastSceneMessageId?: string;
  lastSceneImageUrl?: string;
  accumulatedNarrative: string[]; // Last N messages for context
  characterChanges?: {
    emotion?: string;
    clothing?: string;
    position?: string;
  };
}
```

This hook will:
- Track how many messages have been sent since the last scene
- Accumulate narrative context from multiple messages
- Detect character state changes mentioned in dialogue
- Provide combined context when user triggers manual generation

#### B. Enhanced Scene Prompt Building
When generating a scene after multiple messages in Manual mode:
1. Collect last 3-5 messages since last scene
2. Extract key visual descriptors from all messages
3. Prioritize most recent character state descriptions
4. Build a composite scene prompt that reflects the narrative progression

---

### 5. Edge Function Updates

#### A. roleplay-chat Function
**File: `supabase/functions/roleplay-chat/index.ts`**

Already respects `scene_generation` flag - no changes needed for basic toggle.

For enhanced manual mode with accumulated context, add:
```typescript
interface RoleplayChatRequest {
  // ... existing fields
  accumulated_scene_context?: {
    messages_since_last_scene: number;
    narrative_summary?: string;
    character_state_changes?: Record<string, string>;
  };
}
```

When `accumulated_scene_context` is provided, enhance the scene prompt template to incorporate multi-message context.

---

### 6. localStorage Persistence

Update saved settings structure:
```typescript
const settings = {
  memoryTier: localMemoryTier,
  modelProvider: localModelProvider,
  selectedImageModel: localSelectedImageModel,
  selectedI2IModel: localSelectedI2IModel,
  consistencySettings: localConsistencySettings,
  userCharacterId: localUserCharacterId,
  sceneStyle: localSceneStyle,
  imageGenerationMode: localImageGenerationMode  // NEW
};
localStorage.setItem('roleplay-settings', JSON.stringify(settings));
```

---

## UX Considerations

### Visual Feedback
1. **Mode Indicator**: Show current mode in chat header or settings indicator
2. **Button Visibility**: Manual generate button should be subtle but discoverable
3. **Loading States**: Clear feedback when generating from accumulated context
4. **Success States**: Toast or inline indicator when scene generates

### Onboarding
1. First-time users default to "Auto" for full experience
2. Tooltip on mode selector explaining tradeoffs
3. Consider showing "Try Manual mode for faster chat" after several sessions

### Edge Cases
1. **Switching modes mid-conversation**: Works seamlessly, next message follows new mode
2. **Many messages without scene**: Button always available, context accumulates
3. **Scene regeneration**: Existing regenerate flow works regardless of mode

---

## Technical Implementation Order

### Phase 1: Basic Toggle (MVP)
1. Add `ImageGenerationMode` type
2. Add state management in `MobileRoleplayChat.tsx`
3. Add UI toggle in `DashboardSettings.tsx` and `RoleplaySettingsModal.tsx`
4. Modify send message flow to respect mode

### Phase 2: Per-Message Button
1. Add `onGenerateSceneForMessage` prop to `ChatMessage`
2. Implement button UI with loading states
3. Connect to existing `handleGenerateScene` with message context

### Phase 3: Accumulated Context (Advanced)
1. Create `useSceneGenerationContext` hook
2. Track messages since last scene
3. Enhance scene prompt building for multi-message context
4. Update edge function to handle accumulated context

### Phase 4: Scene Setup Integration
1. Add mode selection to `SceneSetupSheet`
2. Pass through navigation state
3. Update kickoff logic

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/roleplay.ts` | Add `ImageGenerationMode` type, update `RoleplaySettings` |
| `src/pages/MobileRoleplayChat.tsx` | Add state, modify message flow, pass to children |
| `src/components/roleplay/ChatMessage.tsx` | Add per-message generate button |
| `src/components/roleplay/DashboardSettings.tsx` | Add mode selector |
| `src/components/roleplay/RoleplaySettingsModal.tsx` | Add mode toggle with explanation |
| `src/components/roleplay/SceneSetupSheet.tsx` | Add mode selection during setup |
| `src/hooks/useSceneGenerationContext.ts` | NEW - Track accumulated narrative context |
| `supabase/functions/roleplay-chat/index.ts` | Handle accumulated context (Phase 3) |

---

## Risk Mitigation

1. **Backward Compatibility**: Default to `'auto'` when mode is undefined
2. **Performance**: Manual mode should feel noticeably faster (no image gen latency)
3. **Data Loss**: Accumulated context stored in React state, lost on refresh (acceptable)
4. **Testing**: Need to test mode switching mid-conversation

---

## Success Metrics
- Users in Manual mode experience faster message round-trips
- Manual generation button has high engagement (users find it useful)
- No regression in image quality from accumulated context
- Clear understanding of mode differences (low support tickets)

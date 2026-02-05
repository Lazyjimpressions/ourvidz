

# Playground Page Model Integration Plan (Updated)

## Summary

Integrate dynamic third-party API model selection across all Playground tabs (Chat, Roleplay, Creative, Admin) using existing edge functions and database tables. Add a compact global settings panel for model configuration that applies to all tabs.

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Playground Page                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ Header: [Title] [SFW] [⚙️ Settings Popover] [History]               │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐│
│ │ Settings Popover (compact dropdown)                              ││
│ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     ││
│ │ │ Chat Model    ▼ │ │ Image Model   ▼ │ │ Video Model   ▼ │     ││
│ │ │ MythoMax 13B    │ │ Seedream v4     │ │ WAN 2.1 I2V     │     ││
│ │ └─────────────────┘ └─────────────────┘ └─────────────────┘     ││
│ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     ││
│ │ │ I2I Model     ▼ │ │ Prompt Tpl   ▼  │ │ Content      ▼  │     ││
│ │ │ Seedream v4.5   │ │ Admin Asst.     │ │ NSFW            │     ││
│ │ └─────────────────┘ └─────────────────┘ └─────────────────┘     ││
│ └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│ Tabs: [Chat] [Roleplay] [Creative] [Admin]                          │
│                                                                      │
│ Chat Area (uses selected models from global settings)               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Decisions

| Concern | Decision |
|---------|----------|
| Edge Function | **Reuse `roleplay-chat`** for all playground chat - it already has OpenRouter integration, model routing, and template handling |
| Fallback | **No fallback** - Default to third-party APIs (OpenRouter for chat, fal.ai for image/video) |
| UI Style | **Compact** - Small fonts (text-xs), small buttons (h-7), preserve real estate |
| Settings Scope | **Global** - One settings panel controls all tabs |

---

## Model Defaults

| Model Type | Default Model | Provider |
|------------|---------------|----------|
| Chat/Roleplay | MythoMax 13B (`gryphe/mythomax-l2-13b`) | OpenRouter |
| Image (T2I) | Seedream v4 (`fal-ai/bytedance/seedream/v4/text-to-image`) | fal.ai |
| Video | WAN 2.1 I2V (`fal-ai/wan-i2v`) | fal.ai |
| I2I/Edit | Seedream v4.5 Edit (`fal-ai/bytedance/seedream/v4.5/edit`) | fal.ai |
| Enhancement | MythoMax 13B (via OpenRouter) | OpenRouter |

---

## Implementation Steps

### Phase 1: Fix Edge Function Build Errors

**File**: `supabase/functions/playground-chat/index.ts`

The build errors are caused by missing Database type definitions. Fix by:
1. Add proper Database interface matching `roleplay-chat` pattern
2. Add explicit type casts for Supabase query results
3. Add proper error type guards

Similar fixes needed for:
- `supabase/functions/refresh-prompt-cache/index.ts`
- `supabase/functions/register-chat-worker/index.ts`
- `supabase/functions/replicate-image/index.ts`
- `supabase/functions/replicate-webhook/index.ts`
- `supabase/functions/roleplay-chat/index.ts`

### Phase 2: Create Global Settings Hook

**File**: `src/hooks/usePlaygroundSettings.ts` (new)

```typescript
interface PlaygroundSettings {
  chatModel: string;        // OpenRouter model key
  imageModel: string;       // fal.ai T2I model key
  videoModel: string;       // fal.ai video model key
  i2iModel: string;         // fal.ai I2I model key
  promptTemplateId: string; // Prompt template UUID
  contentMode: 'sfw' | 'nsfw';
}

// Hook to manage settings with localStorage persistence
export const usePlaygroundSettings = () => {
  // State with defaults
  // Load from localStorage on mount
  // Save to localStorage on change
  // Return settings + setters
};

// Hook to fetch available models grouped by type
export const usePlaygroundModels = () => {
  // Query api_models table
  // Group by modality: chat, image, video
  // Filter I2I models (task = 'style_transfer')
};

// Hook to fetch prompt templates
export const usePlaygroundTemplates = (useCase?: string) => {
  // Query prompt_templates table
  // Filter by use_case if provided
};
```

### Phase 3: Create Compact Settings Popover

**File**: `src/components/playground/PlaygroundSettingsPopover.tsx` (new)

Compact settings UI with:
- Settings icon button (h-7 w-7)
- Popover with grid layout (3 columns on desktop, 2 on mobile)
- Small select dropdowns (h-7 text-xs)
- Grouped by: Chat | Image | Video | I2I | Template | Content

UI Design:
```text
┌─────────────────────────────────────────────────┐
│ ⚙️ Settings                               [X]   │
├─────────────────────────────────────────────────┤
│ Chat        [MythoMax 13B         ▼]           │
│ Image       [Seedream v4          ▼]           │
│ Video       [WAN 2.1 I2V          ▼]           │
│ I2I         [Seedream v4.5 Edit   ▼]           │
│ Template    [Admin Assistant      ▼]           │
│ Content     [NSFW                 ▼]           │
└─────────────────────────────────────────────────┘
```

### Phase 4: Update PlaygroundContext

**File**: `src/contexts/PlaygroundContext.tsx`

Transform from stub to functional implementation:

1. Add settings state from `usePlaygroundSettings`
2. Implement real `sendMessage` that calls `roleplay-chat` edge function
3. Pass model configuration to edge function:
   - `model_provider`: 'openrouter'
   - `model_variant`: selected chat model key
   - `content_tier`: from settings
   - `prompt_template_id`: from settings

4. Implement real conversation CRUD operations

### Phase 5: Update AdminTools for Dynamic Models

**File**: `src/components/playground/AdminTools.tsx`

Changes:
1. Import `usePlaygroundModels` hook
2. Replace hardcoded SelectItem values with dynamic list
3. Use compact styling (h-7, text-xs)
4. Show model provider badge (OpenRouter/fal.ai)

Before:
```tsx
<SelectItem value="sdxl">SDXL Image Generation</SelectItem>
<SelectItem value="wan_video">WAN Video Generation</SelectItem>
```

After:
```tsx
{chatModels.map(m => (
  <SelectItem key={m.id} value={m.model_key} className="text-xs">
    {m.display_name}
  </SelectItem>
))}
```

### Phase 6: Update ChatInterface Header

**File**: `src/components/playground/ChatInterface.tsx`

Add settings popover to header:
```tsx
<div className="flex items-center gap-1">
  <PlaygroundSettingsPopover />
  {/* existing SFW toggle, history button */}
</div>
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/usePlaygroundSettings.ts` | Settings state + localStorage persistence |
| `src/hooks/usePlaygroundModels.ts` | Fetch models from api_models table |
| `src/components/playground/PlaygroundSettingsPopover.tsx` | Compact global settings UI |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/playground-chat/index.ts` | Fix TypeScript errors with Database types |
| `supabase/functions/refresh-prompt-cache/index.ts` | Fix `error.message` type guard |
| `supabase/functions/register-chat-worker/index.ts` | Fix `error.message` type guard |
| `supabase/functions/replicate-image/index.ts` | Fix `error.message` type guard |
| `supabase/functions/replicate-webhook/index.ts` | Fix null checks and type guards |
| `supabase/functions/roleplay-chat/index.ts` | Fix null destructuring on requestBody |
| `src/contexts/PlaygroundContext.tsx` | Real implementation calling roleplay-chat |
| `src/components/playground/ChatInterface.tsx` | Add settings popover to header |
| `src/components/playground/AdminTools.tsx` | Dynamic model selection |
| `src/components/playground/CreativeTools.tsx` | Dynamic model selection |
| `src/components/playground/RoleplaySetup.tsx` | Use global settings |

---

## Technical Details

### Edge Function Integration

The playground will use `roleplay-chat` edge function which already supports:
- OpenRouter API calls (lines 300-450 of roleplay-chat/index.ts)
- Model variant selection via `model_variant` parameter
- Prompt template lookup via `prompt_template_id`
- Content tier filtering via `content_tier`

Request format:
```typescript
await supabase.functions.invoke('roleplay-chat', {
  body: {
    message: userMessage,
    conversation_id: conversationId,
    character_id: null, // Optional for general chat
    model_provider: 'openrouter',
    model_variant: settings.chatModel, // e.g., 'gryphe/mythomax-l2-13b'
    memory_tier: 'conversation',
    content_tier: settings.contentMode,
    prompt_template_id: settings.promptTemplateId
  }
});
```

### Database Queries

Models query:
```sql
SELECT id, display_name, model_key, modality, task, model_family, is_default,
       api_providers.name as provider_name
FROM api_models
JOIN api_providers ON api_models.provider_id = api_providers.id
WHERE is_active = true
ORDER BY modality, priority DESC
```

Templates query:
```sql
SELECT id, template_name, use_case, target_model, content_mode
FROM prompt_templates
WHERE is_active = true
ORDER BY use_case, template_name
```

---

## Validation Criteria

After implementation, users should be able to:

1. Open `/playground` page
2. Click settings icon to open compact popover
3. See dropdowns populated from api_models table:
   - Chat: MythoMax 13B, Lumimaid 70B, Celeste 12B, Dolphin variants
   - Image: Seedream v4, v4.5, SDXL variants
   - Video: WAN 2.1 I2V
   - I2I: Seedream v4/v4.5 Edit
4. See templates from prompt_templates table
5. Select MythoMax 13B + Admin Assistant template
6. Send a message in Admin tab
7. Receive response from OpenRouter API
8. Settings persist across page refreshes (localStorage)

---

## UI Guidelines

- **Font sizes**: text-xs (0.75rem) for labels, text-sm for values
- **Button heights**: h-7 (1.75rem) for actions, h-8 max
- **Spacing**: gap-1 to gap-2, p-2 padding
- **Selects**: h-7 with text-xs content
- **Colors**: Use existing theme (muted, border, background)
- **No large buttons or oversized elements**


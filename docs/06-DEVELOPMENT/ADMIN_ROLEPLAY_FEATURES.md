# Admin Features for Roleplay Chat

**Date:** 2026-01-10  
**Status:** Planning  
**Priority:** Medium

## Overview

Enhance existing `SceneDebugPanel` component and add a compact info icon to roleplay chat messages, allowing admins to inspect prompt templates (with ID and template_name from database), models, generation settings, and metadata for both chat responses and scene generation. **Leverage existing SceneDebugPanel** - enhance rather than duplicate.

## Key Requirements

1. **Prompt Template Info:** Include `id` and `template_name` from `prompt_templates` table
2. **Leverage Existing:** Use/enhance `SceneDebugPanel` component (already exists)
3. **Compact UX:** Small info icon, minimal real estate, popover/drawer style
4. **No Duplication:** Enhance existing features, don't create redundant UI

## User Story

As an admin user, I want to see detailed technical information about AI responses and scene generation so that I can:
- Debug prompt template issues
- Monitor model usage and performance
- Verify generation settings are applied correctly
- Troubleshoot scene continuity issues
- Audit API costs and token usage
- Optimize prompt templates based on actual usage

## Feature Design

### 1. Compact Info Icon in Chat Interface

**Location:** Top-right corner of AI message bubbles (only)

**Visual Design:**
- Tiny "i" icon button (Info icon from lucide-react, 12px)
- Very subtle - opacity 40%, only visible on hover
- Positioned absolutely in top-right corner of message bubble
- Opens Popover (not modal) - minimal real estate
- Only visible to admin users

**Implementation:**
```tsx
{isAdmin && message.sender === 'ai' && (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1 h-5 w-5 p-0 opacity-40 hover:opacity-100 group-hover:opacity-60"
        onClick={(e) => e.stopPropagation()}
      >
        <Info className="w-3 h-3" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80 p-3" align="end">
      <SceneDebugPanel 
        generationMetadata={message.metadata?.generation_metadata}
        sceneData={message.metadata}
      />
    </PopoverContent>
  </Popover>
)}
```

### 2. Enhanced SceneDebugPanel Component

**Component:** `src/components/roleplay/SceneDebugPanel.tsx` (EXISTING - enhance, don't duplicate)

**Enhancements Needed:**

#### 2.1 Enhanced Prompt Template Display
- **Prompt Template (REQUIRED):**
  - ✅ **Template ID** (from `prompt_templates.id`)
  - ✅ **Template Name** (from `prompt_templates.template_name`)
  - Template use case
  - Content mode (NSFW/SFW)
  - Link to template in admin panel (if ID available)
  
- **Model Information:**
  - Model used (display name + model key)
  - Provider (OpenRouter, local worker, etc.)
  - Model variant (if applicable)
  - Fallback status (if fallback model was used)
  
- **Memory & Context:**
  - Memory tier (conversation/character/profile)
  - Content tier (NSFW/SFW)
  - Conversation history length
  - Character context included
  
- **Performance:**
  - Processing time (ms)
  - Token usage (if available from OpenRouter)
  - API cost estimate (if available)
  - Response length

#### 2.2 Scene Generation Information
- **Generation Mode:**
  - Mode (T2I / I2I / Modification)
  - Scene continuity enabled
  - Previous scene reference (if I2I)
  - First scene detection result
  
- **Image Model:**
  - Selected model (what user requested)
  - Effective model (what was actually used)
  - Model override (if I2I model override applied)
  - Provider name
  
- **Prompt Information:**
  - Prompt template used (Scene Narrative vs Scene Iteration)
  - Original prompt length
  - Optimized prompt length
  - CLIP token count (with warning if > 77)
  - Full prompt preview (truncated, expandable)
  
- **Consistency Settings:**
  - Consistency method (IP-Adapter, Reference, etc.)
  - Reference strength (%)
  - Denoise strength (%)
  - Seed (locked/unlocked, value)
  - Character reference image URL
  
- **Scene Context:**
  - Scene type (chat_scene, preset, etc.)
  - Scene style (character_only, pov, both_characters)
  - Scene setting/location
  - Character visual description
  - User character included (if applicable)
  
- **Scene Continuity:**
  - Previous scene ID
  - Previous scene image URL
  - Scene continuity enabled
  - Verified previous scene status

#### 2.3 System Information
- **Request Metadata:**
  - Conversation ID
  - Character ID
  - User ID
  - Timestamp
  - Request ID (if available)
  
- **Edge Function:**
  - Function name (roleplay-chat)
  - Deployment version (if available)
  - Region (if available)
  
- **Error Information:**
  - Any errors encountered
  - Retry attempts
  - Fallback triggers

#### 2.4 Raw Metadata View
- Collapsible JSON view
- Pretty-printed with syntax highlighting
- Copy to clipboard button
- Search/filter within JSON

### 3. Data Sources & Edge Function Changes

**REQUIRED: Add prompt template ID to metadata**

**Edge Function Changes Needed:**
1. In `roleplay-chat/index.ts`, when loading prompt template (line 305-323), store template ID in response metadata
2. In `generateScene` function, include `prompt_template_id` in scene generation metadata
3. Return template info in response so frontend can display it

**From Edge Function Response:**
- `model_used` - Chat model identifier
- `processing_time` - Response time
- `scene_generated` - Whether scene was generated
- `consistency_score` - Scene consistency score
- `scene_job_id` - Scene generation job ID
- `usedFallback` - Fallback model indicator
- `fallbackModel` - Fallback model name
- ✅ **NEW:** `prompt_template_id` - Template ID from database
- ✅ **NEW:** `prompt_template_name` - Template name from database

**From Message Metadata:**
- `template_name` - Prompt template used (existing)
- ✅ **ENHANCE:** Add `template_id` field
- `model_display_name` - Human-readable model name
- `provider_name` - API provider
- `content_tier` - NSFW/SFW
- `memory_tier` - Memory context level
- `generation_metadata` - Scene generation details (includes scene template info)

**From Scene Generation Metadata:**
- `generation_mode` - T2I/I2I/Modification
- `model_used` - Image model key
- `model_display_name` - Image model display name
- `template_name` - Scene prompt template
- `consistency_method` - Consistency approach
- `reference_strength` - Reference image strength
- `denoise_strength` - Denoise strength
- `seed_locked` - Seed value
- `original_prompt_length` - Original prompt chars
- `optimized_prompt_length` - Optimized prompt chars
- `estimated_tokens` - CLIP token count
- `character_visual_description` - Character description
- `scene_context` - Full scene context JSON
- `previous_scene_id` - Previous scene reference
- `previous_scene_image_url` - Previous scene image
- `scene_continuity_enabled` - Continuity flag

**From Database (if needed):**
- Prompt template details from `prompt_templates` table
- Model details from `api_models` table
- Scene details from `character_scenes` table

### 4. UI Components (Compact Design)

#### 4.1 Info Icon Button (Minimal Real Estate)
```tsx
{isAdmin && message.sender === 'ai' && (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1 h-5 w-5 p-0 opacity-40 hover:opacity-100 group-hover:opacity-60 transition-opacity"
        onClick={(e) => e.stopPropagation()}
        aria-label="View admin debug info"
      >
        <Info className="w-3 h-3" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80 max-h-[80vh] overflow-y-auto p-3" align="end">
      <SceneDebugPanel 
        generationMetadata={message.metadata?.generation_metadata}
        sceneData={message.metadata}
      />
    </PopoverContent>
  </Popover>
)}
```

#### 4.2 Enhanced SceneDebugPanel (Existing Component)
- ✅ **ENHANCE:** Add prompt template ID display
- ✅ **ENHANCE:** Add template name from database lookup
- ✅ **ENHANCE:** Make more compact (reduce padding, smaller text)
- ✅ **ENHANCE:** Add chat response info (model, provider, processing time)
- Keep existing JSON viewer (collapsible)
- Keep existing structure (no major redesign)

#### 4.3 Compact Popover Design
- Uses shadcn/ui Popover (not Dialog/Modal)
- Small width (320px max)
- Scrollable if content is long
- Positioned near message bubble
- Auto-closes on outside click
- Minimal padding and spacing

### 5. Implementation Plan

#### Phase 1: Edge Function Changes (High Priority)
1. ✅ Add `prompt_template_id` to response metadata in `roleplay-chat/index.ts`
2. ✅ Add `prompt_template_name` to response metadata
3. ✅ Include template ID in scene generation metadata
4. ✅ Return template info in chat response metadata

#### Phase 2: Enhance SceneDebugPanel (High Priority)
1. ✅ Add `template_id` field to `generationMetadata` interface
2. ✅ Display template ID and template name prominently
3. ✅ Add chat response info section (model, provider, processing time)
4. ✅ Make component more compact (reduce padding from p-4 to p-3, smaller text)
5. ✅ Add link to admin panel if template ID available

#### Phase 3: Add Info Icon to ChatMessage (High Priority)
1. ✅ Add Popover with info icon to `ChatMessage.tsx`
2. ✅ Only show for AI messages
3. ✅ Only show for admin users
4. ✅ Position absolutely in top-right of message bubble
5. ✅ Pass message metadata to enhanced SceneDebugPanel

#### Phase 4: Optional Enhancements (Low Priority)
1. Add token usage if available from OpenRouter
2. Add cost estimates
3. Add performance metrics
4. Historical view (show info for previous messages)

### 6. Component Structure (Leverage Existing)

```
src/components/roleplay/
├── SceneDebugPanel.tsx             # ✅ EXISTING - Enhance this component
└── ChatMessage.tsx                  # ✅ EXISTING - Add info icon here

No new components needed - enhance existing ones!
```

### 7. Data Flow

```
MobileRoleplayChat.tsx
  ├─> ChatMessage.tsx (AI message)
  │   └─> AdminInfoButton (if isAdmin)
  │       └─> AdminRoleplayInfoPanel
  │           ├─> AdminChatResponseInfo
  │           ├─> AdminSceneGenerationInfo
  │           ├─> AdminSystemInfo
  │           └─> AdminMetadataViewer
  │
  └─> MobileChatInput.tsx
      └─> AdminInfoButton (for "next response" context)
          └─> AdminRoleplayInfoPanel (with last response data)
```

### 8. Enhanced Metadata Structure

```typescript
// Enhanced generationMetadata interface for SceneDebugPanel
interface GenerationMetadata {
  // ✅ NEW: Prompt Template Info (REQUIRED)
  template_id?: string;              // From prompt_templates.id
  template_name?: string;             // From prompt_templates.template_name
  template_use_case?: string;        // From prompt_templates.use_case
  template_content_mode?: string;     // From prompt_templates.content_mode
  
  // Existing fields
  model_used?: string;
  model_display_name?: string;
  provider_name?: string;
  consistency_method?: string;
  reference_strength?: number;
  denoise_strength?: number;
  seed_locked?: number | boolean;
  original_prompt_length?: number;
  optimized_prompt_length?: number;
  estimated_tokens?: number;
  character_visual_description?: string;
  scene_context?: string;
  
  // ✅ NEW: Chat Response Info
  chat_model_used?: string;
  chat_provider?: string;
  processing_time?: number;
  memory_tier?: string;
  content_tier?: string;
  
  [key: string]: any;
}
```

### 9. Security Considerations

- Only visible to admin users (checked via `isAdmin` from `useAuth()`)
- No sensitive data exposure (API keys, secrets)
- Sanitize any user-generated content in metadata
- Rate limit info panel requests if needed

### 10. Future Enhancements

1. **Real-time Monitoring:**
   - Live dashboard of all active conversations
   - Model usage statistics
   - Error rate monitoring
   - Performance metrics

2. **Prompt Template Testing:**
   - Test prompt templates directly from info panel
   - Compare template outputs
   - A/B testing interface

3. **Cost Tracking:**
   - Per-conversation cost estimates
   - Model cost comparison
   - Usage analytics

4. **Debugging Tools:**
   - Replay conversation with different settings
   - Modify prompts and regenerate
   - Export conversation for analysis

## Implementation Checklist

### Edge Function Changes
- [ ] Add `prompt_template_id` to response metadata in `roleplay-chat/index.ts`
- [ ] Add `prompt_template_name` to response metadata
- [ ] Include template ID in scene generation metadata (when template is used)
- [ ] Return template info in chat response metadata

### Component Enhancements
- [ ] Enhance `SceneDebugPanel.tsx`:
  - [ ] Add `template_id` and `template_name` to interface
  - [ ] Display template ID prominently (with link to admin panel)
  - [ ] Display template name from database
  - [ ] Add chat response info section (model, provider, processing time)
  - [ ] Make more compact (reduce padding, smaller text)
  - [ ] Add link to admin panel template editor if ID available
- [ ] Add info icon to `ChatMessage.tsx`:
  - [ ] Import Popover from shadcn/ui
  - [ ] Add info icon button (only for AI messages, only for admins)
  - [ ] Position absolutely in top-right of message bubble
  - [ ] Wrap SceneDebugPanel in Popover
  - [ ] Pass message metadata to SceneDebugPanel

### Testing
- [ ] Test with various message types (with/without scenes)
- [ ] Test with scene generation enabled/disabled
- [ ] Test with I2I continuity enabled/disabled
- [ ] Test template ID display (verify it shows correct ID from database)
- [ ] Test template name display (verify it matches database)
- [ ] Test on mobile (popover positioning)
- [ ] Test admin-only visibility
- [ ] Verify no duplication with existing features

## Success Criteria

✅ Admin users can see detailed information about chat responses  
✅ Admin users can see detailed information about scene generation  
✅ Information is organized and easy to navigate  
✅ Raw metadata is accessible for debugging  
✅ Component is performant and doesn't slow down chat  
✅ Mobile-friendly design  
✅ Only visible to admin users

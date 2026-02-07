# Character Studio Purpose & Implementation

**Last Updated:** February 6, 2026
**Status:** Complete
**Priority:** High

## **🎯 Purpose Statement**

Character Studio is the main iterative workspace for developing AI roleplay characters through portrait generation, scene creation, and AI-powered enhancements.

## **👤 User Intent**

- **Primary**: Create and refine high-quality AI characters with multiple portrait versions and customized roleplay scenarios
- **Secondary**:
  - Iterate on character appearance through portrait versioning
  - Manage character personality traits, voice, and behavior
  - Create custom roleplay scenes with specific contexts
  - Leverage AI suggestions to enhance character depth
- **Context**: Users access this page after initial character creation to refine portraits, develop personality, and prepare characters for roleplay conversations

## **💼 Business Value**

- **Revenue Driver**: Generates portrait generation API calls (fal.ai, Replicate), creating direct revenue from character refinement
- **User Engagement**: Portrait versioning encourages iterative improvement, increasing time-on-platform and generation volume
- **Quality Differentiation**: Advanced character development tools create competitive advantage over simpler character creators
- **Retention**: Investment in character development (multiple portraits, scenes) increases user stickiness
- **Success Metrics**:
  - Portraits generated per character (target: 3-5 average)
  - Characters with 3+ scenes (indicates deep engagement)
  - Time spent in studio per session (quality indicator)
  - Characters launched to chat after studio work (conversion metric)

## **🏗️ Core Functionality**

### **Primary Features**

1. **Portrait Generation & Versioning** - Status: Complete
   - Multi-model support (fal.ai, Replicate, local RunPod)
   - Image-to-image (I2I) workflow with reference images
   - Primary portrait selection (sets character.image_url)
   - Portrait gallery with lightbox viewer
   - Regeneration with custom prompts
   - Download and delete capabilities

2. **Character Details Editing** - Status: Complete
   - Basic info: Name, gender, description, content rating
   - Appearance: Tags, detailed description, presets
   - Personality: Persona, voice tone, mood, traits
   - Roleplay: First message, alternate greetings
   - Advanced: System prompt, public visibility, AI model selection

3. **Scene Management** - Status: Complete
   - Create custom roleplay scenarios
   - Scene-specific system prompts
   - Scene starter messages
   - Launch chat directly from scene

### **Secondary Features**

1. **AI-Powered Suggestions** - Status: Complete
   - Description enhancement
   - Appearance tag generation
   - Personality trait suggestions
   - Voice and persona refinement
   - Model selection (OpenRouter, local Qwen)

2. **Reference Image Workflow** - Status: Complete
   - Upload reference images for I2I generation
   - Library browser integration
   - Reference image preview in sidebar
   - Automatic model filtering (I2I-capable only)

3. **Character Navigation** - Status: Complete
   - Character selector dropdown (switch between characters)
   - "Create New Character" quick action
   - Start Chat button (launch to roleplay)
   - Preview button (open character in new window)

## **🎨 UX/UI Design**

### **Layout Structure**

**Desktop (Grid Layout)**:

- **Left Sidebar** (320px default, resizable 280-480px): CharacterStudioSidebar
  - **Resizable**: Drag handle on right edge allows width adjustment
  - Avatar preview (64x64px) with loading spinner
  - Collapsible sections:
    - Basic Info (name, gender, rating, description)
    - Appearance (presets, tags, reference image, Image Match Mode indicator)
    - Personality & Voice (persona, voice tone, mood, traits, first message)
    - Advanced Settings (AI model for suggestions, public toggle, system prompt)
  - AI suggestion buttons throughout (SuggestButton component)
  - Image model selector with I2I capability badges
  - "Generate Portrait" button

- **Center Workspace** (flex-1):
  - Tab navigation (Portraits / Scenes)
  - **PosePresets**: Quick pose chips (Standing, Profile, Back, Sitting, Lying, Close-up)
  - PortraitGallery: CSS grid (auto-fill, min 130px)
  - ScenesGallery: CSS grid (2-4 cols, aspect-video)
  - Empty states with call-to-action

- **Header Bar**:
  - Back button + Character Selector dropdown
  - "Start from Template" button (new characters only)
  - Save status badge (Saving/Saved/Unsaved)
  - Start Chat + Preview buttons

- **Bottom Bar** (sticky, portraits tab only): CharacterStudioPromptBar
  - Textarea for custom prompts (44-100px height)
  - Reference image dropdown (upload/library/remove)
  - Model selector dropdown with I2I badges
  - Generate button with progress percentage

**Mobile (Tabs)** - MobileCharacterStudio component:

- Top: Character selector + Save button
- Tab navigation: Details / Portraits / Scenes
- Details tab: Full CharacterStudioSidebar in scrollable view
- Portraits tab: PosePresets + PortraitGallery + CharacterStudioPromptBar
- Scenes tab: ScenesGallery with bottom Start Chat bar
- Bottom bar context-aware (prompt bar on portraits, chat button on details/scenes)

### **User Flow**

1. **Entry**: Navigate from CreateCharacter page or select existing character
2. **Overview**: View character avatar, name, current portraits/scenes count
3. **Editing**: Expand sidebar sections, modify fields (marks dirty state)
4. **AI Enhancement**: Click suggestion buttons → AI generates content → Review/accept
5. **Portrait Generation**:
   - Option A: Type custom prompt in bottom bar → Select model → Generate
   - Option B: Click "Generate Portrait" in sidebar (uses appearance description)
6. **Portrait Management**: View in gallery → Click for lightbox → Set primary / Download / Delete / Use as reference
7. **Scene Creation**: Click "Add Scene" → Fill modal → Create → Launch chat from scene
8. **Save & Launch**: Unsaved indicator prompts save → "Start Chat" launches roleplay

### **Key Interactions**

- **Resizable Sidebar**: Drag handle on right edge allows 280-480px width adjustment
- **Debounced Auto-Save**: Changes auto-save after 2s delay (existing characters only)
- **Auto-Save on Generate**: Portrait generation auto-saves new characters silently
- **Primary Portrait Badge**: Gold star on primary portrait in gallery
- **Image Match Mode**:
  - Toast notification when reference image added/removed
  - Automatic switch to I2I-compatible model
  - Badge showing compatible model count
- **Pose Presets**: Click chip to append pose prompt to textarea
- **Character Templates**: "Start from Template" opens template selector dialog
- **Generation Progress**: Real-time percentage display during portrait generation
- **Loading States**:
  - Character loading: Full-screen spinner
  - Portrait generating: Spinner in gallery + progress % in button
  - AI suggestions: Sparkles icon spins
  - Save status: Badge shows Saving/Saved/Unsaved
- **Error Recovery**:
  - Toast notifications for generation failures
  - Fallback to fal.ai URL if storage upload fails
  - Model unavailable → toast notification + suggested alternatives

## **🔧 Technical Architecture**

### **Core Components**

**Page Component**: [CharacterStudio.tsx](src/pages/CharacterStudio.tsx:1) (~858 lines)

- Route: `/character-studio/:id` or `/character-studio` (new)
- Supports `?role=user` param for persona mode (vs. default `ai` companion mode)
- Main orchestrator for all sub-components
- Includes MobileCharacterStudio component (~212 lines)
- Manages resizable sidebar state (280-480px range)
- Debounced auto-save (2s delay for dirty state)
- Image Match Mode notifications and auto-model-switching

**Sub-Components**:

- [CharacterStudioSidebar.tsx](src/components/character-studio/CharacterStudioSidebar.tsx:1) (~767 lines)
  - Character form fields in collapsible sections
  - AI suggestion integration (SuggestButton)
  - Image Match Mode indicator with I2I model count
  - Reference image upload/library picker
  - Portrait generation trigger

- [PosePresets.tsx](src/components/character-studio/PosePresets.tsx:1) (~63 lines)
  - Quick pose selection chips for portrait iteration
  - Presets: Standing, Profile, Back, Sitting, Lying, Close-up
  - Click to append pose prompt to textarea

- [CharacterTemplateSelector.tsx](src/components/character-studio/CharacterTemplateSelector.tsx:1) (~87 lines)
  - Dialog for selecting pre-built character templates
  - Loads from character_templates table
  - Auto-fills appearance_tags, traits, persona, first_message, voice_tone, mood

- [PortraitGallery.tsx](src/components/character-studio/PortraitGallery.tsx:1) (~263 lines)
  - Grid display of portrait versions
  - Primary selection indicator
  - Options menu (set primary, reference, download, delete)
  - Lightbox trigger

- [ScenesGallery.tsx](src/components/character-studio/ScenesGallery.tsx:1) (~203 lines)
  - Scene card grid
  - Start chat + edit/delete actions
  - Empty state

- [CharacterStudioPromptBar.tsx](src/components/character-studio/CharacterStudioPromptBar.tsx:1) (~284 lines)
  - Custom prompt textarea with controlled value support
  - Reference image dropdown (upload/library/remove)
  - Model selector with I2I capability badges
  - Generate button with progress percentage display

- [PortraitLightbox.tsx](src/components/character-studio/PortraitLightbox.tsx:1) (~412 lines)
  - Fullscreen portrait viewer
  - Navigation arrows
  - Regeneration controls
  - Download/delete/set primary actions

**State Management**:

- Primary Hook: [useCharacterStudio.ts](src/hooks/useCharacterStudio.ts:1) (~532 lines)
  - Character CRUD operations
  - Scene management
  - Portrait generation orchestration with progress tracking
  - Dirty state tracking
  - Auto-save on generate (silent mode)
  - Supports `defaultRole` option for persona vs. companion

- Delegated Hook: [usePortraitVersions.ts](src/hooks/usePortraitVersions.ts:1) (~240 lines)
  - Portrait versioning
  - Primary selection
  - Realtime subscriptions for portrait updates
  - Reordering (not yet exposed in UI)

**Data Flow**:

1. Load character data on mount (if characterId provided)
2. Load scenes when characterId available
3. Portrait versions loaded via realtime subscription
4. User edits → `updateCharacter` → marks dirty
5. Manual save → `saveCharacter` → DB update
6. Portrait generation → `generatePortrait` → auto-save if needed → edge function call → DB insert → realtime update

### **Integration Points**

**Database Tables**:

- `characters` - Main character profile
  - Fields: name, description, gender, content_rating, is_public, traits, persona, image_url, reference_image_url, appearance_tags[], voice_tone, mood, first_message, system_prompt, alternate_greetings[], default_presets
  - Relations: belongs_to users, has_many character_portraits, has_many character_scenes

- `character_portraits` - Portrait versioning
  - Fields: character_id FK, image_url, thumbnail_url, prompt, enhanced_prompt, generation_metadata, is_primary, sort_order
  - Realtime subscription: INSERT, UPDATE, DELETE events

- `character_scenes` - Roleplay scenarios
  - Fields: character_id FK, scene_name, scene_description, scene_prompt, image_url, scene_type, scene_starters[], system_prompt

- `api_models` - Image generation models
  - Dynamic query: I2I-capable models when reference image present
  - Fields: display_name, model_key, modality, capabilities, is_active, priority

**Edge Functions**:

- [character-portrait](supabase/functions/character-portrait/index.ts:1) (539 lines)
  - Portrait generation pipeline
  - Model resolution (I2I capability matching)
  - Prompt construction
  - fal.ai integration
  - Storage upload
  - Database insert

- [character-suggestions](supabase/functions/character-suggestions/index.ts:1)
  - AI-powered field enhancements
  - Uses OpenRouter or local Qwen models
  - Returns suggestions for description, appearance, traits, persona

**Storage Buckets**:

- `reference_images` - User-uploaded reference images for I2I
- `user-library` - Permanent portrait storage

**External APIs**:

- fal.ai - Primary image generation provider
- Replicate - Alternative image provider
- OpenRouter - AI suggestion models

### **Performance Requirements**

- **Page Load**: < 1s for character data fetch
- **Portrait Generation**: 5-15s depending on model (shown in toast)
- **Realtime Latency**: < 500ms for portrait updates
- **Memory**: Portrait gallery pagination (future: virtualization if >50 portraits)

## **📊 Success Criteria**

### **User Experience Metrics**

- **Portrait Generation Rate**: 70%+ of characters have 2+ portraits
- **Scene Creation Rate**: 40%+ of characters have 1+ custom scenes
- **AI Suggestion Usage**: 50%+ of characters use AI suggestions
- **Save Completion**: 90%+ of editing sessions result in saved characters
- **Chat Conversion**: 60%+ of characters launched to chat within 24 hours of studio work

### **Technical Performance**

- **Character Load Time**: < 1s (p95)
- **Portrait Generation**: < 20s (p95)
- **Realtime Update Latency**: < 500ms (p95)
- **Error Rate**: < 2% for portrait generation
- **Storage Upload Success**: > 98%

### **Business Metrics**

- **Revenue per Character**: Track API costs vs. subscription value
- **Character Completion**: Characters with portraits + scenes vs. empty profiles
- **Retention**: Users who access studio 3+ times have 2x retention

## **🚨 Error Scenarios & Handling**

### **Common Failure Modes**

- **Portrait Generation Failures**:
  - Model unavailable: Show error toast, suggest alternative models
  - API timeout: Retry with exponential backoff, fallback to different provider
  - Storage upload failure: Use fal.ai URL as fallback, log error
  - Content moderation block: Show user-friendly error, suggest SFW mode

- **Character Save Failures**:
  - Validation errors: Inline field errors, prevent save
  - Network errors: Toast notification, retry with exponential backoff
  - Unique constraint violation: Character name conflict, suggest alternatives

- **Realtime Subscription Failures**:
  - WebSocket disconnect: Auto-reconnect with backoff
  - Channel timeout: Manual refresh button in gallery

### **Error Handling Strategy**

- **User Feedback**: Toast notifications for all async operations
- **Graceful Degradation**:
  - Storage fails → Use fal.ai URL
  - Realtime fails → Manual refresh button
  - AI suggestions fail → Silently log, allow manual editing
- **Logging**: All edge function errors logged to Supabase edge function logs
- **Monitoring**: Track error rates by edge function and operation type

## **📋 Implementation Progress**

### **✅ Completed Features**

- [x] CharacterStudio page layout (desktop + mobile) - Jan 13, 2026
- [x] CharacterStudioSidebar with collapsible sections - Jan 13, 2026
- [x] PortraitGallery with realtime updates - Jan 13, 2026
- [x] PortraitLightbox fullscreen viewer - Jan 14, 2026
- [x] ScenesGallery integration - Jan 13, 2026
- [x] CharacterStudioPromptBar with model selection - Jan 14, 2026
- [x] useCharacterStudio hook - Jan 13, 2026
- [x] usePortraitVersions hook with realtime - Jan 13, 2026
- [x] character-portrait edge function - Jan 12, 2026
- [x] AI suggestions integration - Jan 13, 2026
- [x] Reference image I2I workflow - Jan 14, 2026
- [x] Primary portrait selection - Jan 13, 2026
- [x] Character navigation/switching - Jan 13, 2026
- [x] Auto-save on portrait generation - Jan 13, 2026
- [x] Mobile responsive layout - Jan 14, 2026
- [x] HEIC image support - Jan 14, 2026
- [x] Portrait URL signing and caching - Jan 16, 2026
- [x] Resizable sidebar (280-480px drag handle) - Feb 4, 2026
- [x] PosePresets component for quick iteration - Feb 4, 2026
- [x] CharacterTemplateSelector dialog - Feb 4, 2026
- [x] Debounced auto-save (2s delay) - Feb 4, 2026
- [x] Image Match Mode notifications - Feb 4, 2026
- [x] Auto-switch to I2I model when reference added - Feb 4, 2026
- [x] Generation progress tracking (percent display) - Feb 4, 2026
- [x] Persona mode support (?role=user param) - Feb 4, 2026

### **🚧 Planned**

- [ ] Portrait reordering UI - Medium - Not yet exposed (hook function exists)
- [ ] Scene deletion confirmation - Low - Currently logs only
- [ ] Portrait batch operations (delete multiple) - Medium - UX improvement
- [ ] Export character JSON - Low - Developer feature

### **🐛 Known Issues**

- [ ] Scene deletion not fully implemented - Low impact - Edit works, delete logs only
- [ ] Portrait regeneration creates new instead of versioning - Medium impact - Intentional design, but could improve
- [ ] No prompt preview before generation - Low impact - Users want control, not preview friction

## **🔗 Dependencies**

### **Technical Dependencies**

- **Required Hooks**:
  - useCharacterStudio (primary state)
  - usePortraitVersions (portrait management)
  - useImageModels (model selection)
  - useRoleplayModels (AI suggestions)
  - useAuth (user context)

- **Edge Functions**:
  - character-portrait (required for generation)
  - character-suggestions (optional, for AI enhancements)

- **Database Tables**:
  - characters (CRUD)
  - character_portraits (CRUD + realtime)
  - character_scenes (CRUD)
  - api_models (read-only)

- **Storage**:
  - reference_images bucket (I2I uploads)
  - user-library bucket (portrait storage)

### **Business Dependencies**

- **API Credits**: Requires active fal.ai or Replicate API keys
- **Model Availability**: At least one active image model in api_models table
- **User Permissions**: Authenticated users only, ownership enforced
- **Content Moderation**: Safety checker for SFW content, disabled for NSFW

## **📈 Future Enhancements**

### **Phase 2 Features**

- [ ] Portrait style transfer - Apply reference style to existing portraits
- [ ] Batch portrait generation - Generate multiple variations at once
- [ ] Character templates - Pre-built character archetypes
- [ ] Social sharing - Share characters publicly, browse community characters
- [ ] Advanced scene editor - Visual scene builder with branching narratives

### **Phase 3 Features**

- [ ] Voice cloning integration - Generate voice samples for characters
- [ ] 3D avatar generation - Convert 2D portraits to 3D models
- [ ] Character analytics - Track usage, conversation quality, user engagement
- [ ] Collaborative editing - Multi-user character development

## **📝 Notes**

**Design Decisions**:

- **Dual-Page Approach**: CreateCharacter for initial setup, CharacterStudio for iteration. This reduces cognitive load for new users while providing power users with advanced tools.
- **Auto-Save on Generate**: Prevents orphaned portraits by ensuring character exists before generation. Silent mode avoids toast spam during rapid iteration.
- **Debounced Auto-Save**: 2-second delay on field changes for existing characters improves reliability without overwhelming the database.
- **Primary Portrait System**: Single source of truth for character.image_url simplifies roleplay integration.
- **Realtime Subscriptions**: Eliminates manual refresh, enables multi-device editing (future).
- **Resizable Sidebar**: User-adjustable width (280-480px) accommodates varying content lengths and user preferences.
- **Pose Presets**: Quick iteration workflow - click pose chip to build prompts incrementally.
- **Image Match Mode**: Clear visual indicator and toast notifications when reference image affects model selection.
- **Persona Mode**: Supports `?role=user` param to create user personas (vs. AI companions).

**Technical Notes**:

- Portrait versioning uses sort_order + created_at for stable ordering
- generation_metadata JSON stores full generation context for debugging
- I2I capability matching uses api_models.capabilities->supports_i2i boolean
- Reference images uploaded to reference_images bucket for security isolation
- Resizable sidebar uses useRef for isResizing state (avoids re-render overhead)
- Generation progress simulates percentage based on estimated duration

**Commit History Context**:

- 30+ commits related to character studio (Jan 10-17, 2026)
- Major refactors: Portrait URL signing (Jan 16), mobile layout (Jan 14), lightbox (Jan 14)
- Performance improvements: Constrain lightbox images, optimize mobile modals
- Feb 4, 2026: UX audit - resizable sidebar, pose presets, debounced auto-save

---

**Related Documentation**:

- [CREATE_CHARACTER_PAGE.md](CREATE_CHARACTER_PAGE.md) - Initial character creation form
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) - Deep technical implementation details

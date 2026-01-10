# Roleplay Purpose & PRD (Product Requirements Document)

**Last Updated:** January 4, 2026
**Status:** ✅ **85% Complete - Production Ready**
**Priority:** **HIGH** - Core MVP Feature

## **🎯 Purpose Statement**
Provide a mobile-first, character-consistent chat experience with integrated visual scene generation, enabling users to engage in immersive roleplay conversations with AI characters while maintaining visual continuity across scenes.

## **👤 User Intent & Business Goals**

### **Primary User Intent**
- **Entertainment**: Engage in immersive roleplay conversations with AI characters
- **Creative Expression**: Generate and share visual scenes from conversations
- **Social Sharing**: Create shareable content for social media platforms
- **Mobile-First**: On-the-go entertainment and storytelling

### **Secondary User Intent**
- **Character Customization**: Create and personalize AI characters
- **Story Development**: Build persistent narratives across conversations
- **Community Engagement**: Share characters and scenes with other users
- **Premium Features**: Access advanced consistency and memory systems

### **Business Value**
- **Competitive Differentiation**: Integrated scene generation vs. Character.ai
- **User Engagement**: Visual storytelling increases session duration (target: 15+ minutes)
- **Viral Potential**: Scene images create shareable content for social media
- **Revenue Opportunity**: Premium features for advanced consistency and memory
- **User Retention**: Target 70%+ day 7 retention through engaging experience

## **🏗️ Core Functionality Requirements**

### **Primary Features (MVP)**
1. **Character Selection Dashboard** - Mobile-first grid, immediate chat start
2. **Chat Interface** - Responsive chat with character avatars and streaming
3. **Scene Integration** - Auto-selected scenes, optional manual selection in chat
4. **Scene Builder** - Create, edit, and manage character scenes with name, description, and prompts
5. **Character & Scene Editing** - Full editing capabilities for owners and admins
6. **Memory System** - Three-tier memory (conversation, character, profile)
7. **Image Consistency** - Hybrid approach using i2i reference (70%+ consistency)
8. **Non-Blocking UI** - Drawers for character info, scenes, and settings (no modal blockers)
9. **Model Selection** - Dynamic model selection from `api_models` table with health-based availability

**Model Selection Details:**
- **Settings Drawer**: Quick access to model selection in chat interface
- **Model Selection Modal**: Full-featured modal (`ModelSelectionModal` component) with model details, capabilities, and provider information
- **Model Selector Component**: Inline selector (`ModelSelector` component) for settings and configuration
- **Dynamic Loading**: Models loaded from `api_models` table filtered by `is_active = true`
- **Template Integration**: Selected model triggers appropriate prompt template selection via `target_model` field matching
- **Health-Based Availability**: Local models conditionally available based on worker health checks
- **Default Selection**: Always uses non-local default model for reliability

### **Secondary Features (Phase 2)**
1. **Custom Character Creation** - Character builder with real-time preview
2. **Scene Generation** - Dynamic scene creation with consistency controls
3. **Model Management** - Admin/power user model selection and configuration
4. **Advanced Mobile Gestures** - Swipe navigation, advanced touch gestures, pinch-to-zoom
5. **Long-Press Actions** - Context menus and advanced message actions

## **🎨 UX/UI Design Requirements**

### **Layout Structure**
- **Mobile-First Dashboard**: Grid layout with character cards optimized for touch (44px minimum)
- **Responsive Chat**: Full-screen chat view with bottom input bar, immediate start
- **Slide-out Drawers**: Non-blocking drawers for character info, scenes, and settings
- **Bottom Navigation**: Mobile-optimized navigation bar
- **No Blocking Modals**: All advanced features accessible via drawers, not modals

### **User Flow**
1. **Login → Dashboard**: Grid of character cards with "Quick Start" section
2. **Character Selection**: Tap character card → start chat immediately (preview optional via long-press or button)
3. **Scene Integration**: Auto-select best available scene, or start without scene (select later in chat)
4. **Chat Interface**: Full-screen chat with character avatars, scene integration, and optional drawers
5. **Scene Generation**: Automatic scene generation with consistency controls (Phase 2)

### **Key Interactions**
- **Touch-Optimized Cards**: Large touch targets with proper spacing (44px minimum)
- **Immediate Chat Start**: Single tap on character card starts chat (<1 second)
- **Optional Preview**: Long-press (500ms) or preview button opens character info drawer
- **Drawer Gestures**: Swipe from edges to open character info or settings drawers
- **Pinch-to-Zoom**: Image viewing and scene preview (Phase 2)
- **Swipe Gestures**: Advanced navigation gestures (Phase 2)

## **🔌 3rd Party API Integration (Active)**

### **Model Providers**
| Modality | Primary (Cloud) | Fallback | Local (when available) | Edge Function |
|----------|-----------------|----------|------------------------|---------------|
| **Chat** | OpenRouter (Dolphin, etc.) | OpenRouter defaults | Qwen 2.5-7B | `roleplay-chat` |
| **Images** | Replicate, fal.ai | Seedream, RV5.1 | SDXL Lustify | `replicate-image`, `fal-image` |
| **Video** | fal.ai (WAN 2.1 I2V) | - | WAN 2.1 | `fal-image` |

### **Routing Strategy**
- **Default to cloud models** for reliability
- Local models only used when:
  1. Admin enables health check toggle
  2. Health check confirms worker availability
  3. User explicitly selects local model
- Automatic fallback to cloud on local failure
- Models dynamically loaded from `api_models` table with `is_active = true` filter

### **Model Selection UI**

The roleplay system provides dynamic model selection through the following UI components:

**Components:**
- **`ModelSelectionModal`**: Modal dialog for selecting chat/roleplay models. Displays local models (Qwen) and API models (OpenRouter) loaded from `api_models` table. Shows model capabilities (speed, cost, quality, NSFW support) and provider information.

- **`ModelSelector`**: Inline model selector component used in settings drawers. Dynamically loads models based on modality (roleplay, image, video) and filters by `is_active = true`.

**Hooks:**
- **`useRoleplayModels`**: Loads roleplay models from `api_models` table where `modality = 'roleplay'` and `is_active = true`. Combines local models (Qwen) with API models (OpenRouter). Exposes `chatWorkerHealthy` status for local model availability. Always returns a non-local default model for reliability.

- **`useImageModels`**: Loads image/video models from `api_models` table where `modality IN ('image', 'video')` and `is_active = true`. Supports both Replicate and fal.ai models. Used for scene generation and workspace media creation.

**Model Availability:**
- Models are only displayed in UI dropdowns when `is_active = true` in `api_models` table
- Local models (Qwen) are conditionally available based on health check status
- API models are always available when `is_active = true`
- Default model selection prioritizes non-local models for reliability

**Video Model Selection:**
- Users can choose between local WAN 2.1 (when healthy) and fal.ai WAN 2.1 I2V
- Selection stored in user settings and applied to workspace video generation
- fal.ai WAN 2.1 I2V routed through `fal-image` edge function

### **Content Rating**
- All roleplay defaults to **NSFW** content tier
- SFW option available for users who prefer it
- Content rating affects: prompt templates, voice examples, scene suggestions

## **🔧 Technical Requirements**

### **Performance Requirements**
- **Page Load**: <3 seconds on mobile devices
- **Image Generation**: <5 seconds for scene generation
- **Memory Usage**: <100MB on mobile devices
- **API Response**: <2 seconds for chat responses

### **Integration Requirements**
- **Database**: Leverage existing `characters`, `conversations`, `messages`, `scenes` tables
- **Edge Functions**: Use existing `queue-job`, `replicate-image`, `roleplay-chat`, `fal-image`
- **Storage**: Use existing `user_library` table with roleplay category
- **Workers**: Chat Worker (local), SDXL Worker (images), API integrations (OpenRouter, Replicate, fal.ai)
- **API Models Table**: Dynamic model configuration via `api_models` table with `is_active` flag controlling UI availability

**API Models Table Structure:**
- `api_models.model_key`: Unique identifier matching provider's model (e.g., `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`)
- `api_models.provider_id`: Links to `api_providers` table for provider configuration
- `api_models.modality`: Determines which edge function to use (`roleplay`, `image`, `video`)
- `api_models.is_active`: Controls dropdown availability in UI
- `api_models.capabilities`: JSONB field with model capabilities (speed, cost, quality, NSFW support)

**Template Integration:**
- `api_models.model_key` → `prompt_templates.target_model` for model-specific templates
- When user selects model, system looks up template where `target_model = api_models.model_key`
- Falls back to universal template (`target_model IS NULL`) if no model-specific template exists
- Template selection happens in edge functions (`roleplay-chat`, `fal-image`, `replicate-image`)

## **Model Selection & Configuration**

### **Database-Driven Model Management**

The roleplay system uses the `api_models` table to dynamically configure and display available models:

**Table Structure:**
- `model_key`: Unique identifier matching provider's model identifier (e.g., `cognitivecomputations/dolphin-mistral-24b-venice-edition:free`)
- `display_name`: User-friendly name shown in UI
- `modality`: Model type (`roleplay`, `image`, `video`)
- `provider_id`: Foreign key to `api_providers` table
- `is_active`: Boolean flag controlling dropdown availability
- `is_default`: Boolean flag for default model selection
- `priority`: Integer for sorting order in UI
- `capabilities`: JSONB field storing model capabilities (speed, cost, quality, NSFW support)

### **UI Model Display**

**Local vs API Models:**
- **Local Models**: Hardcoded in UI components (e.g., Qwen 2.5-7B), conditionally available based on health checks
- **API Models**: Dynamically loaded from `api_models` table, always available when `is_active = true`
- Models are grouped by provider in UI (Local, OpenRouter, fal.ai, Replicate)

**Health Check Integration:**
- Local models (Qwen, SDXL, WAN) check health status via `system_config.workerHealthCache`
- Unhealthy local models are marked unavailable but still shown in UI with status indicator
- Automatic fallback to API models when local models are unhealthy

**Default Model Selection:**
- Default model is always a non-local (API) model to ensure reliability
- Selected from `api_models` where `is_default = true` and `is_active = true`
- Falls back to first active API model if no default is set
- Prevents user experience issues when local workers are down

### **Template Selection Integration**

When a user selects a model:
1. Model `model_key` is used to lookup template in `prompt_templates` table
2. Template lookup: `target_model = api_models.model_key`
3. If model-specific template found: Use it
4. If not found: Use universal template (`target_model IS NULL`)
5. Template variables (character name, personality, etc.) are substituted server-side
6. Final prompt sent to selected model via appropriate edge function

**Edge Function Routing:**
- Chat models → `roleplay-chat` edge function → OpenRouter or local worker
- Image models → `replicate-image` or `fal-image` edge function → Provider API
- Video models → `fal-image` edge function → fal.ai API

### **Settings Drawer Integration**

Model selection is accessible via:
- **Settings Drawer**: Quick access to model selection in chat interface
- **Model Selection Modal**: Full-featured modal with model details and capabilities
- **Settings Persistence**: Selected models stored in localStorage and user preferences

## **Scene/Scenario Builder System**

### **Overview**

The scene/scenario builder allows users to create, edit, and manage character scenes that provide context for roleplay conversations. Scenes are stored in the `character_scenes` table and linked to characters and conversations.

### **Scene Creation**

**UI Components:**
- **`SceneGenerationModal`**: Condensed modal (`max-w-sm`) for creating new scenes
  - Scene name field (required)
  - Scene description field (optional)
  - Scene prompt field (required)
  - Character selection (AI characters, user character, narrator)
  - Auto-navigation to chat after creation

**Database Schema:**
- `character_scenes.scene_name`: User-friendly name for the scene
- `character_scenes.scene_description`: Optional description providing context
- `character_scenes.scene_prompt`: The actual prompt used for scene generation
- `character_scenes.scene_rules`: Optional rules or constraints
- `character_scenes.scene_starters`: Array of conversation starter prompts
- `character_scenes.priority`: Integer for sorting (higher = first)

**Creation Flow:**
1. User opens `SceneGenerationModal` from character detail pane
2. Enters scene name, description, and prompt
3. Selects participants (characters, narrator, user character)
4. Scene record created in database via `useSceneNarrative` hook
5. Scene ID returned and passed to `onSceneCreated` callback
6. Parent component auto-selects new scene and navigates to chat
7. Scene context applied to conversation via `roleplay-chat` edge function

### **Scene Display & Management**

**UI Components:**
- **`CharacterPreviewModal`**: Shows scenes in expandable cards
  - Scene name and description displayed
  - Expandable scene prompt (removes `line-clamp-2` restriction)
  - Edit and delete buttons (owner/admin only)
  - Scene selection for chat start

- **`CharacterInfoDrawer`**: Side drawer with scene list
  - Similar expandable scene display
  - Edit functionality for owners/admins
  - Scene selection integration

**Scene Display Features:**
- Expandable/collapsible scene prompts (for prompts > 100 characters)
- Full scene description visible when expanded
- Scene image thumbnails (if available)
- Scene rules and starters displayed
- Priority-based sorting

### **Scene Editing**

**UI Components:**
- **`SceneEditModal`**: Full-featured editing modal
  - Edit scene name, description, prompt
  - Edit scene rules and starters
  - Update scene priority
  - Permission checks (owner OR admin)

**Permission Logic:**
```typescript
const isOwner = user.id === scene.character.user_id;
const isAdmin = user.role === 'admin';
const canEdit = isOwner || isAdmin;
```

**Editing Flow:**
1. User clicks edit button on scene card
2. `SceneEditModal` opens with current scene data
3. User modifies fields
4. Update saved to `character_scenes` table via `useCharacterScenes.updateScene()`
5. Local state updated, scene list refreshed
6. Selected scene updated if it was the edited one

### **Character Editing**

**UI Components:**
- **`CharacterEditModal`**: Comprehensive character editing
  - Edit name, description, persona, traits
  - Edit appearance tags, voice tone, mood
  - Edit content rating, gender, role
  - Update character image (upload or generate)
  - Toggle public/private visibility
  - Admin can edit all characters (public and private)
  - Owner can edit their own characters

**Permission Logic:**
```typescript
const isOwner = user.id === character.user_id;
const isAdmin = user.role === 'admin';
const canEdit = isOwner || isAdmin;
```

**Editing Flow:**
1. User clicks edit button in character preview or detail pane
2. `CharacterEditModal` opens with current character data
3. User modifies fields
4. For owners: Update via `useUserCharacters.updateUserCharacter()`
5. For admins: Direct Supabase update to allow editing any character
6. Character data refreshed in UI

### **Scene Selection & Navigation**

**Auto-Selection After Creation:**
- New scene automatically selected after creation
- Navigation to chat with scene ID in URL
- Scene context applied to conversation
- Scene displayed in character preview modal

**Scene Selection in Chat:**
- Scene ID passed via URL parameter (`?scene=<id>`)
- Scene context loaded in `MobileRoleplayChat`
- Scene prompt and system prompt applied to conversation
- Scene image displayed if available

### **Database Tables**

**`character_scenes` Table:**
- Primary table for roleplay scenes
- Linked to `characters` and `conversations`
- Supports scene name, description, prompt, rules, starters
- Stores generation metadata (model used, consistency settings, etc.)

**`scenes` Table:**
- Separate table linked to `projects` (storyboard functionality)
- Not used for roleplay (0 rows currently)
- Reserved for future storyboard/project features
- Documented separately from `character_scenes`

## **📊 Success Criteria & Metrics**

### **User Experience Metrics**
- **Flow Completion**: 95%+ success rate from login to chat (improved by removing blockers)
- **Character Selection**: <5 seconds average selection time (immediate start)
- **Chat Initiation**: <1 second to start conversation (direct navigation, no modals)
- **Session Duration**: 15+ minutes average session length

### **Technical Performance Metrics**
- **Mobile Load Time**: <3 seconds on low-end devices
- **Image Consistency**: 70%+ visual consistency across scenes
- **Memory Efficiency**: Optimized memory usage and management
- **Error Recovery**: <5% error rate with proper recovery

### **Business Metrics**
- **User Retention**: 70%+ day 7 retention
- **Feature Adoption**: 80%+ character usage rate
- **User Satisfaction**: 4.5+ star rating
- **Revenue Impact**: Premium feature adoption tracking

## **🚨 Error Scenarios & Handling**

### **Common Failure Modes**
- **Network Failures**: Offline mode with message queuing
- **API Errors**: Fallback to alternative models and services
- **Image Generation Failures**: Graceful degradation to text-only mode
- **Memory Issues**: Automatic cleanup and optimization

### **Error Handling Strategy**
- **Error Boundaries**: React error boundaries for component recovery
- **User Feedback**: Clear error messages with recovery options
- **Automatic Retry**: Intelligent retry logic for transient failures
- **Graceful Degradation**: Fallback modes for partial failures

## **🔗 Dependencies & Constraints**

### **Technical Dependencies**
- **SDXL Worker**: Image generation and consistency management
- **Chat Worker**: Conversation processing and streaming
- **Supabase**: Database, authentication, and real-time features
- **API Integrations**: OpenAI, Anthropic, and other chat models

### **Business Dependencies**
- **User Permissions**: Role-based access for admin features
- **Content Moderation**: Character and scene content filtering
- **Privacy Controls**: User data protection and memory management
- **Legal Compliance**: Content guidelines and user agreements

## **📈 Future Enhancements (Phase 2+)**

### **Advanced Features**
- **Multi-modal Interactions**: Generate images/videos from chat
- **Advanced Analytics**: Detailed usage analytics and insights
- **Collaborative Features**: Multi-user roleplay sessions
- **AI Narrator**: Advanced scene description generation

### **Premium Features**
- **High Consistency**: IP-Adapter for 90%+ consistency
- **Advanced Memory**: Unlimited cross-conversation memory
- **Custom Models**: User-specific model training
- **Priority Generation**: Faster generation for premium users

## **📝 Implementation Guidelines**

### **Critical Technical Decisions**
1. **Image Consistency Method**: Hybrid approach using i2i reference as default (70% consistency)
2. **Memory Architecture**: Three-tier system with user controls and optimization
3. **Mobile Priority**: Design mobile-first with progressive desktop enhancement
4. **Performance Focus**: Optimize for speed and reliability over advanced features
5. **UI/UX Philosophy**: Immediate action, optional complexity, no blocking modals

### **UI/UX Principles**
- **Immediate Action**: Click → Chat starts instantly
- **Optional Complexity**: Advanced features in drawers, not blockers
- **Mobile-First**: Touch-optimized, no modal stacking
- **Progressive Disclosure**: Simple by default, advanced when needed

### **Development Guidelines**
- **Component Reusability**: Design components for reuse across pages
- **State Management**: Use consistent patterns with React hooks
- **Testing Strategy**: Comprehensive testing at each development phase
- **Documentation**: Maintain up-to-date documentation throughout development

### **Quality Assurance**
- **Mobile Testing**: Extensive testing on various mobile devices
- **Performance Monitoring**: Continuous monitoring of load times and memory usage
- **User Testing**: Regular user testing and feedback collection
- **Error Tracking**: Comprehensive error tracking and resolution

---

## **📋 Refactor Notes (December 2025)**

**Refactor Rationale:** Based on user feedback and competitor analysis (Character.ai, Janitor.ai, Chub.ai), the roleplay flow has been simplified to eliminate modal blockers and enable immediate chat start. This refactor addresses:
- Dark screen overlay persistence issues
- Complex workflow with too many modals
- Mobile-unfriendly modal stacking
- User confusion about required vs optional steps

**Key Refactor Changes:**
- Preview modal is now optional (long-press or button), not required
- Scenes auto-select or are optional (can start without scene)
- All advanced features moved to non-blocking drawers
- Direct navigation eliminates modal/navigation race conditions
- Improved metrics: <1s chat initiation, <5s character selection, 95%+ flow completion

**Refactor Plan:** See `.cursor/plans/roleplay_refactor_-_simple_mobile-first_16bb523a.plan.md`

---

## **🚀 Upcoming Features (Q1 2026)**

### **Phase 2: Enhanced Character Creation**
- **Structured character wizard**: 6-layer character creation (identity, personality, appearance, voice, role, constraints)
- **AI suggestions ("Sprinkle")**: AI-generated suggestions for traits, voice, appearance
- **Content rating toggle**: SFW/NSFW with NSFW default
- **Character templates**: Pre-built character archetypes

### **Phase 2: Scenario Setup Wizard**
- **8-screen guided flow**: Mode select → Age gate → Scenario type → Characters → Setting → Consent → Style → Hook
- **5 scenario types**: Stranger, Relationship, Power Dynamic, Fantasy, Slow Burn
- **AI-generated hooks**: Scenario opening suggestions based on character/type
- **Quick Start mode**: Minimal setup for fast session start

### **Phase 3: Advanced Features**
- **Multi-character scenarios**: Support for multiple AI characters
- **Memory anchors**: Key facts characters remember across sessions
- **Scenario templates**: Save and reuse scenario configurations

---

**Status**: PRD updated January 2026. 85% complete, production ready. This document serves as the strategic foundation for all roleplay development decisions and success metrics.

**Document Purpose**: This is the definitive Product Requirements Document (PRD) that defines the business goals, user requirements, and success criteria for the roleplay feature. It serves as the strategic foundation for all development decisions.
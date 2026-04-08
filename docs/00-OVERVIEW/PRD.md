# **Product Requirements Document (PRD) v5.0**
**OurVidz.com - AI Video Generation Platform**

---

## **Version History**

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| v4.0 | January 2025 | Team | Initial MVP architecture — RunPod RTX 6000 ADA workers, triple worker system (SDXL, WAN, Chat), single 5-second video capability |
| v5.0 | April 2026 | Team | Full platform expansion — storyboard-based video production, character studio, mobile-first architecture, self-hosted local model transition (open item), cloud providers as primary UI alternative |

---

## **Executive Summary**

OurVidz.com is a web-based platform enabling users to generate personalized AI content, with a focus on character-consistent video production, immersive roleplay experiences, and a full storyboard-driven production workflow.

**Current Status (April 2026):**
- **MVP Goal**: Multi-clip, character-consistent video production via storyboard system
- **Current Capability**: Full storyboard editor with scene/clip orchestration; single-clip image and video generation; character studio; roleplay chat with scene generation
- **Architecture**: Self-hosted local model workers (transition in progress — open item) + cloud provider alternatives (fal.ai, Replicate, OpenRouter) as primary UI-selectable path
- **Infrastructure Note**: Original RunPod RTX 6000 ADA cloud GPU approach has been superseded. Models are transitioning to self-hosted local hosting. Worker memory management, queue architecture, and callback authentication specifics for local hosting are an open item. The job queue patterns (Redis/Upstash, SDXL/WAN queue structure, health checks, worker registration) carry forward as implementation patterns regardless of hosting provider.
- **Documentation**: Organized structure for AI assistance and development

The platform uses WAN 2.1 T2V 1.3B, SDXL Lustify, and Qwen 2.5-7B models for local generation, with fal.ai (WAN 2.1, Seedream), Replicate (Realistic Vision 5.1), and OpenRouter (multi-model chat) as cloud provider alternatives selectable in the UI.

---

## **1. Product Overview**

### **1.1 Vision Statement**

Create an accessible, mobile-first platform that democratizes adult content creation through AI video generation, ensuring character consistency and creative control while scaling from simple image generation to full multi-scene video productions.

### **1.2 Core Value Propositions**

- **Progressive Complexity**: Quick single image → video clip → full storyboard production
- **Character Persistence**: Maintain consistent characters via 6-layer character system, anchor/canon references, and I2I consistency methods
- **Storyboard Production**: Scene-by-scene video production with AI story planning, clip orchestration, and frame chaining
- **Dual Provider Path**: Local workers (when available) or cloud providers (fal.ai, Replicate, OpenRouter) as UI-selectable alternatives
- **Roleplay Immersion**: Character-driven chat with automatic scene image generation, 3-tier memory, and scenario setup
- **Mobile-First UX**: Full mobile experience with dedicated mobile pages and touch-optimized workflows
- **Cost Efficiency**: Pay-per-use model with transparent credit system and provider cost tracking
- **Privacy First**: No data retention, encrypted processing, NSFW-friendly
- **Quality Output**: Multiple quality tiers across all generation types
- **Security**: HMAC-SHA256 webhook authentication, ownership validation, idempotent job handling

### **1.3 Target Users**

- **Primary**: Independent adult content creators seeking AI-powered production tools
- **Secondary**: Couples creating personalized content for private use
- **Expanding**: Content creators building character-driven storyboard productions
- **Future**: Small adult entertainment studios, artists, and animators

---

## **2. Product Strategy & Phased Development**

### **2.1 Phase 1: Core Platform (Complete)**
**Target**: Core image/video generation with workspace, library, and roleplay foundation

**Completed:**
- ✅ **Infrastructure**: Supabase (PostgreSQL, Auth, Storage, Edge Functions), Upstash Redis job queuing
- ✅ **Models**: WAN 2.1 T2V 1.3B, SDXL Lustify, Qwen 2.5-7B Base/Instruct (local); fal.ai, Replicate, OpenRouter (cloud)
- ✅ **Worker System**: SDXL, WAN, Chat workers with health monitoring and dynamic URL registration
- ✅ **Base Generation**: Image generation (T2I, I2I), video generation (T2V, I2V), 10+ generation formats
- ✅ **I2I System**: Image-to-image with modify/copy modes, reference strength controls, dual ref slots (ref1/ref2) with drag-and-drop
- ✅ **3rd Party APIs**: fal.ai (images + video), Replicate (RV5.1 images), OpenRouter (chat) — fully implemented as UI-selectable alternatives, not fallbacks
- ✅ **Workspace**: Mobile-first MobileSimplifiedWorkspace, dual image/video mode, quick bar, settings sheet
- ✅ **Library**: Asset management with filtering, bulk operations, tag system, list/grid views
- ✅ **Dynamic Prompting**: Database-driven prompt templates, prompt enhancement (Qwen 7B), prompt scoring
- ✅ **Mobile-First**: Dedicated mobile pages for workspace and roleplay; responsive all pages
- ✅ **Security Hardening**: HMAC-SHA256 webhook auth (job-callback, replicate-webhook), ownership validation for signed URLs, terminal-state guards, cross-user reference prevention
- ✅ **Admin System**: 14-tab comprehensive admin (API models, providers, usage costs, prompt management, analytics, content moderation, system config, DB manager)
- ✅ **Dashboard**: Feature hub with navigation cards and recent projects

**Success Achieved:**
- Stable generation pipeline with local and cloud fallback paths
- Mobile-responsive experience across all core features
- Secure webhook architecture protecting job callbacks
- Provider cost tracking and balance visibility

### **2.2 Phase 2: Character System & Storyboard Foundation (Complete)**
**Target**: Character consistency, character studio, and storyboard infrastructure

**Completed:**
- ✅ **Character Studio V3**: Three-column workspace (sidebar, editor, preview), multi-role support (AI/user/narrator), portrait management, appearance/traits editing
- ✅ **CharacterHub V2**: Character discovery and management hub, public character browsing, filtering
- ✅ **Create Character Wizard**: 6-step creation (identity, personality, appearance, voice, role, review)
- ✅ **6-Layer Character Architecture**: identity, personality, appearance, voice, role, constraints + advanced (emotional arc, memory anchors)
- ✅ **Character Anchor/Canon System**: Visual consistency anchors (character_anchors), pinned reference outputs (character_canon)
- ✅ **Portrait Generation Routing**: Bypasses local queue, routes directly to fal.ai or Replicate via api_models lookup
- ✅ **Consistency Methods**: hybrid (reference + seed), i2i_reference (I2I with strength), seed_locked
- ✅ **Storyboard System (Foundation)**: Project management, scene organization, clip system, AI story planning
- ✅ **Clip Chaining**: Parent-child clip chains, frame extraction, end-frame-to-start-frame continuity
- ✅ **Motion Preset Library**: Built-in categories (breathing, turn, walk, camera, expression, general) + user presets
- ✅ **StoryboardEditor**: Full multi-column editor with ClipCanvas, SceneStrip, ClipDetailPanel, FrameSelector
- ✅ **Clip Types**: quick (I2V), extended (continuation), controlled (identity+motion), long (auto-orchestrated), keyframed (multi-condition)
- ✅ **Multi-Condition Video**: Simultaneous identity, motion, endframe, and scene reference inputs for fal.ai models

**Success Achieved:**
- Full storyboard production pipeline operational
- Character visual consistency via anchor/canon reference system
- Frame chaining enabling shot-to-shot continuity

### **2.3 Phase 3: Production Quality & Extended Video (In Progress)**
**Target**: 30-second video delivery, advanced production capabilities, AI-assisted workflow

**Completed:**
- ✅ **AI Story Planning**: Full AI-assisted story breakdown (title, description → scenes, beats, mood, duration)
- ✅ **Clip Orchestration Service**: Multi-step clip generation workflows, clip type routing, motion preset integration, prompt enhancement for clip context
- ✅ **Frame Extraction Service**: Optimal frame extraction by percentage, timing rules, chain frame management
- ✅ **Story AI Service**: Story beats generation, scene breakdown, AI narration (customizable tone/focus/style)
- ✅ **Scene Narrative Edge Function**: AI description/narrative generation for scenes
- ✅ **Assembly Preview**: Preview final video assembly before rendering
- ✅ **Rendering Workflow**: Render queue management, status tracking (draft → in_progress → rendering → completed → archived)

**In Progress / Remaining:**
- 🔄 **30-Second Video Delivery**: Infrastructure complete via clip chaining; final render assembly and export polish ongoing
- 🔄 **Video Stitching**: Combining rendered clips into final output with transition styles (crossfade, cut, fade)
- 🚧 **Advanced Character Continuity**: Automated anchor-based character re-injection across storyboard scenes

**Success Criteria:**
- 30-second videos with character continuity delivered end-to-end
- Full export of assembled storyboard projects
- Automated character consistency across clips

### **2.4 Phase 4: Local Hosting Migration & Scale (Planned)**
**Target**: Transition from cloud GPU providers to self-hosted local model infrastructure; enterprise features

**Open Item — Local Hosting:**
> **Architecture Note**: The original RunPod RTX 6000 ADA cloud GPU approach (v4.0) has been superseded. Models will be self-hosted locally. The specifics of worker memory management, job queue architecture, and callback authentication for self-hosted workers are **TBD**. The existing Redis/Upstash queue patterns, health check systems, and worker registration endpoints serve as design references for the migration.

**Planned Features:**
- 🚧 **Self-Hosted Worker Architecture**: Define memory requirements, queue protocol, and HMAC callback authentication for local model deployment
- 🚧 **Local GPU Management**: Worker health monitoring, dynamic URL registration, load balancing for local inference
- 🚧 **Enterprise User Management**: Multi-tenant support, team accounts
- 🚧 **Advanced Analytics**: Detailed content analytics, per-character generation statistics
- 🚧 **Custom Model Training**: Fine-tuning on user-provided character references
- 🚧 **API Access**: Third-party integrations and white-label solutions

**Success Criteria:**
- 100+ active users
- $10,000+ Monthly Recurring Revenue
- Local inference operational without dependency on RunPod or cloud GPU providers
- Enterprise partnerships established

---

## **3. Technical Architecture**

### **3.1 System Overview**

**Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
**Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions) + Upstash Redis
**AI Workers**: Local (self-hosted, open item) or cloud providers (fal.ai, Replicate, OpenRouter)
**Storage**: Staging-first workflow (workspace-temp → user-library); additional buckets per generation type
**Security**: HMAC-SHA256 webhook signatures, RLS on all tables, ownership-validated URL signing

### **3.2 Infrastructure History**

| Version | Infrastructure | Status |
|---------|---------------|--------|
| v4.0 (Jan 2025) | RunPod RTX 6000 ADA — cloud GPU workers (SDXL, WAN, Chat) | Superseded |
| v5.0 (Apr 2026) | Self-hosted local model workers (architecture TBD) + fal.ai / Replicate / OpenRouter as UI-selectable alternatives | In Transition |

The job processing patterns remain consistent: `queue-job` edge function → Redis queue → worker → webhook callback. What changes is the hosting location of the worker processes. Cloud providers (fal.ai, Replicate) are fully integrated as first-class alternatives in the UI, not reliability fallbacks.

### **3.3 Key Systems**

#### **Job Processing System** (`supabase/functions/queue-job/`, `job-callback/`)
- **Status**: ✅ Active
- **Flow**: queue-job validates → enhances prompt → creates job record → pushes to Redis (`sdxl_queue` or `wan_queue`) → worker processes → callback via job-callback
- **Security**: HMAC-SHA256 on all worker callbacks (X-Callback-Signature), cross-user reference prevention (403 on path ownership mismatch), terminal-state guards
- **Idempotency**: Duplicate callbacks silently succeed; upsert logic prevents constraint violations
- **Formats**: 10 generation formats — sdxl_image_fast/high, rv51_fast/high, image_fast/high, video_fast/high, image7b_fast/high_enhanced, video7b_fast/high_enhanced
- **Credits**: 1–6 credits per generation based on format

#### **Cloud Provider System** (`supabase/functions/fal-image/`, `replicate-image/`, `fal-webhook/`, `replicate-webhook/`)
- **Status**: ✅ Active — primary alternative path in UI
- **fal.ai**: Image generation (Seedream), video generation (WAN 2.1 I2V), async via `queue.fal.run`, webhook callbacks
- **Replicate**: Realistic Vision 5.1 image generation, prediction polling, webhook callbacks
- **OpenRouter**: Multi-model chat aggregation (Claude, GPT, Mistral, Llama, Dolphin, etc.)
- **Dynamic Config**: All providers and models managed via `api_models` / `api_providers` database tables; no hardcoded keys
- **Cost Tracking**: Every API call logged to `api_usage_logs`; aggregates in `api_usage_aggregates`; provider balances synced via `sync-provider-balances`

#### **I2I System** (`supabase/functions/queue-job/`)
- **Status**: ✅ Active
- **Modes**: Modify (denoise_strength 0.20, CFG 6.0) / Exact Copy (denoise_strength 0.05, CFG 1.0)
- **Reference Slots**: Single, start frame, end frame, or both (keyframed video)
- **Multi-Condition**: identity + motion + endframe + scene reference simultaneously (fal.ai models)
- **Ownership Validation**: Storage paths validated against authenticated user ID before signing

#### **Storyboard System** (`supabase/functions/storyboard-ai-assist/`, `scene-narrative/`)
- **Status**: ✅ Active
- **Projects**: CRUD with status tracking (draft → in_progress → rendering → completed → archived)
- **Scenes**: Character references, narrative context, motion style, AI suggestions
- **Clips**: 5 types (quick, extended, controlled, long, keyframed), parent-child chaining, frame extraction, multi-condition references
- **Motion Presets**: Built-in library (breathing, turn, walk, camera, expression, general) + user presets
- **AI Planning**: Full story plan generation from title/description → scenes/beats/mood/duration
- **Frame Extraction**: Optimal frame selection by percentage, timing rules, chain frame management

#### **Character System** (`supabase/functions/character-portrait/`, `character-suggestions/`)
- **Status**: ✅ Active
- **Architecture**: 6-layer character definition — identity, personality, appearance, voice, role, constraints
- **Anchors**: `character_anchors` for visual consistency references; `character_canon` for pinned outputs
- **Portrait Routing**: Bypasses local queue → queries api_models for default generation model → routes to fal.ai or Replicate directly
- **Consistency Methods**: hybrid, i2i_reference, seed_locked — selectable per character/roleplay session

#### **Prompting System** (`supabase/functions/enhance-prompt/`, `get-negative-prompt/`)
- **Status**: ✅ Active
- **Enhancement**: LLM-powered prompt enhancement (Qwen Instruct, OpenRouter, Anthropic)
- **Templates**: Database-driven templates per model type / content mode / generation mode
- **Negative Prompts**: Model-specific negative prompt database, composable with user input
- **Scoring**: Generation quality scoring via `score-generation` function, analytics via `api_usage_logs`
- **Exact Copy Detection**: Skips enhancement entirely for exact copy mode

#### **Roleplay System** (`supabase/functions/roleplay-chat/`)
- **Status**: ✅ Active — production ready
- **Chat Routing**: OpenRouter (primary) or local Qwen worker (when available)
- **Memory Tiers**: conversation-scoped, character-scoped, profile-scoped
- **Scene Generation**: Auto (per-message) or manual; styles: character_only, POV, both_characters
- **Scenario Setup**: 4-step wizard (character selection, scenario type, vibe/intensity, start)
- **Image Consistency**: Hybrid/I2I/seed methods; first scene from character reference, subsequent from previous scene
- **Providers**: OpenRouter (chat), Replicate/fal.ai (scene images), local Qwen/SDXL (when available)

#### **Admin System** (`src/components/admin/`)
- **Status**: ✅ Active
- **14 Tabs**: System Health, System Metrics, Analytics, User Management, Content Moderation, System Config, Prompt Management, Prompt Testing, Prompt Scoring Analytics, API Providers, API Models, API Usage & Costs, Tag Taxonomy, Database Manager
- **Key Capabilities**: Full CRUD on api_models and api_providers, per-user/per-provider cost tracking, prompt template management, content moderation queue, database introspection

### **3.4 Component Architecture**

#### **Mobile-First Design**
All core pages have mobile-optimized variants. Mobile is primary; desktop is additive.

| Feature | Mobile Component | Desktop Component |
|---------|-----------------|-------------------|
| Workspace | `MobileSimplifiedWorkspace` | Same (responsive) |
| Roleplay Dashboard | `MobileRoleplayDashboard` | Same (responsive) |
| Roleplay Chat | `MobileRoleplayChat` | Same (responsive) |
| Prompt Input | `MobileSimplePromptInput` | Same |
| Settings | `MobileSettingsSheet` | Same |
| Quick Bar | `MobileQuickBar` | Same |
| Character Studio | `CharacterStudioV3` (3-column) | Full layout |
| Storyboard Editor | `StoryboardEditor` | Full layout |

#### **Shared Components**
- `SharedGrid` — unified asset grid for workspace and library
- `UnifiedLightbox` — unified image/video preview across all contexts
- `MobileBottomNav` — 4-item bottom navigation (Home, Create, Library, Settings)
- `OurVidzDashboardLayout` — main dashboard layout wrapper

#### **Key Services** (`src/lib/services/`)
- `GenerationService` — job queuing, format routing, request sanitization
- `StoryboardService` — full storyboard/scene/clip/frame CRUD
- `ClipOrchestrationService` — multi-step clip workflows, type routing, chaining
- `FrameExtractionService` — optimal frame extraction from videos
- `StoryAIService` — AI story planning, beat generation, narration
- `UnifiedUrlService` / `UrlSigningService` / `UrlCache` — signed URL management with TTL caching
- `ModelRoutingService` — provider-agnostic model selection with fallback logic
- `AssetService` / `LibraryAssetService` / `WorkspaceAssetService` — asset CRUD per context

#### **Deleted Components (v4.0 → v5.0)**
- `src/pages/SimplifiedWorkspace.tsx` (1,562 lines) — replaced by `MobileSimplifiedWorkspace.tsx`
- `src/components/workspace/SimplePromptInput.tsx` (648 lines) — replaced by `MobileSimplePromptInput.tsx`

---

## **4. Page Development Status**

### **4.1 Production Ready Pages**

#### **Dashboard** (`src/pages/Dashboard.tsx`)
- **Status**: ✅ Production Ready
- **Features**: 7 feature cards (AI Video, Generate Motion, Generate Images, Blank Storyboard, Character Studio, Roleplay, Video Library), recent projects section, mobile bottom navigation
- **Navigation**: Routes to all major features; mobile bottom nav (Home, Create, Library, Settings)

#### **Workspace** (`src/pages/MobileSimplifiedWorkspace.tsx`)
- **Status**: ✅ Production Ready
- **Features**: Dual image/video mode, MobileQuickBar with ref1/ref2 drag-and-drop, MobileSettingsSheet, quality/model selection, exact copy mode, video duration controls, generation progress tracking, SharedGrid asset display, UnifiedLightbox preview
- **Integration**: SDXL worker, WAN worker, fal.ai, Replicate; I2I system; prompting system

#### **Library** (`src/components/library/UpdatedOptimizedLibrary.tsx`)
- **Status**: ✅ Production Ready
- **Features**: Tab filtering (All/Characters/Scenes/Videos), infinite scroll pagination, grid/list toggle, bulk selection and deletion, tag system (role tags + descriptive tags), CompactLibraryFilters, asset metadata, signed URL display, MobileFullScreenViewer
- **Integration**: LibraryAssetService, UrlSigningService, workspace cross-reference

#### **Roleplay Dashboard** (`src/pages/MobileRoleplayDashboard.tsx`)
- **Status**: ✅ Production Ready
- **Features**: Character browsing with infinite scroll, filter/sort sheet (MobileRoleplayFilterSheet), character card preview (MobileCharacterCard), scenario setup wizard (4-step), quick character selection, content filter (sfw/nsfw/all)
- **Integration**: Character system, roleplay-chat edge function

#### **Roleplay Chat** (`src/pages/MobileRoleplayChat.tsx`)
- **Status**: ✅ Production Ready
- **Features**: Full-screen mobile chat, scene image generation (auto/manual), MobileChatInput with quick replies, character info sheet, scene style selection (character_only/pov/both_characters), intensity/pacing controls, message actions (edit/delete/regenerate), memory tier settings, consistency method settings, model selection
- **Integration**: roleplay-chat edge function, scene generation, character anchor/canon system

#### **Playground** (`src/pages/Playground.tsx`)
- **Status**: ✅ Production Ready
- **Features**: Multi-model chat testing, image generation with visual feedback, prompt enhancement tools, system prompt editor, image comparison view, conversation history, reference image slots, admin debug tools
- **Integration**: playground-chat edge function, all image generation providers

#### **Character Studio V3** (`src/pages/CharacterStudioV3.tsx`)
- **Status**: ✅ Production Ready
- **Features**: Three-column workspace (sidebar, 6-layer editor, preview), multi-role support (AI/user/narrator), portrait management, anchor/canon reference management, AI suggestions, pose presets
- **Integration**: character-portrait edge function, fal.ai/Replicate portrait routing, character_anchors/character_canon tables

#### **Character Hub V2** (`src/pages/CharacterHubV2.tsx`)
- **Status**: ✅ Production Ready
- **Features**: Character discovery grid, public/private character browsing, filtering, character preview modal, quick creation entry point
- **Integration**: Character database, CharacterBrowser component

#### **Create Character** (`src/pages/CreateCharacter.tsx`)
- **Status**: ✅ Production Ready
- **Features**: 6-step creation wizard (identity, personality, appearance, voice, role, review), field-level AI suggestions, step validation, character preview
- **Integration**: character-suggestions edge function, character system

#### **Storyboard** (`src/pages/Storyboard.tsx`)
- **Status**: ✅ Production Ready
- **Features**: Project grid/list view, new project dialog (title, description, aspect ratio, content tier, AI assistance level), project filtering by status, search, sort (updated/created/title), AI-assisted project creation with auto scene generation
- **Integration**: StoryboardService, storyboard-ai-assist edge function

#### **Storyboard Editor** (`src/pages/StoryboardEditor.tsx`)
- **Status**: ✅ Production Ready
- **Features**: ClipCanvas (drag-and-drop composition), SceneStrip (horizontal scene nav), ClipDetailPanel (clip editing), ClipLibrary (reference sources), FrameSelector (frame extraction), MotionLibrary (motion presets), ChainIndicator (frame chain progress), AssemblyPreview (final video preview), clip type selection (quick/extended/controlled/long/keyframed), multi-condition reference configuration, AI story planning integration
- **Integration**: ClipOrchestrationService, StoryAIService, FrameExtractionService, fal.ai multi-condition video, scene-narrative edge function

#### **Admin** (`src/pages/Admin.tsx`)
- **Status**: ✅ Production Ready
- **Features**: 14-tab admin interface (see Section 3.3 Admin System)
- **Integration**: All edge functions, all database tables, system metrics collection

### **4.2 In Development Pages**

#### **Profile** (`src/pages/Profile.tsx`)
- **Status**: 🔄 In Development
- **Features**: User profile management, subscription status, preferences

#### **Pricing** (`src/pages/Pricing.tsx`)
- **Status**: 🔄 In Development
- **Features**: Subscription tier display, credit packages, upgrade flow

---

## **5. Development Priorities**

### **5.1 Immediate (Now)**
1. **Local Hosting Migration (Open Item)**: Define worker memory requirements, queue protocol, and HMAC callback authentication for self-hosted local model deployment — this is the primary infrastructure open item
2. **30-Second Video Delivery**: Polish final render assembly and export for storyboard projects; clip chaining infrastructure is complete
3. **Storyboard Video Export**: Complete the assembled project → downloadable video pipeline

### **5.2 Short Term (1–2 months)**
1. **Automated Character Continuity**: Anchor-based character re-injection across storyboard scenes without manual setup
2. **Profile & Pricing Pages**: Complete subscription flow and user account management
3. **Character Consistency Refinements**: Improve hybrid consistency method accuracy across long sequences

### **5.3 Long Term (3–6 months)**
1. **Self-Hosted Inference Optimization**: Performance tuning for local model deployment
2. **Custom Model Fine-Tuning**: User-provided character references for model training
3. **Enterprise Features**: Team accounts, multi-tenant support, API access
4. **Advanced Storyboarding**: Scene transition optimization, automated B-roll generation

---

## **6. Success Metrics**

### **6.1 Technical Metrics**
- **Generation Performance**:
  - SDXL (local): 3–8s
  - Replicate RV5.1: 10–15s
  - fal.ai images: 10–20s
  - WAN video (local): 180–294s depending on format
  - fal.ai video (WAN 2.1): async, webhook callback
  - Chat (OpenRouter): 2–10s
- **System Uptime**: 99%+ with cloud provider fallback
- **API Response Times**: <2s edge functions, <30s generation queue acknowledgement
- **Webhook Security**: 100% HMAC-verified callbacks on local worker path

### **6.2 Business Metrics**
- **User Growth**: 20+ active users (current target), 100+ (Phase 3), 1000+ (Phase 4)
- **Revenue**: $500+ MRR (Phase 3), $10,000+ MRR (Phase 4)
- **User Satisfaction**: >4.0/5.0 rating
- **Content Generation**: 100+ videos monthly (Phase 3)

### **6.3 Quality Metrics**
- **Character Consistency**: 90%+ visual consistency across clips using anchor/I2I methods
- **Storyboard Completion Rate**: % of projects reaching render/completed status
- **Generation Success Rate**: <2% error rate across all providers
- **User Experience**: Mobile-responsive, <3 taps to start generation

---

## **7. Risk Management**

### **7.1 Technical Risks**
- **Local Hosting Migration (Active)**: Architecture for self-hosted worker memory and queuing is an open item; cloud providers mitigate this while it is resolved
- **Worker System Failures**: Mitigated by fal.ai / Replicate as first-class UI alternatives
- **Model Performance**: Optimized through parameter tuning, prompt enhancement, and quality tier selection
- **Storage Costs**: Controlled through staging-first workflow (workspace-temp → user-library)
- **API Rate Limits / Costs**: Managed through usage logging, provider balance monitoring, and intelligent queuing
- **Webhook Security**: HMAC-SHA256 verification prevents unauthorized job injection; ongoing maintenance required as worker auth evolves

### **7.2 Business Risks**
- **Market Competition**: Differentiated through character consistency, storyboard production, and mobile-first UX
- **Regulatory Changes**: NSFW-friendly architecture with privacy focus; content moderation tools in admin
- **User Adoption**: Progressive complexity (single image → full storyboard) reduces barriers
- **Revenue Model**: Pay-per-use with transparent credit system and provider cost visibility
- **Provider Dependency**: Multi-provider architecture (fal.ai, Replicate, OpenRouter) prevents single-vendor lock-in

---

## **8. Documentation Structure**

### **8.1 Organized Structure**
- **00-OVERVIEW**: High-level context and system overview (PRD, architecture)
- **01-PAGES**: Individual page mini-PRDs and implementation status
- **02-COMPONENTS**: Component documentation and inventory
- **03-SYSTEMS**: System-level documentation (I2I, Roleplay, Storyboard, Character)
- **04-WORKERS**: Worker system documentation and local hosting open item
- **05-APIS**: Third-party API documentation (fal.ai, Replicate, OpenRouter)
- **06-DEVELOPMENT**: Development and operational guides
- **07-ARCHIVE**: Superseded approaches — includes original RunPod architecture details

### **8.2 Key Documentation for AI Assistance**
- **Component Inventory**: `02-COMPONENTS/INVENTORY.md` — master tracking
- **System Documentation**: `03-SYSTEMS/` — I2I, Roleplay, Storyboard, Character systems
- **Page Documentation**: `01-PAGES/` — individual page mini-PRDs
- **Worker Documentation**: `04-WORKERS/` — local hosting open item, queue patterns
- **API Documentation**: `05-APIS/` — fal.ai, Replicate, OpenRouter integration details
- **Archive**: `07-ARCHIVE/` — RunPod v4.0 architecture for historical reference

---

**Note**: This PRD reflects the April 2026 state of the platform. The focus has shifted from MVP single-clip video generation to a full production platform with storyboard-based multi-clip video, character studio, and mobile-first roleplay. The primary open item is the local hosting migration (worker memory/queue architecture TBD). Cloud providers (fal.ai, Replicate, OpenRouter) are fully implemented as first-class UI alternatives and will continue to operate regardless of local hosting decisions.

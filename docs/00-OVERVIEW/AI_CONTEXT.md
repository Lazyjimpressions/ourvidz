# AI Context - OurVidz Platform

**Last Updated:** March 2026
**Status:** Current system state for AI assistance

## Platform Overview

OurVidz is an adult content creation platform focused on generating images and videos with character continuity. The platform uses a **triple worker system** (external repo) combined with **third-party APIs** (fal.ai, Replicate, OpenRouter) for comprehensive content generation capabilities.

### Core Mission

- **MVP Goal**: Generate 30-second videos with character continuity
- **Current Status**: Single 5-second videos, multi-reference video mode, roleplay chat
- **Architecture**: Triple worker system + third-party API fallbacks

---

## System Architecture

### Triple Worker System (External Repo: `ourvidz-worker`)

1. **SDXL Worker**: Image generation with I2I capabilities
2. **WAN Worker**: Video generation with Qwen enhancement
3. **Chat Worker**: Roleplay and conversation with Qwen 2.5-7B Instruct

### Third-Party API Integration

1. **fal.ai**: Seedream image models, LTX video models, WAN 2.1 I2V
2. **Replicate API**: Alternative image generation models
3. **OpenRouter API**: Chat model alternatives (Dolphin, etc.)

### Frontend Architecture

- **React + TypeScript**: Modern frontend with shared components
- **Supabase**: Database, authentication, and edge functions
- **Mobile-First**: Unified responsive workspace (`MobileSimplifiedWorkspace.tsx`)
- **Library-First**: workspace_assets → user_library workflow

---

## Page Status & Development

### Production Ready

- **Workspace Page**: Image/video generation with I2I, multi-reference video mode
- **Roleplay Chat**: Character-based conversation system
- **Library Page**: Asset management with save/delete workflow
- **Admin Page**: System configuration and API management

### In Development

- **Character Studio**: Character creation and management
- **Storyboard Page**: Scene management and project organization

### Planned

- **Video Stitching**: Multiple clip continuity
- **30-Second Videos**: Extended video generation

---

## Key Systems

### I2I System (`03-SYSTEMS/I2I_SYSTEM.md`)

- **Status**: Active - SDXL worker + fal.ai Seedream
- **Features**: Modify/copy modes, reference strength controls
- **Usage**: Workspace, Library, Roleplay pages

### Prompting System (`03-SYSTEMS/PROMPTING_SYSTEM.md`)

- **Status**: Active - Pure inference engine architecture
- **Features**: Database-driven templates, SFW/NSFW detection
- **Architecture**: Edge function control, no worker overrides

### Multi-Reference Video System (`03-SYSTEMS/MULTI_REF_SYSTEM_DESIGN.md`)

- **Status**: Active - LTX Video 13B MultiCondition
- **Features**: Character-swap with keyframe anchors, motion reference
- **Usage**: Workspace video mode

### Storage System

- **Status**: Active - Staging-first approach
- **Buckets**: workspace-temp, user-library, system-assets
- **Workflow**: Generate → workspace-temp → user-library (on save)

---

## Component Architecture

### Shared Components

- **SharedGrid**: Unified grid for workspace and library
- **SharedLightbox**: Unified image/video preview
- **MobileSimplePromptInput**: I2I-capable prompt input with reference slots
- **MobileSettingsSheet**: Advanced settings modal

### Key Workspace Components

- **MobileSimplifiedWorkspace**: Primary workspace page (mobile & desktop)
- **MobileQuickBar**: Prompt input, ref slots, mode toggle
- **WorkspaceGrid**: Content grid with realtime updates

---

## Model Routing

### Default Behavior

**Default to cloud models unless health check confirms local availability.**

1. **On load**: Check `system_config.workerHealthCache` for worker health
2. **If healthy**: Offer local models as primary option
3. **If unhealthy/unknown**: Use cloud models (fal.ai/Replicate) as default

### Key Model Types

| Modality | Local (RunPod) | Cloud Provider | Edge Function |
|----------|----------------|----------------|---------------|
| **Chat** | Qwen (`qwen-local`) | OpenRouter | `roleplay-chat` |
| **Images** | SDXL | Replicate, fal.ai | `replicate-image`, `fal-image` |
| **Video** | WAN 2.1 | fal.ai (WAN, LTX) | `fal-image` |

---

## Database Schema

### Core Tables

- **workspace_assets**: Temporary workspace content
- **user_library**: Saved user content
- **jobs**: Generation job tracking
- **api_models**: Available models per provider (multi-task support)
- **api_providers**: Third-party API management
- **characters**: Character definitions for roleplay
- **conversations**: Chat conversations
- **messages**: Chat messages

### Key Patterns

- **Multi-task models**: `api_models.tasks` (text array, not string)
- **Query pattern**: `.contains('tasks', ['i2i'])` not `.eq('task', 'i2i')`

---

## Development Guidelines

### Component Development

- **Check Component Inventory**: Review `02-COMPONENTS/` docs
- **Use Shared Components**: Prefer SharedGrid, SharedLightbox, etc.
- **Mobile-First**: Components have `Mobile*` variants

### Model Integration

- **Worker System**: Reference external repo for detailed implementation
- **Third-Party APIs**: Use as fallbacks or for specific capabilities
- **Prompting**: Use database-driven templates, not hardcoded prompts

### Architecture Principles

- **Simplicity First**: Avoid unnecessary complexity
- **Shared Systems**: Use I2I, Roleplay, and Prompting systems across pages
- **Fallback Strategy**: Always provide fallback options

---

## AI Assistance Focus Areas

### Current Development Tasks

1. **Video Multi-Reference**: Character-swap workflow refinement
2. **Roleplay System**: Character and conversation enhancements
3. **Performance Optimization**: Improve generation times and quality

### Documentation Maintenance

- Follow [DOCUMENTATION_GUIDE.md](./DOCUMENTATION_GUIDE.md) for structure
- Model-specific guides go in `09-REFERENCE/{MODEL}/`
- Cross-cutting systems go in `03-SYSTEMS/`
- Page-specific docs go in `01-PAGES/{PAGE}/`

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [PRD.md](./PRD.md) - Product requirements
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Infrastructure snapshot
- [DOCUMENTATION_GUIDE.md](./DOCUMENTATION_GUIDE.md) - Documentation structure

**Note**: This context is updated as the system evolves. Check the latest documentation for current status and development priorities.

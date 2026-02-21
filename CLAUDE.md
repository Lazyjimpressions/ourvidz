# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OurVidz is an AI-powered adult content generation platform built with React + TypeScript + Tailwind CSS + shadcn/ui frontend and Supabase backend (PostgreSQL + Auth + Storage + Edge Functions). Uses Upstash Redis for job queuing.

## Commands

```bash
# Development
npm run dev              # Start dev server (Vite on port 8080)
npm run build            # Production build
npm run lint             # ESLint
npm run lint:jsdoc       # Lint JSDoc comments

# Testing (roleplay system)
npm run test:roleplay           # All roleplay tests
npm run test:roleplay:character # Character selection tests
npm run test:roleplay:chat      # Chat interaction tests
npm run test:roleplay:prompts   # System prompt tests
npm run test:roleplay:database  # Database state tests

# Database/Schema
npm run sync:schema      # Sync Supabase schema locally
```

## Model Routing Architecture (CRITICAL)

The system supports two model pathways that must ALWAYS have fallback/alternative paths:

### Model Providers

| Modality | Local (RunPod) | Closed (Cloud) | Edge Function |
|----------|----------------|----------------|--------------|
| **Chat** | Qwen (`qwen-local` via `chat_worker`) | OpenRouter (Dolphin, etc.) | `roleplay-chat` |
| **Images** | SDXL (via local worker) | Replicate, fal.ai (Seedream) | `replicate-image`, `fal-image` |
| **Video** | WAN 2.1 + Qwen 7B | fal.ai (WAN 2.1 I2V) | `fal-image` |

### Routing Best Practice

**Default to closed models unless health check confirms local availability.** This ensures reliability:

1. **On load**: Check `system_config.workerHealthCache` for `chatWorker` and `wanWorker` health
2. **If healthy**: Offer local models as primary option (faster, private, cost-effective)
3. **If unhealthy/unknown**: Use closed models (OpenRouter/Replicate) as default
4. **Mid-session failure**: Gracefully degrade to closed models without breaking UX

### Key Files for Model Routing

- `src/hooks/useRoleplayModels.ts` - Chat model loading, combines local + API models
- `src/hooks/useImageModels.ts` - Image/video model loading from `api_models` table
- `src/hooks/useLocalModelHealth.ts` - Polls health from `system_config.workerHealthCache`
- `src/hooks/useLibraryFirstWorkspace.ts` - Model selection persistence with sync guard and UUID detection
- `src/components/roleplay/CharacterEditModal.tsx` - Character portrait generation (routes to fal-image or replicate-image via api_models lookup)
- `supabase/functions/roleplay-chat/index.ts` - Chat routing (OpenRouter or local worker)
- `supabase/functions/replicate-image/index.ts` - Replicate image routing (requires `apiModelId`)
- `supabase/functions/fal-image/index.ts` - fal.ai image/video routing (Seedream, WAN 2.1 I2V)
- `supabase/functions/health-check-workers/index.ts` - Health check edge function
- `supabase/functions/get-active-worker-url/index.ts` - Worker URL resolution with fallbacks

### Character Portrait Routing (Feb 2026)

Character portraits bypass the queue-job/SDXL path and route directly to cloud providers:

1. Query `api_models` table for default image model with `default_for_tasks` containing `generation`
2. Resolve provider from joined `api_providers.name`
3. Route to `fal-image` (provider = 'fal') or `replicate-image` (provider = 'replicate')
4. No Redis queue involved - direct edge function invocation

This ensures character portraits always work regardless of local worker health.

### Known Routing Issues to Address

1. **Incomplete provider support**: `callModelWithConfig()` in `roleplay-chat` only supports `openrouter`, throws for others (fal.ai, Replicate handled by separate edge functions)
2. **Portrait routing**: CharacterEditModal now resolves `apiModelId` from `api_models` table before invoking edge function (resolved Feb 2026)
3. **Model identifiers**: Chat uses `model_key` (string), Images use `id` (UUID) - both stored in `api_models` table
4. **Hard-coded chat worker params**: Temperature, max_tokens configurable via `api_models.input_defaults`
5. **Dead code paths**: `callClaude()`, `callGPT()` declared but unimplemented (use `api_models` table instead)

### When Modifying Model Routing

- All generation functions MUST handle both local and closed model paths
- Always provide fallback when local model unavailable
- Use `api_models` table for model configuration, `api_providers` for provider details
- Health cache keys: `chatWorker`, `wanWorker` in `system_config.config.workerHealthCache`

## Architecture

**Pages** (`src/pages/`): Route components including mobile variants (`MobileRoleplayChat.tsx`, `MobileSimplifiedWorkspace.tsx`)

**Components** (`src/components/`):
- `ui/` - shadcn/ui component library
- `generation/` - Image/video generation UI
- `roleplay/` - Character and chat components
- `library/` - Asset library management

**Services** (`src/lib/services/`): Core business logic as static classes
- `GenerationService` - Job queuing and generation requests
- `AssetService`, `WorkspaceAssetService`, `LibraryAssetService` - Asset CRUD
- `UnifiedUrlService` - URL signing and caching

**Hooks** (`src/hooks/`): 57+ custom hooks following `use[Feature]` convention

**Contexts** (`src/contexts/`): `AuthContext`, `GeneratedMediaContext`, `PlaygroundContext`

**Types** (`src/types/`): Centralized TypeScript definitions

## Critical Guidelines

**Supabase: NO CLI - Online Only**
- All edge functions deployed via Supabase online dashboard
- Use Supabase MCP tools for read-only queries; migrations require manual SQL in dashboard
- Never use `supabase` CLI commands
- **Account**: `lazyjimpressions` Supabase account
- **Project**: `ourvidz` (ID: `ulmdmzhcdwfadbvfpckt`)

**MCP Server Configuration**

MCP servers are configured at the project level in `.mcp.json`:

| Server Name | Purpose |
|-------------|---------|
| `supabase` | **ourvidz project** (ID: `ulmdmzhcdwfadbvfpckt`) - database queries and migrations |

Note: This project uses project-scoped `.mcp.json` for Supabase access with write permissions.

**Test User**: `pokercpa05` (found via email lookup in `auth.users`)

## Patterns

- **Mobile-first**: Components have `Mobile*` variants
- **Console logging**: Emoji prefixes for debugging (🚀, ✅, ❌, 📤)
- **Generation jobs**: 10 types across SDXL, WAN Standard, WAN Enhanced

## Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - For test scripts

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

| Modality | Local (RunPod) | Closed (Cloud) |
|----------|----------------|----------------|
| **Chat** | Qwen (`qwen-local` via `chat_worker`) | OpenRouter (Dolphin, etc.) |
| **Images** | SDXL (via `wan` worker) | Replicate |
| **Video** | WAN 2.1 + Qwen 7B | Replicate (future) |

### Routing Best Practice

**Default to closed models unless health check confirms local availability.** This ensures reliability:

1. **On load**: Check `system_config.workerHealthCache` for `chatWorker` and `wanWorker` health
2. **If healthy**: Offer local models as primary option (faster, private, cost-effective)
3. **If unhealthy/unknown**: Use closed models (OpenRouter/Replicate) as default
4. **Mid-session failure**: Gracefully degrade to closed models without breaking UX

### Key Files for Model Routing

- `src/hooks/useRoleplayModels.ts` - Chat model loading, combines local + API models
- `src/hooks/useImageModels.ts` - Image model loading from `api_models` table
- `src/hooks/useLocalModelHealth.ts` - Polls health from `system_config.workerHealthCache`
- `supabase/functions/roleplay-chat/index.ts` - Chat routing switch (lines 273-319)
- `supabase/functions/replicate-image/index.ts` - Image routing (requires `apiModelId`)
- `supabase/functions/health-check-workers/index.ts` - Health check edge function
- `supabase/functions/get-active-worker-url/index.ts` - Worker URL resolution with fallbacks

### Known Routing Issues to Address

1. **Incomplete provider support**: `callModelWithConfig()` only supports `openrouter`, throws for others
2. **No image fallback**: `replicate-image` requires explicit `apiModelId`, fails hard without it
3. **Inconsistent model identifiers**: Chat uses `model_key` (string), Images use `id` (UUID)
4. **Hard-coded chat worker params**: Temperature, max_tokens not configurable per session
5. **Dead code paths**: `callClaude()`, `callGPT()` declared but unimplemented

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
- Use Supabase MCP tools for database operations and schema changes
- Never use `supabase` CLI commands

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

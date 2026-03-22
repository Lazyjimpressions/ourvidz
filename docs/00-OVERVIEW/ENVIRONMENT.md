# Supabase Environment Overview

**Last Updated:** March 2026
**Project:** OurVidz.com
**Environment:** Production
**Project ID:** ulmdmzhcdwfadbvfpckt

---

## Infrastructure Status

| Category | Item | Value |
|----------|------|-------|
| Database | PostgreSQL Version | 15.x |
| Database | Current Schema | public |
| Tables | Total Tables | 25+ |
| Functions | Total Functions | 20+ |
| Migrations | Total Migrations | 70+ |
| Performance | Indexes Count | 80+ |

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| workspace-temp | false | Temporary workspace items |
| user-library | false | Permanent user content |
| reference_images | false | Reference images for I2I |
| system_assets | true | Platform assets and icons |
| sdxl_image_fast | false | SDXL fast generation images |
| sdxl_image_high | false | SDXL high quality images |
| video_fast | false | Fast generated videos |
| video_high | false | High quality generated videos |

---

## Core Database Tables

### User Management

```yaml
profiles: User profiles and subscription data
user_roles: Role-based access control
user_activity_log: Activity tracking
```

### Content Generation

```yaml
jobs: Job tracking and status management
workspace_assets: Temporary workspace content
user_library: Saved user content (images/videos)
```

### API & Model Configuration

```yaml
api_providers: Third-party API management (fal.ai, Replicate, OpenRouter)
api_models: Available models with multi-task support
  - tasks: text[] (t2i, i2i, i2i_multi, t2v, i2v, extend, etc.)
  - capabilities: JSONB (input_key_mappings, supports_i2i, etc.)
prompt_templates: Database-driven prompting system
negative_prompts: Model-specific negative prompts
```

### Roleplay System

```yaml
characters: Character definitions
character_scenes: Scene configurations
conversations: Chat conversations
messages: Chat messages
```

### Project Management

```yaml
projects: User projects
scenes: Scene management for storyboards
```

### Configuration

```yaml
system_config: Application settings (workerHealthCache, etc.)
model_config_history: Model configuration tracking
```

---

## Edge Functions

### Active Functions

| Function | Purpose | Status |
|----------|---------|--------|
| queue-job | Job submission and routing | Active |
| job-callback | Worker callback processing | Active |
| fal-image | fal.ai image/video generation | Active |
| fal-webhook | Async video callbacks from fal.ai | Active |
| replicate-image | Replicate image generation | Active |
| roleplay-chat | Roleplay chat routing | Active |
| enhance-prompt | Dynamic prompt enhancement | Active |
| health-check-workers | Worker health monitoring | Active |
| get-active-worker-url | Worker URL resolution | Active |

### Model Routing

- **fal-image**: Handles Seedream, LTX Video, WAN 2.1 I2V
- **replicate-image**: Handles Replicate models (requires apiModelId)
- **roleplay-chat**: Routes to OpenRouter or local Qwen worker

---

## Security Configuration

### Row Level Security (RLS)

- **Tables with RLS Enabled**: All user-facing tables
- **Total RLS Policies**: 40+
- **Authentication**: JWT-based with role hierarchy

### User Role System

```sql
app_role: 'admin' | 'moderator' | 'premium_user' | 'basic_user' | 'guest'
```

---

## Job Types

### Image Generation

| Job Type | Provider | Typical Time |
|----------|----------|--------------|
| SDXL (local) | RunPod worker | 3-15 seconds |
| Seedream (fal.ai) | fal.ai | 5-20 seconds |
| Replicate models | Replicate | 10-30 seconds |

### Video Generation

| Job Type | Provider | Typical Time |
|----------|----------|--------------|
| WAN 2.1 (local) | RunPod worker | 60-180 seconds |
| WAN 2.1 I2V (fal.ai) | fal.ai | 60-180 seconds |
| LTX Video 13B | fal.ai | 30-120 seconds |

---

## Environment Variables

### Frontend (.env)

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### Edge Functions (Supabase Dashboard)

```bash
# Supabase
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=redis_url
UPSTASH_REDIS_REST_TOKEN=redis_token

# Worker URLs
CHAT_WORKER_URL=chat_worker_endpoint
WAN_WORKER_URL=wan_worker_endpoint
SDXL_WORKER_URL=sdxl_worker_endpoint

# Third-Party APIs
FAL_KEY=fal_api_key
FAL_WEBHOOK_SECRET=webhook_secret
REPLICATE_API_TOKEN=replicate_token
OPENROUTER_API_KEY=openrouter_key
```

---

## Real-time Configuration

### Enabled Tables

- workspace_assets
- user_library
- jobs
- conversations
- messages

### WebSocket Features

- Live job status updates
- Workspace item creation/updates
- Chat message streaming

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture details
- [AI_CONTEXT.md](./AI_CONTEXT.md) - Quick AI session context
- [DOCUMENTATION_GUIDE.md](./DOCUMENTATION_GUIDE.md) - Documentation structure

---

*This file provides a reference for Supabase infrastructure. For detailed table schemas, query the database directly via MCP tools. For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md).*

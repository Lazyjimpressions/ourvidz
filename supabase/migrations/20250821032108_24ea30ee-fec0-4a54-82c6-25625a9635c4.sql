
-- 1) Providers table for third-party API integrations (Replicate, OpenAI, etc.)
create table if not exists public.api_providers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Unique machine-friendly name, e.g. 'replicate', 'openai', 'wan', 'custom'
  name text not null unique,
  -- Human-friendly label
  display_name text not null,

  -- Optional base URL and docs reference
  base_url text,
  docs_url text,

  -- Auth configuration (we only store the secret variable name, never the secret itself)
  auth_scheme text not null default 'bearer',          -- bearer | api_key_header | query | none
  auth_header_name text default 'Authorization',       -- e.g., 'Authorization' or 'X-API-Key'
  secret_name text,                                    -- e.g., 'REPLICATE_API_TOKEN', 'OPENAI_API_KEY'

  -- Limits and other metadata
  rate_limits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);

-- Keep updated_at fresh
create trigger api_providers_updated_at
before update on public.api_providers
for each row execute function public.handle_updated_at();

alter table public.api_providers enable row level security;

-- Admins can manage providers
create policy "Admins can manage providers"
on public.api_providers
as permissive
for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read active providers (safe: no secrets stored here)
create policy "Active providers readable"
on public.api_providers
as permissive
for select
to authenticated
using (is_active = true);



-- 2) Models table (provider-agnostic)
create table if not exists public.api_models (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,

  provider_id uuid not null references public.api_providers(id) on delete cascade,

  -- Provider-specific identifier (slug/key) and optional version
  model_key text not null,          -- e.g., 'lucataco/realistic-vision-v5.1' or 'gpt-image-1'
  version text,                     -- replicate version hash or provider version string (nullable)

  -- Friendly name and classification
  display_name text not null,       -- e.g., 'RV5.1', 'FLUX Schnell', 'GPT Image 1'
  modality text not null check (modality in ('image','video','chat','prompt','audio','embedding','roleplay')),
  task text not null check (task in ('generation','enhancement','moderation','style_transfer','upscale','roleplay','tts','stt','chat','embedding')),
  model_family text,                -- e.g., 'rv51','sdxl','flux','wan','gpt-image'

  -- For HTTP integrations that need a path relative to provider base_url (optional for SDKs)
  endpoint_path text,

  -- Flexible configuration blobs
  input_defaults jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '{}'::jsonb,     -- e.g., supported sizes, schedulers
  pricing jsonb not null default '{}'::jsonb,          -- e.g., {"per_image": 0.01} or {"per_1k_tokens": 0.02}
  output_format text,

  -- Flags and ordering
  is_active boolean not null default true,
  is_default boolean not null default false,
  priority integer not null default 0
);

-- Ensure uniqueness per provider + model_key + version (handle null version)
create unique index if not exists api_models_provider_key_version_idx
on public.api_models(provider_id, model_key, coalesce(version, ''));

-- Only one default per (modality, task) across all providers
create unique index if not exists api_models_one_default_per_task
on public.api_models(modality, task)
where is_default;

-- Helpful indexes
create index if not exists idx_api_models_active on public.api_models (is_active);
create index if not exists idx_api_models_provider on public.api_models (provider_id);
create index if not exists idx_api_models_modality_task on public.api_models (modality, task);

-- Keep updated_at fresh
create trigger api_models_updated_at
before update on public.api_models
for each row execute function public.handle_updated_at();

alter table public.api_models enable row level security;

-- Admins can manage models
create policy "Admins can manage models"
on public.api_models
as permissive
for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read active models (used to populate dropdowns)
create policy "Active models readable"
on public.api_models
as permissive
for select
to authenticated
using (is_active = true);



-- 3) Link models to jobs (non-breaking addition)
alter table public.jobs
  add column if not exists api_model_id uuid references public.api_models(id);

create index if not exists idx_jobs_api_model_id on public.jobs(api_model_id);

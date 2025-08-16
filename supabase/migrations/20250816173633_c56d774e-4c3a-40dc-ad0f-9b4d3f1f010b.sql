
-- 1) Ensure required buckets exist (idempotent)
insert into storage.buckets (id, name, public)
values 
  ('workspace-temp', 'workspace-temp', false),
  ('user-library',  'user-library',  false)
on conflict (id) do nothing;

-- 2) Storage RLS for owner-scoped access + admin bypass on user-library
-- Note: using split_part(name, '/', 1) to enforce "user_id/..." prefix convention
-- Policies are additive; these grant access to authenticated users and admins

-- SELECT
create policy if not exists "user-library select own v1"
on storage.objects
for select to authenticated
using (
  (bucket_id = 'user-library' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT
create policy if not exists "user-library insert own v1"
on storage.objects
for insert to authenticated
with check (
  (bucket_id = 'user-library' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- UPDATE
create policy if not exists "user-library update own v1"
on storage.objects
for update to authenticated
using (
  (bucket_id = 'user-library' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
)
with check (
  (bucket_id = 'user-library' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- DELETE
create policy if not exists "user-library delete own v1"
on storage.objects
for delete to authenticated
using (
  (bucket_id = 'user-library' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3) Storage RLS for workspace-temp (same owner-scoped model + admin bypass)

-- SELECT
create policy if not exists "workspace-temp select own v1"
on storage.objects
for select to authenticated
using (
  (bucket_id = 'workspace-temp' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT
create policy if not exists "workspace-temp insert own v1"
on storage.objects
for insert to authenticated
with check (
  (bucket_id = 'workspace-temp' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- UPDATE
create policy if not exists "workspace-temp update own v1"
on storage.objects
for update to authenticated
using (
  (bucket_id = 'workspace-temp' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
)
with check (
  (bucket_id = 'workspace-temp' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- DELETE
create policy if not exists "workspace-temp delete own v1"
on storage.objects
for delete to authenticated
using (
  (bucket_id = 'workspace-temp' and split_part(name, '/', 1) = auth.uid()::text)
  or public.has_role(auth.uid(), 'admin'::app_role)
);

-- 4) Remove legacy buckets and their objects (per-model/per-quality)
-- Order: remove objects first, then buckets

-- Helper: delete all objects for a bucket id (repeat per bucket)
delete from storage.objects where bucket_id in (
  'videos',
  'image_fast',
  'image_high',
  'video_fast',
  'video_high',
  'sdxl_image_fast',
  'sdxl_image_high',
  'image7b_fast_enhanced',
  'image7b_high_enhanced',
  'video7b_fast_enhanced',
  'video7b_high_enhanced'
);

-- Delete buckets themselves (ignore if not present)
delete from storage.buckets where id in (
  'videos',
  'image_fast',
  'image_high',
  'video_fast',
  'video_high',
  'sdxl_image_fast',
  'sdxl_image_high',
  'image7b_fast_enhanced',
  'image7b_high_enhanced',
  'video7b_fast_enhanced',
  'video7b_high_enhanced'
);

-- 5) Drop legacy image/video tables (starting clean, no migration)
drop table if exists public.images cascade;
drop table if exists public.videos cascade;

-- 6) Archive workspace_items: remove user access, allow admin SELECT only
-- Drop existing permissive policy if present
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_items'
      and polname = 'Users can manage their own workspace items'
  ) then
    execute 'drop policy "Users can manage their own workspace items" on public.workspace_items';
  end if;
end$$;

-- Ensure RLS enabled (idempotent)
alter table public.workspace_items enable row level security;

-- Admin-only SELECT; no INSERT/UPDATE/DELETE policies declared
create policy if not exists "workspace_items admin select only"
on public.workspace_items
for select
using (public.has_role(auth.uid(), 'admin'::app_role));

-- 7) Remove legacy helper/validation functions tied to old tables
drop function if exists public.get_video_path_stats();
drop function if exists public.validate_video_path_consistency();
drop function if exists public.validate_video_expires_at();
drop function if exists public.validate_images_moderation_status();
drop function if exists public.save_workspace_item_to_library(uuid, uuid);
drop function if exists public.link_workspace_items_to_jobs();
drop function if exists public.clear_workspace_session(uuid, uuid);

-- 8) Update clean_orphaned_jobs to rely on workspace_assets (not images/videos)
create or replace function public.clean_orphaned_jobs()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  deleted_count integer := 0;
begin
  delete from jobs j
  where j.id in (
    select j2.id
    from jobs j2
    left join workspace_assets wa on wa.job_id = j2.id
    where j2.status = 'completed'
      and j2.created_at < now() - interval '24 hours'
      and wa.id is null
      and (j2.job_type like '%image%' or j2.job_type like '%video%')
  );

  get diagnostics deleted_count = row_count;

  insert into user_activity_log (action, metadata, user_id)
  values (
    'system_cleanup_orphaned_jobs',
    jsonb_build_object('deleted_count', deleted_count, 'timestamp', now()),
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  return deleted_count;
end;
$function$;

-- 9) Update get_system_stats to use workspace_assets for counts/storage
create or replace function public.get_system_stats(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  start_date timestamptz;
  result jsonb;
begin
  start_date := now() - interval '1 day' * p_days;

  select jsonb_build_object(
    'total_users', (select count(*) from profiles),
    'active_users', (select count(*) from profiles where created_at > start_date - interval '7 days'),
    'new_users_today', (select count(*) from profiles where created_at > now()::date),
    'new_users_period', (select count(*) from profiles where created_at > start_date),

    'total_jobs', (select count(*) from jobs where created_at > start_date),
    'completed_jobs', (select count(*) from jobs where status = 'completed' and created_at > start_date),
    'failed_jobs', (select count(*) from jobs where status = 'failed' and created_at > start_date),

    'total_images', (
      select count(*) from workspace_assets 
      where asset_type = 'image' and created_at > start_date
    ),
    'total_videos', (
      select count(*) from workspace_assets 
      where asset_type = 'video' and created_at > start_date
    ),

    'storage_used', (
      select coalesce(sum(file_size_bytes), 0) from workspace_assets
      where created_at > start_date
    ),

    'avg_job_time', (
      select avg(extract(epoch from (completed_at - created_at))/60)
      from jobs 
      where completed_at is not null and created_at > start_date
    ),

    'success_rate', (
      select case 
        when count(*) > 0 then 
          (count(case when status = 'completed' then 1 end)::float / count(*) * 100)
        else 0 
      end
      from jobs 
      where created_at > start_date
    ),

    'job_type_breakdown', (
      select coalesce(jsonb_object_agg(job_type, count), '{}'::jsonb)
      from (
        select job_type, count(*) as count
        from jobs 
        where created_at > start_date
        group by job_type
      ) t
    )
  ) into result;

  return result;
end;
$function$;

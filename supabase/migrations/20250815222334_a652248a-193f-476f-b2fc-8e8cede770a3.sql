-- Add unique constraint on workspace_assets to prevent duplicates from dual callbacks
ALTER TABLE public.workspace_assets 
ADD CONSTRAINT workspace_assets_job_id_asset_index_unique 
UNIQUE (job_id, asset_index);
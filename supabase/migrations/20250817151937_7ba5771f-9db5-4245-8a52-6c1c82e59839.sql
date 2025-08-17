-- Enable Realtime for workspace_assets table
ALTER TABLE public.workspace_assets REPLICA IDENTITY FULL;

-- Add workspace_assets to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_assets;
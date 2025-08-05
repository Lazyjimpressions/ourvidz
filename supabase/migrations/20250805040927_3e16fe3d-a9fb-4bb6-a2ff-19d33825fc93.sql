-- Enable real-time updates for workspace_items table
-- This will allow the real-time subscription system to work properly

-- Set replica identity to capture full row data during updates
ALTER TABLE public.workspace_items REPLICA IDENTITY FULL;

-- Add workspace_items to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_items;
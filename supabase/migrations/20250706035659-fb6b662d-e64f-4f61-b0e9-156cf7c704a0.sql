-- Enable realtime for critical tables
ALTER TABLE public.images REPLICA IDENTITY FULL;
ALTER TABLE public.videos REPLICA IDENTITY FULL;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.images;
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
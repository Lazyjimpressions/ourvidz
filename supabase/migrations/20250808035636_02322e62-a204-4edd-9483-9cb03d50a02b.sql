-- Create public avatars bucket (id must be unique)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access to avatars
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;
END $$;

-- Admins can manage avatar objects
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can manage avatar objects'
  ) THEN
    CREATE POLICY "Admins can manage avatar objects"
    ON storage.objects
    FOR ALL
    USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
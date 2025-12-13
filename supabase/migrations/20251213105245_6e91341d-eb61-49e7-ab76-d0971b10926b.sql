-- Create storage bucket for profile images (avatars)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for program images
INSERT INTO storage.buckets (id, name, public)
VALUES ('program-images', 'program-images', true)
ON CONFLICT (id) DO NOTHING;

-- Add image_url column to programs table
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for program-images bucket
CREATE POLICY "Program images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'program-images');

CREATE POLICY "Coaches can upload program images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'program-images' 
  AND (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Coaches can update program images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'program-images' 
  AND (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Coaches can delete program images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'program-images' 
  AND (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'))
);
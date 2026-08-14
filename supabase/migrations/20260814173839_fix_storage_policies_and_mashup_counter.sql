/*
  # Fix Storage Policies and Add mashup_counter

  ## Summary
  Fixes three issues blocking song uploads and public URL access.

  ## Changes

  ### Users table
  - Add `mashup_counter` integer column (default 1) if missing

  ### Storage policies (audio-uploads bucket)
  - **Fix folder index bug**: existing policies checked
    `foldername(name)[1]` which returns `tracks` (the first path segment).
    The upload path is `tracks/{userId}/{trackId}/file`, so the correct
    index for the user ID is `[2]`. All four authenticated policies
    (INSERT, SELECT, UPDATE, DELETE) are dropped and recreated with the
    corrected predicate.
  - **Add anon SELECT policy**: the bucket is marked public, but without
    an anon SELECT policy, public URLs return 400. A new policy allows
    anonymous reads on the `audio-uploads` bucket so `getPublicUrl()`
    works.

  ## Security
  - Authenticated users can only manage files under their own user-ID
    folder prefix
  - Anonymous users can read (but not write/update/delete) any file in
    the public audio-uploads bucket
*/

-- 1. Add mashup_counter to users if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'mashup_counter'
  ) THEN
    ALTER TABLE public.users ADD COLUMN mashup_counter integer DEFAULT 1;
  END IF;
END $$;

-- 2. Fix storage policies — drop old ones, recreate with correct folder index [2]

DROP POLICY IF EXISTS "Users can upload own audio files" ON storage.objects;
CREATE POLICY "Users can upload own audio files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio-uploads' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own audio files" ON storage.objects;
CREATE POLICY "Users can read own audio files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio-uploads' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own audio files" ON storage.objects;
CREATE POLICY "Users can update own audio files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'audio-uploads' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own audio files" ON storage.objects;
CREATE POLICY "Users can delete own audio files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio-uploads' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- 3. Add anon read policy so public URLs work
DROP POLICY IF EXISTS "Public can read audio files" ON storage.objects;
CREATE POLICY "Public can read audio files"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'audio-uploads');

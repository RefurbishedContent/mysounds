/*
  # Audio Uploads Infrastructure

  1. New Tables
    - `uploads`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `filename` (text, storage filename)
      - `original_name` (text, user's original filename)
      - `mime_type` (text, file MIME type)
      - `size` (integer, file size in bytes)
      - `url` (text, public URL)
      - `status` (text, upload/processing status)
      - `analysis` (jsonb, audio analysis data)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Storage
    - Create 'audio-uploads' storage bucket
    - Set up RLS policies for user file uploads
    - Allow users to upload their own audio files
    - Allow users to read their own uploaded files

  3. Security
    - Enable RLS on uploads table
    - Users can only access their own uploads
    - Proper storage bucket policies for audio files
*/

-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size integer NOT NULL,
  url text NOT NULL,
  status text DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  analysis jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at DESC);

-- RLS Policies for uploads table
CREATE POLICY "Users can insert own uploads"
  ON uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own uploads"
  ON uploads
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
  ON uploads
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads"
  ON uploads
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_uploads_updated_at
  BEFORE UPDATE ON uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create the audio-uploads storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-uploads', 'audio-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio-uploads bucket
CREATE POLICY "Users can upload own audio files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own audio files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own audio files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'audio-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own audio files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio-uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
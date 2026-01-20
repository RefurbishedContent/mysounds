/*
  # Create mixdowns table for exported mixes

  1. New Tables
    - `mixdowns`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `user_id` (uuid, foreign key to users) 
      - `url` (text, storage URL)
      - `filename` (text, original filename)
      - `duration` (numeric, mix duration in seconds)
      - `file_size` (integer, file size in bytes)
      - `format` (text, audio format)
      - `status` (text, processing status)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `mixdowns` table
    - Add policy for users to read their own mixdowns
    - Add policy for users to insert their own mixdowns
    - Add policy for users to delete their own mixdowns

  3. Indexes
    - Index on project_id for fast project lookups
    - Index on user_id for user mixdown lists
    - Index on created_at for chronological sorting
*/

CREATE TABLE IF NOT EXISTS mixdowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url text NOT NULL,
  filename text NOT NULL,
  duration numeric NOT NULL DEFAULT 0,
  file_size integer NOT NULL DEFAULT 0,
  format text NOT NULL DEFAULT 'wav',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE mixdowns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own mixdowns"
  ON mixdowns
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mixdowns"
  ON mixdowns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mixdowns"
  ON mixdowns
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mixdowns_project_id ON mixdowns(project_id);
CREATE INDEX IF NOT EXISTS idx_mixdowns_user_id ON mixdowns(user_id);
CREATE INDEX IF NOT EXISTS idx_mixdowns_created_at ON mixdowns(created_at DESC);

-- Updated at trigger
CREATE TRIGGER update_mixdowns_updated_at
  BEFORE UPDATE ON mixdowns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
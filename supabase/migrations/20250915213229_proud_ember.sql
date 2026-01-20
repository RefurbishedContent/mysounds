/*
  # Create projects table

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (text)
      - `description` (text, optional)
      - `thumbnail_url` (text, optional)
      - `duration` (integer, in seconds, default 0)
      - `bpm` (integer, default 120)
      - `status` (text, default 'draft')
      - `template_id` (uuid, optional foreign key to templates)
      - `track1_name` (text, optional)
      - `track1_url` (text, optional)
      - `track2_name` (text, optional)
      - `track2_url` (text, optional)
      - `project_data` (jsonb, for storing project configuration)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `projects` table
    - Add policy for users to manage their own projects
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  thumbnail_url text,
  duration integer DEFAULT 0 CHECK (duration >= 0),
  bpm integer DEFAULT 120 CHECK (bpm > 0 AND bpm <= 300),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'error')),
  template_id uuid REFERENCES templates(id) ON DELETE SET NULL,
  track1_name text,
  track1_url text,
  track2_name text,
  track2_url text,
  project_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can manage their own projects
CREATE POLICY "Users can read own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_template_id ON projects(template_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
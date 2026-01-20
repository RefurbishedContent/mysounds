/*
  # Add render jobs table

  1. New Tables
    - `render_jobs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `project_id` (uuid, foreign key to projects)
      - `status` (enum: queued, processing, completed, failed)
      - `progress` (integer, 0-100)
      - `format` (text: mp3, wav, flac)
      - `quality` (text: draft, standard, high, lossless)
      - `output_url` (text, nullable)
      - `lossless_url` (text, nullable)
      - `error_message` (text, nullable)
      - `processing_logs` (jsonb)
      - `render_config` (jsonb)
      - `started_at` (timestamp, nullable)
      - `completed_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `render_jobs` table
    - Add policies for users to manage their own render jobs
    - Add admin policy for monitoring all jobs

  3. Indexes
    - Index on user_id for fast user queries
    - Index on status for job queue management
    - Index on created_at for chronological ordering
</*/

CREATE TYPE render_status AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE render_format AS ENUM ('mp3', 'wav', 'flac');
CREATE TYPE render_quality AS ENUM ('draft', 'standard', 'high', 'lossless');

CREATE TABLE IF NOT EXISTS render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status render_status DEFAULT 'queued',
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  format render_format DEFAULT 'mp3',
  quality render_quality DEFAULT 'standard',
  output_url text,
  lossless_url text,
  error_message text,
  processing_logs jsonb DEFAULT '[]'::jsonb,
  render_config jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_render_jobs_user_id ON render_jobs(user_id);
CREATE INDEX idx_render_jobs_status ON render_jobs(status);
CREATE INDEX idx_render_jobs_created_at ON render_jobs(created_at DESC);
CREATE INDEX idx_render_jobs_project_id ON render_jobs(project_id);

-- Enable RLS
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own render jobs"
  ON render_jobs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all render jobs"
  ON render_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.plan = 'admin'
    )
  );

-- Update trigger
CREATE TRIGGER update_render_jobs_updated_at
  BEFORE UPDATE ON render_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
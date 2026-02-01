/*
  # Create analysis_jobs table for song analysis tracking

  1. New Tables
    - `analysis_jobs`
      - `id` (uuid, primary key)
      - `upload_id` (uuid, foreign key to uploads)
      - `user_id` (uuid, foreign key to auth.users)
      - `status` (text) - queued, processing, completed, failed
      - `progress` (integer) - 0-100
      - `error_message` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `analysis_jobs` table
    - Add policy for users to read their own analysis jobs
    - Add policy for users to create their own analysis jobs
    - Add policy for users to update their own analysis jobs

  3. Indexes
    - Index on upload_id for faster lookups
    - Index on user_id for faster user queries
    - Index on status for queue management
*/

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  progress integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis jobs"
  ON analysis_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analysis jobs"
  ON analysis_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis jobs"
  ON analysis_jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_upload_id ON analysis_jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);

/*
  # Create Blends Table for Exported Transition Blends

  1. New Tables
    - `blends`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `transition_id` (uuid, foreign key to transitions)
      - `name` (text) - Name of the blend
      - `song_a_id` (uuid, foreign key to uploads) - Reference to original Song A
      - `song_b_id` (uuid, foreign key to uploads) - Reference to original Song B
      - `url` (text) - Storage URL of the exported blend
      - `filename` (text) - Storage filename
      - `duration` (integer) - Total duration in seconds
      - `file_size` (bigint) - File size in bytes
      - `format` (text) - Export format (mp3, wav, flac)
      - `quality` (text) - Export quality setting
      - `sample_rate` (integer) - Audio sample rate
      - `bit_depth` (integer) - Audio bit depth
      - `status` (text) - Processing status
      - `export_settings` (jsonb) - Additional export settings
      - `song_a_duration_contribution` (integer) - How much of Song A is included (seconds)
      - `song_b_duration_contribution` (integer) - How much of Song B is included (seconds)
      - `transition_duration` (integer) - Duration of the transition blend (seconds)
      - `template_name` (text) - Name of the template used
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `blends` table
    - Add policies for authenticated users to manage their own blends
*/

-- Create blends table
CREATE TABLE IF NOT EXISTS blends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transition_id uuid NOT NULL REFERENCES transitions(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Blend',
  song_a_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  song_b_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  url text NOT NULL,
  filename text NOT NULL,
  duration integer NOT NULL DEFAULT 0 CHECK (duration >= 0),
  file_size bigint NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  format text NOT NULL DEFAULT 'wav' CHECK (format IN ('mp3', 'wav', 'flac')),
  quality text NOT NULL DEFAULT 'standard' CHECK (quality IN ('draft', 'standard', 'high', 'lossless')),
  sample_rate integer NOT NULL DEFAULT 44100 CHECK (sample_rate > 0),
  bit_depth integer NOT NULL DEFAULT 16 CHECK (bit_depth IN (16, 24)),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  export_settings jsonb DEFAULT '{}'::jsonb,
  song_a_duration_contribution integer NOT NULL DEFAULT 0 CHECK (song_a_duration_contribution >= 0),
  song_b_duration_contribution integer NOT NULL DEFAULT 0 CHECK (song_b_duration_contribution >= 0),
  transition_duration integer NOT NULL DEFAULT 12 CHECK (transition_duration >= 4 AND transition_duration <= 25),
  template_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE blends ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own blends
CREATE POLICY "Users can view own blends"
  ON blends
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own blends
CREATE POLICY "Users can create own blends"
  ON blends
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own blends
CREATE POLICY "Users can update own blends"
  ON blends
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own blends
CREATE POLICY "Users can delete own blends"
  ON blends
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blends_user_id ON blends(user_id);
CREATE INDEX IF NOT EXISTS idx_blends_transition_id ON blends(transition_id);
CREATE INDEX IF NOT EXISTS idx_blends_created_at ON blends(created_at DESC);

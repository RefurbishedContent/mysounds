/*
  # Create Mixer Tables for DJ Playlist Feature

  1. New Tables
    - `mix_sessions`
      - Stores DJ mix projects created by users
      - Contains mix metadata, settings, and render status
      - Links to user who created the mix
    
    - `mix_tracks`
      - Junction table linking blends to mix sessions
      - Defines the order and position of blends in the playlist
      - Stores per-track crossfade and volume settings
    
    - `mix_renders`
      - Tracks rendering jobs for mix exports
      - Stores progress, status, and output file information
  
  2. Security
    - Enable RLS on all tables
    - Users can only access their own mix sessions and related data
    - Policies for select, insert, update, and delete operations

  3. Important Notes
    - Mix sessions can be in draft, rendering, completed, or failed status
    - Tracks are ordered by position field for playlist sequencing
    - Crossfade settings are configurable per transition between tracks
    - Volume normalization and master gain applied during rendering
*/

-- Create mix_sessions table
CREATE TABLE IF NOT EXISTS mix_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Mix',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'completed', 'failed')),
  rendered_url text,
  duration integer DEFAULT 0,
  file_size bigint DEFAULT 0,
  auto_crossfade_duration integer DEFAULT 8 CHECK (auto_crossfade_duration >= 4 AND auto_crossfade_duration <= 16),
  normalize_volume boolean DEFAULT true,
  master_gain numeric DEFAULT 0 CHECK (master_gain >= -12 AND master_gain <= 12),
  total_blends_count integer DEFAULT 0,
  total_duration integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mix_tracks table
CREATE TABLE IF NOT EXISTS mix_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_session_id uuid REFERENCES mix_sessions(id) ON DELETE CASCADE NOT NULL,
  blend_id uuid REFERENCES blends(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL,
  start_time numeric DEFAULT 0,
  crossfade_type text DEFAULT 'beat-matched' CHECK (crossfade_type IN ('beat-matched', 'smooth', 'quick')),
  crossfade_duration_override integer CHECK (crossfade_duration_override IS NULL OR (crossfade_duration_override >= 4 AND crossfade_duration_override <= 16)),
  pre_gain numeric DEFAULT 0 CHECK (pre_gain >= -12 AND pre_gain <= 12),
  post_gain numeric DEFAULT 0 CHECK (post_gain >= -12 AND post_gain <= 12),
  fade_in numeric DEFAULT 0 CHECK (fade_in >= 0 AND fade_in <= 10),
  fade_out numeric DEFAULT 0 CHECK (fade_out >= 0 AND fade_out <= 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(mix_session_id, position)
);

-- Create mix_renders table
CREATE TABLE IF NOT EXISTS mix_renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_session_id uuid REFERENCES mix_sessions(id) ON DELETE CASCADE NOT NULL,
  render_job_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_stage text DEFAULT 'initializing',
  format text DEFAULT 'wav' CHECK (format IN ('mp3', 'wav', 'flac')),
  quality text DEFAULT 'standard' CHECK (quality IN ('draft', 'standard', 'high', 'lossless')),
  file_size bigint DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mix_sessions_user_id ON mix_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mix_sessions_status ON mix_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mix_tracks_mix_session_id ON mix_tracks(mix_session_id);
CREATE INDEX IF NOT EXISTS idx_mix_tracks_blend_id ON mix_tracks(blend_id);
CREATE INDEX IF NOT EXISTS idx_mix_tracks_position ON mix_tracks(mix_session_id, position);
CREATE INDEX IF NOT EXISTS idx_mix_renders_mix_session_id ON mix_renders(mix_session_id);

-- Enable Row Level Security
ALTER TABLE mix_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mix_renders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mix_sessions
CREATE POLICY "Users can view own mix sessions"
  ON mix_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mix sessions"
  ON mix_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mix sessions"
  ON mix_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mix sessions"
  ON mix_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for mix_tracks
CREATE POLICY "Users can view tracks in their mix sessions"
  ON mix_tracks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add tracks to their mix sessions"
  ON mix_tracks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tracks in their mix sessions"
  ON mix_tracks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tracks from their mix sessions"
  ON mix_tracks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for mix_renders
CREATE POLICY "Users can view renders for their mix sessions"
  ON mix_renders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create renders for their mix sessions"
  ON mix_renders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update renders for their mix sessions"
  ON mix_renders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete renders for their mix sessions"
  ON mix_renders FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = auth.uid()
    )
  );
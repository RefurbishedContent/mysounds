/*
  # Reset Data and Create Tracks Infrastructure

  ## Summary
  This migration performs a full data reset and establishes the new tracks-based
  infrastructure to replace the uploads table as the canonical audio record.

  ## Changes

  ### Data Reset
  - Truncates all user-generated data tables to start completely fresh
  - Preserves table structures, indexes, and RLS policies

  ### New Tables

  1. `tracks`
     - Canonical audio file record replacing the uploads table
     - First-class columns: title, artist, duration_ms, sample_rate, bit_depth, channels
     - Structured storage_path column separate from public url
     - Status enum: pending, uploading, processing, ready, failed
     - Full analysis JSONB for BPM, key, genre, and all derived audio features

  2. `stem_separation_jobs`
     - Tracks async Replicate.com stem separation requests
     - Stores replicate_prediction_id for webhook matching
     - stem_level (1, 2, 3) for plan-based gating
     - Individual URLs for vocals, drums, bass, other stems
     - Progress tracking with error capture

  3. `dead_letter_jobs`
     - Captures jobs that exhaust all retries
     - Preserves original payload as JSONB for debugging and replay
     - Tracks job type and retry count at time of failure

  ### Security
  - RLS enabled on all three new tables
  - Users can only access their own tracks and jobs
  - Admin-level access via service role (bypasses RLS)

  ### Important Notes
  1. The uploads table is preserved but no longer used for new uploads
  2. The transitions and blends tables now reference tracks.id via song_a_id / song_b_id
  3. All existing foreign key constraints on those columns are dropped and recreated
*/

-- ============================================================
-- STEP 1: CLEAR ALL EXISTING USER-GENERATED DATA
-- ============================================================

TRUNCATE TABLE
  mix_tracks,
  mix_renders,
  mix_sessions,
  blends,
  blend_folders,
  blend_bins,
  transitions,
  analysis_jobs,
  render_jobs,
  uploads
RESTART IDENTITY CASCADE;

-- ============================================================
-- STEP 2: CREATE TRACKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Metadata extracted from ID3 tags or entered manually
  title text NOT NULL DEFAULT '',
  artist text NOT NULL DEFAULT '',
  album text NOT NULL DEFAULT '',

  -- Original file info
  original_name text NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL DEFAULT '',
  mime_type text NOT NULL,
  size bigint NOT NULL,
  url text NOT NULL,

  -- Processing status
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploading', 'processing', 'ready', 'failed')),

  -- First-class audio properties (queryable, not buried in JSONB)
  duration_ms integer DEFAULT 0,
  sample_rate integer DEFAULT 44100,
  bit_depth integer DEFAULT 16,
  channels integer DEFAULT 2,

  -- Full analysis result from analyze-audio edge function
  analysis jsonb DEFAULT '{}',

  -- Genre fields (promoted from analysis for filtering)
  manual_genre text,
  genre_confidence numeric CHECK (genre_confidence >= 0 AND genre_confidence <= 1),

  -- General metadata (album art URL, year, comments, etc.)
  metadata jsonb DEFAULT '{}',

  last_analyzed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS tracks_user_id_idx ON tracks(user_id);
CREATE INDEX IF NOT EXISTS tracks_status_idx ON tracks(status);
CREATE INDEX IF NOT EXISTS tracks_created_at_idx ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS tracks_user_status_idx ON tracks(user_id, status);

-- RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tracks"
  ON tracks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracks"
  ON tracks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracks"
  ON tracks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracks"
  ON tracks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 3: CREATE STEM SEPARATION JOBS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS stem_separation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Replicate.com prediction tracking
  replicate_prediction_id text,

  -- Job state
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  stem_level integer NOT NULL DEFAULT 1 CHECK (stem_level IN (1, 2, 3)),

  -- Output stem URLs (populated when job completes)
  vocals_url text,
  drums_url text,
  bass_url text,
  other_url text,

  -- Error tracking
  error_message text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stem_jobs_track_id_idx ON stem_separation_jobs(track_id);
CREATE INDEX IF NOT EXISTS stem_jobs_user_id_idx ON stem_separation_jobs(user_id);
CREATE INDEX IF NOT EXISTS stem_jobs_status_idx ON stem_separation_jobs(status);
CREATE INDEX IF NOT EXISTS stem_jobs_replicate_id_idx ON stem_separation_jobs(replicate_prediction_id);

ALTER TABLE stem_separation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stem jobs"
  ON stem_separation_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stem jobs"
  ON stem_separation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stem jobs"
  ON stem_separation_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stem jobs"
  ON stem_separation_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 4: CREATE DEAD LETTER JOBS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id text NOT NULL,
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  error_message text NOT NULL DEFAULT '',
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dead_letter_job_type_idx ON dead_letter_jobs(job_type);
CREATE INDEX IF NOT EXISTS dead_letter_created_at_idx ON dead_letter_jobs(created_at DESC);

ALTER TABLE dead_letter_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dead letter jobs"
  ON dead_letter_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.plan = 'admin'
    )
  );

-- ============================================================
-- STEP 5: UPDATE TRANSITIONS FOREIGN KEYS TO REFERENCE TRACKS
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transitions_song_a_id_fkey'
    AND table_name = 'transitions'
  ) THEN
    ALTER TABLE transitions DROP CONSTRAINT transitions_song_a_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transitions_song_b_id_fkey'
    AND table_name = 'transitions'
  ) THEN
    ALTER TABLE transitions DROP CONSTRAINT transitions_song_b_id_fkey;
  END IF;
END $$;

ALTER TABLE transitions
  ADD CONSTRAINT transitions_song_a_id_fkey
    FOREIGN KEY (song_a_id) REFERENCES tracks(id) ON DELETE CASCADE,
  ADD CONSTRAINT transitions_song_b_id_fkey
    FOREIGN KEY (song_b_id) REFERENCES tracks(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 6: UPDATE BLENDS FOREIGN KEYS TO REFERENCE TRACKS
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'blends_song_a_id_fkey'
    AND table_name = 'blends'
  ) THEN
    ALTER TABLE blends DROP CONSTRAINT blends_song_a_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'blends_song_b_id_fkey'
    AND table_name = 'blends'
  ) THEN
    ALTER TABLE blends DROP CONSTRAINT blends_song_b_id_fkey;
  END IF;
END $$;

ALTER TABLE blends
  ADD CONSTRAINT blends_song_a_id_fkey
    FOREIGN KEY (song_a_id) REFERENCES tracks(id) ON DELETE CASCADE,
  ADD CONSTRAINT blends_song_b_id_fkey
    FOREIGN KEY (song_b_id) REFERENCES tracks(id) ON DELETE CASCADE;

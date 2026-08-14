/*
  # Fix Missing Infrastructure

  ## Summary
  Applies all missing schema that the app code requires but was never applied
  to this Supabase instance.

  ## Changes

  ### Users table
  - Add `mashup_counter` integer column (default 1)

  ### Storage
  - Create `audio-uploads` bucket (public)
  - Add RLS policies for authenticated users to manage files in their own
    folder path (`tracks/{userId}/...`)

  ### New Tables
  1. `tracks` — canonical audio file record
     - title, artist, album, original_name, filename, storage_path,
       mime_type, size, url, status, duration_ms, sample_rate, bit_depth,
       channels, analysis (jsonb), manual_genre, genre_confidence, metadata
  2. `transitions` — song-pair transition records
     - name, song_a_id, song_b_id, template_id (nullable),
       transition_start_point, transition_duration, song_a_end_time,
       song_b_start_time, song_a_marker_point, song_b_marker_point,
       song_a_clip_start, song_b_clip_end, status, render_job_id,
       output_url, metadata, rendered_at, render_duration_seconds,
       output_file_size, render_error_message, render_attempts
     - All time columns are numeric(10,4) for fractional-second precision
  3. `blends` — exported blend audio records
  4. `blend_folders` — hierarchical folder organization for blends
  5. `blend_bins` — sub-categorization within folders
  6. `blend_tags` — user-created tags for blends
  7. `blend_tag_assignments` — junction table linking blends to tags
  8. `stem_separation_jobs` — async stem separation tracking
  9. `dead_letter_jobs` — failed job capture for debugging

  ### Security
  - RLS enabled on all new tables
  - Owner-scoped CRUD policies on all user-facing tables
  - Storage policies scoped to `tracks/{userId}/` path prefix
*/

-- ============================================================
-- 1. ADD mashup_counter TO users
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'mashup_counter'
  ) THEN
    ALTER TABLE users ADD COLUMN mashup_counter integer DEFAULT 1;
  END IF;
END $$;

-- ============================================================
-- 2. CREATE audio-uploads STORAGE BUCKET + POLICIES
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-uploads', 'audio-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage path is: tracks/{userId}/{trackId}/original.ext
-- foldername(name) returns an array of folder segments:
--   [1] = 'tracks', [2] = userId, [3] = trackId
-- So we check (storage.foldername(name))[2] = auth.uid()::text

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

DROP POLICY IF EXISTS "Public can read audio files" ON storage.objects;
CREATE POLICY "Public can read audio files"
  ON storage.objects FOR SELECT
  TO anon
  USING (
    bucket_id = 'audio-uploads'
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

-- ============================================================
-- 3. CREATE tracks TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  artist text NOT NULL DEFAULT '',
  album text NOT NULL DEFAULT '',
  original_name text NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL DEFAULT '',
  mime_type text NOT NULL,
  size bigint NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'uploading', 'processing', 'ready', 'failed')),
  duration_ms integer DEFAULT 0,
  sample_rate integer DEFAULT 44100,
  bit_depth integer DEFAULT 16,
  channels integer DEFAULT 2,
  analysis jsonb DEFAULT '{}',
  manual_genre text,
  genre_confidence numeric CHECK (genre_confidence >= 0 AND genre_confidence <= 1),
  metadata jsonb DEFAULT '{}',
  last_analyzed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tracks_user_id_idx ON tracks(user_id);
CREATE INDEX IF NOT EXISTS tracks_status_idx ON tracks(status);
CREATE INDEX IF NOT EXISTS tracks_created_at_idx ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS tracks_user_status_idx ON tracks(user_id, status);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tracks" ON tracks;
CREATE POLICY "Users can view own tracks"
  ON tracks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tracks" ON tracks;
CREATE POLICY "Users can insert own tracks"
  ON tracks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tracks" ON tracks;
CREATE POLICY "Users can update own tracks"
  ON tracks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tracks" ON tracks;
CREATE POLICY "Users can delete own tracks"
  ON tracks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. CREATE transitions TABLE (with all later amendments baked in)
-- ============================================================
CREATE TABLE IF NOT EXISTS transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Transition',
  song_a_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  song_b_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  template_id uuid REFERENCES templates(id) ON DELETE RESTRICT,
  transition_start_point numeric(10,4) NOT NULL DEFAULT 30 CHECK (transition_start_point >= 0),
  transition_duration numeric(10,4) NOT NULL DEFAULT 10 CHECK (transition_duration > 0 AND transition_duration <= 60),
  song_a_end_time numeric(10,4) NOT NULL DEFAULT 30 CHECK (song_a_end_time >= 0),
  song_b_start_time numeric(10,4) NOT NULL DEFAULT 0 CHECK (song_b_start_time >= 0),
  song_a_marker_point numeric(10,4) DEFAULT 30 CHECK (song_a_marker_point >= 0),
  song_b_marker_point numeric(10,4) DEFAULT 0 CHECK (song_b_marker_point >= 0),
  song_a_clip_start numeric(10,4) DEFAULT 18 CHECK (song_a_clip_start >= 0),
  song_b_clip_end numeric(10,4) DEFAULT 30 CHECK (song_b_clip_end >= 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'processing', 'rendering', 'completed', 'error')),
  render_job_id uuid,
  output_url text,
  metadata jsonb DEFAULT '{}',
  rendered_at timestamptz,
  render_duration_seconds numeric,
  output_file_size bigint,
  render_error_message text,
  render_attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transitions_user_id ON transitions(user_id);
CREATE INDEX IF NOT EXISTS idx_transitions_song_a_id ON transitions(song_a_id);
CREATE INDEX IF NOT EXISTS idx_transitions_song_b_id ON transitions(song_b_id);
CREATE INDEX IF NOT EXISTS idx_transitions_status ON transitions(status);
CREATE INDEX IF NOT EXISTS idx_transitions_created_at ON transitions(created_at DESC);

ALTER TABLE transitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transitions" ON transitions;
CREATE POLICY "Users can read own transitions"
  ON transitions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transitions" ON transitions;
CREATE POLICY "Users can insert own transitions"
  ON transitions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transitions" ON transitions;
CREATE POLICY "Users can update own transitions"
  ON transitions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transitions" ON transitions;
CREATE POLICY "Users can delete own transitions"
  ON transitions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. CREATE blends TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS blends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transition_id uuid NOT NULL REFERENCES transitions(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Blend',
  song_a_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  song_b_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
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
  transition_duration integer NOT NULL DEFAULT 10 CHECK (transition_duration >= 4 AND transition_duration <= 25),
  template_name text,
  folder_id uuid,
  bin_id uuid,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blends_user_id ON blends(user_id);
CREATE INDEX IF NOT EXISTS idx_blends_transition_id ON blends(transition_id);
CREATE INDEX IF NOT EXISTS idx_blends_created_at ON blends(created_at DESC);

ALTER TABLE blends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blends" ON blends;
CREATE POLICY "Users can view own blends"
  ON blends FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own blends" ON blends;
CREATE POLICY "Users can create own blends"
  ON blends FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own blends" ON blends;
CREATE POLICY "Users can update own blends"
  ON blends FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own blends" ON blends;
CREATE POLICY "Users can delete own blends"
  ON blends FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. BLEND ORGANIZATION TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS blend_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES blend_folders(id) ON DELETE CASCADE,
  color text DEFAULT '#3b82f6',
  icon text DEFAULT 'folder',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT folder_name_not_empty CHECK (length(trim(name)) > 0)
);

ALTER TABLE blend_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own folders" ON blend_folders;
CREATE POLICY "Users can view own folders"
  ON blend_folders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own folders" ON blend_folders;
CREATE POLICY "Users can create own folders"
  ON blend_folders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own folders" ON blend_folders;
CREATE POLICY "Users can update own folders"
  ON blend_folders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own folders" ON blend_folders;
CREATE POLICY "Users can delete own folders"
  ON blend_folders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS blend_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES blend_folders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#06b6d4',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bin_name_not_empty CHECK (length(trim(name)) > 0)
);

ALTER TABLE blend_bins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bins" ON blend_bins;
CREATE POLICY "Users can view own bins"
  ON blend_bins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own bins" ON blend_bins;
CREATE POLICY "Users can create own bins"
  ON blend_bins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bins" ON blend_bins;
CREATE POLICY "Users can update own bins"
  ON blend_bins FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bins" ON blend_bins;
CREATE POLICY "Users can delete own bins"
  ON blend_bins FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS blend_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#8b5cf6',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tag_name_not_empty CHECK (length(trim(name)) > 0)
);

ALTER TABLE blend_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tags" ON blend_tags;
CREATE POLICY "Users can view own tags"
  ON blend_tags FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own tags" ON blend_tags;
CREATE POLICY "Users can create own tags"
  ON blend_tags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tags" ON blend_tags;
CREATE POLICY "Users can update own tags"
  ON blend_tags FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tags" ON blend_tags;
CREATE POLICY "Users can delete own tags"
  ON blend_tags FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS blend_tag_assignments (
  blend_id uuid REFERENCES blends(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES blend_tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (blend_id, tag_id)
);

ALTER TABLE blend_tag_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tag assignments" ON blend_tag_assignments;
CREATE POLICY "Users can view own tag assignments"
  ON blend_tag_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM blends WHERE blends.id = blend_id AND blends.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own tag assignments" ON blend_tag_assignments;
CREATE POLICY "Users can create own tag assignments"
  ON blend_tag_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM blends WHERE blends.id = blend_id AND blends.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own tag assignments" ON blend_tag_assignments;
CREATE POLICY "Users can delete own tag assignments"
  ON blend_tag_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM blends WHERE blends.id = blend_id AND blends.user_id = auth.uid())
  );

-- Add FK from blends to blend_folders and blend_bins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'blends_folder_id_fkey' AND table_name = 'blends'
  ) THEN
    ALTER TABLE blends
      ADD CONSTRAINT blends_folder_id_fkey
        FOREIGN KEY (folder_id) REFERENCES blend_folders(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'blends_bin_id_fkey' AND table_name = 'blends'
  ) THEN
    ALTER TABLE blends
      ADD CONSTRAINT blends_bin_id_fkey
        FOREIGN KEY (bin_id) REFERENCES blend_bins(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 7. STEM SEPARATION JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS stem_separation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  replicate_prediction_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  stem_level integer NOT NULL DEFAULT 1 CHECK (stem_level IN (1, 2, 3)),
  vocals_url text,
  drums_url text,
  bass_url text,
  other_url text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stem_jobs_track_id_idx ON stem_separation_jobs(track_id);
CREATE INDEX IF NOT EXISTS stem_jobs_user_id_idx ON stem_separation_jobs(user_id);
CREATE INDEX IF NOT EXISTS stem_jobs_status_idx ON stem_separation_jobs(status);

ALTER TABLE stem_separation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stem jobs" ON stem_separation_jobs;
CREATE POLICY "Users can view own stem jobs"
  ON stem_separation_jobs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stem jobs" ON stem_separation_jobs;
CREATE POLICY "Users can insert own stem jobs"
  ON stem_separation_jobs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stem jobs" ON stem_separation_jobs;
CREATE POLICY "Users can update own stem jobs"
  ON stem_separation_jobs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stem jobs" ON stem_separation_jobs;
CREATE POLICY "Users can delete own stem jobs"
  ON stem_separation_jobs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 8. DEAD LETTER JOBS
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

ALTER TABLE dead_letter_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view dead letter jobs" ON dead_letter_jobs;
CREATE POLICY "Admins can view dead letter jobs"
  ON dead_letter_jobs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.plan = 'admin'
    )
  );

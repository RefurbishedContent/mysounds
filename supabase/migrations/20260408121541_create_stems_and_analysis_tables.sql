/*
  # Create Stems and Stem Analysis Infrastructure

  ## Summary
  Creates the foundational stem data model. After Replicate separates audio
  into individual stems, each stem file is registered in the `stems` table.
  Audio feature analysis results (BPM, key, energy, spectral data) are stored
  per-stem in `stem_analysis`.

  ## New Tables

  1. `stems`
     - One row per separated stem file (vocals, drums, bass, melody, other)
     - References `tracks.id` as canonical parent record
     - Stores the storage_path for cleanup by `deleteTrackAndAllAssets()`
     - `separation_level` (1/2/3) matches the tier used during separation
     - `stem_type` identifies the broad category, `sub_type` the fine-grained label

  2. `stem_analysis`
     - One row per analyzed stem
     - References both `stems.id` and `tracks.id` for efficient joins
     - Lightweight fields (bpm, key, energy_level, rms_volume, harmonic_content)
       are first-class columns for filtering
     - Heavy results (frequency_range, onset_pattern, mix_points, ai_tags)
       are stored as JSONB
     - `mixability_score` (0-1) is the pre-computed quality metric for the matcher
     - `analyzed_at` is null until analysis completes; use as readiness check

  ## Security
  - RLS enabled on both tables
  - Users can only access stems/analysis belonging to their own tracks
  - All four CRUD policies follow the existing pattern from `tracks` table

  ## Important Notes
  1. `stems.storage_path` MUST follow `tracks/{user_id}/{track_id}/stems/` so
     `deleteTrackAndAllAssets()` catches it in its recursive delete
  2. Analysis for a stem begins as a separate async job after separation completes
  3. `stem_analysis.onset_pattern` stores an array of millisecond timestamps
  4. `stem_analysis.mix_points` stores detected phrase boundaries as JSONB array
*/

-- ============================================================
-- TABLE: stems
-- ============================================================

CREATE TABLE IF NOT EXISTS stems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  stem_type text NOT NULL
    CHECK (stem_type IN ('drums', 'bass', 'vocals', 'melody', 'other')),
  sub_type text NOT NULL DEFAULT '',

  separation_level integer NOT NULL DEFAULT 1
    CHECK (separation_level IN (1, 2, 3)),

  -- Must be under tracks/{user_id}/{track_id}/ for cleanup to work
  storage_path text NOT NULL DEFAULT '',
  file_format text NOT NULL DEFAULT 'mp3',
  duration_ms integer DEFAULT 0,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stems_track_id_idx ON stems(track_id);
CREATE INDEX IF NOT EXISTS stems_user_id_idx ON stems(user_id);
CREATE INDEX IF NOT EXISTS stems_stem_type_idx ON stems(stem_type);

ALTER TABLE stems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stems"
  ON stems FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stems"
  ON stems FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stems"
  ON stems FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stems"
  ON stems FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: stem_analysis
-- ============================================================

CREATE TABLE IF NOT EXISTS stem_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stem_id uuid NOT NULL REFERENCES stems(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Lightweight queryable columns
  bpm numeric(6, 2),
  key text DEFAULT '',
  energy_level numeric(4, 3) CHECK (energy_level >= 0 AND energy_level <= 1),
  rms_volume numeric(8, 6),
  harmonic_content boolean DEFAULT false,
  mixability_score numeric(4, 3) CHECK (mixability_score >= 0 AND mixability_score <= 1),

  -- Spectral analysis
  spectral_centroid numeric,
  transient_density numeric,

  -- Heavy results stored as JSONB
  frequency_range jsonb DEFAULT '{"low": 20, "high": 20000}',
  onset_pattern jsonb DEFAULT '[]',
  mix_points jsonb DEFAULT '[]',
  ai_tags jsonb DEFAULT '[]',

  -- Status tracking for hybrid client/server analysis
  analysis_status text NOT NULL DEFAULT 'pending'
    CHECK (analysis_status IN ('pending', 'partial', 'complete', 'failed')),

  analyzed_at timestamptz
);

CREATE INDEX IF NOT EXISTS stem_analysis_stem_id_idx ON stem_analysis(stem_id);
CREATE INDEX IF NOT EXISTS stem_analysis_track_id_idx ON stem_analysis(track_id);
CREATE INDEX IF NOT EXISTS stem_analysis_user_id_idx ON stem_analysis(user_id);
CREATE INDEX IF NOT EXISTS stem_analysis_status_idx ON stem_analysis(analysis_status);
CREATE INDEX IF NOT EXISTS stem_analysis_key_idx ON stem_analysis(key);
CREATE INDEX IF NOT EXISTS stem_analysis_bpm_idx ON stem_analysis(bpm);

ALTER TABLE stem_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stem analysis"
  ON stem_analysis FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stem analysis"
  ON stem_analysis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stem analysis"
  ON stem_analysis FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stem analysis"
  ON stem_analysis FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

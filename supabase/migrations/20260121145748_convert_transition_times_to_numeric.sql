/*
  # Convert Transition Time Columns to Numeric

  1. Changes
    - Convert `transition_start_point` from integer to numeric for decimal precision
    - Convert `transition_duration` from integer to numeric for decimal precision
    - Convert `song_a_end_time` from integer to numeric for decimal precision
    - Convert `song_b_start_time` from integer to numeric for decimal precision
    - Convert `song_a_marker_point` from integer to numeric for decimal precision
    - Convert `song_b_marker_point` from integer to numeric for decimal precision
    - Convert `song_a_clip_start` from integer to numeric for decimal precision
    - Convert `song_b_clip_end` from integer to numeric for decimal precision

  2. Purpose
    - Allow precise audio positioning with fractional seconds
    - Support accurate marker placement in audio files
    - Enable smooth scrubbing and playback at exact positions

  3. Important Notes
    - Using numeric(10,4) for up to 4 decimal places of precision
    - Existing integer values will be automatically cast to numeric
    - Constraints are recreated to work with numeric values
*/

-- Drop existing check constraints
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_transition_start_point_check;
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_transition_duration_check;
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_song_a_end_time_check;
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_song_b_start_time_check;
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_song_a_marker_point_check;
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_song_b_marker_point_check;
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_song_a_clip_start_check;
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_song_b_clip_end_check;

-- Convert columns to numeric(10,4) - supports up to 999999.9999 seconds (~277 hours)
ALTER TABLE transitions
  ALTER COLUMN transition_start_point TYPE numeric(10,4) USING transition_start_point::numeric(10,4);

ALTER TABLE transitions
  ALTER COLUMN transition_duration TYPE numeric(10,4) USING transition_duration::numeric(10,4);

ALTER TABLE transitions
  ALTER COLUMN song_a_end_time TYPE numeric(10,4) USING song_a_end_time::numeric(10,4);

ALTER TABLE transitions
  ALTER COLUMN song_b_start_time TYPE numeric(10,4) USING song_b_start_time::numeric(10,4);

-- Convert marker point columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_a_marker_point'
  ) THEN
    ALTER TABLE transitions
      ALTER COLUMN song_a_marker_point TYPE numeric(10,4) USING song_a_marker_point::numeric(10,4);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_b_marker_point'
  ) THEN
    ALTER TABLE transitions
      ALTER COLUMN song_b_marker_point TYPE numeric(10,4) USING song_b_marker_point::numeric(10,4);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_a_clip_start'
  ) THEN
    ALTER TABLE transitions
      ALTER COLUMN song_a_clip_start TYPE numeric(10,4) USING song_a_clip_start::numeric(10,4);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_b_clip_end'
  ) THEN
    ALTER TABLE transitions
      ALTER COLUMN song_b_clip_end TYPE numeric(10,4) USING song_b_clip_end::numeric(10,4);
  END IF;
END $$;

-- Recreate constraints with numeric values
ALTER TABLE transitions ADD CONSTRAINT transitions_transition_start_point_check
  CHECK (transition_start_point >= 0);

ALTER TABLE transitions ADD CONSTRAINT transitions_transition_duration_check
  CHECK (transition_duration > 0 AND transition_duration <= 60);

ALTER TABLE transitions ADD CONSTRAINT transitions_song_a_end_time_check
  CHECK (song_a_end_time >= 0);

ALTER TABLE transitions ADD CONSTRAINT transitions_song_b_start_time_check
  CHECK (song_b_start_time >= 0);

-- Add constraints for marker point columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_a_marker_point'
  ) THEN
    ALTER TABLE transitions ADD CONSTRAINT transitions_song_a_marker_point_check
      CHECK (song_a_marker_point >= 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_b_marker_point'
  ) THEN
    ALTER TABLE transitions ADD CONSTRAINT transitions_song_b_marker_point_check
      CHECK (song_b_marker_point >= 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_a_clip_start'
  ) THEN
    ALTER TABLE transitions ADD CONSTRAINT transitions_song_a_clip_start_check
      CHECK (song_a_clip_start >= 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_b_clip_end'
  ) THEN
    ALTER TABLE transitions ADD CONSTRAINT transitions_song_b_clip_end_check
      CHECK (song_b_clip_end >= 0);
  END IF;
END $$;

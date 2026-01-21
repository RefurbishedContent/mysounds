/*
  # Add Marker Point Fields to Transitions

  1. Changes
    - Add `song_a_marker_point` column to store where user wants Song A to end (in seconds)
    - Add `song_b_marker_point` column to store where user wants Song B to start (in seconds)
    - Add `song_a_clip_start` column to store calculated extraction start point for Song A
    - Add `song_b_clip_end` column to store calculated extraction end point for Song B
    - Update constraints to ensure marker points are valid
  
  2. Purpose
    - Allow users to select precise points in their songs for transition creation
    - Store both user-selected markers and calculated extraction ranges
    - Enable the new clip selection workflow
*/

DO $$
BEGIN
  -- Add song_a_marker_point column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_a_marker_point'
  ) THEN
    ALTER TABLE transitions 
    ADD COLUMN song_a_marker_point integer DEFAULT 30 CHECK (song_a_marker_point >= 0);
  END IF;

  -- Add song_b_marker_point column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_b_marker_point'
  ) THEN
    ALTER TABLE transitions 
    ADD COLUMN song_b_marker_point integer DEFAULT 0 CHECK (song_b_marker_point >= 0);
  END IF;

  -- Add song_a_clip_start column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_a_clip_start'
  ) THEN
    ALTER TABLE transitions 
    ADD COLUMN song_a_clip_start integer DEFAULT 18 CHECK (song_a_clip_start >= 0);
  END IF;

  -- Add song_b_clip_end column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'song_b_clip_end'
  ) THEN
    ALTER TABLE transitions 
    ADD COLUMN song_b_clip_end integer DEFAULT 12 CHECK (song_b_clip_end >= 0);
  END IF;
END $$;

COMMENT ON COLUMN transitions.song_a_marker_point IS 'User-selected point where Song A should end (seconds)';
COMMENT ON COLUMN transitions.song_b_marker_point IS 'User-selected point where Song B should start (seconds)';
COMMENT ON COLUMN transitions.song_a_clip_start IS 'Calculated start point for Song A clip extraction (seconds before marker)';
COMMENT ON COLUMN transitions.song_b_clip_end IS 'Calculated end point for Song B clip extraction (seconds after marker)';

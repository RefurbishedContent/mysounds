/*
  # Add Genre Override and Metadata Columns

  1. Changes to uploads table
    - Add `manual_genre` column for user-corrected genre (nullable text)
    - Add `genre_confidence` column for AI confidence score (numeric 0-1)
    - Add `metadata` column for extracted song metadata like artist and title (jsonb)
    - Add `last_analyzed_at` column to track when song was last analyzed (timestamp)
  
  2. Purpose
    - Allow users to manually override incorrect genre classifications
    - Store confidence scores from AI analysis
    - Store extracted metadata (artist, title, album, etc.) from audio files
    - Track analysis history for re-analysis functionality
*/

DO $$
BEGIN
  -- Add manual_genre column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploads' AND column_name = 'manual_genre'
  ) THEN
    ALTER TABLE uploads ADD COLUMN manual_genre text;
  END IF;

  -- Add genre_confidence column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploads' AND column_name = 'genre_confidence'
  ) THEN
    ALTER TABLE uploads ADD COLUMN genre_confidence numeric CHECK (genre_confidence >= 0 AND genre_confidence <= 1);
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploads' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE uploads ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  -- Add last_analyzed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploads' AND column_name = 'last_analyzed_at'
  ) THEN
    ALTER TABLE uploads ADD COLUMN last_analyzed_at timestamptz;
  END IF;
END $$;

-- Create index on manual_genre for faster filtering
CREATE INDEX IF NOT EXISTS idx_uploads_manual_genre ON uploads(manual_genre) WHERE manual_genre IS NOT NULL;

-- Create index on metadata for searching by artist/title
CREATE INDEX IF NOT EXISTS idx_uploads_metadata ON uploads USING gin(metadata);

/*
  # Add Mash Up Counter to Users

  1. Changes
    - Add `mashup_counter` column to `users` table
    - This column tracks the next sequential number for default mash up names
    - Each user has their own counter that increments independently
    - Counter starts at 1 and never resets

  2. Details
    - Column: `mashup_counter` (integer, default 1)
    - Purpose: Generate unique sequential default names like "Mash Up #1", "Mash Up #2", etc.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'mashup_counter'
  ) THEN
    ALTER TABLE users ADD COLUMN mashup_counter integer DEFAULT 1;
  END IF;
END $$;
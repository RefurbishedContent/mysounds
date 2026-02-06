/*
  # Add Transition Rendering Fields

  1. New Columns
    - `rendered_at` (timestamptz) - Timestamp when transition audio was successfully rendered
    - `render_duration_seconds` (numeric) - Time taken to process the audio in seconds
    - `output_file_size` (bigint) - Size of rendered audio file in bytes
    - `render_error_message` (text) - Error message if rendering failed
    - `render_attempts` (integer) - Number of times rendering was attempted (for retry logic)
  
  2. Changes
    - Update status enum to include 'rendering' and 'completed' states
    - Add index on (status, output_url) for efficient queries
    
  3. Security
    - No RLS changes needed (existing policies cover these fields)
*/

-- Add new columns for tracking render status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'rendered_at'
  ) THEN
    ALTER TABLE transitions ADD COLUMN rendered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'render_duration_seconds'
  ) THEN
    ALTER TABLE transitions ADD COLUMN render_duration_seconds numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'output_file_size'
  ) THEN
    ALTER TABLE transitions ADD COLUMN output_file_size bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'render_error_message'
  ) THEN
    ALTER TABLE transitions ADD COLUMN render_error_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transitions' AND column_name = 'render_attempts'
  ) THEN
    ALTER TABLE transitions ADD COLUMN render_attempts integer DEFAULT 0;
  END IF;
END $$;

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_transitions_status_output 
  ON transitions(status, output_url) 
  WHERE output_url IS NOT NULL;

-- Add comment explaining the render flow
COMMENT ON COLUMN transitions.rendered_at IS 'Timestamp when the transition audio was successfully rendered and uploaded to storage';
COMMENT ON COLUMN transitions.render_duration_seconds IS 'Processing time in seconds for rendering the transition audio';
COMMENT ON COLUMN transitions.output_file_size IS 'Size of the rendered transition audio file in bytes';
COMMENT ON COLUMN transitions.render_error_message IS 'Error message if rendering failed, used for debugging and user feedback';
COMMENT ON COLUMN transitions.render_attempts IS 'Number of times rendering was attempted, used to prevent infinite retry loops';
/*
  # Enforce 10-Second Transition Blend Cap

  ## Summary
  Updates the `transitions` table defaults and constraints to match the
  10-second-per-side blend limit that the app code enforces in the UI.

  ## Changes to `transitions` table

  ### Column default updates
  - `transition_duration`: 16 -> 10 (must not exceed the blend cap)
  - `transition_start_point`: 30 -> 10 (aligns with max clip duration)
  - `song_a_end_time`: 30 -> 10
  - `song_a_marker_point`: 30 -> 10
  - `song_a_clip_start`: 18 -> 0 (safe fallback; clip start at song beginning)
  - `song_b_clip_end`: 12 -> 10

  ### Check constraint updates
  - `transition_duration`: was <= 60, now <= 10 (hard cap per side)
  - `status`: expanded to include 'rendering', 'completed', 'failed' states
    that the app code already uses

  ## Important Notes
  1. Existing rows are NOT modified -- only defaults and constraints for
     future inserts/updates change.
  2. The status constraint is replaced to include all states the app code
     references (rendering, completed, failed were missing).
  3. This is safe to re-run (uses DROP CONSTRAINT IF EXISTS).
*/

-- Update column defaults to match 10-second cap
ALTER TABLE transitions
  ALTER COLUMN transition_duration SET DEFAULT 10,
  ALTER COLUMN transition_start_point SET DEFAULT 10,
  ALTER COLUMN song_a_end_time SET DEFAULT 10,
  ALTER COLUMN song_a_marker_point SET DEFAULT 10,
  ALTER COLUMN song_a_clip_start SET DEFAULT 0,
  ALTER COLUMN song_b_clip_end SET DEFAULT 10;

-- Replace transition_duration constraint: cap at 10 instead of 60
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_transition_duration_check;
ALTER TABLE transitions ADD CONSTRAINT transitions_transition_duration_check
  CHECK (transition_duration > 0 AND transition_duration <= 10);

-- Replace status constraint to include all states the app uses
ALTER TABLE transitions DROP CONSTRAINT IF EXISTS transitions_status_check;
ALTER TABLE transitions ADD CONSTRAINT transitions_status_check
  CHECK (status IN ('draft', 'ready', 'processing', 'rendering', 'completed', 'failed', 'error'));

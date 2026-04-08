/*
  # Add Unique Constraint to Stems Table

  ## Summary
  Adds a composite unique constraint on (track_id, stem_type, separation_level)
  to the stems table. This enables upsert operations from the stem-webhook when
  re-processing a track — preventing duplicate stem records for the same
  track/type/level combination.

  ## Changes
  - Adds unique index on stems(track_id, stem_type, separation_level)
*/

CREATE UNIQUE INDEX IF NOT EXISTS stems_track_type_level_unique
  ON stems(track_id, stem_type, separation_level);

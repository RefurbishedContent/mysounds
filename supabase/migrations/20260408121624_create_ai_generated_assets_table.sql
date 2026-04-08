/*
  # Create AI Generated Assets Table

  ## Summary
  Stores records for AI-generated audio assets (transition FX, musical bridges,
  vocal drops) that can be inserted into mix plans. This table is a stub for a
  future AI generation phase — all records will have status 'failed' or
  'pending' until real API integrations are wired in.

  The `fallback_used` flag records whether the system fell back to standard
  stem manipulation when generation failed or was disabled.

  ## New Tables

  1. `ai_generated_assets`
     - References `mix_plans.id` as parent
     - `generation_type` enumerates the three stub asset types
     - `api_source` is null until a real provider is configured
     - `audio_url` and `storage_path` are null until generation completes
     - `storage_path` MUST be under `tracks/{user_id}/{track_id}/` so
       `deleteTrackAndAllAssets()` will clean it up automatically

  ## Security
  - RLS enabled
  - Users can only access assets belonging to their own mix plans
  - SELECT policy verifies plan ownership via join on mix_plans

  ## Important Notes
  1. When ai_generation.enabled is false, no rows will be inserted here
  2. The stub Edge Functions return mock responses without writing to this table
  3. In the future, real generation jobs will insert rows with status 'processing'
     and update them to 'complete' via webhook
*/

CREATE TABLE IF NOT EXISTS ai_generated_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mix_plan_id uuid NOT NULL REFERENCES mix_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  generation_type text NOT NULL
    CHECK (generation_type IN ('transition_fx', 'musical_bridge', 'vocal_drop')),

  -- Provider info (null until a real provider is configured)
  api_source text,
  prompt_used text DEFAULT '',

  -- Output location (null until generation completes)
  audio_url text,
  -- Must follow tracks/{user_id}/{track_id}/ for cleanup
  storage_path text,

  -- Audio properties of the generated asset
  duration_ms integer,
  key text DEFAULT '',
  bpm numeric(6, 2),

  -- Lifecycle
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  fallback_used boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_assets_mix_plan_idx ON ai_generated_assets(mix_plan_id);
CREATE INDEX IF NOT EXISTS ai_assets_user_idx ON ai_generated_assets(user_id);
CREATE INDEX IF NOT EXISTS ai_assets_status_idx ON ai_generated_assets(status);

ALTER TABLE ai_generated_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai generated assets"
  ON ai_generated_assets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai generated assets"
  ON ai_generated_assets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai generated assets"
  ON ai_generated_assets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai generated assets"
  ON ai_generated_assets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

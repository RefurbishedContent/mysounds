/*
  # AI-Assisted Template Selection Schema

  1. Template Enhancements
    - Add BPM range fields for matching
    - Add key compatibility data
    - Add genre tags with weights
    - Add energy level ranges
    - Add compatibility metadata

  2. AI Analysis Tracking
    - Create AI analysis jobs table
    - Track analysis status and results
    - Store confidence scores

  3. Template Recommendations
    - Create recommendations cache table
    - Store compatibility scores
    - Track user feedback

  4. Credit System Extensions
    - Add AI-specific credit transaction types
    - Track AI feature usage

  5. User Preferences
    - Create user AI preferences table
    - Store learning data

  Security:
    - Enable RLS on all new tables
    - Restrict access to authenticated users
*/

-- =====================================================
-- 1. ENHANCE TEMPLATES TABLE
-- =====================================================

-- Add template compatibility fields
ALTER TABLE templates ADD COLUMN IF NOT EXISTS bpm_min integer;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS bpm_max integer;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS bpm_flexibility numeric DEFAULT 0.1 CHECK (bpm_flexibility >= 0 AND bpm_flexibility <= 1);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS compatible_keys text[] DEFAULT '{}';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS genre_tags jsonb DEFAULT '{}';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS energy_min numeric DEFAULT 0 CHECK (energy_min >= 0 AND energy_min <= 1);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS energy_max numeric DEFAULT 1 CHECK (energy_max >= 0 AND energy_max <= 1);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS mood_tags text[] DEFAULT '{}';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS transition_style text;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0 CHECK (usage_count >= 0);

-- Add indexes for template matching queries
CREATE INDEX IF NOT EXISTS idx_templates_bpm_range ON templates (bpm_min, bpm_max) WHERE bpm_min IS NOT NULL AND bpm_max IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_energy_range ON templates (energy_min, energy_max);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates (category);
CREATE INDEX IF NOT EXISTS idx_templates_genre_tags ON templates USING gin (genre_tags);

-- =====================================================
-- 2. CREATE AI ANALYSIS JOBS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  upload_id_a uuid REFERENCES uploads(id) ON DELETE CASCADE,
  upload_id_b uuid REFERENCES uploads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  analysis_type text NOT NULL CHECK (analysis_type IN ('single_track', 'track_pair', 'template_match')),
  results jsonb DEFAULT '{}',
  error_message text,
  credits_consumed integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ai_analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI analysis jobs"
  ON ai_analysis_jobs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own AI analysis jobs"
  ON ai_analysis_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own AI analysis jobs"
  ON ai_analysis_jobs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ai_analysis_jobs_user_id ON ai_analysis_jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_jobs_status ON ai_analysis_jobs (status);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_jobs_created_at ON ai_analysis_jobs (created_at DESC);

-- =====================================================
-- 3. CREATE TEMPLATE RECOMMENDATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS template_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  upload_id_a uuid REFERENCES uploads(id) ON DELETE CASCADE,
  upload_id_b uuid REFERENCES uploads(id) ON DELETE CASCADE,
  compatibility_score numeric NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  bpm_score numeric CHECK (bpm_score >= 0 AND bpm_score <= 100),
  key_score numeric CHECK (key_score >= 0 AND key_score <= 100),
  genre_score numeric CHECK (genre_score >= 0 AND genre_score <= 100),
  energy_score numeric CHECK (energy_score >= 0 AND energy_score <= 100),
  reasoning jsonb DEFAULT '{}',
  user_accepted boolean,
  user_feedback text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

ALTER TABLE template_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recommendations"
  ON template_recommendations FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert recommendations"
  ON template_recommendations FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own recommendations"
  ON template_recommendations FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own recommendations"
  ON template_recommendations FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_template_recommendations_user_id ON template_recommendations (user_id);
CREATE INDEX IF NOT EXISTS idx_template_recommendations_template_id ON template_recommendations (template_id);
CREATE INDEX IF NOT EXISTS idx_template_recommendations_score ON template_recommendations (compatibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_template_recommendations_expires ON template_recommendations (expires_at);

-- =====================================================
-- 4. CREATE USER AI PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_ai_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ai_enabled boolean DEFAULT true,
  auto_analyze boolean DEFAULT false,
  preferred_genres jsonb DEFAULT '{}',
  preferred_transition_styles text[] DEFAULT '{}',
  template_usage_history jsonb DEFAULT '{}',
  feedback_history jsonb DEFAULT '[]',
  learning_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI preferences"
  ON user_ai_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own AI preferences"
  ON user_ai_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own AI preferences"
  ON user_ai_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =====================================================
-- 5. CREATE PLAYLISTS TABLE FOR LIBRARY PLAYBACK
-- =====================================================

CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  thumbnail_url text,
  is_public boolean DEFAULT false,
  track_count integer DEFAULT 0 CHECK (track_count >= 0),
  total_duration integer DEFAULT 0 CHECK (total_duration >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own playlists"
  ON playlists FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can view public playlists"
  ON playlists FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists (user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON playlists (is_public);

-- =====================================================
-- 6. CREATE PLAYLIST TRACKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  added_at timestamptz DEFAULT now()
);

ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage playlist tracks"
  ON playlist_tracks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND playlists.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND playlists.user_id = (select auth.uid())
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks (playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_upload_id ON playlist_tracks (upload_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks (playlist_id, position);

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_playlist_tracks_unique ON playlist_tracks (playlist_id, position);

-- =====================================================
-- 7. UPDATE CREDIT TRANSACTION TYPES FOR AI
-- =====================================================

-- Drop existing enum if exists and recreate with AI types
DO $$ BEGIN
  ALTER TYPE credit_transaction_type ADD VALUE IF NOT EXISTS 'ai_analysis';
  ALTER TYPE credit_transaction_type ADD VALUE IF NOT EXISTS 'ai_recommendation';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 8. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to initialize user AI preferences
CREATE OR REPLACE FUNCTION initialize_user_ai_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_ai_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_user_created_ai_preferences ON users;
CREATE TRIGGER on_user_created_ai_preferences
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_ai_preferences();

-- Function to consume credits for AI analysis
CREATE OR REPLACE FUNCTION consume_credits_for_ai_analysis(
  p_user_id uuid,
  p_analysis_job_id uuid,
  p_credits_to_consume integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits integer;
BEGIN
  SELECT credits_remaining INTO v_current_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_credits >= p_credits_to_consume THEN
    UPDATE user_credits
    SET credits_remaining = credits_remaining - p_credits_to_consume,
        credits_used_this_month = credits_used_this_month + p_credits_to_consume,
        updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO credit_transactions (
      user_id,
      type,
      amount,
      description,
      metadata
    ) VALUES (
      p_user_id,
      'ai_analysis',
      -p_credits_to_consume,
      'Credits consumed for AI audio analysis',
      jsonb_build_object('analysis_job_id', p_analysis_job_id)
    );

    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Function to refund credits for failed AI analysis
CREATE OR REPLACE FUNCTION refund_credits_for_failed_ai_analysis(
  p_user_id uuid,
  p_analysis_job_id uuid,
  p_credits_to_refund integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_credits
  SET credits_remaining = credits_remaining + p_credits_to_refund,
      credits_used_this_month = GREATEST(0, credits_used_this_month - p_credits_to_refund),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO credit_transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    p_user_id,
    'refunded',
    p_credits_to_refund,
    'Credits refunded for failed AI analysis',
    jsonb_build_object('analysis_job_id', p_analysis_job_id)
  );
END;
$$;

-- Function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM template_recommendations
  WHERE expires_at < now();
END;
$$;

-- =====================================================
-- 9. ADD TRIGGERS FOR UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS update_ai_analysis_jobs_updated_at ON ai_analysis_jobs;
CREATE TRIGGER update_ai_analysis_jobs_updated_at
  BEFORE UPDATE ON ai_analysis_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_ai_preferences_updated_at ON user_ai_preferences;
CREATE TRIGGER update_user_ai_preferences_updated_at
  BEFORE UPDATE ON user_ai_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_playlists_updated_at ON playlists;
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing indexes on foreign key columns
      - ai_analysis_jobs: upload_id_a, upload_id_b
      - blends: song_a_id, song_b_id
      - template_recommendations: upload_id_a, upload_id_b
      - transitions: render_job_id
    
  2. RLS Policy Optimization
    - Wrap auth.uid() and auth.jwt() calls with SELECT to prevent re-evaluation per row
    - Affects multiple tables: templates, render_jobs, user_credits, credit_transactions, 
      activity_logs, analytics_events, blends, analysis_jobs
    
  3. Function Security
    - Set immutable search_path for security functions to prevent search_path attacks
    - Affects: initialize_user_credits, refund_credits_for_failed_render, log_activity, track_analytics_event

  ## Important Notes
  - These changes improve query performance at scale
  - RLS policies remain functionally identical but execute more efficiently
  - Function search_path hardening prevents potential security vulnerabilities
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- ai_analysis_jobs indexes
CREATE INDEX IF NOT EXISTS idx_ai_analysis_jobs_upload_id_a 
  ON public.ai_analysis_jobs(upload_id_a);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_jobs_upload_id_b 
  ON public.ai_analysis_jobs(upload_id_b);

-- blends indexes
CREATE INDEX IF NOT EXISTS idx_blends_song_a_id 
  ON public.blends(song_a_id);

CREATE INDEX IF NOT EXISTS idx_blends_song_b_id 
  ON public.blends(song_b_id);

-- template_recommendations indexes
CREATE INDEX IF NOT EXISTS idx_template_recommendations_upload_id_a 
  ON public.template_recommendations(upload_id_a);

CREATE INDEX IF NOT EXISTS idx_template_recommendations_upload_id_b 
  ON public.template_recommendations(upload_id_b);

-- transitions index
CREATE INDEX IF NOT EXISTS idx_transitions_render_job_id 
  ON public.transitions(render_job_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES
-- =====================================================

-- Templates table
DROP POLICY IF EXISTS "Admin users can manage templates" ON public.templates;
CREATE POLICY "Admin users can manage templates"
  ON public.templates
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

-- Render Jobs table
DROP POLICY IF EXISTS "Admins can view all render jobs" ON public.render_jobs;
CREATE POLICY "Admins can view all render jobs"
  ON public.render_jobs
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin');

-- User Credits table
DROP POLICY IF EXISTS "Admins can manage all credits" ON public.user_credits;
CREATE POLICY "Admins can manage all credits"
  ON public.user_credits
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

-- Credit Transactions table
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.credit_transactions;
CREATE POLICY "Admins can manage all transactions"
  ON public.credit_transactions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt()->>'role') = 'admin');

-- Activity Logs table
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin');

-- Analytics Events table
DROP POLICY IF EXISTS "Admins can view all analytics events" ON public.analytics_events;
CREATE POLICY "Admins can view all analytics events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.jwt()->>'role') = 'admin');

-- Blends table - optimize all user policies
DROP POLICY IF EXISTS "Users can create own blends" ON public.blends;
CREATE POLICY "Users can create own blends"
  ON public.blends
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own blends" ON public.blends;
CREATE POLICY "Users can delete own blends"
  ON public.blends
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own blends" ON public.blends;
CREATE POLICY "Users can update own blends"
  ON public.blends
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own blends" ON public.blends;
CREATE POLICY "Users can view own blends"
  ON public.blends
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Analysis Jobs table - optimize user policies
DROP POLICY IF EXISTS "Users can create own analysis jobs" ON public.analysis_jobs;
CREATE POLICY "Users can create own analysis jobs"
  ON public.analysis_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own analysis jobs" ON public.analysis_jobs;
CREATE POLICY "Users can update own analysis jobs"
  ON public.analysis_jobs
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own analysis jobs" ON public.analysis_jobs;
CREATE POLICY "Users can view own analysis jobs"
  ON public.analysis_jobs
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 3. FIX FUNCTION SEARCH PATH SECURITY
-- =====================================================

-- Drop existing functions before recreating with proper search_path
DROP FUNCTION IF EXISTS public.initialize_user_credits() CASCADE;
DROP FUNCTION IF EXISTS public.refund_credits_for_failed_render() CASCADE;
DROP FUNCTION IF EXISTS public.log_activity(uuid, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.track_analytics_event(uuid, text, jsonb, text) CASCADE;

-- Recreate initialize_user_credits with secure search_path
CREATE FUNCTION public.initialize_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, free_credits)
  VALUES (NEW.id, 0, 100)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate refund_credits_for_failed_render with secure search_path
CREATE FUNCTION public.refund_credits_for_failed_render()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'error' AND OLD.status != 'error' THEN
    UPDATE public.user_credits
    SET credits = credits + NEW.credits_used
    WHERE user_id = NEW.user_id;
    
    INSERT INTO public.credit_transactions (user_id, amount, transaction_type, description, render_job_id)
    VALUES (NEW.user_id, NEW.credits_used, 'refund', 'Refund for failed render job', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate log_activity with secure search_path
CREATE FUNCTION public.log_activity(
  p_user_id uuid,
  p_event_type text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, event_type, description, metadata)
  VALUES (p_user_id, p_event_type, p_description, p_metadata);
END;
$$;

-- Recreate track_analytics_event with secure search_path
CREATE FUNCTION public.track_analytics_event(
  p_user_id uuid,
  p_event_name text,
  p_properties jsonb DEFAULT '{}'::jsonb,
  p_session_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.analytics_events (user_id, event_name, properties, session_id)
  VALUES (p_user_id, p_event_name, p_properties, p_session_id);
END;
$$;

-- Recreate triggers that may have been dropped
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_credits();

CREATE TRIGGER on_render_job_failed
  AFTER UPDATE ON public.render_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.refund_credits_for_failed_render();
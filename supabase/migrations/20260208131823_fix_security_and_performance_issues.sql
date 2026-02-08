/*
  # Fix Security and Performance Issues

  1. Missing Foreign Key Indexes
    - Add index on `mixdowns(project_id)` for FK `mixdowns_project_id_fkey`
    - Add index on `mixdowns(user_id)` for FK `mixdowns_user_id_fkey`
    - Add index on `projects(template_id)` for FK `projects_template_id_fkey`
    - Add index on `render_jobs(project_id)` for FK `render_jobs_project_id_fkey`
    - Add index on `user_favorites(template_id)` for FK `user_favorites_template_id_fkey`

  2. RLS Policy Optimization
    - Recreate 6 admin RLS policies to use `(select auth.jwt())` pattern
      so the JWT is evaluated once per query instead of per-row
    - Affected tables: templates, render_jobs, user_credits,
      credit_transactions, activity_logs, analytics_events

  3. Drop Unused Indexes
    - Remove 40+ indexes that have never been used per pg_stat_user_indexes
    - These add write overhead with no read benefit

  4. Fix Function Search Paths
    - Drop and recreate 5 SECURITY DEFINER function overloads that were
      missing `search_path = public, pg_temp`
    - Drop stale `initialize_user_credits(uuid, text)` callable overload
    - Drop stale `refund_credits_for_failed_render(uuid, uuid, integer)`
      overload that references non-existent columns

  5. Important Notes
    - All index creations use IF NOT EXISTS for safety
    - All index drops use IF EXISTS for safety
    - Policy drops are idempotent (DROP POLICY IF EXISTS)
    - Functions with default params must be dropped before recreation
*/

-- ============================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_mixdowns_project_id
  ON public.mixdowns (project_id);

CREATE INDEX IF NOT EXISTS idx_mixdowns_user_id
  ON public.mixdowns (user_id);

CREATE INDEX IF NOT EXISTS idx_projects_template_id
  ON public.projects (template_id);

CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id
  ON public.render_jobs (project_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_template_id
  ON public.user_favorites (template_id);


-- ============================================================
-- 2. FIX RLS POLICIES (use (select auth.jwt()) pattern)
-- ============================================================

DROP POLICY IF EXISTS "Admin users can manage templates" ON public.templates;
CREATE POLICY "Admin users can manage templates"
  ON public.templates
  FOR ALL
  TO authenticated
  USING (((select auth.jwt()) ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can view all render jobs" ON public.render_jobs;
CREATE POLICY "Admins can view all render jobs"
  ON public.render_jobs
  FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can manage all credits" ON public.user_credits;
CREATE POLICY "Admins can manage all credits"
  ON public.user_credits
  FOR ALL
  TO authenticated
  USING (((select auth.jwt()) ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.credit_transactions;
CREATE POLICY "Admins can manage all transactions"
  ON public.credit_transactions
  FOR ALL
  TO authenticated
  USING (((select auth.jwt()) ->> 'role') = 'admin')
  WITH CHECK (((select auth.jwt()) ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can view all analytics events" ON public.analytics_events;
CREATE POLICY "Admins can view all analytics events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) ->> 'role') = 'admin');


-- ============================================================
-- 3. DROP UNUSED INDEXES
-- ============================================================

DROP INDEX IF EXISTS public.idx_uploads_status;
DROP INDEX IF EXISTS public.idx_templates_category;
DROP INDEX IF EXISTS public.idx_templates_premium;
DROP INDEX IF EXISTS public.idx_template_recommendations_user_id;
DROP INDEX IF EXISTS public.idx_render_jobs_user_id;
DROP INDEX IF EXISTS public.idx_render_jobs_status;
DROP INDEX IF EXISTS public.idx_render_jobs_created_at;
DROP INDEX IF EXISTS public.idx_credit_transactions_render_job_id;
DROP INDEX IF EXISTS public.idx_credit_transactions_created_at;
DROP INDEX IF EXISTS public.idx_activity_logs_user_id;
DROP INDEX IF EXISTS public.idx_activity_logs_event_type;
DROP INDEX IF EXISTS public.idx_activity_logs_created_at;
DROP INDEX IF EXISTS public.idx_activity_logs_session_id;
DROP INDEX IF EXISTS public.idx_analytics_events_event_name;
DROP INDEX IF EXISTS public.idx_analytics_events_created_at;
DROP INDEX IF EXISTS public.idx_analytics_events_session_id;
DROP INDEX IF EXISTS public.idx_analysis_jobs_upload_id;
DROP INDEX IF EXISTS public.idx_analysis_jobs_user_id;
DROP INDEX IF EXISTS public.idx_analysis_jobs_status;
DROP INDEX IF EXISTS public.idx_analysis_jobs_created_at;
DROP INDEX IF EXISTS public.idx_blend_folders_parent_id;
DROP INDEX IF EXISTS public.idx_blend_bins_folder_id;
DROP INDEX IF EXISTS public.idx_blend_tag_assignments_tag_id;
DROP INDEX IF EXISTS public.idx_blends_folder_id;
DROP INDEX IF EXISTS public.idx_blends_bin_id;
DROP INDEX IF EXISTS public.idx_templates_genre_tags;
DROP INDEX IF EXISTS public.idx_ai_analysis_jobs_user_id;
DROP INDEX IF EXISTS public.idx_ai_analysis_jobs_status;
DROP INDEX IF EXISTS public.idx_ai_analysis_jobs_created_at;
DROP INDEX IF EXISTS public.idx_playlists_user_id;
DROP INDEX IF EXISTS public.idx_playlists_is_public;
DROP INDEX IF EXISTS public.idx_playlist_tracks_playlist_id;
DROP INDEX IF EXISTS public.idx_blends_created_at;
DROP INDEX IF EXISTS public.idx_uploads_manual_genre;
DROP INDEX IF EXISTS public.idx_uploads_metadata;
DROP INDEX IF EXISTS public.idx_transitions_status_output;
DROP INDEX IF EXISTS public.idx_ai_analysis_jobs_upload_id_a;
DROP INDEX IF EXISTS public.idx_ai_analysis_jobs_upload_id_b;
DROP INDEX IF EXISTS public.idx_blends_song_a_id;
DROP INDEX IF EXISTS public.idx_blends_song_b_id;
DROP INDEX IF EXISTS public.idx_template_recommendations_upload_id_a;
DROP INDEX IF EXISTS public.idx_template_recommendations_upload_id_b;
DROP INDEX IF EXISTS public.idx_transitions_render_job_id;
DROP INDEX IF EXISTS public.idx_transitions_status;
DROP INDEX IF EXISTS public.idx_mix_sessions_status;
DROP INDEX IF EXISTS public.idx_mix_tracks_mix_session_id;


-- ============================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- ============================================================

-- 4a. Drop stale callable overload of initialize_user_credits
DROP FUNCTION IF EXISTS public.initialize_user_credits(uuid, text);

-- 4b. Drop stale refund_credits_for_failed_render 3-param overload
--     (references non-existent columns: credits_used, transaction_type)
DROP FUNCTION IF EXISTS public.refund_credits_for_failed_render(uuid, uuid, integer);

-- 4c. Fix refund_credits_for_failed_render (2-param) -- missing search_path
DROP FUNCTION IF EXISTS public.refund_credits_for_failed_render(uuid, uuid);
CREATE FUNCTION public.refund_credits_for_failed_render(
  user_id_param uuid,
  render_job_id_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  credits_to_refund integer;
BEGIN
  SELECT ABS(amount) INTO credits_to_refund
  FROM credit_transactions
  WHERE user_id = user_id_param
    AND render_job_id = render_job_id_param
    AND type = 'consumed'
  LIMIT 1;

  IF credits_to_refund IS NOT NULL THEN
    UPDATE user_credits
    SET
      credits_remaining = credits_remaining + credits_to_refund,
      credits_used_this_month = GREATEST(0, credits_used_this_month - credits_to_refund),
      updated_at = now()
    WHERE user_id = user_id_param;

    INSERT INTO credit_transactions (
      user_id, type, amount, description, render_job_id
    ) VALUES (
      user_id_param, 'refunded', credits_to_refund,
      'Refund for failed render job', render_job_id_param
    );
  END IF;
END;
$$;

-- 4d. Fix log_activity (4-param) -- has search_path=public, needs pg_temp
DROP FUNCTION IF EXISTS public.log_activity(uuid, text, jsonb, text);
CREATE FUNCTION public.log_activity(
  p_user_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_session_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.activity_logs (user_id, event_type, event_data, session_id)
  VALUES (p_user_id, p_event_type, p_event_data, p_session_id)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- 4e. Fix log_activity (6-param) -- missing search_path entirely
DROP FUNCTION IF EXISTS public.log_activity(uuid, text, jsonb, text, text, text);
CREATE FUNCTION public.log_activity(
  p_user_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO activity_logs (
    user_id, event_type, event_data, ip_address, user_agent, session_id
  ) VALUES (
    p_user_id, p_event_type, p_event_data, p_ip_address, p_user_agent, p_session_id
  ) RETURNING id INTO log_id;
  RETURN log_id;
END;
$$;

-- 4f. Fix track_analytics_event (6-param) -- missing search_path entirely
DROP FUNCTION IF EXISTS public.track_analytics_event(uuid, text, jsonb, text, text, text);
CREATE FUNCTION public.track_analytics_event(
  p_user_id uuid,
  p_event_name text,
  p_properties jsonb DEFAULT '{}'::jsonb,
  p_session_id text DEFAULT NULL,
  p_page_url text DEFAULT NULL,
  p_referrer text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO analytics_events (
    user_id, event_name, properties, session_id, page_url, referrer
  ) VALUES (
    p_user_id, p_event_name, p_properties, p_session_id, p_page_url, p_referrer
  ) RETURNING id INTO event_id;
  RETURN event_id;
END;
$$;

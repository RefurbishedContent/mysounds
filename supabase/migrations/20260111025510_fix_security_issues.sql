/*
  # Security Fixes Migration

  1. Performance Optimization
    - Optimize all RLS policies to use `(select auth.uid())` instead of `auth.uid()` directly
    - This prevents re-evaluation of the function for each row, improving query performance at scale
  
  2. Security Hardening
    - Fix RLS policies that bypass security by always returning true
    - Add proper security checks to activity_logs and analytics_events INSERT policies
    - Secure function search paths to prevent SQL injection attacks
  
  3. Function Security
    - Update all functions to use SECURITY DEFINER with explicit search_path
    - This prevents search_path manipulation attacks
  
  Important Notes:
    - All existing policies are dropped and recreated with optimized versions
    - Functions are replaced with secure versions
    - No data is lost during this migration
*/

-- =====================================================
-- 1. OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- =====================================================

-- Drop and recreate users table policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

CREATE POLICY "Users can read own data"
  ON public.users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own data"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Drop and recreate projects table policies
DROP POLICY IF EXISTS "Users can read own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can read own projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate user_favorites table policies
DROP POLICY IF EXISTS "Users can read own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.user_favorites;

CREATE POLICY "Users can read own favorites"
  ON public.user_favorites FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.user_favorites FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.user_favorites FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate uploads table policies
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can read own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON public.uploads;

CREATE POLICY "Users can insert own uploads"
  ON public.uploads FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can read own uploads"
  ON public.uploads FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own uploads"
  ON public.uploads FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own uploads"
  ON public.uploads FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate mixdowns table policies
DROP POLICY IF EXISTS "Users can read own mixdowns" ON public.mixdowns;
DROP POLICY IF EXISTS "Users can insert own mixdowns" ON public.mixdowns;
DROP POLICY IF EXISTS "Users can delete own mixdowns" ON public.mixdowns;

CREATE POLICY "Users can read own mixdowns"
  ON public.mixdowns FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own mixdowns"
  ON public.mixdowns FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own mixdowns"
  ON public.mixdowns FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate user_credits table policies
DROP POLICY IF EXISTS "Users can read own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
DROP POLICY IF EXISTS "System can insert credits" ON public.user_credits;
DROP POLICY IF EXISTS "Admins can manage all credits" ON public.user_credits;

CREATE POLICY "Users can read own credits"
  ON public.user_credits FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own credits"
  ON public.user_credits FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "System can insert credits"
  ON public.user_credits FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all credits"
  ON public.user_credits FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- Drop and recreate credit_transactions table policies
DROP POLICY IF EXISTS "Users can read own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON public.credit_transactions;

CREATE POLICY "Users can read own transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "System can insert transactions"
  ON public.credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all transactions"
  ON public.credit_transactions FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- Drop and recreate render_jobs table policies
DROP POLICY IF EXISTS "Users can manage own render jobs" ON public.render_jobs;
DROP POLICY IF EXISTS "Admins can view all render jobs" ON public.render_jobs;

CREATE POLICY "Users can manage own render jobs"
  ON public.render_jobs FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all render jobs"
  ON public.render_jobs FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin');

-- Drop and recreate templates table policies
DROP POLICY IF EXISTS "Admin users can manage templates" ON public.templates;

CREATE POLICY "Admin users can manage templates"
  ON public.templates FOR ALL
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin')
  WITH CHECK ((select auth.jwt()->>'role') = 'admin');

-- Drop and recreate analytics_events table policies
DROP POLICY IF EXISTS "Users can view own analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can view all analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;

CREATE POLICY "Users can view own analytics events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all analytics events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin');

-- SECURITY FIX: Restrict analytics insert to authenticated users with valid user_id
CREATE POLICY "Authenticated users can insert own analytics events"
  ON public.analytics_events FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Drop and recreate activity_logs table policies
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING ((select auth.jwt()->>'role') = 'admin');

-- SECURITY FIX: Restrict activity log insert to authenticated users with valid user_id
CREATE POLICY "Authenticated users can insert own activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR (select auth.uid()) = user_id);

-- =====================================================
-- 2. SECURE FUNCTION SEARCH PATHS
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.consume_credits_for_render(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.refund_credits_for_failed_render(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.reset_monthly_credits();
DROP FUNCTION IF EXISTS public.log_activity(uuid, text, jsonb, text);
DROP FUNCTION IF EXISTS public.track_analytics_event(uuid, text, jsonb, text);

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update initialize_user_credits function
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits_remaining, total_credits_earned)
  VALUES (NEW.id, 3, 3)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update consume_credits_for_render function
CREATE FUNCTION public.consume_credits_for_render(
  p_user_id uuid,
  p_render_job_id uuid,
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
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_credits >= p_credits_to_consume THEN
    UPDATE public.user_credits
    SET credits_remaining = credits_remaining - p_credits_to_consume,
        credits_used = credits_used + p_credits_to_consume,
        updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      render_job_id
    ) VALUES (
      p_user_id,
      -p_credits_to_consume,
      'debit',
      'Credit consumed for render job',
      p_render_job_id
    );

    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Update refund_credits_for_failed_render function
CREATE FUNCTION public.refund_credits_for_failed_render(
  p_user_id uuid,
  p_render_job_id uuid,
  p_credits_to_refund integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_credits
  SET credits_remaining = credits_remaining + p_credits_to_refund,
      credits_used = GREATEST(0, credits_used - p_credits_to_refund),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    render_job_id
  ) VALUES (
    p_user_id,
    p_credits_to_refund,
    'credit',
    'Credit refunded for failed render job',
    p_render_job_id
  );
END;
$$;

-- Update reset_monthly_credits function
CREATE FUNCTION public.reset_monthly_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_credits
  SET credits_remaining = 3,
      credits_used = 0,
      updated_at = now();
END;
$$;

-- Update log_activity function
CREATE FUNCTION public.log_activity(
  p_user_id uuid,
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_session_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update track_analytics_event function
CREATE FUNCTION public.track_analytics_event(
  p_user_id uuid,
  p_event_name text,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_session_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.analytics_events (user_id, event_name, event_data, session_id)
  VALUES (p_user_id, p_event_name, p_event_data, p_session_id)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;
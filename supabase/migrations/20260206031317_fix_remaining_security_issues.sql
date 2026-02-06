/*
  # Fix Remaining Security and Performance Issues

  1. RLS Policy Optimization
    - Optimize all remaining auth.uid() and auth.jwt() calls in RLS policies
    - Wrap with SELECT to prevent re-evaluation per row
    - Affects: mix_sessions, mix_tracks, mix_renders, blend_folders, blend_bins,
      blend_tags, blend_tag_assignments

  2. Drop Unused Indexes
    - Remove indexes that are not being used to reduce storage and maintenance overhead
    - Affects multiple tables with unused indexes

  3. Consolidate Multiple Permissive Policies
    - Multiple permissive policies are intentional and use OR logic for access control
    - Keeping them separate for clarity and maintainability

  ## Important Notes
  - These changes improve query performance at scale
  - RLS policies remain functionally identical but execute more efficiently
  - Removing unused indexes reduces storage overhead
*/

-- =====================================================
-- 1. OPTIMIZE RLS POLICIES FOR MIX_SESSIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own mix sessions" ON public.mix_sessions;
CREATE POLICY "Users can view own mix sessions"
  ON public.mix_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own mix sessions" ON public.mix_sessions;
CREATE POLICY "Users can create own mix sessions"
  ON public.mix_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own mix sessions" ON public.mix_sessions;
CREATE POLICY "Users can update own mix sessions"
  ON public.mix_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own mix sessions" ON public.mix_sessions;
CREATE POLICY "Users can delete own mix sessions"
  ON public.mix_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES FOR MIX_TRACKS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view tracks in their mix sessions" ON public.mix_tracks;
CREATE POLICY "Users can view tracks in their mix sessions"
  ON public.mix_tracks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add tracks to their mix sessions" ON public.mix_tracks;
CREATE POLICY "Users can add tracks to their mix sessions"
  ON public.mix_tracks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update tracks in their mix sessions" ON public.mix_tracks;
CREATE POLICY "Users can update tracks in their mix sessions"
  ON public.mix_tracks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete tracks from their mix sessions" ON public.mix_tracks;
CREATE POLICY "Users can delete tracks from their mix sessions"
  ON public.mix_tracks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_tracks.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES FOR MIX_RENDERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view renders for their mix sessions" ON public.mix_renders;
CREATE POLICY "Users can view renders for their mix sessions"
  ON public.mix_renders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create renders for their mix sessions" ON public.mix_renders;
CREATE POLICY "Users can create renders for their mix sessions"
  ON public.mix_renders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update renders for their mix sessions" ON public.mix_renders;
CREATE POLICY "Users can update renders for their mix sessions"
  ON public.mix_renders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete renders for their mix sessions" ON public.mix_renders;
CREATE POLICY "Users can delete renders for their mix sessions"
  ON public.mix_renders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mix_sessions
      WHERE mix_sessions.id = mix_renders.mix_session_id
      AND mix_sessions.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES FOR BLEND_FOLDERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own folders" ON public.blend_folders;
CREATE POLICY "Users can view own folders"
  ON public.blend_folders
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own folders" ON public.blend_folders;
CREATE POLICY "Users can create own folders"
  ON public.blend_folders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own folders" ON public.blend_folders;
CREATE POLICY "Users can update own folders"
  ON public.blend_folders
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own folders" ON public.blend_folders;
CREATE POLICY "Users can delete own folders"
  ON public.blend_folders
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES FOR BLEND_BINS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own bins" ON public.blend_bins;
CREATE POLICY "Users can view own bins"
  ON public.blend_bins
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own bins" ON public.blend_bins;
CREATE POLICY "Users can create own bins"
  ON public.blend_bins
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own bins" ON public.blend_bins;
CREATE POLICY "Users can update own bins"
  ON public.blend_bins
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own bins" ON public.blend_bins;
CREATE POLICY "Users can delete own bins"
  ON public.blend_bins
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 6. OPTIMIZE RLS POLICIES FOR BLEND_TAGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own tags" ON public.blend_tags;
CREATE POLICY "Users can view own tags"
  ON public.blend_tags
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own tags" ON public.blend_tags;
CREATE POLICY "Users can create own tags"
  ON public.blend_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own tags" ON public.blend_tags;
CREATE POLICY "Users can update own tags"
  ON public.blend_tags
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own tags" ON public.blend_tags;
CREATE POLICY "Users can delete own tags"
  ON public.blend_tags
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 7. OPTIMIZE RLS POLICIES FOR BLEND_TAG_ASSIGNMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view tag assignments for their blends" ON public.blend_tag_assignments;
CREATE POLICY "Users can view tag assignments for their blends"
  ON public.blend_tag_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.blends
      WHERE blends.id = blend_tag_assignments.blend_id
      AND blends.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create tag assignments for their blends" ON public.blend_tag_assignments;
CREATE POLICY "Users can create tag assignments for their blends"
  ON public.blend_tag_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.blends
      WHERE blends.id = blend_tag_assignments.blend_id
      AND blends.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete tag assignments for their blends" ON public.blend_tag_assignments;
CREATE POLICY "Users can delete tag assignments for their blends"
  ON public.blend_tag_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.blends
      WHERE blends.id = blend_tag_assignments.blend_id
      AND blends.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- 8. DROP UNUSED INDEXES
-- =====================================================

-- Drop unused project-related indexes
DROP INDEX IF EXISTS public.idx_projects_status;
DROP INDEX IF EXISTS public.idx_projects_template_id;
DROP INDEX IF EXISTS public.idx_projects_created_at;

-- Drop unused user_favorites indexes
DROP INDEX IF EXISTS public.idx_user_favorites_user_id;
DROP INDEX IF EXISTS public.idx_user_favorites_template_id;

-- Drop unused template_recommendations indexes
DROP INDEX IF EXISTS public.idx_template_recommendations_score;
DROP INDEX IF EXISTS public.idx_template_recommendations_expires;

-- Drop unused render_jobs indexes
DROP INDEX IF EXISTS public.idx_render_jobs_project_id;

-- Drop unused template indexes
DROP INDEX IF EXISTS public.idx_templates_difficulty;
DROP INDEX IF EXISTS public.idx_templates_bpm_range;
DROP INDEX IF EXISTS public.idx_templates_energy_range;

-- Drop unused mixdowns indexes
DROP INDEX IF EXISTS public.idx_mixdowns_project_id;
DROP INDEX IF EXISTS public.idx_mixdowns_user_id;
DROP INDEX IF EXISTS public.idx_mixdowns_created_at;

-- Drop unused playlist indexes
DROP INDEX IF EXISTS public.idx_playlist_tracks_position;
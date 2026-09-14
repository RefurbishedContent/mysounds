/*
  # Mash Up Render Batches

  Tracks a single Confirm-click batch from the Create New Mash Up wizard so the
  UI can resume after reload, StrictMode remount, or navigation away.

  ## New table
  - `mash_up_render_batches` — one row per Confirm click.
    - `render_request_id` (uuid) is the stable identity that gets passed to
      `render-blend` for every pair in the batch. It is idempotent per pair via
      the (user_id, render_request_id, transition_id) unique index on
      `blend_render_jobs`, so replaying does not re-charge.
    - `transition_ids` (uuid[]) is the ordered pair list.
    - `completed_blend_ids` (uuid[]) accumulates blend IDs as they finish.

  ## Security
  - RLS enabled. Each user can only see and mutate their own rows.
  - No `FOR ALL`; per-verb policies.

  ## Data safety
  - Purely additive.
*/

CREATE TABLE IF NOT EXISTS public.mash_up_render_batches (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mash_up_group        text NOT NULL,
  render_request_id    uuid NOT NULL,
  transition_ids       uuid[] NOT NULL,
  completed_blend_ids  uuid[] NOT NULL DEFAULT '{}',
  status               text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','complete','abandoned')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mash_up_render_batches_request_idx
  ON public.mash_up_render_batches (user_id, render_request_id);

CREATE INDEX IF NOT EXISTS mash_up_render_batches_group_idx
  ON public.mash_up_render_batches (user_id, mash_up_group, status);

CREATE OR REPLACE FUNCTION public.mash_up_render_batches_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mash_up_render_batches_updated_at ON public.mash_up_render_batches;
CREATE TRIGGER trg_mash_up_render_batches_updated_at
  BEFORE UPDATE ON public.mash_up_render_batches
  FOR EACH ROW EXECUTE FUNCTION public.mash_up_render_batches_touch_updated_at();

ALTER TABLE public.mash_up_render_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select own mash_up_render_batches" ON public.mash_up_render_batches;
CREATE POLICY "select own mash_up_render_batches"
  ON public.mash_up_render_batches FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "insert own mash_up_render_batches" ON public.mash_up_render_batches;
CREATE POLICY "insert own mash_up_render_batches"
  ON public.mash_up_render_batches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "update own mash_up_render_batches" ON public.mash_up_render_batches;
CREATE POLICY "update own mash_up_render_batches"
  ON public.mash_up_render_batches FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "delete own mash_up_render_batches" ON public.mash_up_render_batches;
CREATE POLICY "delete own mash_up_render_batches"
  ON public.mash_up_render_batches FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

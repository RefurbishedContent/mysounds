/*
  # Blend render job queue + transactional RPCs

  Adds a durable queue for blend renders plus five hardened SECURITY DEFINER
  RPCs (enqueue, claim, heartbeat, complete, fail) so the audio worker can
  process renders with lease-based, retry-safe control.

  ## Tables added
  - `blend_render_jobs` — one row per render request. Immutable spec/hash/engine
    columns, lease-based worker checkout, attempt counter, status machine.

  ## Columns added
  - `blends.render_job_id uuid` — nullable pointer back to the owning job.

  ## Functions added (all SECURITY DEFINER, search_path locked)
  - `public.enqueue_blend_render(...)` — authenticated only. Creates blend +
    job atomically; idempotent on `(user_id, render_request_id, transition_id)`.
  - `public.claim_blend_render(...)` — service_role only. FOR UPDATE SKIP
    LOCKED. Picks queued jobs and recovers expired leases in one pass.
  - `public.heartbeat_blend_render(...)` — service_role only. Requires the
    current lease token.
  - `public.complete_blend_render(...)` — service_role only. Atomically marks
    the job complete and mirrors the result onto blends + transitions.
  - `public.fail_blend_render(...)` — service_role only. Retries with backoff
    up to max_attempts, then marks failed.

  ## Security
  - `blend_render_jobs` has RLS enabled. Only SELECT-own is granted to
    `authenticated`. INSERT/UPDATE/DELETE are revoked from `authenticated` and
    `anon` — the browser cannot mutate rows.
  - Worker RPCs are `REVOKE ALL ... FROM PUBLIC` and granted only to
    `service_role`. Enqueue RPC is granted to `authenticated` only.

  ## Data safety
  - Purely additive. No DROP, no column removal, no data mutation on existing
    rows. Existing blends policies are left untouched.

  ## Deployment
  - Apply via `mcp__supabase__apply_migration` (used here) or, locally, via
    `supabase db push` / `supabase migration up`. The Supabase CLI is not
    required in the hosted environment.

  ## Rollback (manual, not automatic)
    DROP FUNCTION public.fail_blend_render(uuid, uuid, text, text, integer);
    DROP FUNCTION public.complete_blend_render(uuid, uuid, jsonb);
    DROP FUNCTION public.heartbeat_blend_render(uuid, uuid, text, integer);
    DROP FUNCTION public.claim_blend_render(text, integer, integer);
    DROP FUNCTION public.enqueue_blend_render(uuid, jsonb, text, text, uuid, text, jsonb);
    ALTER TABLE public.blends DROP CONSTRAINT IF EXISTS blends_render_job_id_fkey;
    ALTER TABLE public.blends DROP COLUMN IF EXISTS render_job_id;
    DROP TABLE IF EXISTS public.blend_render_jobs;
*/

-- ============================================================================
-- 1. Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blend_render_jobs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blend_id           uuid NOT NULL,
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  render_request_id  uuid NOT NULL,
  transition_id      uuid NOT NULL REFERENCES public.transitions(id) ON DELETE CASCADE,
  render_spec        jsonb NOT NULL,
  request_hash       text NOT NULL,
  engine_version     text NOT NULL,
  status             text NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued','processing','completed','failed')),
  stage              text,
  attempts           integer NOT NULL DEFAULT 0,
  max_attempts       integer NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  available_at       timestamptz NOT NULL DEFAULT now(),
  lease_token        uuid,
  lease_expires_at   timestamptz,
  last_heartbeat_at  timestamptz,
  error_code         text,
  error_message      text,
  result             jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS blend_render_jobs_dedup_idx
  ON public.blend_render_jobs (user_id, render_request_id, transition_id);

CREATE INDEX IF NOT EXISTS blend_render_jobs_claim_idx
  ON public.blend_render_jobs (status, available_at);

CREATE INDEX IF NOT EXISTS blend_render_jobs_blend_id_idx
  ON public.blend_render_jobs (blend_id);

CREATE INDEX IF NOT EXISTS blend_render_jobs_user_created_idx
  ON public.blend_render_jobs (user_id, created_at DESC);

-- ============================================================================
-- 2. Additive pointer on blends (nullable, preserves all existing rows)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blends'
      AND column_name = 'render_job_id'
  ) THEN
    ALTER TABLE public.blends
      ADD COLUMN render_job_id uuid
        REFERENCES public.blend_render_jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Deferred FK so enqueue can insert blend + job in one transaction.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blend_render_jobs_blend_id_fkey'
  ) THEN
    ALTER TABLE public.blend_render_jobs
      ADD CONSTRAINT blend_render_jobs_blend_id_fkey
        FOREIGN KEY (blend_id) REFERENCES public.blends(id) ON DELETE CASCADE
        DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- ============================================================================
-- 3. Triggers: updated_at + immutable field guard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.blend_render_jobs_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blend_render_jobs_updated_at ON public.blend_render_jobs;
CREATE TRIGGER trg_blend_render_jobs_updated_at
  BEFORE UPDATE ON public.blend_render_jobs
  FOR EACH ROW EXECUTE FUNCTION public.blend_render_jobs_touch_updated_at();

CREATE OR REPLACE FUNCTION public.blend_render_jobs_guard_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.render_spec       IS DISTINCT FROM OLD.render_spec       THEN
    RAISE EXCEPTION 'immutable_field:render_spec';
  END IF;
  IF NEW.request_hash      IS DISTINCT FROM OLD.request_hash      THEN
    RAISE EXCEPTION 'immutable_field:request_hash';
  END IF;
  IF NEW.engine_version    IS DISTINCT FROM OLD.engine_version    THEN
    RAISE EXCEPTION 'immutable_field:engine_version';
  END IF;
  IF NEW.blend_id          IS DISTINCT FROM OLD.blend_id          THEN
    RAISE EXCEPTION 'immutable_field:blend_id';
  END IF;
  IF NEW.user_id           IS DISTINCT FROM OLD.user_id           THEN
    RAISE EXCEPTION 'immutable_field:user_id';
  END IF;
  IF NEW.transition_id     IS DISTINCT FROM OLD.transition_id     THEN
    RAISE EXCEPTION 'immutable_field:transition_id';
  END IF;
  IF NEW.render_request_id IS DISTINCT FROM OLD.render_request_id THEN
    RAISE EXCEPTION 'immutable_field:render_request_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blend_render_jobs_immutable ON public.blend_render_jobs;
CREATE TRIGGER trg_blend_render_jobs_immutable
  BEFORE UPDATE ON public.blend_render_jobs
  FOR EACH ROW EXECUTE FUNCTION public.blend_render_jobs_guard_immutable();

-- ============================================================================
-- 4. RLS
-- ============================================================================

ALTER TABLE public.blend_render_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blend render jobs" ON public.blend_render_jobs;
CREATE POLICY "Users can view own blend render jobs"
  ON public.blend_render_jobs
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Deliberately no INSERT / UPDATE / DELETE policies for authenticated or anon.
-- All mutations go through the SECURITY DEFINER RPCs below.

REVOKE INSERT, UPDATE, DELETE ON public.blend_render_jobs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.blend_render_jobs FROM anon;
REVOKE ALL ON public.blend_render_jobs FROM PUBLIC;
GRANT SELECT ON public.blend_render_jobs TO authenticated;

-- ============================================================================
-- 5. Enqueue (authenticated caller)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_blend_render(
  p_transition_id     uuid,
  p_render_spec       jsonb,
  p_request_hash      text,
  p_engine_version    text,
  p_render_request_id uuid,
  p_blend_name        text  DEFAULT 'Untitled Blend',
  p_export_settings   jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (blend_id uuid, render_job_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_trans       public.transitions%ROWTYPE;
  v_existing    public.blend_render_jobs%ROWTYPE;
  v_blend_id    uuid;
  v_job_id      uuid;
  v_song_a_id   uuid;
  v_song_b_id   uuid;
  v_transition_duration integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_render_spec IS NULL
     OR (p_render_spec ->> 'version') IS NULL
     OR (p_render_spec ->> 'version')::int <> 1 THEN
    RAISE EXCEPTION 'invalid_render_spec';
  END IF;

  IF p_request_hash IS NULL OR length(p_request_hash) = 0 THEN
    RAISE EXCEPTION 'invalid_request_hash';
  END IF;

  IF p_engine_version IS NULL OR length(p_engine_version) = 0 THEN
    RAISE EXCEPTION 'invalid_engine_version';
  END IF;

  SELECT * INTO v_trans
    FROM public.transitions
    WHERE id = p_transition_id;

  IF NOT FOUND OR v_trans.user_id <> v_uid THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Idempotent short-circuit
  SELECT * INTO v_existing
    FROM public.blend_render_jobs
    WHERE user_id           = v_uid
      AND render_request_id = p_render_request_id
      AND transition_id     = p_transition_id;

  IF FOUND THEN
    blend_id      := v_existing.blend_id;
    render_job_id := v_existing.id;
    RETURN NEXT;
    RETURN;
  END IF;

  v_song_a_id := v_trans.song_a_id;
  v_song_b_id := v_trans.song_b_id;
  v_transition_duration := COALESCE(v_trans.transition_duration::int, 12);

  INSERT INTO public.blends (
    user_id, transition_id, name,
    song_a_id, song_b_id,
    url, filename, duration, file_size,
    status, export_settings,
    song_a_duration_contribution, song_b_duration_contribution,
    transition_duration
  ) VALUES (
    v_uid, p_transition_id, COALESCE(p_blend_name, 'Untitled Blend'),
    v_song_a_id, v_song_b_id,
    '', '', 0, 0,
    'processing', COALESCE(p_export_settings, '{}'::jsonb),
    0, 0,
    v_transition_duration
  )
  RETURNING id INTO v_blend_id;

  INSERT INTO public.blend_render_jobs (
    blend_id, user_id, render_request_id, transition_id,
    render_spec, request_hash, engine_version,
    status, attempts, max_attempts, available_at
  ) VALUES (
    v_blend_id, v_uid, p_render_request_id, p_transition_id,
    p_render_spec, p_request_hash, p_engine_version,
    'queued', 0, 3, now()
  )
  RETURNING id INTO v_job_id;

  UPDATE public.blends
     SET render_job_id = v_job_id,
         updated_at    = now()
   WHERE id = v_blend_id;

  blend_id      := v_blend_id;
  render_job_id := v_job_id;
  RETURN NEXT;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    -- Race with a concurrent enqueue — return whatever landed.
    SELECT id, blend_id INTO v_job_id, v_blend_id
      FROM public.blend_render_jobs
      WHERE user_id           = v_uid
        AND render_request_id = p_render_request_id
        AND transition_id     = p_transition_id;
    blend_id      := v_blend_id;
    render_job_id := v_job_id;
    RETURN NEXT;
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_blend_render(uuid, jsonb, text, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_blend_render(uuid, jsonb, text, text, uuid, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.enqueue_blend_render(uuid, jsonb, text, text, uuid, text, jsonb) TO authenticated;

-- ============================================================================
-- 6. Claim (service_role only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_blend_render(
  p_worker_id      text,
  p_lease_seconds  integer DEFAULT 90,
  p_batch          integer DEFAULT 1
)
RETURNS TABLE (
  id                uuid,
  blend_id          uuid,
  user_id           uuid,
  transition_id     uuid,
  render_spec       jsonb,
  request_hash      text,
  engine_version    text,
  attempts          integer,
  max_attempts      integer,
  lease_token       uuid,
  lease_expires_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_lease_seconds IS NULL OR p_lease_seconds < 10 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'invalid_lease_seconds';
  END IF;

  IF p_batch IS NULL OR p_batch < 1 OR p_batch > 25 THEN
    RAISE EXCEPTION 'invalid_batch';
  END IF;

  RETURN QUERY
  WITH picked AS (
    SELECT j.id
      FROM public.blend_render_jobs j
     WHERE (j.status = 'queued'     AND j.available_at   <= now())
        OR (j.status = 'processing' AND j.lease_expires_at IS NOT NULL
                                    AND j.lease_expires_at < now())
     ORDER BY j.available_at ASC, j.created_at ASC
     FOR UPDATE SKIP LOCKED
     LIMIT p_batch
  ),
  updated AS (
    UPDATE public.blend_render_jobs j
       SET status            = 'processing',
           attempts          = j.attempts + 1,
           lease_token       = gen_random_uuid(),
           lease_expires_at  = now() + make_interval(secs => p_lease_seconds),
           last_heartbeat_at = now(),
           stage             = COALESCE(NULLIF(p_worker_id, ''), 'claimed'),
           error_code        = NULL,
           error_message     = NULL
      FROM picked
     WHERE j.id = picked.id
     RETURNING j.id, j.blend_id, j.user_id, j.transition_id,
               j.render_spec, j.request_hash, j.engine_version,
               j.attempts, j.max_attempts,
               j.lease_token, j.lease_expires_at
  )
  SELECT * FROM updated;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_blend_render(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_blend_render(text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_blend_render(text, integer, integer) TO service_role;

-- ============================================================================
-- 7. Heartbeat (service_role only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.heartbeat_blend_render(
  p_job_id         uuid,
  p_lease_token    uuid,
  p_stage          text    DEFAULT NULL,
  p_lease_seconds  integer DEFAULT 90
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_new_expiry timestamptz;
BEGIN
  IF NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_lease_seconds IS NULL OR p_lease_seconds < 10 OR p_lease_seconds > 3600 THEN
    RAISE EXCEPTION 'invalid_lease_seconds';
  END IF;

  UPDATE public.blend_render_jobs
     SET last_heartbeat_at = now(),
         lease_expires_at  = now() + make_interval(secs => p_lease_seconds),
         stage             = COALESCE(p_stage, stage)
   WHERE id           = p_job_id
     AND status       = 'processing'
     AND lease_token  = p_lease_token
   RETURNING lease_expires_at INTO v_new_expiry;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'stale_lease';
  END IF;

  RETURN v_new_expiry;
END;
$$;

REVOKE ALL ON FUNCTION public.heartbeat_blend_render(uuid, uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.heartbeat_blend_render(uuid, uuid, text, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_blend_render(uuid, uuid, text, integer) TO service_role;

-- ============================================================================
-- 8. Complete (service_role only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_blend_render(
  p_job_id      uuid,
  p_lease_token uuid,
  p_result      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_job public.blend_render_jobs%ROWTYPE;
BEGIN
  IF NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_result IS NULL THEN
    RAISE EXCEPTION 'invalid_result';
  END IF;

  SELECT * INTO v_job
    FROM public.blend_render_jobs
   WHERE id = p_job_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_job.status IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'terminal_state';
  END IF;

  IF v_job.lease_token IS DISTINCT FROM p_lease_token
     OR v_job.status <> 'processing' THEN
    RAISE EXCEPTION 'stale_lease';
  END IF;

  UPDATE public.blend_render_jobs
     SET status           = 'completed',
         stage            = 'completed',
         result           = p_result,
         lease_token      = NULL,
         lease_expires_at = NULL,
         completed_at     = now(),
         error_code       = NULL,
         error_message    = NULL
   WHERE id = p_job_id;

  UPDATE public.blends
     SET status                       = 'completed',
         url                          = COALESCE(NULLIF(p_result ->> 'url', ''), url),
         filename                     = COALESCE(NULLIF(p_result ->> 'filename', ''), filename),
         duration                     = COALESCE((p_result ->> 'duration')::int, duration),
         file_size                    = COALESCE((p_result ->> 'file_size')::bigint, file_size),
         format                       = COALESCE(NULLIF(p_result ->> 'format', ''), format),
         quality                      = COALESCE(NULLIF(p_result ->> 'quality', ''), quality),
         sample_rate                  = COALESCE((p_result ->> 'sample_rate')::int, sample_rate),
         bit_depth                    = COALESCE((p_result ->> 'bit_depth')::int, bit_depth),
         song_a_duration_contribution = COALESCE((p_result ->> 'song_a_duration_contribution')::int, song_a_duration_contribution),
         song_b_duration_contribution = COALESCE((p_result ->> 'song_b_duration_contribution')::int, song_b_duration_contribution),
         transition_duration          = COALESCE((p_result ->> 'transition_duration')::int, transition_duration),
         template_name                = COALESCE(NULLIF(p_result ->> 'template_name', ''), template_name),
         updated_at                   = now()
   WHERE id = v_job.blend_id;

  UPDATE public.transitions
     SET status                   = 'completed',
         rendered_at              = now(),
         render_duration_seconds  = COALESCE((p_result ->> 'render_duration_seconds')::numeric, render_duration_seconds),
         output_file_size         = COALESCE((p_result ->> 'file_size')::bigint, output_file_size),
         output_url               = COALESCE(NULLIF(p_result ->> 'url', ''), output_url),
         render_error_message     = NULL,
         updated_at               = now()
   WHERE id = v_job.transition_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_blend_render(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_blend_render(uuid, uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_blend_render(uuid, uuid, jsonb) TO service_role;

-- ============================================================================
-- 9. Fail / retry (service_role only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fail_blend_render(
  p_job_id           uuid,
  p_lease_token      uuid,
  p_error_code       text,
  p_error_message    text,
  p_retry_in_seconds integer DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_job         public.blend_render_jobs%ROWTYPE;
  v_next_status text;
  v_backoff     integer;
BEGIN
  IF NOT pg_has_role(current_user, 'service_role', 'MEMBER') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_job
    FROM public.blend_render_jobs
   WHERE id = p_job_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_job.status IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'terminal_state';
  END IF;

  IF v_job.lease_token IS DISTINCT FROM p_lease_token
     OR v_job.status <> 'processing' THEN
    RAISE EXCEPTION 'stale_lease';
  END IF;

  IF v_job.attempts < v_job.max_attempts THEN
    v_backoff := COALESCE(
      p_retry_in_seconds,
      LEAST(300, 15 * (2 ^ GREATEST(v_job.attempts - 1, 0))::integer)
    );

    UPDATE public.blend_render_jobs
       SET status           = 'queued',
           available_at     = now() + make_interval(secs => v_backoff),
           lease_token      = NULL,
           lease_expires_at = NULL,
           error_code       = p_error_code,
           error_message    = p_error_message
     WHERE id = p_job_id;

    v_next_status := 'queued';
  ELSE
    UPDATE public.blend_render_jobs
       SET status           = 'failed',
           completed_at     = now(),
           lease_token      = NULL,
           lease_expires_at = NULL,
           error_code       = p_error_code,
           error_message    = p_error_message
     WHERE id = p_job_id;

    UPDATE public.blends
       SET status     = 'failed',
           updated_at = now()
     WHERE id = v_job.blend_id;

    UPDATE public.transitions
       SET status               = 'failed',
           render_error_message = p_error_message,
           updated_at           = now()
     WHERE id = v_job.transition_id;

    v_next_status := 'failed';
  END IF;

  RETURN v_next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_blend_render(uuid, uuid, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_blend_render(uuid, uuid, text, text, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_blend_render(uuid, uuid, text, text, integer) TO service_role;

/*
  # Add catalog eligibility flags to tracks

  Adds two nullable/defaulted columns so the operator can mark artist-catalog
  tracks as eligible for rendering without transferring ownership. The
  render-blend edge function uses these to decide source-song eligibility.

  ## Changes
  - `tracks.is_catalog boolean NOT NULL DEFAULT false` — flags a track as
    part of the approved artist catalog.
  - `tracks.catalog_visibility text` — 'private' (default when catalog) or
    'public'. Only 'public' catalog tracks are usable by non-owners.

  ## Data safety
  Purely additive. Every existing row keeps `is_catalog=false`, so nothing
  changes for existing "your own uploads" flows.

  ## Deployment
  Apply via `mcp__supabase__apply_migration` or `supabase db push`.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'is_catalog'
  ) THEN
    ALTER TABLE public.tracks
      ADD COLUMN is_catalog boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracks' AND column_name = 'catalog_visibility'
  ) THEN
    ALTER TABLE public.tracks
      ADD COLUMN catalog_visibility text
        CHECK (catalog_visibility IS NULL OR catalog_visibility IN ('private','public'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS tracks_catalog_public_idx
  ON public.tracks (is_catalog, catalog_visibility)
  WHERE is_catalog = true;

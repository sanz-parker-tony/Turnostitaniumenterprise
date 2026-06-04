-- Stores the operational time zone configured for each physical work location.
-- Idempotent migration.

ALTER TABLE IF EXISTS public.work_locations
  ADD COLUMN IF NOT EXISTS time_zone character varying(80) DEFAULT 'America/Guayaquil';

UPDATE public.work_locations
SET time_zone = 'America/Guayaquil'
WHERE time_zone IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'work_locations_time_zone_not_blank_chk'
  ) THEN
    ALTER TABLE public.work_locations
      ADD CONSTRAINT work_locations_time_zone_not_blank_chk
      CHECK (time_zone IS NULL OR btrim(time_zone) <> '');
  END IF;
END $$;

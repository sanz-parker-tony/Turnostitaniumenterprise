-- Stores the effective time zone used to present each time punch historically.
-- Idempotent migration.

ALTER TABLE IF EXISTS public.employee_time_punches
  ADD COLUMN IF NOT EXISTS punch_time_zone character varying(80) DEFAULT 'America/Guayaquil';

UPDATE public.employee_time_punches
SET punch_time_zone = 'America/Guayaquil'
WHERE punch_time_zone IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_time_punches_punch_time_zone_not_blank_chk'
  ) THEN
    ALTER TABLE public.employee_time_punches
      ADD CONSTRAINT employee_time_punches_punch_time_zone_not_blank_chk
      CHECK (punch_time_zone IS NULL OR btrim(punch_time_zone) <> '');
  END IF;
END $$;

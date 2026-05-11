-- Adds geolocation fields to employee_time_punches.
-- Idempotent migration.

ALTER TABLE IF EXISTS public.employee_time_punches
  ADD COLUMN IF NOT EXISTS latitud double precision;

ALTER TABLE IF EXISTS public.employee_time_punches
  ADD COLUMN IF NOT EXISTS longitud double precision;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_time_punches_latitud_chk'
  ) THEN
    ALTER TABLE public.employee_time_punches
      ADD CONSTRAINT employee_time_punches_latitud_chk
      CHECK (latitud IS NULL OR (latitud >= -90 AND latitud <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_time_punches_longitud_chk'
  ) THEN
    ALTER TABLE public.employee_time_punches
      ADD CONSTRAINT employee_time_punches_longitud_chk
      CHECK (longitud IS NULL OR (longitud >= -180 AND longitud <= 180));
  END IF;
END $$;

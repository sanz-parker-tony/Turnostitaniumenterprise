-- ============================================================================
-- 029_ADD_SHIFT_COLORS
-- Agrega colores configurables por turno para usar en planificación y kiosko.
-- Idempotente.
-- ============================================================================

SET search_path TO public;

ALTER TABLE IF EXISTS public.shifts
  ADD COLUMN IF NOT EXISTS shift_bg_color character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.shifts
  ADD COLUMN IF NOT EXISTS shift_text_color character varying COLLATE pg_catalog."default";

UPDATE public.shifts
SET shift_bg_color = CASE UPPER(COALESCE(shift_icon_key, ''))
  WHEN 'SUN' THEN '#E3F2FD'
  WHEN 'SUNSET' THEN '#FFF3E0'
  WHEN 'MOON' THEN '#EDE7F6'
  WHEN 'BRIEFCASE' THEN '#EEF2F7'
  WHEN 'COFFEE' THEN '#F3F4F6'
  WHEN 'BELLRING' THEN '#FEE2E2'
  WHEN 'SIREN' THEN '#FEE2E2'
  WHEN 'AMBULANCE' THEN '#EFF6FF'
  WHEN 'SHIELD' THEN '#ECFEFF'
  WHEN 'WRENCH' THEN '#ECFDF5'
  WHEN 'TRUCK' THEN '#FFFBEB'
  WHEN 'FLAME' THEN '#FFF7ED'
  ELSE '#F1F5F9'
END
WHERE COALESCE(shift_bg_color, '') = '';

UPDATE public.shifts
SET shift_text_color = CASE UPPER(COALESCE(shift_icon_key, ''))
  WHEN 'SUN' THEN '#1E3A8A'
  WHEN 'SUNSET' THEN '#9A3412'
  WHEN 'MOON' THEN '#4C1D95'
  WHEN 'BRIEFCASE' THEN '#1F2937'
  WHEN 'COFFEE' THEN '#374151'
  WHEN 'BELLRING' THEN '#991B1B'
  WHEN 'SIREN' THEN '#991B1B'
  WHEN 'AMBULANCE' THEN '#1E3A8A'
  WHEN 'SHIELD' THEN '#0E7490'
  WHEN 'WRENCH' THEN '#0F766E'
  WHEN 'TRUCK' THEN '#92400E'
  WHEN 'FLAME' THEN '#9A3412'
  ELSE '#0F172A'
END
WHERE COALESCE(shift_text_color, '') = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shifts_shift_bg_color_hex_chk'
  ) THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT shifts_shift_bg_color_hex_chk
      CHECK (
        shift_bg_color IS NULL
        OR shift_bg_color ~ '^#[0-9A-Fa-f]{6}$'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shifts_shift_text_color_hex_chk'
  ) THEN
    ALTER TABLE public.shifts
      ADD CONSTRAINT shifts_shift_text_color_hex_chk
      CHECK (
        shift_text_color IS NULL
        OR shift_text_color ~ '^#[0-9A-Fa-f]{6}$'
      );
  END IF;
END $$;

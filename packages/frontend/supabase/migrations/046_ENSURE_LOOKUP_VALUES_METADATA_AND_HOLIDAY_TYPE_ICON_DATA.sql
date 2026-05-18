-- ============================================================================
-- 046_ENSURE_LOOKUP_VALUES_METADATA_AND_HOLIDAY_TYPE_ICON_DATA
-- Objetivo:
-- - Asegurar columna metadata en lookup_values.
-- - Persistir icon_key e icon_glyph para HOLIDAY_TYPE desde base de datos.
-- ============================================================================

SET search_path TO public;

ALTER TABLE IF EXISTS public.lookup_values
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'HOLIDAY_TYPE'
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.lookup_values lv
     SET metadata = COALESCE(lv.metadata, '{}'::jsonb) || jsonb_build_object(
       'icon_key', x.icon_key,
       'icon_glyph', x.icon_glyph
     ),
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM (
      VALUES
        ('BIRTHDAY', 'Cake', '🎂'),
        ('CIVIC', 'Flag', '🚩'),
        ('RELIGIOUS', 'Church', '⛪'),
        ('NATIONAL', 'Landmark', '🏛️'),
        ('MUNICIPAL', 'Building2', '🏢'),
        ('CORPORATE', 'BriefcaseBusiness', '💼'),
        ('COMMEMORATIVE', 'Ribbon', '🎗️'),
        ('CULTURAL', 'Theater', '🎭'),
        ('SPORTS', 'Trophy', '🏆'),
        ('OTHER', 'CalendarDays', '📅')
    ) AS x(lookup_key, icon_key, icon_glyph)
   WHERE lv.lookup_group_id = v_group_id
     AND UPPER(lv.lookup_key) = x.lookup_key;
END $$;

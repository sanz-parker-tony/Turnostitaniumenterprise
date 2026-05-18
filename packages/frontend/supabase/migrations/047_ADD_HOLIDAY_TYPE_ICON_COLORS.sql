-- ============================================================================
-- 047_ADD_HOLIDAY_TYPE_ICON_COLORS
-- Objetivo:
-- - Definir color de icono por tipo de feriado en lookup_values.metadata.
-- - Mantener presentacion 100% guiada por base de datos (sin hardcode frontend).
-- ============================================================================

SET search_path TO public;

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
       'icon_color', x.icon_color
     ),
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM (
      VALUES
        ('BIRTHDAY', '#f59e0b'),
        ('CIVIC', '#2563eb'),
        ('RELIGIOUS', '#7c3aed'),
        ('NATIONAL', '#1d4ed8'),
        ('MUNICIPAL', '#0f766e'),
        ('CORPORATE', '#374151'),
        ('COMMEMORATIVE', '#db2777'),
        ('CULTURAL', '#9333ea'),
        ('SPORTS', '#16a34a'),
        ('OTHER', '#0ea5e9')
    ) AS x(lookup_key, icon_color)
   WHERE lv.lookup_group_id = v_group_id
     AND UPPER(lv.lookup_key) = x.lookup_key;
END $$;

-- ============================================================================
-- 044_ADD_HOLIDAY_TYPE_LOOKUP_AND_COLUMN
-- Objetivo:
-- - Incorporar tipo de feriado (holiday_type) para mantenimiento de holidays.
-- - Cargar catalogo base en lookup_values.
-- - Soportar icono por tipo (metadata.icon_key) cuando exista columna metadata.
-- ============================================================================

SET search_path TO public;

-- 1) Lookup group HOLIDAY_TYPE
INSERT INTO public.lookup_groups (
  lookup_group_key,
  lookup_group_label,
  lookup_group_short_label,
  allows_tenant_items,
  is_active,
  created_by
)
VALUES (
  'HOLIDAY_TYPE',
  'Tipos de Feriado',
  'Tipo Feriado',
  false,
  true,
  'SYSTEM'
)
ON CONFLICT (lookup_group_key) DO UPDATE
SET
  lookup_group_label = EXCLUDED.lookup_group_label,
  lookup_group_short_label = EXCLUDED.lookup_group_short_label,
  is_active = true,
  updated_by = 'SYSTEM',
  updated_at = now();

-- 2) Lookup values base
INSERT INTO public.lookup_values (
  tenant_id,
  lookup_group_id,
  lookup_key,
  lookup_label,
  lookup_short_label,
  lookup_scope,
  sort_order,
  is_active,
  created_by
)
SELECT
  NULL,
  lg.id,
  vals.lookup_key,
  vals.lookup_label,
  vals.lookup_short_label,
  'SYSTEM',
  vals.sort_order,
  true,
  'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (
  VALUES
    ('BIRTHDAY', 'Cumpleanos', 'Cumpleanos', 10),
    ('CIVIC', 'Civico', 'Civico', 20),
    ('RELIGIOUS', 'Religioso', 'Religioso', 30),
    ('NATIONAL', 'Nacional', 'Nacional', 40),
    ('MUNICIPAL', 'Municipal', 'Municipal', 50),
    ('CORPORATE', 'Corporativo', 'Corporativo', 60),
    ('COMMEMORATIVE', 'Conmemoracion', 'Conmemoracion', 70),
    ('CULTURAL', 'Cultural', 'Cultural', 80),
    ('SPORTS', 'Deportivo', 'Deportivo', 90),
    ('OTHER', 'Otro', 'Otro', 100)
) AS vals(lookup_key, lookup_label, lookup_short_label, sort_order)
WHERE lg.lookup_group_key = 'HOLIDAY_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO UPDATE
SET
  lookup_label = EXCLUDED.lookup_label,
  lookup_short_label = EXCLUDED.lookup_short_label,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_by = 'SYSTEM',
  updated_at = now();

-- 3) Iconos en metadata (solo si lookup_values.metadata existe)
DO $$
DECLARE
  v_has_metadata boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lookup_values'
      AND column_name = 'metadata'
  ) INTO v_has_metadata;

  IF v_has_metadata THEN
    UPDATE public.lookup_values lv
       SET metadata = COALESCE(lv.metadata, '{}'::jsonb) || jsonb_build_object('icon_key', x.icon_key),
           updated_by = 'SYSTEM',
           updated_at = now()
      FROM public.lookup_groups lg
      JOIN (
        VALUES
          ('BIRTHDAY', 'Cake'),
          ('CIVIC', 'Flag'),
          ('RELIGIOUS', 'Church'),
          ('NATIONAL', 'Landmark'),
          ('MUNICIPAL', 'Building2'),
          ('CORPORATE', 'BriefcaseBusiness'),
          ('COMMEMORATIVE', 'Ribbon'),
          ('CULTURAL', 'Theater'),
          ('SPORTS', 'Trophy'),
          ('OTHER', 'CalendarDays')
      ) AS x(lookup_key, icon_key)
        ON true
     WHERE lg.lookup_group_key = 'HOLIDAY_TYPE'
       AND lv.lookup_group_id = lg.id
       AND UPPER(lv.lookup_key) = x.lookup_key;
  END IF;
END $$;

-- 4) Nueva columna en holidays
ALTER TABLE IF EXISTS public.holidays
  ADD COLUMN IF NOT EXISTS holiday_type_id uuid;

-- 5) FK a lookup_values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'holidays_holiday_type_id_fkey'
  ) THEN
    ALTER TABLE public.holidays
      ADD CONSTRAINT holidays_holiday_type_id_fkey
      FOREIGN KEY (holiday_type_id)
      REFERENCES public.lookup_values (id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;
  END IF;
END $$;

-- 6) Indice para busqueda
CREATE INDEX IF NOT EXISTS idx_holidays_holiday_type_id
  ON public.holidays (holiday_type_id);

-- ============================================================================
-- 045_SYNC_HOLIDAY_TYPE_VALUES_TO_10_ITEMS
-- Objetivo:
-- - Dejar exactamente 10 tipos de feriado activos en HOLIDAY_TYPE.
-- - Corregir etiquetas/sort_order e iconos.
-- - Desactivar valores legacy no contemplados.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_group_id uuid;
  v_has_metadata boolean;
BEGIN
  -- 1) Asegurar grupo
  SELECT id INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'HOLIDAY_TYPE'
  LIMIT 1;

  IF v_group_id IS NULL THEN
    INSERT INTO public.lookup_groups (
      id,
      lookup_group_key,
      lookup_group_label,
      lookup_group_short_label,
      allows_tenant_items,
      is_active,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      'HOLIDAY_TYPE',
      'Tipos de Feriado',
      'Tipo Feriado',
      false,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_group_id;
  END IF;

  -- 2) Upsert de los 10 valores requeridos
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
    v_group_id,
    x.lookup_key,
    x.lookup_label,
    x.lookup_short_label,
    'SYSTEM',
    x.sort_order,
    true,
    'SYSTEM'
  FROM (
    VALUES
      ('BIRTHDAY', 'Cumpleaños', 'Cumpleaños', 10),
      ('CIVIC', 'Cívico', 'Cívico', 20),
      ('RELIGIOUS', 'Religioso', 'Religioso', 30),
      ('NATIONAL', 'Nacional', 'Nacional', 40),
      ('MUNICIPAL', 'Municipal', 'Municipal', 50),
      ('CORPORATE', 'Corporativo', 'Corporativo', 60),
      ('COMMEMORATIVE', 'Conmemoración', 'Conmemoración', 70),
      ('CULTURAL', 'Cultural', 'Cultural', 80),
      ('SPORTS', 'Deportivo', 'Deportivo', 90),
      ('OTHER', 'Otro', 'Otro', 100)
  ) AS x(lookup_key, lookup_label, lookup_short_label, sort_order)
  ON CONFLICT ON CONSTRAINT uq_lookup_values
  DO UPDATE SET
    lookup_label = EXCLUDED.lookup_label,
    lookup_short_label = EXCLUDED.lookup_short_label,
    sort_order = EXCLUDED.sort_order,
    is_active = true,
    updated_by = 'SYSTEM',
    updated_at = now();

  -- 3) Desactivar cualquier valor extra/legacy del grupo (ej. LOCAL)
  UPDATE public.lookup_values lv
     SET is_active = false,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE lv.lookup_group_id = v_group_id
     AND UPPER(lv.lookup_key) NOT IN (
       'BIRTHDAY','CIVIC','RELIGIOUS','NATIONAL','MUNICIPAL',
       'CORPORATE','COMMEMORATIVE','CULTURAL','SPORTS','OTHER'
     )
     AND lv.is_active = true;

  -- 4) Iconos en metadata si existe columna
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
      FROM (
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
     WHERE lv.lookup_group_id = v_group_id
       AND UPPER(lv.lookup_key) = x.lookup_key;
  END IF;
END $$;

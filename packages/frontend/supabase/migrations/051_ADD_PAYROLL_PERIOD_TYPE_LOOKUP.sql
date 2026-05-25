-- ============================================================================
-- 051_ADD_PAYROLL_PERIOD_TYPE_LOOKUP
-- Objetivo:
-- - Crear/actualizar catalogo PAYROLL_PERIOD_TYPE para frecuencia de nomina.
-- - Incluir opciones: diario, semanal, quincenal y mensual.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id
    INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'PAYROLL_PERIOD_TYPE'
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
      'PAYROLL_PERIOD_TYPE',
      'Tipo de Periodo de Nomina',
      'Periodo Nomina',
      false,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_group_id;
  ELSE
    UPDATE public.lookup_groups
       SET lookup_group_label = 'Tipo de Periodo de Nomina',
           lookup_group_short_label = 'Periodo Nomina',
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_group_id;
  END IF;

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
      ('DAILY', 'Diario', 'Diario', 10),
      ('WEEKLY', 'Semanal', 'Semanal', 20),
      ('BIWEEKLY', 'Quincenal', 'Quincenal', 30),
      ('MONTHLY', 'Mensual', 'Mensual', 40)
  ) AS x(lookup_key, lookup_label, lookup_short_label, sort_order)
  ON CONFLICT ON CONSTRAINT uq_lookup_values
  DO UPDATE
     SET lookup_label = EXCLUDED.lookup_label,
         lookup_short_label = EXCLUDED.lookup_short_label,
         sort_order = EXCLUDED.sort_order,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now();
END $$;


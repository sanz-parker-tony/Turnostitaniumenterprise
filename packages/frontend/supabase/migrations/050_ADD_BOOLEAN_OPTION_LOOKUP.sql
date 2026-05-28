-- ============================================================================
-- 050_ADD_BOOLEAN_OPTION_LOOKUP
-- Objetivo:
-- - Crear/actualizar catalogo BOOLEAN_OPTION para valores True/False.
-- - Permitir su uso en parametros tipo LOOKUP.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id
    INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'BOOLEAN_OPTION'
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
      'BOOLEAN_OPTION',
      'Opciones Booleanas',
      'Booleano',
      false,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_group_id;
  ELSE
    UPDATE public.lookup_groups
       SET lookup_group_label = 'Opciones Booleanas',
           lookup_group_short_label = 'Booleano',
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
      ('TRUE', 'Verdadero', 'Si', 10),
      ('FALSE', 'Falso', 'No', 20)
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


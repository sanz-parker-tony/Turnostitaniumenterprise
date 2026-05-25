-- ============================================================================
-- 048_ADD_PUNCH_INCONSISTENCY_NOTIFICATION_TYPE
-- Objetivo:
-- - Registrar tipo de notificacion para depuracion de marcaciones.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id
    INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'USER_NOTIFICATION_TYPE'
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
      'USER_NOTIFICATION_TYPE',
      'Tipos de Notificacion Usuario',
      'Tipo Notificacion',
      false,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_group_id;
  END IF;

  INSERT INTO public.lookup_values (
    id,
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
    gen_random_uuid(),
    NULL,
    v_group_id,
    'PUNCH_INCONSISTENCY_DETECTED',
    'Inconsistencia de Marcacion Detectada',
    'Inconsistencia Marcacion',
    'SYSTEM',
    80,
    true,
    'SYSTEM'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.lookup_values lv
    WHERE lv.lookup_group_id = v_group_id
      AND UPPER(lv.lookup_key) = 'PUNCH_INCONSISTENCY_DETECTED'
  );
END $$;

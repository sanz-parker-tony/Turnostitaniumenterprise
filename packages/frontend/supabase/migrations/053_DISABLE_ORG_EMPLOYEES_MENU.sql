-- ============================================================================
-- 053_DISABLE_ORG_EMPLOYEES_MENU
-- Desactiva el menú "Empleados" del grupo Organización desde base de datos
-- (sin hardcode en frontend)
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_count int := 0;
BEGIN
  WITH target_screens AS (
    SELECT s.id
    FROM public.screens s
    JOIN public.menu_groups mg
      ON mg.id = s.menu_group_id
    WHERE s.is_active = true
      AND mg.is_active = true
      AND (
        mg.menu_group_key = 'ORGANIZATION'
        OR LOWER(COALESCE(mg.menu_group_name, '')) = 'organización'
        OR LOWER(COALESCE(mg.menu_group_name, '')) = 'organizacion'
      )
      AND (
        LOWER(COALESCE(s.route_path, '')) = '/dashboard/org/employees'
        OR (
          LOWER(COALESCE(s.menu_label, '')) = 'empleados'
          AND LOWER(COALESCE(s.route_path, '')) LIKE '/dashboard/org/%'
        )
      )
      AND LOWER(COALESCE(s.route_path, '')) <> '/dashboard/org/employee-companies'
      AND LOWER(COALESCE(s.route_path, '')) <> '/dashboard/org/employee-profiles'
  )
  SELECT COUNT(*) INTO v_count FROM target_screens;

  -- 1) Desactivar pantalla(s) objetivo
  UPDATE public.screens s
     SET is_active = false,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE s.id IN (
     SELECT ts.id
     FROM (
       SELECT s2.id
       FROM public.screens s2
       JOIN public.menu_groups mg2 ON mg2.id = s2.menu_group_id
       WHERE s2.is_active = true
         AND mg2.is_active = true
         AND (
           mg2.menu_group_key = 'ORGANIZATION'
           OR LOWER(COALESCE(mg2.menu_group_name, '')) = 'organización'
           OR LOWER(COALESCE(mg2.menu_group_name, '')) = 'organizacion'
         )
         AND (
           LOWER(COALESCE(s2.route_path, '')) = '/dashboard/org/employees'
           OR (
             LOWER(COALESCE(s2.menu_label, '')) = 'empleados'
             AND LOWER(COALESCE(s2.route_path, '')) LIKE '/dashboard/org/%'
           )
         )
         AND LOWER(COALESCE(s2.route_path, '')) <> '/dashboard/org/employee-companies'
         AND LOWER(COALESCE(s2.route_path, '')) <> '/dashboard/org/employee-profiles'
     ) ts
   );

  -- 2) Desactivar screen_actions asociados
  UPDATE public.screen_actions sa
     SET is_active = false,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE sa.screen_id IN (
     SELECT s.id
     FROM public.screens s
     JOIN public.menu_groups mg ON mg.id = s.menu_group_id
     WHERE (
         mg.menu_group_key = 'ORGANIZATION'
         OR LOWER(COALESCE(mg.menu_group_name, '')) = 'organización'
         OR LOWER(COALESCE(mg.menu_group_name, '')) = 'organizacion'
       )
       AND (
         LOWER(COALESCE(s.route_path, '')) = '/dashboard/org/employees'
         OR (
           LOWER(COALESCE(s.menu_label, '')) = 'empleados'
           AND LOWER(COALESCE(s.route_path, '')) LIKE '/dashboard/org/%'
         )
       )
       AND LOWER(COALESCE(s.route_path, '')) <> '/dashboard/org/employee-companies'
       AND LOWER(COALESCE(s.route_path, '')) <> '/dashboard/org/employee-profiles'
   );

  -- 3) Revocar y desactivar permisos por rol para esas acciones
  UPDATE public.role_screen_actions rsa
     SET is_allowed = false,
         is_active = false,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.screen_actions sa
    JOIN public.screens s ON s.id = sa.screen_id
    JOIN public.menu_groups mg ON mg.id = s.menu_group_id
   WHERE rsa.screen_action_id = sa.id
     AND (
       mg.menu_group_key = 'ORGANIZATION'
       OR LOWER(COALESCE(mg.menu_group_name, '')) = 'organización'
       OR LOWER(COALESCE(mg.menu_group_name, '')) = 'organizacion'
     )
     AND (
       LOWER(COALESCE(s.route_path, '')) = '/dashboard/org/employees'
       OR (
         LOWER(COALESCE(s.menu_label, '')) = 'empleados'
         AND LOWER(COALESCE(s.route_path, '')) LIKE '/dashboard/org/%'
       )
     )
     AND LOWER(COALESCE(s.route_path, '')) <> '/dashboard/org/employee-companies'
     AND LOWER(COALESCE(s.route_path, '')) <> '/dashboard/org/employee-profiles';

  RAISE NOTICE '053_DISABLE_ORG_EMPLOYEES_MENU -> pantallas objetivo: %', v_count;
END $$;


-- ============================================================================
-- 013_DEDUP_ORG_PROFILES_MENU
-- Elimina duplicado de menu "Perfiles" en Organizacion
-- Mantener ORG_EMPLOYEE_PROFILES y desactivar EMPLOYEE_PROFILES
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_keep_screen_id uuid;
  v_drop_screen_id uuid;
BEGIN
  SELECT id INTO v_keep_screen_id
  FROM public.screens
  WHERE screen_key = 'ORG_EMPLOYEE_PROFILES'
  LIMIT 1;

  SELECT id INTO v_drop_screen_id
  FROM public.screens
  WHERE screen_key = 'EMPLOYEE_PROFILES'
  LIMIT 1;

  -- Si existe la pantalla canonica, asegurar que quede activa y bien enruta
  IF v_keep_screen_id IS NOT NULL THEN
    UPDATE public.screens
       SET screen_name = 'Perfiles de Empleado',
           menu_label = 'Perfiles',
           route_path = '/dashboard/org/employee-profiles',
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_keep_screen_id;
  END IF;

  -- Desactivar la pantalla duplicada legacy y sus permisos
  IF v_drop_screen_id IS NOT NULL THEN
    UPDATE public.screens
       SET is_active = false,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_drop_screen_id;

    UPDATE public.screen_actions
       SET is_active = false,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE screen_id = v_drop_screen_id;

    UPDATE public.role_screen_actions rsa
       SET is_allowed = false,
           is_active = false,
           updated_by = 'SYSTEM',
           updated_at = now()
      FROM public.screen_actions sa
     WHERE sa.screen_id = v_drop_screen_id
       AND rsa.screen_action_id = sa.id;
  END IF;
END $$;


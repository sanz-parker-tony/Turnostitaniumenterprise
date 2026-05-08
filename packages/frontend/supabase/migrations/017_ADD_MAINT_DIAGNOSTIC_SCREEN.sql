-- ============================================================================
-- Migration: 017_ADD_MAINT_DIAGNOSTIC_SCREEN
-- Description:
--   Agrega la pantalla "Diagnóstico" al menú MAINT y asigna permiso VIEW
--   únicamente al rol SYSTEM_ADMIN.
-- ============================================================================

DO $$
DECLARE
  v_menu_maint_id UUID;
  v_screen_id UUID;
  v_view_action_id UUID;
  v_screen_action_id UUID;
  v_tenant_id UUID;
  v_system_admin_role_id UUID;
BEGIN
  -- 1) Obtener grupo MAINT
  SELECT id INTO v_menu_maint_id
  FROM public.system_menu_groups
  WHERE menu_group_key = 'MAINT'
  LIMIT 1;

  IF v_menu_maint_id IS NULL THEN
    RAISE EXCEPTION 'Menu group MAINT no encontrado';
  END IF;

  -- 2) Crear/actualizar pantalla
  INSERT INTO public.screens (
    screen_key,
    screen_name,
    menu_label,
    menu_group_id,
    route_path,
    icon_key,
    sort_order,
    is_active,
    created_by
  )
  VALUES (
    'MAINT_DIAGNOSTIC',
    'Diagnóstico',
    'Diagnóstico',
    v_menu_maint_id,
    '/dashboard/maintenance/diagnostic',
    'Database',
    50,
    true,
    'SYSTEM'
  )
  ON CONFLICT (screen_key) DO UPDATE
  SET screen_name = EXCLUDED.screen_name,
      menu_label = EXCLUDED.menu_label,
      menu_group_id = EXCLUDED.menu_group_id,
      route_path = EXCLUDED.route_path,
      icon_key = EXCLUDED.icon_key,
      sort_order = EXCLUDED.sort_order,
      is_active = true
  RETURNING id INTO v_screen_id;

  -- 3) Obtener acción VIEW
  SELECT id INTO v_view_action_id
  FROM public.actions
  WHERE action_key = 'VIEW'
  LIMIT 1;

  IF v_view_action_id IS NULL THEN
    RAISE EXCEPTION 'Acción VIEW no encontrada';
  END IF;

  -- 4) Asegurar screen_action VIEW para la nueva pantalla
  INSERT INTO public.screen_actions (
    screen_id,
    action_id,
    is_active,
    created_by
  )
  SELECT v_screen_id, v_view_action_id, true, 'SYSTEM'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.screen_actions sa
    WHERE sa.screen_id = v_screen_id
      AND sa.action_id = v_view_action_id
  );

  SELECT id INTO v_screen_action_id
  FROM public.screen_actions
  WHERE screen_id = v_screen_id
    AND action_id = v_view_action_id
  LIMIT 1;

  -- 5) Obtener tenant SYSTEM y rol SYSTEM_ADMIN
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE tenant_key = 'SYSTEM'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant SYSTEM no encontrado';
  END IF;

  SELECT id INTO v_system_admin_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_id
    AND role_key = 'SYSTEM_ADMIN'
  LIMIT 1;

  IF v_system_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Rol SYSTEM_ADMIN no encontrado';
  END IF;

  -- 6) Asignar permiso VIEW en role_screen_actions a SYSTEM_ADMIN
  INSERT INTO public.role_screen_actions (
    tenant_id,
    role_id,
    screen_action_id,
    is_allowed,
    is_active,
    created_by
  )
  SELECT v_tenant_id, v_system_admin_role_id, v_screen_action_id, true, true, 'SYSTEM'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.role_screen_actions rsa
    WHERE rsa.tenant_id = v_tenant_id
      AND rsa.role_id = v_system_admin_role_id
      AND rsa.screen_action_id = v_screen_action_id
  );

  UPDATE public.role_screen_actions
  SET is_allowed = true,
      is_active = true,
      updated_by = 'SYSTEM',
      updated_at = now()
  WHERE tenant_id = v_tenant_id
    AND role_id = v_system_admin_role_id
    AND screen_action_id = v_screen_action_id;

  RAISE NOTICE 'Pantalla MAINT_DIAGNOSTIC asegurada y permiso VIEW asignado a SYSTEM_ADMIN';
END $$;


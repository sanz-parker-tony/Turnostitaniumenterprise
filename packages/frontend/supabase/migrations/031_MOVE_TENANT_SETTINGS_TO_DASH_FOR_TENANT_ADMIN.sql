-- ============================================================================
-- 031_MOVE_TENANT_SETTINGS_TO_DASH_FOR_TENANT_ADMIN
-- Quita TENANT_SETTINGS del menú CONFIG para TENANT_ADMIN y lo expone en DASH
-- mediante una pantalla dedicada (sin IDs hardcodeados).
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_screen_config_id uuid;
  v_screen_dash_id uuid;
  v_menu_dash_id uuid;
  v_view_action_id uuid;
  v_edit_action_id uuid;
BEGIN
  SELECT id INTO v_screen_config_id
  FROM public.screens
  WHERE screen_key = 'TENANT_SETTINGS'
  LIMIT 1;

  IF v_screen_config_id IS NULL THEN
    RAISE NOTICE 'No existe screen TENANT_SETTINGS. No se aplican cambios.';
    RETURN;
  END IF;

  SELECT id INTO v_menu_dash_id
  FROM public.system_menu_groups
  WHERE menu_group_key = 'DASH'
  LIMIT 1;

  IF v_menu_dash_id IS NULL THEN
    RAISE NOTICE 'No existe menu_group DASH. No se aplican cambios.';
    RETURN;
  END IF;

  SELECT id INTO v_view_action_id
  FROM public.actions
  WHERE action_key = 'VIEW'
  LIMIT 1;

  SELECT id INTO v_edit_action_id
  FROM public.actions
  WHERE action_key = 'EDIT'
  LIMIT 1;

  IF v_view_action_id IS NULL OR v_edit_action_id IS NULL THEN
    RAISE NOTICE 'No existen acciones VIEW/EDIT. No se aplican cambios.';
    RETURN;
  END IF;

  -- 1) Crear/reusar pantalla dashboard para tenant settings
  SELECT id INTO v_screen_dash_id
  FROM public.screens
  WHERE screen_key = 'TENANT_SETTINGS_DASH'
  LIMIT 1;

  IF v_screen_dash_id IS NULL THEN
    INSERT INTO public.screens (
      id,
      screen_key,
      screen_name,
      menu_label,
      menu_group_id,
      route_path,
      icon_key,
      sort_order,
      is_active,
      created_by
    ) VALUES (
      gen_random_uuid(),
      'TENANT_SETTINGS_DASH',
      'Gestión del Tenant',
      'Tenant',
      v_menu_dash_id,
      '/dashboard/config/tenant-settings',
      'Building2',
      35,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_dash_id;
  ELSE
    UPDATE public.screens
       SET screen_name = 'Gestión del Tenant',
           menu_label = 'Tenant',
           menu_group_id = v_menu_dash_id,
           route_path = '/dashboard/config/tenant-settings',
           icon_key = 'Building2',
           sort_order = 35,
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_screen_dash_id;
  END IF;

  -- 2) Asegurar screen_actions VIEW/EDIT para TENANT_SETTINGS_DASH
  INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
  SELECT gen_random_uuid(), v_screen_dash_id, a.action_id, true, 'SYSTEM'
  FROM (VALUES (v_view_action_id), (v_edit_action_id)) AS a(action_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.screen_actions sa
    WHERE sa.screen_id = v_screen_dash_id
      AND sa.action_id = a.action_id
  );

  UPDATE public.screen_actions
     SET is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE screen_id = v_screen_dash_id
     AND action_id IN (v_view_action_id, v_edit_action_id);

  -- 3) Permitir TENANT_SETTINGS_DASH solo a TENANT_ADMIN
  INSERT INTO public.role_screen_actions (
    id, tenant_id, role_id, screen_action_id, is_allowed, is_active, created_by
  )
  SELECT
    gen_random_uuid(),
    r.tenant_id,
    r.id,
    sa.id,
    true,
    true,
    'SYSTEM'
  FROM public.roles r
  JOIN public.screen_actions sa
    ON sa.screen_id = v_screen_dash_id
   AND sa.is_active = true
  WHERE r.role_key = 'TENANT_ADMIN'
    AND r.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.role_screen_actions rsa
      WHERE rsa.tenant_id = r.tenant_id
        AND rsa.role_id = r.id
        AND rsa.screen_action_id = sa.id
    );

  UPDATE public.role_screen_actions rsa
     SET is_allowed = true,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.roles r
    JOIN public.screen_actions sa
      ON sa.screen_id = v_screen_dash_id
     AND sa.is_active = true
   WHERE r.role_key = 'TENANT_ADMIN'
     AND r.is_active = true
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id
     AND rsa.screen_action_id = sa.id;

  UPDATE public.role_screen_actions rsa
     SET is_allowed = false,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.roles r,
         public.screen_actions sa
   WHERE sa.screen_id = v_screen_dash_id
     AND sa.id = rsa.screen_action_id
     AND r.id = rsa.role_id
     AND COALESCE(r.role_key, '') <> 'TENANT_ADMIN';

  -- 4) Quitar permiso a TENANT_ADMIN en pantalla original TENANT_SETTINGS (CONFIG)
  UPDATE public.role_screen_actions rsa
     SET is_allowed = false,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.roles r,
         public.screen_actions sa
   WHERE r.role_key = 'TENANT_ADMIN'
     AND r.is_active = true
     AND sa.screen_id = v_screen_config_id
     AND sa.id = rsa.screen_action_id
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id;

  RAISE NOTICE 'TENANT_SETTINGS removido de CONFIG para TENANT_ADMIN y expuesto en DASH.';
END $$;

-- ============================================================================
-- 052_ENSURE_MESSAGE_KEY_MANAGEMENT_CRUD
-- Objetivo:
-- - Asegurar pantalla MESSAGE_KEY_MANAGEMENT en menu SECURITY.
-- - Asegurar acciones CRUD (VIEW, CREATE, EDIT, DELETE) en screen_actions.
-- - Asegurar permisos para rol SYSTEM_ADMIN en role_screen_actions.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_security_menu_id uuid;
  v_screen_id uuid;
  v_action_view_id uuid;
  v_action_create_id uuid;
  v_action_edit_id uuid;
  v_action_delete_id uuid;
BEGIN
  SELECT id
    INTO v_security_menu_id
  FROM public.system_menu_groups
  WHERE menu_group_key = 'SECURITY'
  LIMIT 1;

  IF v_security_menu_id IS NULL THEN
    RAISE NOTICE 'No existe menu_group SECURITY. Se omite configuracion de MESSAGE_KEY_MANAGEMENT';
    RETURN;
  END IF;

  SELECT id
    INTO v_screen_id
  FROM public.screens
  WHERE screen_key = 'MESSAGE_KEY_MANAGEMENT'
  LIMIT 1;

  IF v_screen_id IS NULL THEN
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
    )
    VALUES (
      gen_random_uuid(),
      'MESSAGE_KEY_MANAGEMENT',
      'Gestion de Claves de Mensajes',
      'Mensajes',
      v_security_menu_id,
      '/dashboard/security/message-keys',
      'MessageSquare',
      55,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_id;
  ELSE
    UPDATE public.screens
       SET screen_name = 'Gestion de Claves de Mensajes',
           menu_label = 'Mensajes',
           menu_group_id = v_security_menu_id,
           route_path = '/dashboard/security/message-keys',
           icon_key = COALESCE(NULLIF(icon_key, ''), 'MessageSquare'),
           sort_order = 55,
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_screen_id;
  END IF;

  SELECT id INTO v_action_view_id FROM public.actions WHERE action_key = 'VIEW' LIMIT 1;
  SELECT id INTO v_action_create_id FROM public.actions WHERE action_key = 'CREATE' LIMIT 1;
  SELECT id INTO v_action_edit_id FROM public.actions WHERE action_key = 'EDIT' LIMIT 1;
  SELECT id INTO v_action_delete_id FROM public.actions WHERE action_key = 'DELETE' LIMIT 1;

  INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
  SELECT gen_random_uuid(), v_screen_id, x.action_id, true, 'SYSTEM'
  FROM (
    VALUES
      (v_action_view_id),
      (v_action_create_id),
      (v_action_edit_id),
      (v_action_delete_id)
  ) AS x(action_id)
  WHERE x.action_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.screen_actions sa
      WHERE sa.screen_id = v_screen_id
        AND sa.action_id = x.action_id
    );

  UPDATE public.screen_actions
     SET is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE screen_id = v_screen_id
     AND action_id IN (v_action_view_id, v_action_create_id, v_action_edit_id, v_action_delete_id);

  INSERT INTO public.role_screen_actions (
    id,
    tenant_id,
    role_id,
    screen_action_id,
    is_allowed,
    is_active,
    created_by
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
    ON sa.screen_id = v_screen_id
   AND sa.is_active = true
  WHERE r.role_key = 'SYSTEM_ADMIN'
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
      ON sa.screen_id = v_screen_id
     AND sa.is_active = true
   WHERE r.role_key = 'SYSTEM_ADMIN'
     AND r.is_active = true
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id
     AND rsa.screen_action_id = sa.id;

  RAISE NOTICE '052: MESSAGE_KEY_MANAGEMENT asegurado con acciones CRUD y permisos SYSTEM_ADMIN.';
END $$;


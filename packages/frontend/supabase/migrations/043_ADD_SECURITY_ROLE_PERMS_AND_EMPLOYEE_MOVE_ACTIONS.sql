-- ============================================================================
-- 043_ADD_SECURITY_ROLE_PERMS_AND_EMPLOYEE_MOVE_ACTIONS
-- Objetivo:
-- 1) Asegurar pantalla de seguridades para autorizacion por rol/pantalla/accion
--    (sin mantenimiento de catalogos).
-- 2) Asegurar acciones explicitas para mover empleados en
--    Seguridades > Acceso empleados:
--      - AUTH_ONE   (>)
--      - AUTH_ALL   (>>)
--      - REVOKE_ONE (<)
--      - REVOKE_ALL (<<)
-- 3) Asignar permisos solo a TENANT_ADMIN por tenant.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_menu_seguridades uuid;
  v_screen_role_perms uuid;
  v_screen_employee_access uuid;

  v_act_view uuid;
  v_act_assign uuid;
  v_act_auth_one uuid;
  v_act_auth_all uuid;
  v_act_revoke_one uuid;
  v_act_revoke_all uuid;
BEGIN
  -- 1) Menu group SEGURIDADES
  SELECT id
    INTO v_menu_seguridades
  FROM public.system_menu_groups
  WHERE menu_group_key = 'SEGURIDADES'
  LIMIT 1;

  IF v_menu_seguridades IS NULL THEN
    INSERT INTO public.system_menu_groups (
      id,
      menu_group_key,
      menu_group_name,
      menu_group_short_name,
      icon_key,
      sort_order,
      is_active,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      'SEGURIDADES',
      'Seguridades',
      'Seguridades',
      'ShieldCheck',
      6,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_menu_seguridades;
  ELSE
    UPDATE public.system_menu_groups
       SET is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_menu_seguridades;
  END IF;

  -- 2) Pantalla: Permisos por Rol (autorizacion, no mantenimiento)
  SELECT id
    INTO v_screen_role_perms
  FROM public.screens
  WHERE screen_key = 'SEC_ROLE_PERMS'
  LIMIT 1;

  IF v_screen_role_perms IS NULL THEN
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
      'SEC_ROLE_PERMS',
      'Autorizacion por Rol',
      'Permisos por rol',
      v_menu_seguridades,
      '/dashboard/security/role-permissions',
      'ShieldCheck',
      30,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_role_perms;
  ELSE
    UPDATE public.screens
       SET screen_name = 'Autorizacion por Rol',
           menu_label = 'Permisos por rol',
           menu_group_id = v_menu_seguridades,
           route_path = '/dashboard/security/role-permissions',
           icon_key = COALESCE(NULLIF(icon_key, ''), 'ShieldCheck'),
           sort_order = 30,
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_screen_role_perms;
  END IF;

  -- 3) Pantalla Acceso empleados (debe existir desde migracion 038)
  SELECT id
    INTO v_screen_employee_access
  FROM public.screens
  WHERE screen_key = 'SEC_USER_EMPLOYEE_ACCESS'
  LIMIT 1;

  -- 4) Actions requeridas
  SELECT id INTO v_act_view       FROM public.actions WHERE action_key = 'VIEW' LIMIT 1;
  SELECT id INTO v_act_assign     FROM public.actions WHERE action_key = 'ASSIGN' LIMIT 1;
  SELECT id INTO v_act_auth_one   FROM public.actions WHERE action_key = 'AUTH_ONE' LIMIT 1;
  SELECT id INTO v_act_auth_all   FROM public.actions WHERE action_key = 'AUTH_ALL' LIMIT 1;
  SELECT id INTO v_act_revoke_one FROM public.actions WHERE action_key = 'REVOKE_ONE' LIMIT 1;
  SELECT id INTO v_act_revoke_all FROM public.actions WHERE action_key = 'REVOKE_ALL' LIMIT 1;

  IF v_act_view IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'VIEW', 'Ver', true, 'SYSTEM')
    RETURNING id INTO v_act_view;
  END IF;

  IF v_act_assign IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'ASSIGN', 'Asignar', true, 'SYSTEM')
    RETURNING id INTO v_act_assign;
  END IF;

  IF v_act_auth_one IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'AUTH_ONE', 'Autorizar uno', true, 'SYSTEM')
    RETURNING id INTO v_act_auth_one;
  END IF;

  IF v_act_auth_all IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'AUTH_ALL', 'Autorizar todos', true, 'SYSTEM')
    RETURNING id INTO v_act_auth_all;
  END IF;

  IF v_act_revoke_one IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'REVOKE_ONE', 'Revocar uno', true, 'SYSTEM')
    RETURNING id INTO v_act_revoke_one;
  END IF;

  IF v_act_revoke_all IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'REVOKE_ALL', 'Revocar todos', true, 'SYSTEM')
    RETURNING id INTO v_act_revoke_all;
  END IF;

  -- 5) screen_actions para SEC_ROLE_PERMS
  INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
  SELECT gen_random_uuid(), x.screen_id, x.action_id, true, 'SYSTEM'
  FROM (
    VALUES
      (v_screen_role_perms, v_act_view),
      (v_screen_role_perms, v_act_assign)
  ) AS x(screen_id, action_id)
  WHERE x.screen_id IS NOT NULL
    AND x.action_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.screen_actions sa
      WHERE sa.screen_id = x.screen_id
        AND sa.action_id = x.action_id
    );

  -- 6) screen_actions para SEC_USER_EMPLOYEE_ACCESS con botones de movimiento
  INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
  SELECT gen_random_uuid(), x.screen_id, x.action_id, true, 'SYSTEM'
  FROM (
    VALUES
      (v_screen_employee_access, v_act_auth_one),
      (v_screen_employee_access, v_act_auth_all),
      (v_screen_employee_access, v_act_revoke_one),
      (v_screen_employee_access, v_act_revoke_all)
  ) AS x(screen_id, action_id)
  WHERE x.screen_id IS NOT NULL
    AND x.action_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.screen_actions sa
      WHERE sa.screen_id = x.screen_id
        AND sa.action_id = x.action_id
    );

  UPDATE public.screen_actions
     SET is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE screen_id IN (v_screen_role_perms, v_screen_employee_access)
     AND action_id IN (
       v_act_view,
       v_act_assign,
       v_act_auth_one,
       v_act_auth_all,
       v_act_revoke_one,
       v_act_revoke_all
     );

  -- 7) Permisos para TENANT_ADMIN por tenant (crear faltantes)
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
    ON sa.screen_id IN (v_screen_role_perms, v_screen_employee_access)
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

  -- 8) Reactivar y permitir TENANT_ADMIN
  UPDATE public.role_screen_actions rsa
     SET is_allowed = true,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.roles r
    JOIN public.screen_actions sa
      ON sa.screen_id IN (v_screen_role_perms, v_screen_employee_access)
     AND sa.is_active = true
   WHERE r.role_key = 'TENANT_ADMIN'
     AND r.is_active = true
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id
     AND rsa.screen_action_id = sa.id;

  RAISE NOTICE '043: Pantalla SEC_ROLE_PERMS + acciones de movimiento en SEC_USER_EMPLOYEE_ACCESS listas.';
END $$;

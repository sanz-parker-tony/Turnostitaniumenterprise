-- ============================================================================
-- 027_ADD_SHIFT_CHANGE_SCREENS_AND_PERMISSIONS
-- Crea pantallas para cambio de turno y asigna permisos.
-- - EMPLOYEE: KIOSK_SHIFT_CHANGE (solicitar cambio)
-- - SUPERVISOR/RHADMIN: SHIFT_CHANGE_APPROVALS (aprobar/denegar)
-- Idempotente.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_menu_kiosk uuid;
  v_menu_employee uuid;
  v_scr_kiosk uuid;
  v_scr_approvals uuid;
  v_act_view uuid;
  v_act_create uuid;
  v_act_edit uuid;
  v_act_approve uuid;
  v_act_reject uuid;
BEGIN
  -- Menu groups
  SELECT id INTO v_menu_kiosk
  FROM public.system_menu_groups
  WHERE menu_group_key = 'KIOSK'
  LIMIT 1;

  SELECT id INTO v_menu_employee
  FROM public.system_menu_groups
  WHERE menu_group_key = 'EMPLOYEE'
  LIMIT 1;

  IF v_menu_kiosk IS NULL OR v_menu_employee IS NULL THEN
    RAISE NOTICE 'No existen menu groups KIOSK/EMPLOYEE. Se omite migracion 027.';
    RETURN;
  END IF;

  -- Pantalla EMPLOYEE (kiosk)
  SELECT id INTO v_scr_kiosk
  FROM public.screens
  WHERE screen_key = 'KIOSK_SHIFT_CHANGE'
  LIMIT 1;

  IF v_scr_kiosk IS NULL THEN
    INSERT INTO public.screens (
      id, screen_key, screen_name, menu_label, menu_group_id,
      route_path, icon_key, sort_order, is_active, created_by
    )
    VALUES (
      gen_random_uuid(), 'KIOSK_SHIFT_CHANGE', 'Solicitud Cambio Turno', 'Turnos',
      v_menu_kiosk, '/dashboard/kiosk/shift-change', 'ArrowLeftRight', 220, true, 'SYSTEM'
    )
    RETURNING id INTO v_scr_kiosk;
  ELSE
    UPDATE public.screens
       SET screen_name = COALESCE(NULLIF(screen_name, ''), 'Solicitud Cambio Turno'),
           menu_label = COALESCE(NULLIF(menu_label, ''), 'Turnos'),
           route_path = COALESCE(NULLIF(route_path, ''), '/dashboard/kiosk/shift-change'),
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_scr_kiosk;
  END IF;

  -- Pantalla SUPERVISOR/RHADMIN (aprobaciones)
  SELECT id INTO v_scr_approvals
  FROM public.screens
  WHERE screen_key = 'SHIFT_CHANGE_APPROVALS'
  LIMIT 1;

  IF v_scr_approvals IS NULL THEN
    INSERT INTO public.screens (
      id, screen_key, screen_name, menu_label, menu_group_id,
      route_path, icon_key, sort_order, is_active, created_by
    )
    VALUES (
      gen_random_uuid(), 'SHIFT_CHANGE_APPROVALS', 'Aprobacion Cambio Turno', 'Solicitudes Turno',
      v_menu_employee, '/dashboard/employees/shift-change-approvals', 'ClipboardCheck', 125, true, 'SYSTEM'
    )
    RETURNING id INTO v_scr_approvals;
  ELSE
    UPDATE public.screens
       SET screen_name = COALESCE(NULLIF(screen_name, ''), 'Aprobacion Cambio Turno'),
           menu_label = COALESCE(NULLIF(menu_label, ''), 'Solicitudes Turno'),
           route_path = COALESCE(NULLIF(route_path, ''), '/dashboard/employees/shift-change-approvals'),
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_scr_approvals;
  END IF;

  -- Acciones requeridas
  SELECT id INTO v_act_view FROM public.actions WHERE action_key = 'VIEW' LIMIT 1;
  SELECT id INTO v_act_create FROM public.actions WHERE action_key = 'CREATE' LIMIT 1;
  SELECT id INTO v_act_edit FROM public.actions WHERE action_key = 'EDIT' LIMIT 1;
  SELECT id INTO v_act_approve FROM public.actions WHERE action_key = 'APPROVE' LIMIT 1;
  SELECT id INTO v_act_reject FROM public.actions WHERE action_key = 'REJECT' LIMIT 1;

  -- Si faltan acciones base, las crea
  IF v_act_view IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'VIEW', 'Ver', true, 'SYSTEM')
    RETURNING id INTO v_act_view;
  END IF;
  IF v_act_create IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'CREATE', 'Crear', true, 'SYSTEM')
    RETURNING id INTO v_act_create;
  END IF;
  IF v_act_edit IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'EDIT', 'Editar', true, 'SYSTEM')
    RETURNING id INTO v_act_edit;
  END IF;
  IF v_act_approve IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'APPROVE', 'Aprobar', true, 'SYSTEM')
    RETURNING id INTO v_act_approve;
  END IF;
  IF v_act_reject IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'REJECT', 'Denegar', true, 'SYSTEM')
    RETURNING id INTO v_act_reject;
  END IF;

  -- Screen actions: KIOSK_SHIFT_CHANGE
  INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
  SELECT gen_random_uuid(), v_scr_kiosk, a.action_id, true, 'SYSTEM'
  FROM (VALUES (v_act_view), (v_act_create)) AS a(action_id)
  WHERE a.action_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.screen_actions sa
      WHERE sa.screen_id = v_scr_kiosk
        AND sa.action_id = a.action_id
    );

  UPDATE public.screen_actions
     SET is_active = true, updated_by = 'SYSTEM', updated_at = now()
   WHERE screen_id = v_scr_kiosk
     AND action_id IN (v_act_view, v_act_create);

  -- Screen actions: SHIFT_CHANGE_APPROVALS
  INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
  SELECT gen_random_uuid(), v_scr_approvals, a.action_id, true, 'SYSTEM'
  FROM (VALUES (v_act_view), (v_act_edit), (v_act_approve), (v_act_reject)) AS a(action_id)
  WHERE a.action_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.screen_actions sa
      WHERE sa.screen_id = v_scr_approvals
        AND sa.action_id = a.action_id
    );

  UPDATE public.screen_actions
     SET is_active = true, updated_by = 'SYSTEM', updated_at = now()
   WHERE screen_id = v_scr_approvals
     AND action_id IN (v_act_view, v_act_edit, v_act_approve, v_act_reject);

  -- Permisos EMPLOYEE para KIOSK_SHIFT_CHANGE
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
    ON sa.screen_id = v_scr_kiosk
   AND sa.is_active = true
  WHERE r.role_key = 'EMPLOYEE'
    AND r.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.role_screen_actions rsa
      WHERE rsa.tenant_id = r.tenant_id
        AND rsa.role_id = r.id
        AND rsa.screen_action_id = sa.id
    );

  UPDATE public.role_screen_actions rsa
     SET is_allowed = true, is_active = true, updated_by = 'SYSTEM', updated_at = now()
    FROM public.roles r
    JOIN public.screen_actions sa
      ON sa.screen_id = v_scr_kiosk
     AND sa.is_active = true
   WHERE r.role_key = 'EMPLOYEE'
     AND r.is_active = true
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id
     AND rsa.screen_action_id = sa.id;

  -- Permisos SUPERVISOR/RHADMIN para SHIFT_CHANGE_APPROVALS
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
    ON sa.screen_id = v_scr_approvals
   AND sa.is_active = true
  WHERE r.role_key IN ('SUPERVISOR', 'RHADMIN')
    AND r.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.role_screen_actions rsa
      WHERE rsa.tenant_id = r.tenant_id
        AND rsa.role_id = r.id
        AND rsa.screen_action_id = sa.id
    );

  UPDATE public.role_screen_actions rsa
     SET is_allowed = true, is_active = true, updated_by = 'SYSTEM', updated_at = now()
    FROM public.roles r
    JOIN public.screen_actions sa
      ON sa.screen_id = v_scr_approvals
     AND sa.is_active = true
   WHERE r.role_key IN ('SUPERVISOR', 'RHADMIN')
     AND r.is_active = true
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id
     AND rsa.screen_action_id = sa.id;

  -- Deniega pantalla de aprobacion al resto de roles
  UPDATE public.role_screen_actions rsa
     SET is_allowed = false, is_active = true, updated_by = 'SYSTEM', updated_at = now()
    FROM public.screen_actions sa,
         public.roles r
   WHERE rsa.screen_action_id = sa.id
     AND rsa.role_id = r.id
     AND sa.screen_id = v_scr_approvals
     AND COALESCE(r.role_key, '') NOT IN ('SUPERVISOR', 'RHADMIN');

  RAISE NOTICE 'Pantallas y permisos de cambio de turno configurados.';
END $$;

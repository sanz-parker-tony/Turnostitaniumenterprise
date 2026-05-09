-- ============================================================================
-- 023_RESTRICT_REQUESTS_MANAGEMENT_TO_SUPERVISOR_RHADMIN
-- Restringe la pantalla de administración de solicitudes
-- (REQUESTS_MANAGEMENT) solo a roles SUPERVISOR y RHADMIN
-- usando role_screen_actions.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_screen_id uuid;
  v_view_action_id uuid;
  v_attendance_group_id uuid;
BEGIN
  -- 1) Buscar primero la pantalla real de administración
  SELECT id INTO v_screen_id
  FROM public.screens
  WHERE screen_key = 'REQUESTS_MANAGEMENT'
  LIMIT 1;

  IF v_screen_id IS NULL THEN
    -- 2) Compatibilidad: key antigua
    SELECT id INTO v_screen_id
    FROM public.screens
    WHERE screen_key = 'ATT_APPROVALS'
    LIMIT 1;
  END IF;

  IF v_screen_id IS NULL THEN
    -- 3) Si no existe por key, intentamos ruta de administración
    SELECT id INTO v_screen_id
    FROM public.screens
    WHERE route_path = '/dashboard/employees/requests'
    LIMIT 1;
  END IF;

  IF v_screen_id IS NULL THEN
    -- 4) Compatibilidad: ruta alternativa previa
    SELECT id INTO v_screen_id
    FROM public.screens
    WHERE route_path = '/dashboard/attendance/approvals'
    LIMIT 1;
  END IF;

  -- 5) Si no existe aún, la creamos en ATTENDANCE
  IF v_screen_id IS NULL THEN
    SELECT id INTO v_attendance_group_id
    FROM public.system_menu_groups
    WHERE menu_group_key = 'ATTENDANCE'
    LIMIT 1;

    IF v_attendance_group_id IS NULL THEN
      RAISE NOTICE 'No existe system_menu_groups.ATTENDANCE. No se aplican cambios.';
      RETURN;
    END IF;

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
      'REQUESTS_MANAGEMENT',
      'Gestión de Solicitudes',
      'Solicitudes',
      v_attendance_group_id,
      '/dashboard/employees/requests',
      'ClipboardCheck',
      135,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_id;
  ELSE
    -- 6) Si existe, normalizamos su key/metadata al estándar actual
    UPDATE public.screens
       SET screen_key = 'REQUESTS_MANAGEMENT',
           screen_name = COALESCE(NULLIF(screen_name, ''), 'Gestión de Solicitudes'),
           menu_label = COALESCE(NULLIF(menu_label, ''), 'Solicitudes'),
           route_path = COALESCE(NULLIF(route_path, ''), '/dashboard/employees/requests'),
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_screen_id;
  END IF;

  SELECT id INTO v_view_action_id
  FROM public.actions
  WHERE action_key = 'VIEW'
    AND is_active = true
  LIMIT 1;

  IF v_view_action_id IS NULL THEN
    RAISE NOTICE 'No existe la accion VIEW activa. No se aplican cambios.';
    RETURN;
  END IF;

  -- Asegura screen_action VIEW para REQUESTS_MANAGEMENT
  INSERT INTO public.screen_actions (
    id,
    screen_id,
    action_id,
    is_active,
    created_by
  )
  SELECT
    gen_random_uuid(),
    v_screen_id,
    v_view_action_id,
    true,
    'SYSTEM'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.screen_actions sa
    WHERE sa.screen_id = v_screen_id
      AND sa.action_id = v_view_action_id
  );

  UPDATE public.screen_actions
     SET is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE screen_id = v_screen_id
     AND action_id = v_view_action_id;

  -- Deshabilita REQUESTS_MANAGEMENT para todos excepto SUPERVISOR y RHADMIN
  UPDATE public.role_screen_actions rsa
     SET is_allowed = false,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.screen_actions sa,
         public.roles r
   WHERE rsa.screen_action_id = sa.id
     AND r.id = rsa.role_id
     AND sa.screen_id = v_screen_id
     AND COALESCE(r.role_key, '') NOT IN ('SUPERVISOR', 'RHADMIN');

  -- Inserta permisos faltantes para SUPERVISOR y RHADMIN
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
  INNER JOIN public.screen_actions sa
    ON sa.screen_id = v_screen_id
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

  -- Activa permisos existentes para SUPERVISOR y RHADMIN
  UPDATE public.role_screen_actions rsa
     SET is_allowed = true,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
    FROM public.roles r
    JOIN public.screen_actions sa
      ON sa.screen_id = v_screen_id
     AND sa.is_active = true
   WHERE r.role_key IN ('SUPERVISOR', 'RHADMIN')
     AND r.is_active = true
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id
     AND rsa.screen_action_id = sa.id;

  RAISE NOTICE 'Permisos REQUESTS_MANAGEMENT ajustados: solo SUPERVISOR y RHADMIN.';
END $$;

-- ============================================================================
-- 030_ADD_PROFILE_ATTENDANCE_EVENTS_MANAGEMENT
-- Tabla de novedades por perfil + pantalla de configuración + permisos TENANT_ADMIN
-- ============================================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.employee_profile_attendance_events
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    employee_profile_id uuid NOT NULL,
    attendance_event_id uuid NOT NULL,
    requires_approval boolean NOT NULL DEFAULT true,
    export_to_payroll boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying COLLATE pg_catalog."default",
    updated_at timestamp with time zone,
    CONSTRAINT employee_profile_attendance_events_pkey PRIMARY KEY (id),
    CONSTRAINT employee_profile_attendance_events_tenant_id_fkey
      FOREIGN KEY (tenant_id)
      REFERENCES public.tenants (id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_profile_attendance_events_profile_id_fkey
      FOREIGN KEY (employee_profile_id)
      REFERENCES public.employee_profiles (id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_profile_attendance_events_event_id_fkey
      FOREIGN KEY (attendance_event_id)
      REFERENCES public.attendance_events (id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT uq_employee_profile_attendance_events_profile_event
      UNIQUE (tenant_id, employee_profile_id, attendance_event_id)
);

CREATE INDEX IF NOT EXISTS idx_epae_tenant_profile_active
  ON public.employee_profile_attendance_events (tenant_id, employee_profile_id, is_active);

CREATE INDEX IF NOT EXISTS idx_epae_tenant_event
  ON public.employee_profile_attendance_events (tenant_id, attendance_event_id);

DO $$
DECLARE
  v_config_group_id uuid;
  v_screen_id uuid;
  v_action_view_id uuid;
  v_action_create_id uuid;
  v_action_edit_id uuid;
  v_action_delete_id uuid;
BEGIN
  SELECT id INTO v_config_group_id
  FROM public.system_menu_groups
  WHERE menu_group_key = 'CONFIG'
  LIMIT 1;

  IF v_config_group_id IS NULL THEN
    RAISE NOTICE 'No existe menu_group CONFIG. Se omite alta de pantalla CONF_PROFILE_ATT_EVENTS';
    RETURN;
  END IF;

  SELECT id INTO v_screen_id
  FROM public.screens
  WHERE screen_key = 'CONF_PROFILE_ATT_EVENTS'
  LIMIT 1;

  IF v_screen_id IS NULL THEN
    INSERT INTO public.screens (
      id, screen_key, screen_name, menu_label, menu_group_id, route_path, icon_key, sort_order,
      is_active, created_by
    ) VALUES (
      gen_random_uuid(),
      'CONF_PROFILE_ATT_EVENTS',
      'Novedades por Perfil',
      'Novedades por Perfil',
      v_config_group_id,
      '/dashboard/config/profile-attendance-events',
      'ClipboardList',
      57,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_id;
  ELSE
    UPDATE public.screens
       SET screen_name = 'Novedades por Perfil',
           menu_label = 'Novedades por Perfil',
           menu_group_id = v_config_group_id,
           route_path = '/dashboard/config/profile-attendance-events',
           icon_key = 'ClipboardList',
           sort_order = 57,
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_screen_id;
  END IF;

  SELECT id INTO v_action_view_id FROM public.actions WHERE action_key = 'VIEW' LIMIT 1;
  SELECT id INTO v_action_create_id FROM public.actions WHERE action_key = 'CREATE' LIMIT 1;
  SELECT id INTO v_action_edit_id FROM public.actions WHERE action_key = 'EDIT' LIMIT 1;
  SELECT id INTO v_action_delete_id FROM public.actions WHERE action_key = 'DELETE' LIMIT 1;

  IF v_action_view_id IS NOT NULL THEN
    INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
    SELECT gen_random_uuid(), v_screen_id, v_action_view_id, true, 'SYSTEM'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.screen_actions
      WHERE screen_id = v_screen_id AND action_id = v_action_view_id
    );
  END IF;

  IF v_action_create_id IS NOT NULL THEN
    INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
    SELECT gen_random_uuid(), v_screen_id, v_action_create_id, true, 'SYSTEM'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.screen_actions
      WHERE screen_id = v_screen_id AND action_id = v_action_create_id
    );
  END IF;

  IF v_action_edit_id IS NOT NULL THEN
    INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
    SELECT gen_random_uuid(), v_screen_id, v_action_edit_id, true, 'SYSTEM'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.screen_actions
      WHERE screen_id = v_screen_id AND action_id = v_action_edit_id
    );
  END IF;

  IF v_action_delete_id IS NOT NULL THEN
    INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
    SELECT gen_random_uuid(), v_screen_id, v_action_delete_id, true, 'SYSTEM'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.screen_actions
      WHERE screen_id = v_screen_id AND action_id = v_action_delete_id
    );
  END IF;

  UPDATE public.screen_actions
     SET is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE screen_id = v_screen_id
     AND action_id IN (v_action_view_id, v_action_create_id, v_action_edit_id, v_action_delete_id);

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
  INNER JOIN public.screen_actions sa
    ON sa.screen_id = v_screen_id
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
      ON sa.screen_id = v_screen_id
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
    FROM public.roles r
    JOIN public.screen_actions sa
      ON sa.id = rsa.screen_action_id
   WHERE sa.screen_id = v_screen_id
     AND r.id = rsa.role_id
     AND COALESCE(r.role_key, '') <> 'TENANT_ADMIN';
END $$;

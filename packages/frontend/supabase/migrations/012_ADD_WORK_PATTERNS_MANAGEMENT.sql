-- ============================================================================
-- 012_ADD_WORK_PATTERNS_MANAGEMENT
-- CRUD de patrones de trabajo en Configuracion para TENANT_ADMIN
-- ============================================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.work_patterns
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    pattern_name character varying NOT NULL,
    pattern_short_name character varying NOT NULL,
    cycle_length_days integer NOT NULL,
    work_days_per_cycle integer NOT NULL,
    rest_days_per_cycle integer NOT NULL,
    daily_work_minutes integer NOT NULL,
    weekly_work_minutes_target integer NOT NULL,
    is_flexible boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT work_patterns_pkey PRIMARY KEY (id),
    CONSTRAINT work_patterns_tenant_id_fkey FOREIGN KEY (tenant_id)
      REFERENCES public.tenants (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT ck_work_patterns_cycle_positive CHECK (cycle_length_days > 0),
    CONSTRAINT ck_work_patterns_days_non_negative CHECK (
      work_days_per_cycle >= 0
      AND rest_days_per_cycle >= 0
      AND cycle_length_days = work_days_per_cycle + rest_days_per_cycle
    ),
    CONSTRAINT ck_work_patterns_minutes_non_negative CHECK (
      daily_work_minutes >= 0
      AND weekly_work_minutes_target >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_work_patterns_tenant
  ON public.work_patterns (tenant_id, is_active, pattern_name);

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
    RAISE NOTICE 'No existe menu_group CONFIG. Se omite alta de pantalla CONF_WORK_PATTERNS';
    RETURN;
  END IF;

  SELECT id INTO v_screen_id
  FROM public.screens
  WHERE screen_key = 'CONF_WORK_PATTERNS'
  LIMIT 1;

  IF v_screen_id IS NULL THEN
    INSERT INTO public.screens (
      id, screen_key, screen_name, menu_label, menu_group_id, route_path, icon_key, sort_order,
      is_active, created_by
    ) VALUES (
      gen_random_uuid(),
      'CONF_WORK_PATTERNS',
      'Patrones de Trabajo',
      'Patrones de Trabajo',
      v_config_group_id,
      '/dashboard/config/work-patterns',
      'Calendar',
      56,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_id;
  ELSE
    UPDATE public.screens
       SET screen_name = 'Patrones de Trabajo',
           menu_label = 'Patrones de Trabajo',
           menu_group_id = v_config_group_id,
           route_path = '/dashboard/config/work-patterns',
           icon_key = 'Calendar',
           sort_order = 56,
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
   WHERE r.role_key = 'TENANT_ADMIN'
     AND r.is_active = true
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id
     AND rsa.screen_action_id = sa.id;
END $$;


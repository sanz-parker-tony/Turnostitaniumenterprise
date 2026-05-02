-- ============================================================================
-- 011_ADD_EMPLOYEE_SHIFT_PLANNING
-- Planificación de turnos para menú Empleados (rol SUPERVISOR)
-- ============================================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.employee_shift_plans
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    shift_date date NOT NULL,
    shift_type_id uuid,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT employee_shift_plans_pkey PRIMARY KEY (id),
    CONSTRAINT employee_shift_plans_company_id_fkey FOREIGN KEY (company_id)
        REFERENCES public.companies (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT employee_shift_plans_employee_id_fkey FOREIGN KEY (employee_id)
        REFERENCES public.employees (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT employee_shift_plans_shift_id_fkey FOREIGN KEY (shift_id)
        REFERENCES public.shifts (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT employee_shift_plans_shift_type_id_fkey FOREIGN KEY (shift_type_id)
        REFERENCES public.lookup_values (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT employee_shift_plans_tenant_id_fkey FOREIGN KEY (tenant_id)
        REFERENCES public.tenants (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE INDEX IF NOT EXISTS idx_employee_shift_plans_tenant_date
  ON public.employee_shift_plans (tenant_id, shift_date, is_active);

CREATE INDEX IF NOT EXISTS idx_employee_shift_plans_employee_date
  ON public.employee_shift_plans (employee_id, shift_date);

DO $$
DECLARE
  v_employee_group_id uuid;
  v_screen_id uuid;
  v_action_view_id uuid;
  v_action_create_id uuid;
  v_action_edit_id uuid;
  v_action_delete_id uuid;
BEGIN
  SELECT id INTO v_employee_group_id
  FROM public.system_menu_groups
  WHERE menu_group_key = 'EMPLOYEE'
  LIMIT 1;

  IF v_employee_group_id IS NULL THEN
    RAISE NOTICE 'No existe menu_group EMPLOYEE. Se omite alta de pantalla EMPLOYEE_SHIFT_PLANNING';
    RETURN;
  END IF;

  SELECT id INTO v_screen_id
  FROM public.screens
  WHERE screen_key = 'EMPLOYEE_SHIFT_PLANNING'
  LIMIT 1;

  IF v_screen_id IS NULL THEN
    INSERT INTO public.screens (
      id, screen_key, screen_name, menu_label, menu_group_id, route_path, icon_key, sort_order,
      is_active, created_by
    ) VALUES (
      gen_random_uuid(),
      'EMPLOYEE_SHIFT_PLANNING',
      'Planificación de Turnos',
      'Planificación Turnos',
      v_employee_group_id,
      '/dashboard/employees/shift-planning',
      'Calendar',
      115,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_id;
  ELSE
    UPDATE public.screens
       SET screen_name = 'Planificación de Turnos',
           menu_label = 'Planificación Turnos',
           menu_group_id = v_employee_group_id,
           route_path = '/dashboard/employees/shift-planning',
           icon_key = 'Calendar',
           sort_order = 115,
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
  WHERE r.role_key = 'SUPERVISOR'
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
   WHERE r.role_key = 'SUPERVISOR'
     AND r.is_active = true
     AND rsa.tenant_id = r.tenant_id
     AND rsa.role_id = r.id
     AND rsa.screen_action_id = sa.id;
END $$;

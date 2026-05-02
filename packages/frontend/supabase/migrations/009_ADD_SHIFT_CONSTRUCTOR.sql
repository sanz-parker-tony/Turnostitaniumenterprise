-- ============================================================================
-- 009_ADD_SHIFT_CONSTRUCTOR
-- Constructor de turnos por bloques con recargos
-- ============================================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.shift_constructors
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    constructor_name character varying NOT NULL,
    total_work_minutes integer NOT NULL DEFAULT 0,
    total_break_minutes integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT shift_constructors_pkey PRIMARY KEY (id),
    CONSTRAINT shift_constructors_tenant_id_fkey FOREIGN KEY (tenant_id)
      REFERENCES public.tenants (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT shift_constructors_shift_id_fkey FOREIGN KEY (shift_id)
      REFERENCES public.shifts (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE CASCADE,
    CONSTRAINT uq_shift_constructors_tenant_shift UNIQUE (tenant_id, shift_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_constructors_tenant
  ON public.shift_constructors (tenant_id);

CREATE TABLE IF NOT EXISTS public.shift_constructor_blocks
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    constructor_id uuid NOT NULL,
    block_type character varying NOT NULL,
    block_label character varying,
    start_minutes integer NOT NULL,
    end_minutes integer NOT NULL,
    surcharge_pct numeric(6,2) NOT NULL DEFAULT 0,
    is_break boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 10,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying,
    updated_at timestamp with time zone,
    CONSTRAINT shift_constructor_blocks_pkey PRIMARY KEY (id),
    CONSTRAINT shift_constructor_blocks_tenant_id_fkey FOREIGN KEY (tenant_id)
      REFERENCES public.tenants (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT shift_constructor_blocks_constructor_id_fkey FOREIGN KEY (constructor_id)
      REFERENCES public.shift_constructors (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE CASCADE,
    CONSTRAINT ck_shift_block_minute_range CHECK (
      start_minutes >= 0
      AND end_minutes > start_minutes
      AND end_minutes <= 2880
    ),
    CONSTRAINT ck_shift_block_type CHECK (
      block_type IN ('ORDINARIA','NOCTURNA','EXTRA_50','EXTRA_100','LUNCH','BREAK')
    )
);

CREATE INDEX IF NOT EXISTS idx_shift_constructor_blocks_constructor
  ON public.shift_constructor_blocks (constructor_id, sort_order, start_minutes);

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
    RAISE NOTICE 'No existe menu_group CONFIG. Se omite alta de pantalla SHIFT_CONSTRUCTOR_MANAGEMENT';
    RETURN;
  END IF;

  SELECT id INTO v_screen_id
  FROM public.screens
  WHERE screen_key = 'SHIFT_CONSTRUCTOR_MANAGEMENT'
  LIMIT 1;

  IF v_screen_id IS NULL THEN
    INSERT INTO public.screens (
      id, screen_key, screen_name, menu_label, menu_group_id, route_path, icon_key, sort_order,
      is_active, created_by
    ) VALUES (
      gen_random_uuid(),
      'SHIFT_CONSTRUCTOR_MANAGEMENT',
      'Constructor de Turnos',
      'Constructor Turnos',
      v_config_group_id,
      '/dashboard/config/shift-constructor',
      'Activity',
      55,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_id;
  ELSE
    UPDATE public.screens
      SET screen_name = 'Constructor de Turnos',
          menu_label = 'Constructor Turnos',
          menu_group_id = v_config_group_id,
          route_path = '/dashboard/config/shift-constructor',
          icon_key = 'Activity',
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

END $$;


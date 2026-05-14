-- ============================================================================
-- 035_ADD_TIME_PUNCH_CHANGE_REQUESTS_PACKAGE
-- Paquete completo para solicitudes de cambios en marcaciones:
-- 1) Catalogos de tipos y estados
-- 2) Tabla de solicitudes de cambio de marcaciones
-- 3) Tipos de notificacion
-- 4) Pantallas y permisos (EMPLOYEE / SUPERVISOR / RHADMIN)
-- Idempotente.
-- ============================================================================

SET search_path TO public;

-- 1) Catalogo de tipos de solicitud de marcacion
DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id
    INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'TIME_PUNCH_CHANGE_REQUEST_TYPE'
  LIMIT 1;

  IF v_group_id IS NULL THEN
    INSERT INTO public.lookup_groups (
      id,
      lookup_group_key,
      lookup_group_label,
      lookup_group_short_label,
      allows_tenant_items,
      is_active,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      'TIME_PUNCH_CHANGE_REQUEST_TYPE',
      'Tipos Solicitud Cambio Marcacion',
      'Tipo Cambio Marcacion',
      false,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_group_id;
  END IF;

  INSERT INTO public.lookup_values (
    id,
    tenant_id,
    lookup_group_id,
    lookup_key,
    lookup_label,
    lookup_short_label,
    lookup_scope,
    sort_order,
    is_active,
    created_by
  )
  SELECT gen_random_uuid(), NULL, v_group_id, x.lookup_key, x.lookup_label, x.lookup_short_label, 'SYSTEM', x.sort_order, true, 'SYSTEM'
  FROM (
    VALUES
      ('CREATE_PUNCH',  'Nueva Marcacion',            'Nueva',         10),
      ('UPDATE_PUNCH',  'Cambio de Marcacion',        'Modificar',     20),
      ('TOGGLE_ACTIVE', 'Activar/Desactivar Marcacion','Activar/Off',  30)
  ) AS x(lookup_key, lookup_label, lookup_short_label, sort_order)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.lookup_values lv
    WHERE lv.lookup_group_id = v_group_id
      AND UPPER(lv.lookup_key) = x.lookup_key
  );
END $$;

-- 2) Catalogo de estados de solicitud de marcacion
DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id
    INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'TIME_PUNCH_CHANGE_REQUEST_STATUS'
  LIMIT 1;

  IF v_group_id IS NULL THEN
    INSERT INTO public.lookup_groups (
      id,
      lookup_group_key,
      lookup_group_label,
      lookup_group_short_label,
      allows_tenant_items,
      is_active,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      'TIME_PUNCH_CHANGE_REQUEST_STATUS',
      'Estados Solicitud Cambio Marcacion',
      'Estado Cambio Marcacion',
      false,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_group_id;
  END IF;

  INSERT INTO public.lookup_values (
    id,
    tenant_id,
    lookup_group_id,
    lookup_key,
    lookup_label,
    lookup_short_label,
    lookup_scope,
    sort_order,
    is_active,
    created_by
  )
  SELECT gen_random_uuid(), NULL, v_group_id, x.lookup_key, x.lookup_label, x.lookup_short_label, 'SYSTEM', x.sort_order, true, 'SYSTEM'
  FROM (
    VALUES
      ('PENDING',   'Pendiente',   'Pendiente',  10),
      ('IN_REVIEW', 'En Revision', 'Revision',   20),
      ('APPROVED',  'Aprobada',    'Aprobada',   30),
      ('REJECTED',  'Denegada',    'Denegada',   40),
      ('CANCELLED', 'Cancelada',   'Cancelada',  50)
  ) AS x(lookup_key, lookup_label, lookup_short_label, sort_order)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.lookup_values lv
    WHERE lv.lookup_group_id = v_group_id
      AND UPPER(lv.lookup_key) = x.lookup_key
  );
END $$;

-- 3) Tabla principal de solicitudes de cambio de marcaciones
CREATE TABLE IF NOT EXISTS public.employee_time_punch_change_requests
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    target_punch_id uuid,
    request_type_id uuid NOT NULL,
    reason text NOT NULL,
    current_values jsonb,
    requested_values jsonb NOT NULL DEFAULT '{}'::jsonb,
    request_status_id uuid NOT NULL,
    supervisor_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    support_document_path character varying COLLATE pg_catalog."default",
    support_document_name character varying COLLATE pg_catalog."default",
    support_document_mime character varying COLLATE pg_catalog."default",
    support_document_size_bytes integer,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying COLLATE pg_catalog."default",
    updated_at timestamp with time zone,
    CONSTRAINT employee_time_punch_change_requests_pkey PRIMARY KEY (id),
    CONSTRAINT employee_time_punch_change_requests_tenant_id_fkey FOREIGN KEY (tenant_id)
      REFERENCES public.tenants (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_time_punch_change_requests_company_id_fkey FOREIGN KEY (company_id)
      REFERENCES public.companies (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_time_punch_change_requests_employee_id_fkey FOREIGN KEY (employee_id)
      REFERENCES public.employees (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_time_punch_change_requests_target_punch_id_fkey FOREIGN KEY (target_punch_id)
      REFERENCES public.employee_time_punches (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_time_punch_change_requests_request_type_id_fkey FOREIGN KEY (request_type_id)
      REFERENCES public.lookup_values (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_time_punch_change_requests_request_status_id_fkey FOREIGN KEY (request_status_id)
      REFERENCES public.lookup_values (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_time_punch_change_requests_approved_by_fkey FOREIGN KEY (approved_by)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT ck_tpcr_requested_values_obj CHECK (jsonb_typeof(requested_values) = 'object'),
    CONSTRAINT ck_tpcr_current_values_obj CHECK (current_values IS NULL OR jsonb_typeof(current_values) = 'object'),
    CONSTRAINT ck_tpcr_approval_consistency CHECK (
      (approved_at IS NULL AND approved_by IS NULL) OR
      (approved_at IS NOT NULL AND approved_by IS NOT NULL)
    )
);

-- Compatibilidad si la tabla existe de forma parcial
ALTER TABLE IF EXISTS public.employee_time_punch_change_requests
  ADD COLUMN IF NOT EXISTS current_values jsonb;

ALTER TABLE IF EXISTS public.employee_time_punch_change_requests
  ADD COLUMN IF NOT EXISTS requested_values jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.employee_time_punch_change_requests
  ADD COLUMN IF NOT EXISTS support_document_path character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.employee_time_punch_change_requests
  ADD COLUMN IF NOT EXISTS support_document_name character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.employee_time_punch_change_requests
  ADD COLUMN IF NOT EXISTS support_document_mime character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.employee_time_punch_change_requests
  ADD COLUMN IF NOT EXISTS support_document_size_bytes integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_tpcr_requested_values_obj'
      AND conrelid = 'public.employee_time_punch_change_requests'::regclass
  ) THEN
    ALTER TABLE public.employee_time_punch_change_requests
      ADD CONSTRAINT ck_tpcr_requested_values_obj
      CHECK (jsonb_typeof(requested_values) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_tpcr_current_values_obj'
      AND conrelid = 'public.employee_time_punch_change_requests'::regclass
  ) THEN
    ALTER TABLE public.employee_time_punch_change_requests
      ADD CONSTRAINT ck_tpcr_current_values_obj
      CHECK (current_values IS NULL OR jsonb_typeof(current_values) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ck_tpcr_approval_consistency'
      AND conrelid = 'public.employee_time_punch_change_requests'::regclass
  ) THEN
    ALTER TABLE public.employee_time_punch_change_requests
      ADD CONSTRAINT ck_tpcr_approval_consistency
      CHECK (
        (approved_at IS NULL AND approved_by IS NULL) OR
        (approved_at IS NOT NULL AND approved_by IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tpcr_tenant_employee_created
  ON public.employee_time_punch_change_requests (tenant_id, employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tpcr_tenant_status_created
  ON public.employee_time_punch_change_requests (tenant_id, request_status_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tpcr_target_punch
  ON public.employee_time_punch_change_requests (target_punch_id);

CREATE INDEX IF NOT EXISTS idx_tpcr_approved_by_date
  ON public.employee_time_punch_change_requests (approved_by, approved_at DESC);

-- 4) Estado por defecto para filas historicas sin estado
DO $$
DECLARE
  v_status_group_id uuid;
  v_pending_status_id uuid;
BEGIN
  SELECT id INTO v_status_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'TIME_PUNCH_CHANGE_REQUEST_STATUS'
  LIMIT 1;

  IF v_status_group_id IS NULL THEN
    RAISE NOTICE 'No existe TIME_PUNCH_CHANGE_REQUEST_STATUS, se omite default de estado.';
    RETURN;
  END IF;

  SELECT id INTO v_pending_status_id
  FROM public.lookup_values
  WHERE lookup_group_id = v_status_group_id
    AND UPPER(lookup_key) = 'PENDING'
    AND is_active = true
  ORDER BY sort_order ASC
  LIMIT 1;

  IF v_pending_status_id IS NOT NULL THEN
    UPDATE public.employee_time_punch_change_requests
       SET request_status_id = v_pending_status_id
     WHERE request_status_id IS NULL;
  END IF;
END $$;

-- 5) Tipos de notificacion para este flujo
DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id
    INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'USER_NOTIFICATION_TYPE'
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.lookup_values (
    id,
    tenant_id,
    lookup_group_id,
    lookup_key,
    lookup_label,
    lookup_short_label,
    lookup_scope,
    sort_order,
    is_active,
    created_by
  )
  SELECT gen_random_uuid(), NULL, v_group_id, x.lookup_key, x.lookup_label, x.lookup_short_label, 'SYSTEM', x.sort_order, true, 'SYSTEM'
  FROM (
    VALUES
      ('TIME_PUNCH_CHANGE_REQUEST_CREATED', 'Solicitud Cambio Marcacion Creada', 'Marcacion Nueva', 50),
      ('TIME_PUNCH_CHANGE_REQUEST_DECIDED', 'Solicitud Cambio Marcacion Resuelta', 'Marcacion Resuelta', 60)
  ) AS x(lookup_key, lookup_label, lookup_short_label, sort_order)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.lookup_values lv
    WHERE lv.lookup_group_id = v_group_id
      AND UPPER(lv.lookup_key) = x.lookup_key
  );
END $$;

-- 6) Pantallas y permisos
DO $$
DECLARE
  v_menu_kiosk uuid;
  v_menu_employee uuid;
  v_scr_kiosk uuid;
  v_scr_approvals uuid;

  v_act_view uuid;
  v_act_create uuid;
  v_act_edit uuid;
  v_act_delete uuid;
  v_act_cancel uuid;
  v_act_comment uuid;
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
    RAISE NOTICE 'No existen menu groups KIOSK/EMPLOYEE. Se omite bloque de pantallas 035.';
    RETURN;
  END IF;

  -- Pantalla EMPLOYEE
  SELECT id INTO v_scr_kiosk
  FROM public.screens
  WHERE screen_key = 'KIOSK_TIME_PUNCH_REQUESTS'
  LIMIT 1;

  IF v_scr_kiosk IS NULL THEN
    INSERT INTO public.screens (
      id, screen_key, screen_name, menu_label, menu_group_id,
      route_path, icon_key, sort_order, is_active, created_by
    )
    VALUES (
      gen_random_uuid(), 'KIOSK_TIME_PUNCH_REQUESTS', 'Solicitud Cambios Marcacion', 'Solicitar Marcaciones',
      v_menu_kiosk, '/dashboard/kiosk/time-punch-requests', 'FilePenLine', 230, true, 'SYSTEM'
    )
    RETURNING id INTO v_scr_kiosk;
  ELSE
    UPDATE public.screens
       SET screen_name = COALESCE(NULLIF(screen_name, ''), 'Solicitud Cambios Marcacion'),
           menu_label = COALESCE(NULLIF(menu_label, ''), 'Solicitar Marcaciones'),
           route_path = COALESCE(NULLIF(route_path, ''), '/dashboard/kiosk/time-punch-requests'),
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_scr_kiosk;
  END IF;

  -- Pantalla SUPERVISOR/RHADMIN
  SELECT id INTO v_scr_approvals
  FROM public.screens
  WHERE screen_key = 'TIME_PUNCH_CHANGE_APPROVALS'
  LIMIT 1;

  IF v_scr_approvals IS NULL THEN
    INSERT INTO public.screens (
      id, screen_key, screen_name, menu_label, menu_group_id,
      route_path, icon_key, sort_order, is_active, created_by
    )
    VALUES (
      gen_random_uuid(), 'TIME_PUNCH_CHANGE_APPROVALS', 'Aprobacion Cambios Marcacion', 'Aprobar Marcaciones',
      v_menu_employee, '/dashboard/employees/time-punch-change-approvals', 'ClipboardCheck', 126, true, 'SYSTEM'
    )
    RETURNING id INTO v_scr_approvals;
  ELSE
    UPDATE public.screens
       SET screen_name = COALESCE(NULLIF(screen_name, ''), 'Aprobacion Cambios Marcacion'),
           menu_label = COALESCE(NULLIF(menu_label, ''), 'Aprobar Marcaciones'),
           route_path = COALESCE(NULLIF(route_path, ''), '/dashboard/employees/time-punch-change-approvals'),
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_scr_approvals;
  END IF;

  -- Acciones
  SELECT id INTO v_act_view FROM public.actions WHERE action_key = 'VIEW' LIMIT 1;
  SELECT id INTO v_act_create FROM public.actions WHERE action_key = 'CREATE' LIMIT 1;
  SELECT id INTO v_act_edit FROM public.actions WHERE action_key = 'EDIT' LIMIT 1;
  SELECT id INTO v_act_delete FROM public.actions WHERE action_key = 'DELETE' LIMIT 1;
  SELECT id INTO v_act_cancel FROM public.actions WHERE action_key = 'CANCEL' LIMIT 1;
  SELECT id INTO v_act_comment FROM public.actions WHERE action_key = 'COMMENT' LIMIT 1;
  SELECT id INTO v_act_approve FROM public.actions WHERE action_key = 'APPROVE' LIMIT 1;
  SELECT id INTO v_act_reject FROM public.actions WHERE action_key = 'REJECT' LIMIT 1;

  IF v_act_cancel IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'CANCEL', 'Cancelar', true, 'SYSTEM')
    RETURNING id INTO v_act_cancel;
  END IF;

  IF v_act_comment IS NULL THEN
    INSERT INTO public.actions (id, action_key, action_name, is_active, created_by)
    VALUES (gen_random_uuid(), 'COMMENT', 'Comentar', true, 'SYSTEM')
    RETURNING id INTO v_act_comment;
  END IF;

  -- Screen actions EMPLOYEE
  INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
  SELECT gen_random_uuid(), v_scr_kiosk, a.action_id, true, 'SYSTEM'
  FROM (VALUES (v_act_view), (v_act_create), (v_act_edit), (v_act_delete), (v_act_cancel)) AS a(action_id)
  WHERE a.action_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.screen_actions sa
      WHERE sa.screen_id = v_scr_kiosk
        AND sa.action_id = a.action_id
    );

  UPDATE public.screen_actions
     SET is_active = true, updated_by = 'SYSTEM', updated_at = now()
   WHERE screen_id = v_scr_kiosk
     AND action_id IN (v_act_view, v_act_create, v_act_edit, v_act_delete, v_act_cancel);

  -- Screen actions APPROVALS
  INSERT INTO public.screen_actions (id, screen_id, action_id, is_active, created_by)
  SELECT gen_random_uuid(), v_scr_approvals, a.action_id, true, 'SYSTEM'
  FROM (VALUES (v_act_view), (v_act_edit), (v_act_comment), (v_act_approve), (v_act_reject)) AS a(action_id)
  WHERE a.action_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.screen_actions sa
      WHERE sa.screen_id = v_scr_approvals
        AND sa.action_id = a.action_id
    );

  UPDATE public.screen_actions
     SET is_active = true, updated_by = 'SYSTEM', updated_at = now()
   WHERE screen_id = v_scr_approvals
     AND action_id IN (v_act_view, v_act_edit, v_act_comment, v_act_approve, v_act_reject);

  -- Permisos EMPLOYEE para KIOSK_TIME_PUNCH_REQUESTS
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

  -- Permisos SUPERVISOR/RHADMIN para TIME_PUNCH_CHANGE_APPROVALS
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

  -- Deniega la pantalla de aprobacion al resto de roles
  UPDATE public.role_screen_actions rsa
     SET is_allowed = false, is_active = true, updated_by = 'SYSTEM', updated_at = now()
    FROM public.screen_actions sa,
         public.roles r
   WHERE rsa.screen_action_id = sa.id
     AND rsa.role_id = r.id
     AND sa.screen_id = v_scr_approvals
     AND COALESCE(r.role_key, '') NOT IN ('SUPERVISOR', 'RHADMIN');

  RAISE NOTICE 'Paquete de solicitudes de cambio de marcacion configurado.';
END $$;

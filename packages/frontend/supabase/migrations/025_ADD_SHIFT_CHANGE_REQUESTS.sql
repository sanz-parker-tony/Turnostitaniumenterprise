-- ============================================================================
-- 025_ADD_SHIFT_CHANGE_REQUESTS
-- Crea tabla de solicitudes de cambio de turno y catalogo de estados.
-- Idempotente.
-- ============================================================================

SET search_path TO public;

-- 1) Catalogo de estados para solicitudes de cambio de turno
DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id
    INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'SHIFT_CHANGE_REQUEST_STATUS'
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
      'SHIFT_CHANGE_REQUEST_STATUS',
      'Estados Solicitud Cambio Turno',
      'Estado Cambio',
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
      ('PENDING',   'Pendiente',    'Pendiente',    10),
      ('IN_REVIEW', 'En Revision',  'Revision',     20),
      ('APPROVED',  'Aprobada',     'Aprobada',     30),
      ('REJECTED',  'Denegada',     'Denegada',     40),
      ('CANCELLED', 'Cancelada',    'Cancelada',    50)
  ) AS x(lookup_key, lookup_label, lookup_short_label, sort_order)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.lookup_values lv
    WHERE lv.lookup_group_id = v_group_id
      AND UPPER(lv.lookup_key) = x.lookup_key
  );
END $$;

-- 2) Tabla principal de solicitudes de cambio de turno
CREATE TABLE IF NOT EXISTS public.employee_shift_change_requests
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    company_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    shift_date date NOT NULL,
    current_shift_id uuid NOT NULL,
    requested_shift_id uuid NOT NULL,
    reason text NOT NULL,
    request_status_id uuid NOT NULL,
    supervisor_notes text,
    approved_by uuid,
    approved_at timestamp with time zone,
    is_active boolean NOT NULL DEFAULT true,
    created_by character varying COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_by character varying COLLATE pg_catalog."default",
    updated_at timestamp with time zone,
    CONSTRAINT employee_shift_change_requests_pkey PRIMARY KEY (id),
    CONSTRAINT employee_shift_change_requests_tenant_id_fkey FOREIGN KEY (tenant_id)
      REFERENCES public.tenants (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_shift_change_requests_company_id_fkey FOREIGN KEY (company_id)
      REFERENCES public.companies (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_shift_change_requests_employee_id_fkey FOREIGN KEY (employee_id)
      REFERENCES public.employees (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_shift_change_requests_current_shift_id_fkey FOREIGN KEY (current_shift_id)
      REFERENCES public.shifts (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_shift_change_requests_requested_shift_id_fkey FOREIGN KEY (requested_shift_id)
      REFERENCES public.shifts (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_shift_change_requests_request_status_id_fkey FOREIGN KEY (request_status_id)
      REFERENCES public.lookup_values (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT employee_shift_change_requests_approved_by_fkey FOREIGN KEY (approved_by)
      REFERENCES public.users (id) MATCH SIMPLE
      ON UPDATE NO ACTION
      ON DELETE NO ACTION,
    CONSTRAINT ck_shift_change_requested_not_equal_current
      CHECK (requested_shift_id <> current_shift_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_change_req_tenant_employee_date
  ON public.employee_shift_change_requests (tenant_id, employee_id, shift_date);

CREATE INDEX IF NOT EXISTS idx_shift_change_req_tenant_status
  ON public.employee_shift_change_requests (tenant_id, request_status_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shift_change_req_approver
  ON public.employee_shift_change_requests (approved_by, approved_at DESC);

-- 3) Integridad: estado por defecto para nuevas filas (PENDING)
DO $$
DECLARE
  v_status_group_id uuid;
  v_pending_status_id uuid;
BEGIN
  SELECT id INTO v_status_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'SHIFT_CHANGE_REQUEST_STATUS'
  LIMIT 1;

  IF v_status_group_id IS NULL THEN
    RAISE NOTICE 'No existe SHIFT_CHANGE_REQUEST_STATUS, se omite default de estado.';
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
    -- Ajusta solo registros nulos (si existen por cargas previas)
    UPDATE public.employee_shift_change_requests
       SET request_status_id = v_pending_status_id
     WHERE request_status_id IS NULL;
  END IF;
END $$;


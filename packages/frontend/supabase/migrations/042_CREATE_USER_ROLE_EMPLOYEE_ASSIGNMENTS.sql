-- ============================================================================
-- 042_CREATE_USER_ROLE_EMPLOYEE_ASSIGNMENTS
-- Objetivo:
-- - Gestionar autorizacion explicita de empleados por user_role para TENANT_ADMIN
--   de forma independiente a la estructura de alcances.
-- ============================================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS public.user_role_employee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(100) NOT NULL DEFAULT 'SYSTEM',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(100),
  updated_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_role_employee_assignments_key
  ON public.user_role_employee_assignments (tenant_id, user_role_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_user_role_employee_assignments_active
  ON public.user_role_employee_assignments (tenant_id, user_role_id, is_active, employee_id);

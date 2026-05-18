-- ============================================================================
-- 041_ADD_EMPLOYEE_EXCLUDE_SCOPE_TYPE
-- Objetivo:
-- - Permitir exclusiones explicitas de empleados por user_role para que
--   TENANT_ADMIN pueda mover empleados entre Autorizados/No autorizados
--   sin depender de la estructura.
-- ============================================================================

SET search_path TO public;

INSERT INTO public.scope_types (scope_type_key, scope_type_name, is_active, created_by)
VALUES ('EMPLOYEE_EXCLUDE', 'Exclusion de Empleado', true, 'SYSTEM')
ON CONFLICT (scope_type_key)
DO UPDATE SET
  scope_type_name = EXCLUDED.scope_type_name,
  is_active = true,
  updated_by = 'SYSTEM',
  updated_at = now();

-- ============================================================================
-- 039_ADD_EMPLOYEE_PROFILE_SCOPE_TYPE
-- Objetivo:
-- - Asegurar que exista el scope_type EMPLOYEE_PROFILE para guardar perfiles
--   desde Seguridades > Alcances por usuario.
-- ============================================================================

SET search_path TO public;

INSERT INTO public.scope_types (scope_type_key, scope_type_name, is_active, created_by)
VALUES ('EMPLOYEE_PROFILE', 'Perfil de Empleado', true, 'SYSTEM')
ON CONFLICT (scope_type_key)
DO UPDATE SET
  scope_type_name = EXCLUDED.scope_type_name,
  is_active = true,
  updated_by = 'SYSTEM',
  updated_at = now();

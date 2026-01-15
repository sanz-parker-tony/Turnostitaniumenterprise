-- ============================================================================
-- 👁️ VIEW: users_with_primary_role
-- ============================================================================
-- PROPÓSITO: Vista que combina users + su rol principal (prioridad SYSTEM)
-- FECHA: 2025-01-15
-- ============================================================================

-- Eliminar vista si existe
DROP VIEW IF EXISTS public.users_with_primary_role CASCADE;

-- Crear vista
CREATE OR REPLACE VIEW public.users_with_primary_role AS
SELECT 
  u.id,
  u.auth_user_id,
  u.tenant_id,
  u.username,
  u.email,
  u.display_name,
  u.preferred_language_code,
  u.last_login_at,
  u.created_at,
  u.is_active,
  -- Rol principal (prioriza SYSTEM sobre TENANT)
  (
    SELECT r.id
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = u.id
      AND ur.is_active = true
      AND r.is_active = true
    ORDER BY 
      CASE WHEN r.role_scope = 'SYSTEM' THEN 1 ELSE 2 END,
      ur.created_at ASC
    LIMIT 1
  ) as role_id,
  (
    SELECT r.role_key
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = u.id
      AND ur.is_active = true
      AND r.is_active = true
    ORDER BY 
      CASE WHEN r.role_scope = 'SYSTEM' THEN 1 ELSE 2 END,
      ur.created_at ASC
    LIMIT 1
  ) as role_key,
  (
    SELECT r.role_name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = u.id
      AND ur.is_active = true
      AND r.is_active = true
    ORDER BY 
      CASE WHEN r.role_scope = 'SYSTEM' THEN 1 ELSE 2 END,
      ur.created_at ASC
    LIMIT 1
  ) as role_name,
  (
    SELECT r.role_scope
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = u.id
      AND ur.is_active = true
      AND r.is_active = true
    ORDER BY 
      CASE WHEN r.role_scope = 'SYSTEM' THEN 1 ELSE 2 END,
      ur.created_at ASC
    LIMIT 1
  ) as role_scope,
  -- Flag de Super Admin (tiene rol con scope SYSTEM)
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = u.id
      AND ur.is_active = true
      AND r.is_active = true
      AND r.role_scope = 'SYSTEM'
  ) as is_super_admin
FROM users u;

-- Comentario
COMMENT ON VIEW public.users_with_primary_role IS 
  'Vista que muestra usuarios con su rol principal. Prioriza roles SYSTEM sobre TENANT.';

-- ============================================================================
-- 🔍 VERIFICACIÓN
-- ============================================================================

-- Ver todos los usuarios con sus roles
SELECT 
  username,
  email,
  role_key,
  role_name,
  role_scope,
  is_super_admin,
  is_active
FROM users_with_primary_role
ORDER BY is_super_admin DESC, username;

-- Ver solo Super Admins
SELECT 
  username,
  email,
  role_key,
  role_name,
  role_scope,
  is_super_admin
FROM users_with_primary_role
WHERE is_super_admin = true;

-- ============================================================================
-- ✅ LISTO!
-- ============================================================================
-- Ahora puedes consultar:
--   SELECT * FROM users_with_primary_role WHERE auth_user_id = '...'
--
-- Y obtendrás:
--   - role_key, role_name, role_scope
--   - is_super_admin (true si tiene rol SYSTEM)
-- ============================================================================

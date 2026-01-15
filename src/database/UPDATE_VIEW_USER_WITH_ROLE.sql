-- ============================================================================
-- 👁️ ACTUALIZAR VIEW: users_with_primary_role
-- ============================================================================
-- AGREGAR: tenant_name desde la tabla tenants
-- FECHA: 2026-01-15
-- ============================================================================

-- Eliminar vista existente
DROP VIEW IF EXISTS public.users_with_primary_role CASCADE;

-- Recrear vista CON tenant_name
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
  -- ✅ AGREGAR: Nombre del tenant
  t.tenant_name,
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
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id;

-- Comentario
COMMENT ON VIEW public.users_with_primary_role IS 
  'Vista que muestra usuarios con su rol principal y tenant_name. Prioriza roles SYSTEM sobre TENANT.';

-- ============================================================================
-- 🔍 VERIFICACIÓN
-- ============================================================================

-- Ver usuario específico
SELECT 
  username,
  email,
  tenant_name,
  role_key,
  role_name,
  role_scope,
  is_super_admin
FROM users_with_primary_role
WHERE email = 'sanchez.victor@titanium-labs.com';

-- ✅ AHORA DEBERÍA DEVOLVER:
--   tenant_name: 'SYSTEM_ADMIN'
--   role_scope: 'SYSTEM'
--   is_super_admin: true

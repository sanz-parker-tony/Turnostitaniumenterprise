-- ============================================================================
-- VERIFICAR ESTRUCTURA DE TABLAS CRÍTICAS
-- ============================================================================

-- 1. Estructura de la tabla TENANTS
SELECT 
  '📋 ESTRUCTURA DE TENANTS' AS info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
ORDER BY ordinal_position;

-- 2. Estructura de la tabla ROLES
SELECT 
  '📋 ESTRUCTURA DE ROLES' AS info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'roles'
ORDER BY ordinal_position;

-- 3. Estructura de la tabla USERS
SELECT 
  '📋 ESTRUCTURA DE USERS' AS info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. Verificar contenido actual de tenants
SELECT 
  '📋 CONTENIDO ACTUAL DE TENANTS' AS info,
  *
FROM tenants
LIMIT 5;

-- 5. Verificar contenido actual de roles
SELECT 
  '📋 CONTENIDO ACTUAL DE ROLES' AS info,
  *
FROM roles
LIMIT 10;

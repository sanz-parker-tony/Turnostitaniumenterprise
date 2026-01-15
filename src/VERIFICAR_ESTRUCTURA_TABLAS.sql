-- ============================================================================
-- PASO 1: VERIFICAR ESTRUCTURA DE TABLAS
-- ============================================================================

-- Ver estructura de TENANTS
SELECT 
  '📋 ESTRUCTURA TENANTS' AS tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tenants'
ORDER BY ordinal_position;

-- Ver estructura de ROLES
SELECT 
  '📋 ESTRUCTURA ROLES' AS tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'roles'
ORDER BY ordinal_position;

-- Ver estructura de USERS
SELECT 
  '📋 ESTRUCTURA USERS' AS tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Ver estructura de USER_ROLES
SELECT 
  '📋 ESTRUCTURA USER_ROLES' AS tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_roles'
ORDER BY ordinal_position;

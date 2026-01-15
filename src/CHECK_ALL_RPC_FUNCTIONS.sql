-- ============================================================================
-- VERIFICAR TODAS LAS FUNCIONES RPC POR DUPLICADOS
-- ============================================================================

-- 1. Ver TODAS las funciones que empiezan con 'get_user' o son RPC
SELECT 
  proname AS function_name,
  COUNT(*) AS num_versions,
  STRING_AGG(pg_get_function_arguments(oid), ' | ') AS all_arguments
FROM pg_proc
WHERE proname IN (
  'get_user_screens',
  'get_user_screen_actions', 
  'user_has_permission',
  'get_user_accessible_entities',
  'user_can_access_entity'
)
GROUP BY proname
HAVING COUNT(*) > 1
ORDER BY proname;

-- 2. Detalle de TODAS las funciones RPC
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.oid
FROM pg_proc p
WHERE p.proname IN (
  'get_user_screens',
  'get_user_screen_actions', 
  'user_has_permission',
  'get_user_accessible_entities',
  'user_can_access_entity'
)
ORDER BY p.proname, p.oid;

-- 3. Si encuentras duplicados, anota los nombres aquí:
-- FUNCIONES CON DUPLICADOS:
-- [ Anota aquí cuáles tienen más de una versión ]

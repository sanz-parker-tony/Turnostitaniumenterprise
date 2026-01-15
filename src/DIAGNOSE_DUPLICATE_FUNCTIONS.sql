-- ============================================================================
-- DIAGNÓSTICO: Verificar funciones duplicadas
-- ============================================================================

-- 1. Ver TODAS las versiones de get_user_screens que existen
SELECT 
  p.oid,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
WHERE p.proname = 'get_user_screens'
ORDER BY p.oid;

-- 2. Ver solo el resumen
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  oidvectortypes(proargtypes) AS argument_types
FROM pg_proc
WHERE proname = 'get_user_screens';

-- 3. Ver dependencias
SELECT 
  p.proname,
  d.deptype,
  c.relname AS dependent_object
FROM pg_proc p
LEFT JOIN pg_depend d ON p.oid = d.objid
LEFT JOIN pg_class c ON d.refobjid = c.oid
WHERE p.proname = 'get_user_screens';

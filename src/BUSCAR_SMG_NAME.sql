-- ============================================================================
-- BUSCAR TODAS LAS REFERENCIAS A smg.name
-- ============================================================================

-- Buscar en funciones
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition LIKE '%smg.name%'
ORDER BY routine_name;

-- Buscar en vistas
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition LIKE '%smg.name%'
ORDER BY table_name;

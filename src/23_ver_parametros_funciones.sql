-- =====================================================
-- VER PARÁMETROS DE FUNCIONES DUPLICADAS
-- Para entender por qué hay 7 en lugar de 5
-- =====================================================

-- Ver funciones con sus parámetros
SELECT 
    r.routine_name,
    r.specific_name,
    r.data_type as return_type,
    pg_get_function_arguments(p.oid) as parameters,
    pg_get_functiondef(p.oid) as full_definition
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  )
ORDER BY r.routine_name, r.specific_name;

-- Ver solo nombres y parámetros (más corto)
SELECT 
    r.routine_name,
    pg_get_function_arguments(p.oid) as parameters,
    r.specific_name
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  )
ORDER BY r.routine_name, r.specific_name;

-- Ver duplicados específicamente
SELECT 
    routine_name,
    COUNT(*) as cantidad,
    array_agg(specific_name) as specific_names
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  )
GROUP BY routine_name
HAVING COUNT(*) > 1
ORDER BY routine_name;

-- =====================================================
-- DIAGNÓSTICO DE FUNCIONES SQL
-- Verificar qué funciones existen en el sistema
-- =====================================================

-- Ver TODAS las funciones en el esquema public
SELECT 
    routine_name,
    routine_type,
    data_type,
    specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Ver SOLO las funciones de permisos que esperamos
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  )
ORDER BY routine_name;

-- Contar funciones de permisos
SELECT 
    'Funciones de permisos encontradas' as descripcion,
    COUNT(*) as total
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  );

-- Ver detalles completos de cada función
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  )
ORDER BY routine_name;

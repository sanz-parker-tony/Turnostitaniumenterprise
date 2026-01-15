-- =====================================================
-- ELIMINAR FUNCIONES DUPLICADAS
-- Ejecuta esto SOLO si el archivo 23 confirma que hay duplicados
-- =====================================================

-- PASO 1: Eliminar TODAS las versiones de las 5 funciones
-- (Luego las recrearemos correctamente)

DROP FUNCTION IF EXISTS get_user_screens(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_screen_actions(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS user_has_permission(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS user_can_access_entity(TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_entities(TEXT, TEXT) CASCADE;

-- Verificar que se eliminaron
SELECT 
    'Funciones eliminadas' as status,
    COUNT(*) as funciones_restantes
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  );

-- =====================================================
-- PASO 2: RECREAR LAS FUNCIONES CORRECTAMENTE
-- Ejecuta el archivo 15_create_permission_functions.sql
-- después de ejecutar este script
-- =====================================================

-- NOTA: Después de ejecutar este script:
-- 1. Ejecuta: /15_create_permission_functions.sql
-- 2. Verifica con: /22_quick_test_CORREGIDO.sql

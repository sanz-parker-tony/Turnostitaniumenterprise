-- =====================================================
-- ELIMINAR TODAS LAS VERSIONES DE LAS FUNCIONES
-- Usa DROP ... CASCADE para forzar eliminación
-- =====================================================

-- Eliminar TODAS las variantes de get_user_screens
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'get_user_screens' 
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- Eliminar TODAS las variantes de get_user_screen_actions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'get_user_screen_actions' 
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- Eliminar TODAS las variantes de user_has_permission
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'user_has_permission' 
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- Eliminar TODAS las variantes de user_can_access_entity
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'user_can_access_entity' 
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- Eliminar TODAS las variantes de get_user_accessible_entities
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'get_user_accessible_entities' 
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- =====================================================
-- VERIFICAR QUE SE ELIMINARON TODAS
-- =====================================================

SELECT 
    'Funciones restantes después de eliminar' as status,
    COUNT(*) as funciones_restantes,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Todas eliminadas correctamente'
        ELSE '❌ Aún quedan funciones - ejecutar de nuevo'
    END as resultado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  );

-- Ver detalle de las restantes (si quedan)
SELECT 
    routine_name,
    specific_name
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

-- =====================================================
-- SIGUIENTE PASO:
-- Si la verificación muestra 0 funciones restantes, ejecuta:
-- /15_create_permission_functions.sql
-- =====================================================

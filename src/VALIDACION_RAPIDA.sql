-- =====================================================
-- ⚡ VALIDACIÓN RÁPIDA - get_user_screens()
-- =====================================================
-- Script simplificado para validar rápidamente la función
-- =====================================================

-- 🔍 TEST 1: ¿La función existe?
SELECT 
    routine_name,
    '✅ EXISTE' as status
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_user_screens';

-- 🔍 TEST 2: ¿Devuelve los campos correctos?
SELECT 
    parameter_name,
    data_type,
    '✅ OK' as status
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'get_user_screens%'
  AND parameter_mode = 'OUT'
  AND parameter_name IN ('menu_group_icon', 'screen_icon_key', 'route_path')
ORDER BY parameter_name;

-- 🔍 TEST 3: ¿Ejecuta correctamente y devuelve datos?
WITH test_data AS (
    SELECT 
        menu_group_key,
        menu_group_name,
        menu_group_icon,
        screen_key,
        screen_name,
        screen_icon_key,
        route_path,
        can_view
    FROM public.get_user_screens(
        (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
        (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
    )
    LIMIT 3
)
SELECT 
    *,
    CASE 
        WHEN menu_group_icon IS NOT NULL 
         AND screen_icon_key IS NOT NULL 
         AND route_path IS NOT NULL 
        THEN '✅ TODOS LOS CAMPOS OK'
        ELSE '❌ FALTAN CAMPOS'
    END as validation_status
FROM test_data;

-- 🔍 TEST 4: ¿Cuántas pantallas retorna?
SELECT 
    COUNT(*) as total_pantallas,
    COUNT(DISTINCT menu_group_key) as total_grupos,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ RETORNA DATOS'
        ELSE '❌ NO RETORNA DATOS'
    END as status
FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
);

-- 🔍 TEST 5: ¿Hay íconos NULL?
SELECT 
    COUNT(CASE WHEN menu_group_icon IS NULL THEN 1 END) as iconos_grupo_null,
    COUNT(CASE WHEN screen_icon_key IS NULL THEN 1 END) as iconos_pantalla_null,
    COUNT(CASE WHEN route_path IS NULL THEN 1 END) as rutas_null,
    CASE 
        WHEN COUNT(CASE WHEN menu_group_icon IS NULL THEN 1 END) = 0
         AND COUNT(CASE WHEN screen_icon_key IS NULL THEN 1 END) = 0
         AND COUNT(CASE WHEN route_path IS NULL THEN 1 END) = 0
        THEN '✅ SIN NULLS'
        ELSE '❌ HAY NULLS'
    END as status
FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
);

-- =====================================================
-- 📊 RESUMEN FINAL
-- =====================================================
-- Si TODOS los tests muestran ✅ → La función está perfecta
-- Si ALGÚN test muestra ❌ → Ejecutar /DIAGNOSTICO_get_user_screens.sql
-- =====================================================

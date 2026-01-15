-- =====================================================
-- 🚀 TODO EN UNO - Corregir y Validar get_user_screens
-- =====================================================
-- Este script:
-- 1. Actualiza/crea la función get_user_screens()
-- 2. Valida que funcione correctamente
-- 3. Muestra resultados de ejemplo
-- =====================================================

-- =====================================================
-- PARTE 1: ACTUALIZAR LA FUNCIÓN
-- =====================================================
DROP FUNCTION IF EXISTS public.get_user_screens(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_user_screens(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS TABLE (
    menu_group_key VARCHAR,
    menu_group_name VARCHAR,
    menu_group_icon VARCHAR,
    menu_group_sort INT,
    screen_id UUID,
    screen_key VARCHAR,
    screen_name VARCHAR,
    screen_icon_key VARCHAR,
    route_path VARCHAR,
    screen_sort INT,
    can_view BOOLEAN,
    can_create BOOLEAN,
    can_update BOOLEAN,
    can_delete BOOLEAN,
    can_export BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        smg.menu_group_key,
        smg.menu_group_name,
        smg.icon_key as menu_group_icon,
        smg.sort_order as menu_group_sort,
        s.id as screen_id,
        s.screen_key,
        s.screen_name,
        s.icon_key as screen_icon_key,
        s.route_path,
        s.sort_order as screen_sort,
        bool_or(CASE WHEN a.action_key = 'VIEW' THEN true ELSE false END) as can_view,
        bool_or(CASE WHEN a.action_key = 'CREATE' THEN true ELSE false END) as can_create,
        bool_or(CASE WHEN a.action_key = 'UPDATE' THEN true ELSE false END) as can_update,
        bool_or(CASE WHEN a.action_key = 'DELETE' THEN true ELSE false END) as can_delete,
        bool_or(CASE WHEN a.action_key = 'EXPORT' THEN true ELSE false END) as can_export
    FROM public.user_roles ur
    JOIN public.role_screen_actions rsa ON rsa.role_id = ur.role_id
    JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
    JOIN public.screens s ON s.id = sa.screen_id
    JOIN public.actions a ON a.id = sa.action_id
    JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
    WHERE ur.user_id = p_user_id
      AND ur.tenant_id = p_tenant_id
      AND ur.is_active = true
      AND rsa.is_active = true
      AND sa.is_active = true
      AND s.is_active = true
      AND smg.is_active = true
    GROUP BY 
        smg.menu_group_key,
        smg.menu_group_name,
        smg.icon_key,
        smg.sort_order,
        s.id,
        s.screen_key,
        s.screen_name,
        s.icon_key,
        s.route_path,
        s.sort_order
    ORDER BY smg.sort_order, s.sort_order;
END;
$$;

-- =====================================================
-- PARTE 2: VALIDACIÓN AUTOMÁTICA
-- =====================================================

-- Test 1: ✅ Verificar que la función existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
          AND routine_name = 'get_user_screens'
    ) THEN
        RAISE NOTICE '✅ TEST 1 PASSED: La función get_user_screens existe';
    ELSE
        RAISE EXCEPTION '❌ TEST 1 FAILED: La función get_user_screens NO existe';
    END IF;
END $$;

-- Test 2: ✅ Verificar campos de salida
DO $$ 
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.parameters
    WHERE specific_schema = 'public'
      AND specific_name LIKE 'get_user_screens%'
      AND parameter_mode = 'OUT'
      AND parameter_name IN ('menu_group_icon', 'screen_icon_key', 'route_path');
    
    IF v_count = 3 THEN
        RAISE NOTICE '✅ TEST 2 PASSED: Los 3 campos nuevos están presentes (menu_group_icon, screen_icon_key, route_path)';
    ELSE
        RAISE EXCEPTION '❌ TEST 2 FAILED: Faltan campos. Encontrados: %', v_count;
    END IF;
END $$;

-- Test 3: ✅ Verificar que retorna datos
DO $$ 
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.get_user_screens(
        (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
        (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
    );
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ TEST 3 PASSED: La función retorna % pantallas', v_count;
    ELSE
        RAISE EXCEPTION '❌ TEST 3 FAILED: La función no retorna datos';
    END IF;
END $$;

-- Test 4: ✅ Verificar que no hay NULLs en los íconos
DO $$ 
DECLARE
    v_null_count INT;
BEGIN
    SELECT 
        COUNT(CASE WHEN menu_group_icon IS NULL THEN 1 END) +
        COUNT(CASE WHEN screen_icon_key IS NULL THEN 1 END) +
        COUNT(CASE WHEN route_path IS NULL THEN 1 END)
    INTO v_null_count
    FROM public.get_user_screens(
        (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
        (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
    );
    
    IF v_null_count = 0 THEN
        RAISE NOTICE '✅ TEST 4 PASSED: No hay campos NULL en íconos o rutas';
    ELSE
        RAISE WARNING '⚠️ TEST 4 WARNING: Se encontraron % campos NULL', v_null_count;
    END IF;
END $$;

-- =====================================================
-- PARTE 3: MOSTRAR RESULTADOS DE EJEMPLO
-- =====================================================

-- Mostrar primeras 15 pantallas
SELECT 
    '📊 EJEMPLO DE DATOS RETORNADOS (Primeras 15 pantallas):' as titulo;

SELECT 
    menu_group_key,
    menu_group_name,
    menu_group_icon,
    screen_key,
    screen_name,
    screen_icon_key,
    route_path,
    can_view,
    can_create,
    can_update,
    can_delete,
    can_export
FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
)
ORDER BY menu_group_sort, screen_sort
LIMIT 15;

-- =====================================================
-- PARTE 4: ESTADÍSTICAS
-- =====================================================

SELECT 
    '📈 ESTADÍSTICAS GENERALES:' as titulo;

SELECT 
    COUNT(*) as total_pantallas,
    COUNT(DISTINCT menu_group_key) as total_grupos,
    COUNT(CASE WHEN can_view = true THEN 1 END) as pantallas_con_view,
    COUNT(CASE WHEN can_create = true THEN 1 END) as pantallas_con_create,
    COUNT(CASE WHEN menu_group_icon IS NULL THEN 1 END) as iconos_grupo_null,
    COUNT(CASE WHEN screen_icon_key IS NULL THEN 1 END) as iconos_pantalla_null,
    COUNT(CASE WHEN route_path IS NULL THEN 1 END) as rutas_null
FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
);

-- =====================================================
-- 📊 INTERPRETACIÓN DE RESULTADOS
-- =====================================================
-- Si ves en los NOTICES:
-- ✅ TEST 1 PASSED
-- ✅ TEST 2 PASSED  
-- ✅ TEST 3 PASSED
-- ✅ TEST 4 PASSED
--
-- Y en las estadísticas:
-- - total_pantallas > 0
-- - iconos_grupo_null = 0
-- - iconos_pantalla_null = 0
-- - rutas_null = 0
--
-- → ¡¡¡LA FUNCIÓN ESTÁ PERFECTA!!!
-- → Puedes ir al frontend y hacer hard refresh
-- =====================================================

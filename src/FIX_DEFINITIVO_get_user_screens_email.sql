-- =====================================================
-- 🚀 FIX DEFINITIVO - get_user_screens CON p_user_email
-- =====================================================
-- Esta versión acepta p_user_email (como el frontend lo llama)
-- y devuelve TODOS los campos incluyendo íconos
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_screens(VARCHAR);
DROP FUNCTION IF EXISTS public.get_user_screens(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_user_screens(
    p_user_email VARCHAR
)
RETURNS TABLE (
    menu_group_key VARCHAR,
    menu_group_name VARCHAR,
    menu_group_icon VARCHAR,      -- ✅ NUEVO: Ícono del grupo
    menu_group_sort INT,
    screen_id UUID,
    screen_key VARCHAR,
    screen_name VARCHAR,
    screen_icon_key VARCHAR,      -- ✅ NUEVO: Ícono de la pantalla
    route_path VARCHAR,            -- ✅ NUEVO: Ruta de la pantalla
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
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Obtener user_id y tenant_id desde el email
    SELECT id, tenant_id 
    INTO v_user_id, v_tenant_id
    FROM public.users 
    WHERE email = p_user_email 
    LIMIT 1;

    -- Si no se encuentra el usuario, retornar vacío
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Retornar las pantallas con TODOS los campos
    RETURN QUERY
    SELECT DISTINCT
        smg.menu_group_key,
        smg.menu_group_name,
        smg.icon_key as menu_group_icon,     -- ✅ Ícono del grupo
        smg.sort_order as menu_group_sort,
        s.id as screen_id,
        s.screen_key,
        s.screen_name,
        s.icon_key as screen_icon_key,       -- ✅ Ícono de la pantalla
        s.route_path,                         -- ✅ Ruta de la pantalla
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
    WHERE ur.user_id = v_user_id
      AND ur.tenant_id = v_tenant_id
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
-- ✅ VALIDACIÓN AUTOMÁTICA
-- =====================================================

-- Test 1: Verificar firma de la función
SELECT 
    '✅ TEST 1: Firma de la función' as test,
    routine_name,
    string_agg(parameter_name || ':' || data_type, ', ' ORDER BY ordinal_position) as parametros
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'get_user_screens%'
  AND parameter_mode = 'IN'
GROUP BY routine_name;

-- Test 2: Verificar campos de salida
SELECT 
    '✅ TEST 2: Campos de salida' as test,
    parameter_name,
    data_type
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'get_user_screens%'
  AND parameter_mode = 'OUT'
  AND parameter_name IN ('menu_group_icon', 'screen_icon_key', 'route_path')
ORDER BY parameter_name;

-- Test 3: Ejecutar la función
SELECT 
    '✅ TEST 3: Ejecutar función' as test,
    menu_group_key,
    menu_group_name,
    menu_group_icon,
    screen_key,
    screen_name,
    screen_icon_key,
    route_path
FROM public.get_user_screens('admin@turnos-titanium.com')
LIMIT 5;

-- Test 4: Verificar que no hay NULLs
SELECT 
    '✅ TEST 4: Verificar NULLs' as test,
    COUNT(*) as total,
    COUNT(CASE WHEN menu_group_icon IS NULL THEN 1 END) as iconos_grupo_null,
    COUNT(CASE WHEN screen_icon_key IS NULL THEN 1 END) as iconos_pantalla_null,
    COUNT(CASE WHEN route_path IS NULL THEN 1 END) as rutas_null
FROM public.get_user_screens('admin@turnos-titanium.com');

-- =====================================================
-- 📊 INTERPRETACIÓN
-- =====================================================
-- Si TEST 3 muestra valores en menu_group_icon, screen_icon_key, route_path
-- Y TEST 4 muestra 0 NULLs en todos los campos
-- → ¡La función está PERFECTA!
-- 
-- Después de ejecutar esto, haz hard refresh (Ctrl+Shift+R) en el navegador
-- =====================================================

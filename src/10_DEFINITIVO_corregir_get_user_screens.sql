-- =====================================================
-- CORRECCIÓN DEFINITIVA DE LA FUNCIÓN get_user_screens
-- =====================================================
-- CORRECCIONES:
-- 1. system_menu_groups.icon_key (NO smg.icon o smg.menu_group_icon)
-- 2. screens.icon_key para el ícono individual de cada pantalla
-- 3. screens.route_path (campo correcto para la ruta)
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
    screen_icon_key VARCHAR,  -- ✅ Ícono individual de cada pantalla
    route_path VARCHAR,  -- ✅ Ruta de la pantalla
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
        smg.icon_key as menu_group_icon,  -- ✅ CORRECTO: icon_key de system_menu_groups
        smg.sort_order as menu_group_sort,
        s.id as screen_id,
        s.screen_key,
        s.screen_name,
        s.icon_key as screen_icon_key,  -- ✅ CORRECTO: icon_key de screens
        s.route_path,  -- ✅ CORRECTO: route_path de screens
        s.sort_order as screen_sort,
        -- Verificar cada acción
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
        smg.icon_key,  -- ✅ CORRECTO: icon_key
        smg.sort_order,
        s.id,
        s.screen_key,
        s.screen_name,
        s.icon_key,  -- ✅ CORRECTO: icon_key
        s.route_path,  -- ✅ CORRECTO: route_path
        s.sort_order
    ORDER BY smg.sort_order, s.sort_order;
END;
$$;

-- =====================================================
-- VERIFICAR QUE LA FUNCIÓN SE ACTUALIZÓ CORRECTAMENTE
-- =====================================================
SELECT 
    routine_name as function_name,
    routine_type as type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_screens';

-- =====================================================
-- PROBAR LA FUNCIÓN ACTUALIZADA
-- Debería retornar menu_group_icon y screen_icon_key
-- =====================================================
SELECT 
    menu_group_key,
    menu_group_name,
    menu_group_icon,  -- ✅ Debe mostrar valores como 'LayoutDashboard', 'Building2', etc.
    screen_key,
    screen_name,
    screen_icon_key,  -- ✅ Debe mostrar valores como 'AlertTriangle', 'Calendar', etc.
    route_path,  -- ✅ Debe mostrar la ruta de la pantalla
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
-- DIAGNÓSTICO: Verificar estructura de tablas
-- =====================================================
-- Verificar columnas de system_menu_groups
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'system_menu_groups'
  AND column_name LIKE '%icon%';

-- Verificar columnas de screens
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'screens'
  AND column_name IN ('icon_key', 'route_path');
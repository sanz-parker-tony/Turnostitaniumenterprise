-- =====================================================
-- 🔥 ELIMINAR TODAS LAS VERSIONES Y CREAR UNA SOLA
-- =====================================================

-- Eliminar TODAS las versiones posibles
DROP FUNCTION IF EXISTS public.get_user_screens(VARCHAR);
DROP FUNCTION IF EXISTS public.get_user_screens(TEXT);
DROP FUNCTION IF EXISTS public.get_user_screens(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_screens(character varying);

-- Crear UNA SOLA versión con TEXT (estándar PostgreSQL)
CREATE OR REPLACE FUNCTION public.get_user_screens(
    p_user_email TEXT
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

    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

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

-- ✅ Verificar que solo existe UNA versión
SELECT 
    routine_name,
    string_agg(parameter_name || ':' || data_type, ', ' ORDER BY ordinal_position) as parametros
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'get_user_screens'
  AND parameter_mode = 'IN'
GROUP BY routine_name;

-- ✅ Test simple
SELECT 
    menu_group_key,
    menu_group_name,
    menu_group_icon,
    screen_key,
    screen_name,
    screen_icon_key,
    route_path
FROM public.get_user_screens('admin@turnos-titanium.com') 
LIMIT 5;

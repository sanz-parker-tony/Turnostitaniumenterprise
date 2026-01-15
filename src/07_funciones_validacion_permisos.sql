-- =====================================================
-- FUNCIONES DE VALIDACIÓN DE PERMISOS
-- Para usar en Supabase Edge Functions o Row Level Security
-- =====================================================

-- =====================================================
-- FUNCIÓN 1: Verificar si un usuario tiene un permiso
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_has_permission(
    p_user_id UUID,
    p_tenant_id UUID,
    p_screen_key VARCHAR,
    p_action_key VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_screen_actions rsa ON rsa.role_id = ur.role_id
        JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
        JOIN public.screens s ON s.id = sa.screen_id
        JOIN public.actions a ON a.id = sa.action_id
        WHERE ur.user_id = p_user_id
          AND ur.tenant_id = p_tenant_id
          AND ur.is_active = true
          AND rsa.is_active = true
          AND sa.is_active = true
          AND s.screen_key = p_screen_key
          AND a.action_key = p_action_key
    );
END;
$$;

-- Ejemplo de uso:
-- SELECT public.user_has_permission(
--     'user-uuid-here',
--     'tenant-uuid-here',
--     'COMPANIES',
--     'CREATE'
-- ) AS can_create_companies;

-- =====================================================
-- FUNCIÓN 2: Verificar acceso a una entidad por scope
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_has_scope_access(
    p_user_id UUID,
    p_tenant_id UUID,
    p_scope_type_key VARCHAR,
    p_entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_scopes BOOLEAN;
BEGIN
    -- Verificar si el usuario tiene ALGÚN scope asignado
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_role_scopes urs
        JOIN public.user_roles ur ON ur.id = urs.user_role_id
        WHERE ur.user_id = p_user_id
          AND ur.tenant_id = p_tenant_id
          AND urs.is_active = true
    ) INTO v_has_scopes;
    
    -- REGLA CRÍTICA: Si NO tiene scopes → Acceso TOTAL (Super Admin)
    IF NOT v_has_scopes THEN
        RETURN true;
    END IF;
    
    -- Si SÍ tiene scopes → Verificar si tiene acceso a esta entidad específica
    RETURN EXISTS (
        SELECT 1
        FROM public.user_role_scopes urs
        JOIN public.user_roles ur ON ur.id = urs.user_role_id
        JOIN public.scope_types st ON st.id = urs.scope_type_id
        WHERE ur.user_id = p_user_id
          AND ur.tenant_id = p_tenant_id
          AND urs.is_active = true
          AND st.scope_type_key = p_scope_type_key
          AND urs.scope_entity_id = p_entity_id
    );
END;
$$;

-- Ejemplo de uso:
-- SELECT public.user_has_scope_access(
--     'user-uuid-here',
--     'tenant-uuid-here',
--     'COMPANY',
--     'company-uuid-here'
-- ) AS can_access_company;

-- =====================================================
-- FUNCIÓN 3: Obtener todas las pantallas permitidas para un usuario
-- =====================================================
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
    screen_path VARCHAR,
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
        smg.menu_group_icon,
        smg.sort_order as menu_group_sort,
        s.id as screen_id,
        s.screen_key,
        s.screen_name,
        s.screen_path,
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
        smg.menu_group_icon,
        smg.sort_order,
        s.id,
        s.screen_key,
        s.screen_name,
        s.screen_path,
        s.sort_order
    ORDER BY smg.sort_order, s.sort_order;
END;
$$;

-- Ejemplo de uso:
-- SELECT * FROM public.get_user_screens(
--     'user-uuid-here',
--     'tenant-uuid-here'
-- );

-- =====================================================
-- FUNCIÓN 4: Obtener entidades permitidas para un usuario por scope
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_scope_entities(
    p_user_id UUID,
    p_tenant_id UUID,
    p_scope_type_key VARCHAR
)
RETURNS TABLE (
    entity_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_has_scopes BOOLEAN;
BEGIN
    -- Verificar si el usuario tiene ALGÚN scope asignado
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_role_scopes urs
        JOIN public.user_roles ur ON ur.id = urs.user_role_id
        WHERE ur.user_id = p_user_id
          AND ur.tenant_id = p_tenant_id
          AND urs.is_active = true
    ) INTO v_has_scopes;
    
    -- REGLA CRÍTICA: Si NO tiene scopes → Retornar TODAS las entidades del tipo
    IF NOT v_has_scopes THEN
        RETURN QUERY
        CASE p_scope_type_key
            WHEN 'COMPANY' THEN
                SELECT id FROM public.companies WHERE tenant_id = p_tenant_id AND is_active = true
            WHEN 'WORK_LOCATION' THEN
                SELECT id FROM public.work_locations WHERE tenant_id = p_tenant_id AND is_active = true
            WHEN 'DEPARTMENT' THEN
                SELECT id FROM public.departments WHERE tenant_id = p_tenant_id AND is_active = true
            WHEN 'AREA' THEN
                SELECT id FROM public.areas WHERE tenant_id = p_tenant_id AND is_active = true
            WHEN 'COST_CENTER' THEN
                SELECT id FROM public.cost_centers WHERE tenant_id = p_tenant_id AND is_active = true
            WHEN 'PAYROLL_GROUP' THEN
                SELECT id FROM public.payroll_groups WHERE tenant_id = p_tenant_id AND is_active = true
            ELSE
                SELECT NULL::UUID WHERE false -- No retornar nada para tipos desconocidos
        END;
    ELSE
        -- Si SÍ tiene scopes → Retornar solo las entidades asignadas
        RETURN QUERY
        SELECT urs.scope_entity_id
        FROM public.user_role_scopes urs
        JOIN public.user_roles ur ON ur.id = urs.user_role_id
        JOIN public.scope_types st ON st.id = urs.scope_type_id
        WHERE ur.user_id = p_user_id
          AND ur.tenant_id = p_tenant_id
          AND urs.is_active = true
          AND st.scope_type_key = p_scope_type_key;
    END IF;
END;
$$;

-- Ejemplo de uso:
-- SELECT * FROM public.get_user_scope_entities(
--     'user-uuid-here',
--     'tenant-uuid-here',
--     'COMPANY'
-- );

-- =====================================================
-- FUNCIÓN 5: Verificar si un usuario es Super Admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND ur.tenant_id = p_tenant_id
          AND ur.is_active = true
          AND r.role_key = 'SUPER_ADMIN'
    );
END;
$$;

-- Ejemplo de uso:
-- SELECT public.is_super_admin(
--     'user-uuid-here',
--     'tenant-uuid-here'
-- ) AS is_super_admin;

-- =====================================================
-- VERIFICACIÓN DE FUNCIONES CREADAS
-- =====================================================
SELECT 
    routine_name as function_name,
    routine_type as type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
      'user_has_permission',
      'user_has_scope_access',
      'get_user_screens',
      'get_user_scope_entities',
      'is_super_admin'
  )
ORDER BY routine_name;

-- =====================================================
-- EJEMPLOS DE USO CON EL USUARIO DEMO
-- =====================================================

-- 1. Verificar si el usuario demo puede crear empresas
SELECT public.user_has_permission(
    (SELECT id FROM users WHERE email = 'adminturnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM users WHERE email = 'adminturnos-titanium.com' LIMIT 1),
    'COMPANIES',
    'CREATE'
) AS puede_crear_empresas;

-- 2. Verificar si es Super Admin
SELECT public.is_super_admin(
    (SELECT id FROM users WHERE email = 'adminturnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM users WHERE email = 'adminturnos-titanium.com' LIMIT 1)
) AS es_super_admin;

-- 3. Obtener todas las pantallas del usuario demo (primeras 10)
SELECT * FROM public.get_user_screens(
    (SELECT id FROM users WHERE email = 'adminturnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM users WHERE email = 'adminturnos-titanium.com' LIMIT 1)
)
LIMIT 10;

-- 4. Obtener empresas permitidas para el usuario
SELECT * FROM public.get_user_scope_entities(
    (SELECT id FROM users WHERE email = 'adminturnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM users WHERE email = 'adminturnos-titanium.com' LIMIT 1),
    'COMPANY'
);

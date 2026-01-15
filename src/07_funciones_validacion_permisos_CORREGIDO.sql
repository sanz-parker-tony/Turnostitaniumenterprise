-- =====================================================
-- FUNCIONES DE VALIDACIÓN DE PERMISOS - VERSIÓN CORREGIDA
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

-- =====================================================
-- FUNCIÓN 4: Obtener entidades permitidas para un usuario por scope
-- VERSIÓN CORREGIDA CON IF-ELSIF-ELSE
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
        -- Usar IF-ELSIF-ELSE para cada tipo de scope
        IF p_scope_type_key = 'COMPANY' THEN
            RETURN QUERY
            SELECT c.id FROM public.companies c 
            WHERE c.tenant_id = p_tenant_id AND c.is_active = true;
            
        ELSIF p_scope_type_key = 'WORK_LOCATION' THEN
            RETURN QUERY
            SELECT wl.id FROM public.work_locations wl 
            WHERE wl.tenant_id = p_tenant_id AND wl.is_active = true;
            
        ELSIF p_scope_type_key = 'DEPARTMENT' THEN
            RETURN QUERY
            SELECT d.id FROM public.departments d 
            WHERE d.tenant_id = p_tenant_id AND d.is_active = true;
            
        ELSIF p_scope_type_key = 'AREA' THEN
            RETURN QUERY
            SELECT ar.id FROM public.areas ar 
            WHERE ar.tenant_id = p_tenant_id AND ar.is_active = true;
            
        ELSIF p_scope_type_key = 'COST_CENTER' THEN
            RETURN QUERY
            SELECT cc.id FROM public.cost_centers cc 
            WHERE cc.tenant_id = p_tenant_id AND cc.is_active = true;
            
        ELSIF p_scope_type_key = 'PAYROLL_GROUP' THEN
            RETURN QUERY
            SELECT pg.id FROM public.payroll_groups pg 
            WHERE pg.tenant_id = p_tenant_id AND pg.is_active = true;
            
        ELSIF p_scope_type_key = 'EMPLOYEE' THEN
            RETURN QUERY
            SELECT e.id FROM public.employees e 
            WHERE e.tenant_id = p_tenant_id AND e.is_active = true;
        END IF;
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
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    'COMPANIES',
    'CREATE'
) AS puede_crear_empresas;

-- 2. Verificar si es Super Admin
SELECT public.is_super_admin(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
) AS es_super_admin;

-- 3. Obtener todas las pantallas del usuario demo (primeras 10)
SELECT * FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
)
LIMIT 10;

-- 4. Obtener empresas permitidas para el usuario (debería retornar TODAS porque es Super Admin sin scopes)
SELECT * FROM public.get_user_scope_entities(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    'COMPANY'
);

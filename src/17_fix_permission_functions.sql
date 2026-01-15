-- =====================================================
-- FUNCIONES SQL DE VALIDACIÓN DE PERMISOS - CORREGIDAS
-- Sistema: Turnos Titanium
-- Fix: Usar CAST para convertir VARCHAR a TEXT
-- =====================================================

-- =====================================================
-- FUNCIÓN 1: get_user_screens (CORREGIDA)
-- Obtiene las pantallas a las que el usuario tiene acceso
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_screens(p_user_email TEXT)
RETURNS TABLE (
    screen_key TEXT,
    screen_name TEXT,
    menu_group_key TEXT,
    menu_group_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        s.screen_key::TEXT,
        s.screen_name::TEXT,
        smg.menu_group_key::TEXT,
        smg.menu_group_name::TEXT
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
    JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
    JOIN public.screens s ON s.id = sa.screen_id
    JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
    WHERE u.email = p_user_email
      AND u.is_active = true
      AND ur.is_active = true
      AND r.is_active = true
      AND rsa.is_active = true
      AND sa.is_active = true
      AND s.is_active = true
      AND smg.is_active = true
    ORDER BY smg.menu_group_name, s.screen_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN 2: get_user_screen_actions (CORREGIDA)
-- Obtiene las acciones que el usuario puede ejecutar en una pantalla
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_screen_actions(
    p_user_email TEXT,
    p_screen_key TEXT
)
RETURNS TABLE (
    action_key TEXT,
    action_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        a.action_key::TEXT,
        a.action_name::TEXT
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
    JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
    JOIN public.screens s ON s.id = sa.screen_id
    JOIN public.actions a ON a.id = sa.action_id
    WHERE u.email = p_user_email
      AND s.screen_key = p_screen_key
      AND u.is_active = true
      AND ur.is_active = true
      AND r.is_active = true
      AND rsa.is_active = true
      AND sa.is_active = true
      AND s.is_active = true
      AND a.is_active = true
    ORDER BY a.action_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN 3: user_has_permission (YA FUNCIONA)
-- Verifica si un usuario tiene un permiso específico
-- =====================================================
-- Esta función ya está funcionando correctamente, no necesita cambios

-- =====================================================
-- FUNCIÓN 4: user_can_access_entity (MANTENER)
-- Verifica si un usuario puede acceder a una entidad específica
-- =====================================================
-- Esta función usa BOOLEAN, no necesita corrección

-- =====================================================
-- FUNCIÓN 5: get_user_accessible_entities (CORREGIDA)
-- Obtiene las entidades a las que el usuario tiene acceso
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_accessible_entities(
    p_user_email TEXT,
    p_entity_type TEXT  -- 'COMPANY', 'LOCATION', 'DEPARTMENT', 'AREA'
)
RETURNS TABLE (
    entity_id UUID,
    entity_name TEXT
) AS $$
DECLARE
    v_is_super_admin_no_scopes BOOLEAN;
BEGIN
    -- Verificar si es Super Admin sin scopes (acceso total)
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id
        JOIN public.roles r ON r.id = ur.role_id
        LEFT JOIN public.user_role_scopes urs ON urs.user_role_id = ur.id
        WHERE u.email = p_user_email
          AND r.role_key = 'SUPER_ADMIN'
          AND u.is_active = true
          AND ur.is_active = true
          AND r.is_active = true
        GROUP BY u.id, r.id
        HAVING COUNT(urs.id) = 0
    ) INTO v_is_super_admin_no_scopes;

    -- Si es Super Admin sin scopes, retornar todas las entidades del tenant
    IF v_is_super_admin_no_scopes THEN
        IF p_entity_type = 'COMPANY' THEN
            RETURN QUERY
            SELECT c.id, c.company_name::TEXT
            FROM public.companies c
            JOIN public.users u ON u.tenant_id = c.tenant_id
            WHERE u.email = p_user_email
              AND c.is_active = true;
        ELSIF p_entity_type = 'LOCATION' THEN
            RETURN QUERY
            SELECT l.id, l.location_name::TEXT
            FROM public.work_locations l
            JOIN public.companies c ON c.id = l.company_id
            JOIN public.users u ON u.tenant_id = c.tenant_id
            WHERE u.email = p_user_email
              AND l.is_active = true;
        ELSIF p_entity_type = 'DEPARTMENT' THEN
            RETURN QUERY
            SELECT d.id, d.department_name::TEXT
            FROM public.departments d
            JOIN public.companies c ON c.id = d.company_id
            JOIN public.users u ON u.tenant_id = c.tenant_id
            WHERE u.email = p_user_email
              AND d.is_active = true;
        ELSIF p_entity_type = 'AREA' THEN
            RETURN QUERY
            SELECT a.id, a.area_name::TEXT
            FROM public.areas a
            JOIN public.departments d ON d.id = a.department_id
            JOIN public.companies c ON c.id = d.company_id
            JOIN public.users u ON u.tenant_id = c.tenant_id
            WHERE u.email = p_user_email
              AND a.is_active = true;
        END IF;
    ELSE
        -- Retornar solo las entidades con scopes asignados
        IF p_entity_type = 'COMPANY' THEN
            RETURN QUERY
            SELECT c.id, c.company_name::TEXT
            FROM public.companies c
            JOIN public.user_role_scopes urs ON urs.scope_entity_id = c.id
            JOIN public.user_roles ur ON ur.id = urs.user_role_id
            JOIN public.users u ON u.id = ur.user_id
            WHERE u.email = p_user_email
              AND urs.scope_type = 'COMPANY'
              AND urs.is_active = true
              AND c.is_active = true;
        ELSIF p_entity_type = 'LOCATION' THEN
            RETURN QUERY
            SELECT l.id, l.location_name::TEXT
            FROM public.work_locations l
            JOIN public.user_role_scopes urs ON urs.scope_entity_id = l.id
            JOIN public.user_roles ur ON ur.id = urs.user_role_id
            JOIN public.users u ON u.id = ur.user_id
            WHERE u.email = p_user_email
              AND urs.scope_type = 'LOCATION'
              AND urs.is_active = true
              AND l.is_active = true;
        ELSIF p_entity_type = 'DEPARTMENT' THEN
            RETURN QUERY
            SELECT d.id, d.department_name::TEXT
            FROM public.departments d
            JOIN public.user_role_scopes urs ON urs.scope_entity_id = d.id
            JOIN public.user_roles ur ON ur.id = urs.user_role_id
            JOIN public.users u ON u.id = ur.user_id
            WHERE u.email = p_user_email
              AND urs.scope_type = 'DEPARTMENT'
              AND urs.is_active = true
              AND d.is_active = true;
        ELSIF p_entity_type = 'AREA' THEN
            RETURN QUERY
            SELECT a.id, a.area_name::TEXT
            FROM public.areas a
            JOIN public.user_role_scopes urs ON urs.scope_entity_id = a.id
            JOIN public.user_roles ur ON ur.id = urs.user_role_id
            JOIN public.users u ON u.id = ur.user_id
            WHERE u.email = p_user_email
              AND urs.scope_type = 'AREA'
              AND urs.is_active = true
              AND a.is_active = true;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS EN LAS FUNCIONES
-- =====================================================
COMMENT ON FUNCTION get_user_screens(TEXT) IS 
'Retorna las pantallas a las que el usuario tiene acceso basado en sus roles activos';

COMMENT ON FUNCTION get_user_screen_actions(TEXT, TEXT) IS 
'Retorna las acciones que el usuario puede ejecutar en una pantalla específica';

COMMENT ON FUNCTION user_has_permission(TEXT, TEXT, TEXT) IS 
'Verifica si un usuario tiene un permiso específico (pantalla + acción)';

COMMENT ON FUNCTION user_can_access_entity(TEXT, TEXT, UUID) IS 
'Verifica si un usuario puede acceder a una entidad específica. Super Admin sin scopes tiene acceso total.';

COMMENT ON FUNCTION get_user_accessible_entities(TEXT, TEXT) IS 
'Retorna las entidades a las que el usuario tiene acceso. Super Admin sin scopes obtiene todas las entidades del tenant.';

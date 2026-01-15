-- =====================================================
-- CORREGIR TIPOS DE DATOS EN FUNCIONES
-- Cambiar TEXT por VARCHAR para coincidir con la BD
-- =====================================================

-- =====================================================
-- FUNCIÓN 1: get_user_screens (CORREGIDA)
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_screens(p_user_email TEXT)
RETURNS TABLE (
    screen_key VARCHAR(50),
    screen_name VARCHAR(100),
    menu_group_key VARCHAR(50),
    menu_group_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        s.screen_key,
        s.screen_name,
        smg.menu_group_key,
        smg.menu_group_name
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
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_screen_actions(
    p_user_email TEXT,
    p_screen_key TEXT
)
RETURNS TABLE (
    action_key VARCHAR(50),
    action_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        a.action_key,
        a.action_name
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
-- FUNCIÓN 5: get_user_accessible_entities (CORREGIDA)
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_accessible_entities(
    p_user_email TEXT,
    p_entity_type TEXT
)
RETURNS TABLE (
    entity_id UUID,
    entity_name VARCHAR(200)
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
            SELECT c.id, c.company_name::VARCHAR(200)
            FROM public.companies c
            JOIN public.users u ON u.tenant_id = c.tenant_id
            WHERE u.email = p_user_email
              AND c.is_active = true;
        ELSIF p_entity_type = 'LOCATION' THEN
            RETURN QUERY
            SELECT l.id, l.location_name::VARCHAR(200)
            FROM public.work_locations l
            JOIN public.companies c ON c.id = l.company_id
            JOIN public.users u ON u.tenant_id = c.tenant_id
            WHERE u.email = p_user_email
              AND l.is_active = true;
        ELSIF p_entity_type = 'DEPARTMENT' THEN
            RETURN QUERY
            SELECT d.id, d.department_name::VARCHAR(200)
            FROM public.departments d
            JOIN public.companies c ON c.id = d.company_id
            JOIN public.users u ON u.tenant_id = c.tenant_id
            WHERE u.email = p_user_email
              AND d.is_active = true;
        ELSIF p_entity_type = 'AREA' THEN
            RETURN QUERY
            SELECT a.id, a.area_name::VARCHAR(200)
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
            SELECT c.id, c.company_name::VARCHAR(200)
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
            SELECT l.id, l.location_name::VARCHAR(200)
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
            SELECT d.id, d.department_name::VARCHAR(200)
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
            SELECT a.id, a.area_name::VARCHAR(200)
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
-- VERIFICACIÓN
-- =====================================================
SELECT 
    '✅ Funciones actualizadas con tipos correctos' as status;

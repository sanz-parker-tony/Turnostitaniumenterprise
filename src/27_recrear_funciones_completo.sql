-- =====================================================
-- RECREAR FUNCIONES CON TIPOS CORRECTOS
-- PASO 1: Eliminar todas las versiones
-- PASO 2: Crear con tipos VARCHAR correctos
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR TODAS LAS VERSIONES
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
-- PASO 2: RECREAR CON TIPOS CORRECTOS
-- =====================================================

-- =====================================================
-- FUNCIÓN 1: get_user_screens
-- =====================================================
CREATE FUNCTION get_user_screens(p_user_email TEXT)
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
-- FUNCIÓN 2: get_user_screen_actions
-- =====================================================
CREATE FUNCTION get_user_screen_actions(
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
-- FUNCIÓN 3: user_has_permission
-- =====================================================
CREATE FUNCTION user_has_permission(
    p_user_email TEXT,
    p_screen_key TEXT,
    p_action_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id
        JOIN public.roles r ON r.id = ur.role_id
        JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
        JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
        JOIN public.screens s ON s.id = sa.screen_id
        JOIN public.actions a ON a.id = sa.action_id
        WHERE u.email = p_user_email
          AND s.screen_key = p_screen_key
          AND a.action_key = p_action_key
          AND u.is_active = true
          AND ur.is_active = true
          AND r.is_active = true
          AND rsa.is_active = true
          AND sa.is_active = true
          AND s.is_active = true
          AND a.is_active = true
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN 4: user_can_access_entity
-- =====================================================
CREATE FUNCTION user_can_access_entity(
    p_user_email TEXT,
    p_entity_type TEXT,
    p_entity_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN;
    v_is_super_admin BOOLEAN;
BEGIN
    -- Verificar si el usuario es Super Admin
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id
        JOIN public.roles r ON r.id = ur.role_id
        WHERE u.email = p_user_email
          AND r.role_key = 'SUPER_ADMIN'
          AND u.is_active = true
          AND ur.is_active = true
          AND r.is_active = true
    ) INTO v_is_super_admin;

    -- Si es Super Admin, verificar si tiene scopes
    IF v_is_super_admin THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.users u
            JOIN public.user_roles ur ON ur.user_id = u.id
            JOIN public.roles r ON r.id = ur.role_id
            JOIN public.user_role_scopes urs ON urs.user_role_id = ur.id
            WHERE u.email = p_user_email
              AND r.role_key = 'SUPER_ADMIN'
              AND ur.is_active = true
        ) INTO v_has_access;

        -- Si NO tiene scopes, tiene acceso total
        IF NOT v_has_access THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Verificar si tiene acceso específico mediante scopes
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id
        JOIN public.user_role_scopes urs ON urs.user_role_id = ur.id
        WHERE u.email = p_user_email
          AND urs.scope_type = p_entity_type
          AND urs.scope_entity_id = p_entity_id
          AND u.is_active = true
          AND ur.is_active = true
          AND urs.is_active = true
    ) INTO v_has_access;

    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN 5: get_user_accessible_entities
-- =====================================================
CREATE FUNCTION get_user_accessible_entities(
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
    -- Verificar si es Super Admin sin scopes
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
-- AGREGAR COMENTARIOS
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

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
SELECT 
    '✅ PASO 1: Eliminadas todas las versiones antiguas' as paso_1,
    '✅ PASO 2: Creadas 5 funciones con tipos correctos' as paso_2,
    '✅ Listo para ejecutar tests' as estado;

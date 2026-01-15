-- =====================================================
-- CORRECCIÓN FINAL: Funciones con ORDER BY y DISTINCT
-- Sistema: Turnos Titanium
-- Fix: Asegurar que columnas de ORDER BY estén en SELECT
-- =====================================================

-- =====================================================
-- FUNCIÓN 1: get_user_screens (CORRECCIÓN FINAL)
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
    ORDER BY menu_group_name, screen_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN 2: get_user_screen_actions (CORRECCIÓN FINAL)
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
    ORDER BY action_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON FUNCTION get_user_screens(TEXT) IS 
'Retorna las pantallas a las que el usuario tiene acceso basado en sus roles activos. ORDER BY usa columnas del SELECT.';

COMMENT ON FUNCTION get_user_screen_actions(TEXT, TEXT) IS 
'Retorna las acciones que el usuario puede ejecutar en una pantalla específica. ORDER BY usa columnas del SELECT.';

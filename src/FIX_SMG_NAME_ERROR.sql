-- ============================================================================
-- FIX: Corregir columna smg.name que no existe
-- ============================================================================

-- PASO 1: Ver qué columnas tiene system_menu_groups
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COLUMNAS DE system_menu_groups:';
  RAISE NOTICE '========================================';
  
  FOR rec IN 
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'system_menu_groups'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  - % (%)', rec.column_name, rec.data_type;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- PASO 2: Recrear función con el nombre correcto
-- Basándome en el patrón, probablemente sea 'menu_group_key' o similar

DROP FUNCTION IF EXISTS get_user_screens(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION get_user_screens(p_user_email TEXT)
RETURNS TABLE (
  screen_key VARCHAR,
  screen_name VARCHAR,
  screen_icon_key VARCHAR,
  screen_route VARCHAR,
  screen_display_order INT,
  menu_group_key VARCHAR,
  menu_group_name VARCHAR,
  menu_group_icon VARCHAR,
  menu_group_display_order INT,
  tenant_id UUID,
  tenant_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_tenant_name VARCHAR;
  v_is_super_admin BOOLEAN;
  v_has_scopes BOOLEAN;
BEGIN
  SELECT u.id, u.tenant_id
  INTO v_user_id, v_tenant_id
  FROM users u
  WHERE u.email = p_user_email;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario no encontrado: %', p_user_email;
    RETURN;
  END IF;

  SELECT t.tenant_name
  INTO v_tenant_name
  FROM tenants t
  WHERE t.id = v_tenant_id;

  SELECT EXISTS(
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id 
      AND ur.tenant_id = v_tenant_id
      AND r.role_key = 'SUPER_ADMIN'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  SELECT EXISTS(
    SELECT 1
    FROM user_role_scopes urs
    JOIN user_roles ur ON urs.user_role_id = ur.id
    WHERE ur.user_id = v_user_id
      AND ur.tenant_id = v_tenant_id
  ) INTO v_has_scopes;

  IF v_is_super_admin AND NOT v_has_scopes THEN
    RETURN QUERY
    SELECT 
      s.screen_key::VARCHAR,
      COALESCE(st.screen_name, s.screen_name)::VARCHAR AS screen_name,
      s.icon_key::VARCHAR AS screen_icon_key,
      s.route_path::VARCHAR AS screen_route,
      s.sort_order AS screen_display_order,
      COALESCE(smg.menu_group_key, smg.id::TEXT)::VARCHAR AS menu_group_key,
      COALESCE(smgt.menu_group_name, smg.menu_group_name)::VARCHAR AS menu_group_name,
      smg.icon_name::VARCHAR AS menu_group_icon,
      smg.display_order AS menu_group_display_order,
      v_tenant_id AS tenant_id,
      v_tenant_name::VARCHAR AS tenant_name
    FROM screens s
    LEFT JOIN screen_translations st 
      ON s.id = st.screen_id AND st.language_code = 'ES'
    LEFT JOIN system_menu_groups smg 
      ON s.menu_group_id = smg.id
    LEFT JOIN system_menu_group_translations smgt 
      ON smg.id = smgt.menu_group_id AND smgt.language_code = 'ES'
    WHERE s.is_active = true
      AND (smg.is_active = true OR smg.is_active IS NULL)
    ORDER BY smg.display_order, s.sort_order;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    s.screen_key::VARCHAR,
    COALESCE(st.screen_name, s.screen_name)::VARCHAR AS screen_name,
    s.icon_key::VARCHAR AS screen_icon_key,
    s.route_path::VARCHAR AS screen_route,
    s.sort_order AS screen_display_order,
    COALESCE(smg.menu_group_key, smg.id::TEXT)::VARCHAR AS menu_group_key,
    COALESCE(smgt.menu_group_name, smg.menu_group_name)::VARCHAR AS menu_group_name,
    smg.icon_name::VARCHAR AS menu_group_icon,
    smg.display_order AS menu_group_display_order,
    v_tenant_id AS tenant_id,
    v_tenant_name::VARCHAR AS tenant_name
  FROM screens s
  INNER JOIN screen_actions sa ON s.id = sa.screen_id
  INNER JOIN role_screen_actions rsa ON sa.id = rsa.screen_action_id
  INNER JOIN user_roles ur ON rsa.role_id = ur.role_id
  LEFT JOIN screen_translations st 
    ON s.id = st.screen_id AND st.language_code = 'ES'
  LEFT JOIN system_menu_groups smg 
    ON s.menu_group_id = smg.id
  LEFT JOIN system_menu_group_translations smgt 
    ON smg.id = smgt.menu_group_id AND smgt.language_code = 'ES'
  WHERE ur.user_id = v_user_id
    AND ur.tenant_id = v_tenant_id
    AND ur.is_active = true
    AND rsa.is_active = true
    AND s.is_active = true
    AND (smg.is_active = true OR smg.is_active IS NULL)
  ORDER BY smg.display_order, s.sort_order;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_screens(TEXT) TO postgres, anon, authenticated, service_role;

RAISE NOTICE '✅ Función actualizada - Revisa los nombres de columnas arriba';

-- ============================================================================
-- LIMPIAR TODO Y RECREAR CORRECTAMENTE
-- ============================================================================

-- PASO 1: Eliminar TODAS las funciones relacionadas
DROP FUNCTION IF EXISTS get_user_screens(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_user_screens(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_user_screens(UUID) CASCADE;

-- PASO 2: Recrear la función CORRECTA
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
  -- Obtener user_id y tenant_id
  SELECT u.id, u.tenant_id 
  INTO v_user_id, v_tenant_id 
  FROM users u 
  WHERE u.email = p_user_email;

  IF v_user_id IS NULL THEN 
    RAISE NOTICE 'Usuario no encontrado: %', p_user_email; 
    RETURN; 
  END IF;
  
  -- Obtener tenant_name
  SELECT t.tenant_name 
  INTO v_tenant_name 
  FROM tenants t 
  WHERE t.id = v_tenant_id;
  
  -- Verificar si es Super Admin
  SELECT EXISTS(
    SELECT 1 
    FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = v_user_id 
      AND ur.tenant_id = v_tenant_id 
      AND r.role_key = 'SUPER_ADMIN' 
      AND ur.is_active = true
  ) INTO v_is_super_admin;
  
  -- Verificar si tiene scopes
  SELECT EXISTS(
    SELECT 1 
    FROM user_role_scopes urs 
    JOIN user_roles ur ON urs.user_role_id = ur.id 
    WHERE ur.user_id = v_user_id 
      AND ur.tenant_id = v_tenant_id
  ) INTO v_has_scopes;

  -- Super Admin SIN scopes = TODAS las pantallas
  IF v_is_super_admin AND NOT v_has_scopes THEN
    RETURN QUERY
    SELECT 
      s.screen_key::VARCHAR,
      COALESCE(st.screen_name, s.screen_name)::VARCHAR,
      s.icon_key::VARCHAR,
      s.route_path::VARCHAR,
      s.sort_order,
      smg.menu_group_key::VARCHAR,
      COALESCE(smgt.menu_group_name, smg.menu_group_name)::VARCHAR,
      smg.icon_key::VARCHAR,
      smg.sort_order,
      v_tenant_id,
      v_tenant_name::VARCHAR
    FROM screens s
    LEFT JOIN screen_translations st 
      ON s.id = st.screen_id AND st.language_code = 'ES'
    LEFT JOIN system_menu_groups smg 
      ON s.menu_group_id = smg.id
    LEFT JOIN system_menu_group_translations smgt 
      ON smg.id = smgt.menu_group_id AND smgt.language_code = 'ES'
    WHERE s.is_active = true 
      AND (smg.is_active = true OR smg.is_active IS NULL)
    ORDER BY smg.sort_order, s.sort_order;
    RETURN;
  END IF;

  -- Usuario con permisos específicos
  RETURN QUERY
  SELECT DISTINCT
    s.screen_key::VARCHAR,
    COALESCE(st.screen_name, s.screen_name)::VARCHAR,
    s.icon_key::VARCHAR,
    s.route_path::VARCHAR,
    s.sort_order,
    smg.menu_group_key::VARCHAR,
    COALESCE(smgt.menu_group_name, smg.menu_group_name)::VARCHAR,
    smg.icon_key::VARCHAR,
    smg.sort_order,
    v_tenant_id,
    v_tenant_name::VARCHAR
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
  ORDER BY smg.sort_order, s.sort_order;
END;
$$;

-- PASO 3: Otorgar permisos
GRANT EXECUTE ON FUNCTION get_user_screens(TEXT) TO postgres, anon, authenticated, service_role;

-- PASO 4: Verificar
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FUNCIÓN RECREADA CORRECTAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usando:';
  RAISE NOTICE '  ✅ smg.menu_group_key (NO smg.name)';
  RAISE NOTICE '  ✅ smg.menu_group_name (NO smg.name)';
  RAISE NOTICE '  ✅ smg.icon_key (NO smg.icon_name)';
  RAISE NOTICE '  ✅ smg.sort_order (NO smg.display_order)';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

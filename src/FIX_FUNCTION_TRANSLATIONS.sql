-- ============================================================================
-- FIX: CORREGIR get_user_screens CON NOMBRES DE COLUMNAS CORRECTOS
-- ============================================================================

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
  -- 1. Obtener user_id y tenant_id del usuario
  SELECT u.id, u.tenant_id
  INTO v_user_id, v_tenant_id
  FROM users u
  WHERE u.email = p_user_email;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario no encontrado: %', p_user_email;
    RETURN;
  END IF;

  -- 2. Obtener tenant_name
  SELECT t.tenant_name
  INTO v_tenant_name
  FROM tenants t
  WHERE t.id = v_tenant_id;

  -- 3. Verificar si es Super Admin
  SELECT EXISTS(
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id 
      AND ur.tenant_id = v_tenant_id
      AND r.role_key = 'SUPER_ADMIN'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  -- 4. Verificar si tiene scopes
  SELECT EXISTS(
    SELECT 1
    FROM user_role_scopes urs
    JOIN user_roles ur ON urs.user_role_id = ur.id
    WHERE ur.user_id = v_user_id
      AND ur.tenant_id = v_tenant_id
  ) INTO v_has_scopes;

  -- 5. CASO: Super Admin SIN scopes = TODAS las pantallas
  IF v_is_super_admin AND NOT v_has_scopes THEN
    RETURN QUERY
    SELECT 
      s.screen_key::VARCHAR,
      COALESCE(st.screen_name, s.name)::VARCHAR AS screen_name,
      s.icon_key::VARCHAR AS screen_icon_key,
      s.route::VARCHAR AS screen_route,
      s.display_order AS screen_display_order,
      smg.name::VARCHAR AS menu_group_key,
      COALESCE(smgt.name, smg.name)::VARCHAR AS menu_group_name,
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
    ORDER BY smg.display_order, s.display_order;
    RETURN;
  END IF;

  -- 6. CASO: Usuario con permisos específicos
  RETURN QUERY
  SELECT DISTINCT
    s.screen_key::VARCHAR,
    COALESCE(st.screen_name, s.name)::VARCHAR AS screen_name,
    s.icon_key::VARCHAR AS screen_icon_key,
    s.route::VARCHAR AS screen_route,
    s.display_order AS screen_display_order,
    smg.name::VARCHAR AS menu_group_key,
    COALESCE(smgt.name, smg.name)::VARCHAR AS menu_group_name,
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
  ORDER BY smg.display_order, s.display_order;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION get_user_screens(TEXT) TO postgres, anon, authenticated, service_role;

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Función get_user_screens actualizada correctamente';
  RAISE NOTICE '   - Usando st.screen_name (no display_name)';
  RAISE NOTICE '   - Usando smgt.name (no display_name)';
END $$;

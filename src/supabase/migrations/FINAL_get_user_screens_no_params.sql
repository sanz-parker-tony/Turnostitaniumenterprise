-- ============================================================================
-- get_user_screens() SIN PARÁMETROS - Usa auth.uid()
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_screens() CASCADE;

CREATE OR REPLACE FUNCTION get_user_screens()
RETURNS TABLE (
  screen_key VARCHAR,
  screen_name VARCHAR,
  screen_icon_key VARCHAR,
  route_path VARCHAR,
  screen_sort_order INT,
  menu_group_key VARCHAR,
  menu_group_name VARCHAR,
  menu_group_icon VARCHAR,
  menu_group_sort_order INT,
  screen_translation VARCHAR,
  menu_group_translation VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_is_super_admin BOOLEAN;
  v_has_scopes BOOLEAN;
BEGIN
  -- Obtener auth.uid() actual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN 
    RAISE EXCEPTION 'Usuario no autenticado'; 
  END IF;
  
  -- Obtener tenant_id del usuario
  SELECT u.tenant_id 
  INTO v_tenant_id 
  FROM public.users u 
  WHERE u.auth_user_id = v_user_id;
  
  IF v_tenant_id IS NULL THEN 
    RAISE NOTICE 'Usuario sin tenant: %', v_user_id; 
    RETURN; 
  END IF;
  
  -- Obtener user_id de public.users
  SELECT u.id 
  INTO v_user_id 
  FROM public.users u 
  WHERE u.auth_user_id = auth.uid();
  
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
      s.screen_name::VARCHAR,
      s.icon_key::VARCHAR,
      s.route_path::VARCHAR,
      s.sort_order,
      smg.menu_group_key::VARCHAR,
      smg.menu_group_name::VARCHAR,
      smg.icon_key::VARCHAR,
      smg.sort_order,
      COALESCE(st.translation, s.screen_name)::VARCHAR,
      COALESCE(smgt.translation, smg.menu_group_name)::VARCHAR
    FROM screens s
    LEFT JOIN screen_translations st 
      ON s.screen_key = st.screen_key AND st.language_code = 'es'
    LEFT JOIN system_menu_groups smg 
      ON s.menu_group_key = smg.menu_group_key
    LEFT JOIN menu_group_translations smgt 
      ON smg.menu_group_key = smgt.menu_group_key AND smgt.language_code = 'es'
    WHERE s.is_active = true 
      AND (smg.is_active = true OR smg.is_active IS NULL)
    ORDER BY smg.sort_order, s.sort_order;
    RETURN;
  END IF;

  -- Usuario con permisos específicos
  RETURN QUERY
  SELECT DISTINCT
    s.screen_key::VARCHAR,
    s.screen_name::VARCHAR,
    s.icon_key::VARCHAR,
    s.route_path::VARCHAR,
    s.sort_order,
    smg.menu_group_key::VARCHAR,
    smg.menu_group_name::VARCHAR,
    smg.icon_key::VARCHAR,
    smg.sort_order,
    COALESCE(st.translation, s.screen_name)::VARCHAR,
    COALESCE(smgt.translation, smg.menu_group_name)::VARCHAR
  FROM screens s
  INNER JOIN role_screen_actions rsa ON s.screen_key = rsa.screen_key
  INNER JOIN user_roles ur ON rsa.role_key = ur.role_key
  LEFT JOIN screen_translations st 
    ON s.screen_key = st.screen_key AND st.language_code = 'es'
  LEFT JOIN system_menu_groups smg 
    ON s.menu_group_key = smg.menu_group_key
  LEFT JOIN menu_group_translations smgt 
    ON smg.menu_group_key = smgt.menu_group_key AND smgt.language_code = 'es'
  WHERE ur.user_id = v_user_id 
    AND ur.tenant_id = v_tenant_id 
    AND ur.is_active = true 
    AND rsa.is_active = true 
    AND s.is_active = true 
    AND (smg.is_active = true OR smg.is_active IS NULL)
  ORDER BY smg.sort_order, s.sort_order;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_screens() TO postgres, anon, authenticated, service_role;

-- Notificación
DO $$
BEGIN
  RAISE NOTICE '✅ Función get_user_screens() SIN parámetros creada';
  RAISE NOTICE '   Usa auth.uid() automáticamente';
  RAISE NOTICE '   Filtra por permisos en role_screen_actions';
END $$;

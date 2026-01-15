-- ============================================================================
-- FIX: Eliminar funciones duplicadas de get_user_screens
-- ============================================================================
-- Error: PostgREST no puede resolver entre dos versiones de la función
-- con diferentes tipos de parámetros (text vs character varying)
-- ============================================================================

-- Paso 1: Dropear TODAS las versiones de get_user_screens
DROP FUNCTION IF EXISTS get_user_screens(text);
DROP FUNCTION IF EXISTS get_user_screens(character varying);
DROP FUNCTION IF EXISTS get_user_screens(varchar);
DROP FUNCTION IF EXISTS get_user_screens(p_user_email text);
DROP FUNCTION IF EXISTS get_user_screens(p_user_email character varying);
DROP FUNCTION IF EXISTS get_user_screens(p_user_email varchar);

-- Paso 2: Crear UNA SOLA versión con tipo TEXT (más estándar en PostgreSQL)
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

  -- Si no existe el usuario, retornar vacío
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuario no encontrado: %', p_user_email;
    RETURN;
  END IF;

  RAISE NOTICE 'Usuario encontrado - ID: %, Tenant: %', v_user_id, v_tenant_id;

  -- 2. Obtener tenant_name
  SELECT t.name 
  INTO v_tenant_name
  FROM tenants t
  WHERE t.id = v_tenant_id;

  RAISE NOTICE 'Tenant name: %', v_tenant_name;

  -- 3. Verificar si el usuario tiene rol SUPER_ADMIN
  SELECT EXISTS(
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id 
      AND ur.tenant_id = v_tenant_id
      AND r.role_key = 'SUPER_ADMIN'
      AND ur.is_active = true
  ) INTO v_is_super_admin;

  RAISE NOTICE 'Es Super Admin: %', v_is_super_admin;

  -- 4. Verificar si el usuario tiene scopes configurados
  SELECT EXISTS(
    SELECT 1
    FROM user_role_scopes urs
    JOIN user_roles ur ON urs.user_role_id = ur.id
    WHERE ur.user_id = v_user_id
      AND ur.tenant_id = v_tenant_id
  ) INTO v_has_scopes;

  RAISE NOTICE 'Tiene scopes configurados: %', v_has_scopes;

  -- 5. CASO 1: Super Admin SIN scopes = TODAS las pantallas
  IF v_is_super_admin AND NOT v_has_scopes THEN
    RAISE NOTICE 'CASO: Super Admin sin scopes - retornando TODAS las pantallas';
    
    RETURN QUERY
    SELECT 
      s.screen_key::VARCHAR,
      COALESCE(st.display_name, s.name)::VARCHAR AS screen_name,
      s.icon_key::VARCHAR AS screen_icon_key,
      s.route::VARCHAR AS screen_route,
      s.display_order AS screen_display_order,
      smg.name::VARCHAR AS menu_group_key,
      COALESCE(smgt.display_name, smg.name)::VARCHAR AS menu_group_name,
      smg.icon_name::VARCHAR AS menu_group_icon,
      smg.display_order AS menu_group_display_order,
      v_tenant_id AS tenant_id,
      v_tenant_name::VARCHAR AS tenant_name
    FROM screens s
    LEFT JOIN screen_translations st 
      ON s.id = st.screen_id 
      AND st.language_code = 'ES'
    LEFT JOIN system_menu_groups smg 
      ON s.menu_group_id = smg.id
    LEFT JOIN system_menu_group_translations smgt 
      ON smg.id = smgt.menu_group_id 
      AND smgt.language_code = 'ES'
    WHERE s.is_active = true
      AND (smg.is_active = true OR smg.is_active IS NULL)
    ORDER BY smg.display_order, s.display_order;
    
    RETURN;
  END IF;

  -- 6. CASO 2: Usuario normal o Super Admin CON scopes = pantallas según permisos
  RAISE NOTICE 'CASO: Usuario con permisos específicos';
  
  RETURN QUERY
  SELECT DISTINCT
    s.screen_key::VARCHAR,
    COALESCE(st.display_name, s.name)::VARCHAR AS screen_name,
    s.icon_key::VARCHAR AS screen_icon_key,
    s.route::VARCHAR AS screen_route,
    s.display_order AS screen_display_order,
    smg.name::VARCHAR AS menu_group_key,
    COALESCE(smgt.display_name, smg.name)::VARCHAR AS menu_group_name,
    smg.icon_name::VARCHAR AS menu_group_icon,
    smg.display_order AS menu_group_display_order,
    v_tenant_id AS tenant_id,
    v_tenant_name::VARCHAR AS tenant_name
  FROM screens s
  -- Join con screen_actions para obtener las acciones de cada pantalla
  INNER JOIN screen_actions sa ON s.id = sa.screen_id
  -- Join con role_screen_actions para verificar permisos del rol
  INNER JOIN role_screen_actions rsa ON sa.id = rsa.screen_action_id
  -- Join con user_roles para verificar que el usuario tiene ese rol
  INNER JOIN user_roles ur ON rsa.role_id = ur.role_id
  -- Traducciones
  LEFT JOIN screen_translations st 
    ON s.id = st.screen_id 
    AND st.language_code = 'ES'
  LEFT JOIN system_menu_groups smg 
    ON s.menu_group_id = smg.id
  LEFT JOIN system_menu_group_translations smgt 
    ON smg.id = smgt.menu_group_id 
    AND smgt.language_code = 'ES'
  WHERE ur.user_id = v_user_id
    AND ur.tenant_id = v_tenant_id
    AND ur.is_active = true
    AND rsa.is_active = true
    AND s.is_active = true
    AND (smg.is_active = true OR smg.is_active IS NULL)
  ORDER BY smg.display_order, s.display_order;

END;
$$;

-- Paso 3: Otorgar permisos
GRANT EXECUTE ON FUNCTION get_user_screens(TEXT) TO postgres, anon, authenticated, service_role;

-- Paso 4: Comentar la función
COMMENT ON FUNCTION get_user_screens(TEXT) IS 
'Obtiene las pantallas accesibles para un usuario basado en sus roles y permisos.
Super Admin sin scopes = todas las pantallas.
Usuarios normales o Super Admin con scopes = solo pantallas con permisos.';

-- ============================================================================
-- Verificación
-- ============================================================================

SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname = 'get_user_screens';

-- ✅ Deberías ver SOLO UNA función con argumento: p_user_email text

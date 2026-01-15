-- ============================================================================
-- FIX DEFINITIVO: Eliminar sobrecarga de get_user_screens
-- ============================================================================
-- Este script elimina TODAS las versiones de la función y crea solo UNA
-- ============================================================================

-- PASO 1: Eliminar TODAS las versiones posibles con CASCADE
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'get_user_screens'
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
        RAISE NOTICE 'Eliminada función: %', r.oid::regprocedure;
    END LOOP;
END $$;

-- PASO 2: Verificar que no quede ninguna versión
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_proc
    WHERE proname = 'get_user_screens';
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Aún existen % versiones de get_user_screens', v_count;
    ELSE
        RAISE NOTICE '✅ Todas las versiones eliminadas correctamente';
    END IF;
END $$;

-- PASO 3: Crear la ÚNICA versión de la función con tipo TEXT
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
  SELECT t.tenant_name  -- ✅ CORREGIDO: era t.name
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

-- PASO 4: Otorgar permisos
GRANT EXECUTE ON FUNCTION get_user_screens(TEXT) TO postgres, anon, authenticated, service_role;

-- PASO 5: Agregar comentario
COMMENT ON FUNCTION get_user_screens(TEXT) IS 
'Obtiene las pantallas accesibles para un usuario.
Super Admin sin scopes = todas las pantallas.
Otros usuarios = solo pantallas con permisos asignados.';

-- PASO 6: Verificación final
SELECT 
  '✅ VERIFICACIÓN FINAL' AS status,
  COUNT(*) AS total_functions,
  STRING_AGG(pg_get_function_arguments(oid), ' | ') AS arguments
FROM pg_proc
WHERE proname = 'get_user_screens'
GROUP BY proname;

-- PASO 7: Test básico (puedes descomentar y ejecutar después)
-- SELECT * FROM get_user_screens('admin@turnos-titanium.com');
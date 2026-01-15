-- ============================================================================
-- 🚨 FIX CRÍTICO: RESOLVER FUNCIÓN DUPLICADA Y LOGIN
-- ============================================================================
-- VERSIÓN CORREGIDA: Sin usar created_by/updated_by en tenants
-- ============================================================================

-- ============================================================================
-- PARTE 1: ELIMINAR FUNCIÓN DUPLICADA
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
    v_count INT := 0;
BEGIN
    RAISE NOTICE '🔧 ELIMINANDO FUNCIONES DUPLICADAS...';
    
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'get_user_screens'
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
        v_count := v_count + 1;
        RAISE NOTICE '  ✅ Eliminada: %', r.oid::regprocedure;
    END LOOP;
    
    RAISE NOTICE '✅ Total funciones eliminadas: %', v_count;
END $$;

-- Verificar que no quede ninguna
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_proc
    WHERE proname = 'get_user_screens';
    
    IF v_count > 0 THEN
        RAISE EXCEPTION '❌ ERROR: Aún existen % versiones de get_user_screens', v_count;
    ELSE
        RAISE NOTICE '✅ Todas las versiones eliminadas correctamente';
    END IF;
END $$;

-- ============================================================================
-- PARTE 2: CREAR UNA SOLA VERSIÓN DE LA FUNCIÓN (TIPO TEXT)
-- ============================================================================

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

-- ============================================================================
-- PARTE 3: VERIFICAR/CREAR ESTRUCTURA DE USUARIO ADMIN
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_role_id UUID;
  v_user_role_id UUID;
  v_auth_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 VERIFICANDO USUARIO ADMIN...';
  
  -- Verificar auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'admin@turnos-titanium.com'
  ) INTO v_auth_exists;

  IF NOT v_auth_exists THEN
    RAISE NOTICE '❌ Usuario NO existe en auth.users';
    RAISE NOTICE '⚠️  EJECUTA: /reset-password-helper.html';
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@turnos-titanium.com';
  RAISE NOTICE '✅ Usuario en auth.users: %', v_user_id;

  -- Tenant (SIN created_by/updated_by)
  SELECT id INTO v_tenant_id FROM tenants WHERE tenant_name = 'Titanium Corp' LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (tenant_name, is_active)
    VALUES ('Titanium Corp', true)
    RETURNING id INTO v_tenant_id;
    RAISE NOTICE '✅ Tenant creado: %', v_tenant_id;
  ELSE
    RAISE NOTICE '✅ Tenant existe: %', v_tenant_id;
  END IF;

  -- Usuario en public.users
  SELECT id INTO v_user_id FROM public.users WHERE email = 'admin@turnos-titanium.com';
  
  IF v_user_id IS NULL THEN
    INSERT INTO public.users (id, email, username, tenant_id, is_active, created_by, updated_by)
    SELECT au.id, au.email, 'admin', v_tenant_id, true, 'system', 'system'
    FROM auth.users au WHERE au.email = 'admin@turnos-titanium.com'
    RETURNING id INTO v_user_id;
    RAISE NOTICE '✅ Usuario en public.users creado: %', v_user_id;
  ELSE
    UPDATE public.users SET tenant_id = v_tenant_id WHERE id = v_user_id AND tenant_id IS NULL;
    RAISE NOTICE '✅ Usuario en public.users existe: %', v_user_id;
  END IF;

  -- Rol SUPER_ADMIN
  SELECT id INTO v_role_id FROM roles WHERE role_key = 'SUPER_ADMIN' AND tenant_id = v_tenant_id;
  
  IF v_role_id IS NULL THEN
    INSERT INTO roles (role_key, name, description, tenant_id, is_active, created_by, updated_by)
    VALUES ('SUPER_ADMIN', 'Super Administrador', 'Acceso total', v_tenant_id, true, 'system', 'system')
    RETURNING id INTO v_role_id;
    RAISE NOTICE '✅ Rol SUPER_ADMIN creado: %', v_role_id;
  ELSE
    RAISE NOTICE '✅ Rol SUPER_ADMIN existe: %', v_role_id;
  END IF;

  -- Asignar rol
  SELECT id INTO v_user_role_id 
  FROM user_roles 
  WHERE user_id = v_user_id AND role_id = v_role_id AND tenant_id = v_tenant_id;
  
  IF v_user_role_id IS NULL THEN
    INSERT INTO user_roles (user_id, role_id, tenant_id, is_active, created_by, updated_by)
    VALUES (v_user_id, v_role_id, v_tenant_id, true, 'system', 'system')
    RETURNING id INTO v_user_role_id;
    RAISE NOTICE '✅ Rol asignado: %', v_user_role_id;
  ELSE
    UPDATE user_roles SET is_active = true WHERE id = v_user_role_id;
    RAISE NOTICE '✅ Rol ya asignado: %', v_user_role_id;
  END IF;

  -- Limpiar scopes
  DELETE FROM user_role_scopes
  WHERE user_role_id IN (SELECT id FROM user_roles WHERE user_id = v_user_id);
  RAISE NOTICE '✅ Scopes limpiados (Super Admin = acceso total)';
  
END $$;


-- ============================================================================
-- PARTE 4: VERIFICACIÓN FINAL COMPLETA
-- ============================================================================

DO $$
DECLARE
  v_func_count INT;
  v_auth_count INT;
  v_user_count INT;
  v_role_count INT;
  v_scope_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VERIFICACIÓN FINAL';
  RAISE NOTICE '========================================';
  
  -- Funciones
  SELECT COUNT(*) INTO v_func_count FROM pg_proc WHERE proname = 'get_user_screens';
  RAISE NOTICE 'Funciones get_user_screens: % (debe ser 1)', v_func_count;
  
  IF v_func_count != 1 THEN
    RAISE EXCEPTION '❌ ERROR: Debe haber exactamente 1 función, hay %', v_func_count;
  END IF;
  
  -- Auth
  SELECT COUNT(*) INTO v_auth_count FROM auth.users WHERE email = 'admin@turnos-titanium.com';
  RAISE NOTICE 'Usuario en auth.users: % (debe ser 1)', v_auth_count;
  
  -- Public users
  SELECT COUNT(*) INTO v_user_count FROM public.users WHERE email = 'admin@turnos-titanium.com';
  RAISE NOTICE 'Usuario en public.users: % (debe ser 1)', v_user_count;
  
  -- Roles
  SELECT COUNT(*) INTO v_role_count
  FROM user_roles ur
  JOIN public.users u ON ur.user_id = u.id
  JOIN roles r ON ur.role_id = r.id
  WHERE u.email = 'admin@turnos-titanium.com'
    AND r.role_key = 'SUPER_ADMIN'
    AND ur.is_active = true;
  RAISE NOTICE 'Rol SUPER_ADMIN activo: % (debe ser 1)', v_role_count;
  
  -- Scopes
  SELECT COUNT(*) INTO v_scope_count
  FROM user_role_scopes urs
  JOIN user_roles ur ON urs.user_role_id = ur.id
  JOIN public.users u ON ur.user_id = u.id
  WHERE u.email = 'admin@turnos-titanium.com';
  RAISE NOTICE 'Scopes configurados: % (debe ser 0)', v_scope_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  IF v_func_count = 1 AND v_auth_count = 1 AND v_user_count = 1 AND v_role_count = 1 AND v_scope_count = 0 THEN
    RAISE NOTICE '🎉 TODO CORRECTO - LISTO PARA LOGIN';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Email: admin@turnos-titanium.com';
    RAISE NOTICE '🔑 Password: TurnosTitanium2025!';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Si login falla, ejecuta:';
    RAISE NOTICE '    /reset-password-helper.html';
  ELSE
    RAISE WARNING '⚠️  Hay problemas - revisa los valores arriba';
  END IF;
  RAISE NOTICE '========================================';
  
END $$;

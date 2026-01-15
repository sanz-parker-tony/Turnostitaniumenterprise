-- ============================================================================
-- 👑 SUPER ADMINISTRATOR SETUP v3 - FINAL FIX
-- ============================================================================
-- PROPÓSITO: Crear Super Admin deshabilitando triggers temporalmente
-- EJECUTAR: Solo desde SQL Editor de Supabase
-- FECHA: 2025-01-15
-- ============================================================================
-- ⚠️ CONFIGURACIÓN REQUERIDA:
--    Reemplaza estos valores en la sección CONFIGURACIÓN
-- ============================================================================

-- ============================================================================
-- PARTE 1: DESHABILITAR TRIGGER TEMPORALMENTE
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================================
-- PARTE 2: CREAR SUPER ADMINISTRATOR
-- ============================================================================

DO $$
DECLARE
  -- ============================================================================
  -- 📝 CONFIGURACIÓN - CAMBIAR AQUÍ
  -- ============================================================================
  v_super_admin_email TEXT := 'sanz.piertony@gmail.com';  -- ⚠️ Tu email
  v_super_admin_password TEXT := 'TonyS@nz2025!';          -- ⚠️ Tu password
  v_super_admin_name TEXT := 'Tony Sanz';                  -- ⚠️ Tu nombre
  -- ============================================================================
  
  v_auth_user_id UUID;
  v_system_tenant_id UUID;
  v_system_user_id UUID;
  v_super_role_id UUID;
  v_user_role_id UUID;
  v_screen_action_id UUID;
  v_rsa_id UUID;
  v_count INTEGER;
  v_user_metadata JSONB;
BEGIN

  RAISE NOTICE '⚠️ Trigger deshabilitado temporalmente';
  RAISE NOTICE '🚀 Iniciando configuración SUPER ADMINISTRATOR v3...';
  RAISE NOTICE '📧 Email: %', v_super_admin_email;
  
  -- ========================================================================
  -- PASO 1: Crear usuario en auth.users (si no existe)
  -- ========================================================================
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_super_admin_email;
  
  IF v_auth_user_id IS NULL THEN
    RAISE NOTICE '🔐 Creando usuario en auth.users...';
    
    -- Preparar metadata
    v_user_metadata := jsonb_build_object(
      'name', v_super_admin_name,
      'role', 'super_admin'
    );
    
    -- Insertar directamente en auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_super_admin_email,
      crypt(v_super_admin_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      v_user_metadata,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_auth_user_id;
    
    RAISE NOTICE '✅ Usuario creado en auth.users: %', v_auth_user_id;
    
    -- Crear identidad en auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_auth_user_id,
      v_auth_user_id::text,
      jsonb_build_object(
        'sub', v_auth_user_id::text,
        'email', v_super_admin_email
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✅ Identidad creada en auth.identities';
  ELSE
    RAISE NOTICE '✅ Usuario ya existe en auth.users: %', v_auth_user_id;
  END IF;
  
  -- ========================================================================
  -- PASO 2: Crear tenant SYSTEM (si no existe)
  -- ========================================================================
  SELECT id INTO v_system_tenant_id
  FROM tenants
  WHERE tenant_name = 'SYSTEM_ADMIN';
  
  IF v_system_tenant_id IS NULL THEN
    INSERT INTO tenants (tenant_name, is_active)
    VALUES ('SYSTEM_ADMIN', true)
    RETURNING id INTO v_system_tenant_id;
    
    RAISE NOTICE '✅ Tenant SYSTEM_ADMIN creado: %', v_system_tenant_id;
  ELSE
    RAISE NOTICE '✅ Tenant SYSTEM_ADMIN ya existe: %', v_system_tenant_id;
  END IF;
  
  -- ========================================================================
  -- PASO 3: Registrar en tenant_members (si no existe)
  -- ========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = v_system_tenant_id
    AND auth_user_id = v_auth_user_id
  ) THEN
    INSERT INTO tenant_members (tenant_id, auth_user_id, member_role)
    VALUES (v_system_tenant_id, v_auth_user_id, 'system_admin');
    
    RAISE NOTICE '✅ Registrado en tenant_members';
  ELSE
    RAISE NOTICE '✅ Ya existe en tenant_members';
  END IF;
  
  -- ========================================================================
  -- PASO 4: Crear perfil en users (si no existe)
  -- ========================================================================
  SELECT id INTO v_system_user_id
  FROM users
  WHERE auth_user_id = v_auth_user_id
  AND tenant_id = v_system_tenant_id;
  
  IF v_system_user_id IS NULL THEN
    INSERT INTO users (
      tenant_id,
      auth_user_id,
      username,
      display_name,
      email,
      is_active,
      created_by
    )
    VALUES (
      v_system_tenant_id,
      v_auth_user_id,
      'super_admin',
      v_super_admin_name,
      v_super_admin_email,
      true,
      'SYSTEM_SETUP'
    )
    RETURNING id INTO v_system_user_id;
    
    RAISE NOTICE '✅ Perfil users creado: %', v_system_user_id;
  ELSE
    RAISE NOTICE '✅ Perfil users ya existe: %', v_system_user_id;
  END IF;
  
  -- ========================================================================
  -- PASO 5: Crear rol SUPER_ADMINISTRATOR con scope SYSTEM
  -- ========================================================================
  SELECT id INTO v_super_role_id
  FROM roles
  WHERE tenant_id = v_system_tenant_id
  AND role_key = 'SUPER_ADMINISTRATOR';
  
  IF v_super_role_id IS NULL THEN
    INSERT INTO roles (
      tenant_id,
      role_key,
      role_name,
      role_scope,
      is_active,
      created_by
    )
    VALUES (
      v_system_tenant_id,
      'SUPER_ADMINISTRATOR',
      'Super Administrator',
      'SYSTEM',
      true,
      'SYSTEM_SETUP'
    )
    RETURNING id INTO v_super_role_id;
    
    RAISE NOTICE '✅ Rol SUPER_ADMINISTRATOR creado: %', v_super_role_id;
  ELSE
    RAISE NOTICE '✅ Rol SUPER_ADMINISTRATOR ya existe: %', v_super_role_id;
  END IF;
  
  -- ========================================================================
  -- PASO 6: Asignar rol al usuario
  -- ========================================================================
  SELECT id INTO v_user_role_id
  FROM user_roles
  WHERE tenant_id = v_system_tenant_id
  AND user_id = v_system_user_id
  AND role_id = v_super_role_id;
  
  IF v_user_role_id IS NULL THEN
    INSERT INTO user_roles (
      tenant_id,
      user_id,
      role_id,
      is_active,
      created_by
    )
    VALUES (
      v_system_tenant_id,
      v_system_user_id,
      v_super_role_id,
      true,
      'SYSTEM_SETUP'
    )
    RETURNING id INTO v_user_role_id;
    
    RAISE NOTICE '✅ Rol asignado al usuario: %', v_user_role_id;
  ELSE
    RAISE NOTICE '✅ Rol ya estaba asignado: %', v_user_role_id;
  END IF;
  
  -- ========================================================================
  -- PASO 7: Asignar TODOS los permisos sobre TODAS las screen_actions
  -- ========================================================================
  RAISE NOTICE '🔐 Asignando permisos completos...';
  
  v_count := 0;
  
  FOR v_screen_action_id IN (
    SELECT sa.id
    FROM screen_actions sa
    JOIN screens s ON sa.screen_id = s.id
    WHERE s.is_active = true
    AND sa.is_active = true
  )
  LOOP
    -- Verificar si ya existe el permiso
    SELECT id INTO v_rsa_id
    FROM role_screen_actions
    WHERE tenant_id = v_system_tenant_id
    AND role_id = v_super_role_id
    AND screen_action_id = v_screen_action_id;
    
    IF v_rsa_id IS NULL THEN
      INSERT INTO role_screen_actions (
        tenant_id,
        role_id,
        screen_action_id,
        is_allowed,
        is_active,
        created_by
      )
      VALUES (
        v_system_tenant_id,
        v_super_role_id,
        v_screen_action_id,
        true,
        true,
        'SYSTEM_SETUP'
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Permisos asignados: % nuevos', v_count;
  
  -- ========================================================================
  -- PASO 8: Resumen final
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SUPER ADMINISTRATOR CONFIGURADO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email:      %', v_super_admin_email;
  RAISE NOTICE 'Nombre:     %', v_super_admin_name;
  RAISE NOTICE 'Auth ID:    %', v_auth_user_id;
  RAISE NOTICE 'Tenant ID:  %', v_system_tenant_id;
  RAISE NOTICE 'User ID:    %', v_system_user_id;
  RAISE NOTICE 'Role ID:    %', v_super_role_id;
  RAISE NOTICE 'Permisos:   % screen_actions con acceso completo', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 CREDENCIALES DE LOGIN:';
  RAISE NOTICE '   Email:    %', v_super_admin_email;
  RAISE NOTICE '   Password: (el que configuraste)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Ahora se recreará el trigger corregido...';
  RAISE NOTICE '========================================';

END $$;

-- ============================================================================
-- PARTE 3: RECREAR TRIGGER CORREGIDO (sin campos inexistentes)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_username VARCHAR;
  v_display_name VARCHAR;
BEGIN
  -- Obtener tenant_id del metadata (se pasa durante el signup)
  v_tenant_id := (new.raw_user_meta_data->>'tenant_id')::uuid;
  
  -- Obtener username del metadata o usar parte del email
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  
  -- Obtener display_name del metadata o usar username
  v_display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    v_username
  );
  
  -- Si no hay tenant_id en metadata, crear uno temporal (para testing)
  IF v_tenant_id IS NULL THEN
    -- Buscar si existe un tenant por defecto
    SELECT id INTO v_tenant_id FROM tenants WHERE tenant_name = 'Default Tenant' LIMIT 1;
    
    -- Si no existe, crear uno (SIN created_by porque no existe en la tabla)
    IF v_tenant_id IS NULL THEN
      INSERT INTO tenants (tenant_name, is_active)
      VALUES ('Default Tenant', true)
      RETURNING id INTO v_tenant_id;
    END IF;
  END IF;

  -- Crear registro en tenant_members
  INSERT INTO tenant_members (tenant_id, auth_user_id, member_role)
  VALUES (v_tenant_id, new.id, 'admin')
  ON CONFLICT (tenant_id, auth_user_id) DO NOTHING;

  -- Crear registro en public.users
  INSERT INTO public.users (
    auth_user_id,
    tenant_id,
    username,
    email,
    display_name,
    preferred_language_code,
    is_active,
    created_by
  )
  VALUES (
    new.id,
    v_tenant_id,
    v_username,
    new.email,
    v_display_name,
    coalesce(new.raw_user_meta_data->>'preferred_language_code', 'es'),
    true,
    'AUTH_SYSTEM'
  );

  RETURN new;
END;
$$;

-- Recrear trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 
  'Crea automáticamente un registro en public.users cuando se registra un nuevo usuario en auth.users';

-- ============================================================================
-- 🔍 VERIFICACIÓN POST-INSTALACIÓN
-- ============================================================================

SELECT '🔍 VERIFICACIÓN DE CONFIGURACIÓN' as titulo;

-- Ver usuario en auth.users
SELECT 
  '🔐 USUARIO AUTH' as seccion,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'sanz.piertony@gmail.com';  -- ⚠️ CAMBIAR también aquí

-- Ver tenant SYSTEM
SELECT 
  '👑 TENANT SYSTEM' as seccion,
  id,
  tenant_name,
  is_active
FROM tenants
WHERE tenant_name = 'SYSTEM_ADMIN';

-- Ver usuario Super Admin
SELECT 
  '👤 SUPER ADMIN USER' as seccion,
  u.id,
  u.username,
  u.display_name,
  u.email,
  t.tenant_name,
  u.is_active
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE t.tenant_name = 'SYSTEM_ADMIN';

-- Ver rol
SELECT 
  '🔐 ROL SUPER_ADMINISTRATOR' as seccion,
  r.id,
  r.role_key,
  r.role_name,
  r.role_scope,
  r.is_active
FROM roles r
JOIN tenants t ON r.tenant_id = t.id
WHERE t.tenant_name = 'SYSTEM_ADMIN'
AND r.role_key = 'SUPER_ADMINISTRATOR';

-- Ver permisos asignados
SELECT 
  '🔑 PERMISOS ASIGNADOS' as seccion,
  COUNT(*) as total_permisos,
  COUNT(*) FILTER (WHERE rsa.is_allowed = true) as permisos_permitidos
FROM role_screen_actions rsa
JOIN roles r ON rsa.role_id = r.id
JOIN tenants t ON r.tenant_id = t.id
WHERE t.tenant_name = 'SYSTEM_ADMIN'
AND r.role_key = 'SUPER_ADMINISTRATOR';

-- ============================================================================
-- ✅ LISTO!
-- ============================================================================
-- 
-- 1. ✅ Trigger deshabilitado temporalmente
-- 2. ✅ Super Admin creado
-- 3. ✅ Trigger recreado CORREGIDO
-- 4. ✅ Ahora puedes iniciar sesión con: sanz.piertony@gmail.com
-- 
-- ============================================================================
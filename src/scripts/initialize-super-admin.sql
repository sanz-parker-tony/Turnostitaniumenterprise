-- ============================================================================
-- SCRIPT DE INICIALIZACIÓN DE SUPER ADMIN
-- Turnos Titanium - Sistema de Control de Asistencias
-- ============================================================================
-- Este script crea automáticamente:
-- 1. Tenant del sistema
-- 2. Usuario Super Admin en Auth
-- 3. Usuario Super Admin en tabla users
-- 4. Asignación del rol SUPER_ADMIN
-- ============================================================================

-- PASO 1: Crear o verificar el tenant del sistema
-- ============================================================================
DO $$
DECLARE
  v_system_tenant_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  INSERT INTO tenants (id, tenant_name, is_active)
  VALUES (
    v_system_tenant_id,
    'Sistema Turnos Titanium',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Tenant del sistema verificado/creado: %', v_system_tenant_id;
END $$;

-- PASO 2: Crear usuario en Auth (esto requiere ejecutarse desde el Dashboard de Supabase Auth)
-- ============================================================================
-- NOTA: Este paso NO puede ejecutarse desde SQL por seguridad.
-- Debes crear el usuario manualmente en Supabase Dashboard > Authentication > Users
-- O usar la API de Admin de Supabase
-- Por ahora, asumimos que el usuario ya existe en Auth con email: admin@turnos-titanium.com

-- PASO 3: Insertar usuario en tabla users (vinculado al tenant del sistema)
-- ============================================================================
DO $$
DECLARE
  v_system_tenant_id uuid := '00000000-0000-0000-0000-000000000000';
  v_auth_user_id uuid;
  v_user_id uuid;
  v_super_admin_role_id uuid;
  v_user_role_id uuid;
BEGIN
  -- Buscar el usuario en auth.users por email
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = 'admin@turnos-titanium.com';
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Usuario admin@turnos-titanium.com no encontrado en auth.users. Por favor créalo primero en Supabase Dashboard > Authentication > Users con password: TurnosTitanium2025!';
  END IF;
  
  RAISE NOTICE '✅ Usuario encontrado en Auth: %', v_auth_user_id;
  
  -- Insertar o actualizar usuario en tabla users
  INSERT INTO users (auth_user_id, tenant_id, username, display_name, email, preferred_language_code, is_active, created_by)
  VALUES (
    v_auth_user_id,
    v_system_tenant_id,
    'superadmin',
    'Super Administrador',
    'admin@turnos-titanium.com',
    'es',
    true,
    'SYSTEM'
  )
  ON CONFLICT (auth_user_id) 
  DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    is_active = EXCLUDED.is_active,
    updated_by = 'SYSTEM',
    updated_at = NOW()
  RETURNING id INTO v_user_id;
  
  RAISE NOTICE '✅ Usuario creado/actualizado en tabla users: %', v_user_id;
  
  -- Buscar el rol SUPER_ADMIN
  SELECT id INTO v_super_admin_role_id
  FROM roles
  WHERE role_key = 'SUPER_ADMIN'
    AND role_scope = 'SYSTEM';
  
  IF v_super_admin_role_id IS NULL THEN
    RAISE EXCEPTION '❌ Rol SUPER_ADMIN con role_scope=SYSTEM no encontrado en tabla roles. Verifica que existe.';
  END IF;
  
  RAISE NOTICE '✅ Rol SUPER_ADMIN encontrado: %', v_super_admin_role_id;
  
  -- Asignar rol al usuario
  INSERT INTO user_roles (tenant_id, user_id, role_id, company_id, is_active, created_by)
  VALUES (v_system_tenant_id, v_user_id, v_super_admin_role_id, NULL, true, 'SYSTEM')
  ON CONFLICT ON CONSTRAINT uq_user_roles
  DO UPDATE SET
    is_active = EXCLUDED.is_active,
    updated_by = 'SYSTEM',
    updated_at = NOW()
  RETURNING id INTO v_user_role_id;
  
  IF FOUND THEN
    RAISE NOTICE '✅ Rol SUPER_ADMIN asignado/actualizado al usuario';
  END IF;
  
  -- Eliminar cualquier scope existente para garantizar acceso total
  DELETE FROM user_role_scopes
  WHERE user_role_id IN (
    SELECT id FROM user_roles WHERE user_id = v_user_id
  );
  
  RAISE NOTICE '✅ Scopes eliminados (acceso total garantizado)';
  
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE '🎉 SUPER ADMIN INICIALIZADO EXITOSAMENTE';
  RAISE NOTICE '🎉 ============================================';
  RAISE NOTICE 'Email: admin@turnos-titanium.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Tenant ID: %', v_system_tenant_id;
  RAISE NOTICE 'Role ID: %', v_super_admin_role_id;
  RAISE NOTICE '🎉 ============================================';
END $$;
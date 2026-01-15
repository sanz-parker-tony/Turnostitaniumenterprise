-- ============================================================================
-- URGENTE: Diagnosticar y Resolver Problema de Login del Super Usuario
-- ============================================================================
-- Email esperado: admin@turnos-titanium.com
-- Password esperada: TurnosTitanium2025!
-- ✅ CORREGIDO: Campos tenant_name en lugar de name
-- ============================================================================

-- PASO 1: DIAGNÓSTICO COMPLETO
-- ============================================================================

-- 1.1 Verificar si el usuario existe en auth.users
SELECT 
  '🔍 VERIFICACIÓN AUTH.USERS' AS paso,
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  CASE 
    WHEN encrypted_password IS NULL THEN '❌ SIN PASSWORD'
    ELSE '✅ PASSWORD OK'
  END AS password_status
FROM auth.users
WHERE email = 'admin@turnos-titanium.com';

-- 1.2 Verificar si el usuario existe en public.users
SELECT 
  '🔍 VERIFICACIÓN PUBLIC.USERS' AS paso,
  id,
  email,
  username,
  tenant_id,
  is_active,
  created_at
FROM public.users
WHERE email = 'admin@turnos-titanium.com';

-- 1.3 Verificar tenant asociado (CORREGIDO: usa tenant_name)
SELECT 
  '🔍 VERIFICACIÓN TENANT' AS paso,
  t.id,
  t.tenant_name,  -- ✅ CORREGIDO
  t.is_active,
  t.created_at
FROM tenants t
WHERE t.id = (
  SELECT tenant_id 
  FROM public.users 
  WHERE email = 'admin@turnos-titanium.com'
);

-- 1.4 Verificar roles asignados
SELECT 
  '🔍 VERIFICACIÓN ROLES' AS paso,
  r.role_key,
  r.name,
  ur.is_active,
  ur.created_at
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN public.users u ON ur.user_id = u.id
WHERE u.email = 'admin@turnos-titanium.com';

-- 1.5 Verificar si hay scopes configurados (no debería haber para Super Admin)
SELECT 
  '🔍 VERIFICACIÓN SCOPES' AS paso,
  COUNT(*) as total_scopes,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Super Admin sin scopes (correcto)'
    ELSE '⚠️ Super Admin tiene scopes (puede causar problemas)'
  END AS status
FROM user_role_scopes urs
JOIN user_roles ur ON urs.user_role_id = ur.id
JOIN public.users u ON ur.user_id = u.id
WHERE u.email = 'admin@turnos-titanium.com';


-- ============================================================================
-- PASO 2: SOLUCIONES AUTOMÁTICAS
-- ============================================================================

-- 2.1 Crear/verificar estructura completa del usuario admin
DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_role_id UUID;
  v_user_role_id UUID;
  v_auth_user_exists BOOLEAN;
BEGIN
  -- Verificar si existe en auth
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = 'admin@turnos-titanium.com'
  ) INTO v_auth_user_exists;

  IF NOT v_auth_user_exists THEN
    RAISE NOTICE '❌ Usuario NO existe en auth.users';
    RAISE NOTICE '⚠️  ACCIÓN REQUERIDA: Debes crear el usuario usando el endpoint de reset-password';
    RAISE NOTICE '🔗 Abre: /reset-password-helper.html';
    RETURN;
  END IF;

  -- Obtener ID del usuario de auth
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'admin@turnos-titanium.com';

  RAISE NOTICE '✅ Usuario existe en auth.users: %', v_user_id;

  -- ========================================================================
  -- PASO 2A: Verificar/Crear TENANT
  -- ========================================================================
  
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE tenant_name = 'Titanium Corp'  -- ✅ CORREGIDO
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (
      tenant_name,  -- ✅ CORREGIDO
      is_active,
      created_by,
      updated_by
    )
    VALUES (
      'Titanium Corp',
      true,
      'system',
      'system'
    )
    RETURNING id INTO v_tenant_id;
    RAISE NOTICE '✅ Tenant creado: % - Titanium Corp', v_tenant_id;
  ELSE
    RAISE NOTICE '✅ Tenant existe: % - Titanium Corp', v_tenant_id;
  END IF;

  -- ========================================================================
  -- PASO 2B: Verificar/Crear USER en public.users
  -- ========================================================================
  
  SELECT id, tenant_id INTO v_user_id, v_tenant_id
  FROM public.users
  WHERE email = 'admin@turnos-titanium.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE '⚠️  Creando usuario en public.users...';
    
    INSERT INTO public.users (
      id,
      email,
      username,
      tenant_id,
      is_active,
      created_by,
      updated_by
    )
    SELECT 
      au.id,
      au.email,
      'admin',
      v_tenant_id,
      true,
      'system',
      'system'
    FROM auth.users au
    WHERE au.email = 'admin@turnos-titanium.com'
    RETURNING id INTO v_user_id;

    RAISE NOTICE '✅ Usuario creado en public.users: %', v_user_id;
  ELSE
    RAISE NOTICE '✅ Usuario existe en public.users: %', v_user_id;
    
    -- Actualizar tenant_id si está NULL
    IF v_tenant_id IS NULL THEN
      UPDATE public.users
      SET tenant_id = (SELECT id FROM tenants WHERE tenant_name = 'Titanium Corp' LIMIT 1)
      WHERE id = v_user_id;
      RAISE NOTICE '✅ Tenant_id actualizado en public.users';
    END IF;
  END IF;

  -- Recargar tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM public.users
  WHERE id = v_user_id;

  -- ========================================================================
  -- PASO 2C: Verificar/Crear ROL SUPER_ADMIN
  -- ========================================================================
  
  SELECT id INTO v_role_id
  FROM roles
  WHERE role_key = 'SUPER_ADMIN'
    AND tenant_id = v_tenant_id;

  IF v_role_id IS NULL THEN
    INSERT INTO roles (
      role_key,
      name,
      description,
      tenant_id,
      is_active,
      created_by,
      updated_by
    )
    VALUES (
      'SUPER_ADMIN',
      'Super Administrador',
      'Acceso total al sistema sin restricciones',
      v_tenant_id,
      true,
      'system',
      'system'
    )
    RETURNING id INTO v_role_id;
    RAISE NOTICE '✅ Rol SUPER_ADMIN creado: %', v_role_id;
  ELSE
    RAISE NOTICE '✅ Rol SUPER_ADMIN existe: %', v_role_id;
  END IF;

  -- ========================================================================
  -- PASO 2D: Verificar/Asignar ROL al Usuario
  -- ========================================================================
  
  SELECT id INTO v_user_role_id
  FROM user_roles
  WHERE user_id = v_user_id
    AND role_id = v_role_id
    AND tenant_id = v_tenant_id;

  IF v_user_role_id IS NULL THEN
    INSERT INTO user_roles (
      user_id,
      role_id,
      tenant_id,
      is_active,
      created_by,
      updated_by
    )
    VALUES (
      v_user_id,
      v_role_id,
      v_tenant_id,
      true,
      'system',
      'system'
    )
    RETURNING id INTO v_user_role_id;
    RAISE NOTICE '✅ Rol asignado al usuario: %', v_user_role_id;
  ELSE
    -- Asegurar que está activo
    UPDATE user_roles
    SET is_active = true
    WHERE id = v_user_role_id;
    RAISE NOTICE '✅ Usuario ya tiene el rol asignado: % (activado)', v_user_role_id;
  END IF;

  -- ========================================================================
  -- PASO 2E: Limpiar SCOPES (Super Admin no debe tener scopes)
  -- ========================================================================
  
  DELETE FROM user_role_scopes
  WHERE user_role_id IN (
    SELECT ur.id
    FROM user_roles ur
    WHERE ur.user_id = v_user_id
  );
  
  RAISE NOTICE '✅ Scopes limpiados - Super Admin tiene acceso total sin restricciones';

  -- ========================================================================
  -- RESUMEN FINAL
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Usuario ID: %', v_user_id;
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE 'Rol ID: %', v_role_id;
  RAISE NOTICE 'User Role ID: %', v_user_role_id;
  RAISE NOTICE '';
  RAISE NOTICE '📧 Email: admin@turnos-titanium.com';
  RAISE NOTICE '🔑 Password: TurnosTitanium2025!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Si el login falla, ejecuta el reset-password:';
  RAISE NOTICE '🔗 Abre: /reset-password-helper.html';
  RAISE NOTICE '========================================';

END $$;


-- ============================================================================
-- PASO 3: VERIFICACIÓN FINAL
-- ============================================================================

SELECT 
  '✅ VERIFICACIÓN FINAL' AS paso,
  (SELECT COUNT(*) FROM auth.users WHERE email = 'admin@turnos-titanium.com') as auth_users_count,
  (SELECT COUNT(*) FROM public.users WHERE email = 'admin@turnos-titanium.com') as public_users_count,
  (SELECT COUNT(*) FROM user_roles ur 
   JOIN public.users u ON ur.user_id = u.id 
   JOIN roles r ON ur.role_id = r.id
   WHERE u.email = 'admin@turnos-titanium.com' 
     AND r.role_key = 'SUPER_ADMIN'
     AND ur.is_active = true) as super_admin_role_count,
  (SELECT COUNT(*) FROM user_role_scopes urs
   JOIN user_roles ur ON urs.user_role_id = ur.id
   JOIN public.users u ON ur.user_id = u.id
   WHERE u.email = 'admin@turnos-titanium.com') as scopes_count;

-- Resultado esperado:
-- auth_users_count = 1
-- public_users_count = 1
-- super_admin_role_count = 1
-- scopes_count = 0 (Super Admin sin scopes = acceso total)


-- ============================================================================
-- PASO 4: INFORMACIÓN DE LOGIN
-- ============================================================================

SELECT 
  '📋 CREDENCIALES DE LOGIN' AS info,
  'admin@turnos-titanium.com' AS email,
  'TurnosTitanium2025!' AS password,
  '⚠️ Si no funciona, ejecuta: /reset-password-helper.html' AS nota;


-- ============================================================================
-- PASO 5: VERIFICAR ESTRUCTURA DE TENANT (DIAGNÓSTICO ADICIONAL)
-- ============================================================================

-- Ver estructura real de la tabla tenants
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tenants'
  AND table_schema = 'public'
ORDER BY ordinal_position;

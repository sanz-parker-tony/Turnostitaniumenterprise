-- ============================================================================
-- 👑 SUPER ADMINISTRATOR SETUP - ENTERPRISE ON-PREMISE
-- ============================================================================
-- PROPÓSITO: Crear el usuario que administra tablas SYSTEM
-- EJECUTAR: Solo desde SQL Editor de Supabase (NUNCA exponer en UI)
-- FECHA: 2025-01-15
-- ============================================================================
-- ⚠️ CONFIGURACIÓN REQUERIDA:
--    1. Reemplaza 'admin@tuempresa.com' con el email del Super Admin
--    2. Este usuario YA DEBE EXISTIR en auth.users (creado por Supabase Auth)
-- ============================================================================

DO $$
DECLARE
  v_super_admin_email TEXT := 'admin@tuempresa.com'; -- ⚠️ CAMBIAR AQUÍ
  v_auth_user_id UUID;
  v_system_tenant_id UUID;
  v_system_user_id UUID;
  v_super_role_id UUID;
  v_user_role_id UUID;
  v_screen_id UUID;
  v_action_id UUID;
  v_screen_action_id UUID;
  v_rsa_id UUID;
  v_count INTEGER;
BEGIN

  RAISE NOTICE '🚀 Iniciando configuración SUPER ADMINISTRATOR...';
  RAISE NOTICE '📧 Email: %', v_super_admin_email;
  
  -- ========================================================================
  -- PASO 1: Verificar que el usuario existe en auth.users
  -- ========================================================================
  SELECT id INTO v_auth_user_id
  FROM auth.users
  WHERE email = v_super_admin_email;
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION '❌ ERROR: El usuario % NO existe en auth.users. Créalo primero en Supabase Auth.', v_super_admin_email;
  END IF;
  
  RAISE NOTICE '✅ Usuario encontrado en auth.users: %', v_auth_user_id;
  
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
      'Super Administrator',
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
  RAISE NOTICE 'Tenant ID:  %', v_system_tenant_id;
  RAISE NOTICE 'User ID:    %', v_system_user_id;
  RAISE NOTICE 'Role ID:    %', v_super_role_id;
  RAISE NOTICE 'Permisos:   % screen_actions con acceso completo', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 SIGUIENTE PASO:';
  RAISE NOTICE '   1. Cierra sesión en la aplicación';
  RAISE NOTICE '   2. Inicia sesión con: %', v_super_admin_email;
  RAISE NOTICE '   3. Verás TODAS las pantallas SYSTEM disponibles';
  RAISE NOTICE '========================================';

END $$;

-- ============================================================================
-- 🔍 VERIFICACIÓN POST-INSTALACIÓN
-- ============================================================================

SELECT '🔍 VERIFICACIÓN DE CONFIGURACIÓN' as titulo;

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

-- Ver asignación de rol
SELECT 
  '✅ ASIGNACIÓN DE ROL' as seccion,
  ur.id,
  u.username,
  r.role_name,
  ur.is_active
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
JOIN tenants t ON ur.tenant_id = t.id
WHERE t.tenant_name = 'SYSTEM_ADMIN';

-- Ver permisos asignados
SELECT 
  '🔑 PERMISOS ASIGNADOS' as seccion,
  COUNT(*) as total_permisos,
  COUNT(*) FILTER (WHERE rsa.is_allowed = true) as permisos_permitidos,
  COUNT(*) FILTER (WHERE rsa.is_active = true) as permisos_activos
FROM role_screen_actions rsa
JOIN roles r ON rsa.role_id = r.id
JOIN tenants t ON r.tenant_id = t.id
WHERE t.tenant_name = 'SYSTEM_ADMIN'
AND r.role_key = 'SUPER_ADMINISTRATOR';

-- Ver pantallas con acceso
SELECT 
  '📋 PANTALLAS CON ACCESO (primeras 10)' as seccion,
  s.screen_key,
  s.screen_name,
  smg.menu_group_key,
  COUNT(DISTINCT a.action_key) as acciones_permitidas
FROM role_screen_actions rsa
JOIN roles r ON rsa.role_id = r.id
JOIN tenants t ON r.tenant_id = t.id
JOIN screen_actions sa ON rsa.screen_action_id = sa.id
JOIN screens s ON sa.screen_id = s.id
JOIN actions a ON sa.action_id = a.id
JOIN system_menu_groups smg ON s.menu_group_id = smg.id
WHERE t.tenant_name = 'SYSTEM_ADMIN'
AND r.role_key = 'SUPER_ADMINISTRATOR'
AND rsa.is_allowed = true
AND rsa.is_active = true
GROUP BY s.screen_key, s.screen_name, smg.menu_group_key, s.sort_order
ORDER BY smg.menu_group_key, s.sort_order
LIMIT 10;

-- ============================================================================
-- 📝 NOTAS IMPORTANTES
-- ============================================================================
-- 
-- 1. Este script es IDEMPOTENTE - puede ejecutarse múltiples veces
-- 2. Solo funciona si el usuario YA EXISTE en auth.users
-- 3. El tenant SYSTEM_ADMIN es especial y NO debe eliminarse
-- 4. El rol SUPER_ADMINISTRATOR tiene scope='SYSTEM' (diferente a roles tenant)
-- 5. Este usuario puede administrar:
--    ✅ system_menu_groups
--    ✅ screens
--    ✅ actions
--    ✅ screen_actions
--    ✅ lookup_groups
--    ✅ lookup_values
--    ✅ system_languages
--    ✅ Todas las tablas de traducción (i18n)
-- 6. Para crear más Super Admins: ejecutar este script con otro email
-- 
-- ============================================================================

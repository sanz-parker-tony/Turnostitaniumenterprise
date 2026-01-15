-- ============================================================================
-- 🔍 DIAGNÓSTICO REAL - Usando DDL correcta
-- ============================================================================
-- ⚠️ REEMPLAZA 'tu_email@ejemplo.com' con tu email real (3 lugares)
-- ============================================================================

-- 1️⃣ Estructura de system_menu_groups
SELECT '📁 ESTRUCTURA system_menu_groups:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'system_menu_groups'
ORDER BY ordinal_position;

-- 2️⃣ Grupos de menú existentes
SELECT '📂 GRUPOS DE MENÚ:' as info;
SELECT 
  id,
  menu_group_key,
  menu_group_name,
  icon_key,
  sort_order,
  is_active
FROM system_menu_groups 
ORDER BY sort_order;

-- 3️⃣ Estructura de screens
SELECT '🖥️ ESTRUCTURA screens:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'screens'
ORDER BY ordinal_position;

-- 4️⃣ Screens del grupo SEGURIDAD
SELECT '🛡️ SCREENS DE SEGURIDAD:' as info;
SELECT 
  s.id,
  s.screen_key,
  s.screen_name,
  s.menu_group_id,
  smg.menu_group_key,
  s.icon_key,
  s.route_path,
  s.sort_order,
  s.is_active
FROM screens s
LEFT JOIN system_menu_groups smg ON s.menu_group_id = smg.id
WHERE smg.menu_group_key = 'SEGURIDAD'
ORDER BY s.sort_order;

-- 5️⃣ ¿Existe SEC_SYSTEM_ADMIN?
SELECT '❓ ¿EXISTE SEC_SYSTEM_ADMIN?' as pregunta;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM screens WHERE screen_key = 'SEC_SYSTEM_ADMIN')
    THEN '✅ SÍ EXISTE'
    ELSE '❌ NO EXISTE'
  END as resultado;

-- Si existe, mostrar datos
SELECT '📋 DATOS SEC_SYSTEM_ADMIN (si existe):' as info;
SELECT 
  s.id,
  s.screen_key,
  s.screen_name,
  s.menu_group_id,
  smg.menu_group_key,
  s.icon_key,
  s.route_path,
  s.is_active
FROM screens s
LEFT JOIN system_menu_groups smg ON s.menu_group_id = smg.id
WHERE s.screen_key = 'SEC_SYSTEM_ADMIN';

-- 6️⃣ Idiomas del sistema
SELECT '🌍 IDIOMAS:' as info;
SELECT 
  code,
  language_name,
  is_active,
  is_default
FROM system_languages
ORDER BY is_default DESC, code;

-- 7️⃣ Estructura de tenant_members (para ver tu tenant)
SELECT '👤 TU TENANT:' as info;
-- ⚠️ REEMPLAZA 'tu_email@ejemplo.com' con tu email real
SELECT 
  tm.tenant_id,
  t.tenant_name,
  tm.member_role,
  au.email
FROM auth.users au
JOIN tenant_members tm ON au.id = tm.auth_user_id
JOIN tenants t ON tm.tenant_id = t.id
WHERE au.email = 'tu_email@ejemplo.com';  -- ⚠️ CAMBIAR

-- 8️⃣ Estructura de users (perfil de aplicación)
SELECT '📋 TU PERFIL DE APLICACIÓN:' as info;
-- ⚠️ REEMPLAZA 'tu_email@ejemplo.com' con tu email real
SELECT 
  u.id as user_id,
  u.tenant_id,
  u.username,
  u.display_name,
  u.email,
  u.is_active,
  au.email as auth_email
FROM users u
JOIN auth.users au ON u.auth_user_id = au.id
WHERE au.email = 'tu_email@ejemplo.com';  -- ⚠️ CAMBIAR

-- 9️⃣ Tus roles
SELECT '🔐 TUS ROLES:' as info;
-- ⚠️ REEMPLAZA 'tu_email@ejemplo.com' con tu email real
SELECT 
  r.id as role_id,
  r.role_key,
  r.role_name,
  r.tenant_id,
  r.is_active,
  ur.is_active as asignacion_activa
FROM auth.users au
JOIN users u ON au.id = u.auth_user_id
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE au.email = 'tu_email@ejemplo.com';  -- ⚠️ CAMBIAR

-- 🔟 Permisos sobre screens de SEGURIDAD
SELECT '🔑 PERMISOS EN SEGURIDAD:' as info;
SELECT 
  r.role_name,
  s.screen_key,
  a.action_key,
  rsa.is_allowed,
  rsa.is_active
FROM auth.users au
JOIN users u ON au.id = u.auth_user_id
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_screen_actions rsa ON r.id = rsa.role_id
JOIN screen_actions sa ON rsa.screen_action_id = sa.id
JOIN screens s ON sa.screen_id = s.id
JOIN actions a ON sa.action_id = a.id
JOIN system_menu_groups smg ON s.menu_group_id = smg.id
WHERE au.email = 'tu_email@ejemplo.com'
  AND smg.menu_group_key = 'SEGURIDAD'
  AND rsa.is_allowed = true
  AND rsa.is_active = true
ORDER BY s.screen_key, a.action_key;

-- ============================================================================
-- 📋 RESUMEN DE LO QUE NECESITO QUE ME DIGAS:
-- ============================================================================
-- ✅ ¿Cuál es tu tenant_id?
-- ✅ ¿Existe SEC_SYSTEM_ADMIN? (SÍ/NO)
-- ✅ ¿Cuántos idiomas hay?
-- ✅ ¿Tienes roles asignados? (anota el role_id si hay)
-- ✅ ¿Tienes permisos en pantallas de SEGURIDAD? (SÍ/NO)
-- ============================================================================

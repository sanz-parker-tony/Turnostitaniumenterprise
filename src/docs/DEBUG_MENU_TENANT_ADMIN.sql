-- ============================================================================
-- DEBUG_MENU_TENANT_ADMIN.sql
-- Diagnóstico completo: ¿Por qué tenant.admin no ve su menú?
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar tenant SYSTEM
-- ============================================================================
SELECT 
  '1. TENANT SYSTEM' as paso,
  id,
  tenant_key,
  tenant_name,
  is_active
FROM tenants
WHERE tenant_key = 'SYSTEM';

-- ============================================================================
-- PASO 2: Verificar rol TENANT_ADMIN
-- ============================================================================
SELECT 
  '2. ROL TENANT_ADMIN' as paso,
  r.id as role_id,
  r.role_key,
  r.role_name,
  r.role_scope,
  r.tenant_id,
  t.tenant_key as tenant_key_del_rol,
  r.is_active
FROM roles r
LEFT JOIN tenants t ON r.tenant_id = t.id
WHERE r.role_key = 'TENANT_ADMIN';

-- ============================================================================
-- PASO 3: Verificar usuario tenant.admin (buscar por email)
-- ============================================================================
-- Nota: Cambiar el email si es diferente
SELECT 
  '3. USUARIO tenant.admin' as paso,
  u.id as user_id,
  u.auth_user_id,
  u.tenant_id as user_tenant_id,
  t.tenant_key as tenant_key_del_usuario,
  u.username,
  u.email,
  u.display_name,
  u.is_active
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email LIKE '%admin%'  -- Ajustar este filtro según el email real
ORDER BY u.created_at DESC;

-- ============================================================================
-- PASO 4: Verificar asignación de rol (user_roles)
-- ============================================================================
SELECT 
  '4. USER_ROLES' as paso,
  ur.id as user_role_id,
  ur.user_id,
  u.email,
  u.username,
  ur.role_id,
  r.role_key,
  r.role_name,
  ur.is_primary,
  ur.is_active
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.email LIKE '%admin%'  -- Ajustar este filtro
ORDER BY ur.created_at DESC;

-- ============================================================================
-- PASO 5: Verificar role_screen_actions para TENANT_ADMIN
-- ============================================================================
SELECT 
  '5. PERMISOS TENANT_ADMIN (role_screen_actions)' as paso,
  rsa.id as permission_id,
  rsa.tenant_id as permission_tenant_id,
  t.tenant_key as tenant_key_del_permiso,
  rsa.role_id,
  r.role_key,
  rsa.screen_action_id,
  rsa.is_allowed,
  rsa.is_active
FROM role_screen_actions rsa
LEFT JOIN tenants t ON rsa.tenant_id = t.id
LEFT JOIN roles r ON rsa.role_id = r.id
WHERE r.role_key = 'TENANT_ADMIN'
ORDER BY rsa.id
LIMIT 20;

-- ============================================================================
-- PASO 6: Contar permisos por rol
-- ============================================================================
SELECT 
  '6. CONTEO DE PERMISOS POR ROL' as paso,
  r.role_key,
  r.role_name,
  r.tenant_id as role_tenant_id,
  t.tenant_key as tenant_key_del_rol,
  COUNT(rsa.id) as total_permisos,
  COUNT(CASE WHEN rsa.is_allowed = true THEN 1 END) as permisos_permitidos,
  COUNT(CASE WHEN rsa.tenant_id IS NULL THEN 1 END) as permisos_con_tenant_null,
  COUNT(CASE WHEN rsa.tenant_id = r.tenant_id THEN 1 END) as permisos_con_tenant_correcto
FROM roles r
LEFT JOIN tenants t ON r.tenant_id = t.id
LEFT JOIN role_screen_actions rsa ON r.id = rsa.role_id
WHERE r.role_key IN ('SYSTEM_ADMIN', 'TENANT_ADMIN', 'RRHH_ADMIN', 'SUPERVISOR', 'EMPLOYEE')
GROUP BY r.id, r.role_key, r.role_name, r.tenant_id, t.tenant_key
ORDER BY r.role_key;

-- ============================================================================
-- PASO 7: Verificar grupos de menú para TENANT_ADMIN
-- ============================================================================
SELECT 
  '7. GRUPOS DE MENÚ DE TENANT_ADMIN' as paso,
  DISTINCT smg.menu_group_key,
  smg.menu_group_name,
  smg.sort_order
FROM role_screen_actions rsa
JOIN roles r ON rsa.role_id = r.id
JOIN screen_actions sa ON rsa.screen_action_id = sa.id
JOIN screens s ON sa.screen_id = s.id
JOIN system_menu_groups smg ON s.menu_group_id = smg.id
WHERE r.role_key = 'TENANT_ADMIN'
  AND rsa.is_allowed = true
  AND rsa.is_active = true
ORDER BY smg.sort_order;

-- ============================================================================
-- PASO 8: Verificar pantallas específicas de TENANT_ADMIN
-- ============================================================================
SELECT 
  '8. PANTALLAS DE TENANT_ADMIN' as paso,
  smg.menu_group_key,
  s.screen_key,
  s.screen_name,
  a.action_key,
  rsa.is_allowed,
  rsa.tenant_id as permission_tenant_id,
  t.tenant_key as tenant_key_del_permiso
FROM role_screen_actions rsa
JOIN roles r ON rsa.role_id = r.id
LEFT JOIN tenants t ON rsa.tenant_id = t.id
JOIN screen_actions sa ON rsa.screen_action_id = sa.id
JOIN screens s ON sa.screen_id = s.id
JOIN system_menu_groups smg ON s.menu_group_id = smg.id
JOIN actions a ON sa.action_id = a.id
WHERE r.role_key = 'TENANT_ADMIN'
  AND rsa.is_allowed = true
  AND rsa.is_active = true
  AND a.action_key = 'VIEW'  -- Solo acciones de visualización (menú)
ORDER BY smg.sort_order, s.sort_order;

-- ============================================================================
-- PASO 9: QUERY SIMULADO del PermissionsContext
-- ============================================================================
-- Este es el query que usa el frontend para cargar el menú
-- Ajustar el email del usuario según corresponda

WITH user_info AS (
  SELECT 
    u.id as user_id,
    u.tenant_id as user_tenant_id,
    ur.role_id,
    r.role_key
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  JOIN roles r ON ur.role_id = r.id
  WHERE u.email = 'admin@empresa.com'  -- ⚠️ CAMBIAR POR EL EMAIL REAL
    AND ur.is_primary = true
  LIMIT 1
)
SELECT 
  '9. QUERY SIMULADO (como en PermissionsContext)' as paso,
  smg.menu_group_key,
  smg.menu_group_name,
  s.screen_key,
  s.screen_name,
  s.route_path,
  rsa.tenant_id as permission_tenant_id,
  t.tenant_key as tenant_key_del_permiso,
  ui.user_tenant_id,
  t2.tenant_key as tenant_key_del_usuario
FROM user_info ui
JOIN role_screen_actions rsa ON rsa.role_id = ui.role_id
LEFT JOIN tenants t ON rsa.tenant_id = t.id
JOIN screen_actions sa ON rsa.screen_action_id = sa.id
JOIN screens s ON sa.screen_id = s.id
JOIN system_menu_groups smg ON s.menu_group_id = smg.id
JOIN actions a ON sa.action_id = a.id
LEFT JOIN tenants t2 ON ui.user_tenant_id = t2.id
WHERE rsa.is_allowed = true
  AND rsa.is_active = true
  AND a.action_key = 'VIEW'
ORDER BY smg.sort_order, s.sort_order;

-- ============================================================================
-- PASO 10: Verificar si hay permisos con tenant_id diferente al del rol
-- ============================================================================
SELECT 
  '10. ⚠️ PERMISOS CON TENANT_ID INCORRECTO' as paso,
  r.role_key,
  r.tenant_id as role_tenant_id,
  t1.tenant_key as tenant_del_rol,
  rsa.tenant_id as permission_tenant_id,
  t2.tenant_key as tenant_del_permiso,
  COUNT(*) as cantidad_permisos_incorrectos
FROM role_screen_actions rsa
JOIN roles r ON rsa.role_id = r.id
LEFT JOIN tenants t1 ON r.tenant_id = t1.id
LEFT JOIN tenants t2 ON rsa.tenant_id = t2.id
WHERE rsa.tenant_id IS NULL 
   OR rsa.tenant_id != r.tenant_id
GROUP BY r.role_key, r.tenant_id, t1.tenant_key, rsa.tenant_id, t2.tenant_key;

-- ============================================================================
-- PASO 11: SOLUCIÓN - Si hay permisos con tenant_id incorrecto
-- ============================================================================
-- ⚠️ SOLO EJECUTAR SI EL PASO 10 MUESTRA PERMISOS INCORRECTOS

/*
-- Actualizar permisos para que tengan el mismo tenant_id que el rol
UPDATE role_screen_actions rsa
SET tenant_id = r.tenant_id
FROM roles r
WHERE rsa.role_id = r.id
  AND (rsa.tenant_id IS NULL OR rsa.tenant_id != r.tenant_id);
*/

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================
/*
DESPUÉS DE EJECUTAR ESTE DIAGNÓSTICO, DEBES VER:

PASO 6 (Conteo de permisos):
- TENANT_ADMIN debe tener > 0 permisos
- permisos_con_tenant_null debe ser 0
- permisos_con_tenant_correcto debe ser = total_permisos

PASO 8 (Pantallas de TENANT_ADMIN):
- Debe mostrar pantallas de los grupos: MAINT, CONFIG, ORG
- tenant_key_del_permiso debe ser 'SYSTEM' en todos

PASO 9 (Query simulado):
- Debe mostrar las pantallas del menú para el usuario tenant.admin
- permission_tenant_id debe ser el mismo que user_tenant_id
- Ambos deben apuntar a tenant 'SYSTEM'

PASO 10 (Permisos incorrectos):
- NO debe haber filas (resultado vacío)
- Si hay filas, ejecutar el UPDATE del PASO 11
*/
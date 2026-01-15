-- =====================================================
-- DIAGNÓSTICO COMPLETO DEL PROBLEMA DE PERMISOS
-- =====================================================

-- =====================================================
-- PASO 1: Verificar que existe el screen_action COMPANIES + CREATE
-- =====================================================
SELECT 
    s.screen_key,
    s.screen_name,
    a.action_key,
    a.action_name,
    sa.id as screen_action_id,
    sa.is_active
FROM public.screens s
CROSS JOIN public.actions a
LEFT JOIN public.screen_actions sa ON sa.screen_id = s.id AND sa.action_id = a.id
WHERE s.screen_key = 'COMPANIES'
  AND a.action_key = 'CREATE';

-- =====================================================
-- PASO 2: Verificar el rol Super Admin
-- =====================================================
SELECT 
    r.id as role_id,
    r.role_key,
    r.role_name,
    r.is_active,
    t.tenant_name
FROM public.roles r
JOIN public.tenants t ON t.id = r.tenant_id
WHERE r.role_key = 'SUPER_ADMIN';

-- =====================================================
-- PASO 3: Verificar cuántos permisos tiene el rol Super Admin
-- =====================================================
SELECT 
    r.role_name,
    COUNT(rsa.id) as total_permisos
FROM public.roles r
LEFT JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
WHERE r.role_key = 'SUPER_ADMIN'
GROUP BY r.role_name;

-- =====================================================
-- PASO 4: Verificar si existe role_screen_action para COMPANIES + CREATE
-- =====================================================
SELECT 
    r.role_name,
    s.screen_name,
    a.action_name,
    rsa.id as role_screen_action_id,
    rsa.is_active
FROM public.roles r
CROSS JOIN public.screens s
CROSS JOIN public.actions a
LEFT JOIN public.screen_actions sa ON sa.screen_id = s.id AND sa.action_id = a.id
LEFT JOIN public.role_screen_actions rsa ON rsa.role_id = r.role_id AND rsa.screen_action_id = sa.id
WHERE r.role_key = 'SUPER_ADMIN'
  AND s.screen_key = 'COMPANIES'
  AND a.action_key = 'CREATE';

-- =====================================================
-- PASO 5: Verificar el user_role
-- =====================================================
SELECT 
    u.email,
    u.display_name,
    r.role_name,
    ur.id as user_role_id,
    ur.is_active
FROM public.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
WHERE u.email = 'admin@turnos-titanium.com';

-- =====================================================
-- PASO 6: Listar algunos permisos que SÍ tiene el Super Admin
-- =====================================================
SELECT 
    s.screen_key,
    s.screen_name,
    a.action_key,
    a.action_name
FROM public.roles r
JOIN public.role_screen_actions rsa ON rsa.role_id = r.role_id
JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
JOIN public.screens s ON s.id = sa.screen_id
JOIN public.actions a ON a.id = sa.action_id
WHERE r.role_key = 'SUPER_ADMIN'
  AND rsa.is_active = true
ORDER BY s.screen_key, a.action_key
LIMIT 20;

-- =====================================================
-- PASO 7: Verificar total de screen_actions en el sistema
-- =====================================================
SELECT COUNT(*) as total_screen_actions
FROM public.screen_actions
WHERE is_active = true;

-- =====================================================
-- PASO 8: Verificar si hay screen_actions para COMPANIES
-- =====================================================
SELECT 
    s.screen_key,
    a.action_key,
    sa.id as screen_action_id,
    sa.is_active
FROM public.screens s
JOIN public.screen_actions sa ON sa.screen_id = s.id
JOIN public.actions a ON a.id = sa.action_id
WHERE s.screen_key = 'COMPANIES'
ORDER BY a.action_key;

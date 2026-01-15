-- =====================================================
-- VERIFICACIÓN FINAL - Sistema de Permisos Integrado
-- Verificar que todo está configurado correctamente
-- =====================================================

-- 1. Verificar que las funciones SQL existen
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  )
ORDER BY routine_name;

-- 2. Verificar estructura de system_menu_groups
SELECT 
    menu_group_key,
    menu_group_name,
    icon_key,
    sort_order,
    is_active
FROM public.system_menu_groups
WHERE is_active = true
ORDER BY sort_order;

-- 3. Verificar que las pantallas tienen menu_group_id correcto
SELECT 
    s.screen_key,
    s.screen_name,
    smg.menu_group_key,
    smg.menu_group_name,
    s.is_active
FROM public.screens s
JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
WHERE s.is_active = true
ORDER BY smg.sort_order, s.sort_order
LIMIT 20;

-- 4. Verificar permisos del Super Admin
SELECT COUNT(*) as total_permisos
FROM public.role_screen_actions rsa
JOIN public.roles r ON r.id = rsa.role_id
WHERE r.role_key = 'SUPER_ADMIN'
  AND rsa.is_active = true;

-- 5. Test rápido de la función get_user_screens
SELECT *
FROM get_user_screens('admin@turnos-titanium.com')
LIMIT 10;

-- 6. Test rápido de user_has_permission
SELECT user_has_permission(
    'admin@turnos-titanium.com',
    'ORG_COMPANIES',
    'VIEW'
) as tiene_permiso_view_companies;

-- 7. Verificar que el usuario existe en auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
WHERE email = 'admin@turnos-titanium.com';

-- 8. Verificar que el usuario existe en public.users
SELECT 
    u.id,
    u.email,
    u.username,
    u.tenant_id,
    t.tenant_name
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id
WHERE u.email = 'admin@turnos-titanium.com';

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- ✅ 5 funciones SQL deben existir
-- ✅ ~9 menu groups activos
-- ✅ 55 pantallas con menu_group_id válido
-- ✅ ~220 permisos para SUPER_ADMIN
-- ✅ get_user_screens retorna 55 filas
-- ✅ user_has_permission retorna TRUE
-- ✅ Usuario existe en auth.users
-- ✅ Usuario existe en public.users
-- =====================================================

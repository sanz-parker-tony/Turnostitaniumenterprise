-- =====================================================
-- VERIFICACIÓN FINAL - QUERIES CORREGIDOS
-- =====================================================

-- =====================================================
-- PASO 1: Verificar si la pantalla ORG_COMPANIES existe (CORREGIDO)
-- =====================================================
SELECT 
    s.id,
    s.screen_key,
    s.screen_name,
    smg.menu_group_key,
    smg.menu_group_name,
    s.is_active
FROM public.screens s
LEFT JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
WHERE s.screen_key = 'ORG_COMPANIES';

-- =====================================================
-- PASO 2: Ver TODAS las pantallas de ORGANIZACIÓN (CORREGIDO - sin screen_order)
-- =====================================================
SELECT 
    s.id as screen_id,
    s.screen_key,
    s.screen_name,
    s.is_active
FROM public.screens s
JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
WHERE smg.menu_group_key = 'ORGANIZATION'
ORDER BY s.screen_key;

-- =====================================================
-- PASO 3: Ver qué pantallas NO tienen screen_actions
-- =====================================================
SELECT 
    s.screen_key,
    s.screen_name,
    smg.menu_group_name
FROM public.screens s
LEFT JOIN public.screen_actions sa ON sa.screen_id = s.id
LEFT JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
WHERE sa.id IS NULL
ORDER BY smg.menu_group_name, s.screen_key;

-- =====================================================
-- PASO 4: Ver todas las acciones disponibles
-- =====================================================
SELECT 
    id,
    action_key,
    action_name,
    action_description
FROM public.actions
ORDER BY action_key;

-- =====================================================
-- PASO 5: PRUEBA CORREGIDA - Verificar permiso con el nombre correcto
-- =====================================================
SELECT user_has_permission(
    'admin@turnos-titanium.com', 
    'ORG_COMPANIES',  -- ✅ NOMBRE CORRECTO
    'CREATE'
) as tiene_permiso_companies;

-- =====================================================
-- PASO 6: Verificar si el Super Admin tiene asignado ORG_COMPANIES + CREATE
-- =====================================================
SELECT 
    r.role_name,
    s.screen_key,
    a.action_key,
    rsa.is_active
FROM public.roles r
JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
JOIN public.screens s ON s.id = sa.screen_id
JOIN public.actions a ON a.id = sa.action_id
WHERE r.role_key = 'SUPER_ADMIN'
  AND s.screen_key = 'ORG_COMPANIES'
  AND a.action_key = 'CREATE';

-- =====================================================
-- PASO 7: Ver TODOS los permisos de ORGANIZACIÓN del Super Admin
-- =====================================================
SELECT 
    s.screen_key,
    a.action_key,
    rsa.is_active
FROM public.roles r
JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
JOIN public.screens s ON s.id = sa.screen_id
JOIN public.actions a ON a.id = sa.action_id
WHERE r.role_key = 'SUPER_ADMIN'
  AND s.screen_key LIKE 'ORG_%'
ORDER BY s.screen_key, a.action_key;

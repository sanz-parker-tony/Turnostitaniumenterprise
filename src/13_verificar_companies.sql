-- =====================================================
-- VERIFICAR SI COMPANIES EXISTE Y QUÉ PANTALLAS TIENEN SCREEN_ACTIONS
-- =====================================================

-- =====================================================
-- PASO 1: Verificar si la pantalla COMPANIES existe
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
WHERE s.screen_key = 'COMPANIES';

-- =====================================================
-- PASO 2: Ver TODAS las pantallas de ORGANIZACIÓN
-- =====================================================
SELECT 
    s.id as screen_id,
    s.screen_key,
    s.screen_name,
    s.is_active
FROM public.screens s
JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
WHERE smg.menu_group_key = 'ORGANIZATION'
ORDER BY s.screen_order;

-- =====================================================
-- PASO 3: Ver qué pantallas SÍ tienen screen_actions
-- =====================================================
SELECT 
    s.screen_key,
    s.screen_name,
    COUNT(sa.id) as total_actions,
    STRING_AGG(a.action_key, ', ' ORDER BY a.action_key) as acciones
FROM public.screens s
LEFT JOIN public.screen_actions sa ON sa.screen_id = s.id
LEFT JOIN public.actions a ON a.id = sa.action_id
GROUP BY s.screen_key, s.screen_name
HAVING COUNT(sa.id) > 0
ORDER BY s.screen_key;

-- =====================================================
-- PASO 4: Ver qué pantallas NO tienen screen_actions
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
-- PASO 5: Ver todas las acciones disponibles
-- =====================================================
SELECT 
    id,
    action_key,
    action_name,
    action_description
FROM public.actions
ORDER BY action_key;

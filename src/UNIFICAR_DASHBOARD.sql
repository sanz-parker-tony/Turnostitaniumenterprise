-- ========================================
-- UNIFICAR DASHBOARD: OPCIÓN A (DASHBOARD → DASH)
-- ========================================

-- ANTES: Ver el estado actual
SELECT 
    'lookup_values' as tabla,
    id,
    lookup_key as key_actual,
    lookup_label as label,
    (SELECT COUNT(*) FROM screens WHERE module_id = lookup_values.id) as pantallas
FROM public.lookup_values
WHERE lookup_key = 'DASH'

UNION ALL

SELECT 
    'system_menu_groups' as tabla,
    id,
    menu_group_key as key_actual,
    menu_group_name as label,
    (SELECT COUNT(*) FROM screens WHERE menu_group_id = system_menu_groups.id) as pantallas
FROM public.system_menu_groups
WHERE menu_group_key = 'DASHBOARD';

-- CAMBIAR: DASHBOARD → DASH en system_menu_groups
UPDATE public.system_menu_groups
SET menu_group_key = 'DASH'
WHERE menu_group_key = 'DASHBOARD';

-- DESPUÉS: Verificar que ahora hacen match
SELECT 
    s.screen_key,
    lv.lookup_key as module_lookup_key,
    smg.menu_group_key,
    CASE 
        WHEN lv.lookup_key = smg.menu_group_key THEN '✅ MATCH'
        ELSE '❌ DIFERENTES'
    END as comparacion
FROM public.screens s
LEFT JOIN public.lookup_values lv ON lv.id = s.module_id
LEFT JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
WHERE s.screen_key LIKE 'DASH_%'
ORDER BY s.sort_order;

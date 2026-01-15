-- ========================================
-- VER LOS 9 MÓDULOS REALES EN lookup_values
-- ========================================

-- Ver los lookup_values que se usan como module_id en las 55 pantallas
SELECT 
    lv.id,
    lv.lookup_key,
    lv.lookup_label,
    lv.lookup_short_label,
    lv.sort_order,
    COUNT(s.id) as cantidad_pantallas,
    STRING_AGG(s.screen_key, ', ' ORDER BY s.sort_order) as pantallas
FROM public.lookup_values lv
INNER JOIN public.screens s ON s.module_id = lv.id
GROUP BY lv.id, lv.lookup_key, lv.lookup_label, lv.lookup_short_label, lv.sort_order
ORDER BY lv.sort_order;

-- Comparar module_id vs menu_group_id para cada pantalla
SELECT 
    s.screen_key,
    s.screen_name,
    lv.lookup_key as module_lookup_key,
    lv.lookup_label as module_lookup_label,
    smg.menu_group_key,
    smg.menu_group_name,
    CASE 
        WHEN lv.lookup_key = smg.menu_group_key THEN '✅ MATCH'
        ELSE '❌ DIFERENTES'
    END as comparacion
FROM public.screens s
LEFT JOIN public.lookup_values lv ON lv.id = s.module_id
LEFT JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
ORDER BY smg.sort_order, s.sort_order;

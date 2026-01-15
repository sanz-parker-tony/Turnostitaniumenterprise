-- ========================================
-- INVESTIGAR QUÉ ES module_id EN LOOKUP_VALUES
-- ========================================

-- Ver qué lookup_values se usan como module_id
SELECT 
    lv.id,
    lv.lookup_type_id,
    lt.lookup_type_code,
    lt.lookup_type_name,
    lv.lookup_code,
    lv.lookup_value,
    lv.sort_order,
    COUNT(s.id) as cantidad_pantallas
FROM public.lookup_values lv
INNER JOIN public.lookup_types lt ON lt.id = lv.lookup_type_id
INNER JOIN public.screens s ON s.module_id = lv.id
GROUP BY lv.id, lv.lookup_type_id, lt.lookup_type_code, lt.lookup_type_name, 
         lv.lookup_code, lv.lookup_value, lv.sort_order
ORDER BY lv.sort_order;

-- Ver TODAS las pantallas con sus dos referencias
SELECT 
    s.screen_key,
    s.screen_name,
    -- module_id (lookup_values)
    lv.lookup_code as module_lookup_code,
    lv.lookup_value as module_lookup_value,
    -- menu_group_id (system_menu_groups)
    smg.menu_group_key,
    smg.menu_group_name,
    s.sort_order
FROM public.screens s
LEFT JOIN public.lookup_values lv ON lv.id = s.module_id
LEFT JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
ORDER BY smg.sort_order, s.sort_order;

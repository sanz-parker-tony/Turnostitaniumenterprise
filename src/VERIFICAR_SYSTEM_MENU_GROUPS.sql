-- Ver los datos de system_menu_groups
SELECT 
    id,
    menu_group_key,
    menu_group_name,
    icon_key,
    sort_order,
    is_active
FROM public.system_menu_groups
ORDER BY sort_order;

-- Ver cómo se relacionan las pantallas con los grupos de menú
SELECT 
    smg.menu_group_key,
    smg.menu_group_name,
    COUNT(s.id) as cantidad_pantallas,
    STRING_AGG(s.screen_key, ', ' ORDER BY s.sort_order) as pantallas
FROM public.system_menu_groups smg
LEFT JOIN public.screens s ON s.menu_group_id = smg.id
GROUP BY smg.menu_group_key, smg.menu_group_name, smg.sort_order
ORDER BY smg.sort_order;
-- ========================================
-- LIMPIAR GRUPOS DE MENÚ DUPLICADOS/VACÍOS
-- ========================================

-- Ver grupos vacíos antes de eliminar
SELECT 
    id,
    menu_group_key,
    menu_group_name,
    sort_order,
    'VACÍO - A ELIMINAR' as estado
FROM public.system_menu_groups
WHERE id NOT IN (
    SELECT DISTINCT menu_group_id 
    FROM public.screens 
    WHERE menu_group_id IS NOT NULL
)
ORDER BY sort_order;

-- Eliminar grupos de menú que no tienen pantallas asignadas
DELETE FROM public.system_menu_groups
WHERE id NOT IN (
    SELECT DISTINCT menu_group_id 
    FROM public.screens 
    WHERE menu_group_id IS NOT NULL
);

-- Verificar grupos que quedaron (deben ser 9)
SELECT 
    id,
    menu_group_key,
    menu_group_name,
    sort_order,
    is_active,
    (SELECT COUNT(*) FROM screens WHERE menu_group_id = system_menu_groups.id) as pantallas
FROM public.system_menu_groups
ORDER BY sort_order;

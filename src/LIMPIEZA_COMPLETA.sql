-- ========================================
-- LIMPIEZA COMPLETA: ELIMINAR GRUPOS VACÍOS + UNIFICAR DASHBOARD
-- ========================================

-- PASO 1: Unificar DASHBOARD → DASH
UPDATE public.system_menu_groups
SET menu_group_key = 'DASH'
WHERE menu_group_key = 'DASHBOARD';

-- PASO 2: Eliminar grupos vacíos (8 grupos sin pantallas)
DELETE FROM public.system_menu_groups
WHERE id NOT IN (
    SELECT DISTINCT menu_group_id 
    FROM public.screens 
    WHERE menu_group_id IS NOT NULL
);

-- PASO 3: Verificar que quedaron solo 9 grupos activos
SELECT 
    smg.id,
    smg.menu_group_key,
    smg.menu_group_name,
    smg.icon_key,
    smg.sort_order,
    COUNT(s.id) as pantallas,
    -- Verificar match con lookup_values
    (
        SELECT lv.lookup_key 
        FROM lookup_values lv 
        WHERE lv.id = (SELECT module_id FROM screens WHERE menu_group_id = smg.id LIMIT 1)
    ) as module_lookup_key,
    CASE 
        WHEN smg.menu_group_key = (
            SELECT lv.lookup_key 
            FROM lookup_values lv 
            WHERE lv.id = (SELECT module_id FROM screens WHERE menu_group_id = smg.id LIMIT 1)
        ) THEN '✅ MATCH'
        ELSE '❌ DIFERENTES'
    END as estado
FROM public.system_menu_groups smg
LEFT JOIN public.screens s ON s.menu_group_id = smg.id
GROUP BY smg.id, smg.menu_group_key, smg.menu_group_name, smg.icon_key, smg.sort_order
ORDER BY smg.sort_order;

-- ========================================
-- VERIFICAR SI LA COLUMNA module_id SE USA
-- ========================================

-- Ver si hay alguna pantalla con module_id NO NULL
SELECT 
    COUNT(*) as total_pantallas,
    COUNT(module_id) as pantallas_con_module_id,
    COUNT(menu_group_id) as pantallas_con_menu_group_id
FROM public.screens;

-- Ver constraints y foreign keys relacionados con module_id
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'screens'
  AND kcu.column_name IN ('module_id', 'menu_group_id')
ORDER BY tc.constraint_type, kcu.column_name;

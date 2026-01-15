-- Ver estructura de system_menu_groups
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'system_menu_groups'
ORDER BY ordinal_position;

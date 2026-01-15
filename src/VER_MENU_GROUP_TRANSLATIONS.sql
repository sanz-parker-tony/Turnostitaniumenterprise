-- Ver estructura de system_menu_group_translations
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'system_menu_group_translations'
ORDER BY ordinal_position;

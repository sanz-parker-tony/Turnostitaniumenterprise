-- Ver estructura de SCREEN_TRANSLATIONS
SELECT 
  'screen_translations' AS tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'screen_translations'
ORDER BY ordinal_position;

-- Ver estructura de SYSTEM_MENU_GROUP_TRANSLATIONS
SELECT 
  'system_menu_group_translations' AS tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'system_menu_group_translations'
ORDER BY ordinal_position;

-- Ver estructura de SCREENS
SELECT 
  'screens' AS tabla,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'screens'
ORDER BY ordinal_position;

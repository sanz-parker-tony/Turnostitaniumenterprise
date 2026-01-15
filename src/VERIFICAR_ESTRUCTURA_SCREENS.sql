-- Verificar la estructura completa de la tabla screens
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'screens'
ORDER BY ordinal_position;

-- Ver un ejemplo de datos de screens
SELECT 
    id,
    screen_key,
    screen_name,
    module_id,
    route_path,
    is_active
FROM public.screens
LIMIT 5;
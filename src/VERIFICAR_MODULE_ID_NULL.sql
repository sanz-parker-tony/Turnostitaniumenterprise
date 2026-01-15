-- Ver module_id de todas las pantallas
SELECT 
    screen_key,
    screen_name,
    module_id,
    CASE 
        WHEN module_id IS NULL THEN 'NULL ❌'
        ELSE 'Tiene valor ✅'
    END as tiene_module_id
FROM public.screens
ORDER BY screen_key
LIMIT 10;

-- Contar cuántas pantallas tienen module_id NULL
SELECT 
    COUNT(*) as total_screens,
    COUNT(module_id) as screens_con_module_id,
    COUNT(*) - COUNT(module_id) as screens_sin_module_id
FROM public.screens;

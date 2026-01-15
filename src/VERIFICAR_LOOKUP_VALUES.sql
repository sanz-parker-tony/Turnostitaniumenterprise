-- ========================================
-- VERIFICAR ESTRUCTURA DE lookup_values
-- ========================================

-- Ver la estructura de lookup_values
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'lookup_values'
ORDER BY ordinal_position;

-- Ver algunos registros de lookup_values
SELECT *
FROM public.lookup_values
LIMIT 20;

-- Ver qué IDs de lookup_values se usan como module_id
SELECT DISTINCT 
    s.module_id,
    COUNT(s.id) as cantidad_pantallas
FROM public.screens s
WHERE s.module_id IS NOT NULL
GROUP BY s.module_id
ORDER BY s.module_id;

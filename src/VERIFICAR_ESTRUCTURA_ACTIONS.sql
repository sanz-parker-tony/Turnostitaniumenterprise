-- Verificar estructura de la tabla actions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'actions'
ORDER BY ordinal_position;

-- Ver si ya existen acciones
SELECT 
  action_code,
  action_name,
  description
FROM public.actions
ORDER BY action_code
LIMIT 20;

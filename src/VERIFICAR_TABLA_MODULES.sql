-- Ver estructura de la tabla modules
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'modules'
ORDER BY ordinal_position;

-- Ver todos los módulos
SELECT 
  id,
  module_key,
  module_name,
  sort_order
FROM public.modules
ORDER BY sort_order;

-- Ver acciones existentes
SELECT 
  action_key,
  action_name,
  is_active,
  created_at
FROM public.actions
ORDER BY action_key;

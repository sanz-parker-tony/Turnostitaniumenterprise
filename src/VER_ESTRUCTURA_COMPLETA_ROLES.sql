-- Ver la estructura completa de la tabla roles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'roles'
ORDER BY ordinal_position;

-- Ver los constraints de la tabla roles
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'roles'
ORDER BY tc.constraint_type, kcu.column_name;

-- Ver si ya existe el rol SUPER_ADMIN
SELECT * FROM public.roles WHERE role_key = 'SUPER_ADMIN';

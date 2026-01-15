-- Ver todas las tablas relacionadas con scope
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%scope%'
ORDER BY table_name;

-- Ver estructura de scope_types
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'scope_types'
ORDER BY ordinal_position;

-- Ver datos en scope_types
SELECT * FROM public.scope_types ORDER BY id;

-- Ver estructura de user_role_scopes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_role_scopes'
ORDER BY ordinal_position;

-- Ver constraints de user_role_scopes
SELECT 
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'user_role_scopes'
ORDER BY con.contype, con.conname;

-- Ver si hay datos en user_role_scopes
SELECT COUNT(*) as total FROM public.user_role_scopes;

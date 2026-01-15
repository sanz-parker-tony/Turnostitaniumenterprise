-- Verificar si la tabla scopes existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%scope%'
ORDER BY table_name;

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

-- Ver datos actuales en user_role_scopes
SELECT * FROM public.user_role_scopes LIMIT 5;

-- Ver estructura completa de role_screen_actions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'role_screen_actions'
ORDER BY ordinal_position;

-- Ver constraints
SELECT 
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'role_screen_actions'
ORDER BY con.contype, con.conname;

-- Ver si screen_actions tiene tenant_id
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'screen_actions'
  AND column_name IN ('id', 'tenant_id', 'screen_id', 'action_id')
ORDER BY ordinal_position;

-- Verificar si la tabla modules existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'modules'
) as tabla_modules_existe;

-- Ver todas las tablas que empiezan con 'mod'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'mod%'
ORDER BY table_name;

-- Ver todas las tablas públicas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

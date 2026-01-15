-- ============================================
-- 🔍 VERIFICAR USUARIO EN SUPABASE
-- ============================================
-- Ejecuta estos queries en Supabase SQL Editor

-- 1️⃣ Ver usuarios en auth.users
SELECT 
  id as auth_user_id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'victorsan@hotmail.com';

-- 2️⃣ Ver usuarios en public.users
SELECT 
  user_id,
  username,
  display_name,
  email,
  is_active,
  created_at
FROM public.users
WHERE email = 'victorsan@hotmail.com';

-- 3️⃣ Verificar si los IDs coinciden (CRÍTICO)
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  pu.user_id as public_user_id,
  pu.email as public_email,
  CASE 
    WHEN au.id::text = pu.user_id THEN '✅ IDs COINCIDEN'
    ELSE '❌ IDs NO COINCIDEN - ESTO ES EL PROBLEMA'
  END as estado
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.id::text = pu.user_id
WHERE au.email = 'victorsan@hotmail.com' 
   OR pu.email = 'victorsan@hotmail.com';

-- 4️⃣ Si los IDs NO coinciden, actualizar public.users
-- IMPORTANTE: Primero ejecuta el query 3️⃣ para obtener el auth_id correcto

/*
UPDATE public.users
SET user_id = 'PEGA-AQUI-EL-AUTH-ID-DEL-QUERY-3'
WHERE email = 'victorsan@hotmail.com';
*/

-- 5️⃣ Probar la función RPC manualmente
SELECT * FROM get_current_user_profile();

-- 6️⃣ Si la función no existe, créala
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
  user_id TEXT,
  username TEXT,
  display_name TEXT,
  email TEXT,
  is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Obtener el user_id de la sesión actual
  RETURN QUERY
  SELECT 
    u.user_id,
    u.username,
    u.display_name,
    u.email,
    u.is_active
  FROM public.users u
  WHERE u.user_id = auth.uid()::text
    AND u.is_active = true;
END;
$$;

-- ============================================
-- 📝 INSTRUCCIONES
-- ============================================

/*
1. Ejecuta los queries 1, 2 y 3 para ver si los IDs coinciden
2. Si NO coinciden:
   - Copia el auth_id del query 3
   - Descomenta el query 4 (UPDATE)
   - Reemplaza 'PEGA-AQUI-EL-AUTH-ID-DEL-QUERY-3' con el ID real
   - Ejecuta el UPDATE
   
3. Si la función get_current_user_profile no existe:
   - Ejecuta el query 6 para crearla
   
4. Ejecuta el query 5 para probar la función
   - Deberías ver tus datos de usuario
   
5. Si todo funciona, intenta login de nuevo
*/

-- ============================================================================
-- 👑 CONVERTIR EN SUPER ADMIN (GOD)
-- ============================================================================
-- Ejecuta este script solo si NO eres Super Admin todavía
-- ============================================================================

-- PASO 1: Verificar tu email actual
SELECT '👤 TU USUARIO:' as info;
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- PASO 2: Convertir tu usuario en Super Admin
-- ⚠️ REEMPLAZA 'tu_email@ejemplo.com' con tu email real
UPDATE profiles 
SET tenant_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'tu_email@ejemplo.com'  -- ⚠️ CAMBIAR ESTO
);

-- PASO 3: Verificar que funcionó
SELECT '✅ VERIFICACIÓN:' as resultado;
SELECT 
  u.email,
  p.tenant_id,
  CASE 
    WHEN p.tenant_id = '00000000-0000-0000-0000-000000000000' 
    THEN '✅ AHORA ERES SUPER ADMIN'
    ELSE '❌ AÚN NO ERES SUPER ADMIN'
  END as status
FROM auth.users u
JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'tu_email@ejemplo.com';  -- ⚠️ CAMBIAR ESTO

-- ============================================================================
-- ⚠️ IMPORTANTE:
-- ============================================================================
-- Después de ejecutar esto:
-- 1. Cierra sesión en la aplicación
-- 2. Vuelve a iniciar sesión
-- 3. Ahora deberías poder acceder a SEC_SYSTEM_ADMIN
-- ============================================================================

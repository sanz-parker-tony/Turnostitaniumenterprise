-- 🔍 SCRIPT DE DIAGNÓSTICO COMPLETO
-- Copia y pega esto en SQL Editor para ver el estado actual

-- ============================================================================
-- 1. USUARIOS EN AUTH.USERS
-- ============================================================================
SELECT 
  '🔐 AUTH.USERS' as "Tabla",
  id,
  email,
  email_confirmed_at as "Confirmado",
  created_at as "Creado",
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '❌ Sin confirmar'
  END as "Estado"
FROM auth.users
WHERE email LIKE '%system.admin%'
ORDER BY created_at DESC;

-- ============================================================================
-- 2. USUARIOS EN PUBLIC.USERS
-- ============================================================================
SELECT 
  '👤 PUBLIC.USERS' as "Tabla",
  id,
  email,
  username,
  auth_user_id,
  display_name,
  is_active,
  created_at as "Creado",
  CASE 
    WHEN auth_user_id IS NULL THEN '❌ Sin vincular a auth'
    WHEN is_active THEN '✅ Activo'
    ELSE '⚠️ Inactivo'
  END as "Estado"
FROM public.users
WHERE email LIKE '%system.admin%'
ORDER BY created_at DESC;

-- ============================================================================
-- 3. TOTAL DE USUARIOS EN CADA TABLA
-- ============================================================================
SELECT 
  (SELECT COUNT(*) FROM auth.users) as "Total auth.users",
  (SELECT COUNT(*) FROM public.users) as "Total public.users",
  (SELECT COUNT(*) 
   FROM auth.users au 
   LEFT JOIN public.users pu ON au.id = pu.auth_user_id 
   WHERE pu.id IS NULL) as "Auth sin vincular",
  (SELECT COUNT(*) 
   FROM public.users pu 
   WHERE pu.auth_user_id IS NULL) as "Public sin auth_user_id";

-- ============================================================================
-- 4. USUARIOS HUÉRFANOS (en auth pero NO en public)
-- ============================================================================
SELECT 
  '⚠️ USUARIOS HUÉRFANOS (en auth pero NO en public)' as "Diagnóstico",
  au.id as "auth_user_id",
  au.email,
  au.created_at,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '❌ Sin confirmar'
  END as "Estado"
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.auth_user_id
WHERE pu.id IS NULL;

-- ============================================================================
-- 5. ROLES ASIGNADOS A SYSTEM.ADMIN (si existe en public.users)
-- ============================================================================
SELECT 
  '🔑 ROLES DE SYSTEM.ADMIN' as "Info",
  u.email,
  u.username,
  r.role_key,
  r.role_name,
  ur.is_active,
  ur.created_at
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
WHERE u.email LIKE '%system.admin%'
ORDER BY ur.created_at DESC;

-- ============================================================================
-- 6. VERIFICAR TENANT SYSTEM
-- ============================================================================
SELECT 
  '🏢 TENANT SYSTEM' as "Info",
  id,
  tenant_key,
  tenant_name,
  is_active,
  created_at
FROM public.tenants
WHERE tenant_key = 'SYSTEM';

-- ============================================================================
-- 7. VERIFICAR ROL SYSTEM_ADMIN
-- ============================================================================
SELECT 
  '👑 ROL SYSTEM_ADMIN' as "Info",
  r.id,
  r.role_key,
  r.role_name,
  r.is_active,
  t.tenant_key as "Tenant"
FROM public.roles r
JOIN public.tenants t ON r.tenant_id = t.id
WHERE r.role_key = 'SYSTEM_ADMIN'
  AND t.tenant_key = 'SYSTEM';

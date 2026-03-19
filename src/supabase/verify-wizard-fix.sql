-- ============================================================================
-- verify-wizard-fix.sql
-- Script de Verificación Pre-Reset
-- ============================================================================
-- Ejecutar este script ANTES de hacer factory reset para confirmar
-- el estado actual de la base de datos
-- ============================================================================

DO $$
DECLARE
  v_tenant_count INT;
  v_system_tenant_id UUID;
  v_user_count INT;
  v_onboarding_count INT;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VERIFICACIÓN PRE-RESET: Estado Actual de la Base de Datos';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';

  -- ========================================================================
  -- 1. VERIFICAR TENANTS
  -- ========================================================================
  SELECT COUNT(*) INTO v_tenant_count FROM public.tenants;
  
  RAISE NOTICE '📊 TENANTS:';
  RAISE NOTICE '  Total de tenants: %', v_tenant_count;
  
  IF v_tenant_count > 1 THEN
    RAISE NOTICE '  ⚠️  PROBLEMA CONFIRMADO: Hay % tenants (esperado: 1)', v_tenant_count;
    RAISE NOTICE '';
    RAISE NOTICE '  📋 Lista de tenants:';
    
    FOR rec IN 
      SELECT tenant_key, tenant_name, created_at 
      FROM public.tenants 
      ORDER BY created_at
    LOOP
      IF rec.tenant_key = 'SYSTEM' THEN
        RAISE NOTICE '    ✅ % | % | % (CORRECTO)', 
          rec.tenant_key, rec.tenant_name, rec.created_at;
      ELSE
        RAISE NOTICE '    ❌ % | % | % (A ELIMINAR)', 
          rec.tenant_key, rec.tenant_name, rec.created_at;
      END IF;
    END LOOP;
  ELSE
    RAISE NOTICE '  ✅ OK: Solo hay 1 tenant';
  END IF;
  
  RAISE NOTICE '';

  -- ========================================================================
  -- 2. VERIFICAR TENANT SYSTEM
  -- ========================================================================
  SELECT id INTO v_system_tenant_id 
  FROM public.tenants 
  WHERE tenant_key = 'SYSTEM';
  
  IF v_system_tenant_id IS NULL THEN
    RAISE NOTICE '❌ ERROR CRÍTICO: Tenant SYSTEM no existe';
    RAISE NOTICE '   Solución: Ejecutar 002_SEED_COMPLETE.sql';
  ELSE
    RAISE NOTICE '✅ Tenant SYSTEM encontrado: %', v_system_tenant_id;
  END IF;
  
  RAISE NOTICE '';

  -- ========================================================================
  -- 3. VERIFICAR USUARIOS
  -- ========================================================================
  SELECT COUNT(*) INTO v_user_count FROM public.users;
  
  RAISE NOTICE '👥 USUARIOS:';
  RAISE NOTICE '  Total de usuarios: %', v_user_count;
  RAISE NOTICE '';
  RAISE NOTICE '  📋 Lista de usuarios:';
  
  FOR rec IN 
    SELECT 
      u.username, 
      u.email, 
      u.is_active,
      t.tenant_key,
      u.created_at
    FROM public.users u
    JOIN public.tenants t ON u.tenant_id = t.id
    ORDER BY u.created_at
  LOOP
    IF rec.tenant_key = 'SYSTEM' THEN
      RAISE NOTICE '    ✅ % | % | Tenant: % | Activo: %', 
        rec.username, rec.email, rec.tenant_key, rec.is_active;
    ELSE
      RAISE NOTICE '    ⚠️  % | % | Tenant: % (NO-SYSTEM) | Activo: %', 
        rec.username, rec.email, rec.tenant_key, rec.is_active;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';

  -- ========================================================================
  -- 4. VERIFICAR ONBOARDING
  -- ========================================================================
  SELECT COUNT(*) INTO v_onboarding_count FROM public.tenant_onboarding;
  
  RAISE NOTICE '🔄 TENANT ONBOARDING:';
  RAISE NOTICE '  Total de registros: %', v_onboarding_count;
  RAISE NOTICE '';
  
  IF v_onboarding_count > 0 THEN
    RAISE NOTICE '  📋 Estado del onboarding:';
    
    FOR rec IN 
      SELECT 
        t.tenant_key,
        o.onboarding_status,
        o.current_step,
        o.completion_percentage,
        o.started_at,
        o.completed_at
      FROM public.tenant_onboarding o
      JOIN public.tenants t ON o.tenant_id = t.id
      ORDER BY o.started_at
    LOOP
      RAISE NOTICE '    Tenant: % | Status: % | Step: % | Progress: %%', 
        rec.tenant_key, rec.onboarding_status, rec.current_step, rec.completion_percentage;
    END LOOP;
  ELSE
    RAISE NOTICE '  ℹ️  No hay registros de onboarding';
  END IF;
  
  RAISE NOTICE '';

  -- ========================================================================
  -- 5. VERIFICAR ROLES
  -- ========================================================================
  RAISE NOTICE '🔐 ROLES BASE (5 esperados):';
  
  FOR rec IN 
    SELECT 
      r.role_key,
      r.role_name,
      r.role_scope,
      r.is_system_role,
      r.is_locked,
      t.tenant_key
    FROM public.roles r
    JOIN public.tenants t ON r.tenant_id = t.id
    WHERE r.is_system_role = true
    ORDER BY r.role_key
  LOOP
    RAISE NOTICE '  ✅ % | % | Scope: % | Locked: %', 
      rec.role_key, rec.role_name, rec.role_scope, rec.is_locked;
  END LOOP;
  
  RAISE NOTICE '';

  -- ========================================================================
  -- 6. VERIFICAR ASIGNACIONES DE ROLES
  -- ========================================================================
  RAISE NOTICE '👤 ASIGNACIONES DE ROLES:';
  
  FOR rec IN 
    SELECT 
      u.username,
      u.email,
      r.role_key,
      r.role_name,
      ur.is_active
    FROM public.user_roles ur
    JOIN public.users u ON ur.user_id = u.id
    JOIN public.roles r ON ur.role_id = r.id
    WHERE u.email IN ('system.admin@titanium-labs.com', 'tenant.admin@example.com')
       OR r.role_key IN ('SYSTEM_ADMIN', 'TENANT_ADMIN')
    ORDER BY u.username
  LOOP
    RAISE NOTICE '  ✅ % | % → %', 
      rec.username, rec.email, rec.role_key;
  END LOOP;
  
  RAISE NOTICE '';

  -- ========================================================================
  -- 7. RESUMEN Y RECOMENDACIONES
  -- ========================================================================
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'RESUMEN Y RECOMENDACIONES:';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  
  IF v_tenant_count = 1 THEN
    RAISE NOTICE '✅ Base de datos OK: Solo 1 tenant (SYSTEM)';
    RAISE NOTICE '   → Puede continuar sin factory reset si lo desea';
    RAISE NOTICE '   → O ejecutar factory reset + seed para empezar limpio';
  ELSE
    RAISE NOTICE '⚠️  Base de datos con tenants duplicados';
    RAISE NOTICE '   → RECOMENDACIÓN: Ejecutar factory reset + seed';
    RAISE NOTICE '   → Comando: ./supabase/reset-and-seed.ps1 (Windows)';
    RAISE NOTICE '   → Comando: ./supabase/reset-and-seed.sh (Linux/Mac)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Siguiente paso:';
  RAISE NOTICE '   1. Ejecutar 001_FACTORY_RESET.sql';
  RAISE NOTICE '   2. Ejecutar 002_SEED_COMPLETE.sql';
  RAISE NOTICE '   3. Login con system.admin@titanium-labs.com / Titanium2026!';
  RAISE NOTICE '   4. Cambiar contraseña';
  RAISE NOTICE '   5. Completar wizard de configuración (2 pasos)';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  
END $$;

-- ============================================================================
-- QUERIES ADICIONALES PARA ANÁLISIS MANUAL
-- ============================================================================

-- Query 1: Ver todos los tenants
\echo ''
\echo '========================================='
\echo 'QUERY 1: Todos los tenants'
\echo '========================================='
SELECT 
  id,
  tenant_key,
  tenant_name,
  is_active,
  created_at
FROM public.tenants
ORDER BY created_at;

-- Query 2: Ver todos los usuarios con su tenant
\echo ''
\echo '========================================='
\echo 'QUERY 2: Todos los usuarios'
\echo '========================================='
SELECT 
  u.username,
  u.email,
  u.is_active,
  t.tenant_key,
  u.created_at
FROM public.users u
JOIN public.tenants t ON u.tenant_id = t.id
ORDER BY u.created_at;

-- Query 3: Ver estado del onboarding
\echo ''
\echo '========================================='
\echo 'QUERY 3: Estado del onboarding'
\echo '========================================='
SELECT 
  t.tenant_key,
  t.tenant_name,
  o.onboarding_status,
  o.current_step,
  o.completion_percentage,
  o.started_at,
  o.completed_at
FROM public.tenant_onboarding o
JOIN public.tenants t ON o.tenant_id = t.id
ORDER BY o.started_at;

-- Query 4: Ver roles y asignaciones
\echo ''
\echo '========================================='
\echo 'QUERY 4: Roles y asignaciones'
\echo '========================================='
SELECT 
  u.username,
  u.email,
  r.role_key,
  r.role_name,
  r.role_scope,
  ur.is_active as assignment_active
FROM public.user_roles ur
JOIN public.users u ON ur.user_id = u.id
JOIN public.roles r ON ur.role_id = r.id
ORDER BY u.username, r.role_key;

\echo ''
\echo '✅ Verificación completa.'
\echo ''

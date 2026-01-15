-- ============================================
-- KIOSK - FASE 1: ROLES Y PERMISOS
-- ============================================
-- Fecha: 2026-01-11
-- Descripción: 
--   1. Crear roles: SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR, EMPLOYEE
--   2. Asignar permisos por rol
--   3. RRHH_ADMIN y SUPERVISOR: mismas pantallas, diferencia SOLO en SCOPE
-- ============================================

-- ============================================
-- A. CREAR ROLES (TENANT-AGNOSTIC)
-- ============================================
-- Nota: Los roles se crean a nivel tenant mediante el wizard o manualmente.
-- Este script solo define la estructura. 
-- En producción, cada tenant tendrá sus propios registros en la tabla roles.

-- Para este script, asumimos que ya existe un tenant de prueba.
-- Si no existe, crear uno primero o ejecutar este script después del wizard.

DO $$
DECLARE
  v_tenant_id uuid;
  v_super_admin_role_id uuid;
  v_system_admin_role_id uuid;
  v_rrhh_admin_role_id uuid;
  v_supervisor_role_id uuid;
  v_employee_role_id uuid;
BEGIN
  -- Obtener tenant_id (ajustar según tu tenant)
  SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No hay tenants en el sistema. Ejecutar este script después de crear un tenant.';
    RETURN;
  END IF;

  RAISE NOTICE 'Usando tenant_id: %', v_tenant_id;

  -- ============================================
  -- B. CREAR ROLES
  -- ============================================

  -- SUPER_ADMIN (ya debería existir, pero verificamos)
  SELECT id INTO v_super_admin_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_id AND role_key = 'SUPER_ADMIN';

  IF v_super_admin_role_id IS NULL THEN
    INSERT INTO public.roles (tenant_id, role_key, role_name, role_scope, is_active, created_by)
    VALUES (v_tenant_id, 'SUPER_ADMIN', 'Super Administrador', 'TENANT', true, 'SYSTEM')
    RETURNING id INTO v_super_admin_role_id;
    RAISE NOTICE 'SUPER_ADMIN creado: %', v_super_admin_role_id;
  ELSE
    RAISE NOTICE 'SUPER_ADMIN ya existe: %', v_super_admin_role_id;
  END IF;

  -- SYSTEM_ADMIN
  SELECT id INTO v_system_admin_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_id AND role_key = 'SYSTEM_ADMIN';

  IF v_system_admin_role_id IS NULL THEN
    INSERT INTO public.roles (tenant_id, role_key, role_name, role_scope, is_active, created_by)
    VALUES (v_tenant_id, 'SYSTEM_ADMIN', 'Administrador del Sistema', 'TENANT', true, 'SYSTEM')
    RETURNING id INTO v_system_admin_role_id;
    RAISE NOTICE 'SYSTEM_ADMIN creado: %', v_system_admin_role_id;
  ELSE
    RAISE NOTICE 'SYSTEM_ADMIN ya existe: %', v_system_admin_role_id;
  END IF;

  -- RRHH_ADMIN
  SELECT id INTO v_rrhh_admin_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_id AND role_key = 'RRHH_ADMIN';

  IF v_rrhh_admin_role_id IS NULL THEN
    INSERT INTO public.roles (tenant_id, role_key, role_name, role_scope, is_active, created_by)
    VALUES (v_tenant_id, 'RRHH_ADMIN', 'Administrador de RRHH', 'TENANT', true, 'SYSTEM')
    RETURNING id INTO v_rrhh_admin_role_id;
    RAISE NOTICE 'RRHH_ADMIN creado: %', v_rrhh_admin_role_id;
  ELSE
    RAISE NOTICE 'RRHH_ADMIN ya existe: %', v_rrhh_admin_role_id;
  END IF;

  -- SUPERVISOR
  SELECT id INTO v_supervisor_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_id AND role_key = 'SUPERVISOR';

  IF v_supervisor_role_id IS NULL THEN
    INSERT INTO public.roles (tenant_id, role_key, role_name, role_scope, is_active, created_by)
    VALUES (v_tenant_id, 'SUPERVISOR', 'Supervisor', 'TENANT', true, 'SYSTEM')
    RETURNING id INTO v_supervisor_role_id;
    RAISE NOTICE 'SUPERVISOR creado: %', v_supervisor_role_id;
  ELSE
    RAISE NOTICE 'SUPERVISOR ya existe: %', v_supervisor_role_id;
  END IF;

  -- EMPLOYEE
  SELECT id INTO v_employee_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_id AND role_key = 'EMPLOYEE';

  IF v_employee_role_id IS NULL THEN
    INSERT INTO public.roles (tenant_id, role_key, role_name, role_scope, is_active, created_by)
    VALUES (v_tenant_id, 'EMPLOYEE', 'Empleado', 'TENANT', true, 'SYSTEM')
    RETURNING id INTO v_employee_role_id;
    RAISE NOTICE 'EMPLOYEE creado: %', v_employee_role_id;
  ELSE
    RAISE NOTICE 'EMPLOYEE ya existe: %', v_employee_role_id;
  END IF;

  -- ============================================
  -- C. ASIGNAR PERMISOS: SUPER_ADMIN (ACCESO TOTAL)
  -- ============================================

  -- SUPER_ADMIN tiene acceso a TODOS los screens con TODAS las acciones
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_active, created_by)
  SELECT 
    v_tenant_id,
    v_super_admin_role_id,
    sa.id,
    true,
    'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON s.id = sa.screen_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.role_screen_actions rsa
    WHERE rsa.role_id = v_super_admin_role_id AND rsa.screen_action_id = sa.id
  );

  RAISE NOTICE 'Permisos SUPER_ADMIN asignados';

  -- ============================================
  -- D. ASIGNAR PERMISOS: SYSTEM_ADMIN
  -- ============================================

  -- SYSTEM_ADMIN: DASHBOARD + MAINT + CONF + ORG + EMPL + ATT + RPT (parámetros)
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_active, created_by)
  SELECT 
    v_tenant_id,
    v_system_admin_role_id,
    sa.id,
    true,
    'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON s.id = sa.screen_id
  JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
  WHERE smg.menu_group_key IN ('DASHBOARD', 'MAINT', 'CONF', 'ORG', 'EMPL', 'ATT')
    OR (smg.menu_group_key = 'RPT' AND s.screen_key IN ('RPT_PARAMETERS', 'RPT_CATALOG'))
  AND NOT EXISTS (
    SELECT 1 FROM public.role_screen_actions rsa
    WHERE rsa.role_id = v_system_admin_role_id AND rsa.screen_action_id = sa.id
  );

  RAISE NOTICE 'Permisos SYSTEM_ADMIN asignados';

  -- ============================================
  -- E. ASIGNAR PERMISOS: RRHH_ADMIN (scope TOTAL)
  -- ============================================

  -- RRHH_ADMIN: DASHBOARD + EMPL (solicitudes) + ATT + RPT
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_active, created_by)
  SELECT 
    v_tenant_id,
    v_rrhh_admin_role_id,
    sa.id,
    true,
    'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON s.id = sa.screen_id
  JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
  WHERE smg.menu_group_key IN ('DASHBOARD', 'ATT', 'RPT')
    OR (smg.menu_group_key = 'EMPL' AND s.screen_key = 'EMPL_ABSENCE_REQUESTS')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_screen_actions rsa
    WHERE rsa.role_id = v_rrhh_admin_role_id AND rsa.screen_action_id = sa.id
  );

  RAISE NOTICE 'Permisos RRHH_ADMIN asignados';

  -- ============================================
  -- F. ASIGNAR PERMISOS: SUPERVISOR (MISMOS QUE RRHH_ADMIN)
  -- ============================================

  -- SUPERVISOR: MISMOS screens que RRHH_ADMIN, diferencia SOLO en SCOPE
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_active, created_by)
  SELECT 
    v_tenant_id,
    v_supervisor_role_id,
    sa.id,
    true,
    'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON s.id = sa.screen_id
  JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
  WHERE smg.menu_group_key IN ('DASHBOARD', 'ATT', 'RPT')
    OR (smg.menu_group_key = 'EMPL' AND s.screen_key = 'EMPL_ABSENCE_REQUESTS')
  AND NOT EXISTS (
    SELECT 1 FROM public.role_screen_actions rsa
    WHERE rsa.role_id = v_supervisor_role_id AND rsa.screen_action_id = sa.id
  );

  RAISE NOTICE 'Permisos SUPERVISOR asignados (mismos que RRHH_ADMIN)';

  -- ============================================
  -- G. ASIGNAR PERMISOS: EMPLOYEE (SOLO KIOSK)
  -- ============================================

  -- EMPLOYEE: SOLO screens KIOSK
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_active, created_by)
  SELECT 
    v_tenant_id,
    v_employee_role_id,
    sa.id,
    true,
    'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON s.id = sa.screen_id
  JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
  WHERE smg.menu_group_key = 'KIOSK'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_screen_actions rsa
    WHERE rsa.role_id = v_employee_role_id AND rsa.screen_action_id = sa.id
  );

  RAISE NOTICE 'Permisos EMPLOYEE asignados (solo KIOSK)';

END $$;

-- ============================================
-- H. VERIFICACIÓN
-- ============================================

SELECT 
  r.role_key,
  r.role_name,
  COUNT(DISTINCT rsa.screen_action_id) as permisos_asignados,
  COUNT(DISTINCT s.id) as screens_asignados,
  CASE 
    WHEN r.role_key = 'SUPER_ADMIN' AND COUNT(DISTINCT s.id) >= 40 THEN '✅'
    WHEN r.role_key = 'SYSTEM_ADMIN' AND COUNT(DISTINCT s.id) >= 30 THEN '✅'
    WHEN r.role_key = 'RRHH_ADMIN' AND COUNT(DISTINCT s.id) >= 10 THEN '✅'
    WHEN r.role_key = 'SUPERVISOR' AND COUNT(DISTINCT s.id) >= 10 THEN '✅'
    WHEN r.role_key = 'EMPLOYEE' AND COUNT(DISTINCT s.id) = 5 THEN '✅'
    ELSE '⚠️'
  END as estado
FROM public.roles r
LEFT JOIN public.role_screen_actions rsa ON rsa.role_id = r.id AND rsa.is_active = true
LEFT JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
LEFT JOIN public.screens s ON s.id = sa.screen_id
WHERE r.role_key IN ('SUPER_ADMIN', 'SYSTEM_ADMIN', 'RRHH_ADMIN', 'SUPERVISOR', 'EMPLOYEE')
GROUP BY r.role_key, r.role_name
ORDER BY r.role_key;

-- Mostrar detalle de EMPLOYEE (debe tener SOLO KIOSK)
SELECT 
  r.role_key,
  smg.menu_group_key,
  s.screen_key,
  s.screen_name,
  COUNT(sa.id) as acciones
FROM public.roles r
JOIN public.role_screen_actions rsa ON rsa.role_id = r.id AND rsa.is_active = true
JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
JOIN public.screens s ON s.id = sa.screen_id
JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
WHERE r.role_key = 'EMPLOYEE'
GROUP BY r.role_key, smg.menu_group_key, s.screen_key, s.screen_name
ORDER BY s.sort_order;

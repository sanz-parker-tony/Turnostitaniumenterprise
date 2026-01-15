-- ============================================================================
-- MÓDULO SYSTEM - Pantallas y Permisos
-- ============================================================================
-- Descripción: Crear pantallas del módulo de configuración del sistema
--              Acceso: SOLO SYSTEM_ADMIN
-- Fecha: 2026-01-12
-- ============================================================================

DO $$
DECLARE
  v_tenant_id uuid;
  v_module_system_id uuid;
  v_menu_group_system_id uuid;
  v_system_admin_role_id uuid;
  v_action_view_id uuid;
  v_action_create_id uuid;
  v_action_update_id uuid;
  v_action_delete_id uuid;
  v_screen_id uuid;
BEGIN

  -- ============================================
  -- 1. OBTENER TENANT ID (primer tenant)
  -- ============================================
  SELECT id INTO v_tenant_id
  FROM public.tenants
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró tenant';
  END IF;

  RAISE NOTICE 'Tenant ID: %', v_tenant_id;

  -- ============================================
  -- 2. CREAR MÓDULO SYSTEM (si no existe)
  -- ============================================
  
  -- Primero, obtener o crear el lookup_group para MODULE
  INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, is_active)
  VALUES ('MODULE', 'Módulos del Sistema', 'SYSTEM', true)
  ON CONFLICT (lookup_group_key, lookup_scope) DO NOTHING;

  -- Crear el módulo SYSTEM
  INSERT INTO public.lookup_values (
    lookup_group_id,
    lookup_key,
    lookup_value,
    lookup_scope,
    is_active,
    created_by
  )
  SELECT 
    lg.id,
    'SYSTEM',
    'Sistema',
    'SYSTEM',
    true,
    'SYSTEM'
  FROM public.lookup_groups lg
  WHERE lg.lookup_group_key = 'MODULE' AND lg.lookup_scope = 'SYSTEM'
  ON CONFLICT (lookup_group_id, lookup_key, lookup_scope) DO NOTHING
  RETURNING id INTO v_module_system_id;

  -- Si no se insertó (ya existía), obtener el ID
  IF v_module_system_id IS NULL THEN
    SELECT lv.id INTO v_module_system_id
    FROM public.lookup_values lv
    JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
    WHERE lg.lookup_group_key = 'MODULE' 
      AND lv.lookup_key = 'SYSTEM' 
      AND lv.lookup_scope = 'SYSTEM';
  END IF;

  RAISE NOTICE 'Módulo SYSTEM ID: %', v_module_system_id;

  -- ============================================
  -- 3. CREAR MENU GROUP SYSTEM
  -- ============================================
  
  INSERT INTO public.menu_groups (
    menu_group_key,
    menu_group_name,
    menu_group_icon,
    sort_order,
    is_active,
    created_by
  )
  VALUES (
    'SYSTEM',
    'Sistema',
    'Settings',
    10,
    true,
    'SYSTEM'
  )
  ON CONFLICT (menu_group_key) DO NOTHING
  RETURNING id INTO v_menu_group_system_id;

  IF v_menu_group_system_id IS NULL THEN
    SELECT id INTO v_menu_group_system_id
    FROM public.menu_groups
    WHERE menu_group_key = 'SYSTEM';
  END IF;

  RAISE NOTICE 'Menu Group SYSTEM ID: %', v_menu_group_system_id;

  -- ============================================
  -- 4. CREAR PANTALLAS DEL MÓDULO SYSTEM
  -- ============================================

  -- 4.1 Dashboard del Sistema
  INSERT INTO public.screens (
    screen_key, screen_name, menu_label, menu_group_id, module_id, 
    route_path, icon_key, sort_order, is_active, created_by
  )
  VALUES (
    'SYSTEM_DASHBOARD',
    'Configuración del Sistema',
    'Panel de Sistema',
    v_menu_group_system_id,
    v_module_system_id,
    '/dashboard/system',
    'Settings',
    1,
    true,
    'SYSTEM'
  )
  ON CONFLICT (screen_key) DO UPDATE
  SET route_path = EXCLUDED.route_path
  RETURNING id INTO v_screen_id;

  RAISE NOTICE '✅ Pantalla SYSTEM_DASHBOARD creada: %', v_screen_id;

  -- 4.2 Configuración de Tenant
  INSERT INTO public.screens (
    screen_key, screen_name, menu_label, menu_group_id, module_id, 
    route_path, icon_key, sort_order, is_active, created_by
  )
  VALUES (
    'SYSTEM_TENANT',
    'Configuración de Cliente',
    'Cliente',
    v_menu_group_system_id,
    v_module_system_id,
    '/dashboard/system/tenant',
    'Database',
    2,
    true,
    'SYSTEM'
  )
  ON CONFLICT (screen_key) DO UPDATE
  SET route_path = EXCLUDED.route_path;

  -- 4.3 Configuración de Empresa
  INSERT INTO public.screens (
    screen_key, screen_name, menu_label, menu_group_id, module_id, 
    route_path, icon_key, sort_order, is_active, created_by
  )
  VALUES (
    'SYSTEM_COMPANY',
    'Configuración de Empresa',
    'Empresa',
    v_menu_group_system_id,
    v_module_system_id,
    '/dashboard/system/company',
    'Building2',
    3,
    true,
    'SYSTEM'
  )
  ON CONFLICT (screen_key) DO UPDATE
  SET route_path = EXCLUDED.route_path;

  -- 4.4 Estructura Organizacional
  INSERT INTO public.screens (
    screen_key, screen_name, menu_label, menu_group_id, module_id, 
    route_path, icon_key, sort_order, is_active, created_by
  )
  VALUES (
    'SYSTEM_STRUCTURE',
    'Estructura Organizacional',
    'Estructura',
    v_menu_group_system_id,
    v_module_system_id,
    '/dashboard/system/structure',
    'Network',
    4,
    true,
    'SYSTEM'
  )
  ON CONFLICT (screen_key) DO UPDATE
  SET route_path = EXCLUDED.route_path;

  -- 4.5 Gestión de Empleados
  INSERT INTO public.screens (
    screen_key, screen_name, menu_label, menu_group_id, module_id, 
    route_path, icon_key, sort_order, is_active, created_by
  )
  VALUES (
    'SYSTEM_EMPLOYEES',
    'Gestión de Empleados',
    'Empleados',
    v_menu_group_system_id,
    v_module_system_id,
    '/dashboard/system/employees',
    'Users',
    5,
    true,
    'SYSTEM'
  )
  ON CONFLICT (screen_key) DO UPDATE
  SET route_path = EXCLUDED.route_path;

  -- 4.6 Turnos y Horarios
  INSERT INTO public.screens (
    screen_key, screen_name, menu_label, menu_group_id, module_id, 
    route_path, icon_key, sort_order, is_active, created_by
  )
  VALUES (
    'SYSTEM_SCHEDULES',
    'Turnos y Horarios',
    'Turnos',
    v_menu_group_system_id,
    v_module_system_id,
    '/dashboard/system/schedules',
    'Clock',
    6,
    true,
    'SYSTEM'
  )
  ON CONFLICT (screen_key) DO UPDATE
  SET route_path = EXCLUDED.route_path;

  -- 4.7 Reportes
  INSERT INTO public.screens (
    screen_key, screen_name, menu_label, menu_group_id, module_id, 
    route_path, icon_key, sort_order, is_active, created_by
  )
  VALUES (
    'SYSTEM_REPORTS',
    'Configuración de Reportes',
    'Reportes',
    v_menu_group_system_id,
    v_module_system_id,
    '/dashboard/system/reports',
    'FileText',
    7,
    true,
    'SYSTEM'
  )
  ON CONFLICT (screen_key) DO UPDATE
  SET route_path = EXCLUDED.route_path;

  -- 4.8 Configuración General
  INSERT INTO public.screens (
    screen_key, screen_name, menu_label, menu_group_id, module_id, 
    route_path, icon_key, sort_order, is_active, created_by
  )
  VALUES (
    'SYSTEM_SETTINGS',
    'Configuración General',
    'Configuración',
    v_menu_group_system_id,
    v_module_system_id,
    '/dashboard/system/settings',
    'Settings',
    8,
    true,
    'SYSTEM'
  )
  ON CONFLICT (screen_key) DO UPDATE
  SET route_path = EXCLUDED.route_path;

  RAISE NOTICE '✅ Todas las pantallas del módulo SYSTEM creadas';

  -- ============================================
  -- 5. CREAR SCREEN_ACTIONS PARA CADA PANTALLA
  -- ============================================

  -- Obtener IDs de las acciones
  SELECT id INTO v_action_view FROM public.actions WHERE action_key = 'VIEW';
  SELECT id INTO v_action_create FROM public.actions WHERE action_key = 'CREATE';
  SELECT id INTO v_action_update FROM public.actions WHERE action_key = 'UPDATE';
  SELECT id INTO v_action_delete FROM public.actions WHERE action_key = 'DELETE';

  -- Insertar screen_actions para todas las pantallas SYSTEM
  INSERT INTO public.screen_actions (screen_id, action_id, is_active, created_by)
  SELECT s.id, a.id, true, 'SYSTEM'
  FROM public.screens s
  CROSS JOIN public.actions a
  WHERE s.screen_key IN (
    'SYSTEM_DASHBOARD',
    'SYSTEM_TENANT',
    'SYSTEM_COMPANY',
    'SYSTEM_STRUCTURE',
    'SYSTEM_EMPLOYEES',
    'SYSTEM_SCHEDULES',
    'SYSTEM_REPORTS',
    'SYSTEM_SETTINGS'
  )
  AND a.action_key IN ('VIEW', 'CREATE', 'UPDATE', 'DELETE')
  ON CONFLICT (screen_id, action_id) DO NOTHING;

  RAISE NOTICE '✅ Screen actions creadas';

  -- ============================================
  -- 6. ASIGNAR PERMISOS A SYSTEM_ADMIN
  -- ============================================

  -- Obtener role_id de SYSTEM_ADMIN
  SELECT id INTO v_system_admin_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_id AND role_key = 'SYSTEM_ADMIN';

  IF v_system_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró rol SYSTEM_ADMIN';
  END IF;

  -- Asignar todos los permisos de SYSTEM a SYSTEM_ADMIN
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_active, created_by)
  SELECT 
    v_tenant_id,
    v_system_admin_role_id,
    sa.id,
    true,
    'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON s.id = sa.screen_id
  WHERE s.screen_key IN (
    'SYSTEM_DASHBOARD',
    'SYSTEM_TENANT',
    'SYSTEM_COMPANY',
    'SYSTEM_STRUCTURE',
    'SYSTEM_EMPLOYEES',
    'SYSTEM_SCHEDULES',
    'SYSTEM_REPORTS',
    'SYSTEM_SETTINGS'
  )
  ON CONFLICT (tenant_id, role_id, screen_action_id) DO NOTHING;

  RAISE NOTICE '✅ Permisos asignados a SYSTEM_ADMIN';

  -- ============================================
  -- 7. VERIFICACIÓN
  -- ============================================

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMEN:';
  RAISE NOTICE '========================================';

  -- Contar pantallas creadas
  SELECT COUNT(*) INTO v_screen_id
  FROM public.screens
  WHERE screen_key LIKE 'SYSTEM_%';

  RAISE NOTICE 'Pantallas SYSTEM creadas: %', v_screen_id;

  -- Contar permisos asignados
  SELECT COUNT(*) INTO v_screen_id
  FROM public.role_screen_actions rsa
  JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
  JOIN public.screens s ON s.id = sa.screen_id
  WHERE rsa.role_id = v_system_admin_role_id
    AND s.screen_key LIKE 'SYSTEM_%';

  RAISE NOTICE 'Permisos SYSTEM asignados a SYSTEM_ADMIN: %', v_screen_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Módulo SYSTEM configurado correctamente';

END $$;

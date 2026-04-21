-- ============================================================================
-- Migration: 004_ADD_MAINTENANCE_SCREENS
-- Descripción: Agrega pantallas "Gestión de Parámetros" y "Novedades" al menú de Mantenimiento
-- Fecha: 2026-04-11
-- Autor: Turnos Titanium Enterprise
-- ============================================================================

-- Verificar que estamos en el schema correcto
SET search_path TO public;

-- ============================================================================
-- FASE 1: Agregar pantalla PARAMETERS_MANAGEMENT
-- ============================================================================

DO $$
DECLARE
  v_menu_maint UUID;
  v_screen_exists INT;
BEGIN
  -- Obtener el ID del grupo de menú MAINT (Mantenimiento)
  SELECT id INTO v_menu_maint 
  FROM public.menu_groups 
  WHERE menu_group_key = 'MAINT' 
  LIMIT 1;

  IF v_menu_maint IS NULL THEN
    RAISE EXCEPTION 'Menu group MAINT not found';
  END IF;

  -- Verificar si la pantalla ya existe
  SELECT COUNT(*) INTO v_screen_exists
  FROM public.screens
  WHERE screen_key = 'PARAMETERS_MANAGEMENT';

  -- Solo insertar si no existe
  IF v_screen_exists = 0 THEN
    INSERT INTO public.screens (
      id,
      screen_key,
      screen_name,
      screen_short_name,
      menu_group_id,
      screen_route,
      screen_icon_key,
      screen_display_order,
      is_active,
      lookup_scope
    ) VALUES (
      gen_random_uuid(),
      'PARAMETERS_MANAGEMENT',
      'Gestión de Parámetros',
      'Parámetros',
      v_menu_maint,
      '/dashboard/maintenance/parameters',
      'Settings',
      10,
      true,
      'SYSTEM'
    );

    RAISE NOTICE '✅ Pantalla PARAMETERS_MANAGEMENT agregada exitosamente';
  ELSE
    RAISE NOTICE '⚠️ Pantalla PARAMETERS_MANAGEMENT ya existe, saltando inserción';
  END IF;

END $$;

-- ============================================================================
-- FASE 2: Agregar pantalla ATTENDANCE_EVENTS_MANAGEMENT (Novedades)
-- ============================================================================

DO $$
DECLARE
  v_menu_maint UUID;
  v_screen_exists INT;
BEGIN
  -- Obtener el ID del grupo de menú MAINT (Mantenimiento)
  SELECT id INTO v_menu_maint 
  FROM public.menu_groups 
  WHERE menu_group_key = 'MAINT' 
  LIMIT 1;

  IF v_menu_maint IS NULL THEN
    RAISE EXCEPTION 'Menu group MAINT not found';
  END IF;

  -- Verificar si la pantalla ya existe
  SELECT COUNT(*) INTO v_screen_exists
  FROM public.screens
  WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';

  -- Solo insertar si no existe
  IF v_screen_exists = 0 THEN
    INSERT INTO public.screens (
      id,
      screen_key,
      screen_name,
      screen_short_name,
      menu_group_id,
      screen_route,
      screen_icon_key,
      screen_display_order,
      is_active,
      lookup_scope
    ) VALUES (
      gen_random_uuid(),
      'ATTENDANCE_EVENTS_MANAGEMENT',
      'Gestión de Novedades',
      'Novedades',
      v_menu_maint,
      '/dashboard/maintenance/attendance-events',
      'AlertCircle',
      30,
      true,
      'SYSTEM'
    );

    RAISE NOTICE '✅ Pantalla ATTENDANCE_EVENTS_MANAGEMENT agregada exitosamente';
  ELSE
    RAISE NOTICE '⚠️ Pantalla ATTENDANCE_EVENTS_MANAGEMENT ya existe, saltando inserción';
  END IF;

END $$;

-- ============================================================================
-- FASE 3: Asignar permisos a roles base - PARAMETERS_MANAGEMENT
-- ============================================================================

DO $$
DECLARE
  v_screen_id UUID;
  v_role_id UUID;
  v_permission_exists INT;
BEGIN
  -- Obtener el ID de la pantalla
  SELECT id INTO v_screen_id 
  FROM public.screens 
  WHERE screen_key = 'PARAMETERS_MANAGEMENT' 
  LIMIT 1;

  IF v_screen_id IS NULL THEN
    RAISE EXCEPTION 'Screen PARAMETERS_MANAGEMENT not found';
  END IF;

  -- ========================================
  -- Asignar a SYSTEM_ADMIN (Full Access)
  -- ========================================
  SELECT id INTO v_role_id 
  FROM public.roles 
  WHERE role_key = 'SYSTEM_ADMIN' 
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_permission_exists
    FROM public.role_screen_permissions
    WHERE role_id = v_role_id AND screen_id = v_screen_id;

    IF v_permission_exists = 0 THEN
      INSERT INTO public.role_screen_permissions (
        id, role_id, screen_id,
        can_view, can_create, can_edit, can_delete, can_export, can_approve,
        created_by
      ) VALUES (
        gen_random_uuid(), v_role_id, v_screen_id,
        true, true, true, true, true, true,
        'SYSTEM'
      );
      RAISE NOTICE '✅ Permisos PARAMETERS_MANAGEMENT asignados a SYSTEM_ADMIN';
    END IF;
  END IF;

  -- ========================================
  -- Asignar a TENANT_ADMIN (Full Access)
  -- ========================================
  SELECT id INTO v_role_id 
  FROM public.roles 
  WHERE role_key = 'TENANT_ADMIN' 
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_permission_exists
    FROM public.role_screen_permissions
    WHERE role_id = v_role_id AND screen_id = v_screen_id;

    IF v_permission_exists = 0 THEN
      INSERT INTO public.role_screen_permissions (
        id, role_id, screen_id,
        can_view, can_create, can_edit, can_delete, can_export, can_approve,
        created_by
      ) VALUES (
        gen_random_uuid(), v_role_id, v_screen_id,
        true, true, true, true, true, true,
        'SYSTEM'
      );
      RAISE NOTICE '✅ Permisos PARAMETERS_MANAGEMENT asignados a TENANT_ADMIN';
    END IF;
  END IF;

  -- ========================================
  -- Asignar a RRHH_ADMIN (View + Export)
  -- ========================================
  SELECT id INTO v_role_id 
  FROM public.roles 
  WHERE role_key = 'RRHH_ADMIN' 
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_permission_exists
    FROM public.role_screen_permissions
    WHERE role_id = v_role_id AND screen_id = v_screen_id;

    IF v_permission_exists = 0 THEN
      INSERT INTO public.role_screen_permissions (
        id, role_id, screen_id,
        can_view, can_create, can_edit, can_delete, can_export, can_approve,
        created_by
      ) VALUES (
        gen_random_uuid(), v_role_id, v_screen_id,
        true, false, false, false, true, false,
        'SYSTEM'
      );
      RAISE NOTICE '✅ Permisos PARAMETERS_MANAGEMENT asignados a RRHH_ADMIN';
    END IF;
  END IF;

END $$;

-- ============================================================================
-- FASE 4: Asignar permisos a roles base - ATTENDANCE_EVENTS_MANAGEMENT
-- ============================================================================

DO $$
DECLARE
  v_screen_id UUID;
  v_role_id UUID;
  v_permission_exists INT;
BEGIN
  -- Obtener el ID de la pantalla
  SELECT id INTO v_screen_id 
  FROM public.screens 
  WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT' 
  LIMIT 1;

  IF v_screen_id IS NULL THEN
    RAISE EXCEPTION 'Screen ATTENDANCE_EVENTS_MANAGEMENT not found';
  END IF;

  -- ========================================
  -- Asignar a SYSTEM_ADMIN (Full Access)
  -- ========================================
  SELECT id INTO v_role_id 
  FROM public.roles 
  WHERE role_key = 'SYSTEM_ADMIN' 
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_permission_exists
    FROM public.role_screen_permissions
    WHERE role_id = v_role_id AND screen_id = v_screen_id;

    IF v_permission_exists = 0 THEN
      INSERT INTO public.role_screen_permissions (
        id, role_id, screen_id,
        can_view, can_create, can_edit, can_delete, can_export, can_approve,
        created_by
      ) VALUES (
        gen_random_uuid(), v_role_id, v_screen_id,
        true, true, true, false, true, false,
        'SYSTEM'
      );
      RAISE NOTICE '✅ Permisos ATTENDANCE_EVENTS_MANAGEMENT asignados a SYSTEM_ADMIN';
    END IF;
  END IF;

  -- ========================================
  -- Asignar a TENANT_ADMIN (Full Access sin Delete)
  -- ========================================
  SELECT id INTO v_role_id 
  FROM public.roles 
  WHERE role_key = 'TENANT_ADMIN' 
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_permission_exists
    FROM public.role_screen_permissions
    WHERE role_id = v_role_id AND screen_id = v_screen_id;

    IF v_permission_exists = 0 THEN
      INSERT INTO public.role_screen_permissions (
        id, role_id, screen_id,
        can_view, can_create, can_edit, can_delete, can_export, can_approve,
        created_by
      ) VALUES (
        gen_random_uuid(), v_role_id, v_screen_id,
        true, true, true, false, true, false,
        'SYSTEM'
      );
      RAISE NOTICE '✅ Permisos ATTENDANCE_EVENTS_MANAGEMENT asignados a TENANT_ADMIN';
    END IF;
  END IF;

  -- ========================================
  -- Asignar a RRHH_ADMIN (View + Export)
  -- ========================================
  SELECT id INTO v_role_id 
  FROM public.roles 
  WHERE role_key = 'RRHH_ADMIN' 
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_permission_exists
    FROM public.role_screen_permissions
    WHERE role_id = v_role_id AND screen_id = v_screen_id;

    IF v_permission_exists = 0 THEN
      INSERT INTO public.role_screen_permissions (
        id, role_id, screen_id,
        can_view, can_create, can_edit, can_delete, can_export, can_approve,
        created_by
      ) VALUES (
        gen_random_uuid(), v_role_id, v_screen_id,
        true, false, false, false, true, false,
        'SYSTEM'
      );
      RAISE NOTICE '✅ Permisos ATTENDANCE_EVENTS_MANAGEMENT asignados a RRHH_ADMIN';
    END IF;
  END IF;

END $$;

-- ============================================================================
-- FASE 5: Actualizar orden de pantallas en MAINT
-- ============================================================================

-- Ajustar el orden de las pantallas de Mantenimiento:
-- 10: PARAMETERS_MANAGEMENT (nuevo)
-- 20: CATALOG_MANAGEMENT (existente)
-- 30: ATTENDANCE_EVENTS_MANAGEMENT (nuevo)

UPDATE public.screens 
SET screen_display_order = 20 
WHERE screen_key = 'CATALOG_MANAGEMENT';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  v_screen_count INT;
  v_params_perms INT;
  v_events_perms INT;
BEGIN
  -- Contar pantallas en MAINT
  SELECT COUNT(*) INTO v_screen_count
  FROM public.screens s
  INNER JOIN public.menu_groups mg ON s.menu_group_id = mg.id
  WHERE mg.menu_group_key = 'MAINT';

  -- Contar permisos de PARAMETERS_MANAGEMENT
  SELECT COUNT(*) INTO v_params_perms
  FROM public.role_screen_permissions rsp
  INNER JOIN public.screens s ON rsp.screen_id = s.id
  WHERE s.screen_key = 'PARAMETERS_MANAGEMENT';

  -- Contar permisos de ATTENDANCE_EVENTS_MANAGEMENT
  SELECT COUNT(*) INTO v_events_perms
  FROM public.role_screen_permissions rsp
  INNER JOIN public.screens s ON rsp.screen_id = s.id
  WHERE s.screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';

  RAISE NOTICE '📊 RESUMEN DE MIGRACIÓN 004:';
  RAISE NOTICE '   - Pantallas en MAINT: %', v_screen_count;
  RAISE NOTICE '   - Permisos Parámetros: %', v_params_perms;
  RAISE NOTICE '   - Permisos Novedades: %', v_events_perms;
  RAISE NOTICE '✅ Migración 004 completada exitosamente';
END $$;

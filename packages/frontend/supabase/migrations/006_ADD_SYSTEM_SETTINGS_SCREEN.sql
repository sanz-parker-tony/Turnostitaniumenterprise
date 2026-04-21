-- ============================================================================
-- Migration: 006_ADD_SYSTEM_SETTINGS_SCREEN
-- Descripción: Agrega/actualiza pantalla "Parámetros" (System Settings) al menú de Mantenimiento
-- Fecha: 2026-04-12
-- Autor: Turnos Titanium Enterprise
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- FASE 1: Actualizar o crear pantalla SYSTEM_SETTINGS_MANAGEMENT
-- ============================================================================

DO $$
DECLARE
  v_menu_maint UUID;
  v_screen_id UUID;
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

  -- Verificar si existe con nombre antiguo (PARAMETERS_MANAGEMENT)
  SELECT id INTO v_screen_id
  FROM public.screens
  WHERE screen_key = 'PARAMETERS_MANAGEMENT'
  LIMIT 1;

  -- Si existe con nombre antiguo, actualizarlo
  IF v_screen_id IS NOT NULL THEN
    UPDATE public.screens
    SET 
      screen_key = 'SYSTEM_SETTINGS_MANAGEMENT',
      screen_name = 'Parámetros del Sistema',
      screen_short_name = 'Parámetros',
      screen_route = '/dashboard/maintenance/parameters',
      screen_icon_key = 'Settings',
      screen_display_order = 15,
      is_active = true
    WHERE id = v_screen_id;
    
    RAISE NOTICE '✅ Pantalla PARAMETERS_MANAGEMENT actualizada a SYSTEM_SETTINGS_MANAGEMENT';
  ELSE
    -- Verificar si ya existe la nueva
    SELECT COUNT(*) INTO v_screen_exists
    FROM public.screens
    WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

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
        'SYSTEM_SETTINGS_MANAGEMENT',
        'Parámetros del Sistema',
        'Parámetros',
        v_menu_maint,
        '/dashboard/maintenance/parameters',
        'Settings',
        15,
        true,
        'SYSTEM'
      );

      RAISE NOTICE '✅ Pantalla SYSTEM_SETTINGS_MANAGEMENT creada exitosamente';
    ELSE
      RAISE NOTICE '⚠️ Pantalla SYSTEM_SETTINGS_MANAGEMENT ya existe';
    END IF;
  END IF;

END $$;

-- ============================================================================
-- FASE 2: Asignar permisos a roles base
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
  WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT' 
  LIMIT 1;

  IF v_screen_id IS NULL THEN
    RAISE EXCEPTION 'Screen SYSTEM_SETTINGS_MANAGEMENT not found';
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
      RAISE NOTICE '✅ Permisos SYSTEM_SETTINGS_MANAGEMENT asignados a SYSTEM_ADMIN';
    ELSE
      RAISE NOTICE '⚠️ Permisos SYSTEM_SETTINGS_MANAGEMENT ya existen para SYSTEM_ADMIN';
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
      RAISE NOTICE '✅ Permisos SYSTEM_SETTINGS_MANAGEMENT asignados a TENANT_ADMIN';
    ELSE
      RAISE NOTICE '⚠️ Permisos SYSTEM_SETTINGS_MANAGEMENT ya existen para TENANT_ADMIN';
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
      RAISE NOTICE '✅ Permisos SYSTEM_SETTINGS_MANAGEMENT asignados a RRHH_ADMIN';
    ELSE
      RAISE NOTICE '⚠️ Permisos SYSTEM_SETTINGS_MANAGEMENT ya existen para RRHH_ADMIN';
    END IF;
  END IF;

END $$;

-- ============================================================================
-- FASE 3: Actualizar orden de pantallas en MAINT
-- ============================================================================

-- Ajustar el orden de las pantallas de Mantenimiento:
-- 10: MAINT_EVENTS (Eventos)
-- 15: SYSTEM_SETTINGS_MANAGEMENT (Parámetros) <- NUEVA
-- 20: MAINT_CATALOGS (Catálogos)
-- 30: ATTENDANCE_EVENTS_MANAGEMENT (Novedades)

UPDATE public.screens 
SET screen_display_order = 20 
WHERE screen_key = 'MAINT_CATALOGS';

UPDATE public.screens 
SET screen_display_order = 30 
WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  v_screen_count INT;
  v_settings_perms INT;
  v_screen_info RECORD;
BEGIN
  -- Contar pantallas en MAINT
  SELECT COUNT(*) INTO v_screen_count
  FROM public.screens s
  INNER JOIN public.menu_groups mg ON s.menu_group_id = mg.id
  WHERE mg.menu_group_key = 'MAINT';

  -- Contar permisos de SYSTEM_SETTINGS_MANAGEMENT
  SELECT COUNT(*) INTO v_settings_perms
  FROM public.role_screen_permissions rsp
  INNER JOIN public.screens s ON rsp.screen_id = s.id
  WHERE s.screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

  -- Obtener info de la pantalla
  SELECT screen_key, screen_name, screen_route, screen_display_order
  INTO v_screen_info
  FROM public.screens
  WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

  RAISE NOTICE '📊 RESUMEN DE MIGRACIÓN 006:';
  RAISE NOTICE '   - Pantallas en MAINT: %', v_screen_count;
  RAISE NOTICE '   - Permisos Parámetros: %', v_settings_perms;
  IF v_screen_info IS NOT NULL THEN
    RAISE NOTICE '   - Pantalla: % (%)', v_screen_info.screen_name, v_screen_info.screen_key;
    RAISE NOTICE '   - Ruta: %', v_screen_info.screen_route;
    RAISE NOTICE '   - Orden: %', v_screen_info.screen_display_order;
  END IF;
  RAISE NOTICE '✅ Migración 006 completada exitosamente';
END $$;

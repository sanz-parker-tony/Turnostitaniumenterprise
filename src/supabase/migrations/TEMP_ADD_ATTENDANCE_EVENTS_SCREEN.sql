-- ============================================================================
-- TEMP: Agregar solo la pantalla ATTENDANCE_EVENTS_MANAGEMENT al menú
-- Este script es temporal para testing - puede ejecutarse antes de la migración 004 completa
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- AGREGAR PANTALLA ATTENDANCE_EVENTS_MANAGEMENT
-- ============================================================================

DO $$
DECLARE
  v_menu_maint UUID;
  v_screen_id UUID;
  v_screen_exists INT;
  v_role_id UUID;
  v_permission_exists INT;
BEGIN
  RAISE NOTICE '🎯 [TEMP] Agregando pantalla ATTENDANCE_EVENTS_MANAGEMENT...';

  -- Obtener el ID del grupo de menú MAINT (Mantenimiento)
  SELECT id INTO v_menu_maint 
  FROM public.menu_groups 
  WHERE menu_group_key = 'MAINT' 
  LIMIT 1;

  IF v_menu_maint IS NULL THEN
    RAISE EXCEPTION 'Menu group MAINT not found. Ejecuta primero la migración 002';
  END IF;

  RAISE NOTICE '   Menu MAINT encontrado: %', v_menu_maint;

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
    )
    RETURNING id INTO v_screen_id;

    RAISE NOTICE '✅ Pantalla ATTENDANCE_EVENTS_MANAGEMENT creada (id: %)', v_screen_id;
  ELSE
    SELECT id INTO v_screen_id
    FROM public.screens
    WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT'
    LIMIT 1;
    
    RAISE NOTICE '⚠️  Pantalla ATTENDANCE_EVENTS_MANAGEMENT ya existe (id: %)', v_screen_id;
  END IF;

  -- ========================================
  -- Asignar permisos a SYSTEM_ADMIN
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
      RAISE NOTICE '✅ Permisos asignados a SYSTEM_ADMIN';
    ELSE
      RAISE NOTICE '⚠️  Permisos para SYSTEM_ADMIN ya existen';
    END IF;
  ELSE
    RAISE WARNING 'Rol SYSTEM_ADMIN no encontrado';
  END IF;

  -- ========================================
  -- Asignar permisos a TENANT_ADMIN
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
      RAISE NOTICE '✅ Permisos asignados a TENANT_ADMIN';
    ELSE
      RAISE NOTICE '⚠️  Permisos para TENANT_ADMIN ya existen';
    END IF;
  ELSE
    RAISE WARNING 'Rol TENANT_ADMIN no encontrado';
  END IF;

  -- ========================================
  -- Asignar permisos a RRHH_ADMIN
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
      RAISE NOTICE '✅ Permisos asignados a RRHH_ADMIN';
    ELSE
      RAISE NOTICE '⚠️  Permisos para RRHH_ADMIN ya existen';
    END IF;
  ELSE
    RAISE WARNING 'Rol RRHH_ADMIN no encontrado';
  END IF;

END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  v_screen_count INT;
  v_permission_count INT;
BEGIN
  -- Verificar pantalla
  SELECT COUNT(*) INTO v_screen_count
  FROM public.screens
  WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';

  -- Verificar permisos
  SELECT COUNT(*) INTO v_permission_count
  FROM public.role_screen_permissions rsp
  INNER JOIN public.screens s ON rsp.screen_id = s.id
  WHERE s.screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';

  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMEN:';
  RAISE NOTICE '   Pantalla creada: %', v_screen_count > 0;
  RAISE NOTICE '   Permisos asignados: %', v_permission_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Script temporal completado';
  RAISE NOTICE '   La pantalla "Novedades" ahora debe aparecer en el menú Mantenimiento';
  RAISE NOTICE '';
  RAISE NOTICE '💡 IMPORTANTE:';
  RAISE NOTICE '   - Recarga la página (F5) para ver el menú actualizado';
  RAISE NOTICE '   - Este es un script temporal - ejecuta la migración 004 completa en producción';
  RAISE NOTICE '';
END $$;

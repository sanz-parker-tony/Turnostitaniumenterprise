-- ============================================================================
-- SCRIPT TEMPORAL TODO-EN-UNO: Attendance Events
-- Este script hace todo lo necesario para ver la pantalla de Novedades:
-- 1. Agrega la pantalla al menú
-- 2. Asigna permisos RBAC
-- 3. Siembra datos de attendance_events para visualización
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ve a Supabase → SQL Editor
-- 2. Copia y pega TODO este script
-- 3. Haz clic en "Run"
-- 4. Recarga la app (F5) y ve a Mantenimiento → Novedades
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- PARTE 1: AGREGAR PANTALLA AL MENÚ
-- ============================================================================

DO $$
DECLARE
  v_menu_maint UUID;
  v_screen_id UUID;
  v_screen_exists INT;
  v_role_id UUID;
  v_permission_exists INT;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📱 PARTE 1: Agregar pantalla al menú';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  -- Obtener el ID del grupo de menú MAINT (Mantenimiento)
  SELECT id INTO v_menu_maint 
  FROM public.menu_groups 
  WHERE menu_group_key = 'MAINT' 
  LIMIT 1;

  IF v_menu_maint IS NULL THEN
    RAISE EXCEPTION '❌ Menu group MAINT not found. Ejecuta primero la migración 002';
  END IF;

  RAISE NOTICE '✅ Menu MAINT encontrado';

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
      'Eventos de Asistencia',
      'Eventos',
      v_menu_maint,
      '/dashboard/maintenance/attendance-events',
      'AlertCircle',
      30,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_screen_id;

    RAISE NOTICE '✅ Pantalla ATTENDANCE_EVENTS_MANAGEMENT creada';
  ELSE
    -- Actualizar nombre si ya existe
    UPDATE public.screens
    SET screen_name = 'Eventos de Asistencia',
        screen_short_name = 'Eventos',
        updated_at = now()
    WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';
    
    SELECT id INTO v_screen_id
    FROM public.screens
    WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT'
    LIMIT 1;
    
    RAISE NOTICE '⚠️  Pantalla ya existe (actualizado nombre a "Eventos")';
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
    END IF;
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
    END IF;
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
    END IF;
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PARTE 2: SEED DE ATTENDANCE_EVENTS
-- ============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_trx_dir_nin UUID;
  v_trx_dir_inc UUID;
  v_trx_dir_dec UUID;
  v_evt_tjo UUID;
  v_evt_atr UUID;
  v_evt_fal UUID;
  v_evt_san UUID;
  v_evt_lic UUID;
  v_evt_tnl UUID;
  v_evt_tnc UUID;
  v_evt_tex UUID;
  v_evt_lex UUID;
  v_evt_lun UUID;
  v_evt_fho UUID;
  v_evt_lfh UUID;
  v_evt_inc UUID;
  v_evt_ehe UUID;
  v_calc_tmp UUID;
  v_mov_jor UUID;
  v_mov_lun UUID;
  v_count INT;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🌱 PARTE 2: Sembrar attendance_events';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  -- Obtener tenant (usar el primero que no sea SYSTEM, o SYSTEM si no hay otro)
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE tenant_key != 'SYSTEM'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id
    FROM tenants
    WHERE tenant_key = 'SYSTEM'
    LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION '❌ No se encontró ningún tenant';
  END IF;

  RAISE NOTICE '✅ Usando tenant_id: %', v_tenant_id;

  -- ========================================
  -- Obtener IDs de lookup_values
  -- ========================================

  -- Transaction Directions
  SELECT id INTO v_trx_dir_nin FROM lookup_values 
  WHERE code = 'NIN' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_TRANSACTION_DIRECTION');
  
  SELECT id INTO v_trx_dir_inc FROM lookup_values 
  WHERE code = 'INC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_TRANSACTION_DIRECTION');
  
  SELECT id INTO v_trx_dir_dec FROM lookup_values 
  WHERE code = 'DEC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_TRANSACTION_DIRECTION');

  -- Event Types
  SELECT id INTO v_evt_tjo FROM lookup_values WHERE code = 'TJO' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_atr FROM lookup_values WHERE code = 'ATR' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_fal FROM lookup_values WHERE code = 'FAL' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_san FROM lookup_values WHERE code = 'SAN' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_lic FROM lookup_values WHERE code = 'LIC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_tnl FROM lookup_values WHERE code = 'TNL' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_tnc FROM lookup_values WHERE code = 'TNC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_tex FROM lookup_values WHERE code = 'TEX' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_lex FROM lookup_values WHERE code = 'LEX' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_lun FROM lookup_values WHERE code = 'LUN' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_fho FROM lookup_values WHERE code = 'FHO' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_lfh FROM lookup_values WHERE code = 'LFH' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_inc FROM lookup_values WHERE code = 'INC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_ehe FROM lookup_values WHERE code = 'EHE' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');

  -- Calculation Method
  SELECT id INTO v_calc_tmp FROM lookup_values WHERE code = 'TMP' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_CALCULATION_METHOD');

  -- Movements
  SELECT id INTO v_mov_jor FROM attendance_movements WHERE code = 'JOR' LIMIT 1;
  SELECT id INTO v_mov_lun FROM attendance_movements WHERE code = 'LUN' LIMIT 1;

  -- Verificar que todos los lookups existen
  IF v_trx_dir_inc IS NULL OR v_calc_tmp IS NULL OR v_mov_jor IS NULL THEN
    RAISE EXCEPTION '❌ Faltan lookups o movimientos necesarios. Ejecuta primero la migración 002 completa';
  END IF;

  RAISE NOTICE '✅ Lookups y movimientos encontrados';

  -- ========================================
  -- Insertar attendance_events
  -- ========================================

  SELECT COUNT(*) INTO v_count FROM attendance_events WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '   Registros actuales: %', v_count;

  INSERT INTO attendance_events (
    id, tenant_id, event_name, event_short_name, tolerance_minutes, weight_value,
    transaction_direction_id, event_type_id, movement_id, calculation_method_id,
    external_mapping, is_active, created_by, created_at
  ) VALUES
    (gen_random_uuid(), v_tenant_id, 'JORNADA LABORAL', 'JOR', 10, 100, v_trx_dir_inc, v_evt_tjo, v_mov_jor, v_calc_tmp, 'ONC', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'ATRASO', 'ATR', 5, 100, v_trx_dir_dec, v_evt_atr, v_mov_jor, v_calc_tmp, 'ATR', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'FALTA', 'FAL', 0, 100, v_trx_dir_dec, v_evt_fal, v_mov_jor, v_calc_tmp, 'FAL', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'SALIDA ANTICIPADA', 'SAN', 5, 100, v_trx_dir_dec, v_evt_san, v_mov_jor, v_calc_tmp, 'SAN', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'LICENCIA CON SUELDO', 'LCS', 0, 100, v_trx_dir_inc, v_evt_lic, v_mov_jor, v_calc_tmp, 'PER', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'LICENCIA SIN SUELDO', 'LSS', 0, 0, v_trx_dir_dec, v_evt_lic, v_mov_jor, v_calc_tmp, 'DOS', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'LICENCIA CARGO VACAC', 'LCV', 0, 0, v_trx_dir_nin, v_evt_lic, v_mov_jor, v_calc_tmp, 'TRE', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'TIEMPO NO LABORADO', 'TNL', 0, 100, v_trx_dir_inc, v_evt_tnl, v_mov_jor, v_calc_tmp, 'TNL', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'TIEMPO NO CONTROLADO', 'TNC', 0, 100, v_trx_dir_dec, v_evt_tnc, v_mov_jor, v_calc_tmp, 'TNC', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'HORA EXTRA 150%', 'HEX15', 55, 150, v_trx_dir_inc, v_evt_tex, v_mov_jor, v_calc_tmp, '1M02', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'HORA EXTRA 200%', 'HEX20', 55, 200, v_trx_dir_inc, v_evt_tex, v_mov_jor, v_calc_tmp, '1M03', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'LUNCH EXCEDIDO', 'LEX', 5, 0, v_trx_dir_dec, v_evt_lex, v_mov_lun, v_calc_tmp, 'LEXCE', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'LUNCH', 'LUC', 0, 0, v_trx_dir_inc, v_evt_lun, v_mov_lun, v_calc_tmp, 'ALM', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'FUERA DE HORARIO', 'FHO', 29, 100, v_trx_dir_inc, v_evt_fho, v_mov_jor, v_calc_tmp, 'FHO', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'JORNADA NOC 125%', 'JN1', 10, 125, v_trx_dir_inc, v_evt_tjo, v_mov_jor, v_calc_tmp, '1M01', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'LUNCH FUERA DE HORARIO', 'LFH', 0, 0, v_trx_dir_nin, v_evt_lfh, v_mov_lun, v_calc_tmp, 'LFH', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'INCONSISTENCIAS', 'INC', 0, 100, v_trx_dir_nin, v_evt_inc, v_mov_jor, v_calc_tmp, 'INC', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'HORA EXTRA 100%', 'HEX10', 29, 100, v_trx_dir_inc, v_evt_tex, v_mov_jor, v_calc_tmp, 'HORAS_EXTRAS_100', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'DESCANSO MEDICO', 'DMD', 0, 100, v_trx_dir_inc, v_evt_lic, v_mov_jor, v_calc_tmp, 'DMD', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'PERMISO SINDICAL', 'PSN', 0, 100, v_trx_dir_inc, v_evt_lic, v_mov_jor, v_calc_tmp, 'PSN', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'EXCESO HORAS EXTRAS 150%', 'EHE15', 55, 150, v_trx_dir_inc, v_evt_ehe, v_mov_jor, v_calc_tmp, 'EHE50', true, 'seed', now()),
    (gen_random_uuid(), v_tenant_id, 'EXCESO HORAS EXTRAS 200%', 'EHE20', 55, 200, v_trx_dir_inc, v_evt_ehe, v_mov_jor, v_calc_tmp, 'EHE100', true, 'seed', now())
  ON CONFLICT (tenant_id, event_short_name) DO UPDATE SET
    event_name = EXCLUDED.event_name,
    tolerance_minutes = EXCLUDED.tolerance_minutes,
    weight_value = EXCLUDED.weight_value,
    transaction_direction_id = EXCLUDED.transaction_direction_id,
    event_type_id = EXCLUDED.event_type_id,
    movement_id = EXCLUDED.movement_id,
    calculation_method_id = EXCLUDED.calculation_method_id,
    external_mapping = EXCLUDED.external_mapping,
    is_active = EXCLUDED.is_active,
    updated_by = 'seed',
    updated_at = now();

  SELECT COUNT(*) INTO v_count FROM attendance_events WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✅ Seed completado. Total: %', v_count;
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  v_screen_exists BOOLEAN;
  v_perms_count INT;
  v_events_count INT;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 VERIFICACIÓN FINAL';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Verificar pantalla
  SELECT EXISTS(
    SELECT 1 FROM screens WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT'
  ) INTO v_screen_exists;
  
  -- Contar permisos
  SELECT COUNT(*) INTO v_perms_count
  FROM role_screen_permissions rsp
  INNER JOIN screens s ON rsp.screen_id = s.id
  WHERE s.screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';
  
  -- Contar eventos
  SELECT COUNT(*) INTO v_events_count FROM attendance_events;
  
  RAISE NOTICE '✅ Pantalla creada: %', v_screen_exists;
  RAISE NOTICE '✅ Permisos asignados: %', v_perms_count;
  RAISE NOTICE '✅ Attendance events sembrados: %', v_events_count;
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎉 ¡COMPLETADO EXITOSAMENTE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📝 PRÓXIMOS PASOS:';
  RAISE NOTICE '   1. Recarga la aplicación (F5)';
  RAISE NOTICE '   2. Ve a Mantenimiento → Eventos';
  RAISE NOTICE '   3. Deberías ver %s eventos en la tabla', v_events_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '   Este es un script TEMPORAL para testing';
  RAISE NOTICE '   En producción, ejecuta la migración 004 completa';
  RAISE NOTICE '';
END $$;
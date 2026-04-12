-- ============================================================================
-- MINIMAL SETUP: Solo lo necesario para Eventos (SIN TOCAR system_settings)
-- Turnos Titanium Enterprise
-- ============================================================================
-- Este script MÍNIMO solo crea:
-- 1. menu_groups (si no existe)
-- 2. screens (si no existe)  
-- 3. La pantalla de Eventos
-- 4. Los permisos RBAC
-- 5. Los 22 eventos de prueba
--
-- NO TOCA system_settings ni otras configuraciones existentes
-- ============================================================================

DO $$
DECLARE
  v_menu_maint UUID;
  v_screen_id UUID;
  v_screen_exists INT;
  v_role_id UUID;
  v_permission_exists INT;
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
  RAISE NOTICE '🚀 MINIMAL SETUP: Eventos de Asistencia';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  -- ============================================================================
  -- PARTE 1: Crear tabla menu_groups si no existe
  -- ============================================================================
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'menu_groups'
  ) THEN
    RAISE NOTICE '⚠️  Creando tabla menu_groups...';
    
    CREATE TABLE public.menu_groups (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      menu_group_key character varying NOT NULL,
      menu_group_name character varying NOT NULL,
      menu_icon_key character varying,
      menu_display_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      lookup_scope character varying NOT NULL DEFAULT 'SYSTEM',
      created_by character varying NOT NULL DEFAULT 'SYSTEM',
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_by character varying,
      updated_at timestamp with time zone,
      CONSTRAINT menu_groups_pkey PRIMARY KEY (id),
      CONSTRAINT menu_groups_menu_group_key_uq UNIQUE (menu_group_key)
    );
    
    -- Insertar grupo de menú MAINT
    INSERT INTO public.menu_groups (
      menu_group_key, menu_group_name, menu_icon_key, menu_display_order, lookup_scope
    ) VALUES
      ('MAINT', 'Mantenimiento', 'Settings', 30, 'SYSTEM');
    
    RAISE NOTICE '✅ Tabla menu_groups creada';
  END IF;

  -- ============================================================================
  -- PARTE 2: Crear tabla screens si no existe
  -- ============================================================================
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'screens'
  ) THEN
    RAISE NOTICE '⚠️  Creando tabla screens...';
    
    CREATE TABLE public.screens (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      screen_key character varying NOT NULL,
      screen_name character varying NOT NULL,
      screen_short_name character varying NOT NULL,
      menu_group_id uuid NOT NULL,
      screen_route character varying NOT NULL,
      screen_icon_key character varying,
      screen_display_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      lookup_scope character varying NOT NULL DEFAULT 'SYSTEM',
      created_by character varying NOT NULL DEFAULT 'SYSTEM',
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_by character varying,
      updated_at timestamp with time zone,
      CONSTRAINT screens_pkey PRIMARY KEY (id),
      CONSTRAINT screens_screen_key_uq UNIQUE (screen_key),
      CONSTRAINT screens_menu_group_id_fkey FOREIGN KEY (menu_group_id)
        REFERENCES public.menu_groups(id)
    );
    
    RAISE NOTICE '✅ Tabla screens creada';
  END IF;

  -- ============================================================================
  -- PARTE 3: Obtener/Crear grupo de menú MAINT
  -- ============================================================================

  SELECT id INTO v_menu_maint 
  FROM public.menu_groups 
  WHERE menu_group_key = 'MAINT' 
  LIMIT 1;

  IF v_menu_maint IS NULL THEN
    INSERT INTO public.menu_groups (
      menu_group_key, menu_group_name, menu_icon_key, menu_display_order, lookup_scope
    ) VALUES
      ('MAINT', 'Mantenimiento', 'Settings', 30, 'SYSTEM')
    RETURNING id INTO v_menu_maint;
    
    RAISE NOTICE '✅ Menu group MAINT creado';
  ELSE
    RAISE NOTICE '✅ Menu group MAINT encontrado';
  END IF;

  -- ============================================================================
  -- PARTE 4: Crear/Actualizar pantalla de Eventos
  -- ============================================================================

  SELECT COUNT(*) INTO v_screen_exists
  FROM public.screens
  WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';

  IF v_screen_exists = 0 THEN
    INSERT INTO public.screens (
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
    UPDATE public.screens
    SET screen_name = 'Eventos de Asistencia',
        screen_short_name = 'Eventos',
        updated_at = now()
    WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';
    
    SELECT id INTO v_screen_id
    FROM public.screens
    WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT'
    LIMIT 1;
    
    RAISE NOTICE '⚠️  Pantalla ya existe (actualizado a "Eventos")';
  END IF;

  -- ============================================================================
  -- PARTE 5: Asignar permisos RBAC
  -- ============================================================================

  -- SYSTEM_ADMIN
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

  -- TENANT_ADMIN
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

  -- RRHH_ADMIN
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

  -- ============================================================================
  -- PARTE 6: Sembrar attendance_events (22 registros)
  -- ============================================================================

  RAISE NOTICE '';
  RAISE NOTICE '🌱 Sembrando attendance_events...';

  -- Obtener tenant
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
    RAISE EXCEPTION '❌ No se encontró ningún tenant. Necesitas ejecutar la migración 002 primero.';
  END IF;

  RAISE NOTICE '✅ Usando tenant_id: %', v_tenant_id;

  -- Obtener IDs de lookups
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

  IF v_trx_dir_inc IS NULL OR v_calc_tmp IS NULL OR v_mov_jor IS NULL THEN
    RAISE EXCEPTION '❌ Faltan lookups o movimientos. Ejecuta la migración 002 primero.';
  END IF;

  RAISE NOTICE '✅ Lookups y movimientos encontrados';

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
    updated_by = 'seed',
    updated_at = now();

  SELECT COUNT(*) INTO v_count FROM attendance_events WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✅ Seed completado. Total: %', v_count;
  RAISE NOTICE '';

  -- ============================================================================
  -- VERIFICACIÓN FINAL
  -- ============================================================================

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎉 ¡COMPLETADO EXITOSAMENTE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📝 PRÓXIMOS PASOS:';
  RAISE NOTICE '   1. Recarga la aplicación (F5)';
  RAISE NOTICE '   2. Ve a Mantenimiento → Eventos';
  RAISE NOTICE '   3. Deberías ver %s eventos en la tabla', v_count;
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- QUICK START: Eventos de Asistencia (SCRIPT COMPLETO)
-- Turnos Titanium Enterprise
-- ============================================================================
-- Este script:
-- 1. Verifica que las tablas necesarias existan
-- 2. Crea los lookup_groups y lookup_values de ATTENDANCE
-- 3. Crea la pantalla "Eventos de Asistencia" en el menú
-- 4. Crea screen_actions y asigna permisos a roles
-- 5. Siembra 22 eventos de asistencia
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN INICIAL DE DEPENDENCIAS
-- ============================================================================

DO $$
DECLARE
  v_tables_missing TEXT[] := ARRAY[]::TEXT[];
  v_table_name TEXT;
  v_exists BOOLEAN;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔍 VERIFICANDO DEPENDENCIAS...';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Verificar tablas críticas
  FOREACH v_table_name IN ARRAY ARRAY[
    'system_menu_groups',
    'screens',
    'roles',
    'role_screen_actions',
    'screen_actions',
    'actions',
    'lookup_groups',
    'lookup_values',
    'attendance_movements',
    'attendance_events',
    'tenants'
  ]
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = v_table_name
    ) INTO v_exists;
    
    IF v_exists THEN
      RAISE NOTICE '   ✅ % existe', v_table_name;
    ELSE
      RAISE NOTICE '   ❌ % NO EXISTE', v_table_name;
      v_tables_missing := array_append(v_tables_missing, v_table_name);
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMEN:';
  RAISE NOTICE '   Total tablas verificadas: 11';
  RAISE NOTICE '   Tablas faltantes: %', COALESCE(array_length(v_tables_missing, 1), 0);
  RAISE NOTICE '';
  
  IF array_length(v_tables_missing, 1) > 0 THEN
    RAISE NOTICE '❌ FALTAN TABLAS NECESARIAS:';
    FOREACH v_table_name IN ARRAY v_tables_missing
    LOOP
      RAISE NOTICE '   • %', v_table_name;
    END LOOP;
    RAISE NOTICE '';
    RAISE EXCEPTION 'Dependencias faltantes. Ejecuta primero las migraciones base (001, 002).';
  ELSE
    RAISE NOTICE '✅ Todas las tablas necesarias existen';
    RAISE NOTICE '';
  END IF;
END $$;

-- ============================================================================
-- PARTE 0: CREAR LOOKUPS DE ASISTENCIA (SI NO EXISTEN)
-- ============================================================================

DO $$
DECLARE
  v_lg_transaction_dir UUID;
  v_lg_event_type UUID;
  v_lg_calc_method UUID;
  v_count INT;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📚 PARTE 0: Crear Lookups de Asistencia';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  -- ========================================
  -- LOOKUP GROUP: ATTENDANCE_TRANSACTION_DIRECTION
  -- ========================================
  INSERT INTO lookup_groups (
    id, lookup_group_key, lookup_group_label, lookup_group_short_label,
    allows_tenant_items, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    'ATTENDANCE_TRANSACTION_DIRECTION',
    'Dirección de Transacción de Asistencia',
    'Dir. Transacción',
    false,
    true,
    'SYSTEM'
  )
  ON CONFLICT (lookup_group_key) DO NOTHING
  RETURNING id INTO v_lg_transaction_dir;

  IF v_lg_transaction_dir IS NULL THEN
    SELECT id INTO v_lg_transaction_dir 
    FROM lookup_groups 
    WHERE lookup_group_key = 'ATTENDANCE_TRANSACTION_DIRECTION';
  END IF;

  INSERT INTO lookup_values (
    lookup_group_id, tenant_id, lookup_key, lookup_label, lookup_short_label,
    lookup_scope, sort_order, is_active, created_by
  ) VALUES
    (v_lg_transaction_dir, NULL, 'NIN', 'Ninguna', 'Ninguna', 'SYSTEM', 10, true, 'SYSTEM'),
    (v_lg_transaction_dir, NULL, 'INC', 'Incrementa', 'Inc', 'SYSTEM', 20, true, 'SYSTEM'),
    (v_lg_transaction_dir, NULL, 'DEC', 'Decrementa', 'Dec', 'SYSTEM', 30, true, 'SYSTEM')
  ON CONFLICT (lookup_group_id, tenant_id, lookup_key) DO NOTHING;

  RAISE NOTICE '✅ ATTENDANCE_TRANSACTION_DIRECTION creado (3 valores)';

  -- ========================================
  -- LOOKUP GROUP: ATTENDANCE_EVENT_TYPE
  -- ========================================
  INSERT INTO lookup_groups (
    id, lookup_group_key, lookup_group_label, lookup_group_short_label,
    allows_tenant_items, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    'ATTENDANCE_EVENT_TYPE',
    'Tipo de Evento de Asistencia',
    'Tipo Evento',
    false,
    true,
    'SYSTEM'
  )
  ON CONFLICT (lookup_group_key) DO NOTHING
  RETURNING id INTO v_lg_event_type;

  IF v_lg_event_type IS NULL THEN
    SELECT id INTO v_lg_event_type 
    FROM lookup_groups 
    WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE';
  END IF;

  INSERT INTO lookup_values (
    lookup_group_id, tenant_id, lookup_key, lookup_label, lookup_short_label,
    lookup_scope, sort_order, is_active, created_by
  ) VALUES
    (v_lg_event_type, NULL, 'TJO', 'Tiempo Jornada', 'T. Jornada', 'SYSTEM', 10, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'ATR', 'Atraso', 'Atraso', 'SYSTEM', 20, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'FAL', 'Falta', 'Falta', 'SYSTEM', 30, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'SAN', 'Salida Anticipada', 'Sal. Ant.', 'SYSTEM', 40, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'LIC', 'Licencia', 'Licencia', 'SYSTEM', 50, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'TNL', 'Tiempo No Laborado', 'T. No Lab.', 'SYSTEM', 60, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'TNC', 'Tiempo No Controlado', 'T. No Ctrl', 'SYSTEM', 70, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'TEX', 'Tiempo Extra', 'T. Extra', 'SYSTEM', 80, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'LEX', 'Lunch Excedido', 'L. Excedido', 'SYSTEM', 90, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'LUN', 'Lunch', 'Lunch', 'SYSTEM', 100, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'FHO', 'Fuera de Horario', 'F. Horario', 'SYSTEM', 110, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'LFH', 'Lunch Fuera Horario', 'L. F. Horario', 'SYSTEM', 120, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'INC', 'Inconsistencia', 'Inconsist.', 'SYSTEM', 130, true, 'SYSTEM'),
    (v_lg_event_type, NULL, 'EHE', 'Exceso Horas Extras', 'Exc. H. Ext.', 'SYSTEM', 140, true, 'SYSTEM')
  ON CONFLICT (lookup_group_id, tenant_id, lookup_key) DO NOTHING;

  RAISE NOTICE '✅ ATTENDANCE_EVENT_TYPE creado (14 valores)';

  -- ========================================
  -- LOOKUP GROUP: ATTENDANCE_CALCULATION_METHOD
  -- ========================================
  INSERT INTO lookup_groups (
    id, lookup_group_key, lookup_group_label, lookup_group_short_label,
    allows_tenant_items, is_active, created_by
  ) VALUES (
    gen_random_uuid(),
    'ATTENDANCE_CALCULATION_METHOD',
    'Método de Cálculo de Asistencia',
    'Método Cálc.',
    false,
    true,
    'SYSTEM'
  )
  ON CONFLICT (lookup_group_key) DO NOTHING
  RETURNING id INTO v_lg_calc_method;

  IF v_lg_calc_method IS NULL THEN
    SELECT id INTO v_lg_calc_method 
    FROM lookup_groups 
    WHERE lookup_group_key = 'ATTENDANCE_CALCULATION_METHOD';
  END IF;

  INSERT INTO lookup_values (
    lookup_group_id, tenant_id, lookup_key, lookup_label, lookup_short_label,
    lookup_scope, sort_order, is_active, created_by
  ) VALUES
    (v_lg_calc_method, NULL, 'TMP', 'Por Tiempo', 'Tiempo', 'SYSTEM', 10, true, 'SYSTEM'),
    (v_lg_calc_method, NULL, 'OCC', 'Por Ocurrencia', 'Ocurrencia', 'SYSTEM', 20, true, 'SYSTEM')
  ON CONFLICT (lookup_group_id, tenant_id, lookup_key) DO NOTHING;

  RAISE NOTICE '✅ ATTENDANCE_CALCULATION_METHOD creado (2 valores)';
  
  SELECT COUNT(*) INTO v_count
  FROM lookup_values lv
  INNER JOIN lookup_groups lg ON lv.lookup_group_id = lg.id
  WHERE lg.lookup_group_key LIKE 'ATTENDANCE%';
  
  RAISE NOTICE '✅ Total lookup_values de ATTENDANCE: %', v_count;
  RAISE NOTICE '';

END $$;

-- ============================================================================
-- PARTE 1: AGREGAR PANTALLA AL MENÚ
-- ============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_menu_maint UUID;
  v_screen_id UUID;
  v_screen_exists INT;
  v_screen_action_id UUID;
  v_role_id UUID;
  v_action_id UUID;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📱 PARTE 1: Agregar pantalla al menú';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  SELECT id INTO v_tenant_id FROM tenants WHERE tenant_key = 'SYSTEM' LIMIT 1;
  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Tenant SYSTEM no encontrado'; END IF;

  SELECT id INTO v_menu_maint FROM system_menu_groups WHERE menu_group_key = 'MAINT' LIMIT 1;
  IF v_menu_maint IS NULL THEN RAISE EXCEPTION 'Menu group MAINT no encontrado'; END IF;

  RAISE NOTICE '✅ Menu MAINT encontrado';

  SELECT COUNT(*) INTO v_screen_exists FROM screens WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';

  IF v_screen_exists = 0 THEN
    INSERT INTO screens (
      id, screen_key, screen_name, menu_label, menu_group_id,
      route_path, icon_key, sort_order, is_active, created_by
    ) VALUES (
      gen_random_uuid(), 'ATTENDANCE_EVENTS_MANAGEMENT', 'Eventos de Asistencia', 'Eventos',
      v_menu_maint, '/dashboard/maintenance/attendance-events', 'AlertCircle', 30, true, 'SYSTEM'
    )
    RETURNING id INTO v_screen_id;
    RAISE NOTICE '✅ Pantalla ATTENDANCE_EVENTS_MANAGEMENT creada';
  ELSE
    UPDATE screens SET screen_name = 'Eventos de Asistencia', menu_label = 'Eventos',
      updated_by = 'SYSTEM', updated_at = now()
    WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';
    SELECT id INTO v_screen_id FROM screens WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT';
    RAISE NOTICE '⚠️  Pantalla ya existe (actualizada)';
  END IF;

  -- Crear screen_actions
  RAISE NOTICE '📋 Creando screen_actions...';
  FOR v_action_id IN 
    SELECT id FROM actions WHERE action_key IN ('VIEW', 'CREATE', 'EDIT', 'EXPORT')
  LOOP
    INSERT INTO screen_actions (screen_id, action_id, is_active, created_by)
    VALUES (v_screen_id, v_action_id, true, 'SYSTEM')
    ON CONFLICT DO NOTHING;
  END LOOP;
  RAISE NOTICE '✅ Screen actions creadas';

  -- Asignar permisos a SYSTEM_ADMIN
  SELECT id INTO v_role_id FROM roles WHERE role_key = 'SYSTEM_ADMIN' LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    RAISE NOTICE '📝 Asignando permisos a SYSTEM_ADMIN...';
    FOR v_screen_action_id IN
      SELECT sa.id FROM screen_actions sa
      INNER JOIN actions a ON sa.action_id = a.id
      WHERE sa.screen_id = v_screen_id AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'EXPORT')
    LOOP
      INSERT INTO role_screen_actions (id, tenant_id, role_id, screen_action_id, is_allowed, is_active, created_by)
      VALUES (gen_random_uuid(), v_tenant_id, v_role_id, v_screen_action_id, true, true, 'SYSTEM')
      ON CONFLICT (tenant_id, role_id, screen_action_id) DO UPDATE SET is_allowed = true;
    END LOOP;
    RAISE NOTICE '✅ Permisos asignados a SYSTEM_ADMIN';
  END IF;

  -- Asignar permisos a TENANT_ADMIN
  SELECT id INTO v_role_id FROM roles WHERE role_key = 'TENANT_ADMIN' LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    RAISE NOTICE '📝 Asignando permisos a TENANT_ADMIN...';
    FOR v_screen_action_id IN
      SELECT sa.id FROM screen_actions sa
      INNER JOIN actions a ON sa.action_id = a.id
      WHERE sa.screen_id = v_screen_id AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'EXPORT')
    LOOP
      INSERT INTO role_screen_actions (id, tenant_id, role_id, screen_action_id, is_allowed, is_active, created_by)
      VALUES (gen_random_uuid(), v_tenant_id, v_role_id, v_screen_action_id, true, true, 'SYSTEM')
      ON CONFLICT (tenant_id, role_id, screen_action_id) DO UPDATE SET is_allowed = true;
    END LOOP;
    RAISE NOTICE '✅ Permisos asignados a TENANT_ADMIN';
  END IF;

  -- Asignar permisos a RRHH_ADMIN (solo VIEW y EXPORT)
  SELECT id INTO v_role_id FROM roles WHERE role_key = 'RRHH_ADMIN' LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    RAISE NOTICE '📝 Asignando permisos a RRHH_ADMIN...';
    FOR v_screen_action_id IN
      SELECT sa.id FROM screen_actions sa
      INNER JOIN actions a ON sa.action_id = a.id
      WHERE sa.screen_id = v_screen_id AND a.action_key IN ('VIEW', 'EXPORT')
    LOOP
      INSERT INTO role_screen_actions (id, tenant_id, role_id, screen_action_id, is_allowed, is_active, created_by)
      VALUES (gen_random_uuid(), v_tenant_id, v_role_id, v_screen_action_id, true, true, 'SYSTEM')
      ON CONFLICT (tenant_id, role_id, screen_action_id) DO UPDATE SET is_allowed = true;
    END LOOP;
    RAISE NOTICE '✅ Permisos asignados a RRHH_ADMIN';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PARTE 2: SEED DE ATTENDANCE_EVENTS
-- ============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_trx_dir_nin UUID; v_trx_dir_inc UUID; v_trx_dir_dec UUID;
  v_evt_tjo UUID; v_evt_atr UUID; v_evt_fal UUID; v_evt_san UUID;
  v_evt_lic UUID; v_evt_tnl UUID; v_evt_tnc UUID; v_evt_tex UUID;
  v_evt_lex UUID; v_evt_lun UUID; v_evt_fho UUID; v_evt_lfh UUID;
  v_evt_inc UUID; v_evt_ehe UUID;
  v_calc_tmp UUID;
  v_mov_jor UUID; v_mov_lun UUID;
  v_count INT;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🌱 PARTE 2: Sembrar attendance_events';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  -- Obtener tenant
  SELECT id INTO v_tenant_id FROM tenants WHERE tenant_key != 'SYSTEM' ORDER BY created_at DESC LIMIT 1;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM tenants WHERE tenant_key = 'SYSTEM' LIMIT 1;
  END IF;
  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'No se encontró ningún tenant'; END IF;
  RAISE NOTICE '✅ Usando tenant_id: %', v_tenant_id;

  -- Obtener IDs de lookup_values
  SELECT id INTO v_trx_dir_nin FROM lookup_values WHERE lookup_key = 'NIN' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_TRANSACTION_DIRECTION');
  SELECT id INTO v_trx_dir_inc FROM lookup_values WHERE lookup_key = 'INC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_TRANSACTION_DIRECTION');
  SELECT id INTO v_trx_dir_dec FROM lookup_values WHERE lookup_key = 'DEC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_TRANSACTION_DIRECTION');
  SELECT id INTO v_evt_tjo FROM lookup_values WHERE lookup_key = 'TJO' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_atr FROM lookup_values WHERE lookup_key = 'ATR' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_fal FROM lookup_values WHERE lookup_key = 'FAL' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_san FROM lookup_values WHERE lookup_key = 'SAN' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_lic FROM lookup_values WHERE lookup_key = 'LIC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_tnl FROM lookup_values WHERE lookup_key = 'TNL' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_tnc FROM lookup_values WHERE lookup_key = 'TNC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_tex FROM lookup_values WHERE lookup_key = 'TEX' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_lex FROM lookup_values WHERE lookup_key = 'LEX' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_lun FROM lookup_values WHERE lookup_key = 'LUN' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_fho FROM lookup_values WHERE lookup_key = 'FHO' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_lfh FROM lookup_values WHERE lookup_key = 'LFH' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_inc FROM lookup_values WHERE lookup_key = 'INC' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_evt_ehe FROM lookup_values WHERE lookup_key = 'EHE' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_EVENT_TYPE');
  SELECT id INTO v_calc_tmp FROM lookup_values WHERE lookup_key = 'TMP' AND lookup_group_id IN (SELECT id FROM lookup_groups WHERE lookup_group_key = 'ATTENDANCE_CALCULATION_METHOD');
  SELECT id INTO v_mov_jor FROM attendance_movements WHERE movement_short_name = 'JOR' LIMIT 1;
  SELECT id INTO v_mov_lun FROM attendance_movements WHERE movement_short_name = 'LUN' LIMIT 1;

  -- Validar dependencias críticas
  IF v_trx_dir_inc IS NULL OR v_calc_tmp IS NULL OR v_mov_jor IS NULL THEN
    RAISE EXCEPTION 'Faltan lookups o movimientos. Verifica PARTE 0 y migración 004_SEED_ATTENDANCE_MOVEMENTS';
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
    event_name = EXCLUDED.event_name, tolerance_minutes = EXCLUDED.tolerance_minutes, weight_value = EXCLUDED.weight_value,
    transaction_direction_id = EXCLUDED.transaction_direction_id, event_type_id = EXCLUDED.event_type_id,
    movement_id = EXCLUDED.movement_id, calculation_method_id = EXCLUDED.calculation_method_id,
    external_mapping = EXCLUDED.external_mapping, is_active = EXCLUDED.is_active,
    updated_by = 'seed', updated_at = now();

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
  
  SELECT EXISTS(SELECT 1 FROM screens WHERE screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT') INTO v_screen_exists;
  
  SELECT COUNT(*) INTO v_perms_count
  FROM role_screen_actions rsa
  INNER JOIN screen_actions sa ON rsa.screen_action_id = sa.id
  INNER JOIN screens s ON sa.screen_id = s.id
  WHERE s.screen_key = 'ATTENDANCE_EVENTS_MANAGEMENT' AND rsa.is_allowed = true;
  
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
  RAISE NOTICE '   3. Deberías ver % eventos en la tabla', v_events_count;
  RAISE NOTICE '';
END $$;

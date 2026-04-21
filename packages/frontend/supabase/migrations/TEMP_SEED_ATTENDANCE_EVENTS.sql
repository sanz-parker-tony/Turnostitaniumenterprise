-- ============================================================================
-- TEMP SEED: Solo attendance_events para visualización
-- Este script puede ejecutarse ANTES de tener el schema completo
-- Solo para testing de la pantalla de mantenimiento
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- VERIFICAR PREREQUISITOS
-- ============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_tables_exist INT;
BEGIN
  -- Verificar que las tablas necesarias existen
  SELECT COUNT(*) INTO v_tables_exist
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('tenants', 'lookup_groups', 'lookup_values', 'attendance_movements', 'attendance_events');

  IF v_tables_exist < 5 THEN
    RAISE EXCEPTION 'ERROR: Faltan tablas necesarias. Ejecuta primero las migraciones 001 y 002';
  END IF;

  RAISE NOTICE '✅ Tablas requeridas encontradas';
END $$;

-- ============================================================================
-- SEED DE ATTENDANCE EVENTS
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
  RAISE NOTICE '🌱 [SEED] Iniciando seed de attendance_events...';

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
    RAISE EXCEPTION 'No se encontró ningún tenant. Ejecuta primero la migración 002';
  END IF;

  RAISE NOTICE '   Usando tenant_id: %', v_tenant_id;

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
    RAISE EXCEPTION 'Faltan lookups o movimientos necesarios. Ejecuta primero la migración 002 completa';
  END IF;

  RAISE NOTICE '✅ Lookups y movimientos encontrados';

  -- ========================================
  -- Insertar attendance_events
  -- ========================================

  -- Contar registros actuales
  SELECT COUNT(*) INTO v_count FROM attendance_events WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '   Registros actuales de attendance_events: %', v_count;

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

  -- Contar registros finales
  SELECT COUNT(*) INTO v_count FROM attendance_events WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✅ Seed completado. Total de attendance_events: %', v_count;

END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM attendance_events;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 RESUMEN DE SEED:';
  RAISE NOTICE '   Total attendance_events: %', v_total;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Seed temporal completado exitosamente';
  RAISE NOTICE '   Ahora puedes visualizar la pantalla de Novedades';
  RAISE NOTICE '';
END $$;

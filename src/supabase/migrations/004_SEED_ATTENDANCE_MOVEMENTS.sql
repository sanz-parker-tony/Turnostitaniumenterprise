-- ============================================================================
-- 004_SEED_ATTENDANCE_MOVEMENTS.sql
-- Turnos Titanium Enterprise — MOVIMIENTOS BASE DE ASISTENCIA
-- ============================================================================
-- Descripción:
--   Siembra los movimientos base de asistencia (JOR y LUN) con las claves
--   correctas para el tenant SYSTEM.
--
-- Movimientos:
--   - JOR (Jornada Laboral): start_key=1, end_key=4
--   - LUN (Tiempo de Lunch):  start_key=2, end_key=3
--
-- CÓMO EJECUTAR:
--   1. Ir a Supabase SQL Editor
--   2. Pegar este archivo completo
--   3. Ejecutar
--
-- IMPORTANTE: Ejecutar DESPUÉS de 002_SEED_COMPLETE.sql
--
-- Última actualización: 2026-04-11
-- ============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_count INT;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 SEMBRANDO attendance_movements';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Obtener tenant SYSTEM
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE tenant_key = 'SYSTEM'
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION '❌ No se encontró el tenant SYSTEM. Ejecuta primero 002_SEED_COMPLETE.sql';
  END IF;

  RAISE NOTICE '✅ Tenant SYSTEM encontrado: %', v_tenant_id;

  -- Verificar cantidad actual
  SELECT COUNT(*) INTO v_count
  FROM public.attendance_movements
  WHERE tenant_id = v_tenant_id;

  RAISE NOTICE '   Registros actuales: %', v_count;

  -- Insertar movimientos base (ON CONFLICT actualiza)
  INSERT INTO public.attendance_movements (
    tenant_id, 
    movement_name, 
    movement_short_name, 
    start_key, 
    end_key, 
    is_active, 
    created_by
  ) VALUES
    (
      v_tenant_id,
      'JORNADA LABORAL',
      'JOR',
      1,
      4,
      true,
      'SYSTEM'
    ),
    (
      v_tenant_id,
      'TIEMPO DE LUNCH',
      'LUN',
      2,
      3,
      true,
      'SYSTEM'
    )
  ON CONFLICT (tenant_id, movement_short_name) 
  DO UPDATE SET
    movement_name = EXCLUDED.movement_name,
    start_key = EXCLUDED.start_key,
    end_key = EXCLUDED.end_key,
    updated_by = 'SYSTEM',
    updated_at = now();

  SELECT COUNT(*) INTO v_count
  FROM public.attendance_movements
  WHERE tenant_id = v_tenant_id;

  RAISE NOTICE '✅ Movimientos procesados. Total: %', v_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

SELECT 
  movement_name, 
  movement_short_name,
  start_key,
  end_key,
  is_active,
  created_by,
  created_at
FROM public.attendance_movements 
ORDER BY start_key;

-- ============================================================================
-- REPORTE FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎉 MOVIMIENTOS BASE CREADOS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '✅ JOR (Jornada Laboral): start_key=1, end_key=4';
  RAISE NOTICE '✅ LUN (Tiempo de Lunch):  start_key=2, end_key=3';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Listo para continuar con QUICK_START_EVENTOS.sql';
  RAISE NOTICE '';
END $$;

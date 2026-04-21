-- ============================================================================
-- 001_FACTORY_RESET_v2.sql
-- Turnos Titanium Enterprise - Factory Reset COMPLETO (DATOS, NO ESTRUCTURA)
-- ============================================================================
-- Cambios vs versión anterior:
-- 1) Limpia tablas helper (v_gender_group_id, v_super_admin_role_id)
-- 2) NO limpia system_languages (son datos base SYSTEM)
-- 3) KV store: se limpia SOLO lo que NO sea "system:%"
-- 4) Mantiene orden lógico y CASCADE
-- 5) Mantiene session_replication_role = replica durante truncates
-- ============================================================================

BEGIN;

SET session_replication_role = replica;

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'FACTORY RESET - INICIANDO LIMPIEZA COMPLETA';
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- SECCIÓN 1: TRADUCCIONES E INTERNACIONALIZACIÓN
-- ============================================================================
TRUNCATE TABLE public.system_message_translations CASCADE;
TRUNCATE TABLE public.system_report_translations CASCADE;
TRUNCATE TABLE public.report_parameter_translations CASCADE;
TRUNCATE TABLE public.screen_translations CASCADE;
TRUNCATE TABLE public.system_menu_group_translations CASCADE;
TRUNCATE TABLE public.lookup_value_translations CASCADE;
TRUNCATE TABLE public.lookup_group_translations CASCADE;
TRUNCATE TABLE public.action_translations CASCADE;
TRUNCATE TABLE public.tenant_language_settings CASCADE;
TRUNCATE TABLE public.system_message_keys CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 1: Traducciones limpiadas'; END $$;

-- ============================================================================
-- SECCIÓN 2: AUDITORÍA Y SNAPSHOTS
-- ============================================================================
TRUNCATE TABLE public.role_permission_snapshots CASCADE;
TRUNCATE TABLE public.role_permission_copy_runs CASCADE;
TRUNCATE TABLE public.audit_log CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 2: Auditoría limpiada'; END $$;

-- ============================================================================
-- SECCIÓN 3: REPORTES Y EJECUCIONES
-- ============================================================================
TRUNCATE TABLE public.report_executions CASCADE;
TRUNCATE TABLE public.report_scope_policies CASCADE;
TRUNCATE TABLE public.report_parameters CASCADE;
TRUNCATE TABLE public.report_permissions CASCADE;
TRUNCATE TABLE public.system_reports CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 3: Reportes limpiados'; END $$;

-- ============================================================================
-- SECCIÓN 4: ASISTENCIA Y CÁLCULOS
-- ============================================================================
TRUNCATE TABLE public.employee_attendance_calculations CASCADE;
TRUNCATE TABLE public.attendance_processing_runs CASCADE;
TRUNCATE TABLE public.employee_time_punches CASCADE;
TRUNCATE TABLE public.employee_shift_plans CASCADE;
TRUNCATE TABLE public.employee_absence_requests CASCADE;
TRUNCATE TABLE public.time_surcharge_rules CASCADE;
TRUNCATE TABLE public.attendance_events CASCADE;
TRUNCATE TABLE public.attendance_movements CASCADE;
TRUNCATE TABLE public.justification_types CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 4: Asistencia limpiada'; END $$;

-- ============================================================================
-- SECCIÓN 5: EMPLEADOS Y RELACIONES
-- ============================================================================
TRUNCATE TABLE public.employee_companies CASCADE;
TRUNCATE TABLE public.employee_profile_work_patterns CASCADE;
TRUNCATE TABLE public.employee_profile_settings CASCADE;
TRUNCATE TABLE public.employees CASCADE;
TRUNCATE TABLE public.employee_profiles CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 5: Empleados limpiados'; END $$;

-- ============================================================================
-- SECCIÓN 6: ESTRUCTURA ORGANIZACIONAL
-- ============================================================================
TRUNCATE TABLE public.time_clock_devices CASCADE;
TRUNCATE TABLE public.shifts CASCADE;
TRUNCATE TABLE public.work_patterns CASCADE;
TRUNCATE TABLE public.holidays CASCADE;
TRUNCATE TABLE public.work_groups CASCADE;
TRUNCATE TABLE public.work_locations CASCADE;
TRUNCATE TABLE public.job_titles CASCADE;
TRUNCATE TABLE public.cost_centers CASCADE;
TRUNCATE TABLE public.areas CASCADE;
TRUNCATE TABLE public.departments CASCADE;
TRUNCATE TABLE public.payroll_groups CASCADE;
TRUNCATE TABLE public.company_settings CASCADE;
TRUNCATE TABLE public.companies CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 6: Estructura organizacional limpiada'; END $$;

-- ============================================================================
-- SECCIÓN 7: CONFIGURACIÓN
-- ============================================================================
TRUNCATE TABLE public.tenant_settings CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 7: Configuración limpiada'; END $$;

-- ============================================================================
-- SECCIÓN 8: PERMISOS Y RBAC
-- ============================================================================
TRUNCATE TABLE public.user_role_scopes CASCADE;
TRUNCATE TABLE public.role_screen_actions CASCADE;
TRUNCATE TABLE public.screen_actions CASCADE;
TRUNCATE TABLE public.screens CASCADE;
TRUNCATE TABLE public.system_menu_groups CASCADE;
TRUNCATE TABLE public.actions CASCADE;
TRUNCATE TABLE public.scope_types CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 8: RBAC limpiado'; END $$;

-- ============================================================================
-- SECCIÓN 9: USUARIOS Y ROLES
-- ============================================================================
TRUNCATE TABLE public.user_roles CASCADE;
TRUNCATE TABLE public.users CASCADE;
TRUNCATE TABLE public.roles CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 9: Usuarios y roles limpiados'; END $$;

-- ============================================================================
-- SECCIÓN 10: LOOKUPS Y CATÁLOGOS
-- ============================================================================
TRUNCATE TABLE public.lookup_values CASCADE;
TRUNCATE TABLE public.lookup_groups CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 10: Lookups limpiados'; END $$;

-- ============================================================================
-- SECCIÓN 11: SUBSCRIPCIONES Y PAGOS
-- ============================================================================
TRUNCATE TABLE public.payment_transactions CASCADE;
TRUNCATE TABLE public.tenant_subscriptions CASCADE;
TRUNCATE TABLE public.subscription_plans CASCADE;
TRUNCATE TABLE public.tenant_members CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 11: Subscripciones limpiadas'; END $$;

-- ============================================================================
-- SECCIÓN 12: ONBOARDING Y TENANTS
-- ============================================================================
TRUNCATE TABLE public.tenant_onboarding CASCADE;

-- Tablas helper (v_*): son TABLAS reales, NO views
TRUNCATE TABLE public.v_gender_group_id CASCADE;
TRUNCATE TABLE public.v_super_admin_role_id CASCADE;

-- NOTA: system_languages NO se limpia (datos base SYSTEM)

TRUNCATE TABLE public.tenants CASCADE;

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 12: Tenants y tablas helper limpiados'; END $$;

-- ============================================================================
-- SECCIÓN 13: TABLAS ESPECIALES
-- ============================================================================
-- KV Store: limpiar SOLO lo que no sea system:*
DELETE FROM public.kv_store_e19f2094
WHERE key NOT LIKE 'system:%';

DO $$ BEGIN RAISE NOTICE '  ✅ Sección 13: KV store limpiado (excepto system:*)'; END $$;

-- ============================================================================
-- REACTIVAR CONSTRAINTS
-- ============================================================================
SET session_replication_role = DEFAULT;

-- ============================================================================
-- RESETEAR SECUENCIAS (opcional)
-- ============================================================================
DO $$
DECLARE
  v_seq RECORD;
  v_count INT := 0;
BEGIN
  FOR v_seq IN
    SELECT sequence_schema, sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE %I.%I RESTART WITH 1', v_seq.sequence_schema, v_seq.sequence_name);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '  ✅ % secuencias reseteadas', v_count;
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL (rápida)
-- ============================================================================
DO $$
DECLARE
  v_tenants INT;
  v_users INT;
  v_roles INT;
  v_lookup_groups INT;
BEGIN
  SELECT COUNT(*) INTO v_tenants FROM public.tenants;
  SELECT COUNT(*) INTO v_users FROM public.users;
  SELECT COUNT(*) INTO v_roles FROM public.roles;
  SELECT COUNT(*) INTO v_lookup_groups FROM public.lookup_groups;

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Tenants: %', v_tenants;
  RAISE NOTICE 'Users: %', v_users;
  RAISE NOTICE 'Roles: %', v_roles;
  RAISE NOTICE 'Lookup Groups: %', v_lookup_groups;
  RAISE NOTICE '============================================================';

  IF v_tenants = 0 AND v_users = 0 AND v_roles = 0 AND v_lookup_groups = 0 THEN
    RAISE NOTICE '✅ FACTORY RESET COMPLETO - Base de datos limpia';
    RAISE NOTICE '➡️  Ejecutar 002_SEED_COMPLETE.sql para insertar datos base';
  ELSE
    RAISE WARNING '⚠️  Algunas tablas no están vacías. Verificar manualmente.';
  END IF;

  RAISE NOTICE '============================================================';
END $$;

COMMIT;

-- ============================================================================
-- FIN
-- ============================================================================
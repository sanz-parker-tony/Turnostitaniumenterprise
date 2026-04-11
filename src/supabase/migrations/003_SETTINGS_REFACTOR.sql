-- ============================================================================
-- 003_SETTINGS_REFACTOR.sql
-- Turnos Titanium Enterprise — REFACTORIZACIÓN DEL MODELO DE PARÁMETROS
-- ============================================================================
-- Descripción:
--   Centraliza la definición de parámetros en la nueva tabla maestra
--   system_settings. Las tablas tenant_settings, company_settings y
--   employee_profile_settings se convierten en tablas de overrides que
--   solo referencian el catálogo maestro.
--
-- Jerarquía de resolución del valor efectivo:
--   employee_profile_settings > company_settings > tenant_settings > system_settings
--
-- CÓMO EJECUTAR:
--   1. Ir a Supabase SQL Editor
--   2. Pegar este archivo completo
--   3. Ejecutar
--   4. Revisar el REPORTE FINAL al fondo (SELECT de verificación)
--
-- IMPORTANTE: Ejecutar DESPUÉS de 000_DDL_REAL.sql + 001_FACTORY_RESET.sql
--             + 002_SEED_COMPLETE.sql
--
-- Última actualización: 2026-03-25
-- ============================================================================

BEGIN;

-- ============================================================================
-- FASE 1: CREAR TABLA MAESTRA system_settings
-- ============================================================================
-- DECISIÓN DE DISEÑO:
--   - value_type_id es nullable (FK a lookup_values) para compatibilidad
--     con instalaciones donde aún no existen los lookup values de DATA_TYPE.
--     Después del SEED, todos los registros tendrán value_type_id NOT NULL.
--   - default_value usa TEXT para soportar todos los tipos de dato.
--   - setting_key tiene CHECK de formato consistente con el proyecto.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id                 uuid             NOT NULL DEFAULT gen_random_uuid(),
  setting_key        character varying NOT NULL,
  setting_name       character varying NOT NULL,
  setting_short_key  character varying NOT NULL,
  value_type_id      uuid,
  default_value      text,
  is_active          boolean          NOT NULL DEFAULT true,
  created_by         character varying NOT NULL DEFAULT 'SYSTEM',
  created_at         timestamp with time zone NOT NULL DEFAULT now(),
  updated_by         character varying,
  updated_at         timestamp with time zone,
  CONSTRAINT system_settings_pkey             PRIMARY KEY (id),
  CONSTRAINT system_settings_setting_key_uq   UNIQUE (setting_key),
  CONSTRAINT system_settings_value_type_fkey  FOREIGN KEY (value_type_id)
      REFERENCES public.lookup_values(id)
);

COMMENT ON TABLE  public.system_settings                IS
  'Catálogo maestro de parámetros del sistema. Define qué parámetros existen, su tipo y valor por defecto. PROHIBIDO ELIMINAR REGISTROS (política sistema).';
COMMENT ON COLUMN public.system_settings.setting_key    IS
  'Clave única del parámetro. Inmutable una vez creado. Formato: MAYÚSCULAS_CON_GUION_BAJO.';
COMMENT ON COLUMN public.system_settings.default_value  IS
  'Valor base del sistema. Las tablas hijas solo guardan overrides, nunca redefinen el parámetro.';
COMMENT ON COLUMN public.system_settings.value_type_id  IS
  'FK a lookup_values del grupo DATA_TYPE. Define el tipo de dato esperado para validación.';

-- ============================================================================
-- FASE 2: MIGRACIÓN DE DATOS EXISTENTES HACIA system_settings
-- Consolida parámetros únicos de tenant_settings, company_settings,
-- employee_profile_settings en el catálogo maestro.
-- ============================================================================

-- 2.1 Desde tenant_settings (tiene setting_short_key, fuente primaria)
INSERT INTO public.system_settings
  (setting_key, setting_name, setting_short_key, value_type_id, default_value, is_active, created_by)
SELECT DISTINCT ON (setting_key)
  setting_key,
  setting_key                             AS setting_name,
  COALESCE(setting_short_key, setting_key) AS setting_short_key,
  value_type_id,
  setting_value                           AS default_value,
  true,
  'MIGRATION_003'
FROM public.tenant_settings
WHERE setting_key IS NOT NULL
ORDER BY setting_key, created_at ASC
ON CONFLICT (setting_key) DO NOTHING;

-- 2.2 Desde company_settings (parámetros no cubiertos por tenant_settings)
INSERT INTO public.system_settings
  (setting_key, setting_name, setting_short_key, value_type_id, default_value, is_active, created_by)
SELECT DISTINCT ON (cs.setting_key)
  cs.setting_key,
  cs.setting_key AS setting_name,
  cs.setting_key AS setting_short_key,
  cs.value_type_id,
  cs.setting_value AS default_value,
  true,
  'MIGRATION_003'
FROM public.company_settings cs
WHERE cs.setting_key IS NOT NULL
  AND cs.setting_key NOT IN (SELECT setting_key FROM public.system_settings)
ORDER BY cs.setting_key, cs.created_at ASC
ON CONFLICT (setting_key) DO NOTHING;

-- 2.3 Desde employee_profile_settings (parámetros no cubiertos por niveles superiores)
INSERT INTO public.system_settings
  (setting_key, setting_name, setting_short_key, value_type_id, default_value, is_active, created_by)
SELECT DISTINCT ON (eps.setting_key)
  eps.setting_key,
  eps.setting_key AS setting_name,
  eps.setting_key AS setting_short_key,
  eps.value_type_id,
  eps.setting_value AS default_value,
  true,
  'MIGRATION_003'
FROM public.employee_profile_settings eps
WHERE eps.setting_key IS NOT NULL
  AND eps.setting_key NOT IN (SELECT setting_key FROM public.system_settings)
ORDER BY eps.setting_key, eps.created_at ASC
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- DIAGNÓSTICO PRE-FASE-3: Detectar conflictos de value_type_id
-- Si el mismo setting_key aparece en múltiples tablas con distinto
-- value_type_id, se registra como conflicto para trazabilidad.
-- ============================================================================

DO $$
DECLARE
  v_conflict RECORD;
  v_conflicts_found integer := 0;
BEGIN
  -- Detectar conflictos: mismo setting_key con distinto value_type_id
  FOR v_conflict IN
    WITH all_settings AS (
      SELECT setting_key, value_type_id, 'tenant_settings' AS source_table FROM public.tenant_settings
        WHERE setting_key IS NOT NULL AND value_type_id IS NOT NULL
      UNION ALL
      SELECT setting_key, value_type_id, 'company_settings' FROM public.company_settings
        WHERE setting_key IS NOT NULL AND value_type_id IS NOT NULL
      UNION ALL
      SELECT setting_key, value_type_id, 'employee_profile_settings' FROM public.employee_profile_settings
        WHERE setting_key IS NOT NULL AND value_type_id IS NOT NULL
    )
    SELECT setting_key, COUNT(DISTINCT value_type_id) AS distinct_types
    FROM all_settings
    GROUP BY setting_key
    HAVING COUNT(DISTINCT value_type_id) > 1
  LOOP
    v_conflicts_found := v_conflicts_found + 1;
    RAISE WARNING
      '⚠️  CONFLICTO DETECTADO: setting_key=''%'' tiene múltiples value_type_id distintos. Revisar manualmente.',
      v_conflict.setting_key;
  END LOOP;

  IF v_conflicts_found = 0 THEN
    RAISE NOTICE '✅ Sin conflictos de value_type_id detectados.';
  ELSE
    RAISE NOTICE '⚠️  % conflicto(s) detectado(s). Ver mensajes WARNING arriba.', v_conflicts_found;
  END IF;
END $$;

-- ============================================================================
-- FASE 3: AGREGAR COLUMNA system_setting_id A LAS TABLAS HIJAS
-- ============================================================================

ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS system_setting_id uuid;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS system_setting_id uuid;

ALTER TABLE public.employee_profile_settings
  ADD COLUMN IF NOT EXISTS system_setting_id uuid,
  ADD COLUMN IF NOT EXISTS company_id uuid;

-- ============================================================================
-- FASE 4: POBLAR system_setting_id EN TABLAS HIJAS (por setting_key)
-- ============================================================================

UPDATE public.tenant_settings ts
SET    system_setting_id = ss.id
FROM   public.system_settings ss
WHERE  ts.setting_key = ss.setting_key
  AND  ts.system_setting_id IS NULL;

UPDATE public.company_settings cs
SET    system_setting_id = ss.id
FROM   public.system_settings ss
WHERE  cs.setting_key = ss.setting_key
  AND  cs.system_setting_id IS NULL;

UPDATE public.employee_profile_settings eps
SET    system_setting_id = ss.id
FROM   public.system_settings ss
WHERE  eps.setting_key = ss.setting_key
  AND  eps.system_setting_id IS NULL;

-- ============================================================================
-- FASE 5: AGREGAR FK CONSTRAINTS A LAS TABLAS HIJAS
-- ============================================================================

DO $$
BEGIN
  -- tenant_settings → system_settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tenant_settings'
      AND constraint_name = 'tenant_settings_system_setting_id_fkey'
  ) THEN
    ALTER TABLE public.tenant_settings
      ADD CONSTRAINT tenant_settings_system_setting_id_fkey
      FOREIGN KEY (system_setting_id) REFERENCES public.system_settings(id);
    RAISE NOTICE '✅ FK tenant_settings → system_settings agregada.';
  END IF;

  -- company_settings → system_settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'company_settings'
      AND constraint_name = 'company_settings_system_setting_id_fkey'
  ) THEN
    ALTER TABLE public.company_settings
      ADD CONSTRAINT company_settings_system_setting_id_fkey
      FOREIGN KEY (system_setting_id) REFERENCES public.system_settings(id);
    RAISE NOTICE '✅ FK company_settings → system_settings agregada.';
  END IF;

  -- employee_profile_settings → system_settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'employee_profile_settings'
      AND constraint_name = 'employee_profile_settings_system_setting_id_fkey'
  ) THEN
    ALTER TABLE public.employee_profile_settings
      ADD CONSTRAINT employee_profile_settings_system_setting_id_fkey
      FOREIGN KEY (system_setting_id) REFERENCES public.system_settings(id);
    RAISE NOTICE '✅ FK employee_profile_settings → system_settings agregada.';
  END IF;

  -- employee_profile_settings → companies (company_id puede ser NULL = aplica a toda la empresa)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'employee_profile_settings'
      AND constraint_name = 'employee_profile_settings_company_id_fkey'
  ) THEN
    ALTER TABLE public.employee_profile_settings
      ADD CONSTRAINT employee_profile_settings_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    RAISE NOTICE '✅ FK employee_profile_settings → companies agregada.';
  END IF;
END $$;

-- ============================================================================
-- FASE 6: UNIQUE CONSTRAINTS EN TABLAS HIJAS
-- DECISIÓN DE DISEÑO:
--   - tenant_settings:           UNIQUE (tenant_id, system_setting_id)
--   - company_settings:          UNIQUE (company_id, system_setting_id)
--   - employee_profile_settings: UNIQUE (tenant_id, employee_profile_id, system_setting_id)
--     Nota: Se usa tenant_id en lugar de company_id como primer elemento porque
--     company_id puede ser NULL (perfiles globales al tenant). Esto garantiza
--     unicidad incluso cuando company_id es NULL, ya que NULL != NULL en PG
--     no aplicaría el constraint correctamente con company_id como primer campo.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tenant_settings'
      AND constraint_name = 'uq_tenant_settings_tenant_setting'
  ) THEN
    ALTER TABLE public.tenant_settings
      ADD CONSTRAINT uq_tenant_settings_tenant_setting
      UNIQUE (tenant_id, system_setting_id);
    RAISE NOTICE '✅ Unique constraint tenant_settings (tenant_id, system_setting_id) agregado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'company_settings'
      AND constraint_name = 'uq_company_settings_company_setting'
  ) THEN
    ALTER TABLE public.company_settings
      ADD CONSTRAINT uq_company_settings_company_setting
      UNIQUE (company_id, system_setting_id);
    RAISE NOTICE '✅ Unique constraint company_settings (company_id, system_setting_id) agregado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'employee_profile_settings'
      AND constraint_name = 'uq_employee_profile_settings_profile_setting'
  ) THEN
    ALTER TABLE public.employee_profile_settings
      ADD CONSTRAINT uq_employee_profile_settings_profile_setting
      UNIQUE (tenant_id, employee_profile_id, system_setting_id);
    RAISE NOTICE '✅ Unique constraint employee_profile_settings (tenant_id, employee_profile_id, system_setting_id) agregado.';
  END IF;
END $$;

-- ============================================================================
-- FASE 7: SEED DE PARÁMETROS BASE DEL SISTEMA
-- Inserta parámetros funcionales con default_value real.
-- Solo inserta si el setting_key no existe ya (idempotente).
-- ============================================================================

DO $$
DECLARE
  v_string_id   uuid;
  v_number_id   uuid;
  v_boolean_id  uuid;
  v_date_id     uuid;
BEGIN
  -- Buscar IDs de tipos de dato del catálogo DATA_TYPE
  SELECT lv.id INTO v_string_id
  FROM public.lookup_values lv
  JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
  WHERE lg.lookup_group_key = 'DATA_TYPE' AND lv.lookup_key = 'STRING' AND lv.is_active = true
  LIMIT 1;

  SELECT lv.id INTO v_number_id
  FROM public.lookup_values lv
  JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
  WHERE lg.lookup_group_key = 'DATA_TYPE' AND lv.lookup_key = 'NUMBER' AND lv.is_active = true
  LIMIT 1;

  SELECT lv.id INTO v_boolean_id
  FROM public.lookup_values lv
  JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
  WHERE lg.lookup_group_key = 'DATA_TYPE' AND lv.lookup_key = 'BOOLEAN' AND lv.is_active = true
  LIMIT 1;

  SELECT lv.id INTO v_date_id
  FROM public.lookup_values lv
  JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
  WHERE lg.lookup_group_key = 'DATA_TYPE' AND lv.lookup_key = 'DATE' AND lv.is_active = true
  LIMIT 1;

  -- Parámetros de Asistencia
  INSERT INTO public.system_settings
    (setting_key, setting_name, setting_short_key, value_type_id, default_value, is_active, created_by)
  VALUES
    ('ATTENDANCE_TIMEZONE',          'Zona Horaria de Asistencia',          'TIMEZONE',      v_string_id,  'America/Lima', true, 'SEED'),
    ('ATTENDANCE_ROUND_MINUTES',      'Minutos de Redondeo de Marcas',       'ROUND_MIN',     v_number_id,  '0',            true, 'SEED'),
    ('ATTENDANCE_ALLOW_MANUAL_PUNCH', 'Permitir Marcación Manual',           'ALLOW_MANUAL',  v_boolean_id, 'false',        true, 'SEED'),
    ('ATTENDANCE_OVERTIME_FACTOR',    'Factor de Horas Extra',               'OT_FACTOR',     v_number_id,  '1.5',          true, 'SEED'),
    ('ATTENDANCE_MIN_HOURS_DAY',      'Horas Mínimas por Día',               'MIN_HRS_DAY',   v_number_id,  '4',            true, 'SEED'),
    ('ATTENDANCE_LATE_TOLERANCE_MIN', 'Tolerancia de Tardanza (minutos)',    'LATE_TOL',      v_number_id,  '5',            true, 'SEED'),
    ('ATTENDANCE_ABSENCE_THRESHOLD',  'Umbral de Ausencia (horas)',          'ABS_THRESH',    v_number_id,  '4',            true, 'SEED'),
    -- Parámetros de Nómina
    ('PAYROLL_PERIOD_TYPE',           'Tipo de Período de Nómina',           'PAY_PERIOD',    v_string_id,  'BIWEEKLY',     true, 'SEED'),
    ('PAYROLL_CURRENCY_CODE',         'Moneda de Nómina',                    'CURRENCY',      v_string_id,  'PEN',          true, 'SEED'),
    ('PAYROLL_EXPORT_FORMAT',         'Formato de Exportación a Nómina',     'PAY_FORMAT',    v_string_id,  'CSV',          true, 'SEED'),
    -- Parámetros de Turnos
    ('SHIFT_ALLOW_OVERLAP',           'Permitir Solapamiento de Turnos',     'ALLOW_OVERLAP', v_boolean_id, 'false',        true, 'SEED'),
    ('SHIFT_MAX_CONSECUTIVE_DAYS',    'Días Consecutivos Máximos',           'MAX_CONSEC',    v_number_id,  '6',            true, 'SEED'),
    ('SHIFT_CHANGE_ADVANCE_DAYS',     'Días de Anticipación Cambio Turno',   'CHG_ADV_DAYS',  v_number_id,  '2',            true, 'SEED'),
    -- Parámetros de Notificaciones
    ('NOTIFICATION_ABSENCE_ENABLED',  'Notificaciones de Ausencia Activas',  'NOTIF_ABS',     v_boolean_id, 'true',         true, 'SEED'),
    ('NOTIFICATION_OVERTIME_ENABLED', 'Notificaciones de Horas Extra',       'NOTIF_OT',      v_boolean_id, 'true',         true, 'SEED'),
    -- Parámetros de Seguridad
    ('SECURITY_SESSION_TIMEOUT_MIN',  'Timeout de Sesión (minutos)',         'SESSION_TO',    v_number_id,  '480',          true, 'SEED'),
    ('SECURITY_MAX_LOGIN_ATTEMPTS',   'Intentos Máximos de Login',           'MAX_LOGIN',     v_number_id,  '5',            true, 'SEED'),
    -- Parámetros Generales
    ('GENERAL_WORKING_WEEK_DAYS',     'Días Laborales de la Semana',         'WORK_DAYS',     v_string_id,  '1,2,3,4,5',   true, 'SEED'),
    ('GENERAL_FISCAL_YEAR_START',     'Inicio del Año Fiscal (MM-DD)',       'FISCAL_START',  v_string_id,  '01-01',        true, 'SEED'),
    ('GENERAL_DEFAULT_LANGUAGE',      'Idioma por Defecto del Sistema',      'DEF_LANG',      v_string_id,  'es',           true, 'SEED')
  ON CONFLICT (setting_key) DO NOTHING;

  RAISE NOTICE '✅ Parámetros base del sistema insertados/verificados.';
END $$;

-- ============================================================================
-- FASE 8: ELIMINAR COLUMNAS ANTIGUAS DE TABLAS HIJAS
-- Las columnas que definían libremente el parámetro ahora viven en
-- system_settings. Se eliminan para evitar redundancia e inconsistencia.
--
-- IMPORTANTE: Verificar que system_setting_id está correctamente poblado
-- antes de ejecutar esta fase. Los registros sin system_setting_id serán
-- registros "huérfanos" y deben revisarse manualmente.
-- ============================================================================

-- Verificar registros huérfanos antes de eliminar columnas
DO $$
DECLARE
  v_orphan_ts  integer;
  v_orphan_cs  integer;
  v_orphan_eps integer;
BEGIN
  SELECT COUNT(*) INTO v_orphan_ts
  FROM public.tenant_settings WHERE system_setting_id IS NULL;

  SELECT COUNT(*) INTO v_orphan_cs
  FROM public.company_settings WHERE system_setting_id IS NULL;

  SELECT COUNT(*) INTO v_orphan_eps
  FROM public.employee_profile_settings WHERE system_setting_id IS NULL;

  IF v_orphan_ts > 0 THEN
    RAISE WARNING '⚠️  tenant_settings tiene % registro(s) sin system_setting_id. Se eliminarán.', v_orphan_ts;
    -- Eliminar huérfanos para no violar NOT NULL futuro
    DELETE FROM public.tenant_settings WHERE system_setting_id IS NULL;
  END IF;

  IF v_orphan_cs > 0 THEN
    RAISE WARNING '⚠️  company_settings tiene % registro(s) sin system_setting_id. Se eliminarán.', v_orphan_cs;
    DELETE FROM public.company_settings WHERE system_setting_id IS NULL;
  END IF;

  IF v_orphan_eps > 0 THEN
    RAISE WARNING '⚠️  employee_profile_settings tiene % registro(s) sin system_setting_id. Se eliminarán.', v_orphan_eps;
    DELETE FROM public.employee_profile_settings WHERE system_setting_id IS NULL;
  END IF;
END $$;

-- Eliminar columnas de definición libre del parámetro
ALTER TABLE public.tenant_settings
  DROP COLUMN IF EXISTS setting_key,
  DROP COLUMN IF EXISTS setting_short_key,
  DROP COLUMN IF EXISTS value_type_id;

ALTER TABLE public.company_settings
  DROP COLUMN IF EXISTS setting_key,
  DROP COLUMN IF EXISTS value_type_id;

ALTER TABLE public.employee_profile_settings
  DROP COLUMN IF EXISTS setting_key,
  DROP COLUMN IF EXISTS value_type_id;

-- ============================================================================
-- FASE 9: CREAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_system_settings_key
  ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_active
  ON public.system_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_system_setting_id
  ON public.tenant_settings(system_setting_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_id
  ON public.tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_system_setting_id
  ON public.company_settings(system_setting_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id
  ON public.company_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_eps_system_setting_id
  ON public.employee_profile_settings(system_setting_id);
CREATE INDEX IF NOT EXISTS idx_eps_profile_id
  ON public.employee_profile_settings(employee_profile_id);

COMMIT;

-- ============================================================================
-- REPORTE FINAL DE VERIFICACIÓN
-- Ejecutar para confirmar que la migración fue exitosa.
-- ============================================================================
SELECT
  'system_settings'          AS tabla,
  COUNT(*)                   AS registros,
  COUNT(*) FILTER (WHERE is_active)  AS activos
FROM public.system_settings
UNION ALL
SELECT
  'tenant_settings',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active)
FROM public.tenant_settings
UNION ALL
SELECT
  'company_settings',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active)
FROM public.company_settings
UNION ALL
SELECT
  'employee_profile_settings',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active)
FROM public.employee_profile_settings
ORDER BY tabla;

-- Verificar columnas de system_settings
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'system_settings'
ORDER BY ordinal_position;

-- Verificar que las columnas antiguas fueron eliminadas de las tablas hijas
SELECT
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns c2
    WHERE c2.table_schema = 'public' AND c2.table_name = t.table_name
      AND c2.column_name = 'setting_key'
  ) THEN '❌ setting_key AÚN EXISTE' ELSE '✅ setting_key ELIMINADO' END AS check_setting_key,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns c2
    WHERE c2.table_schema = 'public' AND c2.table_name = t.table_name
      AND c2.column_name = 'system_setting_id'
  ) THEN '✅ system_setting_id PRESENTE' ELSE '❌ system_setting_id AUSENTE' END AS check_system_setting_id
FROM (VALUES
  ('tenant_settings'),
  ('company_settings'),
  ('employee_profile_settings')
) AS t(table_name);

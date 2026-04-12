-- ============================================================================
-- 003_SETTINGS_REFACTOR_SIMPLE.sql
-- Turnos Titanium Enterprise — SEED DE PARÁMETROS DEL SISTEMA
-- ============================================================================
-- Descripción:
--   Crea la tabla maestra system_settings y siembra los parámetros base.
--   Asume que tenant_settings, company_settings y employee_profile_settings
--   YA están en la estructura refactorizada (con system_setting_id).
--
-- Jerarquía de resolución del valor efectivo:
--   employee_settings > employee_profile_settings > company_settings > tenant_settings > system_settings
--
-- CÓMO EJECUTAR:
--   1. Ir a Supabase SQL Editor
--   2. Pegar este archivo completo
--   3. Ejecutar
--   4. Revisar el REPORTE FINAL al fondo
--
-- IMPORTANTE: Ejecutar DESPUÉS de 001_FACTORY_RESET.sql + 002_SEED_COMPLETE.sql
--
-- Última actualización: 2026-04-11
-- ============================================================================

BEGIN;

-- ============================================================================
-- FASE 1: CREAR TABLA MAESTRA system_settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id                      uuid              NOT NULL DEFAULT gen_random_uuid(),
  setting_key             character varying NOT NULL,
  setting_name            character varying NOT NULL,
  setting_short_key       character varying NOT NULL,
  value_type_id           uuid              NOT NULL,
  default_value           text,
  description             text,
  allowed_lookup_group_id uuid,
  is_active               boolean           NOT NULL DEFAULT true,
  created_by              character varying NOT NULL,
  created_at              timestamp with time zone NOT NULL DEFAULT now(),
  updated_by              character varying,
  updated_at              timestamp with time zone,
  CONSTRAINT system_settings_pkey             PRIMARY KEY (id),
  CONSTRAINT system_settings_setting_key_key  UNIQUE (setting_key),
  CONSTRAINT system_settings_value_type_fkey  FOREIGN KEY (value_type_id)
      REFERENCES public.lookup_values(id),
  CONSTRAINT system_settings_allowed_lookup_group_id_fkey FOREIGN KEY (allowed_lookup_group_id)
      REFERENCES public.lookup_groups(id),
  CONSTRAINT system_settings_setting_key_check CHECK (
    (setting_key::text ~ '^[A-Z0-9_]+$'::text)
    AND (length(setting_key::text) >= 2)
  )
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
-- FASE 2: SEED DE PARÁMETROS BASE DEL SISTEMA
-- ============================================================================

DO $$
DECLARE
  v_string_id   uuid;
  v_number_id   uuid;
  v_boolean_id  uuid;
  v_date_id     uuid;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 SEMBRANDO system_settings';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

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

  IF v_string_id IS NULL THEN
    RAISE WARNING '⚠️  DATA_TYPE.STRING no encontrado en lookup_values';
  END IF;
  IF v_number_id IS NULL THEN
    RAISE WARNING '⚠️  DATA_TYPE.NUMBER no encontrado en lookup_values';
  END IF;
  IF v_boolean_id IS NULL THEN
    RAISE WARNING '⚠️  DATA_TYPE.BOOLEAN no encontrado en lookup_values';
  END IF;

  -- Parámetros de Asistencia
  INSERT INTO public.system_settings
    (setting_key, setting_name, setting_short_key, value_type_id, default_value, description, is_active, created_by)
  VALUES
    ('ATTENDANCE_TIMEZONE',          'Zona Horaria de Asistencia',          'TIMEZONE',      v_string_id,  'America/Lima', 'Zona horaria utilizada para registrar las marcas de asistencia.', true, 'SEED'),
    ('ATTENDANCE_ROUND_MINUTES',      'Minutos de Redondeo de Marcas',       'ROUND_MIN',     v_number_id,  '0',            'Minutos para redondear las marcas de entrada y salida.', true, 'SEED'),
    ('ATTENDANCE_ALLOW_MANUAL_PUNCH', 'Permitir Marcación Manual',           'ALLOW_MANUAL',  v_boolean_id, 'false',        'Permite a los empleados marcar su asistencia manualmente.', true, 'SEED'),
    ('ATTENDANCE_OVERTIME_FACTOR',    'Factor de Horas Extra',               'OT_FACTOR',     v_number_id,  '1.5',          'Factor multiplicador para calcular las horas extra.', true, 'SEED'),
    ('ATTENDANCE_MIN_HOURS_DAY',      'Horas Mínimas por Día',               'MIN_HRS_DAY',   v_number_id,  '4',            'Horas mínimas que un empleado debe trabajar en un día.', true, 'SEED'),
    ('ATTENDANCE_LATE_TOLERANCE_MIN', 'Tolerancia de Tardanza (minutos)',    'LATE_TOL',      v_number_id,  '5',            'Minutos de tolerancia para considerar una entrada como tardía.', true, 'SEED'),
    ('ATTENDANCE_ABSENCE_THRESHOLD',  'Umbral de Ausencia (horas)',          'ABS_THRESH',    v_number_id,  '4',            'Horas de ausencia que se consideran como ausencia.', true, 'SEED'),
    -- Parámetros de Nómina
    ('PAYROLL_PERIOD_TYPE',           'Tipo de Período de Nómina',           'PAY_PERIOD',    v_string_id,  'BIWEEKLY',     'Tipo de período para la nómina (semanal, quincenal, mensual).', true, 'SEED'),
    ('PAYROLL_CURRENCY_CODE',         'Moneda de Nómina',                    'CURRENCY',      v_string_id,  'PEN',          'Moneda utilizada para la nómina.', true, 'SEED'),
    ('PAYROLL_EXPORT_FORMAT',         'Formato de Exportación a Nómina',     'PAY_FORMAT',    v_string_id,  'CSV',          'Formato de archivo para exportar la nómina.', true, 'SEED'),
    -- Parámetros de Turnos
    ('SHIFT_ALLOW_OVERLAP',           'Permitir Solapamiento de Turnos',     'ALLOW_OVERLAP', v_boolean_id, 'false',        'Permite que los turnos se solapen.', true, 'SEED'),
    ('SHIFT_MAX_CONSECUTIVE_DAYS',    'Días Consecutivos Máximos',           'MAX_CONSEC',    v_number_id,  '6',            'Número máximo de días consecutivos que un empleado puede trabajar.', true, 'SEED'),
    ('SHIFT_CHANGE_ADVANCE_DAYS',     'Días de Anticipación Cambio Turno',   'CHG_ADV_DAYS',  v_number_id,  '2',            'Días de anticipación para cambiar de turno.', true, 'SEED'),
    -- Parámetros de Notificaciones
    ('NOTIFICATION_ABSENCE_ENABLED',  'Notificaciones de Ausencia Activas',  'NOTIF_ABS',     v_boolean_id, 'true',         'Habilita las notificaciones de ausencia.', true, 'SEED'),
    ('NOTIFICATION_OVERTIME_ENABLED', 'Notificaciones de Horas Extra',       'NOTIF_OT',      v_boolean_id, 'true',         'Habilita las notificaciones de horas extra.', true, 'SEED'),
    -- Parámetros de Seguridad
    ('SECURITY_SESSION_TIMEOUT_MIN',  'Timeout de Sesión (minutos)',         'SESSION_TO',    v_number_id,  '480',          'Tiempo de inactividad antes de cerrar la sesión.', true, 'SEED'),
    ('SECURITY_MAX_LOGIN_ATTEMPTS',   'Intentos Máximos de Login',           'MAX_LOGIN',     v_number_id,  '5',            'Número máximo de intentos de login permitidos.', true, 'SEED'),
    -- Parámetros Generales
    ('GENERAL_WORKING_WEEK_DAYS',     'Días Laborales de la Semana',         'WORK_DAYS',     v_string_id,  '1,2,3,4,5',    'Días laborales de la semana.', true, 'SEED'),
    ('GENERAL_FISCAL_YEAR_START',     'Inicio del Año Fiscal (MM-DD)',       'FISCAL_START',  v_string_id,  '01-01',        'Fecha de inicio del año fiscal.', true, 'SEED'),
    ('GENERAL_DEFAULT_LANGUAGE',      'Idioma por Defecto del Sistema',      'DEF_LANG',      v_string_id,  'es',           'Idioma por defecto del sistema.', true, 'SEED')
  ON CONFLICT (setting_key) DO NOTHING;

  RAISE NOTICE '✅ Parámetros base del sistema insertados/verificados.';
END $$;

-- ============================================================================
-- FASE 3: CREAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_system_settings_key
  ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_active
  ON public.system_settings(is_active);

-- ============================================================================
-- FASE 4: CREAR TABLA employee_settings (NIVEL 5 — PRIORIDAD MÁXIMA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employee_settings (
  id                  uuid              NOT NULL DEFAULT gen_random_uuid(),
  tenant_id           uuid              NOT NULL,
  employee_id         uuid              NOT NULL,
  system_setting_id   uuid              NOT NULL,
  setting_value       text              NOT NULL,
  is_active           boolean           NOT NULL DEFAULT true,
  created_by          character varying NOT NULL,
  created_at          timestamp with time zone NOT NULL DEFAULT now(),
  updated_by          character varying,
  updated_at          timestamp with time zone,
  CONSTRAINT employee_settings_pkey             PRIMARY KEY (id),
  CONSTRAINT employee_settings_employee_setting_uq UNIQUE (employee_id, system_setting_id),
  CONSTRAINT employee_settings_tenant_id_fkey   FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT employee_settings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id),
  CONSTRAINT employee_settings_system_setting_id_fkey FOREIGN KEY (system_setting_id) REFERENCES public.system_settings(id)
);

COMMENT ON TABLE  public.employee_settings IS
  'Override personal de parámetros a nivel empleado individual. Nivel 5 de jerarquía (prioridad máxima). Sobreescribe perfil, compañía, tenant y default del sistema.';
COMMENT ON COLUMN public.employee_settings.setting_value IS
  'Valor personalizado del parámetro para este empleado. Solo se crea si difiere de su perfil/compañía/tenant.';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_employee_settings_system_setting_id
  ON public.employee_settings(system_setting_id);
CREATE INDEX IF NOT EXISTS idx_employee_settings_employee_id
  ON public.employee_settings(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_settings_tenant_id
  ON public.employee_settings(tenant_id);

COMMIT;

-- ============================================================================
-- REPORTE FINAL DE VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎉 REFACTORIZACIÓN COMPLETADA';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  SELECT COUNT(*) INTO v_count FROM public.system_settings;
  RAISE NOTICE '✅ system_settings: % parámetros', v_count;

  SELECT COUNT(*) INTO v_count FROM public.tenant_settings;
  RAISE NOTICE '   tenant_settings: % overrides', v_count;

  SELECT COUNT(*) INTO v_count FROM public.company_settings;
  RAISE NOTICE '   company_settings: % overrides', v_count;

  SELECT COUNT(*) INTO v_count FROM public.employee_profile_settings;
  RAISE NOTICE '   employee_profile_settings: % overrides', v_count;

  SELECT COUNT(*) INTO v_count FROM public.employee_settings;
  RAISE NOTICE '   employee_settings: % overrides', v_count;

  RAISE NOTICE '';
  RAISE NOTICE '🚀 Listo para usar el sistema de parámetros jerárquico';
  RAISE NOTICE '';
END $$;

-- Verificar parámetros sembrados
SELECT
  setting_key,
  setting_name,
  setting_short_key,
  default_value
FROM public.system_settings
ORDER BY setting_key;
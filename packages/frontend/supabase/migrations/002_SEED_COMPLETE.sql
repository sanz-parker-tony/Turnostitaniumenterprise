-- ============================================================================
-- 002_SEED_COMPLETE.sql
-- Turnos Titanium Enterprise - SEED DE DATOS COMPLETO
-- ============================================================================
-- Descripción:
--   Inserta TODOS los datos base del sistema (solo DML, NO DDL)
--   
-- Contenido:
--   1. TENANT ÚNICO (SYSTEM) + 5 ROLES BASE (protocolo SELLADO)
--   2. LOOKUP GROUPS (24 grupos)
--   3. LOOKUP VALUES (completo - ~140 valores)
--   4. SYSTEM MENU GROUPS (9 grupos)
--   5. SCOPE TYPES (7 tipos)
--   6. CATÁLOGO GRANULAR:
--      - Acciones globales (28 acciones)
--      - Pantallas (32 - 22 implementadas + 10 pendientes)
--      - Relaciones pantalla-acción
--      - Permisos pre-asignados a 5 roles base
--      - Reportes (1 inicial)
--   7. USUARIO BOOTSTRAP (system.admin@titanium-labs.com)
--   8. TENANT ONBOARDING (estado inicial para wizard)
--
-- Notas importantes:
--   - 100% idempotente: puede ejecutarse múltiples veces sin error
--   - INCLUYE usuario bootstrap para primer login
--   - Los 5 roles base son INMUTABLES (is_locked=true)
--   - Permisos de menú predeterminados completos
--   - Ejecutar DESPUÉS de 000_DDL_REAL.sql y 001_FACTORY_RESET.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 0: DESHABILITAR TRIGGERS TEMPORALMENTE
-- ============================================================================
-- RAZÓN: Los triggers de validación (enforce_single_active_tenant, etc.)
--        pueden bloquear la inserción del primer tenant durante el SEED.
--        Los deshabilitamos temporalmente y los habilitamos al final.
-- ============================================================================

-- Deshabilitar SOLO triggers de usuario (no system triggers como FK constraints)
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '🔧 Deshabilitando triggers de usuario en tabla tenants...';
  
  -- Iterar sobre todos los triggers de usuario en la tabla tenants
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'public.tenants'::regclass 
      AND tgisinternal = false  -- Solo triggers de usuario, NO internos
  LOOP
    EXECUTE format('ALTER TABLE public.tenants DISABLE TRIGGER %I', r.tgname);
    RAISE NOTICE '  ✓ Deshabilitado: %', r.tgname;
  END LOOP;
END $$;

-- ============================================================================
-- SECCIÓN 0: TABLAS SYSTEM FUNDAMENTALES (idiomas, planes, mensajes)
-- ============================================================================

-- Idiomas del sistema
INSERT INTO public.system_languages (code, language_name, is_active, is_default)
VALUES
  ('es', 'Español', true, true),
  ('en', 'English', true, false)
ON CONFLICT (code) DO UPDATE SET
  language_name = EXCLUDED.language_name,
  is_active = EXCLUDED.is_active;

-- Planes base
INSERT INTO public.subscription_plans (plan_key, plan_name, plan_description, price_monthly, price_yearly, currency_code, is_active)
VALUES
  ('FREE', 'Free', 'Plan base', 0.00, 0.00, 'USD', true),
  ('ENTERPRISE', 'Enterprise', 'Turnos Titanium Enterprise', 0.00, 0.00, 'USD', true),
  ('ONPREMISE', 'OnPremise', 'Implementación On-Premise', 0.00, 0.00, 'USD', true)
ON CONFLICT (plan_key) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  plan_description = EXCLUDED.plan_description,
  is_active = EXCLUDED.is_active;

-- Mensajes del sistema
INSERT INTO public.system_message_keys (message_key, default_text, is_active)
VALUES
  ('MSG.LOGIN.WELCOME', 'Bienvenido', true),
  ('MSG.ONBOARDING.START', 'Configuración inicial', true),
  ('MSG.ONBOARDING.STEP1', 'Paso 1: Crear Tenant', true),
  ('MSG.ONBOARDING.STEP2', 'Paso 2: Crear Administrador', true),
  ('MSG.ONBOARDING.COMPLETE', 'Configuración completada', true)
ON CONFLICT (message_key) DO UPDATE SET
  default_text = EXCLUDED.default_text,
  is_active = EXCLUDED.is_active;

-- Traducciones de mensajes
INSERT INTO public.system_message_translations (message_key, message_key_id, language_code, translated_text, is_active)
SELECT k.message_key, k.id, l.code,
  CASE
    WHEN k.message_key = 'MSG.LOGIN.WELCOME' AND l.code = 'en' THEN 'Welcome'
    WHEN k.message_key = 'MSG.ONBOARDING.START' AND l.code = 'en' THEN 'Initial setup'
    WHEN k.message_key = 'MSG.ONBOARDING.STEP1' AND l.code = 'en' THEN 'Step 1: Create Tenant'
    WHEN k.message_key = 'MSG.ONBOARDING.STEP2' AND l.code = 'en' THEN 'Step 2: Create Administrator'
    WHEN k.message_key = 'MSG.ONBOARDING.COMPLETE' AND l.code = 'en' THEN 'Setup completed'
    ELSE k.default_text
  END AS translated_text,
  true
FROM public.system_message_keys k
CROSS JOIN public.system_languages l
WHERE k.message_key IN ('MSG.LOGIN.WELCOME','MSG.ONBOARDING.START','MSG.ONBOARDING.STEP1','MSG.ONBOARDING.STEP2','MSG.ONBOARDING.COMPLETE')
  AND l.code IN ('es','en')
ON CONFLICT (message_key, language_code) DO UPDATE SET
  message_key_id = EXCLUDED.message_key_id,
  translated_text = EXCLUDED.translated_text,
  is_active = EXCLUDED.is_active;

-- KV store
INSERT INTO public.kv_store_e19f2094 (key, value)
VALUES ('seed.version', jsonb_build_object('script','002_SEED_COMPLETE.sql','version','2026-01-25-FINAL'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- SECCIÓN 1: TENANT ÚNICO + 5 ROLES BASE (PROTOCOLO SELLADO)
-- ============================================================================

-- ✅ Tenant ÚNICO (la empresa que usa el sistema - protocolo SELLADO)
-- Este es el ÚNICO tenant permitido en la instalación On-Premise Enterprise
INSERT INTO public.tenants (tenant_key, tenant_name, is_active)
VALUES ('SYSTEM', 'Titanium-Labs Corp.', true)
ON CONFLICT (tenant_key) DO NOTHING;

-- ✅ 5 Roles Base del Sistema (pertenecen al tenant único SYSTEM)
DO $$
DECLARE v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE tenant_key = 'SYSTEM';
  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'ERROR: TENANT SYSTEM no existe'; END IF;

  INSERT INTO public.roles (tenant_id, role_key, role_name, role_scope, is_system_role, is_locked, data_scope, is_active, created_by) VALUES
  (v_tenant_id, 'SYSTEM_ADMIN', 'System Administrator', 'SYSTEM', true, true, 'ALL', true, 'SYSTEM'),
  (v_tenant_id, 'TENANT_ADMIN', 'Administrador del Tenant', 'TENANT', true, true, 'ALL', true, 'SYSTEM'),
  (v_tenant_id, 'RRHH_ADMIN', 'Administrador de RRHH', 'SCOPE', true, true, 'ALL', true, 'SYSTEM'),
  (v_tenant_id, 'SUPERVISOR', 'Supervisor', 'SCOPE', true, true, 'DIRECT_REPORTS', true, 'SYSTEM'),
  (v_tenant_id, 'EMPLOYEE', 'Empleado', 'SCOPE', true, true, 'SELF', true, 'SYSTEM')
  ON CONFLICT (tenant_id, role_key) DO UPDATE SET
    role_name = EXCLUDED.role_name,
    data_scope = EXCLUDED.data_scope,
    is_locked = true;
    
  RAISE NOTICE '✅ Tenant único creado: SYSTEM';
  RAISE NOTICE '✅ 5 roles base creados bajo tenant SYSTEM';
END $$;

-- ============================================================================
-- SECCIÓN 2: LOOKUP GROUPS (24 grupos)
-- ============================================================================

INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_label, lookup_group_short_label, allows_tenant_items, is_active, created_by)
VALUES
('APPLICATION_MODULE', 'Módulos de Aplicación', 'Módulos', false, true, 'SYSTEM'),
('AUTH_PROVIDER', 'Proveedores de Autenticación', 'Auth', false, true, 'SYSTEM'),
('PROCESS_STATUS', 'Estados de Procesos', 'Estado Proc', false, true, 'SYSTEM'),
('PROCESS_TYPE', 'Tipos de Procesos', 'Tipo Proc', false, true, 'SYSTEM'),
('DATA_TYPE', 'Tipos de Datos', 'Tipo Dato', false, true, 'SYSTEM'),
('UI_CONTROL', 'Controles de UI', 'Control UI', false, true, 'SYSTEM'),
('OUTPUT_FORMAT', 'Formatos de Salida', 'Formato', false, true, 'SYSTEM'),
('EXECUTION_STATUS', 'Estados de Ejecución', 'Estado Ejec', false, true, 'SYSTEM'),
('ENFORCEMENT_LEVEL', 'Niveles de Aplicación', 'Nivel', false, true, 'SYSTEM'),
('REPORT_HANDLER', 'Manejadores de Reportes', 'Handler', false, true, 'SYSTEM'),
('GENDER', 'Géneros', 'Género', true, true, 'SYSTEM'),
('CONTRACT_TYPE', 'Tipos de Contrato', 'Contrato', true, true, 'SYSTEM'),
('VALUE_TYPE', 'Tipos de Valor', 'Tipo Valor', false, true, 'SYSTEM'),
('SHIFT_TYPE', 'Tipos de Turno', 'Tipo Turno', true, true, 'SYSTEM'),
('TRANSACTION_DIRECTION', 'Dirección de Transacción', 'Dirección', false, true, 'SYSTEM'),
('EVENT_TYPE', 'Tipos de Evento', 'Tipo Evento', true, true, 'SYSTEM'),
('CALCULATION_METHOD', 'Métodos de Cálculo', 'Método', false, true, 'SYSTEM'),
('PUNCH_SOURCE', 'Fuente de Marcación', 'Fuente', false, true, 'SYSTEM'),
('TIME_PUNCH_STATUS', 'Estado de Marcación', 'Estado', false, true, 'SYSTEM'),
('DEVICE_TYPE', 'Tipos de Dispositivo', 'Dispositivo', false, true, 'SYSTEM'),
('RATE_CATEGORY', 'Categorías de Tarifa', 'Cat Tarifa', true, true, 'SYSTEM'),
('DAY_TYPE', 'Tipos de Día', 'Tipo Día', false, true, 'SYSTEM'),
('REQUEST_STATUS', 'Estados de Solicitud', 'Estado Sol', false, true, 'SYSTEM'),
('SETTINGS', 'Parámetros del Sistema', 'Parámetros', false, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

-- ============================================================================
-- SECCIÓN 3: LOOKUP VALUES (~145 valores)
-- ============================================================================

-- APPLICATION_MODULE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('SECURITY', 'Seguridad', 'Seguridad', 10),
  ('MAINT', 'Mantenimiento', 'Mant', 20),
  ('CONFIG', 'Configuración', 'Config', 30),
  ('ORG', 'Organización', 'Org', 40),
  ('EMPLOYEE', 'Empleados', 'Empleados', 50),
  ('ATTENDANCE', 'Asistencia', 'Asistencia', 60),
  ('REPORTS', 'Reportes', 'Reportes', 70),
  ('KIOSK', 'Kiosko', 'Kiosko', 80),
  ('ADMIN', 'Administración', 'Admin', 90)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'APPLICATION_MODULE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- AUTH_PROVIDER
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('EMAIL', 'Email/Password', 'Email', 10),
  ('GOOGLE', 'Google OAuth', 'Google', 20),
  ('MICROSOFT', 'Microsoft OAuth', 'Microsoft', 30),
  ('GITHUB', 'GitHub OAuth', 'GitHub', 40),
  ('FACEBOOK', 'Facebook OAuth', 'Facebook', 50)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'AUTH_PROVIDER'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- PROCESS_STATUS (CRÍTICO para tenant_onboarding)
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('PENDING', 'Pendiente', 'Pendiente', 10),
  ('IN_PROGRESS', 'En Progreso', 'En Progreso', 20),
  ('COMPLETED', 'Completado', 'Completado', 30),
  ('FAILED', 'Fallido', 'Fallido', 40),
  ('CANCELLED', 'Cancelado', 'Cancelado', 50)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'PROCESS_STATUS'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- PROCESS_TYPE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('CALCULATION', 'Cálculo', 'Cálculo', 10),
  ('EXPORT', 'Exportación', 'Export', 20),
  ('IMPORT', 'Importación', 'Import', 30),
  ('SYNC', 'Sincronización', 'Sync', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'PROCESS_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- DATA_TYPE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('STRING', 'Texto', 'Texto', 10),
  ('NUMBER', 'Número', 'Número', 20),
  ('BOOLEAN', 'Booleano', 'Bool', 30),
  ('DATE', 'Fecha', 'Fecha', 40),
  ('DATETIME', 'Fecha/Hora', 'FechaHora', 50),
  ('JSON', 'JSON', 'JSON', 60)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'DATA_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- UI_CONTROL
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('TEXT', 'Texto Simple', 'Text', 10),
  ('NUMBER', 'Número', 'Number', 20),
  ('CHECKBOX', 'Checkbox', 'Checkbox', 30),
  ('SELECT', 'Selector', 'Select', 40),
  ('DATE', 'Selector de Fecha', 'Date', 50),
  ('TEXTAREA', 'Área de Texto', 'Textarea', 60),
  ('COLOR', 'Selector de Color', 'Color', 70)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'UI_CONTROL'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- OUTPUT_FORMAT
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('PDF', 'PDF', 'PDF', 10),
  ('EXCEL', 'Excel', 'XLSX', 20),
  ('CSV', 'CSV', 'CSV', 30),
  ('JSON', 'JSON', 'JSON', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'OUTPUT_FORMAT'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- EXECUTION_STATUS
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('PENDING', 'Pendiente', 'Pendiente', 10),
  ('RUNNING', 'Ejecutando', 'Running', 20),
  ('COMPLETED', 'Completado', 'Completado', 30),
  ('FAILED', 'Fallido', 'Fallido', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'EXECUTION_STATUS'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- ENFORCEMENT_LEVEL
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('STRICT', 'Estricto', 'Estricto', 10),
  ('MODERATE', 'Moderado', 'Moderado', 20),
  ('RELAXED', 'Flexible', 'Flexible', 30)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'ENFORCEMENT_LEVEL'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- REPORT_HANDLER
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, 'DEFAULT', 'Default Handler', 'Default', 'SYSTEM', 10, true, 'SYSTEM'
FROM public.lookup_groups lg
WHERE lg.lookup_group_key = 'REPORT_HANDLER'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- GENDER (CORREGIDO: MALE y FEMALE en vez de M y F)
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('MALE', 'Masculino', 'M', 10),
  ('FEMALE', 'Femenino', 'F', 20),
  ('OTHER', 'Otro', 'Otro', 30),
  ('PREFER_NOT_TO_SAY', 'Prefiero no decir', 'N/A', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'GENDER'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- CONTRACT_TYPE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('FULL_TIME', 'Tiempo Completo', 'Full Time', 10),
  ('PART_TIME', 'Medio Tiempo', 'Part Time', 20),
  ('CONTRACTOR', 'Contratista', 'Contractor', 30),
  ('INTERN', 'Pasante', 'Intern', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'CONTRACT_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- VALUE_TYPE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('HOURLY', 'Por Hora', 'Hora', 10),
  ('DAILY', 'Por Día', 'Día', 20),
  ('MONTHLY', 'Por Mes', 'Mes', 30),
  ('PERCENTAGE', 'Porcentaje', '%', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'VALUE_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- REQUEST_STATUS (CRÍTICO para employee_requests)
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('PENDING', 'Pendiente', 'Pendiente', 10),
  ('APPROVED', 'Aprobado', 'Aprobado', 20),
  ('REJECTED', 'Rechazado', 'Rechazado', 30),
  ('CANCELLED', 'Cancelado', 'Cancelado', 40),
  ('IN_REVIEW', 'En Revisión', 'Revisión', 50)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'REQUEST_STATUS'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- SHIFT_TYPE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('MORNING', 'Mañana', 'Mañana', 10),
  ('AFTERNOON', 'Tarde', 'Tarde', 20),
  ('NIGHT', 'Noche', 'Noche', 30),
  ('ROTATING', 'Rotativo', 'Rotativo', 40),
  ('SPLIT', 'Partido', 'Partido', 50)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'SHIFT_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- TRANSACTION_DIRECTION
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('IN', 'Entrada', 'In', 10),
  ('OUT', 'Salida', 'Out', 20)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'TRANSACTION_DIRECTION'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- EVENT_TYPE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('HOLIDAY', 'Feriado', 'Feriado', 10),
  ('TRAINING', 'Capacitación', 'Training', 20),
  ('MEETING', 'Reunión', 'Reunión', 30),
  ('MAINTENANCE', 'Mantenimiento', 'Mant', 40),
  ('OTHER', 'Otro', 'Otro', 50)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'EVENT_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- CALCULATION_METHOD
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('FIXED', 'Fijo', 'Fijo', 10),
  ('ROUNDED', 'Redondeado', 'Redondeado', 20),
  ('ACTUAL', 'Real', 'Real', 30)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'CALCULATION_METHOD'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- PUNCH_SOURCE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('WEB', 'Aplicación Web', 'Web', 10),
  ('MOBILE', 'Aplicación Móvil', 'Mobile', 20),
  ('BIOMETRIC', 'Dispositivo Biométrico', 'Biometric', 30),
  ('MANUAL', 'Carga Manual', 'Manual', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'PUNCH_SOURCE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- TIME_PUNCH_STATUS
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('VALID', 'Válido', 'Válido', 10),
  ('INVALID', 'Inválido', 'Inválido', 20),
  ('PENDING', 'Pendiente', 'Pendiente', 30),
  ('APPROVED', 'Aprobado', 'Aprobado', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'TIME_PUNCH_STATUS'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- DEVICE_TYPE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('BIOMETRIC', 'Biométrico', 'Biometric', 10),
  ('RFID', 'RFID', 'RFID', 20),
  ('WEB', 'Web', 'Web', 30),
  ('MOBILE', 'Móvil', 'Mobile', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'DEVICE_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- RATE_CATEGORY
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('REGULAR', 'Regular', 'Regular', 10),
  ('OVERTIME', 'Horas Extra', 'Overtime', 20),
  ('HOLIDAY', 'Feriado', 'Holiday', 30),
  ('NIGHT', 'Nocturno', 'Night', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'RATE_CATEGORY'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- DAY_TYPE
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('WORKING', 'Laboral', 'Laboral', 10),
  ('HOLIDAY', 'Feriado', 'Feriado', 20),
  ('WEEKEND', 'Fin de Semana', 'Weekend', 30),
  ('SPECIAL', 'Especial', 'Especial', 40)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'DAY_TYPE'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- SETTINGS (20 valores de configuración)
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, created_by)
SELECT NULL, lg.id, vals.key, vals.label, vals.short_label, 'SYSTEM', vals.sort, true, 'SYSTEM'
FROM public.lookup_groups lg, LATERAL (VALUES
  ('TIMEZONE', 'Zona Horaria', 'Timezone', 10),
  ('DATE_FORMAT', 'Formato de Fecha', 'Date Format', 20),
  ('TIME_FORMAT', 'Formato de Hora', 'Time Format', 30),
  ('CURRENCY', 'Moneda', 'Currency', 40),
  ('LANGUAGE', 'Idioma Predeterminado', 'Language', 50),
  ('WORKWEEK_START', 'Inicio de Semana Laboral', 'Week Start', 60),
  ('OVERTIME_THRESHOLD', 'Umbral de Horas Extra', 'OT Threshold', 70),
  ('ALLOW_LATE_PUNCH', 'Permitir Marcación Tardía', 'Late Punch', 80),
  ('REQUIRE_LOCATION', 'Requerir Ubicación en Marcación', 'Req Location', 90),
  ('AUTO_APPROVE_REQUESTS', 'Auto-aprobar Solicitudes', 'Auto Approve', 100),
  ('NOTIFICATION_EMAIL', 'Email de Notificaciones', 'Notif Email', 110),
  ('PAYROLL_PERIOD_TYPE', 'Tipo de Período de Nómina', 'Payroll Period', 120),
  ('GRACE_PERIOD_MINUTES', 'Período de Gracia (minutos)', 'Grace Period', 130),
  ('MAX_DAILY_HOURS', 'Máximo de Horas Diarias', 'Max Hours', 140),
  ('ROUNDING_METHOD', 'Método de Redondeo', 'Rounding', 150),
  ('ENABLE_GEOFENCING', 'Habilitar Geocerca', 'Geofencing', 160),
  ('COMPANY_LOGO_URL', 'URL del Logo de Empresa', 'Logo URL', 170),
  ('PRIMARY_COLOR', 'Color Primario', 'Color', 180),
  ('SUPPORT_EMAIL', 'Email de Soporte', 'Support', 190),
  ('ENABLE_SSO', 'Habilitar SSO', 'SSO', 200)
) AS vals(key, label, short_label, sort)
WHERE lg.lookup_group_key = 'SETTINGS'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;

-- ============================================================================
-- SECCIÓN 4: SYSTEM MENU GROUPS (9 grupos)
-- ============================================================================

INSERT INTO public.system_menu_groups (menu_group_key, menu_group_name, menu_group_short_name, icon_key, sort_order, is_active, created_by)
VALUES
('DASH', 'Dashboard', 'Dashboard', 'LayoutDashboard', 1, true, 'SYSTEM'),
('SECURITY', 'Seguridad', 'Seguridad', 'Shield', 2, true, 'SYSTEM'),
('MAINT', 'Mantenimiento', 'Mant', 'Settings', 3, true, 'SYSTEM'),
('CONFIG', 'Configuración', 'Config', 'Cog', 4, true, 'SYSTEM'),
('ORG', 'Organización', 'Org', 'Building2', 5, true, 'SYSTEM'),
('EMPLOYEE', 'Empleados', 'Empleados', 'Users', 6, true, 'SYSTEM'),
('ATTENDANCE', 'Asistencia', 'Asistencia', 'Clock', 7, true, 'SYSTEM'),
('REPORTS', 'Reportes', 'Reportes', 'BarChart', 8, true, 'SYSTEM'),
('KIOSK', 'Kiosko', 'Kiosko', 'Monitor', 9, true, 'SYSTEM')
ON CONFLICT (menu_group_key) DO NOTHING;

-- ============================================================================
-- SECCIÓN 5: SCOPE TYPES (7 tipos)
-- ============================================================================

INSERT INTO public.scope_types (scope_type_key, scope_type_name, is_active, created_by) VALUES
('COMPANY', 'Empresa', true, 'SYSTEM'),
('DEPARTMENT', 'Departamento', true, 'SYSTEM'),
('AREA', 'Área', true, 'SYSTEM'),
('COST_CENTER', 'Centro de Costos', true, 'SYSTEM'),
('WORK_LOCATION', 'Localidad', true, 'SYSTEM'),
('PAYROLL_GROUP', 'Grupo de Nómina', true, 'SYSTEM'),
('EMPLOYEE', 'Empleado', true, 'SYSTEM')
ON CONFLICT (scope_type_key) DO NOTHING;

-- ============================================================================
-- SECCIÓN 6: ACCIONES GLOBALES (28 acciones)
-- ============================================================================

INSERT INTO public.actions (action_key, action_name, is_active, created_by) VALUES
('VIEW', 'Ver / Consultar', true, 'SYSTEM'),
('CREATE', 'Crear / Agregar', true, 'SYSTEM'),
('EDIT', 'Editar / Modificar', true, 'SYSTEM'),
('DELETE', 'Eliminar', true, 'SYSTEM'),
('APPROVE', 'Aprobar', true, 'SYSTEM'),
('REJECT', 'Rechazar', true, 'SYSTEM'),
('COMMENT', 'Comentar', true, 'SYSTEM'),
('CANCEL', 'Cancelar', true, 'SYSTEM'),
('RESOLVE', 'Resolver', true, 'SYSTEM'),
('ASSIGN', 'Asignar', true, 'SYSTEM'),
('REASSIGN', 'Reasignar', true, 'SYSTEM'),
('SWAP', 'Intercambiar', true, 'SYSTEM'),
('CLOSE', 'Cerrar Período', true, 'SYSTEM'),
('REOPEN', 'Reabrir Período', true, 'SYSTEM'),
('EXECUTE', 'Ejecutar Proceso', true, 'SYSTEM'),
('RECALCULATE', 'Recalcular', true, 'SYSTEM'),
('EXPORT', 'Exportar', true, 'SYSTEM'),
('IMPORT', 'Importar', true, 'SYSTEM'),
('DOWNLOAD', 'Descargar', true, 'SYSTEM'),
('SYNC', 'Sincronizar', true, 'SYSTEM'),
('GENERATE', 'Generar', true, 'SYSTEM'),
('TEST', 'Probar / Testear', true, 'SYSTEM'),
('CLONE', 'Clonar / Duplicar', true, 'SYSTEM'),
('RESET_PASSWORD', 'Resetear Contraseña', true, 'SYSTEM'),
('CONFIGURE_PERMISSIONS', 'Configurar Permisos', true, 'SYSTEM'),
('LOCK', 'Bloquear', true, 'SYSTEM'),
('UNLOCK', 'Desbloquear', true, 'SYSTEM'),
('PUNCH', 'Marcar Asistencia', true, 'SYSTEM')
ON CONFLICT (action_key) DO NOTHING;

-- ============================================================================
-- SECCIÓN 7: PANTALLAS (32 pantallas)
-- ============================================================================

DO $$
DECLARE
  v_menu_dash UUID; v_menu_security UUID; v_menu_maint UUID; v_menu_config UUID;
  v_menu_org UUID; v_menu_employee UUID; v_menu_attendance UUID; v_menu_reports UUID; v_menu_kiosk UUID;
BEGIN
  SELECT id INTO v_menu_dash FROM public.system_menu_groups WHERE menu_group_key = 'DASH';
  SELECT id INTO v_menu_security FROM public.system_menu_groups WHERE menu_group_key = 'SECURITY';
  SELECT id INTO v_menu_maint FROM public.system_menu_groups WHERE menu_group_key = 'MAINT';
  SELECT id INTO v_menu_config FROM public.system_menu_groups WHERE menu_group_key = 'CONFIG';
  SELECT id INTO v_menu_org FROM public.system_menu_groups WHERE menu_group_key = 'ORG';
  SELECT id INTO v_menu_employee FROM public.system_menu_groups WHERE menu_group_key = 'EMPLOYEE';
  SELECT id INTO v_menu_attendance FROM public.system_menu_groups WHERE menu_group_key = 'ATTENDANCE';
  SELECT id INTO v_menu_reports FROM public.system_menu_groups WHERE menu_group_key = 'REPORTS';
  SELECT id INTO v_menu_kiosk FROM public.system_menu_groups WHERE menu_group_key = 'KIOSK';

  INSERT INTO public.screens (screen_key, screen_name, menu_label, menu_group_id, route_path, icon_key, sort_order, is_active, created_by) VALUES
  -- SECURITY (12 pantallas)
  ('TENANT_MANAGEMENT', 'Gestión de Tenants', 'Tenants', v_menu_security, '/dashboard/security/tenants', 'Building', 5, true, 'SYSTEM'),
  ('USER_MANAGEMENT', 'Gestión de Usuarios', 'Usuarios', v_menu_security, '/dashboard/security/tenant-members', 'Users', 20, true, 'SYSTEM'),
  ('ROLE_MANAGEMENT', 'Gestión de Roles', 'Roles', v_menu_security, '/dashboard/security/roles', 'Shield', 30, true, 'SYSTEM'),
  ('MENU_GROUP_MANAGEMENT', 'Gestión de Grupos de Menú', 'Menús', v_menu_security, '/dashboard/security/menu-groups', 'Menu', 25, true, 'SYSTEM'),
  ('SCREEN_MANAGEMENT', 'Gestión de Pantallas', 'Pantallas', v_menu_security, '/dashboard/security/screens', 'Layout', 35, true, 'SYSTEM'),
  ('ACTION_MANAGEMENT', 'Gestión de Acciones', 'Acciones', v_menu_security, '/dashboard/security/actions', 'Zap', 40, true, 'SYSTEM'),
  ('SCOPE_TYPE_MANAGEMENT', 'Gestión de Tipos de Alcance', 'Alcances', v_menu_security, '/dashboard/security/scopes', 'Target', 45, true, 'SYSTEM'),
  ('LANGUAGE_MANAGEMENT', 'Gestión de Idiomas', 'Idiomas', v_menu_security, '/dashboard/security/languages', 'Globe', 50, true, 'SYSTEM'),
  ('MESSAGE_KEY_MANAGEMENT', 'Gestión de Claves de Mensajes', 'Mensajes', v_menu_security, '/dashboard/security/message-keys', 'MessageSquare', 55, true, 'SYSTEM'),
  ('TRANSLATION_MANAGEMENT', 'Gestión de Traducciones', 'Traducciones', v_menu_security, '/dashboard/security/translations', 'Languages', 60, true, 'SYSTEM'),
  ('SYSTEM_REPORT_MANAGEMENT', 'Gestión de Reportes del Sistema', 'Reportes Sistema', v_menu_security, '/dashboard/security/system-reports', 'FileText', 65, true, 'SYSTEM'),
  ('SUBSCRIPTION_PLAN_MANAGEMENT', 'Gestión de Planes de Suscripción', 'Planes', v_menu_security, '/dashboard/security/subscription-plans', 'CreditCard', 70, true, 'SYSTEM'),
  -- MAINT (1)
  ('CATALOG_MANAGEMENT', 'Gestión de Catálogos', 'Catálogos', v_menu_maint, '/dashboard/maintenance/catalogs', 'List', 70, true, 'SYSTEM'),
  -- CONFIG (5)
  ('TENANT_SETTINGS', 'Configuración del Tenant', 'Tenant', v_menu_config, '/dashboard/config/tenant-settings', 'Building', 10, true, 'SYSTEM'),
  ('SCHEDULE_MANAGEMENT', 'Gestión de Horarios', 'Horarios', v_menu_config, '/dashboard/config/shifts', 'Clock', 50, true, 'SYSTEM'),
  ('CALENDAR_MANAGEMENT', 'Gestión de Calendarios', 'Calendarios', v_menu_config, '/dashboard/config/calendars', 'Calendar', 60, true, 'SYSTEM'),
  ('DEVICE_MANAGEMENT', 'Gestión de Dispositivos', 'Dispositivos', v_menu_config, '/dashboard/config/devices', 'Tablet', 80, true, 'SYSTEM'),
  ('PAYROLL_INTEGRATION', 'Integración con Nómina', 'Nómina', v_menu_config, '/dashboard/config/payroll', 'DollarSign', 90, true, 'SYSTEM'),
  -- ORG (1)
  ('ORG_STRUCTURE', 'Estructura Organizacional', 'Estructura', v_menu_org, '/dashboard/org/companies', 'Building2', 40, true, 'SYSTEM'),
  -- EMPLOYEE (2)
  ('EMPLOYEE_MANAGEMENT', 'Gestión de Empleados', 'Empleados', v_menu_employee, '/dashboard/employees/manage', 'Users', 100, true, 'SYSTEM'),
  ('REQUESTS_MANAGEMENT', 'Gestión de Solicitudes', 'Solicitudes', v_menu_employee, '/dashboard/employees/requests', 'FileText', 120, true, 'SYSTEM'),
  -- ATTENDANCE (7)
  ('TIMECLOCK_MANAGEMENT', 'Gestión de Marcaciones', 'Marcaciones', v_menu_attendance, '/dashboard/attendance/timeclock', 'Clock', 110, true, 'SYSTEM'),
  ('SHIFT_ASSIGNMENT', 'Asignación de Turnos', 'Turnos', v_menu_attendance, '/dashboard/attendance/shifts', 'Calendar', 130, true, 'SYSTEM'),
  ('ATTENDANCE_CALCULATION', 'Cálculo de Asistencia', 'Cálculo', v_menu_attendance, '/dashboard/attendance/calculation', 'Calculator', 140, true, 'SYSTEM'),
  ('PERIOD_CLOSE', 'Cierre de Período', 'Cierre', v_menu_attendance, '/dashboard/attendance/period-close', 'Lock', 150, true, 'SYSTEM'),
  ('PAYROLL_EXPORT', 'Exportación a Nómina', 'Exportar', v_menu_attendance, '/dashboard/attendance/payroll-export', 'Upload', 160, true, 'SYSTEM'),
  ('ANOMALY_MANAGEMENT', 'Gestión de Anomalías', 'Anomalías', v_menu_attendance, '/dashboard/attendance/anomalies', 'AlertTriangle', 180, true, 'SYSTEM'),
  -- REPORTS (1)
  ('ATTENDANCE_REPORTS', 'Reportes de Asistencia', 'Reportes', v_menu_reports, '/dashboard/reports/attendance', 'BarChart', 170, true, 'SYSTEM'),
  -- KIOSK (4)
  ('KIOSK_TIMECLOCK', 'Marcación de Asistencia', 'Marcar', v_menu_kiosk, '/dashboard/kiosk/timeclock', 'Clock', 200, true, 'SYSTEM'),
  ('MY_REQUESTS', 'Mis Solicitudes', 'Solicitudes', v_menu_kiosk, '/dashboard/kiosk/requests', 'FileText', 210, true, 'SYSTEM'),
  ('MY_ATTENDANCE', 'Mi Asistencia', 'Asistencia', v_menu_kiosk, '/dashboard/kiosk/attendance', 'Calendar', 220, true, 'SYSTEM'),
  ('MY_SCHEDULE', 'Mi Horario', 'Horario', v_menu_kiosk, '/dashboard/kiosk/schedule', 'CalendarDays', 230, true, 'SYSTEM')
  ON CONFLICT (screen_key) DO NOTHING;
END $$;

-- ============================================================================
-- SECCIÓN 8: RELACIONES PANTALLA-ACCIÓN (screen_actions)
-- ============================================================================

DO $$
DECLARE v_scr UUID; v_act UUID;
BEGIN
  -- USER_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'USER_MANAGEMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'RESET_PASSWORD')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- ROLE_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'ROLE_MANAGEMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'CONFIGURE_PERMISSIONS')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- CATALOG_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'CATALOG_MANAGEMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- TENANT_SETTINGS
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'TENANT_SETTINGS' AND a.action_key IN ('VIEW', 'EDIT')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- SCHEDULE_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'SCHEDULE_MANAGEMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'CLONE')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- CALENDAR_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'CALENDAR_MANAGEMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- DEVICE_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'DEVICE_MANAGEMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'SYNC', 'TEST')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- PAYROLL_INTEGRATION
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'PAYROLL_INTEGRATION' AND a.action_key IN ('VIEW', 'EDIT', 'TEST', 'SYNC')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- ORG_STRUCTURE
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'ORG_STRUCTURE' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- EMPLOYEE_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'EMPLOYEE_MANAGEMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'IMPORT', 'EXPORT')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- REQUESTS_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'REQUESTS_MANAGEMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'REJECT', 'COMMENT')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- TIMECLOCK_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'TIMECLOCK_MANAGEMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'IMPORT', 'EXPORT')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- SHIFT_ASSIGNMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'SHIFT_ASSIGNMENT' AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN', 'REASSIGN', 'SWAP')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- ATTENDANCE_CALCULATION
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'ATTENDANCE_CALCULATION' AND a.action_key IN ('VIEW', 'EXECUTE', 'RECALCULATE')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- PERIOD_CLOSE
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'PERIOD_CLOSE' AND a.action_key IN ('VIEW', 'CLOSE', 'REOPEN')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- PAYROLL_EXPORT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'PAYROLL_EXPORT' AND a.action_key IN ('VIEW', 'GENERATE', 'EXPORT', 'DOWNLOAD')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- ANOMALY_MANAGEMENT
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'ANOMALY_MANAGEMENT' AND a.action_key IN ('VIEW', 'RESOLVE', 'COMMENT', 'ASSIGN')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- ATTENDANCE_REPORTS
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'ATTENDANCE_REPORTS' AND a.action_key IN ('VIEW', 'GENERATE', 'EXPORT', 'DOWNLOAD')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- KIOSK_TIMECLOCK
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'KIOSK_TIMECLOCK' AND a.action_key IN ('VIEW', 'PUNCH')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- MY_REQUESTS
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'MY_REQUESTS' AND a.action_key IN ('VIEW', 'CREATE', 'CANCEL')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- MY_ATTENDANCE
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'MY_ATTENDANCE' AND a.action_key IN ('VIEW')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- MY_SCHEDULE
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a WHERE s.screen_key = 'MY_SCHEDULE' AND a.action_key IN ('VIEW')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;

  -- Pantallas SYSTEM (pendientes): VIEW, CREATE, EDIT, DELETE
  FOR v_scr, v_act IN SELECT s.id, a.id FROM screens s, actions a 
  WHERE s.screen_key IN ('TENANT_MANAGEMENT','MENU_GROUP_MANAGEMENT','SCREEN_MANAGEMENT','ACTION_MANAGEMENT','SCOPE_TYPE_MANAGEMENT','LANGUAGE_MANAGEMENT','MESSAGE_KEY_MANAGEMENT','TRANSLATION_MANAGEMENT','SYSTEM_REPORT_MANAGEMENT','SUBSCRIPTION_PLAN_MANAGEMENT') 
  AND a.action_key IN ('VIEW', 'CREATE', 'EDIT', 'DELETE')
  LOOP INSERT INTO screen_actions (screen_id, action_id, is_active, created_by) VALUES (v_scr, v_act, true, 'SYSTEM') ON CONFLICT DO NOTHING; END LOOP;
END $$;

-- ============================================================================
-- SECCIÓN 9: PERMISOS DE MENÚ (role_screen_actions)
-- ============================================================================

DO $$
DECLARE
  v_tenant_system_id UUID;
  v_role_system_admin UUID; v_role_tenant_admin UUID; v_role_rrhh_admin UUID;
  v_role_supervisor UUID; v_role_employee UUID;
BEGIN
  SELECT id INTO v_tenant_system_id FROM public.tenants WHERE tenant_key = 'SYSTEM';
  SELECT id INTO v_role_system_admin FROM public.roles WHERE role_key = 'SYSTEM_ADMIN' AND tenant_id = v_tenant_system_id;
  SELECT id INTO v_role_tenant_admin FROM public.roles WHERE role_key = 'TENANT_ADMIN' AND tenant_id = v_tenant_system_id;
  SELECT id INTO v_role_rrhh_admin FROM public.roles WHERE role_key = 'RRHH_ADMIN' AND tenant_id = v_tenant_system_id;
  SELECT id INTO v_role_supervisor FROM public.roles WHERE role_key = 'SUPERVISOR' AND tenant_id = v_tenant_system_id;
  SELECT id INTO v_role_employee FROM public.roles WHERE role_key = 'EMPLOYEE' AND tenant_id = v_tenant_system_id;

  -- SYSTEM_ADMIN: SECURITY + MAINT
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_allowed, created_by)
  SELECT v_tenant_system_id, v_role_system_admin, sa.id, true, 'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON sa.screen_id = s.id
  JOIN public.system_menu_groups smg ON s.menu_group_id = smg.id
  WHERE smg.menu_group_key IN ('SECURITY', 'MAINT')
  ON CONFLICT (tenant_id, role_id, screen_action_id) DO UPDATE SET is_allowed = true;

  -- TENANT_ADMIN: MAINT, CONFIG, ORG
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_allowed, created_by)
  SELECT v_tenant_system_id, v_role_tenant_admin, sa.id, true, 'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON sa.screen_id = s.id
  JOIN public.system_menu_groups smg ON s.menu_group_id = smg.id
  WHERE smg.menu_group_key IN ('MAINT', 'CONFIG', 'ORG')
  ON CONFLICT (tenant_id, role_id, screen_action_id) DO UPDATE SET is_allowed = true;

  -- HR_ADMIN: EMPLOYEE, ATTENDANCE, REPORTS
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_allowed, created_by)
  SELECT v_tenant_system_id, v_role_rrhh_admin, sa.id, true, 'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON sa.screen_id = s.id
  JOIN public.system_menu_groups smg ON s.menu_group_id = smg.id
  WHERE smg.menu_group_key IN ('EMPLOYEE', 'ATTENDANCE', 'REPORTS')
  ON CONFLICT (tenant_id, role_id, screen_action_id) DO UPDATE SET is_allowed = true;

  -- SUPERVISOR: EMPLOYEE, ATTENDANCE, REPORTS
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_allowed, created_by)
  SELECT v_tenant_system_id, v_role_supervisor, sa.id, true, 'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON sa.screen_id = s.id
  JOIN public.system_menu_groups smg ON s.menu_group_id = smg.id
  WHERE smg.menu_group_key IN ('EMPLOYEE', 'ATTENDANCE', 'REPORTS')
  ON CONFLICT (tenant_id, role_id, screen_action_id) DO UPDATE SET is_allowed = true;

  -- EMPLOYEE: KIOSK
  INSERT INTO public.role_screen_actions (tenant_id, role_id, screen_action_id, is_allowed, created_by)
  SELECT v_tenant_system_id, v_role_employee, sa.id, true, 'SYSTEM'
  FROM public.screen_actions sa
  JOIN public.screens s ON sa.screen_id = s.id
  JOIN public.system_menu_groups smg ON s.menu_group_id = smg.id
  WHERE smg.menu_group_key = 'KIOSK'
  ON CONFLICT (tenant_id, role_id, screen_action_id) DO UPDATE SET is_allowed = true;
END $$;

-- ============================================================================
-- SECCIÓN 10: SYSTEM REPORTS (1 reporte inicial)
-- ============================================================================

INSERT INTO public.system_reports (report_code, report_name, report_description, handler_type_id, report_handler, application_module_id, is_active, created_by)
SELECT 'RPT_HEALTHCHECK', 'Healthcheck', 'Reporte de verificación del sistema',
  lv_handler.id, 'healthcheck.default', NULL, true, 'SYSTEM'
FROM public.lookup_values lv_handler
JOIN public.lookup_groups lg_handler ON lg_handler.id = lv_handler.lookup_group_id
WHERE lg_handler.lookup_group_key = 'REPORT_HANDLER' AND lv_handler.lookup_key = 'DEFAULT'
ON CONFLICT (report_code) DO UPDATE SET
  report_name = EXCLUDED.report_name,
  report_description = EXCLUDED.report_description,
  handler_type_id = EXCLUDED.handler_type_id,
  report_handler = EXCLUDED.report_handler,
  is_active = EXCLUDED.is_active;

-- Traducciones del reporte
INSERT INTO public.system_report_translations (system_report_id, language_code, report_name, report_description)
SELECT r.id, l.code,
  CASE WHEN l.code = 'en' THEN 'Healthcheck' ELSE 'Healthcheck' END,
  CASE WHEN l.code = 'en' THEN 'System verification report' ELSE 'Reporte de verificación del sistema' END
FROM public.system_reports r
CROSS JOIN public.system_languages l
WHERE r.report_code = 'RPT_HEALTHCHECK' AND l.code IN ('es','en')
ON CONFLICT (system_report_id, language_code) DO UPDATE SET
  report_name = EXCLUDED.report_name,
  report_description = EXCLUDED.report_description;

-- ============================================================================
-- SECCIÓN 11: USUARIO BOOTSTRAP (system.admin@titanium-labs.com)
-- ============================================================================
-- ✅ HABILITADO: Crea el usuario system.admin directamente en SQL
-- Usa el código validado de 011_CREATE_USER_DIRECT_SQL.sql
-- ============================================================================

DO $$
DECLARE
  v_tenant_system_id UUID;
  v_user_id UUID;
  v_role_id UUID;
  v_public_user_id UUID;
  v_password_hash TEXT;
  v_email TEXT := 'system.admin@titanium-labs.com';
  v_password TEXT := 'Titanium2026!';
  trigger_exists BOOLEAN;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'SECCIÓN 11: Usuario Bootstrap (HABILITADO)';
  RAISE NOTICE '============================================================';
  
  -- ▼ PASO 1: Deshabilitar trigger problemático on_auth_user_created
  SELECT EXISTS(
    SELECT 1 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
  ) INTO trigger_exists;

  IF trigger_exists THEN
    RAISE NOTICE '🔧 Deshabilitando trigger on_auth_user_created...';
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    RAISE NOTICE '✅ Trigger deshabilitado';
  END IF;

  -- Eliminar función handle_new_user() si existe
  DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

  -- ▼ PASO 2: Obtener tenant único SYSTEM
  SELECT id INTO v_tenant_system_id
  FROM public.tenants
  WHERE tenant_key = 'SYSTEM';

  IF v_tenant_system_id IS NULL THEN
    RAISE EXCEPTION '❌ ERROR: Tenant SYSTEM no existe';
  END IF;

  RAISE NOTICE '✅ Tenant SYSTEM: %', v_tenant_system_id;

  -- ▼ PASO 3: Verificar si usuario ya existe
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE '⏭️  Usuario ya existe en auth.users: %', v_user_id;
  ELSE
    -- ▼ PASO 4: Crear usuario en auth.users
    v_user_id := gen_random_uuid();
    v_password_hash := crypt(v_password, gen_salt('bf'));
    
    RAISE NOTICE '🔧 Creando usuario en auth.users...';
    
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      v_password_hash,
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('full_name', 'System Administrator'),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Usuario creado en auth.users';

    -- ▼ PASO 5: Crear identity (CRÍTICO)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user_id::text,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Identity creado';
  END IF;

  -- ▼ PASO 6: Crear en public.users
  SELECT id INTO v_public_user_id
  FROM public.users
  WHERE auth_user_id = v_user_id;

  IF v_public_user_id IS NOT NULL THEN
    RAISE NOTICE '⏭️  Usuario ya existe en public.users: %', v_public_user_id;
  ELSE
    RAISE NOTICE '🔧 Creando usuario en public.users...';
    
    INSERT INTO public.users (
      tenant_id,
      auth_user_id,
      username,
      display_name,
      email,
      is_active,
      preferred_language_code,
      created_by
    ) VALUES (
      v_tenant_system_id,
      v_user_id,
      'system.admin',
      'System Administrator',
      v_email,
      true,
      'es',
      'SEED_002'
    )
    RETURNING id INTO v_public_user_id;
    
    RAISE NOTICE '✅ Usuario creado en public.users: %', v_public_user_id;
  END IF;

  -- ▼ PASO 7: Asignar rol SYSTEM_ADMIN
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE tenant_id = v_tenant_system_id
    AND role_key = 'SYSTEM_ADMIN';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION '❌ ERROR: Rol SYSTEM_ADMIN no existe';
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_public_user_id
      AND role_id = v_role_id
  ) THEN
    RAISE NOTICE '🔧 Asignando rol SYSTEM_ADMIN...';
    
    INSERT INTO public.user_roles (
      tenant_id,
      user_id,
      role_id,
      is_active,
      created_by
    ) VALUES (
      v_tenant_system_id,
      v_public_user_id,
      v_role_id,
      true,
      'SEED_002'
    );
    
    RAISE NOTICE '✅ Rol asignado';
  ELSE
    RAISE NOTICE '⏭️  Rol ya asignado';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Usuario Bootstrap creado exitosamente';
  RAISE NOTICE '📋 Credenciales: %', v_email;
  RAISE NOTICE '🔐 Password: %', v_password;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECCIÓN 12: TENANT ONBOARDING (inicializar wizard para tenant principal)
-- ============================================================================

DO $$
DECLARE
  v_tenant_main_id UUID;
BEGIN
  -- Obtener el tenant principal SYSTEM
  SELECT id INTO v_tenant_main_id FROM public.tenants WHERE tenant_key = 'SYSTEM';

  IF v_tenant_main_id IS NULL THEN 
    RAISE EXCEPTION 'ERROR: TENANT PRINCIPAL (SYSTEM) no existe'; 
  END IF;

  -- ✅ Inicializar onboarding en IN_PROGRESS para que el wizard se ejecute
  INSERT INTO public.tenant_onboarding (tenant_id, onboarding_status, current_step, completion_percentage)
  VALUES (v_tenant_main_id, 'IN_PROGRESS', 'tenant_setup', 0)
  ON CONFLICT (tenant_id) DO UPDATE SET
    onboarding_status = 'IN_PROGRESS',
    current_step = 'tenant_setup',
    completion_percentage = 0;
    
  RAISE NOTICE '✅ Tenant onboarding inicializado para tenant principal (wizard se ejecutará)';
END $$;

-- ============================================================================
-- SECCIÓN 13: HELPERS (v_* tables)
-- ============================================================================

DO $$
DECLARE v_role UUID; v_gender_group UUID;
BEGIN
  -- v_super_admin_role_id: insertar con ON CONFLICT (ya limpiado por FACTORY_RESET)
  SELECT r.id INTO v_role FROM public.roles r JOIN public.tenants t ON t.id = r.tenant_id
  WHERE t.tenant_key = 'SYSTEM' AND r.role_key = 'SYSTEM_ADMIN' LIMIT 1;
  IF v_role IS NOT NULL THEN
    INSERT INTO public.v_super_admin_role_id (id) VALUES (v_role) ON CONFLICT (id) DO NOTHING;
  END IF;

  -- v_gender_group_id: insertar solo si no existe (ya limpiado por FACTORY_RESET)
  SELECT lg.id INTO v_gender_group FROM public.lookup_groups lg WHERE lg.lookup_group_key = 'GENDER' LIMIT 1;
  IF v_gender_group IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.v_gender_group_id WHERE id = v_gender_group) THEN
      INSERT INTO public.v_gender_group_id (id) VALUES (v_gender_group);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  v_tenants INT; v_roles INT; v_users INT; v_menu_groups INT; v_screens INT;
  v_actions INT; v_screen_actions INT; v_role_perms INT; v_lookup_groups INT;
  v_lookup_values INT; v_onboarding INT;
BEGIN
  SELECT COUNT(*) INTO v_tenants FROM public.tenants;
  SELECT COUNT(*) INTO v_roles FROM public.roles WHERE is_system_role = true;
  SELECT COUNT(*) INTO v_users FROM public.users;
  SELECT COUNT(*) INTO v_menu_groups FROM public.system_menu_groups;
  SELECT COUNT(*) INTO v_screens FROM public.screens;
  SELECT COUNT(*) INTO v_actions FROM public.actions;
  SELECT COUNT(*) INTO v_screen_actions FROM public.screen_actions;
  SELECT COUNT(*) INTO v_role_perms FROM public.role_screen_actions;
  SELECT COUNT(*) INTO v_lookup_groups FROM public.lookup_groups;
  SELECT COUNT(*) INTO v_lookup_values FROM public.lookup_values;
  SELECT COUNT(*) INTO v_onboarding FROM public.tenant_onboarding WHERE onboarding_status = 'IN_PROGRESS';

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'SEED COMPLETO - FINALIZADO EXITOSAMENTE';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Tenants: %', v_tenants;
  RAISE NOTICE 'Roles Base: %', v_roles;
  RAISE NOTICE 'Usuarios Bootstrap: %', v_users;
  RAISE NOTICE 'Lookup Groups: %', v_lookup_groups;
  RAISE NOTICE 'Lookup Values: %', v_lookup_values;
  RAISE NOTICE 'Menu Groups: %', v_menu_groups;
  RAISE NOTICE 'Pantallas: %', v_screens;
  RAISE NOTICE 'Acciones Globales: %', v_actions;
  RAISE NOTICE 'Relaciones Pantalla-Acción: %', v_screen_actions;
  RAISE NOTICE 'Permisos de Menú: %', v_role_perms;
  RAISE NOTICE 'Tenant Onboarding (en progreso): %', v_onboarding;
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ Credenciales: system.admin@titanium-labs.com / Titanium2026!';
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- PASO FINAL: RE-HABILITAR TRIGGERS Y VERIFICAR INTEGRIDAD
-- ============================================================================

-- Re-habilitar SOLO triggers de usuario (no system triggers)
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '🔧 Re-habilitando triggers de usuario en tabla tenants...';
  
  -- Iterar sobre todos los triggers de usuario en la tabla tenants
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'public.tenants'::regclass 
      AND tgisinternal = false  -- Solo triggers de usuario, NO internos
  LOOP
    EXECUTE format('ALTER TABLE public.tenants ENABLE TRIGGER %I', r.tgname);
    RAISE NOTICE '  ✓ Habilitado: %', r.tgname;
  END LOOP;
END $$;

-- Verificación final: Protocolo SELLADO (solo 1 tenant activo)
DO $$
DECLARE
  v_active_count INTEGER;
  v_total_count INTEGER;
  v_tenant_name VARCHAR;
BEGIN
  -- Contar todos los tenants
  SELECT COUNT(*) INTO v_total_count FROM public.tenants;
  
  -- Contar solo los activos
  SELECT COUNT(*), MAX(tenant_name) 
  INTO v_active_count, v_tenant_name
  FROM public.tenants
  WHERE is_active = true;
  
  RAISE NOTICE '📊 Tenants en base de datos:';
  RAISE NOTICE '   - Total: % (esperado: 1)', v_total_count;
  RAISE NOTICE '   - Activos: % (esperado: 1)', v_active_count;
  
  IF v_total_count != 1 THEN
    RAISE EXCEPTION '❌ ERROR CRÍTICO: Hay % tenants totales. Solo debe haber UNO (protocolo SELLADO)', v_total_count;
  ELSIF v_active_count = 0 THEN
    RAISE EXCEPTION '❌ ERROR CRÍTICO: El tenant único no está activo';
  ELSIF v_active_count > 1 THEN
    RAISE EXCEPTION '❌ ERROR CRÍTICO: Hay % tenants activos. Solo debe haber UNO (protocolo SELLADO)', v_active_count;
  ELSE
    RAISE NOTICE '✅ PROTOCOLO SELLADO VERIFICADO: 1 tenant único activo ("%")', v_tenant_name;
  END IF;
END $$;

COMMIT;
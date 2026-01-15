-- ============================================
-- KIOSK - FASE 1: DDL TABLAS NUEVAS Y AJUSTES
-- ============================================
-- Fecha: 2026-01-11
-- Descripción: Crear tablas nuevas para KIOSK y ajustar tablas existentes
-- Ajustes aplicados:
--   1. approved_by → approved_by_user_id (UUID FK a users)
--   2. request_source → request_source_id (lookup_value_id)
--   3. Campos requested_by_user_id en tablas nuevas
--   4. Campos contingency_activated_by_user_id en employee_time_punches
-- ============================================

-- ============================================
-- A. AJUSTES A TABLAS EXISTENTES
-- ============================================

-- A.1: employee_time_punches (agregar campos de contingencia)
-- ---------------------------------------------------------------
ALTER TABLE public.employee_time_punches 
ADD COLUMN IF NOT EXISTS is_contingency boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS contingency_reason_id uuid NULL,
ADD COLUMN IF NOT EXISTS contingency_activated_by_user_id uuid NULL,
ADD COLUMN IF NOT EXISTS contingency_activated_at timestamptz NULL;

-- Agregar FK después (evitar error si tabla users aún no está lista)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_time_punches_contingency_reason'
  ) THEN
    ALTER TABLE public.employee_time_punches 
    ADD CONSTRAINT fk_time_punches_contingency_reason 
    FOREIGN KEY (contingency_reason_id) 
    REFERENCES public.lookup_values(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_time_punches_contingency_user'
  ) THEN
    ALTER TABLE public.employee_time_punches 
    ADD CONSTRAINT fk_time_punches_contingency_user 
    FOREIGN KEY (contingency_activated_by_user_id) 
    REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índice para contingencias
CREATE INDEX IF NOT EXISTS idx_time_punches_contingency 
ON public.employee_time_punches(is_contingency) 
WHERE is_contingency = true;

COMMENT ON COLUMN public.employee_time_punches.is_contingency IS 'Indica si la marcación fue realizada en modo contingencia';
COMMENT ON COLUMN public.employee_time_punches.contingency_reason_id IS 'FK a lookup_values (CONTINGENCY_REASON): motivo de activación de contingencia';
COMMENT ON COLUMN public.employee_time_punches.contingency_activated_by_user_id IS 'FK a users: usuario que activó la contingencia (SYSTEM_ADMIN)';
COMMENT ON COLUMN public.employee_time_punches.contingency_activated_at IS 'Fecha/hora de activación de contingencia';

-- A.2: employee_absence_requests (agregar campos de fuente y aprobación)
-- ---------------------------------------------------------------
ALTER TABLE public.employee_absence_requests 
ADD COLUMN IF NOT EXISTS request_source_id uuid NULL,
ADD COLUMN IF NOT EXISTS requested_by_user_id uuid NULL,
ADD COLUMN IF NOT EXISTS approved_by_user_id uuid NULL,
ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS rejection_reason varchar(500) NULL;

-- Agregar FK después
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_absence_requests_source'
  ) THEN
    ALTER TABLE public.employee_absence_requests 
    ADD CONSTRAINT fk_absence_requests_source 
    FOREIGN KEY (request_source_id) 
    REFERENCES public.lookup_values(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_absence_requests_requested_by'
  ) THEN
    ALTER TABLE public.employee_absence_requests 
    ADD CONSTRAINT fk_absence_requests_requested_by 
    FOREIGN KEY (requested_by_user_id) 
    REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_absence_requests_approved_by'
  ) THEN
    ALTER TABLE public.employee_absence_requests 
    ADD CONSTRAINT fk_absence_requests_approved_by 
    FOREIGN KEY (approved_by_user_id) 
    REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_absence_requests_source 
ON public.employee_absence_requests(request_source_id);

CREATE INDEX IF NOT EXISTS idx_absence_requests_employee_date 
ON public.employee_absence_requests(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_absence_requests_status 
ON public.employee_absence_requests(request_status_id);

COMMENT ON COLUMN public.employee_absence_requests.request_source_id IS 'FK a lookup_values (REQUEST_SOURCE): origen de la solicitud (ADMIN/KIOSK/MOBILE)';
COMMENT ON COLUMN public.employee_absence_requests.requested_by_user_id IS 'FK a users: usuario que creó la solicitud';
COMMENT ON COLUMN public.employee_absence_requests.approved_by_user_id IS 'FK a users: usuario que aprobó/rechazó la solicitud';
COMMENT ON COLUMN public.employee_absence_requests.approved_at IS 'Fecha/hora de aprobación o rechazo';
COMMENT ON COLUMN public.employee_absence_requests.rejection_reason IS 'Motivo de rechazo (si aplica)';

-- ============================================
-- B. TABLAS NUEVAS
-- ============================================

-- B.1: employee_regularization_requests
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_regularization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  
  -- Usuario que solicitó (puede ser diferente al empleado, ej: RRHH_ADMIN)
  requested_by_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Marcación original (si existe)
  original_punch_id uuid NULL REFERENCES public.employee_time_punches(id) ON DELETE SET NULL,
  
  -- Datos de la regularización solicitada
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  requested_punch_key integer NOT NULL, -- 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN, 5=PERMISSION_OUT, 6=PERMISSION_IN
  
  -- Motivo
  regularization_reason_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT,
  notes varchar(500) NULL,
  
  -- Origen de la solicitud
  request_source_id uuid NULL REFERENCES public.lookup_values(id) ON DELETE SET NULL, -- ADMIN/KIOSK/MOBILE
  
  -- Estado
  request_status_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT, -- PENDING/APPROVED/REJECTED/CANCELLED
  
  -- Aprobación
  approved_by_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz NULL,
  rejection_reason varchar(500) NULL,
  
  -- Auditoría
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50) NULL,
  updated_at timestamptz NULL
);

-- Índices
CREATE INDEX idx_regularization_requests_employee_date 
ON public.employee_regularization_requests(employee_id, created_at DESC);

CREATE INDEX idx_regularization_requests_status 
ON public.employee_regularization_requests(request_status_id);

CREATE INDEX idx_regularization_requests_date 
ON public.employee_regularization_requests(requested_date);

CREATE INDEX idx_regularization_requests_company 
ON public.employee_regularization_requests(company_id);

-- Trigger para updated_at
CREATE TRIGGER trg_regularization_requests_updated_at
BEFORE UPDATE ON public.employee_regularization_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comentarios
COMMENT ON TABLE public.employee_regularization_requests IS 'Solicitudes de regularización de marcaciones (empleados solicitan corregir/agregar marcaciones)';
COMMENT ON COLUMN public.employee_regularization_requests.requested_by_user_id IS 'Usuario que creó la solicitud (puede ser el empleado o un admin)';
COMMENT ON COLUMN public.employee_regularization_requests.original_punch_id IS 'Referencia a la marcación original (si existe)';
COMMENT ON COLUMN public.employee_regularization_requests.requested_punch_key IS '1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN, 5=PERMISSION_OUT, 6=PERMISSION_IN';
COMMENT ON COLUMN public.employee_regularization_requests.request_source_id IS 'FK a lookup_values (REQUEST_SOURCE): ADMIN/KIOSK/MOBILE';
COMMENT ON COLUMN public.employee_regularization_requests.approved_by_user_id IS 'Usuario que aprobó/rechazó la solicitud';

-- B.2: employee_shift_change_requests
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_shift_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  
  -- Usuario que solicitó (puede ser diferente al empleado)
  requested_by_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Cambio solicitado
  requested_date date NOT NULL,
  current_shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  requested_shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  
  -- Motivo
  change_reason_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT,
  notes varchar(500) NULL,
  
  -- Origen de la solicitud
  request_source_id uuid NULL REFERENCES public.lookup_values(id) ON DELETE SET NULL, -- ADMIN/KIOSK/MOBILE
  
  -- Estado
  request_status_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT, -- PENDING/APPROVED/REJECTED/CANCELLED
  
  -- Aprobación
  approved_by_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz NULL,
  rejection_reason varchar(500) NULL,
  
  -- Auditoría
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50) NULL,
  updated_at timestamptz NULL,
  
  -- Validación: no puede solicitar el mismo turno
  CONSTRAINT chk_different_shifts CHECK (current_shift_id != requested_shift_id)
);

-- Índices
CREATE INDEX idx_shift_change_requests_employee_date 
ON public.employee_shift_change_requests(employee_id, created_at DESC);

CREATE INDEX idx_shift_change_requests_status 
ON public.employee_shift_change_requests(request_status_id);

CREATE INDEX idx_shift_change_requests_date 
ON public.employee_shift_change_requests(requested_date);

CREATE INDEX idx_shift_change_requests_company 
ON public.employee_shift_change_requests(company_id);

-- Trigger para updated_at
CREATE TRIGGER trg_shift_change_requests_updated_at
BEFORE UPDATE ON public.employee_shift_change_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comentarios
COMMENT ON TABLE public.employee_shift_change_requests IS 'Solicitudes de cambio de turno (empleados solicitan cambiar su turno asignado)';
COMMENT ON COLUMN public.employee_shift_change_requests.requested_by_user_id IS 'Usuario que creó la solicitud (puede ser el empleado o un admin)';
COMMENT ON COLUMN public.employee_shift_change_requests.request_source_id IS 'FK a lookup_values (REQUEST_SOURCE): ADMIN/KIOSK/MOBILE';
COMMENT ON COLUMN public.employee_shift_change_requests.approved_by_user_id IS 'Usuario que aprobó/rechazó la solicitud';

-- B.3: kiosk_configuration (OPCIONAL - configuración por tenant/empresa/dispositivo)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kiosk_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NULL REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL = aplica a todo el tenant
  device_id uuid NULL REFERENCES public.time_clock_devices(id) ON DELETE CASCADE, -- NULL = aplica a toda la empresa
  
  -- Configuración de botones
  allow_lunch_buttons boolean NOT NULL DEFAULT false,
  allow_permission_buttons boolean NOT NULL DEFAULT false,
  
  -- Contingencia
  contingency_enabled boolean NOT NULL DEFAULT false,
  contingency_expires_at timestamptz NULL,
  contingency_activated_by_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  contingency_reason_id uuid NULL REFERENCES public.lookup_values(id) ON DELETE SET NULL,
  
  -- Auto-reset (segundos)
  auto_reset_seconds integer NOT NULL DEFAULT 5,
  
  -- Throttling anti-doble click (segundos)
  throttle_seconds integer NOT NULL DEFAULT 30,
  
  -- Auditoría
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50) NULL,
  updated_at timestamptz NULL,
  
  -- Unique por tenant/company/device (usando COALESCE para NULLs)
  CONSTRAINT uq_kiosk_config UNIQUE NULLS NOT DISTINCT (tenant_id, company_id, device_id)
);

-- Índices
CREATE INDEX idx_kiosk_config_tenant 
ON public.kiosk_configuration(tenant_id);

CREATE INDEX idx_kiosk_config_company 
ON public.kiosk_configuration(company_id) 
WHERE company_id IS NOT NULL;

CREATE INDEX idx_kiosk_config_device 
ON public.kiosk_configuration(device_id) 
WHERE device_id IS NOT NULL;

CREATE INDEX idx_kiosk_config_contingency 
ON public.kiosk_configuration(contingency_enabled) 
WHERE contingency_enabled = true;

-- Trigger para updated_at
CREATE TRIGGER trg_kiosk_configuration_updated_at
BEFORE UPDATE ON public.kiosk_configuration
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comentarios
COMMENT ON TABLE public.kiosk_configuration IS 'Configuración del kiosko por tenant/empresa/dispositivo';
COMMENT ON COLUMN public.kiosk_configuration.company_id IS 'NULL = configuración aplica a todo el tenant';
COMMENT ON COLUMN public.kiosk_configuration.device_id IS 'NULL = configuración aplica a toda la empresa';
COMMENT ON COLUMN public.kiosk_configuration.allow_lunch_buttons IS 'Habilitar botones de marcación de lunch (OUT/IN)';
COMMENT ON COLUMN public.kiosk_configuration.allow_permission_buttons IS 'Habilitar botones de marcación de permisos (OUT/IN)';
COMMENT ON COLUMN public.kiosk_configuration.contingency_enabled IS 'Modo contingencia activo (permite marcación manual cuando biométrico falla)';
COMMENT ON COLUMN public.kiosk_configuration.contingency_activated_by_user_id IS 'Usuario que activó la contingencia (SYSTEM_ADMIN)';
COMMENT ON COLUMN public.kiosk_configuration.auto_reset_seconds IS 'Segundos de timeout para auto-reset de la pantalla KIOSK';
COMMENT ON COLUMN public.kiosk_configuration.throttle_seconds IS 'Segundos de espera anti-doble click (evitar marcaciones duplicadas)';

-- ============================================
-- C. VERIFICACIÓN FINAL
-- ============================================

-- Mostrar tablas creadas/ajustadas
SELECT 
  'employee_time_punches' as tabla,
  'AJUSTADA (4 campos contingencia)' as estado
UNION ALL
SELECT 
  'employee_absence_requests' as tabla,
  'AJUSTADA (5 campos fuente/aprobación)' as estado
UNION ALL
SELECT 
  'employee_regularization_requests' as tabla,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='employee_regularization_requests') 
    THEN 'CREADA ✅' 
    ELSE 'ERROR ❌' 
  END as estado
UNION ALL
SELECT 
  'employee_shift_change_requests' as tabla,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='employee_shift_change_requests') 
    THEN 'CREADA ✅' 
    ELSE 'ERROR ❌' 
  END as estado
UNION ALL
SELECT 
  'kiosk_configuration' as tabla,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='kiosk_configuration') 
    THEN 'CREADA ✅' 
    ELSE 'ERROR ❌' 
  END as estado;

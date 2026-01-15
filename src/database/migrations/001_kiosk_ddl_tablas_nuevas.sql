-- ==========================================================================================================
-- MIGRATION 001: KIOSK - TABLAS NUEVAS Y AJUSTES MÍNIMOS
-- ==========================================================================================================
-- Proyecto: Turnos Titanium Enterprise
-- Fecha: 2026-01-11
-- Descripción: Creación de tablas nuevas para KIOSK (regularización, cambio de turno) y ajustes mínimos
--              a tablas existentes (time_punches, absence_requests)
-- ==========================================================================================================

-- ==========================================================================================================
-- 1) AJUSTES A TABLA EXISTENTE: employee_time_punches
-- ==========================================================================================================

-- Agregar campos para contingencia (nullable, no rompe compatibilidad)
ALTER TABLE public.employee_time_punches 
ADD COLUMN IF NOT EXISTS is_contingency boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS contingency_reason_id uuid NULL REFERENCES public.lookup_values(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contingency_activated_by_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contingency_activated_at timestamptz NULL;

-- Índice para búsquedas de marcaciones en contingencia
CREATE INDEX IF NOT EXISTS idx_time_punches_contingency 
ON public.employee_time_punches(is_contingency) 
WHERE is_contingency = true;

COMMENT ON COLUMN public.employee_time_punches.is_contingency IS 'Indica si la marcación fue realizada en modo contingencia';
COMMENT ON COLUMN public.employee_time_punches.contingency_reason_id IS 'FK a lookup_values (CONTINGENCY_REASON): motivo de activación de contingencia';
COMMENT ON COLUMN public.employee_time_punches.contingency_activated_by_user_id IS 'FK a users: usuario (SYSTEM_ADMIN) que activó la contingencia';
COMMENT ON COLUMN public.employee_time_punches.contingency_activated_at IS 'Timestamp de activación de la contingencia';

-- ==========================================================================================================
-- 2) AJUSTES A TABLA EXISTENTE: employee_absence_requests
-- ==========================================================================================================

-- Agregar campos para fuente y aprobación (nullable, no rompe compatibilidad)
ALTER TABLE public.employee_absence_requests 
ADD COLUMN IF NOT EXISTS request_source_id uuid NULL REFERENCES public.lookup_values(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requested_by_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_by_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS rejection_reason varchar(500) NULL;

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_absence_requests_source 
ON public.employee_absence_requests(request_source_id) 
WHERE request_source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_absence_requests_employee_date 
ON public.employee_absence_requests(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_absence_requests_status 
ON public.employee_absence_requests(request_status_id);

COMMENT ON COLUMN public.employee_absence_requests.request_source_id IS 'FK a lookup_values (REQUEST_SOURCE): origen de la solicitud (ADMIN/KIOSK/MOBILE)';
COMMENT ON COLUMN public.employee_absence_requests.requested_by_user_id IS 'FK a users: usuario que creó la solicitud (puede ser el empleado mismo desde KIOSK)';
COMMENT ON COLUMN public.employee_absence_requests.approved_by_user_id IS 'FK a users: usuario que aprobó/rechazó la solicitud';
COMMENT ON COLUMN public.employee_absence_requests.approved_at IS 'Timestamp de aprobación/rechazo';
COMMENT ON COLUMN public.employee_absence_requests.rejection_reason IS 'Motivo del rechazo (si request_status_id = REJECTED)';

-- ==========================================================================================================
-- 3) NUEVA TABLA: employee_regularization_requests
-- ==========================================================================================================

CREATE TABLE IF NOT EXISTS public.employee_regularization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  
  -- Marcación original (si existe - puede ser NULL si olvidó marcar completamente)
  original_punch_id uuid NULL REFERENCES public.employee_time_punches(id) ON DELETE SET NULL,
  
  -- Datos de la regularización solicitada
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  requested_punch_key integer NOT NULL, -- 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN, 5=PERMISSION_OUT, 6=PERMISSION_IN
  
  -- Motivo
  regularization_reason_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT,
  notes varchar(500) NULL,
  
  -- Estado y origen
  request_status_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT, -- PENDING/APPROVED/REJECTED/CANCELLED
  request_source_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT, -- ADMIN/KIOSK/MOBILE
  
  -- Usuario que solicitó (normalmente el empleado desde KIOSK)
  requested_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  
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

-- Índices para optimización de consultas
CREATE INDEX idx_regularization_requests_employee_date 
ON public.employee_regularization_requests(employee_id, created_at DESC);

CREATE INDEX idx_regularization_requests_status 
ON public.employee_regularization_requests(request_status_id);

CREATE INDEX idx_regularization_requests_date 
ON public.employee_regularization_requests(requested_date DESC);

CREATE INDEX idx_regularization_requests_company 
ON public.employee_regularization_requests(company_id);

CREATE INDEX idx_regularization_requests_tenant 
ON public.employee_regularization_requests(tenant_id);

-- Trigger para updated_at
CREATE TRIGGER trg_regularization_requests_updated_at
BEFORE UPDATE ON public.employee_regularization_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comentarios
COMMENT ON TABLE public.employee_regularization_requests IS 'Solicitudes de regularización de marcaciones (olvidó marcar, marcó mal, etc.)';
COMMENT ON COLUMN public.employee_regularization_requests.original_punch_id IS 'FK a employee_time_punches: marcación original a corregir (NULL si olvidó marcar)';
COMMENT ON COLUMN public.employee_regularization_requests.requested_punch_key IS '1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN, 5=PERMISSION_OUT, 6=PERMISSION_IN';
COMMENT ON COLUMN public.employee_regularization_requests.regularization_reason_id IS 'FK a lookup_values (REGULARIZATION_REASON): motivo de la regularización';
COMMENT ON COLUMN public.employee_regularization_requests.request_status_id IS 'FK a lookup_values (REQUEST_STATUS): PENDING/APPROVED/REJECTED/CANCELLED';
COMMENT ON COLUMN public.employee_regularization_requests.request_source_id IS 'FK a lookup_values (REQUEST_SOURCE): ADMIN/KIOSK/MOBILE';
COMMENT ON COLUMN public.employee_regularization_requests.requested_by_user_id IS 'FK a users: usuario que solicitó (normalmente el empleado)';
COMMENT ON COLUMN public.employee_regularization_requests.approved_by_user_id IS 'FK a users: usuario que aprobó/rechazó';

-- ==========================================================================================================
-- 4) NUEVA TABLA: employee_shift_change_requests
-- ==========================================================================================================

CREATE TABLE IF NOT EXISTS public.employee_shift_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  
  -- Cambio solicitado
  requested_date date NOT NULL,
  current_shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  requested_shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  
  -- Motivo
  change_reason_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT,
  notes varchar(500) NULL,
  
  -- Estado y origen
  request_status_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT, -- PENDING/APPROVED/REJECTED/CANCELLED
  request_source_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT, -- ADMIN/KIOSK/MOBILE
  
  -- Usuario que solicitó (normalmente el empleado desde KIOSK)
  requested_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  
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
  
  -- Constraint: no puede pedir cambiar al mismo turno
  CONSTRAINT chk_different_shifts CHECK (current_shift_id != requested_shift_id)
);

-- Índices para optimización de consultas
CREATE INDEX idx_shift_change_requests_employee_date 
ON public.employee_shift_change_requests(employee_id, created_at DESC);

CREATE INDEX idx_shift_change_requests_status 
ON public.employee_shift_change_requests(request_status_id);

CREATE INDEX idx_shift_change_requests_date 
ON public.employee_shift_change_requests(requested_date DESC);

CREATE INDEX idx_shift_change_requests_company 
ON public.employee_shift_change_requests(company_id);

CREATE INDEX idx_shift_change_requests_tenant 
ON public.employee_shift_change_requests(tenant_id);

-- Trigger para updated_at
CREATE TRIGGER trg_shift_change_requests_updated_at
BEFORE UPDATE ON public.employee_shift_change_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comentarios
COMMENT ON TABLE public.employee_shift_change_requests IS 'Solicitudes de cambio de turno por parte del empleado';
COMMENT ON COLUMN public.employee_shift_change_requests.current_shift_id IS 'FK a shifts: turno actual asignado';
COMMENT ON COLUMN public.employee_shift_change_requests.requested_shift_id IS 'FK a shifts: turno al que solicita cambiar';
COMMENT ON COLUMN public.employee_shift_change_requests.change_reason_id IS 'FK a lookup_values (SHIFT_CHANGE_REASON): motivo del cambio';
COMMENT ON COLUMN public.employee_shift_change_requests.request_status_id IS 'FK a lookup_values (REQUEST_STATUS): PENDING/APPROVED/REJECTED/CANCELLED';
COMMENT ON COLUMN public.employee_shift_change_requests.request_source_id IS 'FK a lookup_values (REQUEST_SOURCE): ADMIN/KIOSK/MOBILE';
COMMENT ON COLUMN public.employee_shift_change_requests.requested_by_user_id IS 'FK a users: usuario que solicitó (normalmente el empleado)';
COMMENT ON COLUMN public.employee_shift_change_requests.approved_by_user_id IS 'FK a users: usuario que aprobó/rechazó';

-- ==========================================================================================================
-- 5) OPCIONAL: TABLA kiosk_configuration (configuración global de KIOSK)
-- ==========================================================================================================

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
  
  -- Auto-reset
  auto_reset_seconds integer NOT NULL DEFAULT 5,
  
  -- Auditoría
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50) NULL,
  updated_at timestamptz NULL
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

-- Trigger para updated_at
CREATE TRIGGER trg_kiosk_configuration_updated_at
BEFORE UPDATE ON public.kiosk_configuration
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Comentarios
COMMENT ON TABLE public.kiosk_configuration IS 'Configuración global del KIOSK por tenant/empresa/dispositivo';
COMMENT ON COLUMN public.kiosk_configuration.company_id IS 'NULL = aplica a todo el tenant';
COMMENT ON COLUMN public.kiosk_configuration.device_id IS 'NULL = aplica a toda la empresa';
COMMENT ON COLUMN public.kiosk_configuration.contingency_enabled IS 'Indica si el modo contingencia está activo';
COMMENT ON COLUMN public.kiosk_configuration.contingency_expires_at IS 'Fecha/hora de expiración automática de la contingencia';
COMMENT ON COLUMN public.kiosk_configuration.contingency_activated_by_user_id IS 'FK a users: SYSTEM_ADMIN que activó la contingencia';

-- ==========================================================================================================
-- VERIFICACIÓN FINAL
-- ==========================================================================================================

SELECT 
  'Tablas creadas/modificadas' as verificacion,
  COUNT(*) FILTER (WHERE table_name = 'employee_regularization_requests') as regularization_table,
  COUNT(*) FILTER (WHERE table_name = 'employee_shift_change_requests') as shift_change_table,
  COUNT(*) FILTER (WHERE table_name = 'kiosk_configuration') as kiosk_config_table
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('employee_regularization_requests', 'employee_shift_change_requests', 'kiosk_configuration');

-- FIN MIGRATION 001

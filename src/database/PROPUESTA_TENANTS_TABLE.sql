-- =====================================================
-- PROPUESTA: Tabla TENANTS para Turnos Titanium
-- Sistema Multi-Tenant SaaS + On-Premise
-- =====================================================
-- Autor: Nyra
-- Fecha: 2026-01-07
-- =====================================================

/*
SECCIONES DE LA TABLA:
1. Identificación Básica
2. Información Legal/Fiscal
3. Datos de Contacto
4. Configuración de Suscripción
5. Configuración Regional
6. Branding y Personalización
7. Seguridad y Políticas
8. Integración con Nómina
9. Características Habilitadas
10. Licenciamiento On-Premise
11. Auditoría y Control
*/

DROP TABLE IF EXISTS public.tenants CASCADE;

CREATE TABLE public.tenants (
    
    -- =====================================================
    -- 1. IDENTIFICACIÓN BÁSICA
    -- =====================================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Nombre comercial de la empresa (ej: "Acme Corporation")
    tenant_name VARCHAR(150) NOT NULL,
    
    -- Slug único para URLs amigables (ej: "acme-corp")
    -- Se usa para subdominios: acme-corp.turnos-titanium.com
    tenant_slug VARCHAR(100) NOT NULL UNIQUE,
    
    -- Razón social completa (nombre legal registrado)
    legal_name VARCHAR(250) NOT NULL,
    
    
    -- =====================================================
    -- 2. INFORMACIÓN LEGAL/FISCAL
    -- =====================================================
    
    -- Número de identificación fiscal (RUC/NIT/RFC/TAX ID)
    tax_id VARCHAR(50) UNIQUE,
    
    -- Tipo de empresa: 'CORPORATION', 'LLC', 'SOLE_PROPRIETOR', 'NGO', 'GOVERNMENT', 'OTHER'
    business_type VARCHAR(30),
    
    -- Industria/Sector: 'RETAIL', 'MANUFACTURING', 'HEALTHCARE', 'HOSPITALITY', 'TECHNOLOGY', etc.
    industry VARCHAR(50),
    
    -- Tamaño de la empresa: 'SMALL' (1-50), 'MEDIUM' (51-250), 'LARGE' (251-1000), 'ENTERPRISE' (1000+)
    company_size VARCHAR(20),
    
    
    -- =====================================================
    -- 3. DATOS DE CONTACTO
    -- =====================================================
    
    -- Contacto principal (representante legal o admin principal)
    primary_contact_name VARCHAR(150),
    primary_contact_email VARCHAR(150) NOT NULL,
    primary_contact_phone VARCHAR(30),
    
    -- Dirección fiscal/principal
    address_line1 VARCHAR(250),
    address_line2 VARCHAR(250),
    city VARCHAR(100),
    state_province VARCHAR(100),
    country_code CHAR(2), -- ISO 3166-1 alpha-2 (MX, US, ES, etc.)
    postal_code VARCHAR(20),
    
    -- Website corporativo
    website_url VARCHAR(250),
    
    
    -- =====================================================
    -- 4. CONFIGURACIÓN DE SUSCRIPCIÓN (SaaS)
    -- =====================================================
    
    -- Plan contratado: 'FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'
    subscription_plan VARCHAR(30) NOT NULL DEFAULT 'FREE',
    
    -- Estado de suscripción: 'TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'
    subscription_status VARCHAR(30) NOT NULL DEFAULT 'TRIAL',
    
    -- Fechas del período de prueba (trial)
    trial_start_date DATE,
    trial_end_date DATE,
    
    -- Fechas de suscripción activa
    subscription_start_date DATE,
    subscription_end_date DATE,
    
    -- Límites según plan
    max_users INTEGER DEFAULT 10, -- Número máximo de usuarios permitidos
    max_locations INTEGER DEFAULT 1, -- Número máximo de localidades
    max_departments INTEGER DEFAULT 5, -- Número máximo de departamentos
    max_employees INTEGER DEFAULT 50, -- Número máximo de empleados
    
    -- Identificador de cliente en sistema de pagos (Stripe, PayPal, etc.)
    billing_customer_id VARCHAR(100),
    
    -- Identificador de suscripción en sistema de pagos
    billing_subscription_id VARCHAR(100),
    
    
    -- =====================================================
    -- 5. CONFIGURACIÓN REGIONAL
    -- =====================================================
    
    -- Zona horaria (ej: 'America/Mexico_City', 'America/New_York', 'Europe/Madrid')
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Idioma predeterminado del tenant (ej: 'es', 'en', 'fr')
    default_language_code VARCHAR(10) DEFAULT 'es',
    
    -- Moneda para reportes y facturación (ISO 4217: MXN, USD, EUR, etc.)
    currency_code CHAR(3) DEFAULT 'MXN',
    
    -- Formato de fecha: 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    
    -- Formato de hora: '12h', '24h'
    time_format VARCHAR(10) DEFAULT '24h',
    
    -- Primera día de la semana: 0=Domingo, 1=Lunes
    week_start_day SMALLINT DEFAULT 1,
    
    
    -- =====================================================
    -- 6. BRANDING Y PERSONALIZACIÓN
    -- =====================================================
    
    -- URL del logo de la empresa
    logo_url TEXT,
    
    -- URL del favicon
    favicon_url TEXT,
    
    -- Colores corporativos (hex)
    primary_color VARCHAR(7) DEFAULT '#0074D9', -- Color principal
    secondary_color VARCHAR(7) DEFAULT '#2ECC71', -- Color secundario
    accent_color VARCHAR(7), -- Color de acento
    
    -- Dominio personalizado para empresas Enterprise (ej: turnos.acmecorp.com)
    custom_domain VARCHAR(150),
    
    -- Configuraciones visuales adicionales (JSON)
    -- Ejemplo: {"theme": "light", "sidebarCollapsed": false, "compactMode": true}
    ui_preferences JSONB DEFAULT '{}',
    
    
    -- =====================================================
    -- 7. SEGURIDAD Y POLÍTICAS
    -- =====================================================
    
    -- Requiere autenticación de dos factores (2FA) para todos los usuarios
    require_2fa BOOLEAN DEFAULT false,
    
    -- Política de contraseñas (JSON)
    -- Ejemplo: {"minLength": 8, "requireUppercase": true, "requireNumbers": true, "requireSpecialChars": true, "expirationDays": 90}
    password_policy JSONB DEFAULT '{"minLength": 8, "requireUppercase": true, "requireNumbers": true, "requireSpecialChars": false, "expirationDays": null}',
    
    -- Tiempo de sesión inactiva antes de cerrar sesión (minutos)
    session_timeout_minutes INTEGER DEFAULT 120,
    
    -- Whitelist de IPs permitidas (JSON array) - Solo para planes Enterprise
    -- Ejemplo: ["192.168.1.0/24", "10.0.0.1"]
    ip_whitelist JSONB DEFAULT '[]',
    
    -- Permitir acceso desde dispositivos móviles
    allow_mobile_access BOOLEAN DEFAULT true,
    
    -- Permitir acceso desde API externa
    allow_api_access BOOLEAN DEFAULT false,
    
    -- API Key para integraciones externas (generada automáticamente)
    api_key VARCHAR(100) UNIQUE,
    
    
    -- =====================================================
    -- 8. INTEGRACIÓN CON NÓMINA
    -- =====================================================
    
    -- Sistema de nómina utilizado: 'TIMBRADO', 'SAP', 'CONTPAQ', 'ASPEL_NOI', 'CUSTOM', 'NONE'
    payroll_system VARCHAR(50) DEFAULT 'NONE',
    
    -- Configuración específica del sistema de nómina (JSON)
    -- Ejemplo: {"endpoint": "https://api.timbrado.com", "apiKey": "xxx", "companyCode": "ACME01"}
    payroll_config JSONB DEFAULT '{}',
    
    -- Habilitar exportación automática de asistencias a nómina
    payroll_auto_export BOOLEAN DEFAULT false,
    
    -- Frecuencia de exportación: 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'MANUAL'
    payroll_export_frequency VARCHAR(20) DEFAULT 'MANUAL',
    
    -- Día de corte para exportación de nómina (1-31)
    payroll_cutoff_day SMALLINT,
    
    
    -- =====================================================
    -- 9. CARACTERÍSTICAS HABILITADAS (Feature Flags)
    -- =====================================================
    
    -- Módulos habilitados según plan (JSON)
    -- Ejemplo: {
    --   "shift_management": true,
    --   "attendance_tracking": true,
    --   "time_off_requests": true,
    --   "payroll_integration": false,
    --   "advanced_reports": true,
    --   "mobile_app": true,
    --   "biometric_integration": false,
    --   "geofencing": false,
    --   "custom_workflows": false
    -- }
    features_enabled JSONB DEFAULT '{
        "shift_management": true,
        "attendance_tracking": true,
        "time_off_requests": true,
        "payroll_integration": false,
        "advanced_reports": false,
        "mobile_app": false,
        "biometric_integration": false,
        "geofencing": false,
        "custom_workflows": false
    }',
    
    -- Webhooks configurados para eventos (JSON array)
    -- Ejemplo: [{"event": "attendance.checked_in", "url": "https://api.cliente.com/webhook"}]
    webhooks JSONB DEFAULT '[]',
    
    
    -- =====================================================
    -- 10. LICENCIAMIENTO ON-PREMISE
    -- =====================================================
    
    -- Tipo de despliegue: 'SAAS', 'ON_PREMISE', 'HYBRID'
    deployment_type VARCHAR(20) DEFAULT 'SAAS',
    
    -- Llave de licencia (para instalaciones On-Premise)
    license_key VARCHAR(100) UNIQUE,
    
    -- Fecha de expiración de la licencia On-Premise
    license_expiration_date DATE,
    
    -- Identificador único de la instalación (para control de licencias)
    installation_id VARCHAR(100) UNIQUE,
    
    -- Versión del software instalado (para On-Premise)
    software_version VARCHAR(20),
    
    -- Última fecha de sincronización con servidor central (para On-Premise)
    last_sync_date TIMESTAMPTZ,
    
    
    -- =====================================================
    -- 11. AUDITORÍA Y CONTROL
    -- =====================================================
    
    -- Estado del tenant
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Razón de desactivación (si is_active = false)
    deactivation_reason TEXT,
    
    -- Fecha de desactivación
    deactivated_at TIMESTAMPTZ,
    
    -- Notas internas del equipo de soporte
    internal_notes TEXT,
    
    -- Auditoría: Creación
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Auditoría: Última actualización
    updated_at TIMESTAMPTZ,
    updated_by UUID REFERENCES auth.users(id),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    
    
    -- =====================================================
    -- CONSTRAINTS
    -- =====================================================
    
    CONSTRAINT chk_tenant_slug_format 
        CHECK (tenant_slug ~ '^[a-z0-9-]+$'), -- Solo minúsculas, números y guiones
    
    CONSTRAINT chk_subscription_plan 
        CHECK (subscription_plan IN ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM')),
    
    CONSTRAINT chk_subscription_status 
        CHECK (subscription_status IN ('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')),
    
    CONSTRAINT chk_deployment_type 
        CHECK (deployment_type IN ('SAAS', 'ON_PREMISE', 'HYBRID')),
    
    CONSTRAINT chk_currency_code_format 
        CHECK (currency_code ~ '^[A-Z]{3}$'), -- ISO 4217
    
    CONSTRAINT chk_country_code_format 
        CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'), -- ISO 3166-1
    
    CONSTRAINT chk_week_start_day 
        CHECK (week_start_day BETWEEN 0 AND 6),
    
    CONSTRAINT chk_payroll_cutoff_day 
        CHECK (payroll_cutoff_day IS NULL OR payroll_cutoff_day BETWEEN 1 AND 31)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_tenants_slug ON public.tenants(tenant_slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_tax_id ON public.tenants(tax_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_subscription_status ON public.tenants(subscription_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_is_active ON public.tenants(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_deployment_type ON public.tenants(deployment_type);
CREATE INDEX idx_tenants_created_at ON public.tenants(created_at);

-- Índice para búsqueda por nombre (text search)
CREATE INDEX idx_tenants_name_trgm ON public.tenants USING gin(tenant_name gin_trgm_ops) WHERE deleted_at IS NULL;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE public.tenants IS 'Tabla principal de clientes/empresas del sistema multi-tenant Turnos Titanium';

COMMENT ON COLUMN public.tenants.tenant_slug IS 'Identificador único amigable para URLs (ej: acme-corp.turnos-titanium.com)';
COMMENT ON COLUMN public.tenants.subscription_plan IS 'Plan contratado que determina características y límites disponibles';
COMMENT ON COLUMN public.tenants.features_enabled IS 'Feature flags que controlan qué módulos están habilitados para este tenant';
COMMENT ON COLUMN public.tenants.deployment_type IS 'Tipo de instalación: SaaS (multi-tenant cloud), On-Premise (servidor dedicado), o Hybrid';
COMMENT ON COLUMN public.tenants.license_key IS 'Llave de licencia única para instalaciones On-Premise (se valida contra servidor de licencias)';

-- =====================================================
-- TRIGGER PARA updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenants_updated_at();

-- =====================================================
-- FUNCIÓN PARA GENERAR API KEY ÚNICA
-- =====================================================

CREATE OR REPLACE FUNCTION generate_tenant_api_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.allow_api_access = true AND NEW.api_key IS NULL THEN
        NEW.api_key := 'tt_' || encode(gen_random_bytes(32), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_tenant_api_key
    BEFORE INSERT OR UPDATE OF allow_api_access ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION generate_tenant_api_key();

-- =====================================================
-- DATOS INICIALES: Tenant del Sistema (Super Admin)
-- =====================================================

INSERT INTO public.tenants (
    id,
    tenant_name,
    tenant_slug,
    legal_name,
    tax_id,
    primary_contact_email,
    subscription_plan,
    subscription_status,
    deployment_type,
    is_active,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Turnos Titanium System',
    'system',
    'Turnos Titanium Platform',
    'SYSTEM-000',
    'admin@turnos-titanium.com',
    'ENTERPRISE',
    'ACTIVE',
    'SAAS',
    true,
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

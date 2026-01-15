# 🏢 Tabla TENANTS - Guía Completa para Turnos Titanium

## 📋 Índice
1. [Visión General](#visión-general)
2. [Estructura por Secciones](#estructura-por-secciones)
3. [Casos de Uso Reales](#casos-de-uso-reales)
4. [Flujo de Registro](#flujo-de-registro)
5. [Planes y Límites](#planes-y-límites)
6. [SaaS vs On-Premise](#saas-vs-on-premise)
7. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🎯 Visión General

La tabla `tenants` es el **corazón del sistema multi-tenant** de Turnos Titanium. Cada registro representa una **empresa/organización cliente** que usa el sistema.

### Características Principales:
- ✅ **Multi-tenant SaaS**: Un tenant por empresa
- ✅ **On-Premise Support**: Licenciamiento para instalaciones dedicadas
- ✅ **Planes flexibles**: FREE, BASIC, PROFESSIONAL, ENTERPRISE
- ✅ **Configuración regional**: Timezone, idioma, moneda
- ✅ **Branding personalizado**: Logos, colores corporativos
- ✅ **Integración con nómina**: SAP, ContPaq, Aspel NOI, etc.
- ✅ **Seguridad enterprise**: 2FA, whitelist IPs, políticas de contraseñas

---

## 🏗️ Estructura por Secciones

### 1️⃣ Identificación Básica

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `id` | UUID | Identificador único del tenant | `a7f3c8d1-...` |
| `tenant_name` | VARCHAR(150) | Nombre comercial | `"Acme Corporation"` |
| `tenant_slug` | VARCHAR(100) | URL amigable (único) | `"acme-corp"` |
| `legal_name` | VARCHAR(250) | Razón social legal | `"Acme Corp S.A. de C.V."` |

**Uso del slug:**
```
https://acme-corp.turnos-titanium.com
https://app.turnos-titanium.com/acme-corp
```

---

### 2️⃣ Información Legal/Fiscal

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `tax_id` | VARCHAR(50) | RUC/NIT/RFC/Tax ID | `"ACM850101XYZ"` (México) |
| `business_type` | VARCHAR(30) | Tipo de empresa | `"CORPORATION"` |
| `industry` | VARCHAR(50) | Sector/Industria | `"RETAIL"`, `"HEALTHCARE"` |
| `company_size` | VARCHAR(20) | Tamaño | `"MEDIUM"` (51-250 empleados) |

**Valores permitidos:**

**business_type:**
- `CORPORATION` - Sociedad Anónima
- `LLC` - Sociedad de Responsabilidad Limitada
- `SOLE_PROPRIETOR` - Persona Física con Actividad Empresarial
- `NGO` - Organización sin fines de lucro
- `GOVERNMENT` - Entidad gubernamental
- `OTHER` - Otro

**industry:**
- `RETAIL` - Comercio/Retail
- `MANUFACTURING` - Manufactura
- `HEALTHCARE` - Salud
- `HOSPITALITY` - Hotelería/Restaurantes
- `TECHNOLOGY` - Tecnología
- `CONSTRUCTION` - Construcción
- `EDUCATION` - Educación
- `FINANCE` - Finanzas
- `LOGISTICS` - Logística/Transporte

**company_size:**
- `SMALL` - 1-50 empleados
- `MEDIUM` - 51-250 empleados
- `LARGE` - 251-1000 empleados
- `ENTERPRISE` - 1000+ empleados

---

### 3️⃣ Datos de Contacto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `primary_contact_name` | VARCHAR(150) | Nombre del contacto principal |
| `primary_contact_email` | VARCHAR(150) | Email (obligatorio) |
| `primary_contact_phone` | VARCHAR(30) | Teléfono |
| `address_line1` | VARCHAR(250) | Dirección línea 1 |
| `address_line2` | VARCHAR(250) | Dirección línea 2 (opcional) |
| `city` | VARCHAR(100) | Ciudad |
| `state_province` | VARCHAR(100) | Estado/Provincia |
| `country_code` | CHAR(2) | Código país ISO (MX, US, ES) |
| `postal_code` | VARCHAR(20) | Código postal |
| `website_url` | VARCHAR(250) | Sitio web corporativo |

**Ejemplo completo:**
```json
{
  "primary_contact_name": "Juan Pérez",
  "primary_contact_email": "juan.perez@acmecorp.com",
  "primary_contact_phone": "+52 55 1234 5678",
  "address_line1": "Av. Insurgentes Sur 1234",
  "address_line2": "Piso 5, Oficina 502",
  "city": "Ciudad de México",
  "state_province": "CDMX",
  "country_code": "MX",
  "postal_code": "03900",
  "website_url": "https://www.acmecorp.com"
}
```

---

### 4️⃣ Configuración de Suscripción (SaaS)

| Campo | Tipo | Descripción | Valores |
|-------|------|-------------|---------|
| `subscription_plan` | VARCHAR(30) | Plan contratado | FREE, BASIC, PROFESSIONAL, ENTERPRISE, CUSTOM |
| `subscription_status` | VARCHAR(30) | Estado actual | TRIAL, ACTIVE, SUSPENDED, CANCELLED, EXPIRED |
| `trial_start_date` | DATE | Inicio del trial | `2026-01-07` |
| `trial_end_date` | DATE | Fin del trial | `2026-02-07` (30 días) |
| `subscription_start_date` | DATE | Inicio de suscripción paga | `2026-02-08` |
| `subscription_end_date` | DATE | Fin de suscripción | `2027-02-08` (anual) |
| `max_users` | INTEGER | Límite de usuarios | 10, 50, 100, ∞ |
| `max_locations` | INTEGER | Límite de localidades | 1, 5, 10, ∞ |
| `max_departments` | INTEGER | Límite de departamentos | 5, 20, 50, ∞ |
| `max_employees` | INTEGER | Límite de empleados | 50, 200, 1000, ∞ |
| `billing_customer_id` | VARCHAR(100) | ID en Stripe/PayPal | `cus_abc123xyz` |
| `billing_subscription_id` | VARCHAR(100) | ID de suscripción | `sub_def456uvw` |

**Ciclo de vida de suscripción:**
```
TRIAL → ACTIVE → SUSPENDED → CANCELLED
  ↓        ↓          ↓
ACTIVE  EXPIRED   EXPIRED
```

---

### 5️⃣ Configuración Regional

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `timezone` | VARCHAR(50) | Zona horaria | `"America/Mexico_City"` |
| `default_language_code` | VARCHAR(10) | Idioma por defecto | `"es"`, `"en"` |
| `currency_code` | CHAR(3) | Moneda (ISO 4217) | `"MXN"`, `"USD"`, `"EUR"` |
| `date_format` | VARCHAR(20) | Formato de fecha | `"DD/MM/YYYY"`, `"MM/DD/YYYY"` |
| `time_format` | VARCHAR(10) | Formato de hora | `"24h"`, `"12h"` |
| `week_start_day` | SMALLINT | Primer día de semana | 0=Domingo, 1=Lunes |

**Ejemplo para empresa mexicana:**
```sql
timezone = 'America/Mexico_City'
default_language_code = 'es'
currency_code = 'MXN'
date_format = 'DD/MM/YYYY'
time_format = '24h'
week_start_day = 1  -- Lunes
```

**Ejemplo para empresa estadounidense:**
```sql
timezone = 'America/New_York'
default_language_code = 'en'
currency_code = 'USD'
date_format = 'MM/DD/YYYY'
time_format = '12h'
week_start_day = 0  -- Domingo
```

---

### 6️⃣ Branding y Personalización

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `logo_url` | TEXT | URL del logo de la empresa |
| `favicon_url` | TEXT | URL del favicon |
| `primary_color` | VARCHAR(7) | Color principal (hex) |
| `secondary_color` | VARCHAR(7) | Color secundario (hex) |
| `accent_color` | VARCHAR(7) | Color de acento (hex) |
| `custom_domain` | VARCHAR(150) | Dominio personalizado (Enterprise) |
| `ui_preferences` | JSONB | Preferencias de UI adicionales |

**Ejemplo de branding:**
```json
{
  "logo_url": "https://cdn.acmecorp.com/logo.png",
  "favicon_url": "https://cdn.acmecorp.com/favicon.ico",
  "primary_color": "#E63946",    // Rojo corporativo
  "secondary_color": "#457B9D",  // Azul corporativo
  "accent_color": "#F1A208",     // Amarillo de acento
  "custom_domain": "turnos.acmecorp.com",
  "ui_preferences": {
    "theme": "light",
    "sidebarCollapsed": false,
    "compactMode": false,
    "showWelcomeBanner": true
  }
}
```

---

### 7️⃣ Seguridad y Políticas

| Campo | Tipo | Descripción | Default |
|-------|------|-------------|---------|
| `require_2fa` | BOOLEAN | Requiere 2FA obligatorio | `false` |
| `password_policy` | JSONB | Política de contraseñas | Ver abajo |
| `session_timeout_minutes` | INTEGER | Timeout de sesión | 120 minutos |
| `ip_whitelist` | JSONB | IPs permitidas (Enterprise) | `[]` |
| `allow_mobile_access` | BOOLEAN | Permite acceso móvil | `true` |
| `allow_api_access` | BOOLEAN | Permite API externa | `false` |
| `api_key` | VARCHAR(100) | API Key autogenerada | `tt_abc123...` |

**Ejemplo de password_policy:**
```json
{
  "minLength": 12,
  "requireUppercase": true,
  "requireLowercase": true,
  "requireNumbers": true,
  "requireSpecialChars": true,
  "expirationDays": 90,
  "preventReuse": 5,  // No puede reusar últimas 5 contraseñas
  "maxFailedAttempts": 5
}
```

**Ejemplo de ip_whitelist (solo Enterprise):**
```json
[
  "192.168.1.0/24",      // Oficina principal
  "10.0.0.1",            // VPN corporativa
  "203.0.113.45"         // IP externa del CEO
]
```

---

### 8️⃣ Integración con Nómina

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `payroll_system` | VARCHAR(50) | Sistema de nómina usado |
| `payroll_config` | JSONB | Configuración específica |
| `payroll_auto_export` | BOOLEAN | Exportación automática |
| `payroll_export_frequency` | VARCHAR(20) | Frecuencia de exportación |
| `payroll_cutoff_day` | SMALLINT | Día de corte (1-31) |

**Sistemas de nómina soportados:**
- `TIMBRADO` - Timbrado (México)
- `SAP` - SAP HCM
- `CONTPAQ` - ContPaq Nóminas (México)
- `ASPEL_NOI` - Aspel NOI (México)
- `WORKDAY` - Workday HCM
- `ADP` - ADP Workforce
- `CUSTOM` - Sistema personalizado (API genérica)
- `NONE` - Sin integración

**Ejemplo de configuración para ContPaq:**
```json
{
  "payroll_system": "CONTPAQ",
  "payroll_config": {
    "serverUrl": "https://api.contpaq.com/nominas",
    "apiKey": "cpq_abc123xyz",
    "companyCode": "ACME01",
    "version": "13.1.0",
    "exportFormat": "XML",
    "includeIncidences": true,
    "includeBonuses": true
  },
  "payroll_auto_export": true,
  "payroll_export_frequency": "BIWEEKLY",
  "payroll_cutoff_day": 15  // Día 15 y último día del mes
}
```

**Frecuencias de exportación:**
- `DAILY` - Diaria
- `WEEKLY` - Semanal
- `BIWEEKLY` - Quincenal (típico en México)
- `MONTHLY` - Mensual
- `MANUAL` - Solo manual

---

### 9️⃣ Características Habilitadas (Feature Flags)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `features_enabled` | JSONB | Módulos/características habilitadas |
| `webhooks` | JSONB | Configuración de webhooks |

**Estructura de features_enabled:**
```json
{
  "shift_management": true,          // Gestión de turnos
  "attendance_tracking": true,       // Registro de asistencias
  "time_off_requests": true,         // Solicitudes de ausencias
  "payroll_integration": true,       // Integración con nómina
  "advanced_reports": true,          // Reportes avanzados
  "mobile_app": true,                // App móvil
  "biometric_integration": false,    // Integración biométrica
  "geofencing": true,                // Geolocalización
  "custom_workflows": true,          // Flujos personalizados
  "api_access": false,               // API externa
  "sso": true,                       // Single Sign-On
  "audit_logs": true,                // Logs de auditoría
  "data_export": true,               // Exportación de datos
  "custom_fields": true              // Campos personalizados
}
```

**Configuración de webhooks:**
```json
[
  {
    "event": "attendance.checked_in",
    "url": "https://api.acmecorp.com/webhooks/attendance",
    "secret": "whsec_abc123xyz",
    "enabled": true
  },
  {
    "event": "shift.assigned",
    "url": "https://api.acmecorp.com/webhooks/shifts",
    "secret": "whsec_def456uvw",
    "enabled": true
  }
]
```

---

### 🔟 Licenciamiento On-Premise

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `deployment_type` | VARCHAR(20) | Tipo de despliegue |
| `license_key` | VARCHAR(100) | Llave de licencia única |
| `license_expiration_date` | DATE | Expiración de licencia |
| `installation_id` | VARCHAR(100) | ID único de instalación |
| `software_version` | VARCHAR(20) | Versión instalada |
| `last_sync_date` | TIMESTAMPTZ | Última sincronización |

**Tipos de despliegue:**
- `SAAS` - Multi-tenant en la nube (por defecto)
- `ON_PREMISE` - Servidor dedicado del cliente
- `HYBRID` - Parcialmente en nube, parcialmente on-premise

**Ejemplo On-Premise:**
```sql
deployment_type = 'ON_PREMISE'
license_key = 'TT-ONPREM-2026-ACME-XYZ123'
license_expiration_date = '2027-01-07'
installation_id = 'install_acme_prod_001'
software_version = 'v2.5.1'
last_sync_date = '2026-01-07 10:30:00+00'
```

**Validación de licencia:**
```
TT-ONPREM-2026-ACME-XYZ123
│   │     │    │     └─ Hash de validación
│   │     │    └─ Código del cliente
│   │     └─ Año de emisión
│   └─ Tipo (ON_PREMISE)
└─ Producto (Turnos Titanium)
```

---

### 1️⃣1️⃣ Auditoría y Control

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `is_active` | BOOLEAN | Tenant activo |
| `deactivation_reason` | TEXT | Razón de desactivación |
| `deactivated_at` | TIMESTAMPTZ | Fecha de desactivación |
| `internal_notes` | TEXT | Notas internas del equipo |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `created_by` | UUID | Usuario que creó |
| `updated_at` | TIMESTAMPTZ | Última actualización |
| `updated_by` | UUID | Usuario que actualizó |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | Usuario que eliminó |

**Razones de desactivación comunes:**
```
- "Suscripción expirada - Falta de pago"
- "Solicitud del cliente - Cierre de empresa"
- "Violación de términos de servicio"
- "Migración a instalación On-Premise"
- "Fusión con otro tenant"
```

---

## 🎬 Casos de Uso Reales

### Caso 1: PYME Retail en México (Plan BASIC)

```sql
INSERT INTO public.tenants (
    tenant_name,
    tenant_slug,
    legal_name,
    tax_id,
    business_type,
    industry,
    company_size,
    primary_contact_name,
    primary_contact_email,
    primary_contact_phone,
    address_line1,
    city,
    state_province,
    country_code,
    postal_code,
    subscription_plan,
    subscription_status,
    subscription_start_date,
    subscription_end_date,
    max_users,
    max_locations,
    max_departments,
    max_employees,
    timezone,
    default_language_code,
    currency_code,
    date_format,
    time_format,
    week_start_day,
    payroll_system,
    payroll_export_frequency,
    payroll_cutoff_day,
    features_enabled
) VALUES (
    'La Tiendita',
    'la-tiendita',
    'La Tiendita S.A. de C.V.',
    'LTI850101ABC',
    'LLC',
    'RETAIL',
    'SMALL',
    'María González',
    'maria@latiendita.com.mx',
    '+52 55 1234 5678',
    'Calle Principal 123',
    'Guadalajara',
    'Jalisco',
    'MX',
    '44100',
    'BASIC',
    'ACTIVE',
    '2026-01-07',
    '2027-01-07',
    10,
    2,
    5,
    50,
    'America/Mexico_City',
    'es',
    'MXN',
    'DD/MM/YYYY',
    '24h',
    1,
    'CONTPAQ',
    'BIWEEKLY',
    15,
    '{
        "shift_management": true,
        "attendance_tracking": true,
        "time_off_requests": true,
        "payroll_integration": true,
        "advanced_reports": false,
        "mobile_app": false,
        "biometric_integration": false,
        "geofencing": false,
        "custom_workflows": false
    }'::jsonb
);
```

---

### Caso 2: Empresa Enterprise en USA (Plan ENTERPRISE)

```sql
INSERT INTO public.tenants (
    tenant_name,
    tenant_slug,
    legal_name,
    tax_id,
    business_type,
    industry,
    company_size,
    primary_contact_name,
    primary_contact_email,
    primary_contact_phone,
    address_line1,
    address_line2,
    city,
    state_province,
    country_code,
    postal_code,
    website_url,
    subscription_plan,
    subscription_status,
    subscription_start_date,
    max_users,
    max_locations,
    max_departments,
    max_employees,
    timezone,
    default_language_code,
    currency_code,
    date_format,
    time_format,
    week_start_day,
    logo_url,
    primary_color,
    secondary_color,
    custom_domain,
    require_2fa,
    password_policy,
    session_timeout_minutes,
    ip_whitelist,
    allow_api_access,
    payroll_system,
    payroll_auto_export,
    payroll_export_frequency,
    features_enabled
) VALUES (
    'TechGiant Inc',
    'techgiant',
    'TechGiant Incorporated',
    '12-3456789',
    'CORPORATION',
    'TECHNOLOGY',
    'ENTERPRISE',
    'John Smith',
    'john.smith@techgiant.com',
    '+1 555 123 4567',
    '100 Tech Street',
    'Suite 2000',
    'San Francisco',
    'California',
    'US',
    '94105',
    'https://www.techgiant.com',
    'ENTERPRISE',
    'ACTIVE',
    '2025-01-01',
    NULL,  -- Sin límite de usuarios
    NULL,  -- Sin límite de localidades
    NULL,  -- Sin límite de departamentos
    NULL,  -- Sin límite de empleados
    'America/Los_Angeles',
    'en',
    'USD',
    'MM/DD/YYYY',
    '12h',
    0,  -- Semana empieza en domingo
    'https://cdn.techgiant.com/logo.png',
    '#0052CC',
    '#36B37E',
    'attendance.techgiant.com',
    true,  -- 2FA obligatorio
    '{
        "minLength": 14,
        "requireUppercase": true,
        "requireLowercase": true,
        "requireNumbers": true,
        "requireSpecialChars": true,
        "expirationDays": 60,
        "preventReuse": 10,
        "maxFailedAttempts": 3
    }'::jsonb,
    60,  -- 1 hora de sesión
    '["203.0.113.0/24", "198.51.100.10"]'::jsonb,
    true,  -- API habilitada
    'WORKDAY',
    true,  -- Auto-export
    'BIWEEKLY',
    '{
        "shift_management": true,
        "attendance_tracking": true,
        "time_off_requests": true,
        "payroll_integration": true,
        "advanced_reports": true,
        "mobile_app": true,
        "biometric_integration": true,
        "geofencing": true,
        "custom_workflows": true,
        "api_access": true,
        "sso": true,
        "audit_logs": true,
        "data_export": true,
        "custom_fields": true
    }'::jsonb
);
```

---

### Caso 3: Hospital On-Premise (Plan CUSTOM)

```sql
INSERT INTO public.tenants (
    tenant_name,
    tenant_slug,
    legal_name,
    tax_id,
    business_type,
    industry,
    company_size,
    primary_contact_name,
    primary_contact_email,
    address_line1,
    city,
    country_code,
    subscription_plan,
    subscription_status,
    deployment_type,
    license_key,
    license_expiration_date,
    installation_id,
    software_version,
    timezone,
    default_language_code,
    currency_code,
    require_2fa,
    ip_whitelist,
    features_enabled
) VALUES (
    'Hospital San Rafael',
    'hospital-san-rafael',
    'Hospital San Rafael S.A.',
    'HSR920101XYZ',
    'CORPORATION',
    'HEALTHCARE',
    'LARGE',
    'Dr. Roberto Medina',
    'ti@hospitalsanrafael.org',
    'Av. Reforma 500',
    'Monterrey',
    'MX',
    'CUSTOM',
    'ACTIVE',
    'ON_PREMISE',
    'TT-ONPREM-2026-HSR-ABC123DEF456',
    '2027-12-31',
    'install_hsr_prod_001',
    'v2.5.1',
    'America/Monterrey',
    'es',
    'MXN',
    true,  -- 2FA obligatorio (sector salud)
    '["10.10.0.0/16"]'::jsonb,  -- Solo red interna del hospital
    '{
        "shift_management": true,
        "attendance_tracking": true,
        "time_off_requests": true,
        "payroll_integration": true,
        "advanced_reports": true,
        "mobile_app": false,
        "biometric_integration": true,
        "geofencing": false,
        "custom_workflows": true,
        "api_access": false,
        "sso": true,
        "audit_logs": true,
        "data_export": true,
        "custom_fields": true
    }'::jsonb
);
```

---

## 🚀 Flujo de Registro

### Flujo SaaS (Auto-registro):

```
1. Usuario llega al landing page
   ↓
2. Click en "Comenzar Prueba Gratuita"
   ↓
3. Formulario de registro:
   - Nombre de la empresa
   - Email corporativo
   - Contraseña
   - [Opcionalmente] RFC/Tax ID
   ↓
4. Sistema crea:
   a) Registro en auth.users (Supabase Auth)
   b) Registro en tenants con:
      - tenant_slug autogenerado (ej: empresa-123)
      - subscription_plan = 'FREE'
      - subscription_status = 'TRIAL'
      - trial_start_date = HOY
      - trial_end_date = HOY + 30 días
      - max_users = 5
      - max_employees = 25
   c) Registro en tenant_members (vincula user con tenant)
   d) Registro en user_roles (asigna rol ADMIN al primer usuario)
   ↓
5. Usuario accede al Dashboard
   ↓
6. Wizard de configuración inicial:
   - Completar datos de la empresa
   - Configurar zona horaria
   - Crear primera localidad
   - Invitar usuarios
   ↓
7. Al día 25 del trial:
   - Mostrar banner: "Te quedan 5 días de prueba"
   - Botón: "Actualizar a plan pago"
   ↓
8. Usuario selecciona plan y paga
   ↓
9. Sistema actualiza tenant:
   - subscription_plan = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
   - subscription_status = 'ACTIVE'
   - subscription_start_date = HOY
   - subscription_end_date = HOY + 1 año
   - billing_customer_id = 'cus_xyz' (de Stripe)
   - billing_subscription_id = 'sub_abc' (de Stripe)
   - Actualiza max_users, max_locations según plan
```

---

### Flujo On-Premise (Contacto Comercial):

```
1. Cliente contacta equipo de ventas
   ↓
2. Evaluación de requerimientos:
   - Número de empleados
   - Número de localidades
   - Módulos requeridos
   - Integraciones necesarias
   - Infraestructura disponible
   ↓
3. Propuesta comercial y cotización
   ↓
4. Cliente firma contrato
   ↓
5. Equipo técnico crea tenant en base de datos:
   ```sql
   INSERT INTO tenants (
       tenant_name,
       tenant_slug,
       legal_name,
       tax_id,
       deployment_type,
       license_key,  -- Generada por sistema de licencias
       license_expiration_date,
       subscription_plan,
       subscription_status,
       features_enabled
   ) VALUES (...);
   ```
   ↓
6. Instalación en servidor del cliente:
   - Deploy de aplicación
   - Configuración de base de datos
   - Activación con license_key
   - Configuración de red/firewall
   ↓
7. Validación de licencia:
   - App se conecta a servidor de licencias
   - Envía: license_key + installation_id
   - Recibe: confirmación + fecha de expiración
   ↓
8. Capacitación del equipo del cliente
   ↓
9. Go-live
   ↓
10. Sincronización periódica:
    - last_sync_date se actualiza cada 24h
    - Envía telemetría anónima (opcional)
    - Verifica vigencia de licencia
```

---

## 📊 Planes y Límites

| Característica | FREE | BASIC | PROFESSIONAL | ENTERPRISE |
|----------------|------|-------|--------------|------------|
| **Precio** | $0 | $199/mes | $499/mes | Custom |
| **Trial** | 30 días | No | No | No |
| **Usuarios** | 5 | 25 | 100 | Ilimitado |
| **Empleados** | 25 | 100 | 500 | Ilimitado |
| **Localidades** | 1 | 3 | 10 | Ilimitado |
| **Departamentos** | 3 | 10 | 50 | Ilimitado |
| **Gestión de turnos** | ✅ | ✅ | ✅ | ✅ |
| **Registro de asistencias** | ✅ | ✅ | ✅ | ✅ |
| **Solicitudes de ausencias** | ✅ | ✅ | ✅ | ✅ |
| **Integración nómina** | ❌ | ✅ | ✅ | ✅ |
| **Reportes básicos** | ✅ | ✅ | ✅ | ✅ |
| **Reportes avanzados** | ❌ | ❌ | ✅ | ✅ |
| **App móvil** | ❌ | ❌ | ✅ | ✅ |
| **Integración biométrica** | ❌ | ❌ | ❌ | ✅ |
| **Geofencing** | ❌ | ❌ | ✅ | ✅ |
| **Workflows personalizados** | ❌ | ❌ | ❌ | ✅ |
| **API externa** | ❌ | ❌ | ❌ | ✅ |
| **SSO (SAML/OAuth)** | ❌ | ❌ | ❌ | ✅ |
| **2FA obligatorio** | ❌ | ❌ | Opcional | ✅ |
| **IP Whitelist** | ❌ | ❌ | ❌ | ✅ |
| **Dominio personalizado** | ❌ | ❌ | ❌ | ✅ |
| **Branding personalizado** | ❌ | ❌ | Parcial | Completo |
| **Soporte** | Email | Email | Email + Chat | Dedicado |
| **On-Premise** | ❌ | ❌ | ❌ | ✅ |

---

## 🆚 SaaS vs On-Premise

### Cuándo usar SaaS:

✅ **Ventajas:**
- ✅ Implementación inmediata (minutos)
- ✅ Sin inversión en infraestructura
- ✅ Actualizaciones automáticas
- ✅ Escalabilidad automática
- ✅ Soporte incluido
- ✅ Pago por uso (OpEx vs CapEx)
- ✅ Acceso desde cualquier lugar

❌ **Desventajas:**
- ❌ Datos en la nube (puede ser limitación regulatoria)
- ❌ Dependencia de conectividad internet
- ❌ Menos personalización
- ❌ Costos recurrentes

**Ideal para:**
- PYMEs sin equipo de IT
- Empresas con múltiples ubicaciones
- Startups en crecimiento
- Equipos remotos/distribuidos

---

### Cuándo usar On-Premise:

✅ **Ventajas:**
- ✅ Control total de datos
- ✅ Cumplimiento regulatorio (HIPAA, sector financiero)
- ✅ Personalización completa
- ✅ Integración profunda con sistemas legacy
- ✅ Sin dependencia de internet
- ✅ Sin límites de almacenamiento

❌ **Desventajas:**
- ❌ Inversión inicial alta (CapEx)
- ❌ Requiere equipo de IT
- ❌ Responsabilidad de backups/seguridad
- ❌ Actualizaciones manuales
- ❌ Escalabilidad manual

**Ideal para:**
- Hospitales/sector salud
- Bancos/sector financiero
- Gobierno
- Empresas con datos sensibles
- Zonas con conectividad limitada

---

## ❓ Preguntas Frecuentes

### 1. ¿Puedo cambiar de plan posteriormente?

Sí, en cualquier momento. El cambio se refleja inmediatamente en `subscription_plan` y los límites se ajustan automáticamente.

```sql
-- Upgrade de BASIC a PROFESSIONAL
UPDATE public.tenants
SET 
    subscription_plan = 'PROFESSIONAL',
    max_users = 100,
    max_employees = 500,
    max_locations = 10,
    features_enabled = features_enabled || '{
        "advanced_reports": true,
        "mobile_app": true,
        "geofencing": true
    }'::jsonb,
    updated_at = NOW(),
    updated_by = <user_id>
WHERE id = <tenant_id>;
```

---

### 2. ¿Qué pasa cuando se vence la suscripción?

```sql
-- Cuando subscription_end_date < HOY
-- Sistema automáticamente:

UPDATE public.tenants
SET 
    subscription_status = 'EXPIRED',
    is_active = false,
    deactivation_reason = 'Suscripción expirada - Renovar antes de ' || subscription_end_date,
    deactivated_at = NOW()
WHERE id = <tenant_id>;

-- El tenant queda en "modo solo lectura"
-- Los usuarios pueden ver datos pero no modificar
-- Se muestra banner: "Tu suscripción ha expirado. Renueva para continuar."
```

---

### 3. ¿Cómo funciona el slug automático?

```javascript
// Frontend - Al registrar empresa
function generateSlug(tenantName) {
    let slug = tenantName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
        .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
        .trim()
        .replace(/\s+/g, '-') // Espacios -> guiones
        .replace(/-+/g, '-'); // Múltiples guiones -> uno solo
    
    // Si ya existe, agregar número
    // "acme-corp" -> "acme-corp-2"
    
    return slug;
}

// Ejemplos:
// "Acme Corporation" -> "acme-corporation"
// "La Tiendita México" -> "la-tiendita-mexico"
// "Café & Té 2000" -> "cafe-te-2000"
```

---

### 4. ¿Cómo se valida la licencia On-Premise?

```javascript
// Servidor del cliente hace request periódico:

POST https://licenses.turnos-titanium.com/validate
{
    "license_key": "TT-ONPREM-2026-ACME-XYZ123",
    "installation_id": "install_acme_prod_001",
    "software_version": "v2.5.1",
    "tenant_id": "uuid-del-tenant",
    "telemetry": {
        "total_users": 150,
        "total_employees": 800,
        "total_locations": 12
    }
}

// Respuesta del servidor de licencias:
{
    "valid": true,
    "license_type": "ENTERPRISE_ONPREM",
    "expiration_date": "2027-12-31",
    "features_allowed": ["all"],
    "max_users": 500,
    "days_until_expiration": 359
}

// Si la licencia está por vencer (<30 días):
// - Mostrar banner warning en dashboard
// - Enviar emails automáticos al admin
// - Contactar al equipo comercial

// Si la licencia expiró:
// - Modo solo lectura (grace period de 7 días)
// - Después de 7 días: bloqueo total
```

---

### 5. ¿Puedo tener múltiples empresas con el mismo Tax ID?

**No** directamente, pero sí con workarounds:

```sql
-- Opción 1: Diferentes divisiones/subsidiarias
INSERT INTO tenants (tenant_name, tax_id, ...)
VALUES 
    ('Acme Corp - División Norte', 'ACM123', ...),
    ('Acme Corp - División Sur', 'ACM123', ...);

-- Opción 2: Tax ID con sufijo
INSERT INTO tenants (tenant_name, tax_id, ...)
VALUES 
    ('Acme Manufacturing', 'ACM123-MFG', ...),
    ('Acme Logistics', 'ACM123-LOG', ...);

-- Opción 3: Usar tenant padre-hijo (requiere nueva tabla)
-- tenants_hierarchy:
-- parent_tenant_id | child_tenant_id | relationship_type
```

---

### 6. ¿Cómo manejar fusión de empresas?

```sql
-- Escenario: Empresa B se fusiona con Empresa A
-- Queremos migrar todos los datos de B a A

BEGIN;

-- 1. Actualizar tenant_id en todas las tablas relacionadas
UPDATE employees SET tenant_id = <tenant_a_id> WHERE tenant_id = <tenant_b_id>;
UPDATE locations SET tenant_id = <tenant_a_id> WHERE tenant_id = <tenant_b_id>;
UPDATE departments SET tenant_id = <tenant_a_id> WHERE tenant_id = <tenant_b_id>;
UPDATE shifts SET tenant_id = <tenant_a_id> WHERE tenant_id = <tenant_b_id>;
-- ... etc para todas las tablas con tenant_id

-- 2. Migrar usuarios
UPDATE tenant_members SET tenant_id = <tenant_a_id> WHERE tenant_id = <tenant_b_id>;

-- 3. Soft delete del tenant B
UPDATE tenants
SET 
    is_active = false,
    deleted_at = NOW(),
    deleted_by = <admin_user_id>,
    deactivation_reason = 'Fusionado con ' || <tenant_a_name>,
    internal_notes = 'Migración completada el ' || NOW() || '. Todos los datos transferidos a Tenant A.'
WHERE id = <tenant_b_id>;

COMMIT;
```

---

## 🎓 Resumen Ejecutivo

La tabla `tenants` es el **núcleo del sistema multi-tenant** y debe almacenar:

### ✅ **DEBE incluir:**
1. **Identificación única** (id, slug, legal_name, tax_id)
2. **Datos de contacto** (email, teléfono, dirección)
3. **Configuración de suscripción** (plan, estado, límites, fechas)
4. **Configuración regional** (timezone, idioma, moneda, formatos)
5. **Seguridad** (2FA, políticas de contraseña, IP whitelist)
6. **Branding** (logos, colores corporativos)
7. **Integración nómina** (sistema, configuración, frecuencia)
8. **Feature flags** (qué módulos están habilitados)
9. **Licenciamiento** (On-Premise, SaaS, fechas de expiración)
10. **Auditoría completa** (created, updated, deleted timestamps + users)

### ❌ **NO debe incluir:**
- ❌ Datos de usuarios individuales (van en `auth.users` y `tenant_members`)
- ❌ Datos transaccionales (empleados, turnos, asistencias)
- ❌ Configuraciones específicas de módulos (van en tablas específicas)

### 🎯 **Regla de oro:**
> **Si el dato aplica a TODA la empresa/organización → va en `tenants`**
> **Si el dato aplica a UN usuario/empleado/turno → va en tabla específica**

---

**¿Necesitas ayuda con alguna sección específica o quieres que generemos el script de migración final?** 🚀

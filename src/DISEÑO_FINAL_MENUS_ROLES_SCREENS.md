# 🎯 DISEÑO FINAL: MENÚS, ROLES Y SCREENS
## Turnos Titanium Enterprise - Mapeo Completo y Definitivo

**Fecha:** 2026-01-11  
**Versión:** FINAL  
**Estado:** LISTO PARA IMPLEMENTAR

---

## 📋 **CONFIRMACIONES APLICADAS**

1. ✅ **Screens SUBSCRIPTION eliminados** (no aplican en Enterprise On-Premise)
2. ✅ **"Mis Solicitudes" NO es screen separado** (integrado en cada pantalla KIOSK)
3. ✅ **Tablas verificadas:**
   - `employee_regularization_requests` → ❌ NO EXISTE → Crear
   - `employee_shift_change_requests` → ❌ NO EXISTE → Crear
4. ✅ **Ajustes mínimos a tablas existentes** (nullable, sin romper)
5. ✅ **Prefijos confirmados:** SEC_, CONF_, MANT_, ORG_, EMPL_, ATT_, RPT_, KIOSK_
6. ✅ **Mapeo de roles:**
   - SUPER_ADMIN → total + system
   - SYSTEM_ADMIN → funcional
   - RRHH_ADMIN / SUPERVISOR → mismas screens, diferencia SOLO en SCOPE
   - EMPLOYEE → solo KIOSK

---

## 1. **MENU GROUPS FINALES**

| Menu Group Key | Menu Group Name | Icon | Sort Order | Roles |
|---|---|---|---|---|
| `DASHBOARD` | Dashboard | LayoutDashboard | 10 | SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR |
| `SECURITY` | Seguridad | Shield | 20 | SUPER_ADMIN |
| `MAINT` | Mantenimiento | Settings | 30 | SYSTEM_ADMIN |
| `CONF` | Configuración | Cog | 40 | SYSTEM_ADMIN |
| `ORG` | Organización | Building2 | 50 | SYSTEM_ADMIN |
| `EMPL` | Empleados | Users | 60 | SYSTEM_ADMIN |
| `ATT` | Asistencia | Clock | 70 | RRHH_ADMIN, SUPERVISOR |
| `RPT` | Reportes | BarChart | 80 | RRHH_ADMIN, SUPERVISOR |
| `KIOSK` | Kiosko | Monitor | 90 | EMPLOYEE |

**Total Menu Groups:** 9

---

## 2. **SCREENS FINALES (48 screens)**

### **DASHBOARD (3 screens)**
| Screen Key | Screen Name | Menu Group | Roles | Actions Mínimas |
|---|---|---|---|---|
| `DASH_MAIN` | Dashboard Principal | DASHBOARD | SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR | VIEW |
| `DASH_ALERTS` | Alertas | DASHBOARD | SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR | VIEW |
| `DASH_TRENDS` | Tendencias | DASHBOARD | SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR | VIEW |

---

### **SECURITY (12 screens) - SUPER_ADMIN ONLY**
| Screen Key | Screen Name | Menu Group | Roles | Actions Mínimas |
|---|---|---|---|---|
| `SEC_MENU_GROUPS` | Grupos de Menú | SECURITY | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `SEC_SCREENS` | Pantallas | SECURITY | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `SEC_ACTIONS` | Acciones | SECURITY | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `SEC_SCREEN_ACTIONS` | Pantalla-Acciones | SECURITY | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `SEC_ROLES` | Roles | SECURITY | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `SEC_ROLE_PERMS` | Permisos por Rol | SECURITY | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `SEC_USER_ROLES` | Asignación de Roles | SECURITY | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `SEC_SCOPES` | Scopes | SECURITY | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `SEC_COPY_PERMS` | Copiar Permisos | SECURITY | SUPER_ADMIN | VIEW, COPY |
| `SEC_AUDIT` | Auditoría | SECURITY | SUPER_ADMIN | VIEW, EXPORT |
| `SEC_USERS` | Usuarios | SECURITY | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `SEC_SESSIONS` | Sesiones Activas | SECURITY | SUPER_ADMIN | VIEW, DELETE |

**Cambios:**
- `SEC_TENANT_MEMBERS` → `SEC_USERS` (simplificado)
- `SEC_LOGIN_SESSIONS` → `SEC_SESSIONS` (simplificado)

---

### **MAINT (5 screens) - SYSTEM_ADMIN**
| Screen Key | Screen Name | Menu Group | Roles | Actions Mínimas |
|---|---|---|---|---|
| `MANT_CATALOGS` | Catálogos Funcionales | MAINT | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `MANT_HOLIDAYS` | Feriados | MAINT | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `MANT_JUSTIFICATIONS` | Motivos de Justificación | MAINT | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `MANT_MESSAGES` | Mensajes del Sistema | MAINT | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `MANT_DEVICES` | Dispositivos | MAINT | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |

**Cambios:**
- `MANT_ATT_MOVEMENTS` → movido a CONF
- `MANT_ATT_EVENTS` → movido a CONF
- `CONF_DEVICES` → movido a MANT (es mantenimiento, no configuración)

---

### **CONF (7 screens) - SYSTEM_ADMIN**
| Screen Key | Screen Name | Menu Group | Roles | Actions Mínimas |
|---|---|---|---|---|
| `CONF_PARAMS` | Parámetros Generales | CONF | SYSTEM_ADMIN | VIEW, UPDATE |
| `CONF_SHIFTS` | Turnos | CONF | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `CONF_WORK_PATTERNS` | Patrones de Trabajo | CONF | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `CONF_SURCHARGES` | Reglas de Recargo | CONF | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `CONF_ATT_PROCESS` | Procesos de Asistencia | CONF | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE, RUN |
| `CONF_ATT_MOVEMENTS` | Movimientos de Asistencia | CONF | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `CONF_ATT_EVENTS` | Eventos de Asistencia | CONF | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |

**Cambios:**
- `MANT_ATT_MOVEMENTS` → `CONF_ATT_MOVEMENTS` (son configuración de asistencia)
- `MANT_ATT_EVENTS` → `CONF_ATT_EVENTS` (son configuración de asistencia)
- `CONF_TENANT_SETTINGS` → ELIMINADO (funcionalidad integrada en CONF_PARAMS o controlada por SUPER_ADMIN)

**Nuevo screen sugerido (opcional):**
- `CONF_KIOSK` → Configuración KIOSK + Contingencia (si quieres separarlo de CONF_PARAMS)

---

### **ORG (8 screens) - SYSTEM_ADMIN**
| Screen Key | Screen Name | Menu Group | Roles | Actions Mínimas |
|---|---|---|---|---|
| `ORG_COMPANIES` | Empresas | ORG | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `ORG_WORK_LOCATIONS` | Localidades | ORG | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `ORG_DEPARTMENTS` | Departamentos | ORG | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `ORG_AREAS` | Áreas | ORG | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `ORG_WORK_GROUPS` | Grupos de Trabajo | ORG | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `ORG_PAYROLL_GROUPS` | Grupos de Rol de Pago | ORG | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `ORG_JOB_TITLES` | Cargos | ORG | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `ORG_COST_CENTERS` | Centros de Costo | ORG | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |

**Sin cambios.**

---

### **EMPL (6 screens) - SYSTEM_ADMIN**
| Screen Key | Screen Name | Menu Group | Roles | Actions Mínimas |
|---|---|---|---|---|
| `EMPL_LIST` | Empleados | EMPL | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE, EXPORT, IMPORT |
| `EMPL_ASSIGN_COMPANY` | Asignación a Empresa | EMPL | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `EMPL_PROFILES` | Perfiles de Empleado | EMPL | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `EMPL_PROFILE_SETTINGS` | Ajustes por Perfil | EMPL | SYSTEM_ADMIN | VIEW, UPDATE |
| `EMPL_ABSENCE_REQUESTS` | Solicitudes de Ausencia | EMPL | SYSTEM_ADMIN | VIEW, APPROVE, REJECT |
| `EMPL_DOCUMENTS` | Documentos | EMPL | SYSTEM_ADMIN | VIEW, CREATE, UPDATE, DELETE, EXPORT |

**Decisión sobre `EMPL_ABSENCE_REQUESTS`:**
- ⚠️ **Opcional:** Mantener en EMPL para SYSTEM_ADMIN (ver solicitudes de todos los empleados)
- ⚠️ **Alternativa:** Mover a ATT para RRHH_ADMIN/SUPERVISOR (gestión operativa)
- **Sugerencia:** Mantener aquí para SYSTEM_ADMIN, y también dar acceso a RRHH_ADMIN/SUPERVISOR con scope

---

### **ATT (6 screens) - RRHH_ADMIN, SUPERVISOR (con scope)**
| Screen Key | Screen Name | Menu Group | Roles | Actions Mínimas |
|---|---|---|---|---|
| `ATT_TIME_PUNCHES` | Marcaciones | ATT | RRHH_ADMIN, SUPERVISOR | VIEW, CREATE, UPDATE, DELETE, EXPORT |
| `ATT_SHIFT_PLANS` | Planificación de Turnos | ATT | RRHH_ADMIN, SUPERVISOR | VIEW, CREATE, UPDATE, DELETE |
| `ATT_PROCESS_RUNS` | Ejecuciones de Proceso | ATT | RRHH_ADMIN, SUPERVISOR | VIEW, RUN, EXPORT |
| `ATT_CALC_RESULTS` | Resultados de Cálculo | ATT | RRHH_ADMIN, SUPERVISOR | VIEW, EXPORT |
| `ATT_APPROVALS` | Aprobaciones | ATT | RRHH_ADMIN, SUPERVISOR | VIEW, APPROVE, REJECT |
| `ATT_ANOMALIES` | Anomalías | ATT | RRHH_ADMIN, SUPERVISOR | VIEW, UPDATE, EXPORT |

**Sin cambios.**

**Nota:** RRHH_ADMIN tiene scope TOTAL, SUPERVISOR tiene scope LIMITADO por empresa/localidad/departamento/área/empleado/rol de pago.

---

### **RPT (4 screens) - RRHH_ADMIN, SUPERVISOR (con scope)**
| Screen Key | Screen Name | Menu Group | Roles | Actions Mínimas |
|---|---|---|---|---|
| `RPT_CATALOG` | Catálogo de Reportes | RPT | RRHH_ADMIN, SUPERVISOR | VIEW, RUN, EXPORT |
| `RPT_PARAMETERS` | Parámetros de Reportes | RPT | SYSTEM_ADMIN | VIEW, UPDATE |
| `RPT_PERMISSIONS` | Permisos de Reportes | RPT | SUPER_ADMIN | VIEW, CREATE, UPDATE, DELETE |
| `RPT_EXECUTIONS` | Ejecuciones | RPT | RRHH_ADMIN, SUPERVISOR | VIEW, EXPORT |

**Nota:**
- `RPT_PARAMETERS` → SYSTEM_ADMIN (configuración)
- `RPT_PERMISSIONS` → SUPER_ADMIN (seguridad)
- `RPT_CATALOG` y `RPT_EXECUTIONS` → RRHH_ADMIN, SUPERVISOR (operación)

---

### **KIOSK (5 screens) - EMPLOYEE**
| Screen Key | Screen Name | Menu Group | Roles | Actions Mínimas |
|---|---|---|---|---|
| `KIOSK_PUNCH` | Marcación | KIOSK | EMPLOYEE | MARK_ENTRY, MARK_EXIT, MARK_LUNCH_OUT, MARK_LUNCH_IN |
| `KIOSK_REGULARIZATION` | Regularizar Marcaciones | KIOSK | EMPLOYEE | VIEW, REQUEST_REGULARIZATION |
| `KIOSK_PERMISSION` | Solicitar Permisos | KIOSK | EMPLOYEE | VIEW, REQUEST_PERMISSION |
| `KIOSK_JUSTIFICATION` | Justificar Inasistencias | KIOSK | EMPLOYEE | VIEW, REQUEST_JUSTIFICATION |
| `KIOSK_SHIFT_CHANGE` | Solicitar Cambio de Turno | KIOSK | EMPLOYEE | VIEW, REQUEST_SHIFT_CHANGE |

**Nota:**
- ❌ NO incluyo "Mis Solicitudes" como screen separado
- ✅ Cada screen KIOSK muestra el estado de las solicitudes correspondientes (PENDING/APPROVED/REJECTED)
- ✅ Acciones nuevas: `MARK_ENTRY`, `MARK_EXIT`, `MARK_LUNCH_OUT`, `MARK_LUNCH_IN`, `REQUEST_REGULARIZATION`, `REQUEST_PERMISSION`, `REQUEST_JUSTIFICATION`, `REQUEST_SHIFT_CHANGE`

---

### **SCREENS ELIMINADOS (3)**
| Screen Key | Screen Name | Razón |
|---|---|---|
| `SUB_PLANS` | Planes | No aplica en Enterprise On-Premise |
| `SUB_TENANT_SUBS` | Suscripción del Tenant | No aplica en Enterprise On-Premise |
| `SUB_TRANSACTIONS` | Transacciones | No aplica en Enterprise On-Premise |

---

## 3. **RESUMEN POR ROL**

### 🔑 **SUPER_ADMIN (27 screens)**

**DASHBOARD (3):**
- DASH_MAIN, DASH_ALERTS, DASH_TRENDS

**SECURITY (12):**
- SEC_MENU_GROUPS, SEC_SCREENS, SEC_ACTIONS, SEC_SCREEN_ACTIONS
- SEC_ROLES, SEC_ROLE_PERMS, SEC_USER_ROLES, SEC_SCOPES
- SEC_COPY_PERMS, SEC_AUDIT, SEC_USERS, SEC_SESSIONS

**REPORTS (1):**
- RPT_PERMISSIONS

**+ ACCESO TOTAL a todos los demás screens (hereda permisos completos)**

---

### 🛡️ **SYSTEM_ADMIN (34 screens)**

**DASHBOARD (3):**
- DASH_MAIN, DASH_ALERTS, DASH_TRENDS

**MAINT (5):**
- MANT_CATALOGS, MANT_HOLIDAYS, MANT_JUSTIFICATIONS, MANT_MESSAGES, MANT_DEVICES

**CONF (7):**
- CONF_PARAMS, CONF_SHIFTS, CONF_WORK_PATTERNS, CONF_SURCHARGES
- CONF_ATT_PROCESS, CONF_ATT_MOVEMENTS, CONF_ATT_EVENTS

**ORG (8):**
- ORG_COMPANIES, ORG_WORK_LOCATIONS, ORG_DEPARTMENTS, ORG_AREAS
- ORG_WORK_GROUPS, ORG_PAYROLL_GROUPS, ORG_JOB_TITLES, ORG_COST_CENTERS

**EMPL (6):**
- EMPL_LIST, EMPL_ASSIGN_COMPANY, EMPL_PROFILES, EMPL_PROFILE_SETTINGS
- EMPL_ABSENCE_REQUESTS, EMPL_DOCUMENTS

**ATT (6):**
- ATT_TIME_PUNCHES, ATT_SHIFT_PLANS, ATT_PROCESS_RUNS, ATT_CALC_RESULTS
- ATT_APPROVALS, ATT_ANOMALIES

**RPT (2):**
- RPT_PARAMETERS, RPT_CATALOG

---

### 👥 **RRHH_ADMIN (16 screens - SCOPE TOTAL)**

**DASHBOARD (3):**
- DASH_MAIN, DASH_ALERTS, DASH_TRENDS

**EMPL (1):**
- EMPL_ABSENCE_REQUESTS

**ATT (6):**
- ATT_TIME_PUNCHES, ATT_SHIFT_PLANS, ATT_PROCESS_RUNS, ATT_CALC_RESULTS
- ATT_APPROVALS, ATT_ANOMALIES

**RPT (2):**
- RPT_CATALOG, RPT_EXECUTIONS

---

### 👥 **SUPERVISOR (16 screens - SCOPE LIMITADO)**

**MISMOS SCREENS QUE RRHH_ADMIN:**
- DASHBOARD (3)
- EMPL (1)
- ATT (6)
- RPT (2)

**Diferencia EXCLUSIVA:** SCOPE limitado por:
- Empresa
- Localidad
- Departamento
- Área
- Empleado
- **Rol de Pago (obligatorio)**

---

### 👤 **EMPLOYEE (5 screens - MODO KIOSK)**

**KIOSK (5):**
- KIOSK_PUNCH
- KIOSK_REGULARIZATION
- KIOSK_PERMISSION
- KIOSK_JUSTIFICATION
- KIOSK_SHIFT_CHANGE

**Al hacer login → redirige automáticamente a `/kiosk`**

---

## 4. **TABLAS NUEVAS MÍNIMAS (2 + ajustes)**

### **A. `employee_regularization_requests` (NUEVA)**

```sql
CREATE TABLE public.employee_regularization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  
  -- Marcación original (si existe)
  original_punch_id uuid NULL REFERENCES public.employee_time_punches(id) ON DELETE SET NULL,
  
  -- Datos de la regularización solicitada
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  requested_punch_key integer NOT NULL, -- 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN
  
  -- Motivo
  regularization_reason_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT,
  notes varchar(500) NULL,
  
  -- Estado
  request_status_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT, -- PENDING/APPROVED/REJECTED/CANCELLED
  request_source varchar(20) NOT NULL DEFAULT 'ADMIN', -- ADMIN/KIOSK/MOBILE
  
  -- Aprobación
  approved_by varchar(50) NULL,
  approved_at timestamptz NULL,
  rejection_reason varchar(500) NULL,
  
  -- Auditoría
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50) NULL,
  updated_at timestamptz NULL
);

CREATE INDEX idx_regularization_requests_employee ON public.employee_regularization_requests(employee_id, created_at DESC);
CREATE INDEX idx_regularization_requests_status ON public.employee_regularization_requests(request_status_id);
```

---

### **B. `employee_shift_change_requests` (NUEVA)**

```sql
CREATE TABLE public.employee_shift_change_requests (
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
  
  -- Estado
  request_status_id uuid NOT NULL REFERENCES public.lookup_values(id) ON DELETE RESTRICT, -- PENDING/APPROVED/REJECTED/CANCELLED
  request_source varchar(20) NOT NULL DEFAULT 'ADMIN', -- ADMIN/KIOSK/MOBILE
  
  -- Aprobación
  approved_by varchar(50) NULL,
  approved_at timestamptz NULL,
  rejection_reason varchar(500) NULL,
  
  -- Auditoría
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50) NULL,
  updated_at timestamptz NULL
);

CREATE INDEX idx_shift_change_requests_employee ON public.employee_shift_change_requests(employee_id, created_at DESC);
CREATE INDEX idx_shift_change_requests_status ON public.employee_shift_change_requests(request_status_id);
CREATE INDEX idx_shift_change_requests_date ON public.employee_shift_change_requests(requested_date);
```

---

### **C. Ajustes a `employee_time_punches` (EXISTENTE)**

```sql
-- Agregar campos para contingencia (nullable, no rompe compatibilidad)
ALTER TABLE public.employee_time_punches 
ADD COLUMN IF NOT EXISTS is_contingency boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS contingency_reason_id uuid NULL REFERENCES public.lookup_values(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contingency_activated_by varchar(50) NULL,
ADD COLUMN IF NOT EXISTS contingency_activated_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_time_punches_contingency ON public.employee_time_punches(is_contingency) WHERE is_contingency = true;
```

---

### **D. Ajustes a `employee_absence_requests` (EXISTENTE)**

```sql
-- Agregar campos para fuente y aprobación (nullable, no rompe compatibilidad)
ALTER TABLE public.employee_absence_requests 
ADD COLUMN IF NOT EXISTS request_source varchar(20) NOT NULL DEFAULT 'ADMIN', -- ADMIN/KIOSK/MOBILE
ADD COLUMN IF NOT EXISTS approved_by varchar(50) NULL,
ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS rejection_reason varchar(500) NULL;

CREATE INDEX IF NOT EXISTS idx_absence_requests_source ON public.employee_absence_requests(request_source);
CREATE INDEX IF NOT EXISTS idx_absence_requests_employee ON public.employee_absence_requests(employee_id, created_at DESC);
```

---

### **E. Nueva tabla `kiosk_configuration` (OPCIONAL - MÍNIMA)**

⚠️ **Alternativa:** Usar `CONF_PARAMS` para configuración global.

```sql
CREATE TABLE public.kiosk_configuration (
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
  contingency_activated_by varchar(50) NULL,
  contingency_reason_id uuid NULL REFERENCES public.lookup_values(id) ON DELETE SET NULL,
  
  -- Auto-reset
  auto_reset_seconds integer NOT NULL DEFAULT 5,
  
  -- Auditoría
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50) NULL,
  updated_at timestamptz NULL,
  
  CONSTRAINT uq_kiosk_config UNIQUE (tenant_id, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(device_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE INDEX idx_kiosk_config_tenant ON public.kiosk_configuration(tenant_id);
CREATE INDEX idx_kiosk_config_company ON public.kiosk_configuration(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_kiosk_config_device ON public.kiosk_configuration(device_id) WHERE device_id IS NOT NULL;
```

---

## 5. **LOOKUP VALUES NUEVOS**

### **A. Agregar a `PUNCH_SOURCE` (lookup group existente)**
```sql
-- Ya existen: BIOMETRIC, KIOSK, MANUAL, MOBILE
-- Agregar:
INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
VALUES (NULL, (SELECT id FROM public.lookup_groups WHERE lookup_group_key='PUNCH_SOURCE'), 'SYSTEM', 'KIOSK_CONTINGENCY', 'KIOSK_CONTINGENCY', 'Kiosk - Contingencia', 60, true, 'SYSTEM')
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;
```

### **B. `REQUEST_STATUS` (verificar si ya existe, sino crear)**
```sql
INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES ('REQUEST_STATUS', 'Estado de Solicitud', 'SYSTEM', 200, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
SELECT NULL, lg.id, 'SYSTEM', t.lookup_key, t.lookup_code, t.lookup_value, t.sort_order, true, 'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (VALUES
  ('PENDING', 'PENDING', 'Pendiente', 10),
  ('APPROVED', 'APPROVED', 'Aprobado', 20),
  ('REJECTED', 'REJECTED', 'Rechazado', 30),
  ('CANCELLED', 'CANCELLED', 'Cancelado', 40)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'REQUEST_STATUS'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;
```

### **C. `REGULARIZATION_REASON` (nuevo lookup group)**
```sql
INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES ('REGULARIZATION_REASON', 'Motivo de Regularización', 'SYSTEM', 210, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
SELECT NULL, lg.id, 'SYSTEM', t.lookup_key, t.lookup_code, t.lookup_value, t.sort_order, true, 'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (VALUES
  ('FORGOT_PUNCH', 'FORGOT', 'Olvidé marcar', 10),
  ('DEVICE_FAILURE', 'DEVICE_FAIL', 'Falla del dispositivo', 20),
  ('NETWORK_ISSUE', 'NETWORK', 'Problema de red', 30),
  ('OTHER', 'OTHER', 'Otro motivo', 99)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'REGULARIZATION_REASON'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;
```

### **D. `SHIFT_CHANGE_REASON` (nuevo lookup group)**
```sql
INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES ('SHIFT_CHANGE_REASON', 'Motivo de Cambio de Turno', 'SYSTEM', 220, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
SELECT NULL, lg.id, 'SYSTEM', t.lookup_key, t.lookup_code, t.lookup_value, t.sort_order, true, 'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (VALUES
  ('PERSONAL_EMERGENCY', 'EMERGENCY', 'Emergencia personal', 10),
  ('MEDICAL_APPOINTMENT', 'MEDICAL', 'Cita médica', 20),
  ('FAMILY_COMMITMENT', 'FAMILY', 'Compromiso familiar', 30),
  ('WORKLOAD', 'WORKLOAD', 'Carga de trabajo', 40),
  ('OTHER', 'OTHER', 'Otro motivo', 99)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'SHIFT_CHANGE_REASON'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;
```

### **E. `CONTINGENCY_REASON` (nuevo lookup group)**
```sql
INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES ('CONTINGENCY_REASON', 'Motivo de Contingencia', 'SYSTEM', 230, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
SELECT NULL, lg.id, 'SYSTEM', t.lookup_key, t.lookup_code, t.lookup_value, t.sort_order, true, 'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (VALUES
  ('BIOMETRIC_FAILURE', 'BIO_FAIL', 'Biométrico dañado', 10),
  ('NETWORK_DOWN', 'NETWORK', 'Sin conexión', 20),
  ('DEVICE_MAINTENANCE', 'MAINTENANCE', 'Mantenimiento del dispositivo', 30),
  ('POWER_OUTAGE', 'POWER', 'Falla eléctrica', 40),
  ('OTHER', 'OTHER', 'Otro motivo', 99)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'CONTINGENCY_REASON'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;
```

---

## 6. **ACTIONS NUEVAS (KIOSK)**

```sql
INSERT INTO public.actions (action_key, action_name, is_active, created_by)
VALUES
  ('MARK_ENTRY', 'Marcar Entrada', true, 'SYSTEM'),
  ('MARK_EXIT', 'Marcar Salida', true, 'SYSTEM'),
  ('MARK_LUNCH_OUT', 'Marcar Salida a Lunch', true, 'SYSTEM'),
  ('MARK_LUNCH_IN', 'Marcar Entrada de Lunch', true, 'SYSTEM'),
  ('REQUEST_REGULARIZATION', 'Solicitar Regularización', true, 'SYSTEM'),
  ('REQUEST_PERMISSION', 'Solicitar Permiso', true, 'SYSTEM'),
  ('REQUEST_JUSTIFICATION', 'Solicitar Justificación', true, 'SYSTEM'),
  ('REQUEST_SHIFT_CHANGE', 'Solicitar Cambio de Turno', true, 'SYSTEM')
ON CONFLICT (action_key) DO NOTHING;
```

---

## 7. **RESUMEN ESTADÍSTICO FINAL**

| Elemento | Cantidad |
|---|---|
| **Roles** | 5 (SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR, EMPLOYEE) |
| **Menu Groups** | 9 (DASHBOARD, SECURITY, MAINT, CONF, ORG, EMPL, ATT, RPT, KIOSK) |
| **Screens Totales** | 48 (51 - 3 eliminados) |
| **Screens Renombrados** | 4 (SEC_TENANT_MEMBERS→SEC_USERS, SEC_LOGIN_SESSIONS→SEC_SESSIONS, MANT_ATT_MOVEMENTS→CONF_ATT_MOVEMENTS, MANT_ATT_EVENTS→CONF_ATT_EVENTS) |
| **Screens Nuevos KIOSK** | 5 |
| **Screens Eliminados** | 3 (SUBSCRIPTION) |
| **Tablas Nuevas** | 2 (employee_regularization_requests, employee_shift_change_requests) |
| **Tablas Ajustadas** | 2 (employee_time_punches, employee_absence_requests) |
| **Lookup Groups Nuevos** | 4 (REQUEST_STATUS, REGULARIZATION_REASON, SHIFT_CHANGE_REASON, CONTINGENCY_REASON) |
| **Actions Nuevas KIOSK** | 8 |
| **Endpoints Backend KIOSK** | 10 |

---

## 8. **PRÓXIMO PASO: IMPLEMENTACIÓN**

Con tu aprobación, procedo a generar:

1. ✅ **Script SQL completo de migración** (tablas, lookup values, screens, actions, screen-actions, roles, permisos)
2. ✅ **Endpoints backend KIOSK** (10 endpoints en `/supabase/functions/server/`)
3. ✅ **Componentes frontend KIOSK** (5 pantallas + layout)
4. ✅ **Actualización de menús dinámicos** (Layout.tsx con mapeo por rol)

---

**FIN DEL DISEÑO FINAL**

**Fecha:** 2026-01-11  
**Estado:** ⏸️ LISTO PARA IMPLEMENTAR - ESPERANDO APROBACIÓN FINAL  
**Elaborado por:** Nyra (AI Assistant)  
**Proyecto:** Turnos Titanium Enterprise On-Premise

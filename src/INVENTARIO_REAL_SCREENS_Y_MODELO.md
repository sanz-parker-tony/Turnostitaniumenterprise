# 📋 INVENTARIO REAL: SCREENS EXISTENTES Y MODELO DE DATOS
## Turnos Titanium Enterprise - Base para Reestructuración

**Fecha:** 2026-01-11  
**Objetivo:** Mapeo desde la realidad existente, sin inventar

---

## 1. **SCREENS EXISTENTES (51 screens reales)**

### **DASHBOARD (3 screens)**
| # | Screen Key Actual | Screen Name | Menu Group | Mantener/Cambiar | Nuevo Screen Key | Roles Sugeridos |
|---|---|---|---|---|---|---|
| 1 | `DASH_MAIN` | Dashboard Principal | DASHBOARD | ✅ Mantener | - | SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR |
| 2 | `DASH_ALERTS` | Alertas | DASHBOARD | ✅ Mantener | - | SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR |
| 3 | `DASH_TRENDS` | Tendencias | DASHBOARD | ✅ Mantener | - | SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR |

---

### **SECURITY (12 screens)**
| # | Screen Key Actual | Screen Name | Menu Group | Mantener/Cambiar | Nuevo Screen Key | Roles Sugeridos |
|---|---|---|---|---|---|---|
| 4 | `SEC_MENU_GROUPS` | Grupos de Menú | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 5 | `SEC_SCREENS` | Pantallas | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 6 | `SEC_ACTIONS` | Acciones | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 7 | `SEC_SCREEN_ACTIONS` | Pantalla-Acciones | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 8 | `SEC_ROLES` | Roles | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 9 | `SEC_ROLE_PERMS` | Permisos por Rol | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 10 | `SEC_USER_ROLES` | Asignación de Roles | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 11 | `SEC_SCOPES` | Scopes | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 12 | `SEC_COPY_PERMS` | Copiar Permisos | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 13 | `SEC_AUDIT` | Auditoría | SECURITY | ✅ Mantener | - | SUPER_ADMIN |
| 14 | `SEC_TENANT_MEMBERS` | Miembros del Tenant | SECURITY | 🔄 Renombrar sugerido | `SEC_USERS` | SUPER_ADMIN |
| 15 | `SEC_LOGIN_SESSIONS` | Sesiones | SECURITY | 🔄 Renombrar sugerido | `SEC_SESSIONS` | SUPER_ADMIN |

---

### **MAINT (6 screens)**
| # | Screen Key Actual | Screen Name | Menu Group | Mantener/Cambiar | Nuevo Screen Key | Roles Sugeridos |
|---|---|---|---|---|---|---|
| 16 | `MANT_CATALOGS` | Catálogos | MAINT | ⚠️ Aclarar | - | SYSTEM_ADMIN (solo catálogos funcionales, no SYSTEM) |
| 17 | `MANT_HOLIDAYS` | Feriados | MAINT | ✅ Mantener | - | SYSTEM_ADMIN |
| 18 | `MANT_ATT_MOVEMENTS` | Movimientos | MAINT | 🔄 Reubicar sugerido | `CONF_ATT_MOVEMENTS` | SYSTEM_ADMIN |
| 19 | `MANT_ATT_EVENTS` | Eventos de Asistencia | MAINT | 🔄 Reubicar sugerido | `CONF_ATT_EVENTS` | SYSTEM_ADMIN |
| 20 | `MANT_JUSTIFICATIONS` | Motivos de Justificación | MANT | ✅ Mantener | - | SYSTEM_ADMIN |
| 21 | `MANT_MESSAGES` | Mensajes del Sistema | MAINT | ✅ Mantener | - | SYSTEM_ADMIN |

---

### **CONFIG (7 screens)**
| # | Screen Key Actual | Screen Name | Menu Group | Mantener/Cambiar | Nuevo Screen Key | Roles Sugeridos |
|---|---|---|---|---|---|---|
| 22 | `CONF_PARAMS` | Parámetros Generales | CONFIG | ✅ Mantener | - | SYSTEM_ADMIN |
| 23 | `CONF_SHIFTS` | Turnos | CONFIG | ✅ Mantener | - | SYSTEM_ADMIN |
| 24 | `CONF_WORK_PATTERNS` | Patrones de Trabajo | CONFIG | ✅ Mantener | - | SYSTEM_ADMIN |
| 25 | `CONF_SURCHARGES` | Reglas de Recargo | CONFIG | ✅ Mantener | - | SYSTEM_ADMIN |
| 26 | `CONF_DEVICES` | Dispositivos | CONFIG | 🔄 Reubicar sugerido | `MANT_DEVICES` | SYSTEM_ADMIN |
| 27 | `CONF_ATT_PROCESS` | Procesos de Asistencia | CONFIG | ✅ Mantener | - | SYSTEM_ADMIN |
| 28 | `CONF_TENANT_SETTINGS` | Ajustes del Tenant | CONFIG | ⚠️ Aclarar | - | SUPER_ADMIN o SYSTEM_ADMIN según contenido |

---

### **ORG (8 screens)**
| # | Screen Key Actual | Screen Name | Menu Group | Mantener/Cambiar | Nuevo Screen Key | Roles Sugeridos |
|---|---|---|---|---|---|---|
| 29 | `ORG_COMPANIES` | Empresas | ORG | ✅ Mantener | - | SYSTEM_ADMIN |
| 30 | `ORG_WORK_LOCATIONS` | Localidades | ORG | ✅ Mantener | - | SYSTEM_ADMIN |
| 31 | `ORG_DEPARTMENTS` | Departamentos | ORG | ✅ Mantener | - | SYSTEM_ADMIN |
| 32 | `ORG_AREAS` | Áreas | ORG | ✅ Mantener | - | SYSTEM_ADMIN |
| 33 | `ORG_WORK_GROUPS` | Grupos de Trabajo | ORG | ✅ Mantener | - | SYSTEM_ADMIN |
| 34 | `ORG_PAYROLL_GROUPS` | Grupos de Rol de Pago | ORG | ✅ Mantener | - | SYSTEM_ADMIN |
| 35 | `ORG_JOB_TITLES` | Cargos | ORG | ✅ Mantener | - | SYSTEM_ADMIN |
| 36 | `ORG_COST_CENTERS` | Centros de Costo | ORG | ✅ Mantener | - | SYSTEM_ADMIN |

---

### **EMPLOYEE (6 screens)**
| # | Screen Key Actual | Screen Name | Menu Group | Mantener/Cambiar | Nuevo Screen Key | Roles Sugeridos |
|---|---|---|---|---|---|---|
| 37 | `EMPL_LIST` | Empleados | EMPLOYEE | ✅ Mantener | - | SYSTEM_ADMIN |
| 38 | `EMPL_ASSIGN_COMPANY` | Asignación a Empresa | EMPLOYEE | ✅ Mantener | - | SYSTEM_ADMIN |
| 39 | `EMPL_PROFILES` | Perfiles de Empleado | EMPLOYEE | ✅ Mantener | - | SYSTEM_ADMIN |
| 40 | `EMPL_PROFILE_SETTINGS` | Ajustes por Perfil | EMPLOYEE | ✅ Mantener | - | SYSTEM_ADMIN |
| 41 | `EMPL_ABSENCE_REQUESTS` | Solicitudes de Ausencia | EMPLOYEE | ⚠️ Aclarar | - | ¿SYSTEM_ADMIN o RRHH_ADMIN/SUPERVISOR? |
| 42 | `EMPL_DOCUMENTS` | Documentos | EMPLOYEE | ✅ Mantener | - | SYSTEM_ADMIN |

---

### **ATTENDANCE (6 screens)**
| # | Screen Key Actual | Screen Name | Menu Group | Mantener/Cambiar | Nuevo Screen Key | Roles Sugeridos |
|---|---|---|---|---|---|---|
| 43 | `ATT_TIME_PUNCHES` | Marcaciones | ATTENDANCE | ✅ Mantener | - | RRHH_ADMIN, SUPERVISOR (con scope) |
| 44 | `ATT_SHIFT_PLANS` | Planificación de Turnos | ATTENDANCE | ✅ Mantener | - | RRHH_ADMIN, SUPERVISOR (con scope) |
| 45 | `ATT_PROCESS_RUNS` | Ejecuciones de Proceso | ATTENDANCE | ✅ Mantener | - | RRHH_ADMIN, SUPERVISOR (con scope) |
| 46 | `ATT_CALC_RESULTS` | Resultados de Cálculo | ATTENDANCE | ✅ Mantener | - | RRHH_ADMIN, SUPERVISOR (con scope) |
| 47 | `ATT_APPROVALS` | Aprobaciones | ATTENDANCE | ✅ Mantener | - | RRHH_ADMIN, SUPERVISOR (con scope) |
| 48 | `ATT_ANOMALIES` | Anomalías | ATTENDANCE | ✅ Mantener | - | RRHH_ADMIN, SUPERVISOR (con scope) |

---

### **REPORTS (4 screens)**
| # | Screen Key Actual | Screen Name | Menu Group | Mantener/Cambiar | Nuevo Screen Key | Roles Sugeridos |
|---|---|---|---|---|---|---|
| 49 | `RPT_CATALOG` | Catálogo de Reportes | REPORTS | ✅ Mantener | - | RRHH_ADMIN, SUPERVISOR (con scope) |
| 50 | `RPT_PARAMETERS` | Parámetros de Reportes | REPORTS | ✅ Mantener | - | SYSTEM_ADMIN |
| 51 | `RPT_PERMISSIONS` | Permisos de Reportes | REPORTS | ✅ Mantener | - | SUPER_ADMIN |
| 52 | `RPT_EXECUTIONS` | Ejecuciones | REPORTS | ✅ Mantener | - | RRHH_ADMIN, SUPERVISOR (con scope) |

---

### **SUBSCRIPTION (3 screens)**
| # | Screen Key Actual | Screen Name | Menu Group | Mantener/Cambiar | Nuevo Screen Key | Roles Sugeridos |
|---|---|---|---|---|---|---|
| 53 | `SUB_PLANS` | Planes | SUBSCRIPTION | ❌ ELIMINAR | - | No aplica en Enterprise On-Premise |
| 54 | `SUB_TENANT_SUBS` | Suscripción del Tenant | SUBSCRIPTION | ❌ ELIMINAR | - | No aplica en Enterprise On-Premise |
| 55 | `SUB_TRANSACTIONS` | Transacciones | SUBSCRIPTION | ❌ ELIMINAR | - | No aplica en Enterprise On-Premise |

---

## 2. **MODELO DE DATOS EXISTENTE (REQUESTS/SOLICITUDES)**

### **Tabla: `employee_absence_requests`**
Ya existe en el sistema. Campos:

```sql
- id (uuid)
- tenant_id (uuid)
- company_id (uuid)
- employee_id (uuid)
- justification_type_id (uuid) → FK a justification_types
- attendance_event_id (uuid) → FK a attendance_events
- start_datetime (timestamptz)
- end_datetime (timestamptz)
- start_time (time)
- end_time (time)
- notes (varchar 500)
- request_status_id (uuid) → FK a lookup_values (PENDING/APPROVED/REJECTED)
- is_active (boolean)
- created_by, created_at, updated_by, updated_at
```

**✅ Esta tabla ya maneja solicitudes de ausencia/permisos.**

---

### **Tabla: `employee_time_punches`**
Ya existe en el sistema. Campos:

```sql
- id (uuid)
- tenant_id (uuid)
- company_id (uuid)
- employee_id (uuid)
- time_clock_device_id (uuid) → FK a time_clock_devices
- punch_datetime (timestamptz)
- punch_key (integer) → tipo de marcación (IN/OUT/LUNCH_OUT/LUNCH_IN)
- punch_source_id (uuid) → FK a lookup_values (BIOMETRIC/KIOSK/MANUAL/MOBILE)
- time_punch_status_id (uuid) → FK a lookup_values (NORMAL/ANOMALY/PENDING)
- service_ticket_number (integer)
- notes (varchar 300)
- process_run_id (uuid) → FK a attendance_processing_runs
- is_active (boolean)
- created_by, created_at, updated_by, updated_at
```

**✅ Esta tabla ya maneja marcaciones con origen (`punch_source_id`) y estado.**

---

### **Tabla: `justification_types`**
Ya existe en el sistema. Campos:

```sql
- id (uuid)
- tenant_id (uuid)
- justification_name (varchar 80)
- justification_short_name (varchar 20)
- attendance_event_id (uuid) → FK a attendance_events
- is_active (boolean)
- created_by, created_at, updated_by, updated_at
```

**✅ Esta tabla ya define tipos de justificación (permisos médicos, personales, etc.).**

---

### **Tabla: `time_clock_devices`**
Ya existe en el sistema. Campos (inferidos del FK):

```sql
- id (uuid)
- tenant_id (uuid)
- device_name (varchar)
- device_code (varchar)
- device_type_id (uuid) → FK a lookup_values (BIOMETRIC/KIOSK/MOBILE)
- location (varchar)
- is_active (boolean)
- created_by, created_at, updated_by, updated_at
```

**✅ Esta tabla ya maneja dispositivos de marcación.**

---

## 3. **AJUSTES MÍNIMOS NECESARIOS PARA KIOSK**

### **A. Tabla `employee_time_punches` (YA EXISTE)**

✅ **NO crear tabla nueva.**  
✅ **Ajustar campos mínimos:**

| Campo | Estado | Acción |
|---|---|---|
| `punch_source_id` | ✅ Ya existe | Agregar lookup value: `KIOSK_CONTINGENCY` |
| `time_clock_device_id` | ✅ Ya existe | Usar para identificar dispositivo kiosk |
| `punch_key` | ✅ Ya existe | Validar valores: 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN, 5=PERMISSION_OUT, 6=PERMISSION_IN |
| `notes` | ✅ Ya existe | Usar para motivo de contingencia si aplica |
| `created_by` | ✅ Ya existe | Identificar usuario que marcó (EMPLOYEE) |

**Campos nuevos sugeridos (mínimos):**

```sql
ALTER TABLE employee_time_punches 
ADD COLUMN kiosk_contingency_reason_id uuid NULL REFERENCES lookup_values(id),
ADD COLUMN is_contingency boolean NOT NULL DEFAULT false,
ADD COLUMN contingency_activated_by varchar(50) NULL,
ADD COLUMN contingency_activated_at timestamptz NULL;
```

---

### **B. Tabla `employee_absence_requests` (YA EXISTE)**

✅ **NO crear tabla nueva.**  
✅ **Ajustar campos mínimos:**

| Campo | Estado | Acción |
|---|---|---|
| `request_status_id` | ✅ Ya existe | Usar lookup values: PENDING/APPROVED/REJECTED |
| `notes` | ✅ Ya existe | Comentarios del empleado |
| `created_by` | ✅ Ya existe | Identificar empleado que solicitó |

**Campos nuevos sugeridos (mínimos):**

```sql
ALTER TABLE employee_absence_requests 
ADD COLUMN request_source varchar(20) NOT NULL DEFAULT 'ADMIN', -- ADMIN/KIOSK/MOBILE
ADD COLUMN approved_by varchar(50) NULL,
ADD COLUMN approved_at timestamptz NULL,
ADD COLUMN rejection_reason varchar(500) NULL;
```

---

### **C. Nueva tabla: `employee_regularization_requests` (SI NO EXISTE)**

⚠️ **Verificar si existe tabla para regularizaciones.**

Si NO existe, crear:

```sql
CREATE TABLE employee_regularization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  
  -- Marcación original (si existe)
  original_punch_id uuid NULL REFERENCES employee_time_punches(id),
  
  -- Datos de la regularización solicitada
  requested_date date NOT NULL,
  requested_time time NOT NULL,
  requested_punch_key integer NOT NULL, -- 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN
  
  -- Motivo
  regularization_reason_id uuid NOT NULL REFERENCES lookup_values(id), -- Catálogo de motivos
  notes varchar(500) NULL,
  
  -- Estado
  request_status_id uuid NOT NULL REFERENCES lookup_values(id), -- PENDING/APPROVED/REJECTED
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
```

---

### **D. Nueva tabla: `employee_shift_change_requests` (SI NO EXISTE)**

⚠️ **Verificar si existe tabla para cambios de turno.**

Si NO existe, crear:

```sql
CREATE TABLE employee_shift_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  
  -- Cambio solicitado
  requested_date date NOT NULL,
  current_shift_id uuid NOT NULL REFERENCES shifts(id),
  requested_shift_id uuid NOT NULL REFERENCES shifts(id),
  
  -- Motivo
  change_reason_id uuid NOT NULL REFERENCES lookup_values(id), -- Catálogo de motivos
  notes varchar(500) NULL,
  
  -- Estado
  request_status_id uuid NOT NULL REFERENCES lookup_values(id), -- PENDING/APPROVED/REJECTED
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
```

---

### **E. Nueva tabla: `kiosk_configuration` (MÍNIMA)**

Solo para configuración del kiosk por tenant/empresa/dispositivo:

```sql
CREATE TABLE kiosk_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id uuid NULL REFERENCES companies(id) ON DELETE CASCADE, -- NULL = aplica a todo el tenant
  device_id uuid NULL REFERENCES time_clock_devices(id) ON DELETE CASCADE, -- NULL = aplica a toda la empresa
  
  -- Configuración de botones
  allow_lunch_buttons boolean NOT NULL DEFAULT false,
  allow_permission_buttons boolean NOT NULL DEFAULT false,
  
  -- Contingencia
  contingency_enabled boolean NOT NULL DEFAULT false,
  contingency_expires_at timestamptz NULL,
  contingency_activated_by varchar(50) NULL,
  contingency_reason_id uuid NULL REFERENCES lookup_values(id),
  
  -- Auto-reset
  auto_reset_seconds integer NOT NULL DEFAULT 5,
  
  -- Auditoría
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(50) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50) NULL,
  updated_at timestamptz NULL,
  
  CONSTRAINT uq_kiosk_config UNIQUE (tenant_id, company_id, device_id)
);
```

---

## 4. **LOOKUP VALUES NUEVOS NECESARIOS**

### **A. `PUNCH_SOURCE` (agregar valores nuevos)**
Ya existe lookup group. Agregar:
- `KIOSK_CONTINGENCY` (además de BIOMETRIC, KIOSK, MANUAL, MOBILE)

### **B. `REQUEST_STATUS` (verificar existencia)**
- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

### **C. `REGULARIZATION_REASON` (nuevo lookup group)**
- `FORGOT_PUNCH` (Olvidé marcar)
- `DEVICE_FAILURE` (Falla del dispositivo)
- `NETWORK_ISSUE` (Problema de red)
- `OTHER` (Otro motivo)

### **D. `SHIFT_CHANGE_REASON` (nuevo lookup group)**
- `PERSONAL_EMERGENCY` (Emergencia personal)
- `MEDICAL_APPOINTMENT` (Cita médica)
- `FAMILY_COMMITMENT` (Compromiso familiar)
- `WORKLOAD` (Carga de trabajo)
- `OTHER` (Otro motivo)

### **E. `CONTINGENCY_REASON` (nuevo lookup group)**
- `BIOMETRIC_FAILURE` (Biométrico dañado)
- `NETWORK_DOWN` (Sin conexión)
- `DEVICE_MAINTENANCE` (Mantenimiento del dispositivo)
- `POWER_OUTAGE` (Falla eléctrica)
- `OTHER` (Otro motivo)

---

## 5. **SCREENS NUEVOS MÍNIMOS NECESARIOS (KIOSK)**

| # | Screen Key | Screen Name | Menu Group | Rol | Descripción |
|---|---|---|---|---|---|
| 1 | `KIOSK_PUNCH` | Marcación | KIOSK | EMPLOYEE | Marcación de Entrada/Salida/Lunch/Permisos |
| 2 | `KIOSK_REGULARIZATION` | Regularizar Marcaciones | KIOSK | EMPLOYEE | Solicitar corrección de marcaciones |
| 3 | `KIOSK_PERMISSION` | Solicitar Permisos | KIOSK | EMPLOYEE | Solicitar permisos/ausencias |
| 4 | `KIOSK_JUSTIFICATION` | Justificar Inasistencias | KIOSK | EMPLOYEE | Justificar faltas detectadas |
| 5 | `KIOSK_SHIFT_CHANGE` | Solicitar Cambio de Turno | KIOSK | EMPLOYEE | Solicitar cambio de turno |
| 6 | `CONF_KIOSK` | Configuración KIOSK | CONFIG | SYSTEM_ADMIN | Configurar kiosk + contingencia |

**Total screens nuevos KIOSK:** 6

---

## 6. **ENDPOINTS BACKEND MÍNIMOS NECESARIOS**

### **A. Identificación y Configuración**
| # | Endpoint | Método | Descripción |
|---|---|---|---|
| 1 | `/make-server-e19f2094/kiosk/config` | GET | Obtener configuración del kiosk |
| 2 | `/make-server-e19f2094/kiosk/identify` | POST | Validar PIN + retornar foto empleado |

### **B. Marcaciones**
| # | Endpoint | Método | Descripción |
|---|---|---|---|
| 3 | `/make-server-e19f2094/kiosk/punch` | POST | Registrar marcación |

### **C. Solicitudes**
| # | Endpoint | Método | Descripción |
|---|---|---|---|
| 4 | `/make-server-e19f2094/kiosk/request-regularization` | POST | Solicitar regularización |
| 5 | `/make-server-e19f2094/kiosk/request-permission` | POST | Solicitar permiso |
| 6 | `/make-server-e19f2094/kiosk/request-shift-change` | POST | Solicitar cambio de turno |
| 7 | `/make-server-e19f2094/kiosk/my-punches` | GET | Ver marcaciones (últimos 7 días) |
| 8 | `/make-server-e19f2094/kiosk/my-anomalies` | GET | Ver anomalías (últimos 7 días) |

### **D. Contingencia (SYSTEM_ADMIN)**
| # | Endpoint | Método | Descripción |
|---|---|---|---|
| 9 | `/make-server-e19f2094/kiosk/contingency/activate` | POST | Activar contingencia (SYSTEM_ADMIN) |
| 10 | `/make-server-e19f2094/kiosk/contingency/deactivate` | POST | Desactivar contingencia (SYSTEM_ADMIN) |

**Total endpoints KIOSK:** 10

---

## 7. **RESUMEN DE AJUSTES MÍNIMOS**

### ✅ **Tablas EXISTENTES a AJUSTAR (no crear nuevas):**
1. `employee_time_punches` → agregar 4 campos de contingencia
2. `employee_absence_requests` → agregar 4 campos de aprobación/fuente
3. `time_clock_devices` → ✅ usar tal cual

### ➕ **Tablas NUEVAS mínimas:**
1. `employee_regularization_requests` (verificar si ya existe)
2. `employee_shift_change_requests` (verificar si ya existe)
3. `kiosk_configuration` (nueva)

### 🔑 **Lookup Groups NUEVOS:**
1. `REGULARIZATION_REASON`
2. `SHIFT_CHANGE_REASON`
3. `CONTINGENCY_REASON`
4. Agregar valor `KIOSK_CONTINGENCY` a `PUNCH_SOURCE`

### 📺 **Screens NUEVOS:**
- 6 screens KIOSK

### 🔌 **Endpoints NUEVOS:**
- 10 endpoints backend

---

## 8. **PRÓXIMOS PASOS (PENDIENTE TU APROBACIÓN)**

1. ✅ Verificar si ya existen tablas de regularización y cambio de turno
2. ✅ Confirmar ajustes a tablas existentes
3. ✅ Confirmar creación de tablas nuevas mínimas
4. ✅ Confirmar screens KIOSK (¿incluir "Mis Solicitudes" o integrar por módulo?)
5. ✅ Confirmar prefijos (mantener SEC_, CONF_, MANT_, ORG_, EMPL_, ATT_, RPT_, KIOSK_)
6. ✅ Confirmar redistribución de screens entre roles

---

**FIN DEL INVENTARIO REAL**

**Fecha:** 2026-01-11  
**Estado:** ⏸️ PENDIENTE REVISIÓN Y APROBACIÓN  
**Elaborado por:** Nyra (AI Assistant)  
**Proyecto:** Turnos Titanium Enterprise On-Premise

# ✅ FASE 1 COMPLETA: DDL + SEEDS + CONTRATOS
## Turnos Titanium Enterprise - KIOSK Implementation

**Fecha:** 2026-01-11  
**Estado:** ✅ LISTO PARA EJECUTAR

---

## 📦 **ENTREGABLES DE FASE 1**

### **1. Scripts SQL (4 archivos)**

| # | Archivo | Descripción | Orden de Ejecución |
|---|---|---|---|
| 1 | `KIOSK_01_DDL_tablas_nuevas_y_ajustes.sql` | Crear tablas nuevas + ajustes a tablas existentes | ① PRIMERO |
| 2 | `KIOSK_02_lookup_values.sql` | Lookup groups y values para KIOSK | ② SEGUNDO |
| 3 | `KIOSK_03_screens_actions_menu_groups.sql` | Screens + Actions + Menu Groups | ③ TERCERO |
| 4 | `KIOSK_04_roles_y_permisos.sql` | Roles + Asignación de permisos | ④ CUARTO |

### **2. Documentación**

| # | Archivo | Descripción |
|---|---|---|
| 1 | `CONTRATOS_ENDPOINTS_KIOSK.md` | Contratos completos de los 10 endpoints KIOSK |
| 2 | `FASE_1_RESUMEN_EJECUTIVO.md` | Este documento (resumen ejecutivo) |

---

## 🎯 **AJUSTES FINOS APLICADOS**

### ✅ **1. UUID FK a public.users.id**
- ❌ `approved_by` (varchar)
- ✅ `approved_by_user_id` (uuid FK)
- ❌ `contingency_activated_by` (varchar)
- ✅ `contingency_activated_by_user_id` (uuid FK)

### ✅ **2. request_source como lookup_value_id**
- ❌ `request_source` (varchar libre)
- ✅ `request_source_id` (uuid FK a lookup_values)
- Lookup group: `REQUEST_SOURCE` (ADMIN/KIOSK/MOBILE/PORTAL)

### ✅ **3. KIOSK_PUNCH con historial**
- Muestra últimas 5 marcaciones
- Incluye: fecha, hora, tipo, origen, dispositivo
- No tiene "solicitudes" pero sí historial

### ✅ **4. Tablas nuevas con requested_by_user_id**
- `employee_regularization_requests`: incluye `requested_by_user_id`
- `employee_shift_change_requests`: incluye `requested_by_user_id`
- Ambas incluyen: `tenant_id`, `employee_id`, `status_id`, `approved_by_user_id`, `approved_at`, `rejection_reason`, timestamps

### ✅ **5. Scope PAYROLL_GROUP confirmado**
- Aplicable en filtros de procesos/ejecuciones
- SUPERVISOR tiene scope obligatorio por rol de pago

### ✅ **6. KIOSK integrado en Turnos Titanium**
- Ruta: `/kiosk`
- Layout propio (sin menú admin)
- EMPLOYEE → redirección automática a `/kiosk`

---

## 📊 **ESTADÍSTICAS FINALES**

| Elemento | Cantidad |
|---|---|
| **Tablas Nuevas** | employee_regularization_requests, employee_shift_change_requests, kiosk_configuration |
| **Tablas Ajustadas** | employee_time_punches, employee_absence_requests |
| **Campos Nuevos (nullable)** | 9 |
| **Lookup Groups Nuevos** | 5 |
| **Lookup Values Nuevos** | 23 |
| **Screens Eliminados** | 3 (SUBSCRIPTION) |
| **Screens Renombrados** | 5 |
| **Screens Nuevos** | 5 (KIOSK) |
| **Screens Totales** | 48 |
| **Actions Nuevas** | 12 |
| **Roles Nuevos** | 4 |
| **Endpoints Backend** | 16 (con 4 endpoints separados para "Mis Solicitudes") |

---

## 🗂️ **ESTRUCTURA DE TABLAS NUEVAS**

### **A. employee_regularization_requests**
```sql
- id, tenant_id, company_id, employee_id
- requested_by_user_id (FK a users)
- original_punch_id (FK a employee_time_punches)
- requested_date, requested_time, requested_punch_key
- regularization_reason_id (FK a lookup_values)
- request_source_id (FK a lookup_values)
- request_status_id (FK a lookup_values)
- approved_by_user_id (FK a users)
- approved_at, rejection_reason
- is_active, created_by, created_at, updated_by, updated_at
```

### **B. employee_shift_change_requests**
```sql
- id, tenant_id, company_id, employee_id
- requested_by_user_id (FK a users)
- requested_date
- current_shift_id, requested_shift_id (FK a shifts)
- change_reason_id (FK a lookup_values)
- request_source_id (FK a lookup_values)
- request_status_id (FK a lookup_values)
- approved_by_user_id (FK a users)
- approved_at, rejection_reason
- is_active, created_by, created_at, updated_by, updated_at
- CONSTRAINT: current_shift_id != requested_shift_id
```

### **C. kiosk_configuration**
```sql
- id, tenant_id, company_id (NULL = todo tenant), device_id (NULL = toda empresa)
- allow_lunch_buttons, allow_permission_buttons
- contingency_enabled, contingency_expires_at
- contingency_activated_by_user_id (FK a users)
- contingency_reason_id (FK a lookup_values)
- auto_reset_seconds, throttle_seconds
- is_active, created_by, created_at, updated_by, updated_at
- UNIQUE CONSTRAINT: (tenant_id, company_id, device_id) NULLS NOT DISTINCT
```

---

## 🔧 **AJUSTES A TABLAS EXISTENTES**

### **A. employee_time_punches (4 campos nuevos)**
```sql
ALTER TABLE employee_time_punches ADD:
- is_contingency (boolean NOT NULL DEFAULT false)
- contingency_reason_id (uuid NULL FK a lookup_values)
- contingency_activated_by_user_id (uuid NULL FK a users)
- contingency_activated_at (timestamptz NULL)
```

### **B. employee_absence_requests (5 campos nuevos)**
```sql
ALTER TABLE employee_absence_requests ADD:
- request_source_id (uuid NULL FK a lookup_values)
- requested_by_user_id (uuid NULL FK a users)
- approved_by_user_id (uuid NULL FK a users)
- approved_at (timestamptz NULL)
- rejection_reason (varchar 500 NULL)
```

---

## 📋 **SCREENS FINALES**

### **Total: 48 screens**

| Menu Group | Screens | Roles |
|---|---|---|
| DASHBOARD | 3 | SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR |
| SECURITY | 12 | SUPER_ADMIN |
| MAINT | 5 | SYSTEM_ADMIN |
| CONF | 7 | SYSTEM_ADMIN |
| ORG | 8 | SYSTEM_ADMIN |
| EMPL | 6 | SYSTEM_ADMIN |
| ATT | 6 | RRHH_ADMIN, SUPERVISOR (con scope) |
| RPT | 4 | SUPER_ADMIN, SYSTEM_ADMIN, RRHH_ADMIN, SUPERVISOR |
| KIOSK | 5 | EMPLOYEE |

---

## 🎯 **MAPEO DE ROLES**

### **SUPER_ADMIN**
- ✅ Acceso TOTAL
- ✅ Todos los screens (48)
- ✅ Todas las acciones
- ✅ Sin scopes (acceso completo)

### **SYSTEM_ADMIN**
- ✅ 34 screens (DASHBOARD + MAINT + CONF + ORG + EMPL + ATT + RPT parámetros)
- ✅ Configuración funcional
- ✅ Sin scopes (acceso completo funcional)

### **RRHH_ADMIN**
- ✅ 16 screens (DASHBOARD + EMPL solicitudes + ATT + RPT)
- ✅ Scope TOTAL (todos los empleados)
- ✅ **MISMAS pantallas que SUPERVISOR**

### **SUPERVISOR**
- ✅ 16 screens (DASHBOARD + EMPL solicitudes + ATT + RPT)
- ✅ **Scope LIMITADO** por:
  - Empresa
  - Localidad
  - Departamento
  - Área
  - Empleado
  - **Rol de Pago (OBLIGATORIO)**
- ✅ **MISMAS pantallas que RRHH_ADMIN**
- ⚠️ **Diferencia EXCLUSIVA: SCOPE**

### **EMPLOYEE**
- ✅ 5 screens (SOLO KIOSK)
- ✅ Redirección automática a `/kiosk` al login
- ✅ Layout propio (sin menú admin)

---

## 📡 **ENDPOINTS BACKEND (16 - FINAL)**

### **Identificación y Configuración (2)**
1. `GET /make-server-e19f2094/kiosk/config` - Configuración del kiosk
2. `POST /make-server-e19f2094/kiosk/identify` - Validar PIN + foto

### **Marcaciones (1)**
3. `POST /make-server-e19f2094/kiosk/punch` - Registrar marcación

### **Consultas (6)**
4. `GET /make-server-e19f2094/kiosk/my-punches` - Últimas marcaciones (7 días)
5. `GET /make-server-e19f2094/kiosk/my-shifts` - ⭐ Turnos asignados (lectura)
6. `GET /make-server-e19f2094/kiosk/my-anomalies` - Anomalías (7 días)
7. `GET /make-server-e19f2094/kiosk/my-permissions` - ⭐ Solicitudes de permisos (paginado)
8. `GET /make-server-e19f2094/kiosk/my-regularizations` - ⭐ Solicitudes de regularización (paginado)
9. `GET /make-server-e19f2094/kiosk/my-justifications` - ⭐ Solicitudes de justificación (paginado)
10. `GET /make-server-e19f2094/kiosk/my-shift-changes` - ⭐ Solicitudes de cambio de turno (paginado)

### **Solicitudes (4)**
11. `POST /make-server-e19f2094/kiosk/request-regularization` - Solicitar regularización
12. `POST /make-server-e19f2094/kiosk/request-permission` - Solicitar permiso
13. `POST /make-server-e19f2094/kiosk/request-justification` - Justificar inasistencia
14. `POST /make-server-e19f2094/kiosk/request-shift-change` - Solicitar cambio de turno

### **Contingencia - SYSTEM_ADMIN (2)**
15. `POST /make-server-e19f2094/kiosk/contingency/activate` - Activar contingencia
16. `POST /make-server-e19f2094/kiosk/contingency/deactivate` - Desactivar contingencia

---

## ✅ **VALIDACIONES OBLIGATORIAS**

### **Throttling:**
- ✅ Marcaciones: 30 segundos entre clicks (configurable en `kiosk_configuration.throttle_seconds`)
- ✅ PIN: 5 intentos fallidos → bloqueo 5 minutos

### **Secuencias de marcación:**
- ✅ No permitir OUT sin IN previo
- ✅ No permitir doble IN consecutivo
- ✅ Marcar automáticamente como anomalía si la secuencia es inconsistente

### **Contingencia:**
- ✅ Siempre expira (máximo 24 horas configurables)
- ✅ Solo SYSTEM_ADMIN puede activar/desactivar
- ✅ Requiere motivo obligatorio (`contingency_reason_id`)
- ✅ Auditoría completa: `contingency_activated_by_user_id`, `contingency_activated_at`

### **Hora del servidor:**
- ✅ **NUNCA usar hora del cliente**
- ✅ Todas las marcaciones usan `now()` del servidor
- ✅ Timezone: UTC (configurar a nivel tenant si es necesario)

---

## 🚀 **PRÓXIMOS PASOS**

### **FASE 2: BACKEND (10 endpoints)**
1. Implementar endpoints en `/supabase/functions/server/kiosk.tsx`
2. Validaciones de negocio (throttling, secuencias, contingencia)
3. Job automático: auto-expirar contingencias (cron cada 5 minutos)

### **FASE 3: FRONTEND (5 pantallas + layout)**
1. `KioskLayout.tsx` - Layout sin menú admin
2. `KioskIdentification.tsx` - PIN + foto
3. `KioskPunch.tsx` - Marcación + historial últimas 5
4. `KioskRegularization.tsx` - Regularización + estado de solicitudes
5. `KioskPermission.tsx` - Permisos + estado de solicitudes
6. `KioskJustification.tsx` - Justificación + estado de solicitudes
7. `KioskShiftChange.tsx` - Cambio de turno + estado de solicitudes
8. `KioskFeedback.tsx` - Feedback visual/sonoro (check verde/rojo + beep)

### **FASE 4: MENÚS DINÁMICOS**
1. Actualizar `Layout.tsx` para mapear menús por rol
2. Implementar redirección automática: EMPLOYEE → `/kiosk`
3. Verificar que RRHH_ADMIN y SUPERVISOR ven mismas pantallas

### **FASE 5: TESTING**
1. Testing de permisos por rol
2. Testing de scopes (RRHH_ADMIN vs SUPERVISOR)
3. Testing de KIOSK completo (marcaciones, solicitudes, contingencia)
4. Testing de throttling y validaciones

---

## 📝 **NOTAS IMPORTANTES**

1. ✅ **No rompe compatibilidad:** Todos los campos nuevos son **nullable** o tienen **DEFAULT**
2. ✅ **Contratos REST completos:** Request/Response de los 10 endpoints documentados
3. ✅ **KIOSK_PUNCH muestra historial:** Últimas 5 marcaciones + origen + dispositivo (aunque no solicite regularizaciones)
4. ✅ **Estado de solicitudes integrado:** Cada pantalla KIOSK muestra PENDING/APPROVED/REJECTED (no hay screen separado "Mis Solicitudes")
5. ✅ **Scope PAYROLL_GROUP:** Aplicable en filtros de procesos/reportes para SUPERVISOR
6. ✅ **RRHH_ADMIN = SUPERVISOR (screens):** La ÚNICA diferencia es el SCOPE

---

## 🎯 **EJECUCIÓN DE SCRIPTS SQL**

### **Orden correcto:**

```bash
# 1. Crear tablas nuevas y ajustar existentes
psql -f database/KIOSK_01_DDL_tablas_nuevas_y_ajustes.sql

# 2. Crear lookup values
psql -f database/KIOSK_02_lookup_values.sql

# 3. Crear screens, actions, menu groups
psql -f database/KIOSK_03_screens_actions_menu_groups.sql

# 4. Crear roles y asignar permisos
psql -f database/KIOSK_04_roles_y_permisos.sql
```

### **Verificación:**
Cada script incluye sección de verificación al final que muestra:
- ✅ Tablas creadas/ajustadas
- ✅ Lookup values insertados
- ✅ Screens creados/renombrados/eliminados
- ✅ Roles creados y permisos asignados

---

## ✅ **CONFIRMACIÓN FINAL**

- ✅ Scripts SQL listos para ejecutar
- ✅ Contratos de endpoints documentados
- ✅ Ajustes finos aplicados (UUID FK, lookup_value_id, requested_by_user_id)
- ✅ Validaciones definidas (throttling, secuencias, contingencia)
- ✅ Scopes confirmados (PAYROLL_GROUP obligatorio)
- ✅ KIOSK integrado en Turnos Titanium (no app separada)

---

**FIN DE FASE 1**

**Fecha:** 2026-01-11  
**Estado:** ✅ LISTO PARA IMPLEMENTAR FASE 2 (BACKEND)  
**Elaborado por:** Nyra (AI Assistant)  
**Proyecto:** Turnos Titanium Enterprise On-Premise
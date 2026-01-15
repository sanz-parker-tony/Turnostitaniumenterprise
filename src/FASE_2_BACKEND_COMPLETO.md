# ✅ FASE 2 COMPLETA: BACKEND KIOSK v1.0
## Turnos Titanium Enterprise - KIOSK Backend Implementation

**Fecha:** 2026-01-11  
**Estado:** ✅ IMPLEMENTADO COMPLETO (16 endpoints)  
**Archivo:** `/supabase/functions/server/kiosk.tsx`

---

## 📦 **ENTREGABLES**

### **1. Módulo Backend KIOSK**
- ✅ Archivo: `/supabase/functions/server/kiosk.tsx` (1,800 líneas)
- ✅ Registrado en: `/supabase/functions/server/index.tsx`
- ✅ Estructura: `.tsx` (siguiendo patrón del repo)

### **2. Endpoints Implementados: 16 TOTAL**

| Fase | Cantidad | Descripción |
|---|---|---|
| FASE 2A: CORE | 4 | Configuración, identificación, marcación, consulta de marcaciones |
| FASE 2B: CONSULTAS | 6 | Turnos, anomalías, permisos, regularizaciones, justificaciones, cambios de turno |
| FASE 2C: SOLICITUDES | 4 | Crear solicitudes (regularización, permiso, justificación, cambio de turno) |
| FASE 2D: CONTINGENCIA | 2 | Activar/desactivar modo contingencia (SOLO SYSTEM_ADMIN) |

---

## 📋 **CONTRATO ESTÁNDAR IMPLEMENTADO**

### ✅ **Respuesta OK (200):**
```typescript
{
  "ok": true,
  "data": {
    // ... datos específicos del endpoint
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",  // UUID v4
    "server_time": "2026-01-11T07:12:34Z"                   // ISO 8601 del servidor
  }
}
```

### ❌ **Respuesta ERROR (4xx/5xx):**
```typescript
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",              // Solo 8 códigos aprobados
    "message": "PIN incorrecto",             // Mensaje para UI
    "details": {                             // Opcional
      "reason": "INVALID_PIN",               // String libre
      "field": "pin",
      "hint": "Verifique su PIN de 4 dígitos"
    }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

## 🎯 **CÓDIGOS DE ERROR (SOLO 8 APROBADOS)**

```typescript
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',           // 401
  FORBIDDEN: 'FORBIDDEN',                 // 403
  TENANT_NOT_READY: 'TENANT_NOT_READY',   // 409
  KIOSK_DISABLED: 'KIOSK_DISABLED',       // 409
  VALIDATION_ERROR: 'VALIDATION_ERROR',   // 422
  DATE_RANGE_TOO_LARGE: 'DATE_RANGE_TOO_LARGE', // 422
  RATE_LIMITED: 'RATE_LIMITED',           // 429
  INTERNAL_ERROR: 'INTERNAL_ERROR',       // 500
} as const;
```

**Todo lo demás va en `details.reason`** (strings libres):
- `INVALID_PIN`, `INVALID_SEQUENCE`, `FUTURE_DATE`, `SAME_SHIFT`, etc.

---

## 📡 **ENDPOINTS DETALLADOS**

### **FASE 2A: CORE (4 endpoints)**

#### **1. GET /kiosk/config**
- **Middleware:** requireAuth + requireEmployee
- **Query params:** device_id (opcional), company_id (opcional)
- **Función:** Obtener configuración del kiosk (contingencia, botones, throttling)
- **Response OK:**
  ```json
  {
    "config": {
      "allow_lunch_buttons": true,
      "allow_permission_buttons": false,
      "contingency_enabled": false,
      "auto_reset_seconds": 5,
      "throttle_seconds": 30
    },
    "device": { "id": "uuid", "name": "Biométrico 001" }
  }
  ```

#### **2. POST /kiosk/identify**
- **Middleware:** Ninguno (público)
- **Body:** `{ "pin": "1234", "device_id"?: "uuid" }`
- **Función:** Validar PIN y retornar info del empleado + session token
- **Response OK:**
  ```json
  {
    "employee": {
      "id": "uuid",
      "code": "EMP-001",
      "full_name": "Juan Pérez",
      "photo_url": "https://...",
      "company": { "id": "uuid", "name": "Acme Corp" },
      "current_shift": { "id": "uuid", "name": "Mañana" },
      "last_punch": { "datetime": "2026-01-11T07:05:00Z", "type": "IN" }
    },
    "session_token": "uuid"
  }
  ```

#### **3. POST /kiosk/punch**
- **Middleware:** requireAuth + requireEmployee
- **Body:**
  ```json
  {
    "session_token": "uuid",
    "employee_id": "uuid",
    "punch_key": 1,  // 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN, 5=PERMISSION_OUT, 6=PERMISSION_IN
    "device_id"?: "uuid",
    "notes"?: "string"
  }
  ```
- **Función:** Registrar marcación (usa HORA DEL SERVIDOR)
- **Validaciones:**
  - No permitir OUT sin IN previo
  - No permitir doble IN consecutivo
  - Throttling: 30 segundos entre marcaciones (TODO)
- **Response OK:**
  ```json
  {
    "punch": {
      "id": "uuid",
      "datetime": "2026-01-11T07:12:34Z",  // Hora del SERVIDOR
      "type": "IN",
      "source": "KIOSK",
      "is_contingency": false
    },
    "message": "Entrada registrada",
    "next_expected_punch": "OUT"
  }
  ```

#### **4. GET /kiosk/my-punches**
- **Middleware:** requireAuth + requireEmployee
- **Query params:** employee_id (requerido), days (default: 7, max: 30)
- **Función:** Obtener últimas marcaciones del empleado
- **Response OK:**
  ```json
  {
    "punches": [
      {
        "id": "uuid",
        "date": "2026-01-11",
        "time": "07:12:34",
        "datetime": "2026-01-11T07:12:34Z",
        "type": "IN",
        "source": "KIOSK",
        "device": { "id": "uuid", "name": "Biométrico 001" },
        "is_contingency": false,
        "status": "NORMAL"
      }
    ],
    "summary": {
      "total_punches": 42,
      "total_anomalies": 0,
      "last_punch": { "datetime": "2026-01-11T07:12:34Z", "type": "IN" }
    }
  }
  ```

---

### **FASE 2B: CONSULTAS (6 endpoints)**

#### **5. GET /kiosk/my-shifts**
- **Middleware:** requireAuth + requireEmployee
- **Query params:** employee_id (requerido), from (default: hoy), to (default: +7 días)
- **Función:** Obtener turnos asignados/planificados
- **Límite:** Máximo 90 días de rango
- **Response OK:**
  ```json
  {
    "shifts": [
      {
        "date": "2026-01-11",
        "shift": {
          "id": "uuid",
          "name": "Mañana",
          "short_name": "M",
          "start_time": "07:00",
          "end_time": "15:00"
        },
        "is_planned": true,
        "source": "PLANNED"
      }
    ],
    "summary": { "total_days": 7, "total_shifts": 5, "total_free_days": 2 }
  }
  ```

#### **6. GET /kiosk/my-anomalies**
- **Middleware:** requireAuth + requireEmployee
- **Query params:** employee_id (requerido), days (default: 7, max: 30)
- **Función:** Obtener anomalías del empleado
- **Estado:** TODO (estructura vacía por ahora)

#### **7-10. GET /kiosk/my-permissions | my-regularizations | my-justifications | my-shift-changes**
- **Middleware:** requireAuth + requireEmployee
- **Query params:**
  - employee_id (requerido)
  - from, to (YYYY-MM-DD, opcionales)
  - status (PENDING|APPROVED|REJECTED|CANCELLED, opcional)
  - limit (default: 50, max: 200)
  - offset (default: 0)
- **Función:** Obtener solicitudes del empleado CON PAGINACIÓN
- **Response OK:**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "employee_id": "uuid",
        "status_key": "PENDING",
        "status_label": "Pendiente",
        // ... campos específicos según tipo de solicitud
        "created_at": "2026-01-11T07:00:00Z",
        "updated_at": "2026-01-11T07:00:00Z"
      }
    ],
    "page": { "limit": 50, "offset": 0, "total": 123 }
  }
  ```

---

### **FASE 2C: SOLICITUDES (4 endpoints)**

#### **11. POST /kiosk/request-regularization**
- **Middleware:** requireAuth + requireEmployee
- **Body:**
  ```json
  {
    "employee_id": "uuid",
    "requested_date": "2026-01-10",
    "requested_time": "13:05",
    "requested_punch_key": 1,  // 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN
    "regularization_reason_id": "uuid",
    "notes": "Me olvidé de marcar",
    "original_punch_id"?: "uuid"
  }
  ```
- **Validaciones:**
  - No permitir regularizar fechas futuras
- **Response OK:**
  ```json
  {
    "request": {
      "id": "uuid",
      "requested_date": "2026-01-10",
      "requested_time": "13:05",
      "punch_type": "IN",
      "reason": { "id": "uuid", "code": "FORGOT", "value": "Olvidó marcar" },
      "status": { "code": "PENDING", "value": "Pendiente" },
      "created_at": "2026-01-11T07:12:34Z"
    },
    "message": "Solicitud de regularización creada. Pendiente de aprobación."
  }
  ```

#### **12. POST /kiosk/request-permission**
- **Middleware:** requireAuth + requireEmployee
- **Body:**
  ```json
  {
    "employee_id": "uuid",
    "justification_type_id": "uuid",
    "attendance_event_id": "uuid",
    "start_datetime": "2026-01-13T00:00:00Z",
    "end_datetime": "2026-01-15T23:59:59Z",
    "start_time"?: "HH:mm",
    "end_time"?: "HH:mm",
    "notes": "Vacaciones familiares"
  }
  ```
- **Validaciones:**
  - start_datetime < end_datetime

#### **13. POST /kiosk/request-justification**
- **Middleware:** requireAuth + requireEmployee
- **Body:**
  ```json
  {
    "employee_id": "uuid",
    "justification_type_id": "uuid",
    "attendance_event_id": "uuid",
    "absence_date": "2026-01-10",
    "notes": "Enfermedad"
  }
  ```
- **Validaciones:**
  - absence_date debe ser PASADA (no futuro)
- **Nota:** Es un ALIAS de `request-permission` pero con validación de fecha pasada

#### **14. POST /kiosk/request-shift-change**
- **Middleware:** requireAuth + requireEmployee
- **Body:**
  ```json
  {
    "employee_id": "uuid",
    "requested_date": "2026-01-13",
    "current_shift_id": "uuid",
    "requested_shift_id": "uuid",
    "change_reason_id": "uuid",
    "notes": "Cita médica"
  }
  ```
- **Validaciones:**
  - current_shift_id != requested_shift_id

---

### **FASE 2D: CONTINGENCIA (2 endpoints - SOLO SYSTEM_ADMIN)**

#### **15. POST /kiosk/contingency/activate**
- **Middleware:** requireAuth + requireSystemAdmin
- **Body:**
  ```json
  {
    "tenant_id": "uuid",
    "company_id"?: "uuid",      // NULL = todo el tenant
    "device_id"?: "uuid",       // NULL = toda la empresa
    "contingency_reason_id": "uuid",
    "expires_at"?: "2026-01-12T07:00:00Z"  // Default: +24 horas
  }
  ```
- **Función:** Activar modo contingencia
- **Auditoría:** Guarda quien activó, cuándo, razón

#### **16. POST /kiosk/contingency/deactivate**
- **Middleware:** requireAuth + requireSystemAdmin
- **Body:**
  ```json
  {
    "tenant_id": "uuid",
    "company_id"?: "uuid",
    "device_id"?: "uuid"
  }
  ```
- **Función:** Desactivar modo contingencia

---

## 🔒 **MIDDLEWARES IMPLEMENTADOS**

### **1. requireAuth**
- Valida token JWT con Supabase auth (ANON_KEY)
- Almacena `authUser` en contexto

### **2. requireEmployee**
- Requiere `requireAuth` primero
- Valida que el usuario tenga:
  - employee_id en tabla users
  - Rol EMPLOYEE activo
  - Tenant activo
  - Onboarding completado
- Almacena `userRecord`, `tenantId`, `employeeId` en contexto

### **3. requireSystemAdmin**
- Requiere `requireAuth` primero
- Valida que el usuario tenga:
  - Rol SYSTEM_ADMIN con scope TENANT
  - Sin scopes (acceso total)
- Solo para contingencia

---

## 🔧 **HELPERS IMPLEMENTADOS**

```typescript
// UUID v4 para request_id
function generateRequestId(): string

// ISO 8601 del servidor
function getServerTime(): string

// Crear respuesta de éxito
function createSuccessResponse<T>(data: T): SuccessResponse<T>

// Crear respuesta de error
function createErrorResponse(code, message, details?): ErrorResponse

// Cliente Supabase con SERVICE_ROLE_KEY
function getSupabaseClient()

// Cliente Supabase con ANON_KEY (validar tokens)
function getSupabaseAnonClient()
```

---

## ✅ **VALIDACIONES IMPLEMENTADAS**

### **Marcaciones:**
- ✅ No permitir OUT sin IN previo
- ✅ No permitir doble IN consecutivo
- ⚠️ Throttling: 30 segundos entre marcaciones (TODO: implementar cache)
- ⚠️ PIN attempts: 5 intentos → bloqueo 5 minutos (TODO: implementar cache)

### **Fecha/hora:**
- ✅ Hora del servidor siempre (nunca cliente)
- ✅ No regularizar fechas futuras
- ✅ No justificar fechas futuras
- ✅ Validar orden de fechas (start < end)
- ✅ Validar rango máximo (90 días para turnos, 30 días para marcaciones)

### **Cambio de turno:**
- ✅ Validar que current_shift_id != requested_shift_id

### **Contingencia:**
- ✅ Siempre expira (default +24 horas)
- ✅ Requiere motivo obligatorio
- ✅ Solo SYSTEM_ADMIN puede activar/desactivar
- ✅ Auditoría completa

---

## 📊 **ESTADÍSTICAS FINALES**

| Métrica | Valor |
|---|---|
| **Endpoints** | 16 |
| **Líneas de código** | ~1,800 |
| **Middlewares** | 3 |
| **Helpers** | 6 |
| **Códigos de error** | 8 (aprobados) |
| **Tablas usadas** | 15+ |
| **Fases** | 4 (A, B, C, D) |

---

## 🚀 **PRÓXIMOS PASOS**

### **Optimizaciones pendientes:**
1. ⚠️ **Throttling de marcaciones:** Implementar cache con TTL de 30 seg
2. ⚠️ **PIN attempts:** Implementar cache con contador + TTL de 5 min
3. ⚠️ **Session tokens:** Implementar JWT real con TTL de 5 min (ahora usa UUID)
4. ⚠️ **Anomalías:** Implementar lógica real de detección (ahora retorna array vacío)
5. ⚠️ **Status de marcaciones:** Calcular status basado en anomalías (ahora siempre NORMAL)

### **Job automático:**
6. ⚠️ **Auto-expirar contingencias:** Crear cron job que revise cada 5 min

---

## 📝 **NOTAS IMPORTANTES**

1. ✅ **Hora del servidor:** TODAS las marcaciones usan `now()` del servidor (UTC)
2. ✅ **Contrato estándar:** `{ ok, data?, error?, meta }` en TODOS los endpoints
3. ✅ **Códigos de error:** Solo 8 aprobados, todo lo demás en `details.reason`
4. ✅ **Paginación:** limit (default 50, max 200), offset (default 0)
5. ✅ **Extensión .tsx:** Siguiendo patrón del repo
6. ✅ **Sin placeholders:** Código completo y funcional (excepto TODOs marcados)
7. ✅ **Auditoría:** Todos los INSERT/UPDATE incluyen `requested_by_user_id`, `approved_by_user_id`, timestamps

---

## 🎯 **CONFIRMACIÓN FINAL**

- ✅ Módulo `/supabase/functions/server/kiosk.tsx` creado
- ✅ Rutas registradas en `/supabase/functions/server/index.tsx`
- ✅ 16 endpoints implementados (4A + 6B + 4C + 2D)
- ✅ Contrato estándar `{ ok, data, error, meta }` aplicado
- ✅ Solo 8 códigos de error aprobados
- ✅ Validaciones de negocio implementadas
- ✅ Middlewares de auth/autorizacion implementados
- ✅ Sin código a medias (excepto TODOs explícitos)

---

**FIN DE FASE 2 - BACKEND COMPLETO**

**Fecha:** 2026-01-11  
**Estado:** ✅ LISTO PARA TESTING  
**Elaborado por:** Nyra (AI Assistant)  
**Proyecto:** Turnos Titanium Enterprise On-Premise

**Próxima fase:** FASE 3 - Frontend KIOSK (5 pantallas + layout)

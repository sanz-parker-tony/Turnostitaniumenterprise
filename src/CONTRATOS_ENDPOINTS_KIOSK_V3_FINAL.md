# 📡 CONTRATOS DE ENDPOINTS KIOSK v3.0 FINAL
## Turnos Titanium Enterprise - API KIOSK

**Fecha:** 2026-01-11  
**Versión:** 3.0 FINAL (con contrato estándar obligatorio)  
**Base URL:** `/make-server-e19f2094/kiosk`

---

## 🔐 **AUTENTICACIÓN**

Todos los endpoints requieren autenticación mediante:
- **Header:** `Authorization: Bearer <access_token>`
- **Token:** JWT de Supabase auth

---

## 📋 **CONTRATO ESTÁNDAR OBLIGATORIO**

### ✅ **Respuesta OK (HTTP 200 / 201):**
```typescript
{
  "ok": true,
  "data": {
    // ... datos específicos del endpoint
  },
  "meta": {
    "request_id": string;      // UUID generado por request
    "server_time": string;     // ISO 8601 (hora del SERVIDOR, nunca cliente)
  }
}
```

### ❌ **Respuesta ERROR (HTTP 4xx / 5xx):**
```typescript
{
  "ok": false,
  "error": {
    "code": string;            // Código enum (ver tabla de códigos)
    "message": string;         // Mensaje claro para UI
    "details"?: any;           // Opcional (ej: { "field": "pin" })
  },
  "meta": {
    "request_id": string;      // UUID generado por request
    "server_time": string;     // ISO 8601 (hora del SERVIDOR)
  }
}
```

### 📝 **Notas obligatorias:**
- `request_id` se genera por request (uuid v4)
- `server_time` **siempre** viene del servidor (no del cliente)
- `details` es opcional pero útil para UI (errores de validación)

---

## 🎯 **CÓDIGOS DE ERROR ESTÁNDAR**

| Código HTTP | Código Error | Descripción |
|---|---|---|
| 401 | `UNAUTHORIZED` | No hay sesión válida / token inválido |
| 403 | `FORBIDDEN` | No es EMPLOYEE o no tiene acceso a KIOSK |
| 409 | `TENANT_NOT_READY` | Onboarding incompleto / tenant bloqueado |
| 409 | `KIOSK_DISABLED` | Kiosko deshabilitado por configuración |
| 422 | `VALIDATION_ERROR` | Faltan datos / formato inválido |
| 422 | `DATE_RANGE_TOO_LARGE` | Rango excede máximo permitido |
| 429 | `RATE_LIMITED` | Demasiadas solicitudes (throttling) |
| 500 | `INTERNAL_ERROR` | Error no controlado |
| 400 | `INVALID_PIN` | PIN incorrecto |
| 400 | `INVALID_SEQUENCE` | Secuencia de marcación inválida |
| 400 | `SAME_SHIFT` | Turno solicitado igual al actual |
| 404 | `CONFIG_NOT_FOUND` | Configuración no encontrada |
| 404 | `EMPLOYEE_NOT_FOUND` | Empleado no encontrado |
| 404 | `SHIFT_NOT_FOUND` | Turno no encontrado |
| 429 | `THROTTLE_ACTIVE` | Throttling activo (marcaciones) |
| 429 | `TOO_MANY_ATTEMPTS` | Demasiados intentos (PIN) |

**Ejemplo error 422:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Rango de fechas inválido.",
    "details": { "from": "2026-02-01", "to": "2026-01-01" }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

## 📡 **ENDPOINTS (15 TOTAL)**

### **1. GET /config**
**Descripción:** Obtener configuración del kiosk (contingencia, botones, throttling)

#### **Request:**
```typescript
// Query params
{
  device_id?: string;  // UUID del dispositivo (opcional)
  company_id?: string; // UUID de la empresa (opcional)
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "config": {
      "allow_lunch_buttons": true,
      "allow_permission_buttons": false,
      "contingency_enabled": false,
      "contingency_expires_at": null,
      "contingency_reason": null,
      "auto_reset_seconds": 5,
      "throttle_seconds": 30
    },
    "device": {
      "id": "uuid",
      "name": "Biométrico Entrada Principal",
      "code": "BIO-001",
      "location": "Planta Baja"
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 404:**
```json
{
  "ok": false,
  "error": {
    "code": "CONFIG_NOT_FOUND",
    "message": "No se encontró configuración para este dispositivo/empresa"
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **2. POST /identify**
**Descripción:** Validar PIN del empleado y retornar información + session token

#### **Request:**
```json
{
  "pin": "1234",
  "device_id": "uuid"  // opcional
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "employee": {
      "id": "uuid",
      "code": "EMP-001",
      "full_name": "Juan Pérez",
      "photo_url": "https://...",
      "company": {
        "id": "uuid",
        "name": "Acme Corp"
      },
      "current_shift": {
        "id": "uuid",
        "name": "Mañana",
        "short_name": "M",
        "start_time": "07:00",
        "end_time": "15:00"
      },
      "last_punch": {
        "datetime": "2026-01-11T07:05:00Z",
        "type": "IN",
        "source": "KIOSK"
      }
    },
    "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 401:**
```json
{
  "ok": false,
  "error": {
    "code": "INVALID_PIN",
    "message": "PIN incorrecto o empleado inactivo"
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 429:**
```json
{
  "ok": false,
  "error": {
    "code": "TOO_MANY_ATTEMPTS",
    "message": "Demasiados intentos fallidos. Intente nuevamente en 5 minutos.",
    "details": {
      "retry_after": 300
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **3. POST /punch**
**Descripción:** Registrar marcación de asistencia (IN/OUT/LUNCH/PERMISSION)

#### **Request:**
```json
{
  "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employee_id": "uuid",
  "punch_key": 1,  // 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN, 5=PERMISSION_OUT, 6=PERMISSION_IN
  "device_id": "uuid",  // opcional
  "notes": "texto"      // opcional
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "punch": {
      "id": "uuid",
      "datetime": "2026-01-11T07:12:34Z",
      "type": "IN",
      "source": "KIOSK",
      "is_contingency": false,
      "device": {
        "id": "uuid",
        "name": "Biométrico Entrada Principal"
      }
    },
    "message": "Entrada registrada",
    "next_expected_punch": "OUT"
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 400:**
```json
{
  "ok": false,
  "error": {
    "code": "INVALID_SEQUENCE",
    "message": "No puede marcar salida sin haber marcado entrada",
    "details": {
      "last_punch": {
        "datetime": "2026-01-11T07:05:00Z",
        "type": "IN"
      }
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 429:**
```json
{
  "ok": false,
  "error": {
    "code": "THROTTLE_ACTIVE",
    "message": "Debe esperar 30 segundos entre marcaciones",
    "details": {
      "retry_after": 15
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **4. GET /my-punches**
**Descripción:** Obtener marcaciones del empleado (últimos 7 días por defecto)

#### **Request:**
```typescript
// Query params
{
  employee_id: string;   // UUID del empleado (requerido)
  days?: number;         // Días hacia atrás (default: 7, max: 30)
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "punches": [
      {
        "id": "uuid",
        "date": "2026-01-11",
        "time": "07:12:34",
        "datetime": "2026-01-11T07:12:34Z",
        "type": "IN",
        "source": "KIOSK",
        "device": {
          "id": "uuid",
          "name": "Biométrico Entrada Principal"
        },
        "is_contingency": false,
        "status": "NORMAL"
      }
    ],
    "summary": {
      "total_punches": 42,
      "total_anomalies": 3,
      "last_punch": {
        "datetime": "2026-01-11T07:12:34Z",
        "type": "IN"
      }
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 422:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Parámetros inválidos",
    "details": {
      "field": "days",
      "issue": "Máximo 30 días"
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **5. GET /my-shifts**
**Descripción:** Obtener turnos asignados/planificados del empleado (solo lectura)

#### **Request:**
```typescript
// Query params
{
  employee_id: string;   // UUID del empleado (requerido)
  from?: string;         // YYYY-MM-DD (default: hoy)
  to?: string;           // YYYY-MM-DD (default: hoy + 7 días)
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "shifts": [
      {
        "date": "2026-01-11",
        "shift": {
          "id": "uuid",
          "name": "Mañana",
          "short_name": "M",
          "code": "MAÑANA",
          "start_time": "07:00",
          "end_time": "15:00",
          "shift_type": "FIXED"
        },
        "is_planned": true,
        "source": "PLANNED"
      },
      {
        "date": "2026-01-12",
        "shift": null,
        "is_planned": false,
        "source": "DEFAULT"
      }
    ],
    "summary": {
      "total_days": 7,
      "total_shifts": 5,
      "total_free_days": 2
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 422:**
```json
{
  "ok": false,
  "error": {
    "code": "DATE_RANGE_TOO_LARGE",
    "message": "Rango de fechas inválido (máximo 90 días)"
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **6. GET /my-anomalies**
**Descripción:** Obtener anomalías del empleado (últimos 7 días por defecto)

#### **Request:**
```typescript
// Query params
{
  employee_id: string;   // UUID del empleado (requerido)
  days?: number;         // Días hacia atrás (default: 7, max: 30)
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "anomalies": [
      {
        "id": "uuid",
        "date": "2026-01-10",
        "type": "MISSING_ENTRY",
        "description": "Falta marcación de entrada",
        "shift": {
          "id": "uuid",
          "name": "Mañana",
          "start_time": "07:00",
          "end_time": "15:00"
        },
        "can_regularize": true
      }
    ],
    "summary": {
      "total_anomalies": 3,
      "pending_regularizations": 1
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **7. GET /my-permissions**
**Descripción:** Obtener solicitudes de permisos del empleado (con paginación)

#### **Request:**
```typescript
// Query params (todos opcionales)
{
  employee_id: string;   // UUID del empleado (requerido)
  from?: string;         // YYYY-MM-DD
  to?: string;           // YYYY-MM-DD
  status?: string;       // PENDING|APPROVED|REJECTED|CANCELLED
  limit?: number;        // Default 50, max 200
  offset?: number;       // Default 0
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "employee_id": "uuid",
        "requested_by_user_id": "uuid",
        "request_source_id": "uuid",
        "status_id": "uuid",
        "status_key": "PENDING",
        "status_label": "Pendiente",
        "permission_type_id": "uuid",
        "permission_type_label": "Vacaciones",
        "start_date": "2026-01-10",
        "end_date": "2026-01-12",
        "start_time": null,
        "end_time": null,
        "notes": "Vacaciones familiares",
        "approved_by_user_id": null,
        "approved_at": null,
        "rejection_reason": null,
        "created_at": "2026-01-11T07:00:00Z",
        "updated_at": "2026-01-11T07:00:00Z",
        "is_active": true
      }
    ],
    "page": {
      "limit": 50,
      "offset": 0,
      "total": 123
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **8. GET /my-regularizations**
**Descripción:** Obtener solicitudes de regularización del empleado (con paginación)

#### **Request:**
```typescript
// Query params (todos opcionales excepto employee_id)
{
  employee_id: string;   // UUID del empleado (requerido)
  from?: string;         // YYYY-MM-DD
  to?: string;           // YYYY-MM-DD
  status?: string;       // PENDING|APPROVED|REJECTED|CANCELLED
  limit?: number;        // Default 50, max 200
  offset?: number;       // Default 0
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "employee_id": "uuid",
        "requested_by_user_id": "uuid",
        "request_source_id": "uuid",
        "status_id": "uuid",
        "status_key": "PENDING",
        "status_label": "Pendiente",
        "target_punch_id": "uuid",
        "proposed_punch_at": "2026-01-10T13:05:00Z",
        "punch_type_key": "IN",
        "reason_id": "uuid",
        "reason_label": "Olvidó marcar",
        "comments": "Me olvidé de marcar entrada",
        "approved_by_user_id": null,
        "approved_at": null,
        "rejection_reason": null,
        "created_at": "2026-01-11T07:00:00Z",
        "updated_at": "2026-01-11T07:00:00Z",
        "is_active": true
      }
    ],
    "page": {
      "limit": 50,
      "offset": 0,
      "total": 18
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **9. GET /my-justifications**
**Descripción:** Obtener solicitudes de justificación del empleado (con paginación)

#### **Request:**
```typescript
// Query params (todos opcionales excepto employee_id)
{
  employee_id: string;   // UUID del empleado (requerido)
  from?: string;         // YYYY-MM-DD
  to?: string;           // YYYY-MM-DD
  status?: string;       // PENDING|APPROVED|REJECTED|CANCELLED
  limit?: number;        // Default 50, max 200
  offset?: number;       // Default 0
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "employee_id": "uuid",
        "requested_by_user_id": "uuid",
        "request_source_id": "uuid",
        "status_id": "uuid",
        "status_key": "PENDING",
        "status_label": "Pendiente",
        "anomaly_id": "uuid",
        "anomaly_type_key": "LATE",
        "anomaly_type_label": "Atraso",
        "anomaly_date": "2026-01-10",
        "minutes": 12,
        "justification_type_id": "uuid",
        "justification_type_label": "Tráfico",
        "comments": "Tráfico intenso en la ruta",
        "approved_by_user_id": null,
        "approved_at": null,
        "rejection_reason": null,
        "created_at": "2026-01-11T07:00:00Z",
        "updated_at": "2026-01-11T07:00:00Z",
        "is_active": true
      }
    ],
    "page": {
      "limit": 50,
      "offset": 0,
      "total": 7
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **10. GET /my-shift-changes**
**Descripción:** Obtener solicitudes de cambio de turno del empleado (con paginación)

#### **Request:**
```typescript
// Query params (todos opcionales excepto employee_id)
{
  employee_id: string;   // UUID del empleado (requerido)
  from?: string;         // YYYY-MM-DD
  to?: string;           // YYYY-MM-DD
  status?: string;       // PENDING|APPROVED|REJECTED|CANCELLED
  limit?: number;        // Default 50, max 200
  offset?: number;       // Default 0
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "employee_id": "uuid",
        "requested_by_user_id": "uuid",
        "request_source_id": "uuid",
        "status_id": "uuid",
        "status_key": "PENDING",
        "status_label": "Pendiente",
        "date_from": "2026-01-13",
        "date_to": "2026-01-13",
        "current_shift_id": "uuid",
        "current_shift_label": "07:00-15:00",
        "requested_shift_id": "uuid",
        "requested_shift_label": "15:00-23:00",
        "reason_id": "uuid",
        "reason_label": "Cita médica",
        "comments": "Cita con especialista",
        "approved_by_user_id": null,
        "approved_at": null,
        "rejection_reason": null,
        "created_at": "2026-01-11T07:00:00Z",
        "updated_at": "2026-01-11T07:00:00Z",
        "is_active": true
      }
    ],
    "page": {
      "limit": 50,
      "offset": 0,
      "total": 4
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **11. POST /request-regularization**
**Descripción:** Solicitar regularización de marcación (olvidé marcar, falla dispositivo, etc.)

#### **Request:**
```json
{
  "employee_id": "uuid",
  "requested_date": "2026-01-10",
  "requested_time": "13:05",
  "requested_punch_key": 1,  // 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN
  "regularization_reason_id": "uuid",
  "notes": "Me olvidé de marcar entrada",
  "original_punch_id": "uuid"  // opcional
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "request": {
      "id": "uuid",
      "requested_date": "2026-01-10",
      "requested_time": "13:05",
      "punch_type": "IN",
      "reason": {
        "id": "uuid",
        "code": "FORGOT",
        "value": "Olvidó marcar"
      },
      "status": {
        "id": "uuid",
        "code": "PENDING",
        "value": "Pendiente"
      },
      "created_at": "2026-01-11T07:12:34Z"
    },
    "message": "Solicitud de regularización creada. Pendiente de aprobación."
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 422:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No puede solicitar regularización para fechas futuras",
    "details": {
      "field": "requested_date",
      "value": "2026-01-15"
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **12. POST /request-permission**
**Descripción:** Solicitar permiso/ausencia con rango de fechas

#### **Request:**
```json
{
  "employee_id": "uuid",
  "justification_type_id": "uuid",
  "attendance_event_id": "uuid",
  "start_datetime": "2026-01-13T00:00:00Z",
  "end_datetime": "2026-01-15T23:59:59Z",
  "start_time": null,  // opcional (HH:mm para permisos por horas)
  "end_time": null,    // opcional (HH:mm para permisos por horas)
  "notes": "Vacaciones familiares"
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "request": {
      "id": "uuid",
      "start_datetime": "2026-01-13T00:00:00Z",
      "end_datetime": "2026-01-15T23:59:59Z",
      "justification_type": {
        "id": "uuid",
        "name": "Vacaciones"
      },
      "event": {
        "id": "uuid",
        "name": "Ausencia Justificada"
      },
      "status": {
        "id": "uuid",
        "code": "PENDING",
        "value": "Pendiente"
      },
      "created_at": "2026-01-11T07:12:34Z"
    },
    "message": "Solicitud de permiso creada. Pendiente de aprobación."
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 422:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La fecha de inicio debe ser anterior a la fecha de fin",
    "details": {
      "start_datetime": "2026-01-15T00:00:00Z",
      "end_datetime": "2026-01-13T00:00:00Z"
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **13. POST /request-justification**
**Descripción:** Justificar inasistencia (equivalente a request-permission pero enfocado en ausencias ya ocurridas)

⚠️ **NOTA:** Este endpoint es un ALIAS de `request-permission` pero con validación de fecha pasada.

#### **Request:**
```json
{
  "employee_id": "uuid",
  "justification_type_id": "uuid",
  "attendance_event_id": "uuid",
  "absence_date": "2026-01-10",
  "notes": "Enfermedad"
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "request": {
      "id": "uuid",
      "absence_date": "2026-01-10",
      "justification_type": {
        "id": "uuid",
        "name": "Enfermedad"
      },
      "event": {
        "id": "uuid",
        "name": "Ausencia Justificada"
      },
      "status": {
        "id": "uuid",
        "code": "PENDING",
        "value": "Pendiente"
      },
      "created_at": "2026-01-11T07:12:34Z"
    },
    "message": "Solicitud de justificación creada. Pendiente de aprobación."
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 422:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Solo puede justificar inasistencias pasadas",
    "details": {
      "field": "absence_date",
      "value": "2026-01-15"
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **14. POST /request-shift-change**
**Descripción:** Solicitar cambio de turno para una fecha específica

#### **Request:**
```json
{
  "employee_id": "uuid",
  "requested_date": "2026-01-13",
  "current_shift_id": "uuid",
  "requested_shift_id": "uuid",
  "change_reason_id": "uuid",
  "notes": "Cita médica urgente"
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "request": {
      "id": "uuid",
      "requested_date": "2026-01-13",
      "current_shift": {
        "id": "uuid",
        "name": "Mañana",
        "start_time": "07:00",
        "end_time": "15:00"
      },
      "requested_shift": {
        "id": "uuid",
        "name": "Tarde",
        "start_time": "15:00",
        "end_time": "23:00"
      },
      "reason": {
        "id": "uuid",
        "code": "MEDICAL",
        "value": "Cita médica"
      },
      "status": {
        "id": "uuid",
        "code": "PENDING",
        "value": "Pendiente"
      },
      "created_at": "2026-01-11T07:12:34Z"
    },
    "message": "Solicitud de cambio de turno creada. Pendiente de aprobación."
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 400:**
```json
{
  "ok": false,
  "error": {
    "code": "SAME_SHIFT",
    "message": "El turno solicitado es el mismo que el turno actual",
    "details": {
      "current_shift_id": "uuid",
      "requested_shift_id": "uuid"
    }
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **15. POST /contingency/activate**
**Descripción:** Activar modo contingencia (SOLO SYSTEM_ADMIN)

#### **Request:**
```json
{
  "tenant_id": "uuid",
  "company_id": "uuid",  // opcional (NULL = todo el tenant)
  "device_id": "uuid",   // opcional (NULL = toda la empresa)
  "contingency_reason_id": "uuid",
  "expires_at": "2026-01-12T07:00:00Z"  // opcional (default: +24 horas)
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "config": {
      "id": "uuid",
      "contingency_enabled": true,
      "contingency_expires_at": "2026-01-12T07:00:00Z",
      "contingency_reason": {
        "id": "uuid",
        "code": "BIO_FAIL",
        "value": "Biométrico dañado"
      },
      "activated_by": {
        "id": "uuid",
        "email": "admin@acme.com"
      },
      "activated_at": "2026-01-11T07:12:34Z"
    },
    "message": "Modo contingencia activado hasta 2026-01-12T07:00:00Z"
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 403:**
```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Solo SYSTEM_ADMIN puede activar contingencia"
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

### **16. POST /contingency/deactivate**
**Descripción:** Desactivar modo contingencia (SOLO SYSTEM_ADMIN)

#### **Request:**
```json
{
  "tenant_id": "uuid",
  "company_id": "uuid",  // opcional
  "device_id": "uuid"    // opcional
}
```

#### **Response 200:**
```json
{
  "ok": true,
  "data": {
    "config": {
      "id": "uuid",
      "contingency_enabled": false,
      "contingency_expires_at": null,
      "deactivated_by": {
        "id": "uuid",
        "email": "admin@acme.com"
      },
      "deactivated_at": "2026-01-11T07:12:34Z"
    },
    "message": "Modo contingencia desactivado"
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

#### **Response 403:**
```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Solo SYSTEM_ADMIN puede desactivar contingencia"
  },
  "meta": {
    "request_id": "uuid",
    "server_time": "2026-01-11T07:12:34Z"
  }
}
```

---

## 🔒 **VALIDACIONES COMUNES**

### **Throttling:**
- Marcaciones: 30 segundos entre clicks (configurable)
- PIN: 5 intentos fallidos → bloqueo 5 minutos
- Solicitudes: 1 por minuto por tipo

### **Secuencias de marcación:**
- No permitir OUT sin IN previo
- No permitir doble IN consecutivo
- Marcar anomalías automáticamente

### **Contingencia:**
- Siempre expira (máximo 24 horas)
- Solo SYSTEM_ADMIN puede activar/desactivar
- Requiere motivo obligatorio
- Auditoría completa

### **Scopes:**
- RRHH_ADMIN: scope total (todos los empleados)
- SUPERVISOR: scope limitado por empresa/localidad/departamento/área/empleado/rol de pago
- EMPLOYEE: solo puede ver sus propios datos

---

## 📝 **NOTAS IMPORTANTES**

1. ✅ **Formato estándar OBLIGATORIO:** `{ ok, data?, error?, meta }` en TODOS los endpoints
2. ✅ **meta.request_id:** UUID v4 generado por request
3. ✅ **meta.server_time:** ISO 8601 del servidor (nunca cliente)
4. ✅ **Hora del servidor:** Todas las marcaciones usan la hora del servidor (UTC)
5. ✅ **Session token:** El token de `/identify` expira en 5 minutos
6. ✅ **Paginación:** limit (default 50, max 200), offset (default 0)
7. ✅ **Códigos de error consistentes:** Ver tabla de códigos estándar
8. ✅ **4 endpoints separados para "Mis Solicitudes":** my-permissions, my-regularizations, my-justifications, my-shift-changes

---

**FIN DE CONTRATOS v3.0 FINAL**

**Fecha:** 2026-01-11  
**Versión:** 3.0 FINAL (con contrato estándar obligatorio)  
**Total endpoints:** 16  
**Cambios:**
- ✅ Contrato estándar `{ ok, data?, error?, meta }` aplicado a TODOS
- ✅ 4 endpoints separados para "Mis Solicitudes" (con paginación)
- ✅ Códigos de error estándar predefinidos
- ✅ `meta: { request_id, server_time }` obligatorio en todas las respuestas

**Elaborado por:** Nyra (AI Assistant)  
**Proyecto:** Turnos Titanium Enterprise On-Premise

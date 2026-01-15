# 📡 CONTRATOS DE ENDPOINTS KIOSK
## Turnos Titanium Enterprise - API KIOSK v1.0

**Fecha:** 2026-01-11  
**Versión:** 1.0  
**Base URL:** `/make-server-e19f2094/kiosk`

---

## 🔐 **AUTENTICACIÓN**

Todos los endpoints requieren autenticación mediante:
- **Header:** `Authorization: Bearer <access_token>`
- **Token:** JWT de Supabase auth

---

## 📋 **ENDPOINTS**

### **1. GET /config**
**Descripción:** Obtener configuración del kiosk

#### **Request:**
```typescript
// Query params
{
  device_id?: string;  // UUID del dispositivo (opcional)
  company_id?: string; // UUID de la empresa (opcional)
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    config: {
      allow_lunch_buttons: boolean;
      allow_permission_buttons: boolean;
      contingency_enabled: boolean;
      contingency_expires_at: string | null; // ISO 8601
      contingency_reason: {
        id: string;
        code: string;
        value: string;
      } | null;
      auto_reset_seconds: number;
      throttle_seconds: number;
    },
    device: {
      id: string;
      name: string;
      code: string;
      location: string;
    } | null
  }
}
```

#### **Response 404:**
```typescript
{
  success: false,
  error: "Configuration not found",
  message: "No configuration found for this device/company"
}
```

---

### **2. POST /identify**
**Descripción:** Validar PIN y retornar información del empleado

#### **Request:**
```typescript
{
  pin: string;           // PIN del empleado (4-6 dígitos)
  device_id?: string;    // UUID del dispositivo (opcional)
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    employee: {
      id: string;
      code: string;
      full_name: string;
      photo_url: string | null;
      company: {
        id: string;
        name: string;
      };
      current_shift: {
        id: string;
        name: string;
        short_name: string;
        start_time: string; // HH:mm
        end_time: string;   // HH:mm
      } | null;
      last_punch: {
        datetime: string;    // ISO 8601
        type: string;        // IN/OUT/LUNCH_OUT/LUNCH_IN
        source: string;      // BIOMETRIC/KIOSK/KIOSK_CONTINGENCY
      } | null;
    },
    session_token: string; // Token temporal para marcaciones (válido 5 minutos)
  }
}
```

#### **Response 401:**
```typescript
{
  success: false,
  error: "Invalid PIN",
  message: "PIN incorrecto o empleado inactivo"
}
```

#### **Response 429:**
```typescript
{
  success: false,
  error: "Too many attempts",
  message: "Demasiados intentos fallidos. Intente nuevamente en 5 minutos.",
  retry_after: 300 // segundos
}
```

---

### **3. POST /punch**
**Descripción:** Registrar marcación de asistencia

#### **Request:**
```typescript
{
  session_token: string;    // Token temporal del endpoint /identify
  employee_id: string;      // UUID del empleado
  punch_key: number;        // 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN, 5=PERMISSION_OUT, 6=PERMISSION_IN
  device_id?: string;       // UUID del dispositivo
  notes?: string;           // Notas opcionales
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    punch: {
      id: string;
      datetime: string;      // ISO 8601 (hora del SERVIDOR)
      type: string;          // IN/OUT/LUNCH_OUT/LUNCH_IN/PERMISSION_OUT/PERMISSION_IN
      source: string;        // KIOSK/KIOSK_CONTINGENCY
      is_contingency: boolean;
      device: {
        id: string;
        name: string;
      } | null;
    },
    message: string;         // "Entrada registrada" / "Salida registrada"
    next_expected_punch: string | null; // IN/OUT/LUNCH_OUT/LUNCH_IN
  }
}
```

#### **Response 400:**
```typescript
{
  success: false,
  error: "Invalid sequence",
  message: "No puede marcar salida sin haber marcado entrada",
  last_punch: {
    datetime: string;
    type: string;
  } | null
}
```

#### **Response 429:**
```typescript
{
  success: false,
  error: "Throttle active",
  message: "Debe esperar 30 segundos entre marcaciones",
  retry_after: number // segundos restantes
}
```

---

### **4. GET /my-punches**
**Descripción:** Obtener marcaciones del empleado (últimos 7 días por defecto)

#### **Request:**
```typescript
// Query params
{
  employee_id: string;   // UUID del empleado
  days?: number;         // Días hacia atrás (default: 7, max: 30)
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    punches: Array<{
      id: string;
      date: string;          // YYYY-MM-DD
      time: string;          // HH:mm:ss
      datetime: string;      // ISO 8601
      type: string;          // IN/OUT/LUNCH_OUT/LUNCH_IN/PERMISSION_OUT/PERMISSION_IN
      source: string;        // BIOMETRIC/KIOSK/KIOSK_CONTINGENCY/MANUAL
      device: {
        id: string;
        name: string;
      } | null;
      is_contingency: boolean;
      status: string;        // NORMAL/ANOMALY/PENDING
    }>;
    summary: {
      total_punches: number;
      total_anomalies: number;
      last_punch: {
        datetime: string;
        type: string;
      } | null;
    }
  }
}
```

---

### **5. GET /my-anomalies**
**Descripción:** Obtener anomalías del empleado (últimos 7 días por defecto)

#### **Request:**
```typescript
// Query params
{
  employee_id: string;   // UUID del empleado
  days?: number;         // Días hacia atrás (default: 7, max: 30)
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    anomalies: Array<{
      id: string;
      date: string;          // YYYY-MM-DD
      type: string;          // MISSING_ENTRY/MISSING_EXIT/DOUBLE_ENTRY/DOUBLE_EXIT/etc
      description: string;   // Descripción de la anomalía
      shift: {
        id: string;
        name: string;
        start_time: string;
        end_time: string;
      } | null;
      can_regularize: boolean; // ¿Puede solicitar regularización?
    }>;
    summary: {
      total_anomalies: number;
      pending_regularizations: number;
    }
  }
}
```

---

### **6. POST /request-regularization**
**Descripción:** Solicitar regularización de marcación

#### **Request:**
```typescript
{
  employee_id: string;           // UUID del empleado
  requested_date: string;        // YYYY-MM-DD
  requested_time: string;        // HH:mm
  requested_punch_key: number;   // 1=IN, 2=OUT, 3=LUNCH_OUT, 4=LUNCH_IN
  regularization_reason_id: string; // UUID del motivo (lookup_values)
  notes?: string;                // Notas opcionales
  original_punch_id?: string;    // UUID de la marcación original (si existe)
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    request: {
      id: string;
      requested_date: string;
      requested_time: string;
      punch_type: string;      // IN/OUT/LUNCH_OUT/LUNCH_IN
      reason: {
        id: string;
        code: string;
        value: string;
      };
      status: string;          // PENDING
      created_at: string;      // ISO 8601
    },
    message: "Solicitud de regularización creada. Pendiente de aprobación."
  }
}
```

#### **Response 400:**
```typescript
{
  success: false,
  error: "Invalid date",
  message: "No puede solicitar regularización para fechas futuras"
}
```

---

### **7. POST /request-permission**
**Descripción:** Solicitar permiso/ausencia

#### **Request:**
```typescript
{
  employee_id: string;           // UUID del empleado
  justification_type_id: string; // UUID del tipo de justificación
  attendance_event_id: string;   // UUID del evento de asistencia
  start_datetime: string;        // ISO 8601
  end_datetime: string;          // ISO 8601
  start_time?: string;           // HH:mm (opcional, para permisos por horas)
  end_time?: string;             // HH:mm (opcional, para permisos por horas)
  notes?: string;                // Notas opcionales
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    request: {
      id: string;
      start_datetime: string;
      end_datetime: string;
      justification_type: {
        id: string;
        name: string;
      };
      event: {
        id: string;
        name: string;
      };
      status: string;          // PENDING
      created_at: string;
    },
    message: "Solicitud de permiso creada. Pendiente de aprobación."
  }
}
```

#### **Response 400:**
```typescript
{
  success: false,
  error: "Invalid dates",
  message: "La fecha de inicio debe ser anterior a la fecha de fin"
}
```

---

### **8. POST /request-shift-change**
**Descripción:** Solicitar cambio de turno

#### **Request:**
```typescript
{
  employee_id: string;           // UUID del empleado
  requested_date: string;        // YYYY-MM-DD
  current_shift_id: string;      // UUID del turno actual
  requested_shift_id: string;    // UUID del turno solicitado
  change_reason_id: string;      // UUID del motivo (lookup_values)
  notes?: string;                // Notas opcionales
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    request: {
      id: string;
      requested_date: string;
      current_shift: {
        id: string;
        name: string;
        start_time: string;
        end_time: string;
      };
      requested_shift: {
        id: string;
        name: string;
        start_time: string;
        end_time: string;
      };
      reason: {
        id: string;
        code: string;
        value: string;
      };
      status: string;          // PENDING
      created_at: string;
    },
    message: "Solicitud de cambio de turno creada. Pendiente de aprobación."
  }
}
```

#### **Response 400:**
```typescript
{
  success: false,
  error: "Same shift",
  message: "El turno solicitado es el mismo que el turno actual"
}
```

---

### **9. POST /contingency/activate**
**Descripción:** Activar modo contingencia (SOLO SYSTEM_ADMIN)

#### **Request:**
```typescript
{
  tenant_id: string;             // UUID del tenant
  company_id?: string;           // UUID de la empresa (NULL = todo el tenant)
  device_id?: string;            // UUID del dispositivo (NULL = toda la empresa)
  contingency_reason_id: string; // UUID del motivo (lookup_values)
  expires_at?: string;           // ISO 8601 (opcional, default: +24 horas)
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    config: {
      id: string;
      contingency_enabled: true;
      contingency_expires_at: string; // ISO 8601
      contingency_reason: {
        id: string;
        code: string;
        value: string;
      };
      activated_by: {
        id: string;
        email: string;
      };
      activated_at: string;
    },
    message: "Modo contingencia activado hasta ${expires_at}"
  }
}
```

#### **Response 403:**
```typescript
{
  success: false,
  error: "Forbidden",
  message: "Solo SYSTEM_ADMIN puede activar contingencia"
}
```

---

### **10. POST /contingency/deactivate**
**Descripción:** Desactivar modo contingencia (SOLO SYSTEM_ADMIN)

#### **Request:**
```typescript
{
  tenant_id: string;             // UUID del tenant
  company_id?: string;           // UUID de la empresa
  device_id?: string;            // UUID del dispositivo
}
```

#### **Response 200:**
```typescript
{
  success: true,
  data: {
    config: {
      id: string;
      contingency_enabled: false;
      contingency_expires_at: null;
      deactivated_by: {
        id: string;
        email: string;
      };
      deactivated_at: string;
    },
    message: "Modo contingencia desactivado"
  }
}
```

#### **Response 403:**
```typescript
{
  success: false,
  error: "Forbidden",
  message: "Solo SYSTEM_ADMIN puede desactivar contingencia"
}
```

---

## 🔒 **VALIDACIONES COMUNES**

### **Throttling:**
- Marcaciones: 30 segundos entre clicks (configurable)
- PIN: 5 intentos fallidos → bloqueo 5 minutos

### **Secuencias de marcación:**
- No permitir OUT sin IN previo
- No permitir doble IN
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

## 🎯 **CÓDIGOS DE ERROR**

| Código | Descripción |
|---|---|
| 200 | OK |
| 400 | Bad Request (validación fallida) |
| 401 | Unauthorized (token inválido o PIN incorrecto) |
| 403 | Forbidden (sin permisos) |
| 404 | Not Found (recurso no encontrado) |
| 429 | Too Many Requests (throttling activo) |
| 500 | Internal Server Error |

---

## 📝 **NOTAS IMPORTANTES**

1. ✅ **Hora del servidor:** Todas las marcaciones usan la hora del servidor (UTC), nunca del cliente.
2. ✅ **Session token:** El token de `/identify` expira en 5 minutos. Debe renovarse con cada identificación.
3. ✅ **Historial en KIOSK_PUNCH:** Aunque no solicite regularizaciones, debe mostrar últimas 5 marcaciones + origen + dispositivo.
4. ✅ **Estado de solicitudes integrado:** Cada pantalla KIOSK muestra el estado de sus solicitudes correspondientes (PENDING/APPROVED/REJECTED).
5. ✅ **No hay "Mis Solicitudes" separado:** El estado se integra en cada pantalla funcional.
6. ✅ **Scope PAYROLL_GROUP:** Los filtros de procesos/ejecuciones aplican por rol de pago para SUPERVISOR.

---

**FIN DE CONTRATOS DE ENDPOINTS**

**Fecha:** 2026-01-11  
**Versión:** 1.0  
**Elaborado por:** Nyra (AI Assistant)  
**Proyecto:** Turnos Titanium Enterprise On-Premise

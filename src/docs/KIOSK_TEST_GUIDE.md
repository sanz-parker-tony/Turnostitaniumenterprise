# 🧪 KIOSK API - GUÍA DE TESTING RÁPIDO

**Fecha:** 2026-01-11  
**Versión:** v1.0  
**Tiempo estimado:** 3 minutos

---

## 🌐 **OPCIÓN 1: TESTING DESDE NAVEGADOR (RECOMENDADO - MÁS FÁCIL)**

### **Paso 1: Abrir el HTML**

```
1. Ir al proyecto
2. Abrir el archivo: /kiosk-test.html
3. Hacer clic derecho → "Open with Live Server" (si tienes VS Code)
   O simplemente hacer doble clic para abrirlo en el navegador
```

### **Paso 2: Ya está listo!**

✅ **PROJECT_REF** ya está configurado  
✅ **ANON_KEY** ya está configurado  
⚠️ **ACCESS_TOKEN** solo si vas a probar endpoints con autenticación

### **Paso 3: Obtener ACCESS_TOKEN (opcional)**

**Si necesitas probar endpoints que requieren auth:**

```javascript
// Ir a tu app en el navegador
// Abrir F12 → Console
// Ejecutar:
supabase.auth.getSession().then(d => {
  console.log('ACCESS_TOKEN:', d.data.session.access_token);
});

// O si no tienes sesión activa:
supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'tu-password'
}).then(d => {
  console.log('ACCESS_TOKEN:', d.data.session.access_token);
});

// Copiar el token y pegarlo en el campo ACCESS_TOKEN del HTML
```

### **Paso 4: Probar endpoints**

**Endpoint público (NO requiere auth):**
- POST /kiosk/identify → Click en "🚀 Probar (sin auth)"

**Endpoints con auth (requieren ACCESS_TOKEN):**
- GET /kiosk/config → Click en "🚀 Probar"
- POST /kiosk/punch → Click en "🚀 Probar"
- GET /kiosk/my-punches → Click en "🚀 Probar"
- GET /kiosk/my-anomalies → Click en "🚀 Probar"

**Quick Actions:**
- ⚡ Test Secuencia Completa → Ejecuta 3 endpoints en orden
- 🗑️ Limpiar Respuesta → Limpia el panel de respuestas

---

## 💻 **OPCIÓN 2: TESTING CON CURL (PARA EXPERTOS)**

### 📋 **PRE-REQUISITOS**

### 1️⃣ **Obtener PROJECT_REF**

**Ya configurado:** `qvjyqjypuyjaremqjtra`

### 2️⃣ **Obtener ACCESS_TOKEN**

**Opción A - Con Supabase CLI instalado:**
```bash
# Login (si no lo has hecho)
supabase login

# Obtener access token del usuario autenticado
supabase db dump --project-ref <PROJECT_REF>
# (El CLI lo usa internamente, pero no lo expone directamente)

# Alternativa: Crear sesión desde frontend
# Ver "Opción B"
```

**Opción B - Desde Frontend/Console (RECOMENDADO):**
```javascript
// Ejecutar en la consola del navegador (en tu app)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@example.com',
  password: 'tu-password-aquí'
});

if (data?.session?.access_token) {
  console.log('ACCESS_TOKEN:', data.session.access_token);
  // Copiar el token completo
}
```

**Opción C - Sin autenticación (solo para /identify):**
```bash
# El endpoint /kiosk/identify NO requiere auth
# Ver ejemplos abajo
```

### 3️⃣ **Variables de entorno**

```bash
# Exportar para usar en los ejemplos
export PROJECT_REF="qvjyqjypuyjaremqjtra"
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export BASE_URL="https://${PROJECT_REF}.supabase.co/functions/v1/make-server-e19f2094"
```

---

## 🔥 **6 LLAMADAS CURL DE PRUEBA**

### **1. GET /kiosk/config** (requiere auth + employee)

```bash
curl -X GET "${BASE_URL}/kiosk/config?device_id=optional-uuid&company_id=optional-uuid" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq
```

**Respuesta esperada (200):**
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
      "name": "Biométrico 001",
      "code": "BIO-001",
      "location": "Recepción"
    }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "server_time": "2026-01-11T08:30:45.123Z"
  }
}
```

---

### **2. POST /kiosk/identify** (público, NO requiere auth)

```bash
curl -X POST "${BASE_URL}/kiosk/identify" \
  -H "Content-Type: application/json" \
  -d '{
    "pin": "1234",
    "device_id": "optional-uuid"
  }' \
  | jq
```

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": {
    "employee": {
      "id": "uuid",
      "code": "EMP-001",
      "full_name": "Juan Pérez",
      "photo_url": "https://example.com/photo.jpg",
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
    "session_token": "uuid-session-token"
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440001",
    "server_time": "2026-01-11T08:30:45.456Z"
  }
}
```

**Error: PIN incorrecto (401):**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "PIN incorrecto o empleado inactivo",
    "details": {
      "reason": "INVALID_PIN",
      "field": "pin",
      "hint": "Verifique su PIN de 4 dígitos"
    }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440002",
    "server_time": "2026-01-11T08:30:45.789Z"
  }
}
```

---

### **3. POST /kiosk/punch** (requiere auth + employee)

```bash
curl -X POST "${BASE_URL}/kiosk/punch" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "session_token": "uuid-from-identify",
    "employee_id": "uuid-empleado",
    "punch_key": 1,
    "device_id": "optional-uuid",
    "notes": "Marcación normal"
  }' \
  | jq
```

**punch_key valores:**
- `1` = IN (Entrada)
- `2` = OUT (Salida)
- `3` = LUNCH_OUT (Salida almuerzo)
- `4` = LUNCH_IN (Regreso almuerzo)
- `5` = PERMISSION_OUT (Salida permiso)
- `6` = PERMISSION_IN (Regreso permiso)

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": {
    "punch": {
      "id": "uuid",
      "datetime": "2026-01-11T08:30:45.123Z",
      "type": "IN",
      "source": "KIOSK",
      "is_contingency": false,
      "device": {
        "id": "uuid",
        "name": "Biométrico 001"
      }
    },
    "message": "Entrada registrada",
    "next_expected_punch": "OUT"
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440003",
    "server_time": "2026-01-11T08:30:45.123Z"
  }
}
```

**Error: Secuencia inválida (422):**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No puede marcar salida sin haber marcado entrada",
    "details": {
      "reason": "INVALID_SEQUENCE",
      "last_punch_type": "OUT",
      "requested_type": "OUT"
    }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440004",
    "server_time": "2026-01-11T08:30:45.456Z"
  }
}
```

---

### **4. GET /kiosk/my-punches** (requiere auth + employee)

```bash
curl -X GET "${BASE_URL}/kiosk/my-punches?employee_id=uuid-empleado&days=7" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq
```

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": {
    "punches": [
      {
        "id": "uuid",
        "date": "2026-01-11",
        "time": "08:30:45",
        "datetime": "2026-01-11T08:30:45Z",
        "type": "IN",
        "source": "KIOSK",
        "device": {
          "id": "uuid",
          "name": "Biométrico 001"
        },
        "is_contingency": false,
        "status": "NORMAL"
      }
    ],
    "summary": {
      "total_punches": 42,
      "total_anomalies": 0,
      "last_punch": {
        "datetime": "2026-01-11T08:30:45Z",
        "type": "IN"
      }
    }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440005",
    "server_time": "2026-01-11T08:31:00.123Z"
  }
}
```

---

### **5. GET /kiosk/my-anomalies** (requiere auth + employee)

```bash
curl -X GET "${BASE_URL}/kiosk/my-anomalies?employee_id=uuid-empleado&days=7" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  | jq
```

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": {
    "anomalies": [],
    "summary": {
      "total_anomalies": 0,
      "pending_regularizations": 0
    }
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440006",
    "server_time": "2026-01-11T08:31:15.123Z"
  }
}
```

---

### **6. POST /kiosk/contingency/activate** (requiere auth + SYSTEM_ADMIN)

```bash
curl -X POST "${BASE_URL}/kiosk/contingency/activate" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "uuid-tenant",
    "company_id": null,
    "device_id": null,
    "contingency_reason_id": "uuid-lookup-value",
    "expires_at": "2026-01-12T08:00:00Z"
  }' \
  | jq
```

**Respuesta esperada (200):**
```json
{
  "ok": true,
  "data": {
    "config": {
      "id": "uuid",
      "contingency_enabled": true,
      "contingency_expires_at": "2026-01-12T08:00:00Z",
      "contingency_reason": {
        "id": "uuid",
        "code": "POWER_OUTAGE",
        "value": "Corte de energía"
      },
      "activated_by": {
        "id": "uuid",
        "email": "admin@example.com"
      },
      "activated_at": "2026-01-11T08:31:30.123Z"
    },
    "message": "Modo contingencia activado hasta 2026-01-12T08:00:00Z"
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440007",
    "server_time": "2026-01-11T08:31:30.123Z"
  }
}
```

**Error: Sin permisos (403):**
```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Solo SYSTEM_ADMIN puede gestionar contingencia"
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440008",
    "server_time": "2026-01-11T08:31:45.123Z"
  }
}
```

---

## 📊 **CÓDIGOS DE RESPUESTA ESPERADOS**

### ✅ **200 OK**
```json
{
  "ok": true,
  "data": { /* ... datos específicos del endpoint ... */ },
  "meta": {
    "request_id": "uuid-v4",
    "server_time": "ISO-8601"
  }
}
```

### ❌ **401 UNAUTHORIZED**
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token de autenticación requerido"
  },
  "meta": {
    "request_id": "uuid-v4",
    "server_time": "ISO-8601"
  }
}
```

**Causas comunes:**
- No enviar header `Authorization: Bearer <token>`
- Token expirado o inválido
- Token corrupto

---

### ❌ **403 FORBIDDEN**
```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Acceso denegado. Solo empleados pueden usar KIOSK"
  },
  "meta": {
    "request_id": "uuid-v4",
    "server_time": "ISO-8601"
  }
}
```

**Causas comunes:**
- Usuario no tiene rol EMPLOYEE
- Usuario no tiene `employee_id` en tabla users
- Intentar usar contingencia sin ser SYSTEM_ADMIN

---

### ❌ **409 CONFLICT - TENANT_NOT_READY**
```json
{
  "ok": false,
  "error": {
    "code": "TENANT_NOT_READY",
    "message": "Onboarding no completado"
  },
  "meta": {
    "request_id": "uuid-v4",
    "server_time": "ISO-8601"
  }
}
```

**Causas comunes:**
- Tenant no activo
- Onboarding no completado (status != 'COMPLETED')

---

### ❌ **409 CONFLICT - KIOSK_DISABLED**
```json
{
  "ok": false,
  "error": {
    "code": "KIOSK_DISABLED",
    "message": "Modo KIOSK deshabilitado"
  },
  "meta": {
    "request_id": "uuid-v4",
    "server_time": "ISO-8601"
  }
}
```

**Causas comunes:**
- Configuración de kiosk con `is_active = false`
- No hay configuración para el tenant/company/device

---

### ❌ **422 VALIDATION_ERROR**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "PIN incorrecto",
    "details": {
      "reason": "INVALID_PIN",
      "field": "pin",
      "hint": "Verifique su PIN de 4 dígitos"
    }
  },
  "meta": {
    "request_id": "uuid-v4",
    "server_time": "ISO-8601"
  }
}
```

**Razones comunes en `details.reason`:**
- `MISSING_PIN` - Campo pin requerido
- `INVALID_PIN` - PIN incorrecto o empleado inactivo
- `MISSING_EMPLOYEE_ID` - Campo employee_id requerido
- `INVALID_PUNCH_KEY` - punch_key inválido (debe ser 1-6)
- `INVALID_SEQUENCE` - Secuencia de marcación inválida (ej: OUT sin IN)
- `FUTURE_DATE` - No puede regularizar/justificar fechas futuras
- `SAME_SHIFT` - Turno solicitado igual al actual
- `CONFIG_NOT_FOUND` - No se encontró configuración
- `DAYS_LIMIT_EXCEEDED` - Excede límite de días permitidos
- `MISSING_FIELDS` - Faltan campos requeridos
- `INVALID_DATE_RANGE` - Fecha inicio > fecha fin

---

### ❌ **422 DATE_RANGE_TOO_LARGE**
```json
{
  "ok": false,
  "error": {
    "code": "DATE_RANGE_TOO_LARGE",
    "message": "Rango de fechas inválido (máximo 90 días)"
  },
  "meta": {
    "request_id": "uuid-v4",
    "server_time": "ISO-8601"
  }
}
```

**Causas comunes:**
- Solicitar turnos con rango > 90 días
- Solicitar marcaciones con days > 30

---

### ❌ **429 RATE_LIMITED**
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Demasiadas solicitudes. Espere 30 segundos.",
    "details": {
      "reason": "THROTTLE_ACTIVE",
      "retry_after": 30
    }
  },
  "meta": {
    "request_id": "uuid-v4",
    "server_time": "ISO-8601"
  }
}
```

**Razones comunes en `details.reason`:**
- `TOO_MANY_ATTEMPTS` - Demasiados intentos de PIN (5 máx → bloqueo 5 min)
- `THROTTLE_ACTIVE` - Marcación muy rápida (30 seg entre marcaciones)

⚠️ **NOTA:** Por ahora estos checks están como TODO pendiente, no se disparan aún.

---

### ❌ **500 INTERNAL_ERROR**
```json
{
  "ok": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Error interno del servidor"
  },
  "meta": {
    "request_id": "uuid-v4",
    "server_time": "ISO-8601"
  }
}
```

**Causas comunes:**
- Error de base de datos
- Error inesperado en el servidor
- Falta configurar lookup values

---

## 📝 **DÓNDE VER LOGS**

### **Opción 1 - Supabase Dashboard (RECOMENDADO):**

```
1. Ir a: https://supabase.com/dashboard/project/<PROJECT_REF>
2. Menú lateral → Edge Functions
3. Click en "make-server-e19f2094" (o el nombre de tu función)
4. Tab "Logs"
5. Buscar por request_id para seguir el flujo
```

**Logs mínimos agregados:**
```
🔵 [KIOSK] GET /config | request_id: xxx | user: yyy
🔵 [KIOSK] POST /identify | request_id: xxx | anonymous
🔵 [KIOSK] POST /punch | request_id: xxx | user: yyy
❌ [KIOSK] ERROR | code: VALIDATION_ERROR | reason: INVALID_PIN | request_id: xxx
```

### **Opción 2 - Supabase CLI (en tiempo real):**

```bash
supabase functions logs make-server-e19f2094 --project-ref <PROJECT_REF>
```

### **Opción 3 - API de Logs:**

```bash
curl -X GET "https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/make-server-e19f2094/logs" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}"
```

---

## 🔍 **DEBUGGING TIPS**

### **Error 401 UNAUTHORIZED**
```bash
# Verificar que el token es válido
curl -X POST "${BASE_URL}/../test-token" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json"
```

### **Error 403 FORBIDDEN**
```bash
# Verificar roles del usuario
# En la BD, ejecutar:
SELECT 
  u.id, u.email, u.employee_id,
  r.role_key, r.role_name
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE u.auth_user_id = '<auth_user_id>';
```

### **Error 404 CONFIG_NOT_FOUND**
```bash
# Verificar configuración en BD:
SELECT * FROM kiosk_configuration 
WHERE tenant_id = '<tenant_id>' 
AND is_active = true;

# Si no existe, crear una:
INSERT INTO kiosk_configuration (
  tenant_id, 
  is_active, 
  allow_lunch_buttons, 
  allow_permission_buttons
) VALUES (
  '<tenant_id>', 
  true, 
  true, 
  false
);
```

### **Error INVALID_PIN**
```bash
# Verificar empleado en BD:
SELECT id, employee_code, pin, is_active 
FROM employees 
WHERE pin = '1234';

# Si no existe, crear empleado de prueba con PIN
```

### **Error INVALID_SEQUENCE**
```bash
# Ver última marcación del empleado:
SELECT 
  etp.punch_datetime,
  lv.code as punch_type
FROM employee_time_punches etp
JOIN lookup_values lv ON lv.id = etp.punch_type_id
WHERE etp.employee_id = '<employee_id>'
ORDER BY etp.punch_datetime DESC
LIMIT 1;
```

---

## 📦 **DATOS DE PRUEBA MÍNIMOS**

### **Crear empleado de prueba:**
```sql
-- 1. Crear empleado
INSERT INTO employees (
  tenant_id,
  company_id,
  employee_code,
  first_name,
  last_name,
  pin,
  is_active
) VALUES (
  '<tenant_id>',
  '<company_id>',
  'EMP-TEST-001',
  'Juan',
  'Pérez',
  '1234',
  true
) RETURNING id;

-- 2. Asociar employee_id al usuario
UPDATE users
SET employee_id = '<employee_id_retornado>'
WHERE auth_user_id = '<auth_user_id>';

-- 3. Asignar rol EMPLOYEE
INSERT INTO user_roles (user_id, role_id)
SELECT 
  u.id,
  r.id
FROM users u, roles r
WHERE u.auth_user_id = '<auth_user_id>'
AND r.role_key = 'EMPLOYEE';
```

### **Crear configuración de kiosk:**
```sql
INSERT INTO kiosk_configuration (
  tenant_id,
  is_active,
  allow_lunch_buttons,
  allow_permission_buttons,
  contingency_enabled,
  auto_reset_seconds,
  throttle_seconds
) VALUES (
  '<tenant_id>',
  true,
  true,
  false,
  false,
  5,
  30
);
```

---

## ✅ **CHECKLIST DE TESTING**

- [ ] Obtener PROJECT_REF
- [ ] Obtener ACCESS_TOKEN (con rol EMPLOYEE)
- [ ] Crear empleado con PIN (1234)
- [ ] Crear configuración de kiosk
- [ ] Asociar employee_id al usuario
- [ ] Asignar rol EMPLOYEE
- [ ] Probar GET /kiosk/config (debe retornar 200)
- [ ] Probar POST /kiosk/identify con PIN correcto (debe retornar 200)
- [ ] Probar POST /kiosk/identify con PIN incorrecto (debe retornar 401 + VALIDATION_ERROR)
- [ ] Probar POST /kiosk/punch tipo IN (debe retornar 200)
- [ ] Probar POST /kiosk/punch tipo OUT (debe retornar 200)
- [ ] Probar POST /kiosk/punch tipo OUT sin IN previo (debe retornar 422 + INVALID_SEQUENCE)
- [ ] Probar GET /kiosk/my-punches (debe retornar 200 con las 2 marcaciones)
- [ ] Probar GET /kiosk/my-anomalies (debe retornar 200 con array vacío por ahora)
- [ ] Probar POST /kiosk/contingency/activate sin ser SYSTEM_ADMIN (debe retornar 403)
- [ ] Ver logs en Dashboard → Edge Functions → Logs
- [ ] Verificar que cada respuesta incluye `{ ok, data/error, meta }`
- [ ] Verificar que cada `meta.request_id` es un UUID v4 único
- [ ] Verificar que cada `meta.server_time` es ISO 8601 UTC

---

## 🎯 **FLUJO DE TESTING COMPLETO (3 MINUTOS)**

```bash
# 1. Setup (30 seg)
export PROJECT_REF="tu-ref"
export ACCESS_TOKEN="tu-token"
export BASE_URL="https://${PROJECT_REF}.supabase.co/functions/v1/make-server-e19f2094"

# 2. Test identify (30 seg)
curl -X POST "${BASE_URL}/kiosk/identify" \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}' | jq

# 3. Test config (30 seg)
curl -X GET "${BASE_URL}/kiosk/config" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq

# 4. Test punch IN (30 seg)
curl -X POST "${BASE_URL}/kiosk/punch" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "uuid-from-identify",
    "punch_key": 1
  }' | jq

# 5. Test my-punches (30 seg)
curl -X GET "${BASE_URL}/kiosk/my-punches?employee_id=uuid&days=7" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq

# 6. Ver logs (30 seg)
# Dashboard → Edge Functions → Logs
```

---

**FIN DE GUÍA - LISTO PARA TESTING** ✅

**Tiempo estimado:** 3 minutos  
**Última actualización:** 2026-01-11  
**Elaborado por:** Nyra (AI Assistant)
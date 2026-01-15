# 🎯 PASOS EXACTOS PARA TESTING - SIN ERRORES

**Para Tony - Copia y pega estos pasos** 📋

---

## ✅ **OPCIÓN 1: TESTING SIN TOKEN (MÁS FÁCIL - 30 SEGUNDOS)**

### **Paso 1: Abrir el HTML**
```
1. Ir al proyecto
2. Buscar archivo: /kiosk-test.html
3. Hacer doble clic
4. Se abre en tu navegador (Chrome, Firefox, Safari, etc.)
```

### **Paso 2: Probar endpoint público**
```
1. Bajar hasta encontrar la tarjeta verde que dice:
   "POST /kiosk/identify"
   
2. En el campo PIN dejar: 1234

3. Click en el botón verde que dice:
   "🚀 Probar (sin auth)"

4. Esperar 2 segundos

5. Bajar hasta el panel negro que dice "Respuesta del Servidor"
```

### **Paso 3: Ver resultado**

**✅ Si funcionó correctamente:**
```json
{
  "ok": true,
  "data": {
    "employee": {
      "id": "...",
      "code": "...",
      "full_name": "..."
    }
  },
  "meta": {
    "request_id": "...",
    "server_time": "..."
  }
}
```

**❌ Si no hay empleado con PIN 1234:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "PIN incorrecto o empleado inactivo"
  },
  "meta": {
    "request_id": "...",
    "server_time": "..."
  }
}
```

**Ambas respuestas son CORRECTAS** ✅ - El formato es lo importante.

---

## ✅ **OPCIÓN 2: TESTING CON TOKEN (PARA ENDPOINTS CON AUTH)**

### **Paso 1: Iniciar sesión en tu app**
```
1. Ir a: http://localhost:3000 (o la URL de tu app)
2. Iniciar sesión con tu usuario y contraseña
3. Esperar a que cargue el dashboard
```

### **Paso 2: Obtener el token (SUPER FÁCIL)**
```
1. En la app (ya con sesión iniciada), buscar en la esquina inferior derecha
2. Verás un botón azul que dice: "🔑 Get Token"
3. Click en ese botón
4. Se abrirá un panel blanco
5. Click en el botón verde "📡 Obtener Token"
6. ¡El token se copia AUTOMÁTICAMENTE al portapapeles!
```

**SCREENSHOT DE DÓNDE ESTÁ EL BOTÓN:**
```
┌──────────────────────────────────────────┐
│                                          │
│        TU APP AQUÍ                       │
│                                          │
│                                          │
│                                          │
│                              ┌─────────┐ │
│                              │🔑 Get   │ │ ← AQUÍ ESTÁ
│                              │  Token  │ │
│                              └─────────┘ │
└──────────────────────────────────────────┘
```

### **Paso 3: Pegar el token en el HTML**
```
1. Volver a /kiosk-test.html (la página de testing)
2. Buscar el campo grande que dice: "ACCESS_TOKEN"
3. Click en el campo
4. Pegar (Ctrl+V en Windows, Cmd+V en Mac)
5. Listo! Ya tienes el token configurado
```

### **Paso 4: Probar endpoints con auth**
```
Ahora puedes probar estos endpoints:

1. GET /kiosk/config
   - Click en botón "🚀 Probar"
   
2. POST /kiosk/punch
   - Llenar Employee ID (copiarlo del paso anterior)
   - Dejar Punch Key en: 1
   - Click en botón "🚀 Probar"

3. GET /kiosk/my-punches
   - Llenar Employee ID
   - Dejar Days en: 7
   - Click en botón "🚀 Probar"
```

---

## 🚨 **SI ALGO SALE MAL**

### **Error: "supabase is not defined"**
✅ **SOLUCIÓN:** No uses la consola del navegador, usa el botón "🔑 Get Token" de la app

### **Error: "No hay sesión activa"**
✅ **SOLUCIÓN:** Primero inicia sesión en tu app (localhost:3000)

### **Error: "INVALID_PIN"**
✅ **ESTO ES NORMAL** - Solo significa que no hay empleado con PIN 1234
✅ **LO IMPORTANTE:** El formato de la respuesta debe tener `{ ok, error, meta }`

### **Error: "CONFIG_NOT_FOUND"**
✅ **ESTO ES NORMAL** - Solo significa que no hay configuración de kiosk
✅ **LO IMPORTANTE:** El formato de la respuesta debe tener `{ ok, error, meta }`

---

## 📊 **CHECKLIST DE VALIDACIÓN**

### **Para cada respuesta, verificar:**

- [ ] Tiene campo `ok` (true o false)
- [ ] Tiene campo `data` (si ok=true) o `error` (si ok=false)
- [ ] Tiene campo `meta`
- [ ] `meta.request_id` existe y es un UUID
- [ ] `meta.server_time` existe y es una fecha ISO
- [ ] Si hay error, `error.code` es uno de los 8 permitidos:
  - `UNAUTHORIZED`
  - `FORBIDDEN`
  - `VALIDATION_ERROR`
  - `TENANT_NOT_READY`
  - `KIOSK_DISABLED`
  - `RATE_LIMITED`
  - `DATE_RANGE_TOO_LARGE`
  - `INTERNAL_ERROR`

---

## ✅ **EJEMPLO DE RESPUESTA VÁLIDA (ERROR)**

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
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "server_time": "2026-01-12T08:30:45.123Z"
  }
}
```

**ESTO ES VÁLIDO** ✅ - El formato está correcto.

---

## ✅ **EJEMPLO DE RESPUESTA VÁLIDA (SUCCESS)**

```json
{
  "ok": true,
  "data": {
    "employee": {
      "id": "abc-123",
      "code": "EMP-001",
      "full_name": "Juan Pérez"
    },
    "session_token": "xyz-789"
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440001",
    "server_time": "2026-01-12T08:30:45.456Z"
  }
}
```

**ESTO ES VÁLIDO** ✅ - El formato está correcto.

---

## 🎯 **RESUMEN ULTRA-CORTO**

### **SIN TOKEN (30 segundos):**
```
1. Abrir /kiosk-test.html
2. Click en "🚀 Probar (sin auth)" del endpoint identify
3. Ver respuesta abajo
4. ✅ Listo!
```

### **CON TOKEN (2 minutos):**
```
1. Iniciar sesión en tu app
2. Click en botón "🔑 Get Token" (esquina inferior derecha)
3. Click en "Obtener Token" (se copia automáticamente)
4. Volver al HTML y pegar en campo ACCESS_TOKEN
5. Probar los otros endpoints
6. ✅ Listo!
```

---

## 🆘 **¿NECESITAS AYUDA?**

**Si algo no funciona:**

1. Tomar screenshot del error
2. Copiar el JSON de la respuesta (botón "📋 Copiar")
3. Enviar a Nyra con descripción del problema
4. Nyra lo arreglará en 2 minutos

---

**FIN - PASOS EXACTOS** 🎯

**Elaborado por:** Nyra (AI Assistant)  
**Fecha:** 2026-01-12  
**Tiempo total:** 30 segundos sin token, 2 minutos con token

# 🚀 TESTING RÁPIDO - 1 MINUTO

**Para Tony que no sabe usar curl ni terminal** 😊

---

## ✅ **MÉTODO SÚPER FÁCIL (1 MINUTO)**

### **Paso 1: Abrir el HTML (10 segundos)**

```
1. Ir al archivo: /kiosk-test.html
2. Hacer doble clic
3. Se abrirá en tu navegador
```

### **Paso 2: Probar endpoint público (30 segundos)**

```
1. Buscar la tarjeta "POST /kiosk/identify"
2. Dejar el PIN en "1234"
3. Click en el botón verde "🚀 Probar (sin auth)"
4. Ver la respuesta abajo (panel negro)
```

**¿Qué debería pasar?**
- ✅ Si hay un empleado con PIN 1234 → Verás sus datos en JSON
- ❌ Si NO hay empleado → Verás error "INVALID_PIN"

### **Paso 3: Probar endpoint con autenticación (20 segundos)**

**SOLO si quieres probar más endpoints:**

```
1. Ir a tu app en otra pestaña del navegador
2. Presionar F12 (abrir consola)
3. Copiar y pegar esto:

supabase.auth.getSession().then(d => console.log(d.data.session.access_token));

4. Copiar el token que aparece en la consola
5. Volver al HTML de testing
6. Pegar el token en el campo "ACCESS_TOKEN"
7. Ahora puedes probar los otros endpoints (config, punch, etc.)
```

---

## 🎯 **TESTING AUTOMÁTICO (10 SEGUNDOS)**

```
1. Click en el botón "⚡ Test Secuencia Completa"
2. Esperar...
3. Listo! Ejecutó 3 endpoints automáticamente
```

---

## 📋 **QUÉ VERIFICAR**

### **Todas las respuestas deben tener este formato:**

```json
{
  "ok": true,  // o false si hay error
  "data": { ... },  // o "error" si ok=false
  "meta": {
    "request_id": "uuid-único",
    "server_time": "fecha-ISO-8601"
  }
}
```

### **Códigos de error permitidos (solo estos 8):**

1. `UNAUTHORIZED` - No enviaste token
2. `FORBIDDEN` - No tienes permisos
3. `VALIDATION_ERROR` - Datos inválidos (PIN incorrecto, etc.)
4. `TENANT_NOT_READY` - Onboarding no completado
5. `KIOSK_DISABLED` - Kiosk deshabilitado
6. `RATE_LIMITED` - Demasiadas peticiones
7. `DATE_RANGE_TOO_LARGE` - Rango de fechas muy grande
8. `INTERNAL_ERROR` - Error del servidor

---

## 📝 **VER LOGS (OPCIONAL)**

```
1. Ir a: https://supabase.com/dashboard/project/qvjyqjypuyjaremqjtra
2. Edge Functions → make-server-e19f2094 → Logs
3. Buscar: "🔵 [KIOSK]" o "❌ [KIOSK]"
```

---

## 🚨 **SI ALGO FALLA**

### **Error "INVALID_PIN"**
→ No existe empleado con PIN 1234 en la BD

**Solución:**
```sql
-- Ejecutar en Supabase SQL Editor:
INSERT INTO employees (
  tenant_id,
  company_id,
  employee_code,
  first_name,
  last_name,
  pin,
  is_active
) VALUES (
  'tu-tenant-id',
  'tu-company-id',
  'EMP-TEST-001',
  'Juan',
  'Pérez',
  '1234',
  true
);
```

### **Error "CONFIG_NOT_FOUND"**
→ No existe configuración de kiosk

**Solución:**
```sql
-- Ejecutar en Supabase SQL Editor:
INSERT INTO kiosk_configuration (
  tenant_id,
  is_active,
  allow_lunch_buttons,
  allow_permission_buttons
) VALUES (
  'tu-tenant-id',
  true,
  true,
  false
);
```

### **Error "FORBIDDEN"**
→ Usuario no tiene rol EMPLOYEE

**Solución:**
```sql
-- 1. Asociar employee_id al usuario:
UPDATE users
SET employee_id = 'uuid-del-empleado-creado-arriba'
WHERE auth_user_id = 'tu-auth-user-id';

-- 2. Asignar rol EMPLOYEE:
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.auth_user_id = 'tu-auth-user-id'
AND r.role_key = 'EMPLOYEE';
```

---

## ✅ **CHECKLIST MÍNIMO**

- [ ] Abrir /kiosk-test.html en navegador
- [ ] Probar POST /kiosk/identify con PIN "1234"
- [ ] Verificar que la respuesta tiene `{ ok, data/error, meta }`
- [ ] Verificar que `meta.request_id` existe
- [ ] Verificar que `meta.server_time` existe
- [ ] Si hay error, verificar que `error.code` es uno de los 8 permitidos

---

## 🎉 **SI TODO FUNCIONA**

```
✅ Backend KIOSK listo
✅ Contratos estándar verificados
✅ Logs funcionando
→ Proceder a FASE 3: Frontend KIOSK
```

---

**FIN - TESTING LISTO EN 1 MINUTO** 🚀

**Elaborado por:** Nyra (AI Assistant)  
**Fecha:** 2026-01-11

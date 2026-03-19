# 🔐 Crear Usuario Bootstrap

## ❓ ¿Por qué no se crea en el seed SQL?

**Supabase Auth requiere usar funciones admin específicas** para crear usuarios correctamente. No es posible insertar directamente en `auth.users` desde SQL porque:

1. El password debe encriptarse usando algoritmos específicos de Supabase
2. Se requieren metadatos y configuraciones que solo la API admin puede manejar
3. Insertar directamente causa errores de "Invalid login credentials"

## ✅ Solución: Usar el Endpoint de Bootstrap

Después de ejecutar los scripts de migración (`001_FACTORY_RESET.sql` y `002_SEED_COMPLETE.sql`), ejecuta uno de estos endpoints:

### **Opción 1: Endpoint Principal (Recomendado)**

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-e19f2094/bootstrap/ensure-system-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### **Opción 2: Endpoint Alternativo (Development)**

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-e19f2094/auth/create-system-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 📋 ¿Qué hace este endpoint?

El endpoint `/bootstrap/ensure-system-admin` realiza automáticamente:

1. ✅ Verifica si el usuario `system.admin@titanium-labs.com` ya existe
2. ✅ Si no existe:
   - Crea usuario en `auth.users` con password encriptado correctamente
   - Crea usuario en `public.users` vinculado al tenant SYSTEM
   - Asigna el rol `SYSTEM_ADMIN`
3. ✅ Si ya existe: simplemente retorna confirmación

## 🔑 Credenciales Por Defecto

```
Email: system.admin@titanium-labs.com
Password: Titanium2026!
```

⚠️ **IMPORTANTE:** Cambia esta contraseña después del primer login.

## 📊 Respuesta del Endpoint

### **Si el usuario se crea exitosamente:**

```json
{
  "success": true,
  "message": "Usuario system.admin creado exitosamente",
  "user": {
    "id": "uuid-del-usuario",
    "email": "system.admin@titanium-labs.com",
    "created_at": "2026-01-25T..."
  },
  "credentials": {
    "email": "system.admin@titanium-labs.com",
    "password": "Titanium2026!",
    "note": "⚠️ IMPORTANTE: Cambia esta contraseña después del primer login"
  },
  "nextSteps": [
    "1. Inicia sesión con las credenciales proporcionadas",
    "2. Cambia la contraseña inmediatamente",
    "3. Completa el wizard de configuración inicial"
  ]
}
```

### **Si el usuario ya existe:**

```json
{
  "success": true,
  "message": "Usuario ya existe",
  "user": {
    "id": "uuid-del-usuario",
    "email": "system.admin@titanium-labs.com",
    "created_at": "2026-01-25T..."
  },
  "credentials": {
    "email": "system.admin@titanium-labs.com",
    "password": "Titanium2026!",
    "note": "Contraseña por defecto. Cámbiala después del primer login."
  }
}
```

## 🛠️ Desde la Consola del Navegador

Si prefieres hacerlo desde la consola del navegador:

```javascript
const response = await fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-e19f2094/bootstrap/ensure-system-admin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  }
});

const result = await response.json();
console.log(result);
```

## ✅ Verificar que Funcionó

Después de ejecutar el endpoint, verifica que el usuario se creó correctamente:

### **1. Verificar en Auth:**

```sql
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'system.admin@titanium-labs.com';
```

### **2. Verificar en Public:**

```sql
SELECT u.id, u.username, u.email, t.tenant_key
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'system.admin@titanium-labs.com';
```

### **3. Verificar Rol Asignado:**

```sql
SELECT u.username, r.role_key, r.role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'system.admin@titanium-labs.com';
```

Deberías ver:
- `username`: `system.admin`
- `role_key`: `SYSTEM_ADMIN`
- `role_name`: `System Administrator`

## 🧪 Endpoint de Diagnóstico

Si tienes problemas, usa el endpoint de diagnóstico para ver el estado completo:

```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-e19f2094/auth/diagnostics \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Este endpoint te mostrará:
- Total de usuarios en `auth.users`
- Total de usuarios en `public.users`
- Si el usuario `system.admin` existe
- Instrucciones de solución si falta

## ❓ Preguntas Frecuentes

### **¿Puedo cambiar la contraseña por defecto?**

Sí. Edita `/supabase/functions/server/bootstrap.tsx` y cambia la constante:

```typescript
const SYSTEM_ADMIN_PASSWORD = 'TuNuevaContraseña2026!';
```

### **¿El endpoint es idempotente?**

✅ SÍ. Puedes llamarlo múltiples veces sin problema. Si el usuario ya existe, simplemente lo confirmará sin crear duplicados.

### **¿Qué pasa si ya ejecuté el seed con el código viejo?**

Si ya ejecutaste `002_SEED_COMPLETE.sql` con la versión antigua que intentaba insertar en `auth.users`:

1. Ejecuta el factory reset: `001_FACTORY_RESET.sql`
2. Vuelve a ejecutar el seed actualizado: `002_SEED_COMPLETE.sql`
3. Llama al endpoint `/bootstrap/ensure-system-admin`

## 🚀 Próximos Pasos

Una vez creado el usuario bootstrap:

1. ✅ Hacer login con `system.admin@titanium-labs.com` / `Titanium2026!`
2. ✅ Cambiar la contraseña (obligatorio por seguridad)
3. ✅ Completar el wizard de 2 pasos para crear el primer tenant y tenant.admin

---

**Última actualización:** 2026-01-25  
**Versión:** 1.0.0

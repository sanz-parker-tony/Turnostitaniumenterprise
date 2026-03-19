# 🔐 Instrucciones para Solucionar el Error de Login

## ❌ Problema

Cuando intentas hacer login con `system.admin@titanium-labs.com`, recibes el error:

```
Error al iniciar sesión: AuthApiError: Invalid login credentials
```

## ✅ Solución

El problema es que **el seed SQL NO puede crear usuarios en Supabase Auth** directamente. Debes usar el endpoint del servidor para crear el usuario correctamente.

---

## 📋 Pasos para Solucionar

### **1. Ejecutar las Migraciones (si no lo has hecho)**

En el SQL Editor de Supabase, ejecuta en orden:

```sql
-- 1. Factory Reset (limpia datos)
-- Copiar y ejecutar: /supabase/migrations/001_FACTORY_RESET.sql

-- 2. Seed Complete (inserta datos base)
-- Copiar y ejecutar: /supabase/migrations/002_SEED_COMPLETE.sql
```

**IMPORTANTE:** Al final del seed verás este mensaje:

```
⚠️  IMPORTANTE: USUARIO BOOTSTRAP
El usuario system.admin NO se crea en este seed SQL.
Para crear el usuario bootstrap, ejecutar:
  POST /make-server-e19f2094/bootstrap/ensure-system-admin
```

### **2. Crear el Usuario Bootstrap**

Tienes **3 opciones**:

#### **Opción A: Automático (Recomendado) ✨**

El sistema ahora tiene un componente que crea automáticamente el usuario cuando abres la pantalla de login. Solo:

1. Abre la aplicación en el navegador
2. Ve a la pantalla de login
3. En la esquina inferior derecha verás un panel emergente que dice:
   - "Verificando configuración..."
   - "Creando usuario bootstrap..."
   - "¡Listo para usar!"

4. Una vez que muestre "¡Listo para usar!", podrás hacer login.

#### **Opción B: Botón Manual en el Login 🔧**

1. Abre la pantalla de login
2. Intenta hacer login (fallará)
3. Aparecerá un panel de ayuda azul
4. Haz clic en el botón "🔧 Crear Usuario System Admin"
5. Espera la confirmación
6. Usa las credenciales mostradas

#### **Opción C: Endpoint Manual (Consola del Navegador) 💻**

1. Abre la consola del navegador (F12)
2. Ejecuta:

```javascript
const response = await fetch('https://qvjyqjypuyjaremqjtra.supabase.co/functions/v1/make-server-e19f2094/bootstrap/ensure-system-admin', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2anlxanlwdXlqYXJlbXFqdHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk2MzgzNjksImV4cCI6MjA0NTIxNDM2OX0.KgBDDKITe1YwFVT-lkmKrMVZ5Zf8S1iVd_LQHEVe8s4',
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log(result);
```

3. Verifica que devuelva `{ success: true }`

### **3. Hacer Login**

Una vez creado el usuario, usa las credenciales:

```
Email: system.admin@titanium-labs.com
Password: Titanium2026!
```

**⚠️ IMPORTANTE:** Cambia la contraseña después del primer login.

---

## 🔍 Verificar que Funcionó

Puedes verificar que el usuario se creó correctamente con estas queries SQL:

### **Verificar en auth.users:**

```sql
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'system.admin@titanium-labs.com';
```

### **Verificar en public.users:**

```sql
SELECT u.id, u.username, u.email, u.display_name, t.tenant_key
FROM public.users u
JOIN public.tenants t ON u.tenant_id = t.id
WHERE u.email = 'system.admin@titanium-labs.com';
```

### **Verificar rol asignado:**

```sql
SELECT u.username, r.role_key, r.role_name
FROM public.users u
JOIN public.user_roles ur ON u.id = ur.user_id
JOIN public.roles r ON ur.role_id = r.id
WHERE u.email = 'system.admin@titanium-labs.com';
```

Deberías ver:
- ✅ `username`: `system.admin`
- ✅ `role_key`: `SYSTEM_ADMIN`
- ✅ `role_name`: `System Administrator`
- ✅ `tenant_key`: `SYSTEM`

---

## 🐛 Troubleshooting

### **Si el endpoint falla con "Tenant SYSTEM no encontrado":**

Significa que no ejecutaste el seed. Ejecuta:

```sql
-- Ejecutar 002_SEED_COMPLETE.sql
```

### **Si el endpoint falla con "Rol SYSTEM_ADMIN no encontrado":**

Mismo problema. Ejecuta el seed completo.

### **Si quieres resetear todo y empezar de nuevo:**

```sql
-- 1. Factory Reset
-- Ejecutar 001_FACTORY_RESET.sql

-- 2. Seed Complete
-- Ejecutar 002_SEED_COMPLETE.sql

-- 3. Crear usuario bootstrap (desde navegador)
```

### **Si el componente automático no aparece:**

1. Revisa la consola del navegador (F12) para ver errores
2. Verifica que el servidor esté corriendo
3. Usa la Opción B o C manualmente

---

## 📚 Archivos Relevantes

- `/supabase/migrations/001_FACTORY_RESET.sql` - Limpia la base de datos
- `/supabase/migrations/002_SEED_COMPLETE.sql` - Inserta datos base
- `/supabase/functions/server/bootstrap.tsx` - Función que crea el usuario
- `/supabase/functions/server/index.tsx` - Registro de endpoints
- `/components/BootstrapUserHelper.tsx` - Componente automático de UI
- `/components/Login.tsx` - Pantalla de login con helpers

---

## ✅ Checklist Final

- [ ] Ejecuté 001_FACTORY_RESET.sql en Supabase
- [ ] Ejecuté 002_SEED_COMPLETE.sql en Supabase
- [ ] Creé el usuario bootstrap (Opción A, B o C)
- [ ] Verifiqué que el usuario existe en auth.users
- [ ] Verifiqué que el usuario existe en public.users
- [ ] Verifiqué que tiene el rol SYSTEM_ADMIN
- [ ] Puedo hacer login con system.admin@titanium-labs.com / Titanium2026!
- [ ] El menú SECURITY aparece correctamente

---

**Fecha de creación:** 2026-01-25  
**Versión:** 1.0.0  
**Autor:** Nyra AI Assistant

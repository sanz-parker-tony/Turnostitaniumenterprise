# 🔐 **GUÍA COMPLETA: LOGIN CON SUPABASE AUTH**

Implementación de autenticación con Supabase Auth nativo para Turnos Titanium.

---

## 📋 **PASO 1: EJECUTAR SCRIPTS SQL**

### 1.1 Ejecutar scripts base (si no los has ejecutado)

En **Supabase SQL Editor**, ejecuta en orden:

```sql
-- Scripts base
00_DDL_v2_CORREGIDO.sql
02_ddl_corrections_FIXED.sql
03_seed_data.sql
04_rls_policies_FIXED.sql
06_subscription_and_onboarding.sql
```

### 1.2 Ejecutar script de Supabase Auth ⚡

```sql
-- Script de autenticación
08_supabase_auth_setup.sql
```

**Este script crea:**
- ✅ Trigger `on_auth_user_created` - Crea usuario en `public.users` automáticamente
- ✅ Trigger `on_auth_user_login` - Actualiza `last_login_at`
- ✅ Función `get_current_user_profile()` - Obtiene perfil completo
- ✅ Función `get_user_tenant_id()` - Obtiene tenant del usuario
- ✅ Columna `last_login_at` en tabla `users`
- ✅ RLS policies actualizadas

**Verificación:**
```sql
SELECT 
  '✅ Configuración de Supabase Auth Lista' as status,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created') as trigger_new_user,
  (SELECT count(*) FROM pg_trigger WHERE tgname = 'on_auth_user_login') as trigger_login;
```

**Resultado esperado:**
```
status                                   | trigger_new_user | trigger_login
-----------------------------------------|-----------------|---------------
✅ Configuración de Supabase Auth Lista | 1               | 1
```

---

## 👤 **PASO 2: CREAR USUARIO ADMIN EN SUPABASE**

### 2.1 Obtener el ID del tenant

```sql
-- Obtener tenant_id (lo necesitarás en el siguiente paso)
SELECT id, tenant_name FROM tenants WHERE tenant_name = 'Titanium Demo';
```

Copia el `id` (algo como: `11111111-1111-1111-1111-111111111111`)

### 2.2 Crear usuario en Supabase Dashboard

1. Ve a **Supabase Dashboard**
2. **Authentication > Users**
3. Click en **"Add User"** o **"Invite User"**

**Completa el formulario:**

| Campo | Valor |
|-------|-------|
| **Email** | `admin@titanium.com` |
| **Password** | `Admin123!` |
| **Auto Confirm User** | ✅ **Habilitado** |

4. En **"User Metadata"** (JSON), pega:

```json
{
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "username": "admin",
  "display_name": "Administrador Titanium"
}
```

⚠️ **IMPORTANTE:** Reemplaza el `tenant_id` con el UUID que obtuviste en el paso 2.1

5. Click en **"Create User"**

### 2.3 Verificar que el usuario se creó correctamente

```sql
-- Verificar usuario en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@titanium.com';

-- Verificar usuario en public.users (debe haberse creado automáticamente)
SELECT 
  u.id,
  u.auth_user_id,
  u.username,
  u.email,
  u.display_name,
  t.tenant_name
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@titanium.com';
```

**Resultado esperado:**
```
id   | auth_user_id | username | email               | display_name            | tenant_name
-----|--------------|----------|---------------------|------------------------|-------------
uuid | uuid         | admin    | admin@titanium.com  | Administrador Titanium | Titanium Demo
```

---

## ⚙️ **PASO 3: CONFIGURAR FRONTEND**

### 3.1 Variables de entorno

Crea o edita `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[TU-PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Dónde encontrar estos valores:**
- Ve a **Supabase Dashboard > Settings > API**
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3.2 Instalar dependencias (si no están)

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 3.3 Iniciar aplicación

```bash
npm run dev
```

Debería abrir en: `http://localhost:3000`

---

## 🧪 **PASO 4: PROBAR LOGIN**

### 4.1 Ir a login

Abre: `http://localhost:3000/login`

### 4.2 Credenciales

- **Email:** `admin@titanium.com`
- **Password:** `Admin123!`

### 4.3 Click en "Iniciar Sesión"

**Flujo esperado:**
1. ✅ Muestra mensaje "Iniciando sesión..."
2. ✅ Supabase Auth valida credenciales
3. ✅ Crea sesión JWT
4. ✅ Frontend obtiene perfil del usuario (RPC `get_current_user_profile`)
5. ✅ Guarda perfil en localStorage
6. ✅ Redirige a `/dashboard`

### 4.4 Verificar sesión en DevTools

Abre **DevTools > Application > Local Storage**

Deberías ver:
- `sb-[project-ref]-auth-token` (Supabase session)
- `user_profile` (Perfil del usuario)

### 4.5 Verificar perfil en BD

```sql
SELECT * FROM users WHERE email = 'admin@titanium.com';
```

Deberías ver `last_login_at` actualizado.

---

## 🔄 **PASO 5: ASIGNAR PERMISOS AL USUARIO**

El usuario ahora puede hacer login, pero necesita permisos para ver pantallas.

### 5.1 Asignar rol al usuario

```sql
-- Obtener ID del usuario
SELECT id FROM users WHERE email = 'admin@titanium.com';

-- Obtener ID del rol "Administrador"
SELECT id FROM roles WHERE role_name = 'Administrador';

-- Asignar rol al usuario
INSERT INTO user_roles (tenant_id, user_id, role_id, created_by)
VALUES (
  '11111111-1111-1111-1111-111111111111', -- tenant_id
  (SELECT id FROM users WHERE email = 'admin@titanium.com'),
  (SELECT id FROM roles WHERE role_name = 'Administrador'),
  'SYSTEM'
);
```

### 5.2 Asignar permisos al rol (si no los tiene)

```sql
-- Verificar permisos del rol
SELECT 
  r.role_name,
  s.screen_name,
  s.screen_key
FROM role_screen_actions rsa
JOIN roles r ON rsa.role_id = r.id
JOIN screens s ON rsa.screen_id = s.id
WHERE r.role_name = 'Administrador';
```

Si no hay permisos, ejecuta el script de seed data que ya incluye permisos para Administrador.

### 5.3 Refrescar la página

Recarga el dashboard (`http://localhost:3000/dashboard`) y deberías ver el menú completo.

---

## 🎨 **ARCHIVOS CREADOS/MODIFICADOS**

### **Scripts SQL**
- ✅ `/database/08_supabase_auth_setup.sql` - Configuración de Auth

### **Frontend**
- ✅ `/lib/supabase.ts` - Cliente Supabase actualizado
- ✅ `/contexts/AuthContext.tsx` - Context de autenticación
- ✅ `/app/layout.tsx` - Root layout con AuthProvider
- ✅ `/app/login/page.tsx` - Página de login
- ✅ `/app/dashboard/page.tsx` - Dashboard protegido
- ✅ `/middleware.ts` - Middleware de protección de rutas
- ✅ `/components/LayoutNew.tsx` - Layout actualizado con useAuth

---

## 🔐 **FLUJO DE AUTENTICACIÓN**

### **1. Login**
```
Usuario → Login Form → Supabase Auth
  ↓
Supabase valida credenciales
  ↓
Genera JWT session
  ↓
Frontend guarda en localStorage
  ↓
Frontend obtiene perfil (RPC get_current_user_profile)
  ↓
AuthContext actualiza estado global
  ↓
Middleware verifica sesión
  ↓
Redirige a /dashboard
```

### **2. Verificación en cada request**
```
Usuario navega → Middleware
  ↓
Verifica session en Supabase
  ↓
Si válida → Permite acceso
Si inválida → Redirige a /login
```

### **3. Permisos**
```
Usuario autenticado → PermissionsContext
  ↓
Carga get_effective_permissions_for_user(user_id)
  ↓
Construye menú dinámicamente
  ↓
Muestra solo pantallas permitidas
```

---

## 🔧 **TROUBLESHOOTING**

### **Error: "Invalid login credentials"**

**Causa:** Password incorrecto o usuario no existe.

**Solución:**
1. Verifica que el usuario existe en Supabase Dashboard > Authentication
2. Verifica que el password es exactamente `Admin123!`
3. Verifica que el usuario está confirmado (columna `email_confirmed_at` no es null)

```sql
SELECT email, email_confirmed_at FROM auth.users WHERE email = 'admin@titanium.com';
```

---

### **Error: "Email not confirmed"**

**Causa:** Usuario creado pero no confirmado.

**Solución:**
Confirmar usuario manualmente:

```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'admin@titanium.com';
```

O marca "Auto Confirm User" al crear el usuario.

---

### **Error: "Usuario no encontrado o inactivo"**

**Causa:** El trigger `on_auth_user_created` no creó el registro en `public.users`.

**Solución:**
Verificar que el trigger existe:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Si no existe, ejecuta de nuevo el script `08_supabase_auth_setup.sql`.

Crear usuario manualmente:

```sql
INSERT INTO users (
  tenant_id, auth_user_id, username, email, display_name, is_active
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  (SELECT id FROM auth.users WHERE email = 'admin@titanium.com'),
  'admin',
  'admin@titanium.com',
  'Administrador Titanium',
  true
);
```

---

### **Error: "Sin permisos asignados"**

**Causa:** Usuario no tiene roles asignados.

**Solución:**
Ejecutar paso 5.1 para asignar rol.

---

### **Login funciona pero no muestra menú**

**Causa:** Usuario no tiene permisos.

**Solución:**
1. Verificar que tiene rol asignado:

```sql
SELECT 
  u.email,
  r.role_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'admin@titanium.com';
```

2. Verificar permisos del rol:

```sql
SELECT COUNT(*) 
FROM role_screen_actions rsa
JOIN roles r ON rsa.role_id = r.id
WHERE r.role_name = 'Administrador';
```

Si count = 0, necesitas asignar permisos al rol.

---

### **Error: "Missing env.NEXT_PUBLIC_SUPABASE_URL"**

**Causa:** Variables de entorno no configuradas.

**Solución:**
1. Crea `.env.local` en la raíz del proyecto
2. Agrega las variables (ver Paso 3.1)
3. Reinicia el servidor: `npm run dev`

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

Antes de continuar, verifica:

- [ ] Script `08_supabase_auth_setup.sql` ejecutado sin errores
- [ ] Triggers creados (`on_auth_user_created`, `on_auth_user_login`)
- [ ] Usuario `admin@titanium.com` creado en Supabase Dashboard
- [ ] Usuario confirmado (Auto Confirm habilitado)
- [ ] User Metadata con `tenant_id` correcto
- [ ] Registro en `public.users` creado automáticamente
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Dependencias instaladas (`@supabase/supabase-js`)
- [ ] Servidor frontend corriendo (`npm run dev`)
- [ ] Login exitoso redirige a `/dashboard`
- [ ] Perfil guardado en localStorage
- [ ] `last_login_at` actualizado en BD
- [ ] Rol asignado al usuario
- [ ] Permisos asignados al rol
- [ ] Menú dinámico se muestra correctamente

---

## 🚀 **PRÓXIMOS PASOS**

Una vez que el login funciona:

1. **Crear más usuarios** en Supabase Dashboard
2. **Asignar diferentes roles** para probar permisos
3. **Implementar recuperación de contraseña** (`/forgot-password`)
4. **Implementar cambio de contraseña**
5. **Agregar 2FA** (opcional)
6. **Configurar email templates** en Supabase
7. **Implementar SSO** (Google, Microsoft, etc.)

---

## 📞 **SOPORTE**

Si tienes problemas:
1. Revisa los logs del navegador (DevTools > Console)
2. Revisa los logs de Supabase (Dashboard > Logs > Auth)
3. Verifica las queries SQL en Supabase SQL Editor
4. Revisa esta guía desde el principio

**¡Login con Supabase Auth listo! 🎉**

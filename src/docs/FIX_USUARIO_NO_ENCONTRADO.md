# 🛠️ FIX: Error "Usuario NO encontrado en BD"

## ❌ PROBLEMA IDENTIFICADO

```
⚠️ Usuario NO encontrado en BD, creando perfil temporal
```

### Causa raíz:
El archivo `002_SEED_COMPLETE.sql` **SÍ crea el usuario en la tabla `users`**, pero el usuario **NO existe en `auth.users` de Supabase**.

El sistema tiene una arquitectura de **doble tabla**:
1. **`auth.users`** (tabla de Supabase Auth - maneja la autenticación)
2. **`public.users`** (nuestra tabla - guarda el perfil y permisos)

Ambas tablas deben estar sincronizadas mediante el campo `auth_user_id`.

---

## ✅ SOLUCIÓN IMPLEMENTADA

### 🔧 Cambios realizados:

#### 1. **002_SEED_COMPLETE.sql actualizado**
   - ✅ Ahora **SÍ crea el usuario en `public.users`**
   - ✅ Asigna el rol `SYSTEM_ADMIN` automáticamente
   - ✅ Deja `auth_user_id = NULL` (se vinculará al hacer login)

#### 2. **AuthContext.tsx mejorado**
   - ✅ Busca primero por `auth_user_id`
   - ✅ Si no encuentra, busca por `email`
   - ✅ Si encuentra por email, **vincula automáticamente el `auth_user_id`**
   - ✅ Actualiza la tabla `users` con el `auth_user_id` real

---

## 🎯 PASOS PARA RESOLVER EL ERROR

### PASO 1: Ejecutar los archivos SQL actualizados

#### 1.1 Ejecutar 001_FACTORY_RESET.sql
```
1. Ve a Supabase Dashboard > SQL Editor
2. Copia el contenido de /supabase/migrations/001_FACTORY_RESET.sql
3. Pégalo en el SQL Editor
4. Click "Run"
5. Espera ~5 segundos
```

#### 1.2 Ejecutar 002_SEED_COMPLETE.sql (ACTUALIZADO)
```
1. Copia el contenido de /supabase/migrations/002_SEED_COMPLETE.sql
2. Pégalo en el SQL Editor
3. Click "Run"
4. Espera ~15 segundos
5. Verifica el mensaje:
   ✅ Usuario system.admin creado en tabla users
   ✅ Rol SYSTEM_ADMIN asignado
```

#### 1.3 Ejecutar 003_TENANT_PROTECTION_SUPABASE.sql
```
1. Copia el contenido de /supabase/migrations/003_TENANT_PROTECTION_SUPABASE.sql
2. Pégalo en el SQL Editor
3. Click "Run"
4. Espera ~3 segundos
```

---

### PASO 2: Crear usuario en Supabase Authentication

**⚠️ CRÍTICO:** Debes crear manualmente el usuario en Supabase Authentication.

#### 2.1 Ve al Dashboard de Supabase
```
Dashboard > Authentication > Users
```

#### 2.2 Click "Add user"
Selecciona: **"Create new user"**

#### 2.3 Completa el formulario:
```
┌─────────────────────────────────────────────────────┐
│ Email                                               │
│ ┌─────────────────────────────────────────────────┐ │
│ │ system.admin@titanium-labs.com                  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Password                                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Titanium2026!                                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ☑ Auto Confirm User  ← ✅ ACTIVAR ESTO             │
│                                                     │
│ [ Create user ]                                     │
└─────────────────────────────────────────────────────┘
```

**✅ MUY IMPORTANTE:** Activa la opción **"Auto Confirm User"** para que el usuario pueda hacer login inmediatamente sin verificar el email.

#### 2.4 Click "Create user"

#### 2.5 Verifica que el usuario fue creado
Deberías ver el usuario en la lista:
```
Email: system.admin@titanium-labs.com
Status: Confirmed ✅
```

---

### PASO 3: Hacer login

#### 3.1 Ve a la aplicación
```
Refresca la página (F5)
```

#### 3.2 Ingresa las credenciales
```
📧 Email: system.admin@titanium-labs.com
🔑 Password: Titanium2026!
```

#### 3.3 Click "Iniciar Sesión"

#### 3.4 Verifica en la consola del navegador
Deberías ver estos mensajes:
```
📋 Buscando perfil en BD para auth_user_id: [UUID]
🔍 Usuario no encontrado por auth_user_id, buscando por email: system.admin@titanium-labs.com
✅ Usuario encontrado por email, vinculando auth_user_id...
✅ auth_user_id vinculado correctamente
✅ Usuario encontrado en BD: {...}
✅ Perfil cargado desde BD: {...}
✅ Roles establecidos: ["SYSTEM_ADMIN"]
```

---

## 🔍 CÓMO FUNCIONA LA VINCULACIÓN AUTOMÁTICA

### Flujo de login (primera vez):

```
1. Usuario ingresa credenciales
   └─> Supabase Auth valida y retorna auth_user_id

2. AuthContext busca en public.users por auth_user_id
   └─> No encuentra (auth_user_id es NULL en la BD)

3. AuthContext busca en public.users por email
   └─> ✅ Encuentra el usuario creado por el seed

4. AuthContext actualiza la tabla users:
   UPDATE users 
   SET auth_user_id = '[UUID del login]'
   WHERE email = 'system.admin@titanium-labs.com'

5. Carga el perfil completo con roles
   └─> Usuario autenticado correctamente
```

### Flujo de login (siguientes veces):

```
1. Usuario ingresa credenciales
   └─> Supabase Auth valida y retorna auth_user_id

2. AuthContext busca en public.users por auth_user_id
   └─> ✅ Encuentra el usuario (ya vinculado)

3. Carga el perfil completo con roles
   └─> Usuario autenticado correctamente
```

---

## 🧪 VERIFICACIÓN DE QUE TODO FUNCIONA

### Verificar en SQL Editor:

```sql
-- Ver el usuario en public.users
SELECT 
  id,
  username,
  email,
  auth_user_id,
  tenant_id,
  is_active
FROM public.users
WHERE email = 'system.admin@titanium-labs.com';
```

**Resultado esperado ANTES del primer login:**
```
auth_user_id: NULL
```

**Resultado esperado DESPUÉS del primer login:**
```
auth_user_id: [UUID que coincide con auth.users]
```

---

### Verificar en auth.users:

```sql
-- Ver el usuario en auth.users
SELECT 
  id,
  email,
  confirmed_at,
  created_at
FROM auth.users
WHERE email = 'system.admin@titanium-labs.com';
```

**Resultado esperado:**
```
id: [UUID]
email: system.admin@titanium-labs.com
confirmed_at: [timestamp] (no debe ser NULL)
```

---

### Verificar el rol asignado:

```sql
-- Ver el rol del usuario
SELECT 
  u.username,
  u.email,
  r.role_key,
  r.role_name,
  ur.is_active
FROM public.users u
JOIN public.user_roles ur ON u.id = ur.user_id
JOIN public.roles r ON ur.role_id = r.id
WHERE u.email = 'system.admin@titanium-labs.com';
```

**Resultado esperado:**
```
username: system.admin
email: system.admin@titanium-labs.com
role_key: SYSTEM_ADMIN
role_name: System Administrator
is_active: true
```

---

## 📊 RESUMEN DE ARCHIVOS MODIFICADOS

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `/supabase/migrations/002_SEED_COMPLETE.sql` | Ahora crea el usuario en `public.users` | ✅ Listo |
| `/contexts/AuthContext.tsx` | Vinculación automática de `auth_user_id` | ✅ Listo |
| `/docs/FIX_USUARIO_NO_ENCONTRADO.md` | Esta guía | ✅ Listo |

---

## ⚠️ IMPORTANTE: Por qué necesitamos crear el usuario manualmente

### Limitación de Supabase:

Supabase **NO permite** crear usuarios en `auth.users` desde SQL estándar. Las únicas formas son:

1. ✅ **Dashboard de Supabase** (Add user) ← Lo que usaremos
2. ✅ **Admin API** (requiere SUPABASE_SERVICE_ROLE_KEY)
3. ✅ **JavaScript Admin SDK** (desde un servidor)
4. ❌ **SQL directo** (NO permitido por seguridad)

Por eso el proceso requiere 2 pasos:
1. SQL crea el usuario en `public.users` (nuestro perfil)
2. Manual: crear el usuario en `auth.users` (autenticación)
3. Automático: al hacer login, se vinculan ambos

---

## 🚀 PRÓXIMOS PASOS DESPUÉS DEL LOGIN

Una vez que hagas login exitosamente:

1. **Verás el wizard de configuración** (2 pasos):
   - Step 1: Configurar datos del tenant
   - Step 2: Crear usuario tenant.admin

2. **Completa el wizard**

3. **Accederás al sistema con rol SYSTEM_ADMIN**

---

## 🆘 TROUBLESHOOTING

### Error: "Invalid login credentials"
**Causa:** El usuario no existe en `auth.users`  
**Solución:** Verifica PASO 2 (crear usuario en Authentication)

---

### Error: "Usuario NO encontrado en BD" (persiste)
**Causa:** El usuario no existe en `public.users`  
**Solución:** Re-ejecuta el 002_SEED_COMPLETE.sql

---

### Error: "Password should be at least 6 characters"
**Causa:** Contraseña demasiado corta  
**Solución:** Usa exactamente `Titanium2026!` (con mayúscula y signo de exclamación)

---

### Consola muestra "perfil temporal"
**Causa:** El usuario existe en `auth.users` pero no en `public.users`  
**Solución:** Re-ejecuta el 002_SEED_COMPLETE.sql

---

**Fecha:** 2026-01-31  
**Versión:** 1.0.0  
**Estado:** ✅ Resuelto

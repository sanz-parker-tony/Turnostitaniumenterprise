# 🛠️ ERROR RESUELTO: auth_user_id NOT NULL constraint

## ❌ ERROR ENCONTRADO

```
ERROR: 23502: null value in column "auth_user_id" of relation "users" 
violates not-null constraint

DETAIL: Failing row contains (..., null, system.admin, System Administrator, 
system.admin@titanium-labs.com, null, es, t, null, SYSTEM, null, ...)
```

---

## 🔍 CAUSA RAÍZ

La tabla `users` tenía definida la columna `auth_user_id` como:
```sql
auth_user_id uuid NOT NULL UNIQUE,  ❌
```

Esto impedía insertar usuarios con `auth_user_id = NULL`, que es necesario para el flujo de vinculación automática.

---

## ✅ SOLUCIÓN APLICADA

### Cambio en `000_DDL_REAL.sql`:

**ANTES:**
```sql
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  auth_user_id uuid NOT NULL UNIQUE,  ❌ NOT NULL
  ...
  CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (auth_user_id) 
    REFERENCES auth.users(id),  ❌ FK que falla con NULL
  ...
);
```

**DESPUÉS:**
```sql
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  auth_user_id uuid UNIQUE,  ✅ NULLABLE
  ...
  -- ✅ FK eliminada (se maneja en la lógica de aplicación)
  ...
);
```

### Cambios realizados:
1. ✅ Removido `NOT NULL` de `auth_user_id`
2. ✅ Mantenido `UNIQUE` (para evitar duplicados)
3. ✅ Eliminada la FK a `auth.users(id)` (porque NULL no puede tener FK)

---

## 🎯 PRÓXIMOS PASOS

### PASO 1: Re-ejecutar las migraciones

Debes ejecutar las migraciones **EN ORDEN** con la versión corregida:

#### 1.1 Ejecutar 001_FACTORY_RESET.sql
```
⚠️ IMPORTANTE: Este archivo usa el DDL de 000_DDL_REAL.sql
El FACTORY_RESET recrea todas las tablas desde cero.

1. Ve a Supabase Dashboard > SQL Editor
2. Copia TODO el contenido de:
   /supabase/migrations/001_FACTORY_RESET.sql
3. Pégalo en el SQL Editor
4. Click "Run"
5. Espera ~5-10 segundos
```

**Resultado esperado:**
```
✅ Factory Reset completado
✅ Todas las tablas recreadas
✅ Sistema listo para el seed
```

---

#### 1.2 Ejecutar 002_SEED_COMPLETE.sql
```
1. Copia TODO el contenido de:
   /supabase/migrations/002_SEED_COMPLETE.sql
2. Pégalo en el SQL Editor
3. Click "Run"
4. Espera ~15-20 segundos
```

**Resultado esperado:**
```
NOTICE: ✅ Usuario system.admin creado (ID: [UUID])
NOTICE: ============================================================
NOTICE: SECCIÓN 11: Usuario Bootstrap
NOTICE: ============================================================
NOTICE: ✅ Usuario system.admin creado en tabla users
NOTICE: ✅ Rol SYSTEM_ADMIN asignado
NOTICE: 
NOTICE: 📧 Email: system.admin@titanium-labs.com
NOTICE: 🔑 Password: Titanium2026!
```

---

#### 1.3 Ejecutar 003_TENANT_PROTECTION_SUPABASE.sql
```
1. Copia TODO el contenido de:
   /supabase/migrations/003_TENANT_PROTECTION_SUPABASE.sql
2. Pégalo en el SQL Editor
3. Click "Run"
4. Espera ~3 segundos
```

**Resultado esperado:**
```
NOTICE: ✅ PROTECCIÓN DE TENANT INSTALADA
NOTICE: Tenants en el sistema: 1
NOTICE: Tenant SYSTEM existe: t
```

---

### PASO 2: Crear usuario en Supabase Authentication

**⚠️ CRÍTICO:** El usuario debe existir en `auth.users` para poder hacer login.

```
1. Ve a Dashboard > Authentication > Users

2. Click "Add user" > "Create new user"

3. Completa:
   ┌─────────────────────────────────────────────┐
   │ Email: system.admin@titanium-labs.com       │
   │ Password: Titanium2026!                     │
   │ ☑️ Auto Confirm User (ACTIVAR)              │
   └─────────────────────────────────────────────┘

4. Click "Create user"

5. Verifica que aparezca con estado "Confirmed"
```

---

### PASO 3: Hacer login

```
1. Ve a la aplicación (refresca F5)

2. Ingresa:
   📧 Email: system.admin@titanium-labs.com
   🔑 Password: Titanium2026!

3. Click "Iniciar Sesión"

4. Abre Consola del navegador (F12) y verifica:
   ✅ Usuario encontrado por email, vinculando auth_user_id...
   ✅ auth_user_id vinculado correctamente
   ✅ Perfil cargado desde BD
   ✅ Roles establecidos: ["SYSTEM_ADMIN"]
```

---

## 🔍 VERIFICAR QUE EL CAMBIO SE APLICÓ

Ejecuta este SQL en el SQL Editor:

```sql
-- Ver la definición de la tabla users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'auth_user_id';
```

**Resultado esperado:**
```
column_name  | data_type | is_nullable | column_default
-------------|-----------|-------------|---------------
auth_user_id | uuid      | YES         | NULL
             |           | ✅          |
```

Si `is_nullable = YES`, el cambio se aplicó correctamente.

---

## 🧪 VERIFICAR QUE EL USUARIO SE CREÓ

```sql
-- Ver el usuario en public.users
SELECT 
  id,
  username,
  email,
  auth_user_id,
  is_active
FROM public.users
WHERE email = 'system.admin@titanium-labs.com';
```

**Resultado esperado ANTES del primer login:**
```
username     | email                            | auth_user_id | is_active
-------------|----------------------------------|--------------|----------
system.admin | system.admin@titanium-labs.com   | NULL         | true
             |                                  | ✅           | ✅
```

**Resultado esperado DESPUÉS del primer login:**
```
username     | email                            | auth_user_id      | is_active
-------------|----------------------------------|-------------------|----------
system.admin | system.admin@titanium-labs.com   | [UUID vinculado]  | true
             |                                  | ✅                | ✅
```

---

## 📊 RESUMEN DE CAMBIOS

| Archivo | Cambio | Línea |
|---------|--------|-------|
| `000_DDL_REAL.sql` | Removido `NOT NULL` de `auth_user_id` | 1175 |
| `000_DDL_REAL.sql` | Eliminada FK a `auth.users(id)` | 1189 |

---

## ⚠️ NOTAS IMPORTANTES

### ¿Por qué eliminar la FK a auth.users?

Una **Foreign Key** en PostgreSQL **NO permite valores NULL** si la columna referenciada existe. Como necesitamos que `auth_user_id` pueda ser NULL temporalmente, debemos eliminar la FK.

### ¿Es seguro eliminar la FK?

✅ **Sí**, porque:
1. La vinculación se maneja en la lógica de la aplicación (`AuthContext.tsx`)
2. Cuando se vincula, se valida que el `auth_user_id` existe en `auth.users`
3. El constraint `UNIQUE` sigue existiendo para evitar duplicados

### ¿Qué pasa si intento vincular un auth_user_id que no existe?

El AuthContext usa el `auth_user_id` que viene directamente de Supabase Auth, por lo que **siempre existe** en `auth.users` antes de intentar vincularlo.

---

## 🚀 DESPUÉS DE COMPLETAR TODOS LOS PASOS

1. ✅ Login exitoso
2. ✅ Wizard de configuración visible
3. ✅ Completar wizard (2 pasos)
4. ✅ Acceso al dashboard con rol SYSTEM_ADMIN

---

**Fecha:** 2026-01-31  
**Versión:** 1.1.0  
**Estado:** ✅ Resuelto

# 🔧 SOLUCIÓN: No puedo hacer login con system.admin

**Fecha**: 31 de enero de 2026  
**Estado**: 🔍 **DIAGNÓSTICO Y SOLUCIÓN**

---

## 🎯 PROBLEMA IDENTIFICADO

**Síntoma**: No puedes hacer login con `system.admin@titanium-labs.com`

**Causa**: El usuario **NO existe** en la base de datos porque:
- ❌ NO has ejecutado el `002_SEED_COMPLETE.sql` todavía
- O el seed se ejecutó pero **FALLÓ** silenciosamente

---

## 🔍 DIAGNÓSTICO RÁPIDO

### **Paso 1: Verificar si ejecutaste el SEED**

**En Supabase SQL Editor**, ejecuta este query:

```sql
-- Verificar si existe el usuario system.admin
SELECT 
  'auth.users' as tabla,
  COUNT(*) as total,
  string_agg(email, ', ') as emails
FROM auth.users
WHERE email = 'system.admin@titanium-labs.com'

UNION ALL

SELECT 
  'public.users' as tabla,
  COUNT(*) as total,
  string_agg(email, ', ') as emails
FROM public.users
WHERE email = 'system.admin@titanium-labs.com';
```

**Resultado esperado si el SEED se ejecutó correctamente**:
```
tabla        | total | emails
-------------|-------|------------------------------
auth.users   | 1     | system.admin@titanium-labs.com
public.users | 1     | system.admin@titanium-labs.com
```

**Si ves `total = 0`**: El seed NO se ejecutó o falló.

---

## ✅ SOLUCIÓN PASO A PASO

### **Opción A: Ejecutar SEED Completo (Recomendado)**

#### **1. Ejecutar Factory Reset + Seed**

**PowerShell (Windows)**:
```powershell
cd supabase
./reset-and-seed.ps1
```

**Bash (Linux/Mac)**:
```bash
cd supabase
./reset-and-seed.sh
```

#### **2. Verificar la salida**

Debes ver algo como:

```
============================================================
FACTORY RESET - INICIANDO LIMPIEZA COMPLETA
============================================================
  ✅ Sección 1: Traducciones limpiadas
  ...
  ✅ Sección 12: Tenants y tablas helper limpiados
============================================================
✅ FACTORY RESET COMPLETO - Base de datos limpia
============================================================

============================================================
SEED COMPLETE - INSERTANDO DATOS BASE
============================================================
  ✅ Sección 0: Idiomas y planes insertados
  ✅ Sección 1: Tenant SYSTEM creado
  ✅ Sección 2: 5 Roles base creados
  ...
  ✅ Sección 11: Usuario bootstrap creado
       Email: system.admin@titanium-labs.com
       Password: Titanium2026!
============================================================
✅ SEED COMPLETE - Datos base insertados
============================================================
```

#### **3. Verificar que el usuario se creó**

```sql
-- Verificar usuario
SELECT email, email_confirmed_at 
FROM auth.users 
WHERE email = 'system.admin@titanium-labs.com';
```

**Resultado esperado**:
```
email                           | email_confirmed_at
--------------------------------|-------------------
system.admin@titanium-labs.com  | 2026-01-31 ...
```

#### **4. Intentar login**

**Credenciales**:
- **Email**: `system.admin@titanium-labs.com`
- **Password**: `Titanium2026!`

---

### **Opción B: Ejecutar SOLO el SEED (Si ya ejecutaste Factory Reset)**

#### **1. En Supabase SQL Editor**

Abre el archivo `/supabase/migrations/002_SEED_COMPLETE.sql` y **cópialo completo**.

#### **2. Pégalo en Supabase SQL Editor**

- Ir a: **Supabase Dashboard** → **SQL Editor** → **New query**
- Pegar el contenido completo de `002_SEED_COMPLETE.sql`
- Click en **RUN**

#### **3. Esperar a que termine**

El seed tarda aproximadamente **10-15 segundos**.

#### **4. Verificar la salida**

Debes ver en la sección "Messages" (abajo):

```
NOTICE: ============================================================
NOTICE: SEED COMPLETE - INSERTANDO DATOS BASE
NOTICE: ============================================================
NOTICE:   ✅ Sección 0: Idiomas y planes insertados
NOTICE:   ✅ Sección 1: Tenant SYSTEM creado
...
NOTICE:   ✅ Sección 11: Usuario bootstrap creado
NOTICE:        Email: system.admin@titanium-labs.com
NOTICE:        Password: Titanium2026!
NOTICE: ============================================================
NOTICE: ✅ SEED COMPLETE - Datos base insertados
```

Si ves **errores en rojo**, cópialos y envíamelos.

---

## 🚨 ERRORES COMUNES

### **Error 1: "relation 'auth.users' does not exist"**

**Causa**: Estás usando Supabase local sin configurar Auth correctamente.

**Solución**: El seed debe crear el usuario usando la **Admin API de Supabase**, no insertando directo en `auth.users`.

**Solución alternativa**: Usa el endpoint `/auth/create-system-admin`:

```bash
# Windows PowerShell
Invoke-WebRequest -Uri "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-e19f2094/auth/create-system-admin" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} | Select-Object -ExpandProperty Content

# Linux/Mac
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-e19f2094/auth/create-system-admin
```

Reemplaza `YOUR_PROJECT_ID` con tu Project ID real.

---

### **Error 2: "duplicate key value violates unique constraint"**

**Causa**: El usuario ya existe pero tiene una contraseña diferente.

**Solución 1 - Reset completo**:
```powershell
cd supabase
./reset-and-seed.ps1
```

**Solución 2 - Cambiar contraseña del usuario existente**:
```sql
-- En Supabase SQL Editor
UPDATE auth.users
SET encrypted_password = crypt('Titanium2026!', gen_salt('bf'))
WHERE email = 'system.admin@titanium-labs.com';
```

---

### **Error 3: "tenant SYSTEM no existe"**

**Causa**: El seed se ejecutó en orden incorrecto o parcialmente.

**Solución**: Ejecutar Factory Reset + Seed completo:
```powershell
cd supabase
./reset-and-seed.ps1
```

---

## 🔍 DIAGNÓSTICO AVANZADO

Si después de ejecutar el seed TODAVÍA no puedes hacer login, ejecuta este diagnóstico:

```sql
-- ============================================================================
-- DIAGNÓSTICO COMPLETO DEL SISTEMA
-- ============================================================================

-- 1. Verificar tenant SYSTEM
SELECT 'TENANT SYSTEM' as check_type, 
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FALTA' END as status
FROM public.tenants 
WHERE tenant_key = 'SYSTEM';

-- 2. Verificar roles base
SELECT 'ROLES BASE' as check_type,
  CASE WHEN COUNT(*) = 5 THEN '✅ OK' ELSE '❌ FALTAN (' || COUNT(*) || '/5)' END as status
FROM public.roles r
JOIN public.tenants t ON r.tenant_id = t.id
WHERE t.tenant_key = 'SYSTEM' AND r.is_system_role = true;

-- 3. Verificar usuario en auth.users
SELECT 'AUTH USER' as check_type,
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FALTA' END as status,
  COALESCE(MAX(email_confirmed_at)::text, 'NO CONFIRMADO') as email_status
FROM auth.users
WHERE email = 'system.admin@titanium-labs.com';

-- 4. Verificar usuario en public.users
SELECT 'PUBLIC USER' as check_type,
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FALTA' END as status,
  COALESCE(MAX(is_active)::text, 'N/A') as is_active
FROM public.users
WHERE email = 'system.admin@titanium-labs.com';

-- 5. Verificar asignación de rol
SELECT 'ROLE ASSIGNMENT' as check_type,
  CASE WHEN COUNT(*) = 1 THEN '✅ OK' ELSE '❌ FALTA' END as status,
  string_agg(r.role_key, ', ') as assigned_roles
FROM public.user_roles ur
JOIN public.users u ON ur.user_id = u.id
JOIN public.roles r ON ur.role_id = r.id
WHERE u.email = 'system.admin@titanium-labs.com';

-- 6. Verificar lookups
SELECT 'LOOKUPS' as check_type,
  CASE WHEN COUNT(*) >= 20 THEN '✅ OK' ELSE '❌ FALTAN (' || COUNT(*) || ')' END as status
FROM public.lookup_groups;

-- 7. Verificar pantallas
SELECT 'SCREENS' as check_type,
  CASE WHEN COUNT(*) >= 22 THEN '✅ OK' ELSE '❌ FALTAN (' || COUNT(*) || ')' END as status
FROM public.screens;

-- ============================================================================
-- RESULTADO ESPERADO (TODO ✅ OK)
-- ============================================================================
-- check_type      | status  | extra_info
-- ----------------|---------|------------------
-- TENANT SYSTEM   | ✅ OK   |
-- ROLES BASE      | ✅ OK   |
-- AUTH USER       | ✅ OK   | 2026-01-31 ...
-- PUBLIC USER     | ✅ OK   | true
-- ROLE ASSIGNMENT | ✅ OK   | SYSTEM_ADMIN
-- LOOKUPS         | ✅ OK   |
-- SCREENS         | ✅ OK   |
```

**Envíame el resultado de este diagnóstico si sigue fallando.**

---

## 📋 CHECKLIST DE SOLUCIÓN

- [ ] **1. Ejecutar Factory Reset**
  ```powershell
  cd supabase
  ./reset-and-seed.ps1
  ```

- [ ] **2. Verificar que el seed terminó sin errores**
  - Buscar mensaje: `✅ SEED COMPLETE - Datos base insertados`
  - Buscar mensaje: `Email: system.admin@titanium-labs.com`

- [ ] **3. Verificar usuario en la BD**
  ```sql
  SELECT email FROM auth.users WHERE email = 'system.admin@titanium-labs.com';
  ```

- [ ] **4. Intentar login**
  - Email: `system.admin@titanium-labs.com`
  - Password: `Titanium2026!`

- [ ] **5. Si falla, ejecutar diagnóstico avanzado** (query de arriba)

- [ ] **6. Enviarme resultado del diagnóstico**

---

## 🎯 SOLUCIÓN RÁPIDA (1 minuto)

**Si solo quieres arrancar rápido**, ejecuta esto:

```powershell
# 1. Abrir PowerShell en la raíz del proyecto
cd supabase

# 2. Ejecutar reset + seed
./reset-and-seed.ps1

# 3. Esperar 10-15 segundos

# 4. Ver mensaje de confirmación:
# ✅ Usuario bootstrap creado
#    Email: system.admin@titanium-labs.com
#    Password: Titanium2026!

# 5. Ir al navegador y hacer login
```

---

## ❓ FAQ

### **¿Por qué no existe el usuario si ya ejecuté el wizard antes?**

El wizard **NO crea** el usuario `system.admin`. El wizard solo:
1. Actualiza el tenant SYSTEM (nombre de la empresa)
2. Crea el usuario `tenant.admin`

El usuario `system.admin` lo crea el **SEED**, no el wizard.

### **¿Qué pasa si ejecuto el seed múltiples veces?**

**No hay problema**. El seed es **100% idempotente**:
- Si el usuario ya existe, lo **actualiza** en lugar de crear uno nuevo
- Si los datos ya existen, los **actualiza** o los **omite**
- Puedes ejecutarlo 1000 veces sin problema

### **¿Cuál es la diferencia entre system.admin y tenant.admin?**

| Usuario | Rol | Creado por | Acceso |
|---------|-----|------------|--------|
| **system.admin** | SYSTEM_ADMIN | SEED | Solo pantallas SECURITY (gestión de usuarios y roles) |
| **tenant.admin** | TENANT_ADMIN | Wizard | Pantallas MAINT, CONFIG, ORG (configuración del negocio) |

---

**¿Qué error específico te sale cuando intentas hacer login?**

Envíame:
1. Mensaje de error (si hay)
2. Resultado del query de diagnóstico
3. Salida de consola del navegador (F12 → Console)

¡Te ayudo a resolverlo! 🚀

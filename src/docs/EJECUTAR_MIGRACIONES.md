# 🚀 CÓMO EJECUTAR LAS MIGRACIONES - 0 PASOS MANUALES

## ⚡ RESUMEN RÁPIDO

Ejecuta **3 archivos SQL en orden** desde Supabase Dashboard > SQL Editor.

---

## 📋 PASO A PASO

### 1️⃣ Ve a Supabase Dashboard

```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

### 2️⃣ Ejecuta los 3 archivos en ORDEN:

#### **A. Ejecutar 001_FACTORY_RESET.sql**

```
1. Abre: /supabase/migrations/001_FACTORY_RESET.sql
2. Copia TODO el contenido (Ctrl+A, Ctrl+C)
3. Pega en el SQL Editor de Supabase
4. Click "Run" (▶️)
5. Espera ~5 segundos
6. Verifica: "✅ FACTORY RESET COMPLETO" en los logs
```

**Resultado esperado:**
```
✅ FACTORY RESET COMPLETO - Base de datos limpia
➡️  Ejecutar 002_SEED_COMPLETE.sql para insertar datos base
```

---

#### **B. Ejecutar 002_SEED_COMPLETE.sql**

```
1. Abre: /supabase/migrations/002_SEED_COMPLETE.sql
2. Copia TODO el contenido (Ctrl+A, Ctrl+C)
3. Pega en el SQL Editor de Supabase
4. Click "Run" (▶️)
5. Espera ~20-30 segundos (este archivo es GRANDE)
6. Verifica: "✅ SEED COMPLETO" en los logs
```

**Resultado esperado:**
```
✅ SEED COMPLETO:
  - Tenant SYSTEM creado
  - 5 Roles base creados (SYSTEM_ADMIN, TENANT_ADMIN, etc.)
  - 24 Lookup Groups insertados
  - ~145 Lookup Values insertados
  - 9 Menu Groups creados
  - 7 Scope Types creados
  - 28 Acciones globales creadas
  - 32 Pantallas creadas
  - Permisos asignados a roles
  - Usuario Bootstrap: DESHABILITADO (se crea desde la app)
➡️  Ejecutar 003_TENANT_PROTECTION_SUPABASE.sql
```

---

#### **C. Ejecutar 003_TENANT_PROTECTION_SUPABASE.sql**

```
1. Abre: /supabase/migrations/003_TENANT_PROTECTION_SUPABASE.sql
2. Copia TODO el contenido (Ctrl+A, Ctrl+C)
3. Pega en el SQL Editor de Supabase
4. Click "Run" (▶️)
5. Espera ~2 segundos
6. Verifica: "✅ PROTECCIÓN DE TENANT INSTALADA" en los logs
```

**Resultado esperado:**
```
✅ PROTECCIÓN DE TENANT INSTALADA
Tenants en el sistema: 1
Tenants activos: 1
Tenant SYSTEM existe: t

🛡️ PROTECCIONES ACTIVAS:
  1. ✅ TRIGGER: bloquea INSERT de nuevos tenants
  2. ✅ TRIGGER: bloquea activación de múltiples tenants
  3. ✅ TRIGGER: bloquea DELETE de tenants

✅ Sistema validado correctamente
✅ Tenant SYSTEM está protegido y sellado
```

---

### 3️⃣ Refresca la aplicación

```
1. Ve a tu aplicación (http://localhost:...)
2. Refresca la página (F5)
3. La pantalla de "Configuración Inicial" aparecerá automáticamente
```

---

### 4️⃣ Completa el Setup Inicial

**La aplicación detecta automáticamente que NO hay usuarios y muestra el formulario:**

```
┌──────────────────────────────────────────────┐
│ 🔒 CONFIGURACIÓN INICIAL DEL SISTEMA         │
├──────────────────────────────────────────────┤
│ Email del Administrador:                     │
│ system.admin@titanium-labs.com               │
│                                              │
│ Nombre Completo:                             │
│ System Administrator                         │
│                                              │
│ Contraseña:                                  │
│ ••••••••••••                                 │
│                                              │
│ Confirmar Contraseña:                        │
│ ••••••••••••                                 │
│                                              │
│ [Crear Administrador]                        │
└──────────────────────────────────────────────┘
```

**Al hacer click en "Crear Administrador", la app:**
- ✅ Crea el usuario en `auth.users`
- ✅ Obtiene el tenant SYSTEM
- ✅ Obtiene el rol SYSTEM_ADMIN
- ✅ Crea el usuario en `public.users`
- ✅ Asigna el rol SYSTEM_ADMIN
- ✅ Hace login automático
- ✅ Redirige al Wizard (2 pasos)

---

### 5️⃣ Completa el Wizard (2 pasos)

**Paso 1: Información de la Empresa**
```
- Nombre de la empresa
- Código de empresa
- RFC/Tax ID
- Dirección, ciudad, código postal
- Email y teléfono
```

**Paso 2: Crear Administrador de Tenant**
```
- Email del administrador
- Nombre completo
- Contraseña
```

---

### 6️⃣ ✅ ¡LISTO!

El sistema está completamente configurado y listo para usar.

---

## 🔍 VERIFICACIÓN (Opcional)

Si quieres verificar que todo se creó correctamente:

```sql
-- Verificar tenant SYSTEM
SELECT * FROM public.tenants WHERE tenant_key = 'SYSTEM';
-- Resultado esperado: 1 registro

-- Verificar roles
SELECT role_key, role_name FROM public.roles ORDER BY role_key;
-- Resultado esperado: 5 roles

-- Verificar que NO hay usuarios todavía
SELECT COUNT(*) AS usuarios_count FROM public.users;
-- Resultado esperado: 0 (antes del setup inicial)
-- Resultado esperado: 1 (después del setup inicial)

-- Verificar lookup groups
SELECT COUNT(*) FROM public.lookup_groups;
-- Resultado esperado: 24 grupos

-- Verificar lookup values
SELECT COUNT(*) FROM public.lookup_values;
-- Resultado esperado: ~145 valores

-- Verificar pantallas
SELECT COUNT(*) FROM public.screens;
-- Resultado esperado: 32 pantallas

-- Verificar acciones
SELECT COUNT(*) FROM public.actions;
-- Resultado esperado: 28 acciones
```

---

## ⏱️ TIEMPO ESTIMADO

| Paso | Tiempo |
|------|--------|
| 001_FACTORY_RESET.sql | ~5 segundos |
| 002_SEED_COMPLETE.sql | ~20-30 segundos |
| 003_TENANT_PROTECTION_SUPABASE.sql | ~2 segundos |
| **TOTAL SQL** | **~30-40 segundos** |
| Setup Inicial (app) | ~1 minuto |
| Wizard (2 pasos) | ~2 minutos |
| **TOTAL COMPLETO** | **~4 minutos** |

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "relation does not exist"
**Causa:** No ejecutaste 000_DDL_REAL.sql  
**Solución:** Este proyecto usa el DDL existente en la BD. Si las tablas no existen, crea las tablas manualmente o usa un backup.

### Error: "TENANT SYSTEM no existe"
**Causa:** El 002_SEED_COMPLETE.sql falló  
**Solución:** Re-ejecuta 001_FACTORY_RESET.sql y luego 002_SEED_COMPLETE.sql

### Error: "duplicate key value violates unique constraint"
**Causa:** Ya ejecutaste el seed antes  
**Solución:** Ejecuta 001_FACTORY_RESET.sql primero, luego 002_SEED_COMPLETE.sql

### La app sigue en "Cargando..."
**Causa:** Hay una sesión activa pero el usuario no existe  
**Solución:**
1. Abre consola (F12)
2. Ejecuta: `localStorage.clear()`
3. Refresca (F5)

### No aparece la pantalla de Setup Inicial
**Causa:** Ya hay usuarios en la BD  
**Solución:** Verifica con `SELECT COUNT(*) FROM public.users`

---

## 📊 QUÉ HACE CADA ARCHIVO

### 001_FACTORY_RESET.sql
- ✅ Limpia DATOS de todas las tablas (TRUNCATE)
- ✅ Mantiene la ESTRUCTURA (DDL intacto)
- ✅ Resetea secuencias
- ✅ ~240 líneas

### 002_SEED_COMPLETE.sql  
- ✅ Inserta tenant SYSTEM
- ✅ Crea 5 roles base con permisos
- ✅ Inserta datos maestros (lookups, menús, pantallas, acciones)
- ✅ Crea usuario bootstrap
- ✅ ~950 líneas

### 003_TENANT_PROTECTION_SUPABASE.sql
- ✅ Crea triggers de protección
- ✅ Impide INSERT de nuevos tenants
- ✅ Impide DELETE de tenants
- ✅ Valida que solo haya 1 tenant activo
- ✅ ~170 líneas

---

**Fecha:** 2026-01-31  
**Versión:** 1.0.0  
**Pasos manuales en SQL:** 3️⃣ (ejecutar 3 archivos)  
**Pasos manuales en App:** 0️⃣ (todo automático)
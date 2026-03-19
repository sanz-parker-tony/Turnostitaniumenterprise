# 🚀 TURNOS TITANIUM ENTERPRISE - SETUP COMPLETO (0 PASOS MANUALES)

## ✅ FLUJO ACTUALIZADO

**Solo necesitas ejecutar 3 archivos SQL en orden. TODO lo demás se hace desde la aplicación.**

📖 **[Ver guía paso a paso →](/docs/EJECUTAR_MIGRACIONES.md)**

---

## 📋 RESUMEN RÁPIDO

### 1. Ejecuta 3 archivos SQL (en orden):

```
a) 001_FACTORY_RESET.sql (~5 seg)
b) 002_SEED_COMPLETE.sql (~30 seg)
c) 003_TENANT_PROTECTION_SUPABASE.sql (~2 seg)
```

### 2. Refresca la app (F5)

La pantalla de "Configuración Inicial" aparecerá automáticamente.

### 3. Crea el usuario system.admin

Completa el formulario que aparece en la app.

### 4. Completa el Wizard (2 pasos)

```
- Paso 1: Información de la empresa
- Paso 2: Crear tenant.admin
```

### 5. ✅ ¡Listo!

---

## 📖 GUÍA DETALLADA

Para instrucciones paso a paso con capturas y troubleshooting, consulta:

**[EJECUTAR_MIGRACIONES.md](/docs/EJECUTAR_MIGRACIONES.md)**

---

## 🗂️ ¿QUÉ CREA LA MIGRACIÓN SQL?

El archivo `002_SEED_COMPLETE.sql` consolida 3 migraciones en una:

### PARTE 1: DDL (Estructura de tablas)
- ✅ 30+ tablas del sistema
- ✅ Vistas y vistas materializadas
- ✅ Constraints y foreign keys

### PARTE 2: SEED DATA (Datos maestros)
- ✅ Idiomas (español, inglés)
- ✅ Países (21 países latinoamericanos + España + USA)
- ✅ Pantallas del sistema (14 pantallas)
- ✅ Acciones (8 tipos: Ver, Crear, Editar, Eliminar, etc.)
- ✅ Tipos de scope (Global, Empresa, Departamento, Empleado)
- ✅ **Tenant SYSTEM** (único tenant permitido)
- ✅ **5 roles base:**
  - SYSTEM_ADMIN (control total)
  - TENANT_ADMIN (administrador de empresa)
  - RRHH_ADMIN (recursos humanos)
  - SUPERVISOR (supervisión de turnos)
  - EMPLOYEE (empleado básico)
- ✅ **Permisos granulares** (14 pantallas × 8 acciones = 112 permisos)
- ✅ **Asignación de permisos a roles** (cada rol con sus permisos específicos)

### PARTE 3: TENANT PROTECTION (Protecciones)
- ✅ Trigger para evitar DELETE en tenants
- ✅ Trigger para evitar INSERT adicionales (solo 1 tenant permitido)
- ✅ Validación de que el tenant SYSTEM existe

---

## 🔍 VERIFICACIÓN (Opcional)

Si quieres verificar que todo se creó correctamente, ejecuta este SQL:

```sql
-- Contar tablas creadas
SELECT COUNT(*) AS tabla_count
FROM information_schema.tables
WHERE table_schema = 'public';
-- Resultado esperado: ~30 tablas

-- Verificar tenant SYSTEM
SELECT * FROM public.tenants WHERE tenant_key = 'SYSTEM';
-- Resultado esperado: 1 registro

-- Verificar roles
SELECT role_key, role_name, role_scope
FROM public.roles
ORDER BY role_key;
-- Resultado esperado: 5 roles (SYSTEM_ADMIN, TENANT_ADMIN, RRHH_ADMIN, SUPERVISOR, EMPLOYEE)

-- Contar permisos
SELECT COUNT(*) AS permisos_count
FROM public.permissions;
-- Resultado esperado: ~112 permisos

-- Verificar que NO hay usuarios todavía
SELECT COUNT(*) AS usuarios_count
FROM public.users;
-- Resultado esperado: 0 usuarios (se crearán desde la app)
```

---

## 🎯 RESUMEN DEL FLUJO COMPLETO

```
1. Ejecutar 001_FACTORY_RESET.sql (Supabase Dashboard)
   └─> Resetea la base de datos

2. Ejecutar 002_SEED_COMPLETE.sql (Supabase Dashboard)
   └─> Crea estructura + datos maestros + protecciones

3. Ejecutar 003_TENANT_PROTECTION_SUPABASE.sql (Supabase Dashboard)
   └─> Añade protecciones adicionales

4. Refresar aplicación (F5)
   └─> Detecta que NO hay usuarios
   └─> Muestra pantalla de Setup Inicial

5. Crear usuario system.admin (Formulario en la app)
   └─> Crea en auth.users
   └─> Crea en public.users
   └─> Asigna rol SYSTEM_ADMIN
   └─> Login automático

6. Completar Wizard (2 pasos)
   └─> Paso 1: Información de la empresa
   └─> Paso 2: Crear tenant.admin

7. ✅ Sistema configurado y listo para usar
   └─> system.admin puede administrar el sistema
   └─> tenant.admin puede administrar la empresa
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "relation public.users does not exist"
**Causa:** No ejecutaste la migración SQL  
**Solución:** Ejecuta `002_SEED_COMPLETE.sql` en Supabase Dashboard

### Error: "Tenant SYSTEM no encontrado"
**Causa:** La migración no se completó correctamente  
**Solución:** Re-ejecuta `002_SEED_COMPLETE.sql`

### Error: "Rol SYSTEM_ADMIN no encontrado"
**Causa:** La PARTE 2 del seed no se ejecutó  
**Solución:** Re-ejecuta `002_SEED_COMPLETE.sql`

### La app sigue en "Cargando..."
**Causa:** Hay una sesión activa pero el usuario no existe en la BD  
**Solución:**
1. Abre la consola del navegador (F12)
2. Ejecuta: `localStorage.clear()`
3. Refresca la página (F5)

### No aparece la pantalla de Setup Inicial
**Causa:** Ya hay usuarios en la BD  
**Solución:**
1. Verifica: `SELECT COUNT(*) FROM public.users;`
2. Si hay usuarios, usa Login normal
3. Si quieres empezar de cero, ejecuta `001_FACTORY_RESET.sql` otra vez

---

## 📊 ARCHIVOS INVOLUCRADOS

| Archivo | Propósito |
|---------|-----------|
| `/supabase/migrations/001_FACTORY_RESET.sql` | Resetea la base de datos |
| `/supabase/migrations/002_SEED_COMPLETE.sql` | Migración consolidada (ejecutar 1 vez) |
| `/supabase/migrations/003_TENANT_PROTECTION_SUPABASE.sql` | Añade protecciones adicionales |
| `/components/InitialSetup.tsx` | Pantalla de creación del primer usuario |
| `/components/TenantSetupWizard.tsx` | Wizard de 2 pasos para configurar empresa |
| `/contexts/AuthContext.tsx` | Contexto de autenticación (auto-bootstrap) |
| `/App.tsx` | Flujo principal de la aplicación |

---

## ✅ VENTAJAS DE ESTE ENFOQUE

| Ventaja | Descripción |
|---------|-------------|
| ✅ **Cero pasos manuales** | Solo ejecutar 1 archivo SQL, todo lo demás desde la app |
| ✅ **Consolidado** | 3 migraciones en 1 solo archivo |
| ✅ **Idempotente** | Puedes ejecutarlo múltiples veces sin problemas |
| ✅ **Auto-detección** | La app detecta si necesita setup inicial |
| ✅ **Seguro** | No se expone SERVICE_ROLE_KEY en archivos |
| ✅ **Simple** | Flujo lineal y fácil de seguir |

---

## 📅 PRÓXIMOS PASOS DESPUÉS DEL SETUP

Después de completar el setup:

1. ✅ Explorar el Dashboard con rol SYSTEM_ADMIN
2. ✅ Configurar Empresas (Companies)
3. ✅ Configurar Departamentos (Departments)
4. ✅ Importar o crear Empleados (Employees)
5. ✅ Configurar Grupos de Trabajo (Work Groups)
6. ✅ Planificar Turnos (Work Shifts)
7. ✅ Registrar Asistencias (Time Attendance)

---

**Fecha:** 2026-01-31  
**Versión:** 1.2.0  
**Estado:** ✅ Listo para producción  
**Pasos manuales:** 0️⃣
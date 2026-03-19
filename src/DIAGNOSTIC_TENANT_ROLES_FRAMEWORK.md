# 📋 DIAGNÓSTICO COMPLETO: TENANTS, ROLES Y FRAMEWORK DE PANTALLAS
**Turnos Titanium Enterprise - Análisis Técnico Definitivo**

**Fecha**: 31 de enero de 2026  
**Analista**: Nyra (Asistente IA de Figma Make)  
**Solicitante**: Usuario (Arquitecto del Sistema)

---

## 🚨 PROBLEMA 1 (CRÍTICO): 3 TENANTS EN LA BASE DE DATOS

### 🌳 ÁRBOL DE CAUSAS (Análisis de Root Cause)

```
┌─────────────────────────────────────────────────────────────┐
│ SÍNTOMA: 3 registros en tabla 'tenants'                    │
│ ESPERADO: 1 registro (tenant SYSTEM único)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ ✅ CAUSA MÁS PROBABLE (90% probabilidad)                    │
│                                                             │
│ Ejecuciones múltiples del wizard ANTES de la corrección    │
│ del código (bootstrap.tsx líneas 431-473)                  │
│                                                             │
│ FLUJO INCORRECTO (versión antigua):                        │
│  1. SEED crea tenant SYSTEM                                │
│  2. Wizard PASO 1 CREA tenant nuevo (ej: EMPRESA_01)       │
│  3. Wizard PASO 2 crea usuario para ese tenant nuevo       │
│  4. Se ejecuta wizard otra vez → OTRO tenant nuevo         │
│                                                             │
│ RESULTADO: 1 SYSTEM + 1-2 tenants de prueba = 3 totales    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ CAUSA SECUNDARIA (10% probabilidad)                      │
│                                                             │
│ SEED ejecutado múltiples veces SIN factory reset previo    │
│ (pero el seed usa ON CONFLICT DO NOTHING, debería ser      │
│ idempotente)                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 🔍 CÓMO CONFIRMARLO (Checklist de Verificación)

#### ✅ **Paso 1**: Inspeccionar los tenants existentes

**SQL Query**:
```sql
-- En Supabase SQL Editor:
SELECT 
  id,
  tenant_key,
  tenant_name,
  is_active,
  created_at
FROM public.tenants
ORDER BY created_at ASC;
```

**Análisis esperado**:
- **Tenant 1** (más antiguo): `tenant_key = 'SYSTEM'`, `tenant_name = 'Sistema Titanium'`
  - ✅ Este es el tenant CORRECTO del SEED
- **Tenant 2-3**: Claves como `EMPRESA_01`, `MI_EMPRESA`, etc.
  - ❌ Estos son tenants creados por el wizard en versiones antiguas

#### ✅ **Paso 2**: Revisar tenant_onboarding

**SQL Query**:
```sql
SELECT 
  to.id,
  t.tenant_key,
  t.tenant_name,
  to.onboarding_status,
  to.current_step,
  to.completion_percentage,
  to.started_at,
  to.completed_at
FROM public.tenant_onboarding to
JOIN public.tenants t ON to.tenant_id = t.id
ORDER BY to.started_at ASC;
```

**Análisis esperado**:
- Si hay MÚLTIPLES registros de onboarding → Confirma ejecuciones múltiples del wizard
- Si onboarding_status = 'COMPLETED' en un tenant NO-SYSTEM → Wizard completado para tenant incorrecto

#### ✅ **Paso 3**: Revisar usuarios asociados a cada tenant

**SQL Query**:
```sql
SELECT 
  t.tenant_key,
  t.tenant_name,
  u.username,
  u.email,
  u.display_name,
  u.created_at
FROM public.users u
JOIN public.tenants t ON u.tenant_id = t.id
ORDER BY t.tenant_key, u.created_at;
```

**Análisis esperado**:
- Tenant SYSTEM debe tener:
  - `system.admin@titanium-labs.com` (del SEED)
  - Posiblemente `tenant.admin` (si el wizard se completó correctamente)
- Tenants EXTRA pueden tener usuarios "huérfanos"

#### ✅ **Paso 4**: Verificar el código del wizard actual

**Archivos a revisar**:

1. **`/supabase/functions/server/bootstrap.tsx`** (líneas 431-473):
   ```typescript
   // ✅ CORRECCIÓN: El wizard NO crea un nuevo tenant
   // Debe ACTUALIZAR el tenant SYSTEM que ya existe del seed
   ```
   - ✅ Si este comentario EXISTE → El código YA está corregido
   - ❌ Si NO existe → El código todavía crea tenants nuevos

2. **`/components/TenantSetupWizard.tsx`** (líneas 112-124):
   - Revisa que el wizard llame a `/bootstrap/step1-tenant` (que actualiza SYSTEM)
   - NO debe llamar a ningún endpoint que haga `INSERT INTO tenants`

---

### 🛠️ CORRECCIÓN RECOMENDADA

#### **Fase 1: Limpieza de tenants duplicados** (MANUAL, CON PRECAUCIÓN)

**⚠️ ADVERTENCIA**: Esta operación es DESTRUCTIVA. Hacer backup previo.

**SQL Script de Limpieza**:
```sql
-- ===========================================================================
-- SCRIPT DE LIMPIEZA DE TENANTS DUPLICADOS
-- ===========================================================================
-- Objetivo: Eliminar tenants creados por error, preservando SYSTEM
-- Ejecutar EN ORDEN y CON CUIDADO
-- ===========================================================================

BEGIN;

-- PASO 1: Identificar el tenant SYSTEM (el correcto)
DO $$
DECLARE
  v_system_tenant_id UUID;
BEGIN
  SELECT id INTO v_system_tenant_id 
  FROM public.tenants 
  WHERE tenant_key = 'SYSTEM';
  
  RAISE NOTICE '✅ Tenant SYSTEM encontrado: %', v_system_tenant_id;
END $$;

-- PASO 2: Listar tenants que se van a ELIMINAR (para confirmación)
DO $$
DECLARE
  v_tenant RECORD;
BEGIN
  RAISE NOTICE '⚠️  Los siguientes tenants serán ELIMINADOS:';
  
  FOR v_tenant IN 
    SELECT id, tenant_key, tenant_name 
    FROM public.tenants 
    WHERE tenant_key != 'SYSTEM'
  LOOP
    RAISE NOTICE '  - ID: %, Key: %, Name: %', 
      v_tenant.id, v_tenant.tenant_key, v_tenant.tenant_name;
  END LOOP;
END $$;

-- ⚠️ PUNTO DE NO RETORNO ⚠️
-- Si los tenants listados arriba SON los que quieres eliminar, continúa.
-- Si NO, ejecuta ROLLBACK; y detente.

-- PASO 3: Eliminar usuarios asociados a tenants NO-SYSTEM
DELETE FROM public.user_roles
WHERE tenant_id IN (
  SELECT id FROM public.tenants WHERE tenant_key != 'SYSTEM'
);

DELETE FROM public.users
WHERE tenant_id IN (
  SELECT id FROM public.tenants WHERE tenant_key != 'SYSTEM'
);

-- PASO 4: Eliminar roles asociados a tenants NO-SYSTEM
DELETE FROM public.roles
WHERE tenant_id IN (
  SELECT id FROM public.tenants WHERE tenant_key != 'SYSTEM'
);

-- PASO 5: Eliminar registros de onboarding de tenants NO-SYSTEM
DELETE FROM public.tenant_onboarding
WHERE tenant_id IN (
  SELECT id FROM public.tenants WHERE tenant_key != 'SYSTEM'
);

-- PASO 6: Eliminar los tenants NO-SYSTEM
DELETE FROM public.tenants
WHERE tenant_key != 'SYSTEM';

-- PASO 7: Verificación final
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.tenants;
  
  IF v_count = 1 THEN
    RAISE NOTICE '✅ Limpieza exitosa: Solo queda 1 tenant (SYSTEM)';
  ELSE
    RAISE EXCEPTION '❌ ERROR: Quedaron % tenants (esperado: 1)', v_count;
  END IF;
END $$;

COMMIT;

-- ===========================================================================
-- FIN DEL SCRIPT
-- ===========================================================================
```

**Alternativa SEGURA (recomendada)**: Ejecutar **FACTORY_RESET + SEED_COMPLETE**
```bash
# PowerShell (Windows):
./supabase/reset-and-seed.ps1

# Bash (Linux/Mac):
./supabase/reset-and-seed.sh
```

---

#### **Fase 2: Garantizar que el wizard NO cree tenants nuevos**

El código YA ESTÁ CORREGIDO en `/supabase/functions/server/bootstrap.tsx`:

**Líneas 431-473** (bootstrapStep1Tenant):
```typescript
// ✅ CORRECCIÓN: El wizard NO crea un nuevo tenant
// Debe ACTUALIZAR el tenant SYSTEM que ya existe del seed
// FLUJO CORRECTO:
//   1. SEED crea tenant SYSTEM
//   2. Wizard ACTUALIZA tenant SYSTEM (nombre, idiomas, timezone)
//   3. Se crea usuario TENANT_ADMIN para tenant SYSTEM

console.log('🔍 [STEP1] Buscando tenant SYSTEM...');
const { data: systemTenant, error: systemTenantError } = await supabase
  .from('tenants')
  .select('id, tenant_key, tenant_name')
  .eq('tenant_key', 'SYSTEM')
  .single();

if (systemTenantError || !systemTenant) {
  console.error('❌ [STEP1] Tenant SYSTEM no encontrado. Ejecutar 002_SEED_COMPLETE.sql primero.', systemTenantError);
  return c.json({ 
    error: 'Tenant SYSTEM no encontrado',
    details: 'Ejecutar las migraciones SQL primero (002_SEED_COMPLETE.sql)'
  }, 500);
}

// ✅ ACTUALIZAR el tenant SYSTEM con la configuración del wizard
const { data: updatedTenant, error: updateError } = await supabase
  .from('tenants')
  .update({
    tenant_name, // Actualizar nombre si el usuario lo cambió
    is_active: true
  })
  .eq('id', systemTenant.id)
  .select('id')
  .single();
```

**✅ CONFIRMACIÓN**: El código YA está corregido. NO se requiere modificación adicional.

---

#### **Fase 3: Constraint arquitectónico (OPCIONAL - para prevención futura)**

**Objetivo**: Garantizar que SOLO exista 1 tenant activo a la vez (enfoque On-Premise).

**SQL Migration** (ejecutar SI quieres forzar tenant único):
```sql
-- ===========================================================================
-- CONSTRAINT: Solo un tenant activo permitido (On-Premise Single-Tenant)
-- ===========================================================================

-- Opción 1: Trigger que previene inserción de tenants adicionales
CREATE OR REPLACE FUNCTION prevent_multiple_tenants()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
BEGIN
  -- Contar tenants existentes
  SELECT COUNT(*) INTO v_count FROM public.tenants;
  
  -- Si ya existe un tenant Y no es una actualización
  IF v_count >= 1 AND TG_OP = 'INSERT' THEN
    -- Permitir solo si es UPSERT del tenant SYSTEM
    IF NEW.tenant_key != 'SYSTEM' THEN
      RAISE EXCEPTION 'Solo se permite un tenant en modo On-Premise. Use UPDATE para modificar el tenant existente.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_multiple_tenants
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION prevent_multiple_tenants();

-- Opción 2: Check constraint (más simple, pero menos flexible)
-- NO RECOMENDADO porque previene incluso el SEED inicial
-- ALTER TABLE public.tenants ADD CONSTRAINT single_tenant_only 
--   CHECK ((SELECT COUNT(*) FROM public.tenants) <= 1);
```

**⚠️ NOTA**: Este constraint es OPCIONAL. Si lo implementas, asegúrate de que:
- SEED puede crear el tenant SYSTEM
- Wizard puede actualizar el tenant SYSTEM
- NO se pueden crear tenants adicionales

---

### 📊 RESUMEN DEL PROBLEMA 1

| Aspecto | Estado Actual | Estado Esperado | Acción |
|---------|---------------|-----------------|--------|
| **Tenants en DB** | 3 registros | 1 registro (SYSTEM) | Ejecutar limpieza SQL |
| **Código del wizard** | ✅ Corregido (ACTUALIZA SYSTEM) | ✅ Correcto | Sin cambios |
| **SEED** | ✅ Idempotente (ON CONFLICT DO NOTHING) | ✅ Correcto | Sin cambios |
| **FACTORY_RESET** | ✅ Limpia TODOS los tenants | ✅ Correcto | Sin cambios |
| **Constraint único** | ❌ No existe | ⚠️ Opcional | Implementar trigger si se desea |

---

## 🔐 PROBLEMA 2: ROLES BASE Y ASIGNACIONES

### ✅ VALIDACIÓN DE ROLES (Estado Actual)

**SQL Query de Verificación**:
```sql
-- Verificar que los 5 roles base existen
SELECT 
  r.role_key,
  r.role_name,
  r.role_scope,
  r.is_system_role,
  r.is_locked,
  r.data_scope,
  t.tenant_key,
  r.created_at
FROM public.roles r
JOIN public.tenants t ON r.tenant_id = t.id
WHERE r.is_system_role = true
ORDER BY r.role_key;
```

**Resultado Esperado** (del SEED líneas 109-118):

| role_key | role_name | role_scope | is_system_role | is_locked | data_scope | tenant_key |
|----------|-----------|------------|----------------|-----------|------------|------------|
| EMPLOYEE | Empleado | SCOPE | ✅ true | ✅ true | SELF | SYSTEM |
| RRHH_ADMIN | Administrador de RRHH | SCOPE | ✅ true | ✅ true | ALL | SYSTEM |
| SUPERVISOR | Supervisor | SCOPE | ✅ true | ✅ true | DIRECT_REPORTS | SYSTEM |
| SYSTEM_ADMIN | System Administrator | SYSTEM | ✅ true | ✅ true | ALL | SYSTEM |
| TENANT_ADMIN | Administrador del Tenant | TENANT | ✅ true | ✅ true | ALL | SYSTEM |

---

### 🎯 ESTRATEGIA DE SEED: ROLES SYSTEM vs TENANT

**Arquitectura Actual (CORRECTA para On-Premise)**:

```
┌────────────────────────────────────────────────────────────┐
│ TENANT: SYSTEM (tenant único del cliente)                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ ROLES BASE (is_system_role = true, is_locked = true)│  │
│ ├──────────────────────────────────────────────────────┤  │
│ │                                                      │  │
│ │ 1. SYSTEM_ADMIN                                      │  │
│ │    - role_scope: SYSTEM                              │  │
│ │    - data_scope: ALL                                 │  │
│ │    - Usuario asignado: system.admin@titanium-labs.com│  │
│ │    - Acceso: Pantallas SECURITY únicamente           │  │
│ │                                                      │  │
│ │ 2. TENANT_ADMIN                                      │  │
│ │    - role_scope: TENANT                              │  │
│ │    - data_scope: ALL                                 │  │
│ │    - Usuario asignado: tenant.admin (del wizard)     │  │
│ │    - Acceso: MAINT, CONFIG, ORG                      │  │
│ │                                                      │  │
│ │ 3. RRHH_ADMIN                                        │  │
│ │    - role_scope: SCOPE                               │  │
│ │    - data_scope: ALL                                 │  │
│ │    - Acceso: DASH, ATTENDANCE, REPORTS               │  │
│ │                                                      │  │
│ │ 4. SUPERVISOR                                        │  │
│ │    - role_scope: SCOPE                               │  │
│ │    - data_scope: DIRECT_REPORTS                      │  │
│ │    - Acceso: DASH, ATTENDANCE, REPORTS (limitado)    │  │
│ │                                                      │  │
│ │ 5. EMPLOYEE                                          │  │
│ │    - role_scope: SCOPE                               │  │
│ │    - data_scope: SELF                                │  │
│ │    - Acceso: KIOSK                                   │  │
│ │                                                      │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Nota Importante**: En el modelo On-Premise de Tenant Único:
- TODOS los roles están en el tenant SYSTEM
- NO hay distinción entre "roles SYSTEM" y "roles TENANT" a nivel de tenant_id
- La distinción es por el campo `role_scope` (SYSTEM / TENANT / SCOPE)
- Los 5 roles son INMUTABLES (is_locked = true) y NO pueden eliminarse

---

### 📋 MATRIZ DE PERMISOS MÍNIMOS (por Rol)

#### **1. SYSTEM_ADMIN**

**Grupo de Menú**: SECURITY únicamente

| Screen | View | Create | Edit | Delete | Otros |
|--------|------|--------|------|--------|-------|
| **USER_MANAGEMENT** | ✅ | ✅ | ✅ | ✅ | RESET_PASSWORD, CONFIGURE_PERMISSIONS |
| **ROLE_MANAGEMENT** | ✅ | ✅ | ✅ | ❌ | CLONE, LOCK, UNLOCK |
| **AUDIT_LOG** | ✅ | ❌ | ❌ | ❌ | EXPORT |
| **LOGIN_SESSIONS** | ✅ | ❌ | ❌ | ✅ | - |

**Total**: ~4 pantallas, ~20 acciones

---

#### **2. TENANT_ADMIN**

**Grupos de Menú**: MAINT, CONFIG, ORG

| Screen | View | Create | Edit | Delete | Otros |
|--------|------|--------|------|--------|-------|
| **CATALOGS** | ✅ | ✅ | ✅ | ✅ | EXPORT, IMPORT |
| **HOLIDAYS** | ✅ | ✅ | ✅ | ✅ | CLONE |
| **JUSTIFICATION_TYPES** | ✅ | ✅ | ✅ | ✅ | - |
| **ATTENDANCE_EVENTS** | ✅ | ✅ | ✅ | ✅ | TEST |
| **ATTENDANCE_MOVEMENTS** | ✅ | ✅ | ✅ | ✅ | - |
| **MESSAGES** | ✅ | ✅ | ✅ | ✅ | - |
| **TENANT_SETTINGS** | ✅ | ❌ | ✅ | ❌ | - |
| **SHIFTS** | ✅ | ✅ | ✅ | ✅ | CLONE |
| **WORK_PATTERNS** | ✅ | ✅ | ✅ | ✅ | - |
| **SURCHARGES** | ✅ | ✅ | ✅ | ✅ | TEST |
| **CALENDARS** | ✅ | ✅ | ✅ | ✅ | GENERATE |
| **DEVICES** | ✅ | ✅ | ✅ | ✅ | TEST, SYNC |
| **PAYROLL_INTEGRATION** | ✅ | ❌ | ✅ | ❌ | EXPORT, TEST |
| **ATTENDANCE_PROCESSES** | ✅ | ✅ | ✅ | ❌ | EXECUTE |
| **PARAMETERS** | ✅ | ❌ | ✅ | ❌ | - |
| **COMPANIES** | ✅ | ✅ | ✅ | ✅ | - |
| **DEPARTMENTS** | ✅ | ✅ | ✅ | ✅ | - |
| **AREAS** | ✅ | ✅ | ✅ | ✅ | - |
| **COST_CENTERS** | ✅ | ✅ | ✅ | ✅ | - |
| **JOB_TITLES** | ✅ | ✅ | ✅ | ✅ | - |
| **WORK_LOCATIONS** | ✅ | ✅ | ✅ | ✅ | - |
| **WORK_GROUPS** | ✅ | ✅ | ✅ | ✅ | - |
| **PAYROLL_GROUPS** | ✅ | ✅ | ✅ | ✅ | - |

**Total**: ~23 pantallas, ~100 acciones

---

#### **3. RRHH_ADMIN & SUPERVISOR**

**Grupos de Menú**: DASH, ATTENDANCE, REPORTS (mismo menú, diferente alcance de datos)

| Screen | View | Create | Edit | Delete | Otros | RRHH | SUPER |
|--------|------|--------|------|--------|-------|------|-------|
| **DASHBOARD** | ✅ | ❌ | ❌ | ❌ | - | ALL | DIRECT_REPORTS |
| **SHIFT_PLANS** | ✅ | ✅ | ✅ | ✅ | ASSIGN, SWAP | ALL | DIRECT_REPORTS |
| **TIME_PUNCHES** | ✅ | ✅ | ✅ | ✅ | APPROVE, REJECT | ALL | DIRECT_REPORTS |
| **ANOMALIES** | ✅ | ❌ | ✅ | ❌ | APPROVE, COMMENT | ALL | DIRECT_REPORTS |
| **APPROVALS** | ✅ | ❌ | ✅ | ❌ | APPROVE, REJECT | ALL | DIRECT_REPORTS |
| **PROCESS_RUNS** | ✅ | ✅ | ❌ | ❌ | EXECUTE, EXPORT | ALL | ❌ |
| **CALC_RESULTS** | ✅ | ❌ | ✅ | ❌ | RECALCULATE, EXPORT | ALL | ❌ |
| **REPORT_CATALOG** | ✅ | ❌ | ❌ | ❌ | GENERATE, EXPORT | ALL | DIRECT_REPORTS |
| **REPORT_EXECUTIONS** | ✅ | ❌ | ❌ | ✅ | DOWNLOAD | ALL | DIRECT_REPORTS |

**Total**: ~9 pantallas, ~40 acciones (RRHH_ADMIN), ~30 acciones (SUPERVISOR)

---

#### **4. EMPLOYEE**

**Grupo de Menú**: KIOSK únicamente

| Screen | View | Create | Edit | Delete | Otros |
|--------|------|--------|------|--------|-------|
| **KIOSK_PUNCH** | ✅ | ✅ | ❌ | ❌ | PUNCH |
| **KIOSK_MY_PUNCHES** | ✅ | ❌ | ❌ | ❌ | - |
| **KIOSK_JUSTIFICATION** | ✅ | ✅ | ❌ | ❌ | - |
| **KIOSK_PERMISSION** | ✅ | ✅ | ❌ | ❌ | - |
| **KIOSK_REGULARIZATION** | ✅ | ✅ | ❌ | ❌ | - |
| **KIOSK_SHIFT_CHANGE** | ✅ | ✅ | ❌ | ❌ | - |

**Total**: ~6 pantallas, ~12 acciones

---

### 🔗 ASIGNACIÓN DE ROLES A USUARIOS

**Query de Verificación**:
```sql
-- Verificar que system.admin y tenant.admin tienen sus roles asignados
SELECT 
  u.username,
  u.email,
  r.role_key,
  r.role_name,
  ur.is_active,
  t.tenant_key
FROM public.user_roles ur
JOIN public.users u ON ur.user_id = u.id
JOIN public.roles r ON ur.role_id = r.id
JOIN public.tenants t ON ur.tenant_id = t.id
WHERE u.email IN ('system.admin@titanium-labs.com', 'tenant.admin%')
ORDER BY u.email;
```

**Resultado Esperado**:

| username | email | role_key | role_name | is_active | tenant_key |
|----------|-------|----------|-----------|-----------|------------|
| system.admin | system.admin@titanium-labs.com | SYSTEM_ADMIN | System Administrator | ✅ true | SYSTEM |
| tenant.admin | (email del wizard) | TENANT_ADMIN | Administrador del Tenant | ✅ true | SYSTEM |

---

## 🏗️ FRAMEWORK REPETIBLE PARA CONSTRUIR PANTALLAS

### 📐 METODOLOGÍA ESTÁNDAR (Template para cada pantalla)

Para cada pantalla/ítem de menú, seguir estos 4 bloques (A-D) EN ORDEN:

---

### **BLOQUE A: FICHA DE PANTALLA**

**Template**:
```markdown
## 📄 FICHA: [NOMBRE_PANTALLA]

**Screen Key**: `[SCREEN_KEY de tabla screens]`  
**Screen Route**: `/[ruta/completa]`  
**Título**: [Título sin "Gestión de"]  
**Descripción**: [Descripción breve de la funcionalidad]

**Roles Permitidos**:
- ✅ SYSTEM_ADMIN: [SÍ/NO] - [Nivel de acceso]
- ✅ TENANT_ADMIN: [SÍ/NO] - [Nivel de acceso]
- ✅ RRHH_ADMIN: [SÍ/NO] - [Nivel de acceso]
- ✅ SUPERVISOR: [SÍ/NO] - [Nivel de acceso]
- ✅ EMPLOYEE: [SÍ/NO] - [Nivel de acceso]

**Acciones Disponibles**:
- [x] VIEW - Ver/Consultar
- [x] CREATE - Crear/Agregar
- [x] EDIT - Editar/Modificar
- [x] DELETE - Eliminar
- [x] EXPORT - Exportar
- [x] [ACCIÓN_ESPECIAL] - [Descripción]
```

**Ejemplo Real**:
```markdown
## 📄 FICHA: USUARIOS

**Screen Key**: `USER_MANAGEMENT`  
**Screen Route**: `/security/users`  
**Título**: Usuarios  
**Descripción**: Gestión de usuarios del sistema con asignación de roles y permisos

**Roles Permitidos**:
- ✅ SYSTEM_ADMIN: SÍ - Acceso total (CRUD + Reset Password + Configurar Permisos)
- ❌ TENANT_ADMIN: NO
- ❌ RRHH_ADMIN: NO
- ❌ SUPERVISOR: NO
- ❌ EMPLOYEE: NO

**Acciones Disponibles**:
- [x] VIEW - Ver/Consultar
- [x] CREATE - Crear/Agregar
- [x] EDIT - Editar/Modificar
- [x] DELETE - Eliminar
- [x] EXPORT - Exportar a Excel
- [x] RESET_PASSWORD - Resetear Contraseña
- [x] CONFIGURE_PERMISSIONS - Configurar Permisos
```

---

### **BLOQUE B: DISEÑO UI**

**Template**:
```markdown
## 🎨 DISEÑO UI: [NOMBRE_PANTALLA]

### Layout Principal
- **Header**: [Título + Descripción breve]
- **Toolbar**: [Botones de acción: Nuevo, Exportar, Filtros, etc.]
- **Filters**: [Filtros disponibles: Búsqueda, Estado, Rol, etc.]
- **Table**: [Columnas de la tabla]
- **Drawer/Modal**: [Formulario de creación/edición]

### Componentes a Usar
- **Buscador**: `<Input type="search" />` (debounce 300ms)
- **Filtros**:
  - Estado: `<Select>` (Activos / Inactivos / Todos)
  - [Filtro adicional]: `<Select>` / `<DatePicker>` / etc.
- **Tabla**:
  - Componente: `<Table>` de shadcn/ui
  - Sorting: Habilitado en columnas [lista]
  - Paginación: 10/25/50/100 registros
- **Modal de Confirmación**: Para DELETE
- **Drawer de Formulario**: Para CREATE y EDIT

### Estados de UI
- **Loading**: `<Skeleton>` en tabla durante carga inicial
- **Empty**: Mensaje "No hay registros" + botón "Crear Nuevo"
- **Error**: Alert con mensaje de error + opción de reintentar
- **Permission Denied**: Pantalla bloqueada con mensaje "No tiene permisos"
```

---

### **BLOQUE C: REGLAS DE DATOS**

**Template**:
```markdown
## 📊 REGLAS DE DATOS: [NOMBRE_PANTALLA]

### Tabla Principal
**Nombre**: `public.[tabla_principal]`

**Campos**:
| Campo | Tipo | Obligatorio | Default | Validación | Notas |
|-------|------|-------------|---------|------------|-------|
| id | UUID | ✅ SÍ | gen_random_uuid() | - | PK |
| tenant_id | UUID | ✅ SÍ | (auto) | FK a tenants | Auto-seteado |
| [campo_1] | VARCHAR | ✅ SÍ | - | min 3, max 100 | Único por tenant |
| [campo_2] | VARCHAR | ❌ NO | NULL | max 255 | - |
| is_active | BOOLEAN | ✅ SÍ | true | - | - |
| created_by | VARCHAR | ✅ SÍ | (user.email) | - | - |
| created_at | TIMESTAMPTZ | ✅ SÍ | now() | - | - |
| updated_by | VARCHAR | ❌ NO | NULL | - | - |
| updated_at | TIMESTAMPTZ | ❌ NO | NULL | - | - |

### Validaciones
- **Campo 1**: Requerido, 3-100 caracteres, único por tenant
- **Campo 2**: Opcional, max 255 caracteres
- **Email** (si aplica): Formato válido (regex)
- **tenant_id**: SIEMPRE auto-seteado desde el contexto del usuario logueado

### Defaults
- `tenant_id`: Obtener del `AuthContext.user.tenant_id`
- `is_active`: `true` (por defecto, nuevo registro está activo)
- `created_by`: `AuthContext.user.email`

### Soft Delete vs Hard Delete
- **Soft Delete**: ✅ SÍ (setear `is_active = false`)
- **Hard Delete**: ❌ NO (solo para SYSTEM_ADMIN en casos excepcionales)

### RLS (Row Level Security)
**Policy**: `allow_read_for_tenant`
```sql
CREATE POLICY allow_read_for_tenant ON public.[tabla]
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

**Policy**: `allow_crud_for_tenant`
```sql
CREATE POLICY allow_crud_for_tenant ON public.[tabla]
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::UUID);
```
```

---

### **BLOQUE D: PRUEBAS CRUD**

**Template**:
```markdown
## 🧪 PRUEBAS CRUD: [NOMBRE_PANTALLA]

### Test Case 1: CREATE VÁLIDO
**Descripción**: Crear un registro con todos los campos obligatorios
**Precondición**: Usuario con permiso CREATE
**Pasos**:
1. Hacer clic en "Nuevo"
2. Completar todos los campos obligatorios
3. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Registro creado en DB con `tenant_id` correcto
- ✅ Toast de éxito "Registro creado correctamente"
- ✅ Tabla se recarga con el nuevo registro

---

### Test Case 2: CREATE INVÁLIDO (campos faltantes)
**Descripción**: Intentar crear un registro sin campos obligatorios
**Precondición**: Usuario con permiso CREATE
**Pasos**:
1. Hacer clic en "Nuevo"
2. Dejar campos obligatorios vacíos
3. Hacer clic en "Guardar"

**Resultado Esperado**:
- ❌ Registro NO creado en DB
- ❌ Mensajes de validación en los campos faltantes
- ❌ Modal permanece abierto

---

### Test Case 3: CREATE INVÁLIDO (duplicado)
**Descripción**: Intentar crear un registro con clave duplicada
**Precondición**: Usuario con permiso CREATE, registro existente
**Pasos**:
1. Hacer clic en "Nuevo"
2. Ingresar un valor que YA existe en otro registro del mismo tenant
3. Hacer clic en "Guardar"

**Resultado Esperado**:
- ❌ Registro NO creado en DB
- ❌ Toast de error "Ya existe un registro con esa clave"
- ❌ Modal permanece abierto

---

### Test Case 4: UPDATE VÁLIDO
**Descripción**: Editar un registro existente
**Precondición**: Usuario con permiso EDIT, registro existente
**Pasos**:
1. Hacer clic en "Editar" en una fila de la tabla
2. Modificar campos permitidos
3. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Registro actualizado en DB con `updated_by` y `updated_at`
- ✅ Toast de éxito "Registro actualizado correctamente"
- ✅ Tabla se recarga con los cambios

---

### Test Case 5: DELETE (Soft Delete)
**Descripción**: Eliminar un registro (soft delete)
**Precondición**: Usuario con permiso DELETE, registro existente
**Pasos**:
1. Hacer clic en "Eliminar" en una fila de la tabla
2. Confirmar en el modal de confirmación

**Resultado Esperado**:
- ✅ `is_active = false` en DB
- ✅ Toast de éxito "Registro eliminado correctamente"
- ✅ Registro desaparece de la tabla (si filtro es "Solo activos")

---

### Test Case 6: FILTROS (Búsqueda)
**Descripción**: Filtrar registros por búsqueda
**Precondición**: Múltiples registros en la tabla
**Pasos**:
1. Ingresar texto en el buscador
2. Esperar debounce (300ms)

**Resultado Esperado**:
- ✅ Tabla muestra solo registros que coinciden con la búsqueda
- ✅ Paginación se reinicia a página 1

---

### Test Case 7: PAGINACIÓN
**Descripción**: Navegar entre páginas de resultados
**Precondición**: Más de 10 registros en la tabla
**Pasos**:
1. Hacer clic en "Siguiente página"
2. Cambiar registros por página a 25

**Resultado Esperado**:
- ✅ Tabla muestra la siguiente página de resultados
- ✅ Tabla muestra 25 registros por página

---

### Test Case 8: PERMISOS POR ROL
**Descripción**: Verificar que los permisos se aplican correctamente
**Precondición**: Usuario con rol que NO tiene permiso CREATE
**Pasos**:
1. Intentar hacer clic en "Nuevo"

**Resultado Esperado**:
- ❌ Botón "Nuevo" NO visible o deshabilitado
- ❌ Si se accede por URL directa, mostrar "No tiene permisos"

---

### Test Case 9: RLS CROSS-TENANT (Crítico)
**Descripción**: Verificar que RLS previene acceso a datos de otros tenants
**Precondición**: Usuario del Tenant A, datos en Tenant B
**Pasos**:
1. Hacer consulta SQL directa:
   ```sql
   SELECT * FROM public.[tabla] WHERE tenant_id != '<tenant_actual>';
   ```

**Resultado Esperado**:
- ✅ RLS bloquea la consulta
- ✅ Resultado: 0 registros (RLS previene fuga de datos)

---

### Test Case 10: EXPORT
**Descripción**: Exportar datos a Excel
**Precondición**: Usuario con permiso EXPORT, registros en la tabla
**Pasos**:
1. Hacer clic en "Exportar"
2. Esperar descarga

**Resultado Esperado**:
- ✅ Archivo Excel descargado con nombre `[pantalla]_[fecha].xlsx`
- ✅ Contiene solo registros del tenant actual
- ✅ Columnas correctas y datos formateados
```

---

## ✅ ENTREGABLE: FRAMEWORK REPETIBLE CONSOLIDADO

### 📋 CHECKLIST POR PANTALLA (Copy-Paste para cada ítem)

```markdown
# 🏷️ PANTALLA: [NOMBRE]

## ✅ BLOQUE A: FICHA COMPLETADA
- [ ] Screen Key identificado
- [ ] Screen Route confirmado
- [ ] Título definido (sin "Gestión de")
- [ ] Roles permitidos listados
- [ ] Acciones disponibles listadas

## ✅ BLOQUE B: DISEÑO UI COMPLETADO
- [ ] Layout definido (Header, Toolbar, Filters, Table, Drawer)
- [ ] Componentes seleccionados
- [ ] Estados de UI definidos (Loading, Empty, Error, Permission Denied)

## ✅ BLOQUE C: REGLAS DE DATOS COMPLETADAS
- [ ] Tabla principal identificada
- [ ] Campos obligatorios listados
- [ ] Validaciones definidas
- [ ] Defaults configurados
- [ ] tenant_id auto-seteo confirmado
- [ ] Soft delete configurado
- [ ] RLS policies listadas

## ✅ BLOQUE D: PRUEBAS CRUD COMPLETADAS
- [ ] Test 1: CREATE VÁLIDO ✅
- [ ] Test 2: CREATE INVÁLIDO (campos faltantes) ✅
- [ ] Test 3: CREATE INVÁLIDO (duplicado) ✅
- [ ] Test 4: UPDATE VÁLIDO ✅
- [ ] Test 5: DELETE (Soft Delete) ✅
- [ ] Test 6: FILTROS (Búsqueda) ✅
- [ ] Test 7: PAGINACIÓN ✅
- [ ] Test 8: PERMISOS POR ROL ✅
- [ ] Test 9: RLS CROSS-TENANT ✅
- [ ] Test 10: EXPORT ✅

## 🎯 IMPLEMENTACIÓN
- [ ] Componente React creado en `/app/dashboard/[ruta]/page.tsx`
- [ ] Endpoint del servidor implementado (si aplica)
- [ ] RLS policies aplicadas en DB
- [ ] Pruebas manuales completadas
- [ ] Documentación actualizada
```

---

## ❓ PREGUNTAS MÍNIMAS PARA ARRANCAR LA PRIMERA PANTALLA

### **Pregunta 1: ¿Qué pantalla quieres implementar primero?**

**Opciones sugeridas** (en orden de prioridad):

1. **`/security/users`** (USER_MANAGEMENT)
   - **Justificación**: Es la pantalla más crítica para SYSTEM_ADMIN
   - **Complejidad**: Media (CRUD + Reset Password + Configurar Permisos)
   - **Impacto**: Alto (permite crear usuarios operativos)

2. **`/security/roles`** (ROLE_MANAGEMENT)
   - **Justificación**: Segundo en importancia para SYSTEM_ADMIN
   - **Complejidad**: Media-Alta (CRUD + Clonar + Bloquear/Desbloquear)
   - **Impacto**: Alto (permite gestionar roles)

3. **`/org/companies`** (COMPANIES)
   - **Justificación**: Primera pantalla operativa para TENANT_ADMIN
   - **Complejidad**: Baja (CRUD simple)
   - **Impacto**: Alto (base de la estructura organizacional)

**¿Cuál eliges?**: [Indicar la screen_key o ruta]

---

### **Pregunta 2: ¿Quieres que te muestre el código completo de la pantalla o prefieres ir paso a paso?**

**Opción A**: Código completo de una sola vez
- ✅ **Ventaja**: Más rápido, tienes el componente listo para probar
- ❌ **Desventaja**: Puede ser abrumador, menos explicaciones

**Opción B**: Paso a paso (estructura → UI → lógica → pruebas)
- ✅ **Ventaja**: Más educativo, puedes hacer ajustes en cada paso
- ❌ **Desventaja**: Más lento, requiere más interacciones

**¿Cuál prefieres?**: [A o B]

---

### **Pregunta 3: ¿Hay alguna regla UX específica adicional que deba seguir?**

**Ejemplos**:
- ¿Quieres que los modales sean Drawer (panel lateral) o Dialog (modal centrado)?
- ¿Prefieres un layout con sidebar fijo o colapsable?
- ¿Hay algún estándar de nomenclatura para botones (ej: "Nuevo" vs "Agregar")?
- ¿Quieres que las tablas tengan acciones inline (iconos en cada fila) o menú contextual (3 puntos)?

**Tu respuesta**: [Indicar preferencias o decir "Usa tu criterio profesional"]

---

## 📝 RESUMEN EJECUTIVO

### ✅ Problema 1: TENANTS DUPLICADOS
- **Causa**: Ejecuciones múltiples del wizard ANTES de la corrección del código
- **Solución**: Ejecutar script de limpieza SQL O factory reset completo
- **Estado del código**: ✅ YA CORREGIDO (wizard actualiza SYSTEM, no crea nuevos)
- **Prevención**: Opcional - implementar trigger para prevenir tenants múltiples

### ✅ Problema 2: ROLES BASE
- **Estado**: Los 5 roles existen en el SEED (verificar con SQL query)
- **Asignaciones**:
  - system.admin → SYSTEM_ADMIN ✅
  - tenant.admin → TENANT_ADMIN ✅
- **Matriz de permisos**: Documentada arriba (tabla por rol)

### ✅ Framework de Pantallas
- **Metodología**: 4 bloques (A: Ficha, B: Diseño, C: Datos, D: Pruebas)
- **Checklist**: Template copy-paste para cada pantalla
- **Repetible**: ✅ SÍ, estandarizado

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. **Ejecutar queries de verificación** (tenants, roles, usuarios)
2. **Decidir**: ¿Limpieza SQL o Factory Reset completo?
3. **Responder las 3 preguntas** para arrancar la primera pantalla
4. **Implementar pantalla piloto** siguiendo el framework
5. **Replicar metodología** para el resto de pantallas

---

**🎯 TODO ESTÁ LISTO. ESPERANDO TUS 3 RESPUESTAS PARA CONTINUAR.**

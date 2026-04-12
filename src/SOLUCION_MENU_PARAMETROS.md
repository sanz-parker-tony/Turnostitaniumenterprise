# ✅ SOLUCIÓN: Menú de Parámetros con system_settings

## 📋 Problema Original

La pantalla "Parámetros del Sistema" (`SYSTEM_SETTINGS_MANAGEMENT`) estaba implementada en el código pero no aparecía en el menú porque faltaba crearla en la base de datos.

Habías creado la migración SQL `006_ADD_SYSTEM_SETTINGS_SCREEN.sql` pero en el entorno Make **no se pueden ejecutar migraciones SQL directamente**.

---

## 🎯 Solución Implementada: Bootstrap Automático

### 1. Archivo Backend: `/supabase/functions/server/bootstrap-screens.tsx`

Este archivo contiene la función `ensureSystemSettingsScreen()` que:

✅ Verifica si existe el grupo de menú `MAINT` (Mantenimiento)  
✅ Verifica si existe la pantalla `SYSTEM_SETTINGS_MANAGEMENT`  
✅ Si NO existe, la crea con:
  - **screen_key**: `SYSTEM_SETTINGS_MANAGEMENT`
  - **screen_name**: `Parámetros del Sistema`
  - **screen_short_name**: `Parámetros`
  - **screen_route**: `/dashboard/maintenance/parameters`
  - **screen_icon_key**: `Settings`
  - **screen_display_order**: `15` (entre Eventos y Catálogos)

✅ Actualiza el orden de otras pantallas:
  - **Eventos**: orden 10
  - **Parámetros**: orden 15 ⬅️ NUEVA
  - **Catálogos**: orden 20
  - **Novedades**: orden 30

✅ Asigna permisos automáticamente a los roles:
  - **SYSTEM_ADMIN**: View, Create, Edit, Export
  - **TENANT_ADMIN**: View, Create, Edit, Export
  - **RRHH_ADMIN**: View, Export

### 2. Ruta en el Servidor: `/supabase/functions/server/index.tsx`

Se agregó la ruta:

```typescript
app.post("/make-server-e19f2094/bootstrap/ensure-system-settings-screen", ensureSystemSettingsScreen);
```

### 3. Llamada Automática desde el Frontend: `/App.tsx`

Cuando un usuario inicia sesión, el componente `App.tsx` llama automáticamente al endpoint de bootstrap:

```typescript
fetch(`https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/bootstrap/ensure-system-settings-screen`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})
```

**Características:**
- ✅ Solo se ejecuta **una vez** por sesión de usuario
- ✅ Es **idempotente**: no duplica pantallas si ya existe
- ✅ Si detecta que creó la pantalla, **dispara un evento** para recargar el menú

### 4. Recarga Automática del Menú: `/contexts/PermissionsContext.tsx`

El contexto de permisos ahora escucha el evento `permissions-reload`:

```typescript
window.addEventListener('permissions-reload', handlePermissionsReload);
```

Cuando se dispara este evento (porque se creó una pantalla nueva), el menú se recarga automáticamente.

---

## 🚀 Cómo Funciona (Flujo Completo)

### Escenario 1: Primera vez que un usuario inicia sesión

1. Usuario hace login
2. `App.tsx` detecta la sesión y llama al endpoint de bootstrap
3. El backend verifica si existe la pantalla `SYSTEM_SETTINGS_MANAGEMENT`
4. Si NO existe:
   - La crea en la tabla `screens`
   - Asigna permisos a los roles base
   - Retorna `{ success: true, created: true }`
5. El frontend detecta `created: true` y dispara evento `permissions-reload`
6. El `PermissionsContext` recarga el menú
7. ✅ **La pantalla "Parámetros" aparece en el menú de Mantenimiento**

### Escenario 2: Usuario que ya ejecutó la migración SQL manualmente

1. Usuario hace login
2. `App.tsx` llama al endpoint de bootstrap
3. El backend verifica si existe la pantalla
4. **Ya existe**, retorna `{ success: true, created: false }`
5. No se dispara recarga del menú (no es necesario)
6. ✅ **La pantalla "Parámetros" ya está en el menú**

### Escenario 3: Sesiones posteriores del mismo usuario

1. Usuario hace login
2. `App.tsx` llama al endpoint de bootstrap
3. El backend retorna `{ success: true, created: false }` (ya existe)
4. No se dispara recarga
5. ✅ **La pantalla aparece inmediatamente en el menú**

---

## 📊 Verificación

### Desde el Frontend

1. Inicia sesión con un usuario SYSTEM_ADMIN, TENANT_ADMIN o RRHH_ADMIN
2. Abre el menú lateral
3. Expande el grupo **Mantenimiento**
4. Verás las pantallas en este orden:
   - ⚙️ **Eventos** (orden 10)
   - ⚙️ **Parámetros** ⬅️ NUEVA (orden 15)
   - 📋 **Catálogos** (orden 20)
   - 📌 **Novedades** (orden 30)

### Desde la Consola del Navegador

```javascript
// Ver logs del bootstrap
console.log('🔑 Access token obtenido');
console.log('✅ [BOOTSTRAP] Pantalla de Parámetros verificada: creada');
console.log('🔄 [BOOTSTRAP] Pantalla creada - Se recargará el menú automáticamente');

// Ver logs del PermissionsContext
console.log('🔄 [PERMISSIONS] Evento de recarga detectado');
console.log('✅ Pantallas cargadas y ordenadas: 4'); // Ejemplo con 4 pantallas
```

### Desde Supabase (Verificación Manual)

```sql
-- Ver la pantalla creada
SELECT 
  screen_key,
  screen_name,
  screen_short_name,
  screen_route,
  screen_display_order
FROM screens
WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

-- Resultado esperado:
-- screen_key: SYSTEM_SETTINGS_MANAGEMENT
-- screen_name: Parámetros del Sistema
-- screen_short_name: Parámetros
-- screen_route: /dashboard/maintenance/parameters
-- screen_display_order: 15

-- Ver permisos asignados
SELECT 
  r.role_key,
  r.role_name,
  rsp.can_view,
  rsp.can_create,
  rsp.can_edit,
  rsp.can_export
FROM role_screen_permissions rsp
INNER JOIN roles r ON rsp.role_id = r.id
INNER JOIN screens s ON rsp.screen_id = s.id
WHERE s.screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

-- Resultado esperado (3 filas):
-- SYSTEM_ADMIN  | true | true | true | true
-- TENANT_ADMIN  | true | true | true | true
-- RRHH_ADMIN    | true | false | false | true
```

---

## 🔧 Troubleshooting

### Problema: La pantalla no aparece en el menú

**Solución 1:** Verifica los logs del navegador

```javascript
// Si ves esto, es que el bootstrap no se ejecutó:
console.log('⚠️ [BOOTSTRAP] Error verificando pantalla de Parámetros: ...');

// Si ves esto, el backend tiene problemas:
console.log('⚠️ [BOOTSTRAP] Error en bootstrap de pantallas: ...');
```

**Solución 2:** Ejecuta el bootstrap manualmente

Abre la consola del navegador y ejecuta:

```javascript
fetch(`https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-e19f2094/bootstrap/ensure-system-settings-screen`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
  .then(res => res.json())
  .then(data => console.log('Resultado:', data));
```

**Solución 3:** Verifica que el rol tiene permisos

```sql
-- Verificar si el rol del usuario tiene permisos para la pantalla
SELECT rsp.*
FROM role_screen_permissions rsp
INNER JOIN screens s ON rsp.screen_id = s.id
INNER JOIN roles r ON rsp.role_id = r.id
INNER JOIN users u ON u.id = [TU_USER_ID]
INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role_id = r.id
WHERE s.screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';
```

**Solución 4:** Fuerza la recarga del menú

```javascript
// En la consola del navegador:
window.dispatchEvent(new Event('permissions-reload'));
```

---

## 🎯 Archivos Modificados

1. ✅ **Nuevo**: `/supabase/functions/server/bootstrap-screens.tsx`
2. ✅ **Modificado**: `/supabase/functions/server/index.tsx` (agregada ruta de bootstrap)
3. ✅ **Modificado**: `/App.tsx` (agregada llamada automática al bootstrap)
4. ✅ **Modificado**: `/contexts/PermissionsContext.tsx` (agregado listener de recarga)

---

## 📌 Resumen

**Estado Anterior:**
- ❌ Pantalla "Parámetros" implementada en el código
- ❌ NO aparecía en el menú porque faltaba en la BD
- ❌ Necesitabas ejecutar SQL manualmente

**Estado Actual:**
- ✅ Bootstrap automático al iniciar sesión
- ✅ Pantalla se crea automáticamente si no existe
- ✅ Permisos se asignan automáticamente
- ✅ Menú se recarga automáticamente
- ✅ **0 intervención manual necesaria**

---

## 🚨 Importante

- Este sistema de bootstrap **NO reemplaza** la migración SQL `006_ADD_SYSTEM_SETTINGS_SCREEN.sql`
- Si ejecutas la migración SQL manualmente, el bootstrap la detectará y NO duplicará la pantalla
- El bootstrap es una **solución alternativa** para entornos donde no se pueden ejecutar migraciones SQL directamente

---

**Última actualización:** 2026-04-12  
**Autor:** Turnos Titanium Enterprise  
**Versión:** 1.0.0

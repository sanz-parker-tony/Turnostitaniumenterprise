# Instrucciones: Implementación del Módulo de Parámetros del Sistema

## ✅ Archivos Implementados

### Backend
- ✅ `/supabase/functions/server/system-settings-routes.tsx` - Rutas API para gestión de system_settings
- ✅ `/supabase/functions/server/index.tsx` - Actualizado con ruta `/system-settings-management`

### Frontend
- ✅ `/components/screens/maintenance/SystemSettingsManagement.tsx` - Componente principal
- ✅ `/app/dashboard/maintenance/parameters/page.tsx` - Página de la aplicación

### Base de Datos
- ✅ `/supabase/migrations/006_ADD_SYSTEM_SETTINGS_SCREEN.sql` - Migración para agregar al menú

## 📋 Pasos para Completar la Implementación

### 1️⃣ Ejecutar Migración SQL

Debes ejecutar el script SQL para agregar la pantalla "Parámetros" al menú de Mantenimiento.

**Opción A: Usando Supabase Dashboard**
1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido completo del archivo `/supabase/migrations/006_ADD_SYSTEM_SETTINGS_SCREEN.sql`
5. Ejecuta el script
6. Verifica que veas los mensajes de éxito en la consola

**Opción B: Desde la Terminal (si tienes Supabase CLI)**
```bash
cd supabase
supabase db push
```

### 2️⃣ Verificar la Migración

Después de ejecutar la migración, verifica que todo esté correcto:

```sql
-- Verificar que la pantalla existe
SELECT screen_key, screen_name, screen_route, screen_display_order, is_active
FROM public.screens
WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

-- Verificar permisos asignados
SELECT 
  r.role_key,
  r.role_name,
  rsp.can_view,
  rsp.can_create,
  rsp.can_edit,
  rsp.can_delete,
  rsp.can_export
FROM public.role_screen_permissions rsp
INNER JOIN public.roles r ON rsp.role_id = r.id
INNER JOIN public.screens s ON rsp.screen_id = s.id
WHERE s.screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

-- Ver orden de pantallas en Mantenimiento
SELECT 
  s.screen_display_order,
  s.screen_key,
  s.screen_name,
  s.screen_route
FROM public.screens s
INNER JOIN public.menu_groups mg ON s.menu_group_id = mg.id
WHERE mg.menu_group_key = 'MAINT'
ORDER BY s.screen_display_order;
```

### 3️⃣ Refrescar la Aplicación

1. Cierra sesión en la aplicación
2. Vuelve a iniciar sesión
3. Navega al menú **Mantenimiento**
4. Deberías ver la nueva opción **"Parámetros"** en el menú

## 🎯 Funcionalidades Implementadas

### ✅ Backend (API)
- `GET /system-settings-management` - Listar todos los parámetros con JOINs
- `GET /system-settings-management/:id` - Obtener un parámetro específico
- `POST /system-settings-management` - Crear nuevo parámetro
- `PUT /system-settings-management/:id` - Actualizar parámetro
- `PATCH /system-settings-management/:id/status` - Activar/desactivar parámetro
- `GET /system-settings-management/catalogs/value-types` - Listar tipos de valor (lookup_values)
- `GET /system-settings-management/catalogs/lookup-groups` - Listar grupos de lookup

### ✅ Frontend (UI)
- **Vista de tabla** con paginación y ordenamiento
- **Filtros avanzados**:
  - Búsqueda por clave, nombre o código corto
  - Filtro por estado (activo/inactivo)
  - Filtro por tipo de valor
- **Modal de creación/edición** con validaciones en tiempo real:
  - Clave del parámetro (A-Z, 0-9, _ únicamente)
  - Nombre descriptivo
  - Código corto
  - Tipo de valor (desplegable)
  - Valor por defecto
  - Grupo de lookup permitido (para tipos LOOKUP)
  - Descripción
  - Estado activo/inactivo
- **Acciones**:
  - ✏️ Editar parámetro
  - ⚡ Activar/desactivar

### ✅ Validaciones
- **setting_key**: Solo mayúsculas, números y guiones bajos (mínimo 2 caracteres)
- **setting_name**: Obligatorio
- **setting_short_key**: Obligatorio
- **value_type_id**: Obligatorio
- **Unicidad**: setting_key debe ser único
- **Formato automático**: Conversión automática a mayúsculas

## 🔐 Permisos por Rol

La migración configura automáticamente los siguientes permisos:

| Rol | Ver | Crear | Editar | Eliminar | Exportar |
|-----|-----|-------|--------|----------|----------|
| **SYSTEM_ADMIN** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **TENANT_ADMIN** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **RRHH_ADMIN** | ✅ | ❌ | ❌ | ❌ | ✅ |
| **SUPERVISOR** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **EMPLOYEE** | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Nota**: Los parámetros del sistema NO se pueden eliminar (política de integridad), solo desactivar.

## 📊 Estructura de la Tabla system_settings

```sql
create table public.system_settings (
  id uuid not null default gen_random_uuid (),
  setting_key character varying not null,           -- Clave única (A-Z, 0-9, _)
  setting_name character varying not null,           -- Nombre descriptivo
  setting_short_key character varying not null,      -- Código corto
  value_type_id uuid not null,                       -- FK a lookup_values (SETTING_VALUE_TYPE)
  default_value text null,                           -- Valor por defecto
  description text null,                             -- Descripción del parámetro
  allowed_lookup_group_id uuid null,                 -- FK a lookup_groups (para tipos LOOKUP)
  is_active boolean not null default true,           -- Estado activo/inactivo
  created_by character varying not null,
  created_at timestamp with time zone not null default now(),
  updated_by character varying null,
  updated_at timestamp with time zone null,
  constraint system_settings_pkey primary key (id),
  constraint system_settings_setting_key_key unique (setting_key)
);
```

## 🔄 Orden de Pantallas en Mantenimiento

Después de la migración, el orden será:

1. **Eventos** (screen_display_order: 10)
2. **Parámetros** (screen_display_order: 15) ← **NUEVA**
3. **Catálogos** (screen_display_order: 20)
4. **Novedades** (screen_display_order: 30)

## 🧪 Pruebas Recomendadas

1. **Crear un parámetro nuevo**
   - Navega a Mantenimiento → Parámetros
   - Clic en "Nuevo Parámetro"
   - Completa el formulario
   - Verifica que se guarde correctamente

2. **Editar un parámetro**
   - Selecciona un parámetro existente
   - Clic en el ícono de edición
   - Modifica algunos campos
   - Verifica que se actualice

3. **Activar/Desactivar**
   - Usa el ícono de power para cambiar el estado
   - Verifica que el cambio se refleje en la tabla

4. **Filtros**
   - Prueba la búsqueda por texto
   - Filtra por estado
   - Filtra por tipo de valor

5. **Validaciones**
   - Intenta crear un parámetro con setting_key inválido (ej: "test-param")
   - Intenta crear un parámetro con setting_key duplicado
   - Verifica que los mensajes de error sean claros

## 🚨 Troubleshooting

### El menú no muestra "Parámetros"
1. Verifica que ejecutaste la migración SQL correctamente
2. Cierra sesión y vuelve a iniciar sesión
3. Verifica los permisos del rol actual:
   ```sql
   SELECT * FROM public.role_screen_permissions rsp
   INNER JOIN public.screens s ON rsp.screen_id = s.id
   WHERE s.screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';
   ```

### Error al cargar parámetros
1. Verifica que el servidor edge function esté corriendo
2. Revisa la consola del navegador para ver el error específico
3. Verifica que la ruta esté correctamente configurada en `/supabase/functions/server/index.tsx`

### Error al guardar parámetros
1. Verifica que tienes permisos de creación/edición
2. Revisa las validaciones del formulario
3. Verifica la consola del servidor para errores de base de datos

## 📝 Notas Adicionales

- **No se implementó eliminación física**: Los parámetros solo se pueden desactivar (is_active = false)
- **Traducciones**: El sistema está preparado para traducciones multiidioma en futuras iteraciones
- **Auditoría**: Todos los cambios registran created_by, updated_by y timestamps
- **Consistencia**: El módulo sigue el mismo patrón arquitectónico que "Eventos de Asistencia" y "Gestión de Catálogos"

## ✅ Checklist Final

- [ ] Ejecutar migración 006_ADD_SYSTEM_SETTINGS_SCREEN.sql
- [ ] Verificar que la pantalla aparece en la base de datos
- [ ] Verificar que los permisos están asignados correctamente
- [ ] Reiniciar sesión en la aplicación
- [ ] Verificar que "Parámetros" aparece en el menú Mantenimiento
- [ ] Probar crear un parámetro nuevo
- [ ] Probar editar un parámetro existente
- [ ] Probar activar/desactivar
- [ ] Probar los filtros de búsqueda

---

**Fecha de implementación**: 2026-04-12  
**Versión**: 1.0.0  
**Módulo**: Mantenimiento → Parámetros del Sistema  
**Arquitectura**: Enterprise On-Premise  
**Framework**: React + Tailwind CSS + Supabase Edge Functions

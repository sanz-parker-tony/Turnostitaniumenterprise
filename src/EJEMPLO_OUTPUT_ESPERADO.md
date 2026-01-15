# 📊 EJEMPLO DE OUTPUT ESPERADO - get_user_screens()

## 🎯 Este documento muestra cómo deberían verse los resultados

---

## ✅ CASO DE ÉXITO - Función funcionando correctamente

### Query de Prueba:
```sql
SELECT 
    menu_group_key,
    menu_group_name,
    menu_group_icon,
    screen_key,
    screen_name,
    screen_icon_key,
    route_path,
    can_view,
    can_create
FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
)
LIMIT 10;
```

### Output Esperado:

| menu_group_key | menu_group_name | menu_group_icon | screen_key | screen_name | screen_icon_key | route_path | can_view | can_create |
|----------------|-----------------|-----------------|------------|-------------|-----------------|------------|----------|------------|
| DASHBOARD | Dashboard | LayoutDashboard | INCIDENTS | Incidencias | AlertTriangle | /incidents | true | true |
| DASHBOARD | Dashboard | LayoutDashboard | CALENDAR | Calendario | Calendar | /calendar | true | true |
| STRUCTURE | Estructura Organizacional | Building2 | COMPANIES | Empresas | Building | /companies | true | true |
| STRUCTURE | Estructura Organizacional | Building2 | LOCATIONS | Localidades | MapPin | /locations | true | true |
| STRUCTURE | Estructura Organizacional | Building2 | DEPARTMENTS | Departamentos | Briefcase | /departments | true | true |
| STRUCTURE | Estructura Organizacional | Building2 | AREAS | Áreas | Grid3x3 | /areas | true | true |
| EMPLOYEES | Empleados | Users | EMPLOYEES_LIST | Lista de Empleados | UserCheck | /employees | true | true |
| EMPLOYEES | Empleados | Users | POSITIONS | Puestos | Award | /positions | true | true |
| SHIFTS | Turnos | Clock | SHIFTS_TYPES | Tipos de Turno | Clock | /shift-types | true | true |
| SHIFTS | Turnos | Clock | SHIFTS_CATALOG | Catálogo de Turnos | CalendarDays | /shift-catalog | true | true |

---

## ✅ PUNTOS CLAVE A VERIFICAR:

### 1️⃣ **menu_group_icon** (Ícono del Grupo)
- ✅ **NO debe ser NULL**
- ✅ Debe ser un string con el nombre del componente de Lucide React
- ✅ Ejemplos válidos: `LayoutDashboard`, `Building2`, `Users`, `Clock`, `Shield`, etc.
- ❌ **NO** debe ser: `null`, vacío, o un nombre que no existe en Lucide

### 2️⃣ **screen_icon_key** (Ícono Individual de la Pantalla)
- ✅ **NO debe ser NULL**
- ✅ Debe ser un string con el nombre del componente de Lucide React
- ✅ Ejemplos válidos: `AlertTriangle`, `Calendar`, `Building`, `MapPin`, `UserCheck`, etc.
- ❌ **NO** debe ser: `null`, vacío, o un nombre que no existe en Lucide

### 3️⃣ **route_path** (Ruta de la Pantalla)
- ✅ **NO debe ser NULL**
- ✅ Debe comenzar con `/`
- ✅ Ejemplos válidos: `/incidents`, `/calendar`, `/companies`, `/employees`, etc.
- ❌ **NO** debe ser: `null`, vacío, o sin el `/` inicial

### 4️⃣ **Permisos (can_view, can_create, etc.)**
- ✅ Deben ser `true` o `false` (nunca NULL)
- ✅ Para Super Admin, la mayoría deberían ser `true`

---

## ❌ CASOS DE ERROR - Qué NO deberías ver

### ❌ ERROR 1: Campos NULL
```
menu_group_key | menu_group_icon | screen_icon_key | route_path
---------------|-----------------|-----------------|------------
DASHBOARD      | NULL            | AlertTriangle   | /incidents    ← ❌ MAL
STRUCTURE      | Building2       | NULL            | /companies    ← ❌ MAL
EMPLOYEES      | Users           | UserCheck       | NULL          ← ❌ MAL
```
**Problema:** Faltan datos en las tablas `system_menu_groups` o `screens`  
**Solución:** Ejecutar scripts de INSERT para poblar `icon_key` y `route_path`

---

### ❌ ERROR 2: Función no devuelve los campos nuevos
```sql
-- Si ejecutas este query y da ERROR:
SELECT screen_icon_key FROM public.get_user_screens(...);

-- ERROR: column "screen_icon_key" does not exist
```
**Problema:** La función es una versión vieja  
**Solución:** Ejecutar `/10_DEFINITIVO_corregir_get_user_screens.sql`

---

### ❌ ERROR 3: La función no existe
```sql
SELECT * FROM public.get_user_screens(...);

-- ERROR: function get_user_screens(uuid, uuid) does not exist
```
**Problema:** La función no ha sido creada  
**Solución:** Ejecutar `/10_DEFINITIVO_corregir_get_user_screens.sql`

---

### ❌ ERROR 4: No retorna ninguna fila
```
(0 rows)
```
**Problema:** Posibles causas:
1. El usuario no existe
2. El usuario no tiene roles asignados
3. Las tablas están vacías

**Solución:** Ejecutar diagnóstico completo con `/DIAGNOSTICO_get_user_screens.sql`

---

## 🎨 VERIFICACIÓN DE ÍCONOS EN LUCIDE REACT

Todos los valores de `menu_group_icon` y `screen_icon_key` deben existir en Lucide React.

### ✅ Íconos Comunes Usados:

**Grupos de Menú:**
- `LayoutDashboard` - Dashboard
- `Building2` - Estructura
- `Users` - Empleados
- `Clock` - Turnos
- `Calendar` - Planificación
- `FileText` - Reportes
- `BarChart3` - Analítica
- `Package` - Nómina
- `Shield` - Seguridades

**Pantallas Individuales:**
- `AlertTriangle` - Incidencias
- `Calendar` - Calendario
- `Building` - Empresas
- `MapPin` - Localidades
- `Briefcase` - Departamentos
- `Grid3x3` - Áreas
- `UserCheck` - Empleados
- `Award` - Puestos
- `Clock` - Tipos de Turno
- `CalendarDays` - Catálogo de Turnos

Puedes verificar todos los íconos disponibles en: https://lucide.dev/icons/

---

## 🚀 FLUJO DE VALIDACIÓN RECOMENDADO

1. **Ejecutar Validación Rápida:**
   ```sql
   -- Copiar y ejecutar: /VALIDACION_RAPIDA.sql
   ```
   - Si TODOS los tests muestran ✅ → **¡LISTO!**
   - Si ALGÚN test muestra ❌ → Ir al paso 2

2. **Ejecutar Diagnóstico Completo:**
   ```sql
   -- Copiar y ejecutar: /DIAGNOSTICO_get_user_screens.sql
   ```
   - Revisar qué paso específico falla
   - Aplicar la solución correspondiente

3. **Si la función no existe o está desactualizada:**
   ```sql
   -- Copiar y ejecutar: /10_DEFINITIVO_corregir_get_user_screens.sql
   ```

4. **Probar en el Frontend:**
   - Hard refresh (Ctrl+Shift+R)
   - Login con admin@turnos-titanium.com
   - Verificar que los íconos se muestren correctamente

---

## 💡 TIP FINAL

Si todo funciona en SQL pero NO en el frontend:

1. ✅ Verificar que `PermissionsContext.tsx` tenga la interfaz actualizada
2. ✅ Verificar que `LayoutNew.tsx` use `getIconComponent()`
3. ✅ Hacer hard refresh del navegador (Ctrl+Shift+R)
4. ✅ Verificar la consola del navegador (F12) por errores

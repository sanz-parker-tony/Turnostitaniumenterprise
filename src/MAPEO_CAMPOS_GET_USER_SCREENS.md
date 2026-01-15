# 📊 MAPEO DE CAMPOS - get_user_screens()

## 🗄️ Función SQL: `public.get_user_screens()`

### ✅ Campos que RETORNA la función:

```sql
RETURNS TABLE (
    menu_group_key VARCHAR,      -- Ej: 'DASHBOARD'
    menu_group_name VARCHAR,     -- Ej: 'Dashboard'
    menu_group_icon VARCHAR,     -- Ej: 'LayoutDashboard' ← desde system_menu_groups.icon_key
    menu_group_sort INT,         -- Ej: 1
    screen_id UUID,              -- Ej: 'uuid-123...'
    screen_key VARCHAR,          -- Ej: 'INCIDENTS'
    screen_name VARCHAR,         -- Ej: 'Incidencias'
    screen_icon_key VARCHAR,     -- Ej: 'AlertTriangle' ← desde screens.icon_key
    route_path VARCHAR,          -- Ej: '/incidents' ← desde screens.route_path
    screen_sort INT,             -- Ej: 1
    can_view BOOLEAN,            -- true/false
    can_create BOOLEAN,          -- true/false
    can_update BOOLEAN,          -- true/false
    can_delete BOOLEAN,          -- true/false
    can_export BOOLEAN           -- true/false
)
```

---

## 🎨 Frontend: Interface `MenuScreen`

### ✅ Campos en TypeScript:

```typescript
export interface MenuScreen {
  screen_key: string;         // ← screen_key
  screen_name: string;        // ← screen_name
  screen_icon_key: string;    // ← screen_icon_key (NUEVO)
  route_path: string;         // ← route_path (NUEVO)
  menu_group_key: string;     // ← menu_group_key
  menu_group_name: string;    // ← menu_group_name
  menu_group_icon: string;    // ← menu_group_icon (NUEVO)
}
```

---

## 🔗 Origen de los Datos en Base de Datos

### Tabla: `system_menu_groups`
- `menu_group_key` ← `system_menu_groups.menu_group_key`
- `menu_group_name` ← `system_menu_groups.menu_group_name`
- `menu_group_icon` ← `system_menu_groups.icon_key` ⚠️ (NO "icon" ni "menu_group_icon")
- `menu_group_sort` ← `system_menu_groups.sort_order`

### Tabla: `screens`
- `screen_id` ← `screens.id`
- `screen_key` ← `screens.screen_key`
- `screen_name` ← `screens.screen_name`
- `screen_icon_key` ← `screens.icon_key` ✅ (AGREGADO)
- `route_path` ← `screens.route_path` ⚠️ (NO "screen_path")
- `screen_sort` ← `screens.sort_order`

### Permisos (Calculados por la función):
- `can_view` ← agregación de `actions.action_key = 'VIEW'`
- `can_create` ← agregación de `actions.action_key = 'CREATE'`
- `can_update` ← agregación de `actions.action_key = 'UPDATE'`
- `can_delete` ← agregación de `actions.action_key = 'DELETE'`
- `can_export` ← agregación de `actions.action_key = 'EXPORT'`

---

## 🎯 Uso en el Menú Lateral (LayoutNew.tsx)

### Ícono del Grupo (Categoría):
```tsx
const GroupIcon = getIconComponent(group.groupIcon);
// groupIcon viene de menu_group_icon (system_menu_groups.icon_key)
```

### Ícono de la Pantalla Individual:
```tsx
const Icon = getIconComponent(screen.screen_icon_key);
// screen_icon_key viene de screens.icon_key
```

### Navegación:
```tsx
// El route_path se puede usar en el futuro para navegación dinámica
// Actualmente usamos SCREEN_COMPONENT_MAP hardcodeado
```

---

## ⚠️ ERRORES COMUNES CORREGIDOS:

❌ **ANTES (INCORRECTO):**
- `smg.icon` → No existe
- `smg.menu_group_icon` → No existe
- `s.screen_path` → No existe

✅ **AHORA (CORRECTO):**
- `smg.icon_key as menu_group_icon`
- `s.icon_key as screen_icon_key`
- `s.route_path`

---

## 🚀 SCRIPT A EJECUTAR:

```bash
# Ejecutar en Supabase SQL Editor:
/10_DEFINITIVO_corregir_get_user_screens.sql
```

Este script incluye:
1. ✅ Corrección de nombres de campos
2. ✅ Agregado de screen_icon_key
3. ✅ Agregado de route_path
4. ✅ Queries de diagnóstico
5. ✅ Query de prueba con LIMIT 15

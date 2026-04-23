# 📸 Vista Visual del Menú con Parámetros

## 🎯 Resultado Final Esperado

Después de ejecutar la migración SQL, el menú lateral de **Mantenimiento** debería verse así:

```
┌─────────────────────────────────┐
│  Turnos Titanium                │
│  Titanium-Labs Corp             │
├─────────────────────────────────┤
│                                 │
│  🏠 Inicio                      │
│                                 │
│  👤 Seguridad                   │
│    └─ ...                       │
│                                 │
│  🔧 Mantenimiento               │ ◄─── AQUÍ
│    ├─ Eventos                   │     (Orden: 10)
│    ├─ Parámetros            ⭐  │     (Orden: 15) ◄─── NUEVA
│    ├─ Catálogos                 │     (Orden: 20)
│    └─ Novedades                 │     (Orden: 30)
│                                 │
│  🏢 Organización                │
│    └─ ...                       │
│                                 │
│  📊 Asistencias                 │
│    └─ ...                       │
│                                 │
│  👥 Empleados                   │
│    └─ ...                       │
│                                 │
└─────────────────────────────────┘
```

---

## 📋 Detalle del Menú Mantenimiento

### ANTES de la migración:
```
┌──────────────────────────────┐
│ 🔧 Mantenimiento             │
├──────────────────────────────┤
│ 📅 Eventos                   │ ← Orden: 10
│ 📚 Catálogos                 │ ← Orden: 10 o 20 (variable)
│ 🔔 Novedades                 │ ← Orden: 30
│ 🎉 Días Festivos             │
│ 📝 Tipos de Justificación    │
│ 💬 Mensajes del Sistema      │
└──────────────────────────────┘
```

### DESPUÉS de la migración:
```
┌──────────────────────────────┐
│ 🔧 Mantenimiento             │
├──────────────────────────────┤
│ 📅 Eventos                   │ ← Orden: 10 (sin cambios)
│ ⚙️  Parámetros            ⭐ │ ← Orden: 15 (NUEVA)
│ 📚 Catálogos                 │ ← Orden: 20 (actualizado)
│ 🔔 Novedades                 │ ← Orden: 30 (sin cambios)
│ 🎉 Días Festivos             │
│ 📝 Tipos de Justificación    │
│ 💬 Mensajes del Sistema      │
└──────────────────────────────┘
```

---

## 🖼️ Vista de la Pantalla Completa

### Breadcrumb:
```
Inicio > Mantenimiento > Parámetros del Sistema
```

### Header:
```
┌────────────────────────────────────────────────────────────┐
│ Parámetros del Sistema                [+ Nuevo Parámetro]  │
│ Gestión de configuraciones y parámetros del sistema        │
└────────────────────────────────────────────────────────────┘
```

### Filtros:
```
┌────────────────────────────────────────────────────────────┐
│ 🔍 [Buscar por clave, nombre...] │ [Estado ▼] │ [Tipo ▼] │
│ Mostrando 12 de 25 parámetros                              │
└────────────────────────────────────────────────────────────┘
```

### Tabla:
```
┌────────────┬─────────────────┬───────────┬──────────────┬────────┬──────┐
│ Clave      │ Nombre          │ Tipo      │ Valor Def.   │ Estado │ ⚙️    │
├────────────┼─────────────────┼───────────┼──────────────┼────────┼──────┤
│ MAX_USERS  │ Máximo de       │ INTEGER   │ 100          │ ✅     │ ✏️ ⚡ │
│ MAXU       │ Usuarios        │           │              │ Activo │      │
├────────────┼─────────────────┼───────────┼──────────────┼────────┼──────┤
│ DEF_LANG   │ Idioma por      │ LOOKUP    │ es           │ ✅     │ ✏️ ⚡ │
│ DLNG       │ Defecto         │           │ (LANGUAGES)  │ Activo │      │
├────────────┼─────────────────┼───────────┼──────────────┼────────┼──────┤
│ TIMEOUT    │ Tiempo Máx.     │ INTEGER   │ 3600         │ ✅     │ ✏️ ⚡ │
│ TOUT       │ de Sesión       │           │              │ Activo │      │
└────────────┴─────────────────┴───────────┴──────────────┴────────┴──────┘

Leyenda:
✏️ = Editar
⚡ = Activar/Desactivar
```

---

## 🎨 Diseño Visual (Referencia de Imagen)

Según tu imagen de referencia (`image-16.png`), el menú debería verse similar a:

```
┌─────────────────────────────────────────────────────────────┐
│ [🌐 Turnos Titanium]           [🔔 1]  [👤 System Admin]  │
│ Titanium-Labs Corp                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [🔍 Seguridad                                           ▼]  │
│                                                             │
│ [🔧 Mantenimiento                                       ▼]  │ ◄── AQUÍ
│   • Eventos                                                 │
│   • Parámetros                                          ⭐  │ ◄── NUEVA
│   • Catálogos                                               │
│                                                             │
│                                                             │
│ [System Administrator]                                      │
│ [System Administrator]                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Orden Final de Display

```sql
SELECT 
  screen_display_order AS "Orden",
  screen_short_name AS "Nombre",
  screen_route AS "Ruta"
FROM public.screens s
INNER JOIN public.menu_groups mg ON s.menu_group_id = mg.id
WHERE mg.menu_group_key = 'MAINT'
ORDER BY screen_display_order;
```

**Resultado:**
```
┌───────┬─────────────────────┬───────────────────────────────────────┐
│ Orden │ Nombre              │ Ruta                                  │
├───────┼─────────────────────┼───────────────────────────────────────┤
│   10  │ Eventos             │ /dashboard/maintenance/events         │
│   15  │ Parámetros       ⭐ │ /dashboard/maintenance/parameters     │
│   20  │ Catálogos           │ /dashboard/maintenance/catalogs       │
│   30  │ Novedades           │ /dashboard/maintenance/attendance-... │
│   40  │ Días Festivos       │ /dashboard/maintenance/holidays       │
│   50  │ Tipos Justificación │ /dashboard/maintenance/justification..│
│   60  │ Mensajes            │ /dashboard/maintenance/messages       │
└───────┴─────────────────────┴───────────────────────────────────────┘
```

---

## 🎯 Iconos Usados

| Pantalla | Icono | Componente Lucide |
|----------|-------|-------------------|
| Eventos | 📅 | `Calendar` |
| **Parámetros** | **⚙️** | **`Settings`** |
| Catálogos | 📚 | `Database` |
| Novedades | 🔔 | `AlertCircle` |

---

## 🔍 Cómo Verificar Visualmente

1. **Inicia sesión** en Turnos Titanium Enterprise
2. **Abre el menú lateral** (si está colapsado)
3. **Expande** la sección "Mantenimiento" (si está colapsada)
4. **Deberías ver**:
   ```
   🔧 Mantenimiento
     📅 Eventos
     ⚙️  Parámetros          ← NUEVA (debería estar aquí)
     📚 Catálogos
     🔔 Novedades
   ```

5. **Click en "Parámetros"**
6. **Deberías ver**:
   - Header: "Parámetros del Sistema"
   - Botón azul: "+ Nuevo Parámetro"
   - Panel de filtros
   - Tabla con columnas: Clave/Código, Nombre, Tipo, Valor, Estado, Acciones

---

## 📱 Versión Mobile

En dispositivos móviles, el menú se colapsa en un drawer lateral:

```
[☰] Turnos Titanium

Toca el ícono hamburguesa ☰ para ver:

┌─────────────────────┐
│ 🏠 Inicio           │
│ 👤 Seguridad     ▼  │
│ 🔧 Mantenimiento ▼  │ ◄── AQUÍ
│   📅 Eventos        │
│   ⚙️  Parámetros ⭐ │ ◄── NUEVA
│   📚 Catálogos      │
│   🔔 Novedades      │
│ 🏢 Organización  ▼  │
└─────────────────────┘
```

---

## ✅ Checklist Visual

- [ ] Menú "Mantenimiento" existe
- [ ] Opción "Parámetros" visible
- [ ] Icono correcto (Settings / ⚙️)
- [ ] Orden correcto (después de Eventos, antes de Catálogos)
- [ ] Click en "Parámetros" abre la pantalla
- [ ] Header muestra "Parámetros del Sistema"
- [ ] Botón "+ Nuevo Parámetro" visible
- [ ] Tabla se carga con datos
- [ ] Filtros funcionan correctamente

---

## 🎨 Paleta de Colores (Referencia)

```
Primario (Azul):    #0074D9  ████████
Secundario (Verde): #2ECC71  ████████
Gris Claro:         #F8F9FA  ████████
Gris Medio:         #6C757D  ████████
Gris Oscuro:        #343A40  ████████
Blanco:             #FFFFFF  ████████
```

**Botón "Nuevo Parámetro":**
```css
background: #0074D9
color: #FFFFFF
border-radius: 0.5rem
padding: 0.5rem 1rem
```

**Badge "Activo":**
```css
background: rgba(46, 204, 113, 0.1)
color: #2ECC71
border-radius: 9999px
padding: 0.25rem 0.625rem
```

---

**Creado**: 2026-04-12  
**Propósito**: Guía visual para verificar la implementación del módulo de Parámetros  
**Referencia**: /imports/image-16.png (tu imagen con el menú marcado)

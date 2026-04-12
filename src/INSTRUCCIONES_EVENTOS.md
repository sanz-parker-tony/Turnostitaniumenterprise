# 🎯 Instrucciones: Pantalla de Eventos de Asistencia

## ✅ Estado de Implementación

### Completado
- ✅ **Componente frontend**: `AttendanceEventsManagement.tsx` actualizado con CRUD completo
- ✅ **Rutas backend**: Ya existen en `/supabase/functions/server/attendance-events-routes.tsx`
- ✅ **Modal de creación/edición**: Implementado con todas las validaciones
- ✅ **Filtros avanzados**: Búsqueda + 4 filtros (estado, tipo, movimiento, dirección)
- ✅ **Script SQL temporal**: Listo para ejecutar

### Cambios Realizados
1. **Nombre**: Cambiado de "Novedades" a "Eventos" en toda la aplicación
2. **Título de pantalla**: "Eventos de Asistencia"
3. **Ruta**: `/dashboard/maintenance/attendance-events`
4. **Ubicación en menú**: Mantenimiento → Eventos

---

## 🚀 Cómo Habilitar la Pantalla

### Paso 1: Ejecutar el Script SQL

1. **Abre Supabase** → SQL Editor
2. **Copia TODO** el contenido del archivo:
   ```
   /supabase/migrations/TEMP_COMPLETE_ATTENDANCE_EVENTS.sql
   ```
3. **Pega** en el SQL Editor
4. **Haz clic** en "Run"
5. **Verifica** que veas mensajes en verde confirmando:
   - ✅ Pantalla creada/actualizada
   - ✅ Permisos asignados (3 roles)
   - ✅ 22 eventos sembrados

### Paso 2: Recargar la Aplicación

1. **Presiona F5** en tu navegador
2. El contexto `PermissionsContext` recargará el menú
3. **Navega** a: **Mantenimiento → Eventos**

---

## 📋 Funcionalidades Implementadas

### Grilla Principal
- ✅ Muestra todas las columnas requeridas:
  - Código (event_short_name)
  - Nombre (event_name)
  - Tolerancia (tolerance_minutes)
  - Peso (weight_value)
  - Dirección de Transacción
  - Tipo de Evento
  - Movimiento
  - Homologación Externa
  - Estado (is_active)
  - Acciones (Editar, Activar/Desactivar)

### Filtros
- ✅ **Búsqueda libre**: Por nombre, código o homologación
- ✅ **Estado**: Todos / Activos / Inactivos
- ✅ **Tipo de evento**: Dropdown con lookup_values
- ✅ **Movimiento**: Dropdown con attendance_movements
- ✅ **Dirección de transacción**: Dropdown con lookup_values

### Modal CRUD
- ✅ **Campos obligatorios**:
  - Nombre del Evento (max 60 chars)
  - Código Corto (max 20 chars, auto-uppercase)
  - Tolerancia en minutos (>= 0)
  - Peso (>= 0)
  - Dirección de Transacción
  - Tipo de Evento
  - Movimiento
  - Método de Cálculo

- ✅ **Campos opcionales**:
  - Homologación Externa (max 60 chars)

- ✅ **Control**:
  - Checkbox "Evento activo"

### Validaciones
- ✅ event_short_name convertido a mayúsculas automáticamente
- ✅ Validación de longitudes máximas
- ✅ Validación de valores numéricos >= 0
- ✅ Validación de unicidad (tenant_id, event_short_name)
- ✅ Mensajes de error en tiempo real
- ✅ Prevención de duplicados (código 409)

### Acciones
- ✅ **Crear evento**: Modal con formulario completo
- ✅ **Editar evento**: Modal pre-poblado con datos existentes
- ✅ **Activar/Desactivar**: Toggle de estado (no elimina físicamente)
- ✅ **Exportar**: Placeholder (en desarrollo)

---

## 📊 Datos de Prueba

El script SQL siembra 22 eventos de asistencia reales:

1. **JORNADA LABORAL** (JOR) - Tolerancia: 10 min
2. **ATRASO** (ATR) - Tolerancia: 5 min
3. **FALTA** (FAL)
4. **SALIDA ANTICIPADA** (SAN)
5. **HORA EXTRA 150%** (HEX15)
6. **HORA EXTRA 200%** (HEX20)
7. **LUNCH** (LUC)
8. **Y 15 más...**

---

## 🔐 Permisos RBAC

### Roles con Acceso
- ✅ **SYSTEM_ADMIN**: Ver, Crear, Editar, Exportar
- ✅ **TENANT_ADMIN**: Ver, Crear, Editar, Exportar
- ✅ **RRHH_ADMIN**: Ver, Exportar (solo lectura)

### Roles SIN Acceso
- ❌ SUPERVISOR
- ❌ EMPLOYEE

---

## 🛠️ Rutas Backend Disponibles

Todas las rutas están ya implementadas en:
`/supabase/functions/server/attendance-events-routes.tsx`

### Endpoints
- ✅ `GET /attendance-events` - Listar todos con JOINs
- ✅ `GET /attendance-events/:id` - Obtener uno específico
- ✅ `POST /attendance-events` - Crear nuevo
- ✅ `PUT /attendance-events/:id` - Actualizar completo
- ✅ `PATCH /attendance-events/:id/status` - Activar/Desactivar

### Catálogos
- ✅ `GET /lookup-values?group=ATTENDANCE_TRANSACTION_DIRECTION`
- ✅ `GET /lookup-values?group=ATTENDANCE_EVENT_TYPE`
- ✅ `GET /lookup-values?group=ATTENDANCE_CALCULATION_METHOD`
- ✅ `GET /attendance-movements`

---

## 🎨 UI/UX

### Diseño
- ✅ Paleta de colores: `#0074D9` (primario), `#2ECC71` (secundario)
- ✅ Tipografía: Inter
- ✅ Tabla responsive con hover states
- ✅ Modal fullscreen en móvil, centrado en desktop
- ✅ Badges de estado con colores semánticos
- ✅ Iconos de Lucide React

### Feedback al Usuario
- ✅ Loading spinner al cargar datos
- ✅ Mensajes de error en rojo
- ✅ Validación en tiempo real en formularios
- ✅ Confirmación de acciones con alerts
- ✅ Estados disabled en botones durante guardado

---

## ⚠️ Notas Importantes

### Script Temporal
- Este script es **TEMPORAL** para testing
- En producción, ejecuta la **migración 004 completa**
- El script es **idempotente**: puedes ejecutarlo múltiples veces

### Restricciones
- ❌ **NO permite borrado físico** (política de negocio)
- ✅ Solo permite **activar/desactivar**
- ✅ La tabla `attendance_events` tiene constraint UNIQUE en (tenant_id, event_short_name)

### Próximos Pasos
1. Implementar exportación a Excel/CSV
2. Agregar paginación si el número de eventos crece
3. Agregar filtros avanzados adicionales si es necesario
4. Considerar auditoría de cambios (ya está en created_by/updated_by)

---

## 🐛 Troubleshooting

### "No veo el menú Eventos"
1. ✅ ¿Ejecutaste el script SQL?
2. ✅ ¿Recargaste la página (F5)?
3. ✅ ¿Estás logueado como SYSTEM_ADMIN, TENANT_ADMIN o RRHH_ADMIN?
4. ✅ Verifica en consola si hay errores del RPC `get_user_screens`

### "Error al cargar eventos"
1. ✅ Verifica que las rutas backend estén registradas en `index.tsx`
2. ✅ Verifica que exista el endpoint `/attendance-events`
3. ✅ Revisa logs del servidor en Supabase Functions

### "Error al crear evento"
1. ✅ Verifica que el código no esté duplicado
2. ✅ Verifica que todos los campos obligatorios estén llenos
3. ✅ Verifica que los lookups existan en la BD

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs en la consola del navegador
2. Revisa los logs del servidor en Supabase → Functions
3. Verifica que todas las migraciones anteriores (001, 002) estén ejecutadas
4. Contacta al equipo de desarrollo con los logs completos

---

**¡Listo para usar!** 🎉

Ejecuta el script SQL y disfruta de la nueva pantalla de Eventos de Asistencia.

# 🎯 GUÍA DE CONTROL DE CALIDAD - ADMINISTRACIÓN SYSTEM

## Turnos Titanium Enterprise - Testing de Interfaces SYSTEM

---

## 📋 PASO 1: CONFIGURACIÓN INICIAL

### 1.1 Ejecutar Script SQL

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor**
3. Abre el archivo `/docs/setup-system-admin.sql`
4. **IMPORTANTE**: Reemplaza `'TU_EMAIL_AQUI'` con tu email real en:
   - PASO 5.1 (línea ~115)
   - PASO 6.1 (línea ~135)
   - PASO 6.2 (línea ~145)

5. Ejecuta el script **por secciones** en este orden:
   - ✅ PASO 1: Verificar estructura
   - ✅ PASO 2: Crear pantalla
   - ✅ PASO 3: Agregar al menú
   - ✅ PASO 5: Asignar permisos (después de reemplazar tu email)
   - ✅ PASO 6: Verificar/Convertir en Super Admin
   - ✅ PASO 7: Datos de ejemplo (idiomas)
   - ✅ PASO 8: Verificación final

---

## 📋 PASO 2: VERIFICAR ACCESO

### 2.1 Verificar que eres Super Admin

```sql
SELECT 
  u.email,
  p.tenant_id,
  CASE 
    WHEN p.tenant_id = '00000000-0000-0000-0000-000000000000' 
    THEN '✅ ERES SUPER ADMIN (GOD)'
    ELSE '❌ NO ERES SUPER ADMIN'
  END as status
FROM auth.users u
JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'tu_email@ejemplo.com';
```

**Resultado esperado**: Status debe ser '✅ ERES SUPER ADMIN (GOD)'

### 2.2 Verificar que la pantalla existe

```sql
SELECT * FROM system_screens WHERE screen_key = 'SEC_SYSTEM_ADMIN';
```

**Resultado esperado**: 1 fila con screen_name = 'Administración del Sistema'

### 2.3 Verificar que está en el menú

```sql
SELECT 
  smg.menu_group_key,
  ss.screen_key,
  ss.screen_name
FROM system_menu_items smi
JOIN system_menu_groups smg ON smi.menu_group_id = smg.id
JOIN system_screens ss ON smi.screen_id = ss.id
WHERE ss.screen_key = 'SEC_SYSTEM_ADMIN';
```

**Resultado esperado**: 1 fila mostrando que está en el grupo SEGURIDAD

---

## 📋 PASO 3: NAVEGAR A LA INTERFAZ

### 3.1 Acceder a la aplicación

1. Abre tu aplicación: `http://localhost:3000` (o tu URL)
2. Inicia sesión con tu usuario Super Admin
3. Busca en el menú lateral el grupo **SEGURIDAD** (ícono Shield)
4. Dentro de SEGURIDAD, busca **"Administración del Sistema"** o **"SEC_SYSTEM_ADMIN"**
5. Haz clic para acceder

### 3.2 Verificar Header Principal

**Debe mostrar**:
- ✅ Título: "Administración del Sistema"
- ✅ Ícono Settings con fondo azul (#0074D9)
- ✅ Badge verde "Super Admin" con dot animado
- ✅ Tu tenant_id: `00000000-0000-0000-0000-000000000000`
- ✅ Fondo degradado azul claro

---

## 📋 PASO 4: TESTING TAB "IDIOMAS"

### 4.1 Verificaciones Visuales

- [ ] Banner amarillo de advertencia en la parte superior
- [ ] Texto: "Los idiomas del sistema NO se pueden eliminar"
- [ ] Botón "Nuevo Idioma" visible (azul #0074D9)
- [ ] Barra de búsqueda funcional
- [ ] Badge mostrando cantidad de idiomas

### 4.2 Verificar Tabla de Idiomas

**Columnas que deben aparecer**:
- [ ] Código ISO (en formato `monospace`)
- [ ] Nombre del Idioma
- [ ] Estado (Badge: Activo/Inactivo)
- [ ] Predeterminado (Badge azul o "No")
- [ ] Fecha Creación
- [ ] Acciones (solo botón "Editar", **NO hay botón eliminar**)

**Datos esperados** (si ejecutaste PASO 7):
- [ ] ES - Español (Activo, Predeterminado) ⭐
- [ ] EN - English (Activo)
- [ ] PT - Português (Activo)

### 4.3 Testing: Buscar Idiomas

1. Escribe "ES" en el buscador
   - ✅ Debe filtrar y mostrar solo "Español"
2. Escribe "Ing"
   - ✅ Debe filtrar y mostrar "English"
3. Borra el texto
   - ✅ Debe mostrar todos los idiomas

### 4.4 Testing: Crear Nuevo Idioma

1. Haz clic en **"Nuevo Idioma"**
   - ✅ Se abre diálogo con título "Nuevo Idioma"
   
2. **Validaciones de formulario**:
   - Deja vacío el código ISO → Haz clic en Guardar
     - ✅ Debe mostrar error: "El código ISO es requerido"
   
   - Escribe "E" (1 carácter) → Guardar
     - ✅ Debe mostrar error: "El código ISO debe tener exactamente 2 caracteres"
   
   - Escribe "FRA" (3 caracteres) → Guardar
     - ✅ Debe mostrar error: "El código ISO debe tener exactamente 2 caracteres"
   
   - Escribe "FR" pero deja nombre vacío → Guardar
     - ✅ Debe mostrar error: "El nombre del idioma es requerido"

3. **Crear idioma válido**:
   - Código: `FR`
   - Nombre: `Français`
   - Estado Activo: ✅ ON
   - Predeterminado: ❌ OFF
   - Haz clic en **Guardar**
   - ✅ Debe mostrar toast verde: "Idioma creado exitosamente"
   - ✅ El diálogo se cierra
   - ✅ La tabla se recarga y muestra el nuevo idioma

### 4.5 Testing: Editar Idioma Existente

1. Haz clic en el botón **Editar** del idioma "Français"
   - ✅ Se abre diálogo con título "Editar Idioma"
   - ✅ El campo "Código ISO" está **bloqueado** (gris, con candado 🔒)
   
2. Intenta cambiar el código
   - ✅ No debe ser posible (campo disabled)

3. Cambia el nombre a "Francés"
   - ✅ El campo es editable
   
4. Guarda
   - ✅ Toast: "Idioma actualizado exitosamente"
   - ✅ El nombre se actualiza en la tabla

### 4.6 Testing: Idioma Predeterminado

1. Crea o edita un idioma
2. Activa el switch **"Idioma Predeterminado"**
3. Guarda
   - ✅ El idioma se marca como predeterminado (⭐ estrella)
   - ✅ El idioma anterior pierde el estado de predeterminado
   - ✅ Solo debe haber **UNO** con ⭐

### 4.7 Testing: Desactivar Idioma

1. Edita un idioma que **NO** sea predeterminado
2. Desactiva el switch **"Estado Activo"**
3. Guarda
   - ✅ El badge cambia a "Inactivo" (gris)
   - ✅ El idioma sigue visible en la tabla

### 4.8 ⚠️ Testing: NO HAY BOTÓN ELIMINAR

- [ ] Verifica que **NO existe** botón de basura (🗑️) en ninguna fila
- [ ] Verifica que **NO existe** opción "Eliminar" en ningún menú
- [ ] La única forma de "ocultar" un idioma es desactivándolo

---

## 📋 PASO 5: TESTING TAB "GRUPOS DE MENÚ"

### 5.1 Verificaciones Visuales

- [ ] Banner azul mostrando "Idiomas Activos (X)"
- [ ] Badges con los idiomas: ES (Predeterminado), EN, PT, FR
- [ ] Barra de búsqueda funcional
- [ ] Badge mostrando cantidad de grupos

### 5.2 Verificar Tabla de Grupos de Menú

**Columnas que deben aparecer**:
- [ ] Orden (número)
- [ ] Key Técnico (con candado 🔒, no editable)
- [ ] Nombre Base
- [ ] Traducciones (X / Y con ✅ si completo)
- [ ] Estado (Activo/Inactivo)
- [ ] Acciones (solo botón "Traducir", **NO hay botón eliminar**)

**Datos esperados** (grupos existentes):
- [ ] DASHBOARD
- [ ] PLANIFICACION
- [ ] ASISTENCIAS
- [ ] SEGURIDAD
- [ ] KIOSK
- [ ] (otros que tengas configurados)

### 5.3 Testing: Buscar Grupos de Menú

1. Escribe "SEGUR" en el buscador
   - ✅ Debe filtrar y mostrar solo "SEGURIDAD"
2. Escribe "dashboard"
   - ✅ Debe filtrar (case insensitive)
3. Borra el texto
   - ✅ Muestra todos

### 5.4 Testing: Editar Traducciones

1. Haz clic en **"Traducir"** en el grupo "DASHBOARD"
   - ✅ Se abre diálogo grande (max-w-3xl)
   - ✅ Título: "Traducciones: Dashboard" (o nombre del grupo)
   
2. **Verificar datos protegidos**:
   - ✅ Key Técnico: `DASHBOARD` (con candado 🔒)
   - ✅ Orden: Número (con candado 🔒)
   - ✅ Estos campos NO son editables

3. **Verificar inputs de traducción**:
   - ✅ Un input por cada idioma activo
   - ✅ Español (ES) - Badge "Predeterminado" azul
   - ✅ English (EN)
   - ✅ Português (PT)
   - ✅ Français (FR) - si lo creaste
   
4. **Editar traducciones**:
   - Español: "Panel Principal"
   - English: "Dashboard"
   - Português: "Painel Principal"
   - Français: "Tableau de bord"
   
5. Haz clic en **"Guardar Traducciones"**
   - ✅ Toast verde: "Traducciones actualizadas correctamente"
   - ✅ Diálogo se cierra
   - ✅ El contador de traducciones se actualiza: "4 / 4" ✅

### 5.5 Testing: Traducciones Incompletas

1. Busca un grupo que **NO** tenga todas las traducciones
   - ✅ El contador debe mostrar "X / 4" (donde X < 4)
   - ✅ **NO** debe aparecer el ícono ✅ verde

2. Haz clic en "Traducir"
3. Completa todas las traducciones faltantes
4. Guarda
   - ✅ El contador debe ser "4 / 4" ✅
   - ✅ Aparece el ícono verde de completado

### 5.6 ⚠️ Testing: Campos Protegidos

1. En el diálogo de traducciones, verifica:
   - [ ] Key Técnico tiene ícono 🔒
   - [ ] Orden tiene ícono 🔒
   - [ ] NO hay forma de editar estos campos
   - [ ] **NO existe** botón para cambiar el orden
   - [ ] **NO existe** botón para cambiar el ícono
   - [ ] **NO existe** botón eliminar

---

## 📋 PASO 6: TESTING TABS PENDIENTES

### 6.1 Tab "Pantallas"

- [ ] Click en el tab "Pantallas"
- [ ] Debe estar deshabilitado (opacity-50)
- [ ] Si logras hacer clic, muestra card gris con:
  - "Administración de Pantallas"
  - "Módulo en construcción..."

### 6.2 Tab "Acciones"

- [ ] Click en el tab "Acciones"
- [ ] Debe estar deshabilitado (opacity-50)
- [ ] Mensaje: "Módulo en construcción..."

### 6.3 Tab "Módulos"

- [ ] Click en el tab "Módulos"
- [ ] Debe estar deshabilitado (opacity-50)
- [ ] Mensaje: "Módulo en construcción..."

---

## 📋 PASO 7: TESTING RESPONSIVE

### 7.1 Mobile (< 640px)

1. Abre DevTools (F12) → Toggle device toolbar
2. Selecciona iPhone SE o similar
3. Verifica:
   - [ ] Los tabs se muestran en 2 columnas
   - [ ] El header es responsive
   - [ ] Las tablas tienen scroll horizontal
   - [ ] Los diálogos se ajustan al ancho

### 7.2 Tablet (768px - 1024px)

1. Selecciona iPad o similar
2. Verifica:
   - [ ] Los tabs se distribuyen bien
   - [ ] Las tablas son legibles
   - [ ] Los diálogos no ocupan todo el ancho

### 7.3 Desktop (> 1024px)

1. Vista normal de escritorio
2. Verifica:
   - [ ] Los tabs están en 5 columnas
   - [ ] Todo el contenido es visible sin scroll horizontal
   - [ ] Los diálogos tienen max-width apropiado

---

## 📋 PASO 8: TESTING DE SEGURIDAD

### 8.1 Acceso No Autorizado

1. **Cierra sesión**
2. Inicia sesión con un usuario **NO Super Admin** (tenant_id diferente)
3. Intenta acceder a la pantalla
   - ✅ Debe mostrar card roja: "Acceso Restringido"
   - ✅ Mensaje: "Solo los Super Administradores (GOD) pueden acceder..."

### 8.2 Verificar Console Logs

1. Abre la consola (F12)
2. Navega a la pantalla de Administración SYSTEM
3. Verifica logs:
   - ✅ "🌐 Cargando idiomas del sistema..."
   - ✅ "✅ X idiomas cargados"
   - ✅ "📋 Cargando grupos de menú..."
   - ✅ "✅ X grupos de menú cargados"
   - ✅ NO debe haber errores en rojo

### 8.3 Verificar Network Requests

1. Ve a la pestaña Network
2. Filtra por "supabase"
3. Verifica las requests:
   - ✅ `GET .../rest/v1/system_languages?...` → 200 OK
   - ✅ `GET .../rest/v1/system_menu_groups?...` → 200 OK
   - ✅ NO debe haber requests 401 (Unauthorized)
   - ✅ NO debe haber requests 500 (Server Error)

---

## 📋 PASO 9: TESTING DE INTEGRIDAD DE DATOS

### 9.1 Verificar que NO se pueden eliminar registros

```sql
-- Después de tu testing, verifica que NO se eliminaron registros
SELECT COUNT(*) as total_idiomas FROM system_languages;
SELECT COUNT(*) as total_grupos FROM system_menu_groups;
SELECT COUNT(*) as total_traducciones FROM system_menu_group_translations;
```

**Resultado esperado**: 
- Los totales deben ser **iguales o mayores** que al inicio
- **NUNCA** deben disminuir (solo pueden aumentar si agregaste idiomas)

### 9.2 Verificar integridad de idioma predeterminado

```sql
SELECT COUNT(*) as idiomas_predeterminados 
FROM system_languages 
WHERE is_default = true;
```

**Resultado esperado**: Exactamente `1` idioma predeterminado

### 9.3 Verificar traducciones completas

```sql
SELECT 
  smg.menu_group_key,
  COUNT(smgt.id) as traducciones,
  (SELECT COUNT(*) FROM system_languages WHERE is_active = true) as idiomas_activos,
  CASE 
    WHEN COUNT(smgt.id) = (SELECT COUNT(*) FROM system_languages WHERE is_active = true)
    THEN '✅ COMPLETO'
    ELSE '⚠️ INCOMPLETO'
  END as status
FROM system_menu_groups smg
LEFT JOIN system_menu_group_translations smgt ON smg.id = smgt.menu_group_id
GROUP BY smg.id, smg.menu_group_key
ORDER BY smg.sort_order;
```

**Resultado esperado**: Idealmente todos deberían estar '✅ COMPLETO'

---

## 📋 PASO 10: TESTING DE CASOS EDGE

### 10.1 Códigos ISO Duplicados

1. Intenta crear un idioma con código que ya existe (ej: "ES")
2. Haz clic en Guardar
   - ✅ Debe mostrar error de Supabase (duplicate key)
   - ✅ El diálogo NO se cierra
   - ✅ El error se muestra en toast

### 10.2 Nombres Largos

1. Crea un idioma con nombre muy largo (100+ caracteres)
2. Verifica:
   - ✅ Se guarda correctamente
   - ✅ La tabla maneja bien el texto largo
   - ✅ No rompe el diseño

### 10.3 Caracteres Especiales

1. Crea un idioma con nombre: "日本語 (Japonés)"
2. Verifica:
   - ✅ Se guarda con los caracteres especiales
   - ✅ Se muestra correctamente en la tabla
   
### 10.4 Cambiar Predeterminado Múltiples Veces

1. Marca "ES" como predeterminado → Guarda
2. Marca "EN" como predeterminado → Guarda
3. Marca "PT" como predeterminado → Guarda
4. Verifica:
   - ✅ Solo "PT" tiene la estrella ⭐
   - ✅ Solo hay 1 registro con `is_default = true` en BD

---

## ✅ CHECKLIST FINAL DE CONTROL DE CALIDAD

### Funcionalidad
- [ ] Se cargan correctamente los idiomas
- [ ] Se cargan correctamente los grupos de menú
- [ ] Se puede crear un nuevo idioma
- [ ] Se puede editar un idioma existente
- [ ] Se pueden editar traducciones de grupos de menú
- [ ] NO se pueden eliminar idiomas ✅
- [ ] NO se pueden eliminar grupos de menú ✅
- [ ] NO se pueden editar campos técnicos (keys, orden) ✅

### UI/UX
- [ ] Los colores son consistentes (#0074D9 primario)
- [ ] Los íconos son apropiados (lucide-react)
- [ ] Los botones tienen estados hover/active
- [ ] Los spinners de loading funcionan
- [ ] Los toast messages aparecen correctamente
- [ ] Los badges usan los colores correctos
- [ ] Los diálogos son responsive
- [ ] El layout es limpio y profesional

### Seguridad
- [ ] Solo Super Admin puede acceder
- [ ] Se muestra mensaje de error para no autorizados
- [ ] Los campos protegidos están bloqueados
- [ ] NO hay botones de eliminar
- [ ] Las validaciones del frontend funcionan

### Integridad de Datos
- [ ] Solo 1 idioma predeterminado
- [ ] Los códigos ISO no se pueden cambiar
- [ ] Las traducciones se persisten correctamente
- [ ] No se pierden datos al editar

### Performance
- [ ] La carga inicial es rápida (< 2 segundos)
- [ ] El guardado es rápido (< 1 segundo)
- [ ] NO hay requests innecesarias
- [ ] NO hay memory leaks (verificar en DevTools)

---

## 🐛 REPORTE DE BUGS

Si encuentras algún bug, documéntalo así:

### Formato de Bug Report

```
🐛 BUG: [Título corto]

📍 Ubicación: Tab Idiomas / Tab Grupos de Menú
🔄 Reproducir:
1. Paso 1
2. Paso 2
3. Paso 3

✅ Esperado: Lo que debería pasar
❌ Actual: Lo que pasa realmente

🖼️ Screenshot: (si aplica)
💻 Console Error: (si aplica)
```

---

## 🎉 FELICITACIONES

Si completaste todos los tests exitosamente, ¡el módulo está listo para producción! 🚀

**Próximos pasos sugeridos**:
1. Implementar los módulos pendientes (Pantallas, Acciones, Módulos)
2. Agregar más idiomas según necesidad
3. Completar traducciones de todos los grupos de menú
4. Documentar el proceso de agregar nuevos idiomas para el equipo

---

**¿Encontraste algo que mejorar? ¡Excelente! Ese es el propósito del control de calidad.** 💪

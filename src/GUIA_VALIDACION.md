# 🔍 GUÍA DE VALIDACIÓN - get_user_screens()

## 🎯 Objetivo
Validar que la función `get_user_screens()` funcione correctamente y devuelva todos los campos necesarios.

---

## 📝 INSTRUCCIONES

### 1️⃣ Abrir Supabase SQL Editor
- Ve a tu proyecto en Supabase
- Click en **SQL Editor** (icono de base de datos)
- Click en **New Query**

### 2️⃣ Ejecutar Script de Diagnóstico
- Copia TODO el contenido de `/DIAGNOSTICO_get_user_screens.sql`
- Pégalo en el editor
- Click en **RUN** o presiona `Ctrl+Enter`

### 3️⃣ Interpretar Resultados

---

## ✅ RESULTADOS ESPERADOS (Todo OK)

### **PASO 1: Verificar función existe**
```
nombre_funcion      | tipo     | tipo_retorno
--------------------|----------|-------------
get_user_screens    | FUNCTION | record
```
✅ **ÉXITO:** La función existe

---

### **PASO 2: Parámetros de entrada**
```
nombre_parametro | tipo_dato | modo
-----------------|-----------|-----
p_user_id        | uuid      | IN
p_tenant_id      | uuid      | IN
```
✅ **ÉXITO:** La función recibe 2 UUIDs (user_id y tenant_id)

---

### **PASO 3: Campos de salida**
```
nombre_campo      | tipo_dato           | posicion
------------------|---------------------|----------
menu_group_key    | character varying   | 1
menu_group_name   | character varying   | 2
menu_group_icon   | character varying   | 3  ← IMPORTANTE
menu_group_sort   | integer             | 4
screen_id         | uuid                | 5
screen_key        | character varying   | 6
screen_name       | character varying   | 7
screen_icon_key   | character varying   | 8  ← IMPORTANTE
route_path        | character varying   | 9  ← IMPORTANTE
screen_sort       | integer             | 10
can_view          | boolean             | 11
can_create        | boolean             | 12
can_update        | boolean             | 13
can_delete        | boolean             | 14
can_export        | boolean             | 15
```
✅ **ÉXITO:** La función devuelve 15 campos (incluyendo los 3 nuevos)

---

### **PASO 4-5: Estructura de tablas**
Debe mostrar que las columnas `icon_key` existen en ambas tablas:
- ✅ `system_menu_groups.icon_key`
- ✅ `screens.icon_key`
- ✅ `screens.route_path`

---

### **PASO 6: Usuario admin existe**
```
id                   | email                      | tenant_id
---------------------|----------------------------|--------------------
uuid-123...          | admin@turnos-titanium.com  | uuid-456...
```
✅ **ÉXITO:** El usuario existe

---

### **PASO 7: Ejemplo system_menu_groups**
```
menu_group_key | menu_group_name | icon_key          | sort_order
---------------|-----------------|-------------------|------------
DASHBOARD      | Dashboard       | LayoutDashboard   | 1
STRUCTURE      | Estructura      | Building2         | 2
EMPLOYEES      | Empleados       | Users             | 3
```
✅ **ÉXITO:** Los grupos tienen icon_key con valores de Lucide React

---

### **PASO 8: Ejemplo screens**
```
screen_key  | screen_name  | icon_key       | route_path   | sort_order
------------|--------------|----------------|--------------|------------
INCIDENTS   | Incidencias  | AlertTriangle  | /incidents   | 1
CALENDAR    | Calendario   | Calendar       | /calendar    | 2
COMPANIES   | Empresas     | Building       | /companies   | 1
```
✅ **ÉXITO:** Las pantallas tienen icon_key y route_path

---

### **PASO 9: 🚀 Ejecutar la función**
```
menu_group_key | menu_group_icon | screen_key | screen_icon_key | route_path  | can_view
---------------|-----------------|------------|-----------------|-------------|----------
DASHBOARD      | LayoutDashboard | INCIDENTS  | AlertTriangle   | /incidents  | true
DASHBOARD      | LayoutDashboard | CALENDAR   | Calendar        | /calendar   | true
STRUCTURE      | Building2       | COMPANIES  | Building        | /companies  | true
```
✅ **ÉXITO:** La función retorna datos con TODOS los campos

---

### **PASO 10: Total de pantallas**
```
total_pantallas | total_grupos
----------------|-------------
55              | 9
```
✅ **ÉXITO:** Deberías ver ~55 pantallas en 9 grupos

---

### **PASO 11: Verificar íconos NO NULL**
```
total_pantallas | iconos_grupo_null | iconos_screen_null | route_path_null
----------------|-------------------|--------------------|-----------------
55              | 0                 | 0                  | 0
```
✅ **ÉXITO:** Ningún ícono debe ser NULL

---

### **PASO 12: Todas las pantallas**
Muestra TODAS las 55 pantallas ordenadas por grupo y orden.

---

## ❌ PROBLEMAS COMUNES Y SOLUCIONES

### ❌ PASO 1 No retorna nada
**Problema:** La función no existe  
**Solución:** Ejecutar `/10_DEFINITIVO_corregir_get_user_screens.sql`

### ❌ PASO 3 No muestra screen_icon_key o route_path
**Problema:** La función es una versión vieja  
**Solución:** Ejecutar `/10_DEFINITIVO_corregir_get_user_screens.sql`

### ❌ PASO 4-5 No muestra icon_key
**Problema:** Las tablas no tienen la columna  
**Solución:** Verificar los scripts DDL iniciales (01, 02, 03, etc.)

### ❌ PASO 7-8 Retorna filas vacías
**Problema:** Las tablas no están pobladas  
**Solución:** Ejecutar los scripts de INSERT (04, 05, 06, etc.)

### ❌ PASO 9 Da error
**Problema:** Error en la función SQL  
**Solución:** Ver el mensaje de error y revisar la sintaxis SQL

### ❌ PASO 11 Muestra NULLs > 0
**Problema:** Algunos icon_key están NULL en la BD  
**Solución:** Ejecutar UPDATE para poblar los campos faltantes

---

## 🎯 VALIDACIÓN FINAL

Si **TODOS** los pasos retornan datos correctos:

✅ La función `get_user_screens()` está funcionando perfectamente  
✅ Puedes proceder a probar el frontend  
✅ Los íconos se mostrarán correctamente en el menú  

Si **ALGÚN** paso falla:

❌ Revisar la sección "PROBLEMAS COMUNES"  
❌ Ejecutar los scripts de corrección necesarios  
❌ Volver a ejecutar el diagnóstico  

---

## 🚀 PRÓXIMO PASO

Una vez que TODOS los pasos sean exitosos:

1. ✅ Ir al frontend (navegador)
2. ✅ Hacer **hard refresh** (`Ctrl+Shift+R` o `Cmd+Shift+R`)
3. ✅ Login con `admin@turnos-titanium.com`
4. ✅ Verificar que el menú lateral muestre los íconos correctos

---

## 💡 TIP: Ver los íconos en tiempo real

En el **PASO 12**, los campos importantes son:

- `menu_group_icon` → Ejemplo: `"LayoutDashboard"`
- `screen_icon_key` → Ejemplo: `"AlertTriangle"`

Estos valores deben coincidir con los nombres de componentes de **Lucide React**.

Puedes verificar que existen en: https://lucide.dev/icons/

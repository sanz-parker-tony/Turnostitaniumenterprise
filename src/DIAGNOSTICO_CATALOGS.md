# 🔍 **DIAGNÓSTICO - Error Cargando Catálogos**

## ❌ **ERROR REPORTADO:**
```
Error cargando catálogos: Error: Error cargando catálogos desde el backend
```

---

## 🛠️ **PASOS DE DIAGNÓSTICO**

### **1️⃣ Verificar Estructura Organizacional (Paso 3)**

El error más común es que **NO se haya completado el Paso 3** o que no haya datos en las tablas.

**Ejecutar en Supabase SQL Editor:**

```sql
-- ========================================
-- VERIFICAR TENANT
-- ========================================
SELECT 
  id, 
  tenant_name, 
  created_at 
FROM tenants 
ORDER BY created_at ASC 
LIMIT 1;

-- ========================================
-- VERIFICAR DEPARTAMENTOS
-- ========================================
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as activos
FROM departments;

SELECT * FROM departments WHERE is_active = true LIMIT 5;

-- ========================================
-- VERIFICAR CARGOS
-- ========================================
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as activos
FROM job_titles;

SELECT * FROM job_titles WHERE is_active = true LIMIT 5;

-- ========================================
-- VERIFICAR ÁREAS
-- ========================================
SELECT COUNT(*) FROM areas WHERE is_active = true;

-- ========================================
-- VERIFICAR CENTROS DE COSTO
-- ========================================
SELECT COUNT(*) FROM cost_centers WHERE is_active = true;

-- ========================================
-- VERIFICAR UBICACIONES
-- ========================================
SELECT COUNT(*) FROM work_locations WHERE is_active = true;

-- ========================================
-- VERIFICAR GRUPOS
-- ========================================
SELECT COUNT(*) FROM work_groups WHERE is_active = true;

-- ========================================
-- VERIFICAR ROLES DE PAGO
-- ========================================
SELECT COUNT(*) FROM payroll_groups WHERE is_active = true;

-- ========================================
-- VERIFICAR PERFILES DE EMPLEADOS
-- ========================================
SELECT COUNT(*) FROM employee_profiles WHERE is_active = true;

-- ========================================
-- VERIFICAR LOOKUP GROUPS
-- ========================================
SELECT * FROM lookup_groups;

-- ========================================
-- VERIFICAR LOOKUP VALUES (GENDER)
-- ========================================
SELECT lv.* 
FROM lookup_values lv
INNER JOIN lookup_groups lg ON lg.id = lv.lookup_group_id
WHERE lg.lookup_group_key = 'GENDER';

-- ========================================
-- VERIFICAR LOOKUP VALUES (CONTRACT_TYPE)
-- ========================================
SELECT lv.* 
FROM lookup_values lv
INNER JOIN lookup_groups lg ON lg.id = lv.lookup_group_id
WHERE lg.lookup_group_key = 'CONTRACT_TYPE';
```

---

### **2️⃣ Verificar Logs del Backend**

**Abrir la consola del Edge Function en Supabase:**

1. Ir a **Edge Functions** → **make-server-e19f2094**
2. Ver **Logs**
3. Buscar el log de la llamada a `/bootstrap/catalogs`

**Buscar mensajes como:**
- ✅ `📊 Bootstrap Catalogs: Obteniendo todos los catálogos...`
- ✅ `✅ Tenant localizado: [UUID]`
- ⚠️ `⚠️ Lookup group GENDER no encontrado`
- ❌ `❌ Error en getBootstrapCatalogs: [mensaje]`

---

### **3️⃣ Verificar Token de Bootstrap**

**Ejecutar en consola del navegador:**

```javascript
console.log('Bootstrap Token:', localStorage.getItem('bootstrapToken'));
```

**Debe retornar algo como:**
```
bootstrap_abc123def456ghi789
```

Si retorna `null`, el wizard no se inició correctamente.

---

### **4️⃣ Probar Endpoint Manualmente**

**Ejecutar en consola del navegador:**

```javascript
// Obtener configuración
const projectId = 'YOUR_PROJECT_ID'; // Reemplazar con tu project ID
const publicAnonKey = 'YOUR_ANON_KEY'; // Reemplazar con tu anon key
const bootstrapToken = localStorage.getItem('bootstrapToken');

// Llamar endpoint
fetch(`https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/bootstrap/catalogs`, {
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
    'X-Bootstrap-Token': bootstrapToken
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Respuesta de catálogos:', data);
})
.catch(err => {
  console.error('❌ Error:', err);
});
```

---

### **5️⃣ Verificar que el Endpoint Existe**

**Probar el health check:**

```javascript
fetch(`https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/health`)
.then(res => res.json())
.then(data => {
  console.log('✅ Health check:', data);
});
```

---

## 🎯 **SOLUCIONES SEGÚN EL PROBLEMA**

### **❌ PROBLEMA: "Tenant no encontrado"**

**Causa:** No se ha ejecutado el Paso 1 del wizard.

**Solución:**
```sql
-- Verificar si existe tenant
SELECT * FROM tenants;

-- Si no existe, reiniciar wizard desde el Paso 1
```

---

### **❌ PROBLEMA: "No hay departamentos o cargos"**

**Causa:** No se ha completado el Paso 3.

**Solución:**
1. Volver al Paso 3 del wizard
2. Cargar departamentos (al menos 1)
3. Cargar cargos (al menos 1)
4. Volver al Paso 4

---

### **❌ PROBLEMA: "Lookup groups no encontrados"**

**Causa:** No se ha ejecutado el script SQL de lookups.

**Solución:**

**Ejecutar en Supabase SQL Editor:**

```sql
-- ========================================
-- SEED: LOOKUP GROUPS & VALUES
-- ========================================

-- 1. Insertar Lookup Groups
INSERT INTO lookup_groups (lookup_group_key, lookup_group_name, lookup_group_description, sort_order)
VALUES 
  ('GENDER', 'Género', 'Género de empleados', 10),
  ('CONTRACT_TYPE', 'Tipo de Contrato', 'Tipos de contrato laboral', 20)
ON CONFLICT (lookup_group_key) DO NOTHING;

-- 2. Insertar Lookup Values para GENDER
INSERT INTO lookup_values (lookup_group_id, lookup_key, lookup_label, lookup_description, sort_order)
SELECT 
  lg.id,
  'MASCULINO',
  'Masculino',
  'Género masculino',
  10
FROM lookup_groups lg
WHERE lg.lookup_group_key = 'GENDER'
ON CONFLICT DO NOTHING;

INSERT INTO lookup_values (lookup_group_id, lookup_key, lookup_label, lookup_description, sort_order)
SELECT 
  lg.id,
  'FEMENINO',
  'Femenino',
  'Género femenino',
  20
FROM lookup_groups lg
WHERE lg.lookup_group_key = 'GENDER'
ON CONFLICT DO NOTHING;

INSERT INTO lookup_values (lookup_group_id, lookup_key, lookup_label, lookup_description, sort_order)
SELECT 
  lg.id,
  'OTRO',
  'Otro',
  'Otro género',
  30
FROM lookup_groups lg
WHERE lg.lookup_group_key = 'GENDER'
ON CONFLICT DO NOTHING;

-- 3. Insertar Lookup Values para CONTRACT_TYPE
INSERT INTO lookup_values (lookup_group_id, lookup_key, lookup_label, lookup_description, sort_order)
SELECT 
  lg.id,
  'INDEFINIDO',
  'Contrato Indefinido',
  'Contrato por tiempo indefinido',
  10
FROM lookup_groups lg
WHERE lg.lookup_group_key = 'CONTRACT_TYPE'
ON CONFLICT DO NOTHING;

INSERT INTO lookup_values (lookup_group_id, lookup_key, lookup_label, lookup_description, sort_order)
SELECT 
  lg.id,
  'PLAZO_FIJO',
  'Contrato a Plazo Fijo',
  'Contrato por tiempo determinado',
  20
FROM lookup_groups lg
WHERE lg.lookup_group_key = 'CONTRACT_TYPE'
ON CONFLICT DO NOTHING;

INSERT INTO lookup_values (lookup_group_id, lookup_key, lookup_label, lookup_description, sort_order)
SELECT 
  lg.id,
  'TEMPORAL',
  'Contrato Temporal',
  'Contrato temporal o por proyecto',
  30
FROM lookup_groups lg
WHERE lg.lookup_group_key = 'CONTRACT_TYPE'
ON CONFLICT DO NOTHING;

INSERT INTO lookup_values (lookup_group_id, lookup_key, lookup_label, lookup_description, sort_order)
SELECT 
  lg.id,
  'PASANTIA',
  'Pasantía',
  'Contrato de pasantía o prácticas',
  40
FROM lookup_groups lg
WHERE lg.lookup_group_key = 'CONTRACT_TYPE'
ON CONFLICT DO NOTHING;

-- 4. Verificar que se insertaron
SELECT 
  lg.lookup_group_name,
  COUNT(lv.id) as total_valores
FROM lookup_groups lg
LEFT JOIN lookup_values lv ON lv.lookup_group_id = lg.id
WHERE lg.lookup_group_key IN ('GENDER', 'CONTRACT_TYPE')
GROUP BY lg.id, lg.lookup_group_name;
```

---

### **❌ PROBLEMA: "Error HTTP 500"**

**Causa:** Error interno del servidor.

**Solución:**
1. Ver logs del Edge Function en Supabase
2. Buscar el stack trace del error
3. Verificar que todas las tablas existen
4. Verificar permisos de las tablas

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

Marque cada item verificado:

- [ ] Existe al menos 1 tenant en la tabla `tenants`
- [ ] Existe al menos 1 departamento activo
- [ ] Existe al menos 1 cargo activo
- [ ] Existe lookup_group 'GENDER'
- [ ] Existe lookup_group 'CONTRACT_TYPE'
- [ ] Existen lookup_values para GENDER (3 mínimo)
- [ ] Existen lookup_values para CONTRACT_TYPE (4 mínimo)
- [ ] El Edge Function está desplegado
- [ ] El token de bootstrap está en localStorage
- [ ] La ruta `/bootstrap/catalogs` existe en index.tsx

---

## 🚀 **SI TODO FALLA...**

**Reiniciar el Wizard completo:**

```javascript
// Ejecutar en consola del navegador
localStorage.clear();
location.reload();
```

Luego:
1. Iniciar wizard desde el Paso 1
2. Completar Paso 1 (Tenant)
3. Completar Paso 2 (Company)
4. Completar Paso 3 (Work Locations)
5. **Completar Paso 3 - Estructura Organizacional (IMPORTANTE)**
   - Cargar al menos 1 departamento
   - Cargar al menos 1 cargo
6. Llegar al Paso 4 (Empleados)

---

**¿Cuál de estos problemas está encontrando? Por favor comparte:**
1. ✅ Resultado de las queries SQL
2. ✅ Logs del Edge Function
3. ✅ Respuesta del endpoint en consola del navegador

¡Con esa información podré ayudarte mejor! 💎

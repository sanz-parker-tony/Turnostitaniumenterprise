# 🗄️ SETUP DE BASE DE DATOS - Turnos Titanium Enterprise

## ❌ **ERROR ACTUAL:**

```
❌ Error al obtener tenant SYSTEM: {
  "code": "PGRST116",
  "details": "The result contains 0 rows",
  "hint": null,
  "message": "Cannot coerce the result to a single JSON object"
}
```

**Causa:** La base de datos está vacía. No se han ejecutado las migraciones SQL.

---

## ✅ **SOLUCIÓN: Ejecutar Migraciones SQL**

### **Paso 1: Ir a Supabase SQL Editor**

1. Abre tu proyecto en Supabase Dashboard
2. Ve a **SQL Editor** (icono de base de datos en el menú lateral)
3. Crea una nueva query

### **Paso 2: Ejecutar FACTORY RESET (Opcional)**

**Solo si necesitas limpiar la base de datos:**

```sql
-- Copiar TODO el contenido de /supabase/migrations/001_FACTORY_RESET.sql
-- Pegar en el SQL Editor
-- Hacer clic en "Run"
```

⚠️ **ADVERTENCIA:** Esto eliminará TODOS los datos existentes.

### **Paso 3: Ejecutar SEED (OBLIGATORIO)**

**Para crear el tenant SYSTEM y datos base:**

```sql
-- Copiar TODO el contenido de /supabase/migrations/002_SEED_COMPLETE.sql
-- Pegar en el SQL Editor
-- Hacer clic en "Run"
```

### **Paso 4: Verificar que funcionó**

Ejecuta esta query para verificar:

```sql
SELECT 
  (SELECT COUNT(*) FROM tenants WHERE tenant_key = 'SYSTEM') as tenant_system,
  (SELECT COUNT(*) FROM roles WHERE is_system_role = true) as roles_base,
  (SELECT COUNT(*) FROM users WHERE email = 'system.admin@titanium-labs.com') as usuario_bootstrap,
  (SELECT COUNT(*) FROM system_menu_groups) as menu_groups,
  (SELECT COUNT(*) FROM screens) as pantallas,
  (SELECT COUNT(*) FROM actions) as acciones;
```

**Resultado esperado:**

| tenant_system | roles_base | usuario_bootstrap | menu_groups | pantallas | acciones |
|---------------|------------|-------------------|-------------|-----------|----------|
| 1             | 5          | 1                 | 9           | 32        | 28       |

---

## 🔐 **CREDENCIALES INICIALES**

Después de ejecutar el seed, podrás iniciar sesión con:

```
Email: system.admin@titanium-labs.com
Password: Titanium2026!
```

⚠️ **IMPORTANTE:** El sistema te pedirá cambiar la contraseña en el primer login.

---

## 🛠️ **TROUBLESHOOTING**

### Error: "relation does not exist"

**Causa:** No se ejecutó el DDL (000_DDL_REAL.sql)

**Solución:** Ejecutar el DDL primero (crear las tablas)

### Error: "duplicate key value violates unique constraint"

**Causa:** Ya ejecutaste el seed antes

**Solución:** 
1. Ejecutar 001_FACTORY_RESET.sql para limpiar
2. Volver a ejecutar 002_SEED_COMPLETE.sql

### Error: "permission denied"

**Causa:** Usuario sin permisos de escritura en la base de datos

**Solución:** Asegúrate de estar usando el SQL Editor de Supabase Dashboard (tiene permisos completos)

---

## 📋 **RESUMEN DE ARCHIVOS DE MIGRACIÓN**

| Archivo | Propósito | Cuándo ejecutar |
|---------|-----------|-----------------|
| `000_DDL_REAL.sql` | Crea todas las tablas (~70) | Solo si la BD está vacía |
| `001_FACTORY_RESET.sql` | Limpia todos los datos | Cuando necesites resetear |
| `002_SEED_COMPLETE.sql` | Inserta datos base | Después de DDL o RESET |

---

## ✅ **CHECKLIST DE SETUP**

- [ ] Abrir Supabase SQL Editor
- [ ] Ejecutar 002_SEED_COMPLETE.sql (si las tablas ya existen)
- [ ] Verificar con la query de verificación
- [ ] Refrescar la aplicación (F5)
- [ ] Iniciar sesión con `system.admin@titanium-labs.com`
- [ ] Cambiar contraseña
- [ ] Completar wizard de 2 pasos

---

## 🎯 **PRÓXIMOS PASOS**

Una vez ejecutadas las migraciones:

1. ✅ La pantalla de login debería aparecer
2. ✅ Iniciar sesión con las credenciales bootstrap
3. ✅ Cambiar contraseña (obligatorio)
4. ✅ Completar wizard para crear primer tenant
5. ✅ Crear usuario TENANT_ADMIN
6. ✅ ¡Sistema listo para usar!

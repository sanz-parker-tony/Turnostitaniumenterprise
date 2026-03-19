# ⏱️ GUÍA DE EJECUCIÓN DE MIGRACIONES SQL

## 📊 TIEMPOS DE EJECUCIÓN ESTIMADOS

### Resumen Rápido

```
┌────────────────────────────────────────────────────────────┐
│ ARCHIVO                    │ TIEMPO   │ OPERACIONES       │
├────────────────────────────────────────────────────────────┤
│ 001_FACTORY_RESET.sql      │ 2-5 seg  │ DROP + TRUNCATE   │
│ 002_SEED_COMPLETE.sql      │ 10-20 seg│ CREATE + INSERT   │
│ 003_TENANT_PROTECTION.sql  │ 2-3 seg  │ TRIGGERS + CHECK  │
├────────────────────────────────────────────────────────────┤
│ TOTAL                      │ ~20-30 seg                    │
└────────────────────────────────────────────────────────────┘
```

---

## 📝 DETALLES POR ARCHIVO

### 1️⃣ `001_FACTORY_RESET.sql`

**Tiempo:** 2-5 segundos  
**Propósito:** Limpiar completamente la base de datos

```sql
-- Operaciones:
-- ✅ DROP CASCADE de ~25 tablas
-- ✅ DROP de funciones y triggers
-- ✅ TRUNCATE de auth.users
-- ✅ Resetear secuencias

-- Factores que afectan el tiempo:
-- • Cantidad de datos existentes (más datos = más tiempo)
-- • Cascadas de foreign keys
-- • Triggers que se deben eliminar
```

**Resultado esperado en consola:**
```
============================================================================
001_FACTORY_RESET.sql - LIMPIEZA COMPLETA
============================================================================
✅ [001] Schema limpiado correctamente
✅ [001] Tablas eliminadas: 25
✅ [001] Funciones eliminadas: 3
✅ [001] auth.users limpiado
============================================================================
ADVERTENCIA: Esta operación es IRREVERSIBLE
Todos los datos han sido eliminados
============================================================================
```

---

### 2️⃣ `002_SEED_COMPLETE.sql`

**Tiempo:** 10-20 segundos  
**Propósito:** Crear todas las tablas y poblar datos iniciales

```sql
-- Operaciones:
-- ✅ Crear 25+ tablas (tenants, users, roles, permissions, etc.)
-- ✅ Crear foreign keys y constraints
-- ✅ Insertar 1 tenant (SYSTEM)
-- ✅ Insertar 5 roles base (SYSTEM_ADMIN, TENANT_ADMIN, HR_ADMIN, SUPERVISOR, EMPLOYEE)
-- ✅ Insertar ~80 permisos granulares
-- ✅ Insertar ~50 lookup_values (catálogos del sistema)
-- ✅ Crear views
-- ✅ Crear triggers

-- Factores que afectan el tiempo:
-- • Cantidad de inserts (~150-200 registros)
-- • Validaciones de constraints
-- • Creación de índices
```

**Resultado esperado en consola:**
```
============================================================================
002_SEED_COMPLETE.sql - INICIALIZACIÓN COMPLETA
============================================================================
✅ [002] Tabla tenants creada (1 registro)
✅ [002] Tabla roles creada (5 registros)
✅ [002] Tabla permissions creada (80 registros)
✅ [002] Tabla role_permissions creada (80 registros)
✅ [002] Tabla lookup_groups creada (10 registros)
✅ [002] Tabla lookup_values creada (50 registros)
✅ [002] Tabla tenant_onboarding creada (1 registro)
...
✅ [002] Todas las tablas creadas exitosamente
✅ [002] Datos seed insertados correctamente
============================================================================
PRÓXIMO PASO: Ejecutar 003_TENANT_PROTECTION.sql
============================================================================
```

---

### 3️⃣ `003_TENANT_PROTECTION.sql`

**Tiempo:** 2-3 segundos  
**Propósito:** Sellar el sistema con protecciones a nivel de BD

```sql
-- Operaciones:
-- ✅ Crear CHECK constraint (enforce_single_tenant)
-- ✅ Crear trigger para bloquear INSERT en tenants
-- ✅ Crear trigger para bloquear DELETE en tenants
-- ✅ Validar que existe exactamente 1 tenant

-- Factores que afectan el tiempo:
-- • Validación de integridad (muy rápida)
-- • Creación de triggers (instantánea)
```

**Resultado esperado en consola:**
```
============================================================================
003_TENANT_PROTECTION.sql - SELLADO DE TENANT ÚNICO
============================================================================
✅ [003] Constraint enforce_single_tenant creado
✅ [003] Trigger trigger_prevent_tenant_insert creado (bloquea nuevos tenants)
✅ [003] Trigger trigger_prevent_tenant_delete creado (bloquea eliminación)

========================================
✅ PROTECCIÓN DE TENANT INSTALADA
========================================
Tenants en el sistema: 1
Tenant SYSTEM existe: true

🛡️ PROTECCIONES ACTIVAS:
  1. ✅ CHECK constraint: máximo 1 tenant activo
  2. ✅ TRIGGER: bloquea INSERT de nuevos tenants
  3. ✅ TRIGGER: bloquea DELETE de tenants

✅ Sistema validado correctamente
========================================
============================================================================
```

---

## 🚀 INSTRUCCIONES DE EJECUCIÓN

### Opción A: Desde psql (línea de comandos)

```bash
# 1. Conectar a la base de datos
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# 2. Ejecutar archivos en orden
\i supabase/migrations/001_FACTORY_RESET.sql
\i supabase/migrations/002_SEED_COMPLETE.sql
\i supabase/migrations/003_TENANT_PROTECTION.sql

# 3. Verificar que todo está correcto
SELECT COUNT(*) FROM tenants;  -- Debe retornar: 1
```

### Opción B: Desde Supabase SQL Editor

1. **Abre Supabase Dashboard** → https://supabase.com/dashboard
2. **Ve a tu proyecto** → SQL Editor
3. **Ejecuta cada archivo en orden:**

   **Paso 1:** Copia y pega `001_FACTORY_RESET.sql` → Click "Run"
   - ⏱️ Espera 5 segundos
   - ✅ Verifica que no hay errores

   **Paso 2:** Copia y pega `002_SEED_COMPLETE.sql` → Click "Run"
   - ⏱️ Espera 15-20 segundos
   - ✅ Verifica que dice "✅ [002] Todas las tablas creadas"

   **Paso 3:** Copia y pega `003_TENANT_PROTECTION.sql` → Click "Run"
   - ⏱️ Espera 3 segundos
   - ✅ Verifica que dice "✅ PROTECCIÓN DE TENANT INSTALADA"

4. **Verificación final:**
   ```sql
   SELECT COUNT(*) as tenant_count FROM tenants;
   -- Resultado esperado: 1
   
   SELECT tenant_key, tenant_name FROM tenants;
   -- Resultado esperado: SYSTEM | (nombre pendiente)
   ```

### Opción C: Script automatizado

```bash
#!/bin/bash
# ejecutar_migraciones.sh

DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

echo "🚀 Ejecutando migraciones..."
echo ""

echo "📝 Paso 1/3: Factory Reset (limpieza completa)..."
psql "$DB_URL" -f supabase/migrations/001_FACTORY_RESET.sql
echo ""

echo "📝 Paso 2/3: Seed Complete (creación de tablas y datos)..."
psql "$DB_URL" -f supabase/migrations/002_SEED_COMPLETE.sql
echo ""

echo "📝 Paso 3/3: Tenant Protection (sellado de seguridad)..."
psql "$DB_URL" -f supabase/migrations/003_TENANT_PROTECTION.sql
echo ""

echo "✅ Migraciones completadas"
echo ""
echo "🔍 Verificando integridad..."
psql "$DB_URL" -c "SELECT COUNT(*) as tenant_count FROM tenants;"
```

---

## ⚠️ ERRORES COMUNES Y SOLUCIONES

### Error 1: "Permission denied"

**Mensaje:**
```
ERROR:  permission denied for schema public
```

**Solución:**
- Verifica que estás usando el usuario `postgres` (no el service_role)
- En Supabase SQL Editor, esto no debería pasar

---

### Error 2: "Relation already exists"

**Mensaje:**
```
ERROR:  relation "tenants" already exists
```

**Solución:**
- Ejecuta `001_FACTORY_RESET.sql` primero
- Si persiste: ejecuta manualmente `DROP TABLE IF EXISTS tenants CASCADE;`

---

### Error 3: "Tenants count > 1"

**Mensaje:**
```
❌ ERROR: Existen 2 tenants pero solo debe haber UNO
```

**Solución:**
```sql
-- 1. Verificar cuántos tenants hay
SELECT id, tenant_key, tenant_name FROM tenants;

-- 2. Si hay más de 1, resetear completamente
\i supabase/migrations/001_FACTORY_RESET.sql
\i supabase/migrations/002_SEED_COMPLETE.sql
\i supabase/migrations/003_TENANT_PROTECTION.sql
```

---

### Error 4: Timeout o "Query took too long"

**Síntomas:**
- El SQL Editor se queda "cargando" por más de 30 segundos

**Soluciones:**
1. **Ejecuta por partes:** Copia solo 100 líneas a la vez
2. **Usa psql:** Es más rápido que el SQL Editor web
3. **Verifica conexión:** Puede ser problema de red

---

## 🔍 VERIFICACIÓN POST-INSTALACIÓN

Después de ejecutar las 3 migraciones, verifica lo siguiente:

### Query 1: Contar tenants
```sql
SELECT COUNT(*) as tenant_count FROM public.tenants;
-- ✅ Resultado esperado: 1
```

### Query 2: Verificar tenant SYSTEM
```sql
SELECT id, tenant_key, tenant_name, is_active 
FROM public.tenants 
WHERE tenant_key = 'SYSTEM';
-- ✅ Debe retornar 1 fila
```

### Query 3: Contar roles
```sql
SELECT COUNT(*) as role_count FROM public.roles;
-- ✅ Resultado esperado: 5
```

### Query 4: Verificar roles creados
```sql
SELECT role_key, role_name FROM public.roles ORDER BY role_key;
-- ✅ Resultado esperado:
-- EMPLOYEE        | Employee
-- HR_ADMIN        | HR Admin
-- SUPERVISOR      | Supervisor
-- SYSTEM_ADMIN    | System Administrator
-- TENANT_ADMIN    | Tenant Administrator
```

### Query 5: Contar permisos
```sql
SELECT COUNT(*) as permission_count FROM public.permissions;
-- ✅ Resultado esperado: ~80
```

### Query 6: Verificar protecciones activas
```sql
-- Intentar insertar un tenant extra (DEBE FALLAR)
INSERT INTO tenants (tenant_key, tenant_name, is_active)
VALUES ('TEST', 'Test Tenant', true);

-- ✅ Resultado esperado:
-- ERROR: 🚫 PROHIBIDO: Este sistema solo permite UN tenant
```

---

## 📈 MONITOREO DEL PROGRESO

Si quieres ver el progreso en tiempo real mientras se ejecutan los scripts:

```sql
-- En otra sesión de psql, ejecuta esto cada 2 segundos:
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_ins DESC;
```

---

## 🎯 CHECKLIST FINAL

Antes de iniciar la aplicación, confirma:

- [ ] ✅ `001_FACTORY_RESET.sql` ejecutado (0 errores)
- [ ] ✅ `002_SEED_COMPLETE.sql` ejecutado (0 errores)
- [ ] ✅ `003_TENANT_PROTECTION.sql` ejecutado (0 errores)
- [ ] ✅ Query de verificación: `SELECT COUNT(*) FROM tenants` → retorna `1`
- [ ] ✅ Query de verificación: `SELECT COUNT(*) FROM roles` → retorna `5`
- [ ] ✅ Query de verificación: `SELECT COUNT(*) FROM permissions` → retorna `~80`
- [ ] ✅ Protección activa: Intentar `INSERT INTO tenants` → falla con error 🚫

**Si todos los checkpoints están ✅, puedes arrancar la aplicación.**

---

## 🚨 SI ALGO SALE MAL

**REGLA DE ORO:** Si tienes algún error o duda, siempre puedes empezar de cero:

```sql
-- 1. Resetear completamente
\i supabase/migrations/001_FACTORY_RESET.sql

-- 2. Volver a crear todo
\i supabase/migrations/002_SEED_COMPLETE.sql
\i supabase/migrations/003_TENANT_PROTECTION.sql
```

**Esto toma solo ~25 segundos y garantiza un estado limpio.**

---

**Última actualización:** 2026-01-31  
**Versión:** 1.0.0

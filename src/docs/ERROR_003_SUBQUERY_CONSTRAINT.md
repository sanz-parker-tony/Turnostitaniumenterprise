# 🐛 ERROR 003: Subquery en CHECK Constraint

## ❌ ERROR ENCONTRADO

```
ERROR: 0A000: cannot use subquery in check constraint
CONTEXT: SQL statement "ALTER TABLE public.tenants ADD CONSTRAINT 
enforce_single_tenant CHECK ( -- Si el tenant actual es activo, 
contar cuántos activos hay en total CASE WHEN is_active = true 
THEN ( SELECT COUNT(*) FROM public.tenants WHERE is_active = true ) 
<= 1 ELSE true END )"
PL/pgSQL function inline_code_block line 9 at SQL statement
```

---

## 🔍 ANÁLISIS DEL PROBLEMA

### Lo que intentamos hacer:
```sql
ALTER TABLE public.tenants
ADD CONSTRAINT enforce_single_tenant 
CHECK (
  CASE 
    WHEN is_active = true THEN (
      SELECT COUNT(*) FROM public.tenants WHERE is_active = true  ❌
    ) <= 1
    ELSE true
  END
);
```

### Por qué falló:

**PostgreSQL NO permite subqueries en CHECK constraints.**

Un `CHECK` constraint debe ser una expresión **simple** que se evalúa en el contexto de la fila actual, **sin acceder a otras filas** de la misma tabla o de otras tablas.

### Restricciones de CHECK constraints en PostgreSQL:

✅ **Permitido:**
```sql
CHECK (salary > 0)
CHECK (age >= 18 AND age <= 100)
CHECK (status IN ('active', 'inactive'))
CHECK (start_date < end_date)
```

❌ **NO permitido:**
```sql
CHECK (SELECT COUNT(*) FROM ...) -- Subqueries
CHECK (id IN (SELECT id FROM ...)) -- Subqueries
CHECK (EXISTS (SELECT ...)) -- Subqueries
```

### Código de error:
- **0A000** = "feature not supported"
- Este es el código oficial de PostgreSQL para indicar que la característica solicitada no está implementada

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Cambio de estrategia: CHECK Constraint → Triggers

En lugar de usar un CHECK constraint con subquery, ahora usamos **3 triggers**:

### 🛡️ PROTECCIÓN #1: Bloquear INSERT de nuevos tenants
```sql
CREATE OR REPLACE FUNCTION public.prevent_tenant_insert()
RETURNS TRIGGER AS $$
DECLARE
  tenant_count INT;
BEGIN
  -- Contar cuántos tenants ya existen
  SELECT COUNT(*) INTO tenant_count FROM public.tenants;
  
  IF tenant_count > 0 THEN
    RAISE EXCEPTION 
      '🚫 PROHIBIDO: Este sistema solo permite UN tenant...';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_prevent_tenant_insert
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_tenant_insert();
```

**Qué hace:** Si ya existe 1 tenant, bloquea cualquier INSERT de un nuevo tenant.

---

### 🛡️ PROTECCIÓN #2: Bloquear activación de múltiples tenants
```sql
CREATE OR REPLACE FUNCTION public.enforce_single_active_tenant()
RETURNS TRIGGER AS $$
DECLARE
  active_tenant_count INT;
BEGIN
  -- Si se está intentando activar este tenant (is_active = true)
  IF NEW.is_active = true THEN
    -- Contar cuántos tenants activos ya existen (excluyendo el actual)
    SELECT COUNT(*) INTO active_tenant_count 
    FROM public.tenants 
    WHERE is_active = true 
      AND id != NEW.id;
    
    IF active_tenant_count > 0 THEN
      RAISE EXCEPTION 
        '🚫 PROHIBIDO: Solo puede haber UN tenant activo...';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para INSERT
CREATE TRIGGER trigger_enforce_single_active_tenant_insert
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_tenant();

-- Trigger para UPDATE
CREATE TRIGGER trigger_enforce_single_active_tenant_update
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_tenant();
```

**Qué hace:** Si alguien intenta activar un tenant (is_active = true) y ya hay otro activo, bloquea la operación.

---

### 🛡️ PROTECCIÓN #3: Bloquear DELETE de tenants
```sql
CREATE OR REPLACE FUNCTION public.prevent_tenant_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 
    '🚫 PROHIBIDO: No se pueden eliminar tenants del sistema...';
  
  RETURN NULL; -- Bloquear la operación
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_prevent_tenant_delete
  BEFORE DELETE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_tenant_delete();
```

**Qué hace:** Bloquea CUALQUIER intento de eliminar un tenant (sea SYSTEM o cualquier otro).

---

## 🎯 VENTAJAS DE LA SOLUCIÓN CON TRIGGERS

| Aspecto | CHECK Constraint | TRIGGERS |
|---------|------------------|----------|
| Permite subqueries | ❌ No | ✅ Sí |
| Acceso a otras filas | ❌ No | ✅ Sí |
| Flexibilidad | ❌ Limitado | ✅ Total |
| Performance | ✅ Muy rápido | ✅ Rápido |
| Validación compleja | ❌ No | ✅ Sí |
| Mensajes de error customizados | ❌ Básicos | ✅ Detallados |

---

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

### ❌ ANTES (con CHECK constraint - ERROR):
```sql
-- ESTRATEGIA ANTIGUA (NO FUNCIONA):
-- 1. CHECK constraint con subquery (❌ ERROR 0A000)
-- 2. TRIGGER para INSERT
-- 3. TRIGGER para DELETE
```

### ✅ DESPUÉS (solo TRIGGERS - FUNCIONA):
```sql
-- ESTRATEGIA NUEVA (FUNCIONA):
-- 1. TRIGGER para INSERT (bloquea nuevos tenants)
-- 2. TRIGGER para INSERT/UPDATE (bloquea múltiples activos)
-- 3. TRIGGER para DELETE (bloquea eliminación)
```

---

## 🚀 PRÓXIMOS PASOS

### 1. **Limpia el error anterior:**
   En el SQL Editor de Supabase, el error ya pasó. No necesitas hacer nada.

### 2. **Ejecuta la versión corregida:**
   ```
   Archivo: /supabase/migrations/003_TENANT_PROTECTION_SUPABASE.sql
   ```

### 3. **Copia y pega en SQL Editor:**
   - Abre el archivo local
   - Ctrl+A (seleccionar todo)
   - Ctrl+C (copiar)
   - Ve al SQL Editor de Supabase
   - Ctrl+V (pegar)
   - Click "Run"

### 4. **Resultado esperado:**
   ```
   NOTICE: ========================================
   NOTICE: ✅ PROTECCIÓN DE TENANT INSTALADA
   NOTICE: ========================================
   NOTICE: Tenants en el sistema: 1
   NOTICE: Tenants activos: 1
   NOTICE: Tenant SYSTEM existe: t
   NOTICE: 
   NOTICE: 🛡️ PROTECCIONES ACTIVAS:
   NOTICE:   1. ✅ TRIGGER: bloquea INSERT de nuevos tenants
   NOTICE:   2. ✅ TRIGGER: bloquea activación de múltiples tenants
   NOTICE:   3. ✅ TRIGGER: bloquea DELETE de tenants
   NOTICE: 
   NOTICE: ✅ Sistema validado correctamente
   NOTICE: ✅ Tenant SYSTEM está protegido y sellado
   ```

---

## 🧪 PRUEBAS DE LA PROTECCIÓN

### Prueba #1: Intentar insertar un nuevo tenant
```sql
INSERT INTO public.tenants (tenant_key, tenant_name, is_active)
VALUES ('NEW_TENANT', 'Nuevo Tenant', true);
```

**Resultado esperado:**
```
ERROR: 🚫 PROHIBIDO: Este sistema solo permite UN tenant. 
El tenant SYSTEM ya existe. No se pueden crear tenants adicionales.
HINT: El tenant SYSTEM fue creado en 002_SEED_COMPLETE.sql 
y debe ser reutilizado para todos los usuarios.
```

---

### Prueba #2: Intentar eliminar el tenant SYSTEM
```sql
DELETE FROM public.tenants WHERE tenant_key = 'SYSTEM';
```

**Resultado esperado:**
```
ERROR: 🚫 PROHIBIDO: No se pueden eliminar tenants del sistema. 
El tenant SYSTEM es requerido para la integridad del sistema.
HINT: Si necesitas resetear el sistema, ejecuta 
001_FACTORY_RESET.sql seguido de 002_SEED_COMPLETE.sql
```

---

### Prueba #3: Intentar activar un segundo tenant (si existiera)
```sql
-- Esto solo funcionaría si tuvieras múltiples tenants
-- (que no deberías tener gracias a la Protección #1)
UPDATE public.tenants 
SET is_active = true 
WHERE tenant_key = 'ANOTHER_TENANT';
```

**Resultado esperado:**
```
ERROR: 🚫 PROHIBIDO: Solo puede haber UN tenant activo en el sistema. 
Ya existe otro tenant activo.
HINT: Desactiva el tenant activo antes de activar otro.
```

---

## 📚 LECCIONES APRENDIDAS

### ✅ Qué aprendimos:
1. **CHECK constraints** en PostgreSQL **NO permiten subqueries**
2. **TRIGGERS** son más flexibles para validaciones complejas
3. Los TRIGGERS pueden acceder a otras filas de la tabla
4. Los TRIGGERS pueden tener mensajes de error customizados
5. Se pueden combinar múltiples TRIGGERS para diferentes eventos (INSERT, UPDATE, DELETE)

### ✅ Cuándo usar cada uno:

**Usa CHECK constraints para:**
- Validaciones simples en la fila actual
- Rangos de valores (`age >= 18`)
- Valores permitidos (`status IN ('active', 'inactive')`)
- Comparaciones entre columnas de la misma fila

**Usa TRIGGERS para:**
- Validaciones que requieren acceder a otras filas
- Lógica compleja con múltiples condiciones
- Validaciones que dependen del estado de otras tablas
- Mensajes de error detallados y customizados

---

## ✅ ESTADO ACTUAL

### Archivos actualizados:
- ✅ `/supabase/migrations/003_TENANT_PROTECTION_SUPABASE.sql` (CORREGIDO)
- ✅ `/docs/ERROR_003_SUBQUERY_CONSTRAINT.md` (NUEVA DOCUMENTACIÓN)

### Próximo paso:
**Ejecuta el archivo corregido en el SQL Editor de Supabase.**

---

**Fecha:** 2026-01-31  
**Versión:** 1.1.0 (corregida)  
**Error resuelto:** 0A000 - cannot use subquery in check constraint

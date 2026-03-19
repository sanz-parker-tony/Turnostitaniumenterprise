# 📋 ¿CUÁL ARCHIVO 003 USAR?

## ⚠️ ACTUALIZACIÓN IMPORTANTE (2026-01-31)

**El archivo ha sido corregido** para eliminar el error de subquery en CHECK constraint.

**Versión corregida:** `003_TENANT_PROTECTION_SUPABASE.sql` v1.1.0

---

## 🎯 RESPUESTA RÁPIDA

```
┌─────────────────────────────────────────────────────────────┐
│ ¿DÓNDE ESTÁS EJECUTANDO?                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🌐 Supabase SQL Editor (navegador)                         │
│    └─> USA: 003_TENANT_PROTECTION_SUPABASE.sql             │
│                                                             │
│ 💻 psql (línea de comandos)                                │
│    └─> USA: 003_TENANT_PROTECTION.sql                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 OPCIÓN A: Supabase SQL Editor

### ✅ Archivo a usar:
```
003_TENANT_PROTECTION_SUPABASE.sql
```

### 📍 Pasos:
1. Abre Supabase Dashboard
2. Ve a **SQL Editor**
3. Abre el archivo `/supabase/migrations/003_TENANT_PROTECTION_SUPABASE.sql`
4. **Copia TODO el contenido**
5. Pégalo en el SQL Editor
6. Click **"Run"**
7. ✅ Espera 3 segundos

### 📊 Resultado esperado:
```
NOTICE:  ✅ [003] Constraint enforce_single_tenant creado
NOTICE:  
NOTICE:  ========================================
NOTICE:  ✅ PROTECCIÓN DE TENANT INSTALADA
NOTICE:  ========================================
NOTICE:  Tenants en el sistema: 1
NOTICE:  Tenant SYSTEM existe: t
NOTICE:  
NOTICE:  🛡️ PROTECCIONES ACTIVAS:
NOTICE:    1. ✅ CHECK constraint: máximo 1 tenant activo
NOTICE:    2. ✅ TRIGGER: bloquea INSERT de nuevos tenants
NOTICE:    3. ✅ TRIGGER: bloquea DELETE de tenants
NOTICE:  
NOTICE:  ✅ Sistema validado correctamente
NOTICE:  ========================================
```

---

## 💻 OPCIÓN B: psql (línea de comandos)

### ✅ Archivo a usar:
```
003_TENANT_PROTECTION.sql
```

### 📍 Pasos:
```bash
# 1. Conectar a la base de datos
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# 2. Ejecutar el archivo
\i supabase/migrations/003_TENANT_PROTECTION.sql
```

### 📊 Resultado esperado:
```
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
```

---

## ❓ ¿POR QUÉ DOS ARCHIVOS?

### Diferencias técnicas:

| Característica | 003_TENANT_PROTECTION.sql | 003_TENANT_PROTECTION_SUPABASE.sql |
|----------------|---------------------------|-------------------------------------|
| Comandos `\echo` | ✅ Sí | ❌ No |
| Funciona en psql | ✅ Sí | ✅ Sí |
| Funciona en Supabase SQL Editor | ❌ No | ✅ Sí |
| Mensajes bonitos | ✅ Más bonitos | ✅ Básicos (NOTICE) |

### Explicación:

**`\echo`** es un **meta-comando de psql** (no es SQL estándar).

- ✅ **psql reconoce** `\echo` y lo imprime en la consola
- ❌ **Supabase SQL Editor NO reconoce** `\echo` y da error de sintaxis

**Ambos archivos hacen EXACTAMENTE LO MISMO:**
- Crean las mismas protecciones
- Crean los mismos triggers
- Validan de la misma forma

La única diferencia es que uno tiene `\echo` para mensajes bonitos, y el otro usa `RAISE NOTICE`.

---

## 🚨 ERROR QUE TUVISTE

### Lo que viste:
```
Error: Failed to run sql query: ERROR: 42601: 
syntax error at or near "\" LINE 15: \echo ''
```

### Por qué pasó:
Intentaste ejecutar `003_TENANT_PROTECTION.sql` (con `\echo`) en el **Supabase SQL Editor**.

### Solución:
Usa `003_TENANT_PROTECTION_SUPABASE.sql` en su lugar.

---

## ✅ TU PRÓXIMO PASO AHORA

### 1. Ve al Supabase SQL Editor

### 2. Abre este archivo en tu editor local:
```
/supabase/migrations/003_TENANT_PROTECTION_SUPABASE.sql
```

### 3. Copia TODO el contenido (Ctrl+A, Ctrl+C)

### 4. Pégalo en el SQL Editor de Supabase (Ctrl+V)

### 5. Click "Run" (botón verde)

### 6. Verifica el resultado:
Deberías ver varios mensajes **NOTICE** en color gris/verde que dicen:
```
✅ [003] Constraint enforce_single_tenant creado
✅ PROTECCIÓN DE TENANT INSTALADA
Tenants en el sistema: 1
```

### 7. ✅ Si ves esos mensajes → ÉXITO
El sistema está sellado y protegido.

### 8. 🚀 Siguiente paso:
Haz login en la aplicación con:
- Email: `system.admin@titanium-labs.com`
- Password: `Titanium2026!`

---

**Última actualización:** 2026-01-31  
**Versión:** 1.0.0
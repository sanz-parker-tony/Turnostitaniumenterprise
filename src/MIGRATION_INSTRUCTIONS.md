# 🚀 INSTRUCCIONES DE MIGRACIÓN — Turnos Titanium Enterprise

## ⚠️ PROBLEMA ACTUAL

Los errores que estás viendo indican que la tabla `system_settings` **NO EXISTE** en tu base de datos de Supabase:

```
Error: Could not find a relationship between 'system_settings' and 'lookup_values'
```

Esto es porque la **migración 003_SETTINGS_REFACTOR.sql** todavía NO se ha ejecutado en Supabase.

---

## ✅ SOLUCIÓN: Ejecutar la migración 003

### Paso 1: Abrir Supabase SQL Editor

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard/project/[TU_PROJECT_ID]
2. Click en **SQL Editor** en el menú lateral izquierdo
3. Click en **+ New Query**

### Paso 2: Copiar el contenido de la migración

1. Abre el archivo `/supabase/migrations/003_SETTINGS_REFACTOR.sql`
2. **Copia TODO el contenido** del archivo (desde `BEGIN;` hasta el final)
3. Pega el contenido en el SQL Editor de Supabase

### Paso 3: Ejecutar la migración

1. Click en el botón **Run** (o presiona `Ctrl+Enter` / `Cmd+Enter`)
2. Espera a que la ejecución termine (puede tomar 10-30 segundos)
3. Verifica que no haya errores en rojo

### Paso 4: Verificar resultados

Al final de la ejecución, deberías ver **3 tablas** con la cantidad de registros:

```
tabla                         | registros | activos
------------------------------|-----------|--------
system_settings               | 20        | 20
tenant_settings               | X         | X
company_settings              | X         | X
employee_profile_settings     | X         | X
```

Y también deberías ver:

```
column_name              | data_type              | is_nullable
-------------------------|------------------------|-------------
id                       | uuid                   | NO
setting_key              | character varying      | NO
setting_name             | character varying      | NO
setting_short_key        | character varying      | NO
setting_description      | text                   | YES
value_type_id            | uuid                   | YES
default_value            | text                   | YES
min_value                | text                   | YES
max_value                | text                   | YES
is_tenant_override       | boolean                | NO
is_company_override      | boolean                | NO
is_profile_override      | boolean                | NO
is_employee_override     | boolean                | NO
category                 | character varying      | YES
sort_order               | integer                | NO
is_active                | boolean                | NO
created_by               | character varying      | NO
created_at               | timestamp with time zone | NO
updated_by               | character varying      | YES
updated_at               | timestamp with time zone | YES
```

---

## 📋 QUÉ HACE LA MIGRACIÓN 003

### FASE 1: Crear tabla `system_settings`
- Catálogo maestro de todos los parámetros del sistema
- Define qué parámetros existen, su tipo, valor default, validaciones, etc.

### FASE 2-6: Migrar datos existentes
- Consolida parámetros de `tenant_settings`, `company_settings`, `employee_profile_settings`
- Agrega columna `system_setting_id` a las 3 tablas
- Crea las foreign keys necesarias
- Agrega unique constraints

### FASE 7: SEED de parámetros base
Inserta 20 parámetros funcionales:
- Asistencia (timezone, redondeo, horas extra, etc.)
- Nómina (moneda, formato exportación)
- Turnos (solapamiento, días consecutivos)
- Notificaciones
- Seguridad
- Generales

### FASE 8: Eliminar columnas antiguas
- Elimina `setting_key`, `value_type_id` de las tablas hijas
- Ahora solo almacenan `system_setting_id` + `setting_value`

### FASE 9: Crear índices
- Performance optimizada para queries frecuentes

### FASE 10: Crear tabla `employee_settings`
- **NUEVA TABLA** — nivel 5 de jerarquía (prioridad máxima)
- Override personal a nivel empleado individual

---

## 🔄 JERARQUÍA DE RESOLUCIÓN (POST-MIGRACIÓN)

```
5. employee_settings         (MÁXIMA PRIORIDAD — valor personal)
   ↓ si no existe...
4. employee_profile_settings (valor del perfil del empleado)
   ↓ si no existe...
3. company_settings          (valor de la compañía)
   ↓ si no existe...
2. tenant_settings           (valor del tenant)
   ↓ si no existe...
1. system_settings.default_value (MÍNIMA PRIORIDAD — fallback del sistema)
```

---

## ⚠️ IMPORTANTE

- La migración es **IDEMPOTENTE**: puedes ejecutarla múltiples veces sin problemas
- Usa `CREATE TABLE IF NOT EXISTS` y `ON CONFLICT DO NOTHING`
- **NO BORRA DATOS** de las tablas existentes, solo los reorganiza
- Después de ejecutar, la app funcionará correctamente

---

## 🐛 SOLUCIÓN AL ERROR DE `tenant_members`

También se corrigió el query de `tenant_members` que intentaba hacer JOIN con `auth.users`. Ahora solo retorna los campos directos de la tabla sin JOIN, ya que Supabase Postgrest no puede hacer JOIN entre schemas (`public` → `auth`).

---

## 📞 SIGUIENTE PASO DESPUÉS DE LA MIGRACIÓN

Una vez ejecutada la migración 003:

1. **Refresca la página** de tu aplicación
2. Verifica que los errores de `system_settings` desaparezcan
3. Deberas hacer login nuevamente (el error de autenticación es independiente)

---

## 🔐 ERROR DE AUTENTICACIÓN

El error `Invalid login credentials` es independiente de la migración. Verifica:

1. Que el usuario existe en Supabase Auth
2. Que la contraseña es correcta
3. Que el email está confirmado (`email_confirm: true`)

Si necesitas crear un usuario de prueba, usa:

```sql
-- Ejecutar en Supabase SQL Editor
SELECT auth.users();
```

O crea uno desde la UI de Supabase: **Authentication** → **Users** → **Add user**

---

## ✅ CHECKLIST POST-MIGRACIÓN

- [ ] Ejecuté la migración 003 en Supabase SQL Editor
- [ ] Vi los reportes de verificación al final (sin errores)
- [ ] La tabla `system_settings` ahora existe
- [ ] La tabla `employee_settings` ahora existe
- [ ] Las tablas `tenant_settings`, `company_settings`, `employee_profile_settings` tienen columna `system_setting_id`
- [ ] Refresqué la aplicación y los errores de `system_settings` desaparecieron

---

Si después de ejecutar la migración sigues teniendo problemas, revisa los logs del servidor en la consola del navegador.

# 🗄️ Instrucciones de Ejecución de Scripts SQL en Supabase

## 📋 Orden de Ejecución

Ejecuta los scripts en este **orden exacto**:

### **1. DDL Base** (Tu script original)
```sql
-- Ejecutar: TurnosTitanium_DDL_v2.sql
-- Descripción: Crea todas las tablas, triggers, índices básicos
```

### **2. Correcciones y Funciones**
```sql
-- Ejecutar: 02_ddl_corrections_FIXED.sql (VERSIÓN CORREGIDA)
-- Descripción: 
--   - Agrega campo icon_key a screens (si no existe)
--   - Crea función clone_role() (orden de parámetros corregido)
--   - Crea función copy_role_permissions() (orden de parámetros corregido)
--   - Índices adicionales
```

### **3. Datos Seed**
```sql
-- Ejecutar: 03_seed_data.sql
-- Descripción:
--   - Idiomas (ES, EN)
--   - Lookup groups y values
--   - Menu groups
--   - Actions estándar
--   - Scope types
--   - Screens básicas
--   - Screen actions
```

### **4. RLS Policies**
```sql
-- Ejecutar: 04_rls_policies_FIXED.sql (VERSIÓN CORREGIDA)
-- Descripción:
--   - Habilita RLS en tablas
--   - Funciones helper (get_user_tenant_id, user_has_screen_action)
--   - Políticas de seguridad por tenant
--   - Políticas específicas para Copiar Permisos
--   - GRANT EXECUTE con firmas corregidas
```

---

## 🎯 Paso a Paso en Supabase

### **Opción A: SQL Editor (Recomendado)**

1. **Ir a SQL Editor** en el dashboard de Supabase
2. **Crear nueva query** para cada script
3. **Copiar y pegar** el contenido del script
4. **Ejecutar** (botón Run o Ctrl+Enter)
5. **Verificar** que no haya errores en el output
6. **Repetir** con el siguiente script

### **Opción B: Línea de Comandos (psql)**

Si tienes acceso directo a PostgreSQL:

```bash
# Conectar a tu instancia de Supabase
psql "postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Ejecutar scripts en orden
\i /path/to/TurnosTitanium_DDL_v2.sql
\i /path/to/02_ddl_corrections_FIXED.sql
\i /path/to/03_seed_data.sql
\i /path/to/04_rls_policies_FIXED.sql
```

---

## ✅ Verificaciones Post-Ejecución

Después de ejecutar todos los scripts, verifica:

### **1. Tablas Creadas**
```sql
select table_name 
from information_schema.tables 
where table_schema = 'public' 
  and table_type = 'BASE TABLE'
order by table_name;

-- Deberías ver ~60+ tablas
```

### **2. Funciones Creadas**
```sql
select routine_name, routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('clone_role', 'copy_role_permissions', 'get_user_tenant_id', 'user_has_screen_action');

-- Deberías ver 4 funciones
```

### **3. Datos Seed Cargados**
```sql
select 
  (select count(*) from public.system_languages) as languages,
  (select count(*) from public.lookup_groups) as lookup_groups,
  (select count(*) from public.lookup_values where lookup_scope = 'SYSTEM') as lookup_values,
  (select count(*) from public.system_menu_groups) as menu_groups,
  (select count(*) from public.actions) as actions,
  (select count(*) from public.scope_types) as scope_types,
  (select count(*) from public.screens) as screens,
  (select count(*) from public.screen_actions) as screen_actions;

-- Deberías ver:
-- languages: 2
-- lookup_groups: 20+
-- lookup_values: 40+
-- menu_groups: 10
-- actions: 11
-- scope_types: 7
-- screens: 15
-- screen_actions: 13+
```

### **4. RLS Habilitado**
```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('roles', 'screens', 'users', 'companies');

-- Todas deben tener rowsecurity = true
```

### **5. Políticas RLS Creadas**
```sql
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Deberías ver 20+ políticas
```

---

## 🚨 Troubleshooting

### **Error: "relation already exists"**
- **Causa**: Ya ejecutaste el script antes
- **Solución**: Los scripts usan `if not exists`, deberían ser idempotentes. Si persiste, revisa qué ya existe.

### **Error: "column does not exist"**
- **Causa**: No ejecutaste scripts en orden correcto
- **Solución**: Ejecuta desde el principio en el orden indicado

### **Error: "function already exists"**
- **Causa**: Función ya existe de ejecución previa
- **Solución**: Usamos `create or replace`, debería reemplazar. Si falla:
  ```sql
  drop function if exists public.clone_role;
  drop function if exists public.copy_role_permissions;
  -- Luego re-ejecuta 02_ddl_corrections.sql
  ```

### **Error: "permission denied for schema public"**
- **Causa**: Usuario sin permisos
- **Solución**: Asegúrate de ejecutar como usuario `postgres` o con rol apropiado

### **Error: "violates foreign key constraint"**
- **Causa**: Datos seed en orden incorrecto
- **Solución**: El script 03 usa bloques DO para manejar dependencias. Si falla, ejecuta línea por línea.

---

## 🔐 Crear Tenant y Usuario de Prueba

Después de ejecutar todo, crea un tenant y usuario de prueba:

```sql
-- 1. Crear tenant
insert into public.tenants (id, tenant_name, is_active)
values ('11111111-1111-1111-1111-111111111111', 'Empresa Demo', true);

-- 2. Crear usuario en auth (manualmente en Supabase Auth UI o via API)
-- O usa este helper:
-- Nota: Reemplaza con el UUID real del auth.users creado
insert into public.users (
  tenant_id,
  auth_user_id,
  username,
  display_name,
  email,
  is_active,
  created_by
) values (
  '11111111-1111-1111-1111-111111111111',
  '[AUTH_USER_ID]', -- UUID del auth.users
  'admin',
  'Administrador Demo',
  'admin@demo.com',
  true,
  'SYSTEM'
);

-- 3. Crear rol de administrador
insert into public.roles (
  id,
  tenant_id,
  role_key,
  role_name,
  role_scope,
  is_active,
  created_by
) values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'ADMIN_FULL',
  'Administrador Total',
  'TENANT',
  true,
  'SYSTEM'
);

-- 4. Asignar TODOS los permisos al rol (temporal para testing)
insert into public.role_screen_actions (
  tenant_id,
  role_id,
  screen_action_id,
  is_allowed,
  is_active,
  created_by
)
select
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  sa.id,
  true,
  true,
  'SYSTEM'
from public.screen_actions sa;

-- 5. Asignar rol al usuario
insert into public.user_roles (
  tenant_id,
  user_id,
  role_id,
  is_active,
  created_by
)
select
  '11111111-1111-1111-1111-111111111111',
  u.id,
  '22222222-2222-2222-2222-222222222222',
  true,
  'SYSTEM'
from public.users u
where u.username = 'admin';
```

---

## 🧪 Probar Funciones de Copiar Permisos

```sql
-- Test 1: CLONAR ROL
select public.clone_role(
  '11111111-1111-1111-1111-111111111111'::uuid, -- tenant_id
  '22222222-2222-2222-2222-222222222222'::uuid, -- source_role_id (ADMIN_FULL)
  'ADMIN_COPY',                                    -- new_role_key
  'Administrador Copia',                          -- new_role_name
  'Copia del rol administrador',                  -- description
  (select id from public.users where username = 'admin') -- created_by
);

-- Verificar que se creó
select * from public.roles where role_key = 'ADMIN_COPY';

-- Test 2: COPIAR PERMISOS (MERGE)
-- Primero crea un rol destino vacío
insert into public.roles (tenant_id, role_key, role_name, role_scope, is_active, created_by)
values (
  '11111111-1111-1111-1111-111111111111',
  'TEST_ROLE',
  'Rol de Prueba',
  'TENANT',
  true,
  'SYSTEM'
) returning id;

-- Luego copia permisos
select public.copy_role_permissions(
  '11111111-1111-1111-1111-111111111111'::uuid, -- tenant_id
  '22222222-2222-2222-2222-222222222222'::uuid, -- source_role_id
  '[ID_DEL_TEST_ROLE]'::uuid,                    -- target_role_id
  'MERGE',                                        -- strategy
  true,                                           -- copy_screen_actions
  true,                                           -- copy_reports
  false,                                          -- copy_scopes
  (select id from public.users where username = 'admin') -- updated_by
);

-- Verificar auditoría
select * from public.role_permission_copy_runs order by executed_at desc limit 5;
```

---

## 📊 Monitoreo

```sql
-- Ver operaciones de copia recientes
select 
  rcr.*,
  sr.role_name as source_role,
  tr.role_name as target_role,
  u.username as executed_by_user
from public.role_permission_copy_runs rcr
join public.roles sr on rcr.source_role_id = sr.id
left join public.roles tr on rcr.target_role_id = tr.id
join public.users u on rcr.executed_by = u.id
order by rcr.executed_at desc
limit 10;

-- Ver snapshots
select 
  rs.*,
  r.role_name,
  rcr.operation_type
from public.role_permission_snapshots rs
join public.roles r on rs.role_id = r.id
join public.role_permission_copy_runs rcr on rs.copy_run_id = rcr.id
order by rs.created_at desc
limit 10;
```

---

## ✅ Checklist Final

Antes de conectar el frontend:

- [ ] DDL base ejecutado sin errores
- [ ] Correcciones aplicadas (icon_key existe en screens)
- [ ] Funciones clone_role y copy_role_permissions creadas
- [ ] Datos seed cargados (al menos 15 screens, 11 actions)
- [ ] RLS habilitado en todas las tablas TENANT
- [ ] Políticas RLS aplicadas
- [ ] Tenant de prueba creado
- [ ] Usuario de prueba creado y vinculado a auth.users
- [ ] Rol con permisos asignado al usuario
- [ ] Funciones de copia probadas y funcionando

---

## 🚀 Siguiente Paso

Una vez completado todo:

1. **Configurar Supabase en el frontend**:
   ```typescript
   // .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
   ```

2. **Reemplazar mocks** en `PermissionsContext.tsx` por queries reales

3. **Probar login** y verificar que el menú se construya dinámicamente

¡Listo para arrancar! 🎉
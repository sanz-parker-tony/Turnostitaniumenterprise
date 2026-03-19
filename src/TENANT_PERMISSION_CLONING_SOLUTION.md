# 🎯 Solución al Menú Vacío de tenant.admin

## 🔴 **PROBLEMA REAL IDENTIFICADO**

### Causa Raíz:
```
users.tenant_id (tenant.admin) = feaf24... (TENANT REAL)
    ↓
user_roles.role_id → roles.id (del tenant SYSTEM)
    ↓
role_screen_actions.tenant_id = 9ca65... (SYSTEM)
    ↓
Query filtra: rsa.tenant_id = u.tenant_id
    ↓
feaf24... ≠ 9ca65... → ❌ NO HAY MATCH → MENÚ VACÍO
```

**El wizard está creando el usuario tenant.admin con `users.tenant_id = TENANT_REAL`, pero los permisos (`role_screen_actions`) están en OTRO `tenant_id` (quedaron en tenant SYSTEM).**

Por eso el menú sale vacío cuando se filtra por tenant.

---

## ✅ **SOLUCIÓN CORRECTA**

### Al finalizar el wizard (cuando ya existe el tenant nuevo):

#### 1. **Crear roles en el tenant nuevo:**
```sql
-- Copiar estos roles del tenant SYSTEM al tenant nuevo:
- TENANT_ADMIN
- RRHH_ADMIN
- SUPERVISOR
- EMPLOYEE
-- NO copiar SYSTEM_ADMIN (ese solo existe en SYSTEM)
```

#### 2. **Copiar permisos base desde SYSTEM hacia el tenant nuevo:**
```sql
-- Copiar role_screen_actions del rol SYSTEM TENANT_ADMIN
-- hacia el rol TENANT TENANT_ADMIN
-- Idem para RRHH_ADMIN, SUPERVISOR, EMPLOYEE
```

#### 3. **Asignar al tenant.admin el role_id del tenant nuevo:**
```sql
-- NO asignar el role_id del SYSTEM
-- SÍ asignar el role_id del rol clonado en el tenant nuevo
```

---

## 📋 **IMPLEMENTACIÓN REQUERIDA**

### Función de Clonación de Roles y Permisos

```sql
-- Función: clone_base_roles_to_tenant(target_tenant_id UUID)
-- Ejecutar al completar el wizard
-- Retorna: array de role_ids creados

CREATE OR REPLACE FUNCTION clone_base_roles_to_tenant(
  p_target_tenant_id UUID
) RETURNS TABLE (
  role_key VARCHAR,
  source_role_id UUID,
  cloned_role_id UUID,
  permissions_count INT
) AS $$
DECLARE
  v_system_tenant_id UUID;
  v_source_role RECORD;
  v_new_role_id UUID;
  v_perms_count INT;
BEGIN
  -- 1. Obtener tenant SYSTEM
  SELECT id INTO v_system_tenant_id 
  FROM tenants 
  WHERE tenant_key = 'SYSTEM';

  -- 2. Iterar sobre roles base a clonar
  FOR v_source_role IN 
    SELECT id, role_key, role_name, role_scope, data_scope
    FROM roles
    WHERE tenant_id = v_system_tenant_id
    AND role_key IN ('TENANT_ADMIN', 'RRHH_ADMIN', 'SUPERVISOR', 'EMPLOYEE')
  LOOP
    -- 3. Crear rol en el tenant nuevo
    INSERT INTO roles (
      tenant_id, role_key, role_name, role_scope, data_scope,
      is_system_role, is_locked, is_active, created_by
    ) VALUES (
      p_target_tenant_id,
      v_source_role.role_key,
      v_source_role.role_name,
      v_source_role.role_scope,
      v_source_role.data_scope,
      false,  -- No es system_role
      false,  -- No está locked
      true,
      'WIZARD'
    )
    RETURNING id INTO v_new_role_id;

    -- 4. Copiar permisos (role_screen_actions)
    INSERT INTO role_screen_actions (
      tenant_id, role_id, screen_action_id, is_allowed, is_active, created_by
    )
    SELECT 
      p_target_tenant_id,  -- Nuevo tenant
      v_new_role_id,       -- Nuevo role
      rsa.screen_action_id,
      rsa.is_allowed,
      rsa.is_active,
      'WIZARD'
    FROM role_screen_actions rsa
    WHERE rsa.role_id = v_source_role.id
    AND rsa.tenant_id = v_system_tenant_id;

    -- 5. Contar permisos copiados
    SELECT COUNT(*) INTO v_perms_count
    FROM role_screen_actions
    WHERE role_id = v_new_role_id
    AND tenant_id = p_target_tenant_id;

    -- 6. Retornar información
    role_key := v_source_role.role_key;
    source_role_id := v_source_role.id;
    cloned_role_id := v_new_role_id;
    permissions_count := v_perms_count;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔧 **CAMBIOS EN EL WIZARD**

### Paso Final del Wizard (después de crear el tenant):

```typescript
// 1. Crear el tenant
const { data: newTenant } = await supabase
  .from('tenants')
  .insert({ tenant_name, tenant_key, is_active: true })
  .select()
  .single();

// 2. ✅ CLONAR roles y permisos base al tenant nuevo
const { data: clonedRoles, error: cloneError } = await supabase
  .rpc('clone_base_roles_to_tenant', {
    p_target_tenant_id: newTenant.id
  });

if (cloneError) {
  console.error('Error clonando roles:', cloneError);
  throw new Error('No se pudieron clonar los roles base');
}

console.log('✅ Roles clonados:', clonedRoles);

// 3. Obtener el rol TENANT_ADMIN del tenant nuevo
const { data: tenantAdminRole } = await supabase
  .from('roles')
  .select('id')
  .eq('tenant_id', newTenant.id)  // ✅ Del tenant NUEVO, no SYSTEM
  .eq('role_key', 'TENANT_ADMIN')
  .single();

// 4. Crear usuario tenant.admin
const { data: newUser } = await supabase
  .from('users')
  .insert({
    tenant_id: newTenant.id,
    auth_user_id: authUserId,
    username: 'tenant.admin',
    email,
    is_active: true,
    created_by: 'WIZARD'
  })
  .select()
  .single();

// 5. ✅ Asignar el rol del TENANT NUEVO (no del SYSTEM)
await supabase
  .from('user_roles')
  .insert({
    tenant_id: newTenant.id,
    user_id: newUser.id,
    role_id: tenantAdminRole.id,  // ✅ Role del tenant NUEVO
    is_active: true,
    created_by: 'WIZARD'
  });
```

---

## 🟢 **RESULTADO ESPERADO**

### Después de implementar la solución:

```
Login tenant.admin:
  users.tenant_id = feaf24... (TENANT REAL)
      ↓
  user_roles.role_id → roles.id (del TENANT REAL)
      ↓
  role_screen_actions.tenant_id = feaf24... (TENANT REAL)
      ↓
  Query filtra: rsa.tenant_id = rol.tenant_id
      ↓
  feaf24... = feaf24... → ✅ MATCH → MENÚ VISIBLE
```

---

## 📝 **ACTUALIZACIÓN DEL SEED**

### Cambios en `002_SEED_COMPLETE.sql`:

```sql
-- ❌ ANTES:
'TNT_ADMIN'   → ✅ AHORA: 'TENANT_ADMIN'
'SUPERVSR'    → ✅ AHORA: 'SUPERVISOR'
'RRHH_ADM'    → ✅ AHORA: 'RRHH_ADMIN'
```

**Razón:** Usar `role_key` completos (hasta 30 chars) para evitar bugs silenciosos.

---

## 🐛 **OTROS BUGS IDENTIFICADOS**

### 1. Pantalla en Blanco al hacer Click (system.admin)

**Causa:** 
- `screens.route_path` apunta a `/dashboard/...`
- Si esa ruta no tiene componente implementado → pantalla blanca

**Solución:**
- Implementar componente `UnderConstruction` para rutas sin implementar
- Crear un dynamic route que renderice por `screen_key`
- Mostrar "🚧 Bajo Construcción" en lugar de pantalla blanca

```typescript
// /dashboard/[...slug]/page.tsx
import UnderConstruction from '@/components/UnderConstruction';

export default function DynamicScreen({ params }) {
  const screenKey = params.slug?.join('_').toUpperCase();
  
  // TODO: Mapear screen_key a componentes reales
  const componentMap = {
    'USER_MANAGEMENT': <UserManagement />,
    'ROLE_MANAGEMENT': <RoleManagement />,
    // ... otros componentes
  };
  
  const Component = componentMap[screenKey];
  
  if (!Component) {
    return <UnderConstruction screenKey={screenKey} />;
  }
  
  return Component;
}
```

---

## ✅ **CHECKLIST DE IMPLEMENTACIÓN**

### Backend:
- [ ] Crear función `clone_base_roles_to_tenant()`
- [ ] Actualizar `002_SEED_COMPLETE.sql` con role_key correctos
- [ ] Re-ejecutar seed en desarrollo

### Frontend:
- [ ] Modificar wizard para llamar a `clone_base_roles_to_tenant()`
- [ ] Asegurar que se asigna role_id del tenant nuevo (no SYSTEM)
- [ ] Implementar componente `UnderConstruction` (✅ YA CREADO)
- [ ] Crear fallback para rutas sin componente

### Testing:
- [ ] Completar wizard y verificar que tenant.admin tiene menú
- [ ] Verificar que permisos están en el tenant correcto
- [ ] Verificar que system.admin sigue funcionando
- [ ] Verificar que pantallas sin implementar muestran fallback

---

## 🎯 **RESUMEN PARA IMPLEMENTAR**

```
Nyra, hallé la causa del menú vacío de tenant.admin: 

El usuario tenant.admin tiene users.tenant_id = feaf24... (TENANT REAL),
pero sus permisos (role_screen_actions) están en otro tenant_id = 9ca65... (SYSTEM).

Por eso cuando el query filtra rsa.tenant_id = u.tenant_id no retorna filas → menú vacío.

FIX:
1. Al terminar el wizard, clonar/crear en el tenant nuevo los roles base:
   - TENANT_ADMIN
   - RRHH_ADMIN
   - SUPERVISOR
   - EMPLOYEE

2. Copiar los role_screen_actions base desde SYSTEM hacia ese tenant.

3. Asignar a tenant.admin el role_id del tenant nuevo (no el role_id del SYSTEM).

ADEMÁS:
- Cambiar role_key a varchar(30) y usar keys completas en seed/código:
  TENANT_ADMIN y SUPERVISOR (no TNT_ADMIN/SUPERVSR).

- Frontend: si una route_path aún no tiene componente, mostrar un fallback
  "Bajo construcción", no pantalla en blanco.
```

---

**Fecha:** 2026-01-25  
**Versión:** 1.0.0  
**Estado:** 🔴 PENDIENTE DE IMPLEMENTACIÓN

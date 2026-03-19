# 📋 Mensaje para Nyra - Configuración Definitiva del Sistema

## 🔑 1. Role Keys Definitivos (NO ABREVIAR)

### ✅ **Usar EXACTAMENTE estos valores:**

```typescript
const ROLE_KEYS = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',    // ✅ NO: 'SYS_ADM'
  TENANT_ADMIN: 'TENANT_ADMIN',    // ✅ NO: 'TNT_ADMIN' 
  RRHH_ADMIN: 'RRHH_ADMIN',        // ✅ NO: 'RRHH_ADM'
  SUPERVISOR: 'SUPERVISOR',         // ✅ NO: 'SUPERVSR'
  EMPLOYEE: 'EMPLOYEE'              // ✅ OK
};
```

### 📌 **Importante:**
- El backend y la base de datos **YA aceptan** `role_key VARCHAR(30)`
- **NO asumir** límites de 10 caracteres
- **NO hacer** abreviaciones en frontend
- Los role_key son **largos y descriptivos**

---

## 🗂️ 2. Cómo se Construye el Menú (Cadena Completa)

### ❌ **INCORRECTO:**
```typescript
// NO hacer esto - el menú NO depende del rol directamente
if (userRole === 'SYSTEM_ADMIN') {
  showSecurityMenu();
}
```

### ✅ **CORRECTO:**
```typescript
// El menú se construye siguiendo toda la cadena:
auth.user
  → public.users (tenant_id, auth_user_id)
    → user_roles (user_id, role_id)
      → roles (id, tenant_id, role_key)
        → role_screen_actions (role_id, screen_action_id, tenant_id, is_allowed)
          → screen_actions (id, screen_id, action_id)
            → screens (id, screen_key, menu_group_id, route_path)
              → system_menu_groups (id, menu_group_key, menu_group_name)
```

### 🔍 **Query Completo:**

```typescript
// 1. Obtener tenant SYSTEM
const { data: systemTenant } = await supabase
  .from('tenants')
  .select('id')
  .eq('tenant_key', 'SYSTEM')
  .single();

// 2. Obtener usuario actual
const { data: user } = await supabase
  .from('users')
  .select('id, tenant_id')
  .eq('auth_user_id', authUserId)
  .single();

// 3. Obtener rol del usuario
const { data: userRole } = await supabase
  .from('user_roles')
  .select('role_id, roles!inner(id, role_key, tenant_id)')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .single();

// 4. Obtener permisos del rol (role_screen_actions)
// ⚠️ CRÍTICO: Filtrar por tenant_id del ROL, no del usuario
const { data: permissions } = await supabase
  .from('role_screen_actions')
  .select(`
    screen_action_id,
    is_allowed,
    screen_actions!inner (
      screen_id,
      screens!inner (
        id,
        screen_key,
        screen_name,
        route_path,
        menu_group_id,
        system_menu_groups!inner (
          menu_group_key,
          menu_group_name,
          icon_key,
          sort_order
        )
      )
    )
  `)
  .eq('role_id', userRole.role_id)
  .eq('tenant_id', userRole.roles.tenant_id)  // ✅ Tenant del ROL
  .eq('is_allowed', true)
  .eq('is_active', true);

// 5. Construir menú agrupado por menu_group
const menuGroups = groupBy(permissions, 'menu_group_key');
```

### 📌 **Si un usuario no ve menú:**
- ❌ **NO es** un problema de UI
- ✅ **ES** que la consulta no está siguiendo toda la cadena
- ✅ Verificar que estás filtrando por `tenant_id` del **ROL**, no del usuario

---

## 👤 3. SYSTEM_ADMIN

### ✅ **Menú Correcto:**
```
SYSTEM_ADMIN solo ve:
├─ SECURITY
│  ├─ Gestión de Usuarios
│  ├─ Gestión de Roles
│  └─ ... (otras pantallas de security)
└─ MAINT
   └─ Gestión de Catálogos
```

### ⚠️ **Rutas Pendientes:**
Muchas rutas están marcadas como "pendientes" porque administran tablas SYSTEM:
- `/dashboard/security/tenants`
- `/dashboard/security/menu-groups`
- `/dashboard/security/screens`
- `/dashboard/security/actions`
- etc.

### ✅ **Solución:**
Si la ruta no existe aún:
```typescript
// Renderizar componente "Bajo construcción"
import UnderConstruction from '@/components/UnderConstruction';

export default function PendingScreen() {
  return (
    <UnderConstruction 
      screenName="Gestión de Tenants"
      screenKey="TENANT_MANAGEMENT"
      description="Esta funcionalidad estará disponible próximamente"
    />
  );
}
```

### ❌ **NO hacer:**
- Pantalla en blanco
- Error 404
- Redirección automática

---

## 🏢 4. TENANT_ADMIN

### ✅ **Menú Correcto:**
```
TENANT_ADMIN debe ver:
├─ MAINT
│  └─ Gestión de Catálogos
├─ CONFIG
│  ├─ Configuración del Tenant
│  ├─ Gestión de Horarios
│  ├─ Gestión de Calendarios
│  ├─ Gestión de Dispositivos
│  └─ Integración con Nómina
└─ ORG
   └─ Estructura Organizacional
```

### ❌ **Si no ve menú:**

**Problema 1: Filtro incorrecto de role_key**
```typescript
// ❌ MAL
.eq('role_key', 'TNT_ADMIN')  // Nombre antiguo

// ✅ BIEN
.eq('role_key', 'TENANT_ADMIN')  // Nombre correcto
```

**Problema 2: tenant_id incorrecto**
```typescript
// ❌ MAL
.eq('tenant_id', user.tenant_id)  // Tenant del usuario

// ✅ BIEN
.eq('tenant_id', role.tenant_id)  // Tenant del ROL (debe ser SYSTEM)
```

---

## 🔧 5. El Wizard (On-Premise)

### ❌ **INCORRECTO:**
```typescript
// NO crear un tenant nuevo en cada wizard
const newTenant = await createTenant({ tenant_name });
```

### ✅ **CORRECTO:**
```typescript
// El wizard SOLO:
// 1. Completa datos del tenant SYSTEM existente
// 2. Crea usuario tenant.admin@dominio
// 3. Asigna rol TENANT_ADMIN

const { data: systemTenant } = await supabase
  .from('tenants')
  .select('id')
  .eq('tenant_key', 'SYSTEM')
  .single();

// 1. Actualizar datos del tenant
await supabase
  .from('tenants')
  .update({ 
    tenant_name: formData.tenant_name 
  })
  .eq('id', systemTenant.id);

// 2. Obtener rol TENANT_ADMIN
const { data: tenantAdminRole } = await supabase
  .from('roles')
  .select('id')
  .eq('tenant_id', systemTenant.id)
  .eq('role_key', 'TENANT_ADMIN')  // ✅ Nombre completo
  .single();

// 3. Crear usuario tenant.admin
const { data: newUser } = await supabase
  .from('users')
  .insert({
    tenant_id: systemTenant.id,
    auth_user_id: authUserId,
    username: 'tenant.admin',
    email: formData.email,
    is_active: true,
    created_by: 'WIZARD'
  })
  .select()
  .single();

// 4. Asignar rol TENANT_ADMIN
await supabase
  .from('user_roles')
  .insert({
    tenant_id: systemTenant.id,
    user_id: newUser.id,
    role_id: tenantAdminRole.id,
    is_active: true,
    created_by: 'WIZARD'
  });
```

### 📌 **Importante:**
- **Nunca debe haber más de un tenant** en On-Premise
- El tenant SYSTEM es **único** y **permanente**
- El wizard solo **completa datos** y **crea usuarios**

---

## 🌍 6. Idiomas y Traducciones

### ✅ **Seed solo crea:**
```sql
INSERT INTO system_languages (code, language_name, is_active, is_default)
VALUES
  ('es', 'Español', true, true),
  ('en', 'English', true, false);
```

### 📌 **Los demás idiomas:**
- Se gestionan por **UI**
- No están en el seed
- El frontend **NO debe esperar** traducciones completas para renderizar menús

### ✅ **Fallback para traducciones:**
```typescript
const getMenuLabel = (screen: Screen, lang: string) => {
  // 1. Intentar obtener traducción
  const translation = screen.translations?.[lang];
  
  // 2. Fallback a idioma por defecto (es)
  if (!translation) {
    return screen.translations?.['es'] || screen.menu_label;
  }
  
  // 3. Fallback a menu_label original
  return translation || screen.menu_label;
};
```

---

## 🐛 7. Debugging del Menú

### ✅ **Checklist de Verificación:**

```typescript
// 1. ¿El usuario tiene un rol asignado?
const { data: userRole } = await supabase
  .from('user_roles')
  .select('*, roles(*)')
  .eq('user_id', userId)
  .eq('is_active', true)
  .single();

console.log('✅ User Role:', userRole);

// 2. ¿El rol tiene permisos (role_screen_actions)?
const { data: permissions } = await supabase
  .from('role_screen_actions')
  .select('*')
  .eq('role_id', userRole.role_id)
  .eq('is_allowed', true)
  .eq('is_active', true);

console.log('✅ Permissions count:', permissions?.length);

// 3. ¿Los permisos apuntan a pantallas válidas?
const { data: screens } = await supabase
  .from('role_screen_actions')
  .select(`
    screen_actions!inner(
      screens!inner(screen_key, route_path)
    )
  `)
  .eq('role_id', userRole.role_id)
  .eq('is_allowed', true);

console.log('✅ Screens:', screens);

// 4. ¿Las pantallas tienen menu_group asignado?
const { data: menuGroups } = await supabase
  .from('role_screen_actions')
  .select(`
    screen_actions!inner(
      screens!inner(
        system_menu_groups!inner(menu_group_key, menu_group_name)
      )
    )
  `)
  .eq('role_id', userRole.role_id)
  .eq('is_allowed', true);

console.log('✅ Menu Groups:', menuGroups);
```

### 🎯 **Diagnóstico:**

| Resultado | Problema | Solución |
|-----------|----------|----------|
| `userRole = null` | Usuario sin rol | Asignar rol en `user_roles` |
| `permissions.length = 0` | Rol sin permisos | Verificar `role_screen_actions` |
| `screens.length = 0` | Permisos no apuntan a pantallas | Verificar `screen_actions` |
| `menuGroups.length = 0` | Pantallas sin grupo | Verificar `system_menu_groups` |
| `tenant_id` incorrecto | Filtrando por tenant equivocado | Usar `role.tenant_id` |

---

## 🎯 8. Frase Clave para Cerrar

> **"Si un rol existe y tiene role_screen_actions, el menú DEBE aparecer.**
> **Si no aparece, el bug está en la query del frontend, NO en el seed."**

### ✅ **El seed está correcto:**
- ✅ 5 roles creados (SYSTEM_ADMIN, TENANT_ADMIN, RRHH_ADMIN, SUPERVISOR, EMPLOYEE)
- ✅ 32 pantallas definidas
- ✅ 28 acciones globales
- ✅ ~140 relaciones screen_actions
- ✅ ~140 permisos role_screen_actions

### 🔍 **Si hay menú vacío:**
- ❌ NO es problema del seed
- ❌ NO es problema de la base de datos
- ✅ **ES** problema de la query en el frontend

---

## 📋 9. Checklist Final de Implementación

### Backend (✅ Completo):
- [x] Roles con nombres completos (VARCHAR(30))
- [x] Permisos en role_screen_actions
- [x] Pantallas en screens
- [x] Menu groups en system_menu_groups
- [x] Usuario bootstrap (system.admin)

### Frontend (🔴 Pendiente):
- [ ] Query completa siguiendo toda la cadena
- [ ] Filtro por `role.tenant_id` (NO `user.tenant_id`)
- [ ] Uso de role_key completos (NO abreviados)
- [ ] Componente UnderConstruction para rutas pendientes
- [ ] Wizard que usa tenant SYSTEM existente
- [ ] Fallback para traducciones faltantes

### Testing (🔴 Pendiente):
- [ ] Login con system.admin → ver menú SECURITY + MAINT
- [ ] Crear tenant.admin → ver menú MAINT + CONFIG + ORG
- [ ] Click en ruta pendiente → ver "Bajo construcción"
- [ ] Cambiar idioma → menú sigue visible (con fallback)

---

## 🚀 10. Próximos Pasos

1. **Ejecutar Factory Reset + Seed** en Supabase
2. **Actualizar queries del frontend** siguiendo la cadena completa
3. **Reemplazar role_key abreviados** por nombres completos
4. **Implementar UnderConstruction** para rutas pendientes
5. **Ajustar wizard** para usar tenant SYSTEM existente
6. **Probar flujo completo** de login y visualización de menú

---

**Fecha:** 2026-01-25  
**Versión:** 1.0.0 DEFINITIVA  
**Estado:** ✅ LISTO PARA IMPLEMENTAR

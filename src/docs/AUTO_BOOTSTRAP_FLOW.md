# 🚀 AUTO-BOOTSTRAP FLOW - Turnos Titanium Enterprise

## 📋 RESUMEN

El sistema usa un flujo de **auto-bootstrap** para crear automáticamente el usuario `system.admin@titanium-labs.com` en el primer login, sin necesidad de crear datos en SQL manualmente.

---

## ✅ FLUJO COMPLETO (ENFOQUE B - AUTO-BOOTSTRAP)

### **PASO 1: Ejecutar migraciones**

```
1. Ve a Supabase Dashboard > SQL Editor

2. Ejecuta en orden:
   a) 001_FACTORY_RESET.sql
   b) 002_SEED_COMPLETE.sql (NO crea usuarios)
   c) 003_TENANT_PROTECTION_SUPABASE.sql

3. Esto crea:
   ✅ Tenant SYSTEM
   ✅ Roles (SYSTEM_ADMIN, TENANT_ADMIN, etc.)
   ✅ Permisos granulares
   ✅ Pantallas y acciones
   ❌ NO crea usuarios en public.users
```

---

### **PASO 2: Crear usuario en Supabase Authentication (MANUAL)**

**⚠️ ÚNICO PASO MANUAL:**

```
1. Dashboard > Authentication > Users

2. Click "Add user" > "Create new user"

3. Completa:
   ┌──────────────────────────────────────────────┐
   │ Email: system.admin@titanium-labs.com        │
   │ Password: Titanium2026!                      │
   │ ☑️ Auto Confirm User ← IMPORTANTE           │
   └──────────────────────────────────────────────┘

4. Click "Create user"

5. Verifica que aparezca con estado "Confirmed ✅"
```

---

### **PASO 3: Primer login (AUTO-BOOTSTRAP)**

**🔧 El sistema detecta automáticamente que es el usuario bootstrap y lo crea en BD.**

```
1. Ve a la aplicación

2. Ingresa:
   📧 Email: system.admin@titanium-labs.com
   🔑 Password: Titanium2026!

3. Click "Iniciar Sesión"

4. AuthContext ejecuta AUTO-BOOTSTRAP:
   
   a) Busca usuario en public.users por auth_user_id → NO EXISTE
   
   b) Detecta email === 'system.admin@titanium-labs.com'
   
   c) Obtiene tenant SYSTEM desde public.tenants
   
   d) Obtiene rol SYSTEM_ADMIN desde public.roles
   
   e) CREA usuario en public.users:
      - tenant_id: [SYSTEM tenant UUID]
      - auth_user_id: [auth.users UUID]
      - username: 'system.admin'
      - email: 'system.admin@titanium-labs.com'
      - display_name: 'System Administrator'
   
   f) CREA relación en public.user_roles:
      - user_id: [nuevo usuario UUID]
      - role_id: [SYSTEM_ADMIN UUID]
      - tenant_id: [SYSTEM tenant UUID]
      - is_active: true
   
   g) Carga perfil completo y establece roles

5. ✅ Login exitoso
```

**Logs esperados en consola:**

```
🔧 Detectado usuario bootstrap, auto-creando en BD...
✅ Tenant SYSTEM encontrado: {...}
✅ Rol SYSTEM_ADMIN encontrado: {...}
✅ Usuario creado en public.users: {...}
✅ Rol SYSTEM_ADMIN asignado correctamente
✅ Usuario bootstrap creado exitosamente
✅ Roles establecidos: ["SYSTEM_ADMIN"]
```

---

## 🔍 DIAGRAMA DEL FLUJO

```
┌─────────────────────────────────────────────────┐
│ PASO 1: Ejecutar migraciones SQL               │
│                                                 │
│ 001_FACTORY_RESET.sql                          │
│  └─> Recrea todas las tablas                   │
│                                                 │
│ 002_SEED_COMPLETE.sql                          │
│  ├─> Crea tenant SYSTEM                        │
│  ├─> Crea roles (5 roles base)                 │
│  ├─> Crea permisos granulares                  │
│  └─> NO crea usuarios                          │
│                                                 │
│ 003_TENANT_PROTECTION_SUPABASE.sql             │
│  └─> Protecciones de tenant único              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ PASO 2: Crear en Supabase Authentication       │
│ (MANUAL - Dashboard UI)                         │
│                                                 │
│ auth.users                                      │
│  └─> Email: system.admin@titanium-labs.com     │
│  └─> Password: Titanium2026!                   │
│  └─> Auto-confirm: ✅                           │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ PASO 3: Login en la aplicación                 │
│ (AUTO-BOOTSTRAP - AuthContext)                  │
│                                                 │
│ AuthContext.loadProfile()                       │
│  ├─> Busca en public.users → NO EXISTE         │
│  ├─> Detecta email bootstrap                   │
│  ├─> Obtiene tenant SYSTEM                     │
│  ├─> Obtiene rol SYSTEM_ADMIN                  │
│  ├─> Crea en public.users                      │
│  ├─> Crea en public.user_roles                 │
│  └─> Carga perfil completo                     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ ✅ RESULTADO                                    │
│                                                 │
│ Usuario completo en BD:                         │
│  ├─> auth.users (creado manual)                │
│  ├─> public.users (auto-bootstrap)             │
│  ├─> public.user_roles (auto-bootstrap)        │
│  └─> users_with_primary_role (vista)           │
└─────────────────────────────────────────────────┘
```

---

## 🎯 VENTAJAS DE ESTE ENFOQUE

### ✅ Simplicidad
- Solo 1 paso manual (crear en Authentication)
- Todo lo demás es automático

### ✅ Seguridad
- No se expone SERVICE_ROLE_KEY en archivos SQL
- Validaciones en código (tenant SYSTEM existe, rol existe)

### ✅ Portabilidad
- Funciona en cualquier Supabase
- No requiere extensiones especiales (pg_net)

### ✅ Debuggeabilidad
- Logs claros en consola del navegador
- Fácil identificar dónde falla

### ✅ Extensibilidad
- Fácil agregar más usuarios bootstrap (ej: demo@company.com)
- Lógica centralizada en AuthContext

---

## 🔧 CÓDIGO IMPLEMENTADO

### AuthContext.tsx (líneas 150-270)

```typescript
// ⚠️ PASO 2: Usuario NO encontrado
console.warn('⚠️ Usuario NO encontrado en BD');

// 🔧 AUTO-BOOTSTRAP: Si es el usuario system.admin
if (currentUser.email === 'system.admin@titanium-labs.com') {
  console.log('🔧 Detectado usuario bootstrap, auto-creando en BD...');
  
  // 1. Obtener tenant SYSTEM
  const { data: systemTenant } = await supabase
    .from('tenants')
    .select('id, tenant_key, tenant_name')
    .eq('tenant_key', 'SYSTEM')
    .maybeSingle();
  
  // 2. Obtener rol SYSTEM_ADMIN
  const { data: systemAdminRole } = await supabase
    .from('roles')
    .select('id, role_key, role_name')
    .eq('role_key', 'SYSTEM_ADMIN')
    .eq('tenant_id', systemTenant.id)
    .maybeSingle();
  
  // 3. Crear usuario en public.users
  const { data: newUser } = await supabase
    .from('users')
    .insert({
      tenant_id: systemTenant.id,
      auth_user_id: currentUser.id,  // ✅ Del auth.users
      username: 'system.admin',
      email: currentUser.email,
      display_name: 'System Administrator',
      preferred_language_code: 'es',
      is_active: true,
      created_by: 'SYSTEM',
      created_at: new Date().toISOString()
    })
    .select('id, ...')
    .single();
  
  // 4. Asignar rol SYSTEM_ADMIN
  await supabase
    .from('user_roles')
    .insert({
      tenant_id: systemTenant.id,
      user_id: newUser.id,
      role_id: systemAdminRole.id,
      is_active: true,
      created_by: 'SYSTEM'
    });
  
  // 5. Cargar perfil y continuar
  setProfile(bootstrapProfile);
  setUserRoles([systemAdminRole.role_key]);
  return;
}
```

---

## 🆕 AGREGAR MÁS USUARIOS BOOTSTRAP

Para agregar más usuarios que se auto-creen (ej: demo@company.com):

```typescript
// En AuthContext.tsx, línea ~150
const BOOTSTRAP_USERS = {
  'system.admin@titanium-labs.com': {
    tenant_key: 'SYSTEM',
    role_key: 'SYSTEM_ADMIN',
    username: 'system.admin',
    display_name: 'System Administrator'
  },
  'demo@company.com': {
    tenant_key: 'SYSTEM',
    role_key: 'TENANT_ADMIN',
    username: 'demo',
    display_name: 'Demo User'
  }
};

const bootstrapUser = BOOTSTRAP_USERS[currentUser.email];
if (bootstrapUser) {
  // ... lógica de auto-bootstrap con bootstrapUser.tenant_key, etc.
}
```

---

## ❓ FAQ

### ¿Por qué no crear el usuario directamente en SQL?

Supabase **no permite** crear en `auth.users` desde SQL estándar por seguridad. Solo puedes hacerlo vía:
- Dashboard UI (manual)
- Admin API con SERVICE_ROLE_KEY (backend)
- JavaScript Admin SDK (servidor)

### ¿Qué pasa si el tenant SYSTEM no existe?

El auto-bootstrap **falla** con un error claro:
```
❌ Error: Tenant SYSTEM no encontrado. Ejecuta 002_SEED_COMPLETE.sql
```

Esto es intencional para detectar problemas en las migraciones.

### ¿Qué pasa si intento hacer login con otro email?

Si el email NO es uno de los usuarios bootstrap:
```typescript
// Crea perfil temporal (sin roles, sin acceso real)
const tempProfile = {
  id: currentUser.id,
  tenant_id: 'default',
  tenant_name: 'Empresa Demo',
  ...
};
```

Este perfil permite que el usuario vea la interfaz pero **no tiene permisos** para hacer nada.

### ¿El auth_user_id debe ser NULLABLE?

**Sí**, porque:
1. El auto-bootstrap crea el usuario con auth_user_id desde el inicio
2. Pero dejarlo NULLABLE permite flexibilidad para otros flujos (ej: importación de usuarios)
3. La constraint UNIQUE sigue evitando duplicados

---

## 🚀 PRÓXIMOS PASOS

Después del auto-bootstrap de system.admin:

1. ✅ Wizard de configuración (2 pasos)
2. ✅ Crear tenant.admin para el tenant corporativo
3. ✅ Configurar empresa, departamentos, etc.

---

**Fecha:** 2026-01-31  
**Versión:** 1.1.0  
**Enfoque:** B (Auto-bootstrap en aplicación)  
**Estado:** ✅ Implementado

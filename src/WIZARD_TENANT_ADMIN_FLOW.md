# 📋 FLUJO COMPLETO: Creación del Usuario tenant.admin

## 🎯 Objetivo del Wizard

El wizard **NO crea un nuevo tenant**. Su propósito es:

1. ✅ **Complementar información** del tenant SYSTEM existente (creado en el seed)
2. ✅ **Crear el usuario tenant.admin** que pertenece al tenant SYSTEM
3. ✅ **Asignar rol TNT_ADMIN** al usuario creado

---

## 📂 Estructura de Archivos

### Frontend (React)
```
/components/
├── ConfigurationWizard.tsx           # Componente principal del wizard (5 pasos)
└── wizard/
    ├── WizardStepTenant.tsx          # Paso 1: Configuración del tenant
    ├── WizardStepCompany.tsx         # Paso 2: Información de la empresa
    ├── WizardStepStructure.tsx       # Paso 3: Estructura organizacional
    ├── WizardStepEmployees.tsx       # Paso 4: Empleados iniciales
    └── WizardStepAdminUser.tsx       # Paso 5: Usuario tenant.admin ⭐
```

### Backend (Deno/Hono)
```
/supabase/functions/server/
├── index.tsx                         # Rutas del servidor
└── bootstrap.tsx                     # Lógica de bootstrap y wizard
    ├── bootstrapStep1Tenant()        # POST /bootstrap/step1-tenant
    ├── bootstrapStep2Admin()         # POST /bootstrap/step2-admin (LEGACY)
    └── bootstrapComplete()           # POST /bootstrap/complete ⭐
```

---

## 🔄 FLUJO COMPLETO: Paso 5 - Crear Usuario tenant.admin

### 📍 **Archivo Frontend:** `/components/wizard/WizardStepAdminUser.tsx`

#### 1️⃣ **Formulario de Usuario**
```typescript
const [formData, setFormData] = useState({
  admin_username: '',        // Username personalizado (opcional)
  admin_name: '',            // Nombre (requerido)
  admin_lastname: '',        // Apellido (requerido)
  admin_email: '',           // Email (requerido)
  admin_phone: '',           // Teléfono (opcional)
  admin_password: '',        // Contraseña (requerido, min 8 chars)
  admin_password_confirm: '' // Confirmar contraseña
});
```

**Ubicación:** Líneas 17-25

---

#### 2️⃣ **Obtener tenant_id (al montar el componente)**

```typescript
useEffect(() => {
  // Intentar desde localStorage
  const storedTenantId = localStorage.getItem('tenant_id');
  
  if (storedTenantId && isValidUUID(storedTenantId)) {
    setTenantId(storedTenantId);
  } else {
    // Fallback: obtener desde backend
    fetch('/bootstrap/tenant-info')
      .then(data => {
        setTenantId(data.tenant_id);
        localStorage.setItem('tenant_id', data.tenant_id);
      });
  }
}, []);
```

**Ubicación:** Líneas 36-90

**⚠️ IMPORTANTE:** El `tenant_id` debe ser el UUID del tenant SYSTEM (no crear uno nuevo)

---

#### 3️⃣ **Validar Formulario**

```typescript
const validateForm = (): string | null => {
  if (!formData.admin_name.trim()) return 'El nombre es obligatorio';
  if (!formData.admin_lastname.trim()) return 'El apellido es obligatorio';
  if (!formData.admin_email.trim()) return 'El email es obligatorio';
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.admin_email)) {
    return 'El correo electrónico no tiene un formato válido';
  }
  
  if (!formData.admin_password) return 'La contraseña es obligatoria';
  if (formData.admin_password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (formData.admin_password !== formData.admin_password_confirm) {
    return 'Las contraseñas no coinciden';
  }
  
  return null; // ✅ Todo OK
};
```

**Ubicación:** Líneas 95-123

---

#### 4️⃣ **Enviar Request al Backend**

```typescript
const handleCreateAdmin = async () => {
  // 1. Validar tenant_id
  if (!tenantId) {
    setError('El tenant aún no está listo. Vuelve al Paso 1.');
    return;
  }
  
  // 2. Validar formulario
  const validationError = validateForm();
  if (validationError) {
    setError(validationError);
    return;
  }
  
  try {
    setIsCreating(true);
    setError(null);
    
    // 3. Enviar request
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-e19f2094/bootstrap/complete`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'X-Bootstrap-Token': bootstrapToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: tenantId,              // ⚠️ UUID del tenant SYSTEM
          email: formData.admin_email.trim().toLowerCase(),
          password: formData.admin_password,
          username: formData.admin_username.trim() || null,
          name: formData.admin_name.trim(),
          lastname: formData.admin_lastname.trim(),
          phone: formData.admin_phone.trim() || null,
          preferred_language_code: null,
          email_confirm: true
        })
      }
    );
    
    // 4. Procesar respuesta
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error HTTP:', response.status, errorText);
      setError(`Error del servidor (${response.status})`);
      return;
    }
    
    const result = await response.json();
    
    // 5. Verificar resultado
    if (result.ok && (result.status === 'COMPLETED' || result.status === 'ALREADY_EXISTS')) {
      console.log('✅ Usuario creado:', result.admin_user);
      
      // Limpiar tokens temporales
      localStorage.removeItem('bootstrapToken');
      localStorage.removeItem('tenant_id');
      
      // Completar wizard
      onComplete({
        adminEmail: result.admin_user.email,
        adminUsername: result.admin_user.username,
        displayName: result.admin_user.display_name,
        wizardCompleted: true
      });
    } else {
      console.error('❌ Error:', result.error);
      setError(result.error.message);
    }
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    setError('Error desconocido');
  } finally {
    setIsCreating(false);
  }
};
```

**Ubicación:** Líneas 128-284

---

### 📍 **Archivo Backend:** `/supabase/functions/server/bootstrap.tsx`

#### 5️⃣ **Endpoint: POST /bootstrap/complete**

**Función:** `bootstrapComplete(c: Context)`

**Ubicación:** Líneas 522-850+ (aproximadamente)

---

#### **PASO A: Buscar tenant SYSTEM**

```typescript
console.log('🔍 [STEP2] Buscando tenant SYSTEM...');
const { data: systemTenant, error: tenantFetchError } = await supabase
  .from('tenants')
  .select('id, tenant_key, tenant_name')
  .eq('tenant_key', 'SYSTEM')  // ⭐ BUSCAR SYSTEM, no crear nuevo
  .single();

if (tenantFetchError || !systemTenant) {
  console.error('❌ Tenant SYSTEM no encontrado. Ejecutar 002_SEED_COMPLETE.sql primero.');
  return c.json({ 
    error: 'Tenant SYSTEM no encontrado',
    details: 'Ejecutar las migraciones SQL primero'
  }, 500);
}

const tenantId = systemTenant.id;
console.log('✅ Tenant SYSTEM encontrado:', tenantId);
```

**Ubicación:** Líneas 551-567

**⚠️ CRÍTICO:** El código **NO crea un tenant nuevo**. Solo busca el tenant SYSTEM que ya existe del seed.

---

#### **PASO B: Buscar rol TNT_ADMIN**

```typescript
console.log('📝 [STEP2] Buscando rol TNT_ADMIN en tenant SYSTEM...');

// Intentar buscar con scope TENANT
const { data: roleWithScope, error: roleError } = await supabase
  .from('roles')
  .select('id, role_key, role_scope')
  .eq('role_key', 'TNT_ADMIN')
  .eq('role_scope', 'TENANT')
  .maybeSingle();

if (roleWithScope) {
  role = roleWithScope;
  console.log('✅ Rol TNT_ADMIN encontrado:', role.id);
} else {
  // Fallback: buscar sin filtro de scope
  const { data: roleNoScope } = await supabase
    .from('roles')
    .select('id, role_key, role_scope')
    .eq('role_key', 'TNT_ADMIN')
    .maybeSingle();
  
  if (roleNoScope) {
    role = roleNoScope;
  } else {
    return c.json({ 
      error: 'Rol TNT_ADMIN no encontrado. El seed podría estar incompleto.'
    }, 500);
  }
}
```

**Ubicación:** Líneas 569-617

---

#### **PASO C: Verificar si el email ya existe en Auth**

```typescript
console.log('📝 [STEP2] Verificando si el email ya existe en Auth...');
const { data: listData } = await supabase.auth.admin.listUsers();
const existingAuthUser = listData?.users?.find(u => u.email === email);

let authUserId: string;
let shouldCreateUserInPublicUsers = true;
let existingPublicUserId: string | null = null;

if (existingAuthUser) {
  console.log('⚠️ Usuario ya existe en Auth:', existingAuthUser.id);
  
  // Verificar si está en public.users
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, tenant_id, username, email')
    .eq('auth_user_id', existingAuthUser.id)
    .maybeSingle();
  
  if (existingUser) {
    if (existingUser.tenant_id === tenantId) {
      // ✅ IDEMPOTENCIA: Usuario ya configurado para este tenant
      console.log('✅ Usuario ya existe (idempotencia)');
      shouldCreateUserInPublicUsers = false;
      existingPublicUserId = existingUser.id;
      authUserId = existingAuthUser.id;
    } else {
      // ❌ Email en uso en otro tenant
      return c.json({ 
        error: 'Este email ya está en uso. Use un email diferente.' 
      }, 400);
    }
  } else {
    // Usuario en Auth pero no en public.users
    console.log('🔄 Completando registro...');
    authUserId = existingAuthUser.id;
    await supabase.auth.admin.updateUserById(authUserId, { password });
  }
} else {
  // Usuario NO existe, crear en Auth
  console.log('📝 Creando usuario en Auth...');
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: display_name }
  });
  
  if (authError) {
    return c.json({ error: `Error creando usuario: ${authError.message}` }, 500);
  }
  
  authUserId = authData!.user.id;
  console.log('✅ Usuario creado en Auth:', authUserId);
}
```

**Ubicación:** Líneas 619-705

---

#### **PASO D: Crear usuario en public.users**

```typescript
let userId: string;

if (shouldCreateUserInPublicUsers) {
  console.log('📝 Creando usuario en public.users...');
  
  let userData;
  let userError;
  
  if (existingAuthUser) {
    // Usuario existía en Auth: usar UPSERT
    const result = await supabase
      .from('users')
      .upsert({
        auth_user_id: authUserId,
        tenant_id: tenantId,        // ⭐ tenant SYSTEM
        username,
        email,
        display_name,
        is_active: true,
        created_by: 'BOOTSTRAP'
      }, { onConflict: 'auth_user_id' })
      .select('id')
      .single();
    
    userData = result.data;
    userError = result.error;
  } else {
    // Usuario NO existía: usar INSERT
    const result = await supabase
      .from('users')
      .insert({
        auth_user_id: authUserId,
        tenant_id: tenantId,        // ⭐ tenant SYSTEM
        username,
        email,
        display_name,
        is_active: true,
        created_by: 'BOOTSTRAP'
      })
      .select('id')
      .single();
    
    userData = result.data;
    userError = result.error;
  }
  
  if (userError || !userData) {
    console.error('❌ Error creando usuario en public.users:', userError);
    return c.json({ error: 'Error creando usuario' }, 500);
  }
  
  userId = userData.id;
  console.log('✅ Usuario creado en public.users:', userId);
} else {
  // Usuario ya existía (idempotencia)
  userId = existingPublicUserId!;
  console.log('✅ Usando usuario existente:', userId);
}
```

**Ubicación:** Líneas 707-760+

---

#### **PASO E: Asignar rol TNT_ADMIN**

```typescript
console.log('📝 Asignando rol TNT_ADMIN al usuario...');

// Verificar si ya tiene el rol
const { data: existingRole } = await supabase
  .from('user_roles')
  .select('id')
  .eq('user_id', userId)
  .eq('role_id', role.id)
  .maybeSingle();

if (existingRole) {
  console.log('✅ Usuario ya tiene el rol TNT_ADMIN (idempotencia)');
} else {
  // Asignar rol
  const { error: roleAssignError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role_id: role.id,
      is_primary: true,
      created_by: 'BOOTSTRAP'
    });
  
  if (roleAssignError) {
    console.error('❌ Error asignando rol:', roleAssignError);
    return c.json({ error: 'Error asignando rol' }, 500);
  }
  
  console.log('✅ Rol TNT_ADMIN asignado correctamente');
}
```

**Ubicación:** Líneas 760-800+ (aproximadamente)

---

#### **PASO F: Marcar onboarding como completado**

```typescript
console.log('📝 Marcando onboarding como completado...');

const { error: onboardingError } = await supabase
  .from('tenant_onboarding')
  .upsert({
    tenant_id: tenantId,
    onboarding_status: 'COMPLETED',
    current_step: 'DONE',
    completion_percentage: 100,
    completed_at: new Date().toISOString()
  }, { onConflict: 'tenant_id' });

if (onboardingError) {
  console.error('⚠️ Error marcando onboarding:', onboardingError);
  // No bloquear el flujo por esto
}

console.log('✅ Onboarding marcado como completado');
```

**Ubicación:** Líneas 800-820+ (aproximadamente)

---

#### **PASO G: Devolver respuesta exitosa**

```typescript
return c.json({
  ok: true,
  status: shouldCreateUserInPublicUsers ? 'COMPLETED' : 'ALREADY_EXISTS',
  admin_user: {
    auth_user_id: authUserId,
    public_user_id: userId,
    email,
    username,
    display_name,
    phone
  },
  onboarding: {
    onboarding_status: 'COMPLETED',
    completion_percentage: 100
  }
});
```

**Ubicación:** Líneas 820-840+ (aproximadamente)

---

## 📊 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND: WizardStepAdminUser.tsx                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuario llena formulario:                              │
│     - Nombre, Apellido                                     │
│     - Email (será el username de login)                    │
│     - Contraseña (min 8 caracteres)                        │
│     - Username personalizado (opcional)                    │
│     - Teléfono (opcional)                                  │
│                                                             │
│  2. Click en "Completar Configuración"                     │
│     ├─ Validar formulario                                  │
│     ├─ Verificar tenant_id (debe existir)                  │
│     └─ Enviar POST a /bootstrap/complete                   │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ POST Request
                   │ Body: {
                   │   tenant_id: "xxx-xxx-xxx",  // UUID tenant SYSTEM
                   │   email: "admin@empresa.com",
                   │   password: "********",
                   │   username: "adminuser",
                   │   name: "Juan",
                   │   lastname: "Pérez",
                   │   phone: "123-456-7890"
                   │ }
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND: /bootstrap/complete                                │
│ (bootstrap.tsx - función bootstrapComplete)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  A. Buscar tenant SYSTEM                                   │
│     SELECT * FROM tenants                                  │
│     WHERE tenant_key = 'SYSTEM'                            │
│     ❌ NO crea tenant nuevo                                │
│     ✅ Usa tenant del seed                                 │
│                                                             │
│  B. Buscar rol TNT_ADMIN                                   │
│     SELECT * FROM roles                                    │
│     WHERE role_key = 'TNT_ADMIN'                           │
│     AND role_scope = 'TENANT'                              │
│                                                             │
│  C. Verificar email en Auth                                │
│     ├─ Email existe?                                       │
│     │  ├─ SÍ: Verificar tenant_id                          │
│     │  │  ├─ Mismo tenant → Idempotencia ✅               │
│     │  │  └─ Otro tenant → Error ❌                        │
│     │  └─ NO: Crear usuario Auth                           │
│     │                                                       │
│  D. Crear usuario en public.users                          │
│     INSERT INTO users (                                    │
│       auth_user_id,                                        │
│       tenant_id,      ← tenant SYSTEM                      │
│       username,                                            │
│       email,                                               │
│       display_name,                                        │
│       is_active,                                           │
│       created_by                                           │
│     )                                                       │
│                                                             │
│  E. Asignar rol TNT_ADMIN                                  │
│     INSERT INTO user_roles (                               │
│       user_id,                                             │
│       role_id,        ← TNT_ADMIN                          │
│       is_primary      ← true                               │
│     )                                                       │
│                                                             │
│  F. Marcar onboarding como COMPLETED                       │
│     UPDATE tenant_onboarding SET                           │
│       onboarding_status = 'COMPLETED',                     │
│       completion_percentage = 100                          │
│                                                             │
│  G. Retornar respuesta exitosa                             │
│     {                                                       │
│       ok: true,                                            │
│       status: 'COMPLETED',                                 │
│       admin_user: { ... }                                  │
│     }                                                       │
│                                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ JSON Response
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND: ConfigurationWizard.tsx                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Recibir datos del usuario creado                       │
│  2. Guardar credenciales para mostrar                      │
│  3. Mostrar mensaje de éxito                               │
│  4. Limpiar localStorage:                                  │
│     - bootstrapToken                                       │
│     - tenant_id                                            │
│  5. Esperar 5 segundos                                     │
│  6. Redirigir a /login                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Resultado Final en la Base de Datos

Después de completar el wizard, la base de datos debe quedar así:

### Tabla: `tenants`
| id | tenant_key | tenant_name | is_active |
|----|------------|-------------|-----------|
| uuid-1 | SYSTEM | Sistema Titanium | true |

**✅ Solo 1 tenant** (el creado en el seed, actualizado por el wizard)

---

### Tabla: `roles`
| id | tenant_id | role_key | role_name | role_scope |
|----|-----------|----------|-----------|------------|
| uuid-r1 | uuid-1 | SYSTEM_ADMIN | System Administrator | SYSTEM |
| uuid-r2 | uuid-1 | TNT_ADMIN | Tenant Administrator | TENANT |
| uuid-r3 | uuid-1 | RRHH_ADMIN | HR Administrator | TENANT |
| uuid-r4 | uuid-1 | SUPERVISOR | Supervisor | TENANT |
| uuid-r5 | uuid-1 | EMPLOYEE | Employee | TENANT |

**✅ 5 roles base** (todos en tenant SYSTEM, del seed)

---

### Tabla: `users`
| id | auth_user_id | tenant_id | username | email | display_name |
|----|--------------|-----------|----------|-------|--------------|
| uuid-u1 | auth-1 | uuid-1 | system.admin | system.admin@titanium-labs.com | System Administrator |
| uuid-u2 | auth-2 | uuid-1 | adminuser | admin@empresa.com | Juan Pérez |

**✅ 2 usuarios** (ambos en tenant SYSTEM)
- Usuario 1: `system.admin` (del seed)
- Usuario 2: `tenant.admin` (creado por el wizard) ⭐

---

### Tabla: `user_roles`
| id | user_id | role_id | is_primary |
|----|---------|---------|------------|
| uuid-ur1 | uuid-u1 | uuid-r1 | true |
| uuid-ur2 | uuid-u2 | uuid-r2 | true |

**✅ 2 asignaciones de roles**
- `system.admin` → SYSTEM_ADMIN
- `tenant.admin` → TNT_ADMIN ⭐

---

## ⚠️ Puntos Críticos a Recordar

### 1. **El wizard NO crea un tenant nuevo**
```typescript
// ❌ INCORRECTO:
const { data: newTenant } = await supabase
  .from('tenants')
  .insert({ tenant_key: 'ACME', tenant_name: 'ACME Corp' });

// ✅ CORRECTO:
const { data: systemTenant } = await supabase
  .from('tenants')
  .select('id')
  .eq('tenant_key', 'SYSTEM')
  .single();
```

### 2. **El usuario tenant.admin pertenece al tenant SYSTEM**
```typescript
// ✅ CORRECTO:
await supabase
  .from('users')
  .insert({
    auth_user_id: authUserId,
    tenant_id: systemTenantId,  // ⭐ UUID del tenant SYSTEM
    username: 'adminuser',
    email: 'admin@empresa.com'
  });
```

### 3. **El rol TNT_ADMIN está en el tenant SYSTEM**
```typescript
// ✅ CORRECTO:
const { data: role } = await supabase
  .from('roles')
  .select('id')
  .eq('role_key', 'TNT_ADMIN')
  .eq('tenant_id', systemTenantId)  // ⭐ Buscar en tenant SYSTEM
  .single();
```

### 4. **Idempotencia**
El wizard puede ejecutarse múltiples veces sin crear duplicados:
- Si el email ya existe en Auth → Reutilizar
- Si el usuario ya está en public.users con mismo tenant → Mantener
- Si el usuario ya tiene el rol TNT_ADMIN → No duplicar

---

## 📝 Resumen Ejecutivo

| Componente | Propósito | ¿Crea tenant nuevo? |
|------------|-----------|---------------------|
| **Paso 1: WizardStepTenant** | Actualiza configuración del tenant SYSTEM | ❌ NO |
| **Paso 2: WizardStepCompany** | Guarda información de la empresa | ❌ NO |
| **Paso 3: WizardStepStructure** | Define estructura organizacional | ❌ NO |
| **Paso 4: WizardStepEmployees** | Registra empleados iniciales | ❌ NO |
| **Paso 5: WizardStepAdminUser** | Crea usuario tenant.admin en tenant SYSTEM | ❌ NO |

**✅ Resultado Final:**
- 1 tenant: SYSTEM (del seed)
- 2 usuarios: system.admin (seed) + tenant.admin (wizard)
- Ambos usuarios pertenecen al tenant SYSTEM
- system.admin tiene rol SYSTEM_ADMIN
- tenant.admin tiene rol TNT_ADMIN

---

## 🔗 Referencias

- **Frontend Wizard:** `/components/wizard/WizardStepAdminUser.tsx`
- **Backend Endpoint:** `/supabase/functions/server/bootstrap.tsx` → `bootstrapComplete()`
- **Seed SQL:** `/supabase/migrations/002_SEED_COMPLETE.sql`
- **Documentación:** `/SETUP_DATABASE.md`

---

**Fecha:** 2026-01-24  
**Versión:** 1.0.0  
**Proyecto:** Turnos Titanium Enterprise

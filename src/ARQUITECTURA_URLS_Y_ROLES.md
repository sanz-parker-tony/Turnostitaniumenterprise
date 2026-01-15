# 🏗️ ARQUITECTURA: URLs SEPARADAS Y MATRIZ DE ROLES

**Fecha:** 2026-01-12  
**Versión:** v1.0 - Propuesta Definitiva  
**Estado:** 📋 PENDIENTE APROBACIÓN

---

## 🎯 OBJETIVO

Separar completamente el **Wizard de Configuración Inicial (IT)** del **Login de Usuarios Productivos**, y definir con claridad absoluta qué puede hacer cada ROL en el sistema.

---

## 📍 PARTE 1: SEPARACIÓN DE URLs

### **PROBLEMA ACTUAL:**

Actualmente, el wizard y el login comparten la misma ruta base (`/`) y se controlan con estados en `App.tsx`:

```typescript
// ❌ PROBLEMA: Todo en la misma ruta
if (showWizard) return <ConfigurationWizard />;
if (showLogin) return <Login />;
```

Esto genera:
- ❌ Confusión en acceso
- ❌ No hay control de acceso explícito
- ❌ LocalStorage como única forma de control

---

### **SOLUCIÓN PROPUESTA:**

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA DE URLs                      │
└─────────────────────────────────────────────────────────────┘

1. WIZARD DE CONFIGURACIÓN INICIAL (IT ONLY)
   ╔═══════════════════════════════════════════════════════╗
   ║  URL: https://turnos.miempresa.com/setup              ║
   ║  Acceso: SOLO equipo IT en instalación inicial       ║
   ║  Propósito: Crear TENANT_ADMIN inicial               ║
   ║  Protección: Requiere SETUP_TOKEN secreto             ║
   ╚═══════════════════════════════════════════════════════╝

   FLUJO:
   ├─> /setup?token=SECRET_SETUP_TOKEN_12345
   ├─> Validar token en servidor
   ├─> Mostrar wizard 5 pasos
   ├─> Crear tenant, compañía, admin user
   └─> Redirigir a /login con mensaje de éxito


2. LOGIN PRODUCTIVO (USUARIOS FINALES)
   ╔═══════════════════════════════════════════════════════╗
   ║  URL: https://turnos.miempresa.com/login              ║
   ║  Acceso: Todos los usuarios del sistema              ║
   ║  Propósito: Acceso diario al sistema                 ║
   ║  Protección: Email + Password (Supabase Auth)        ║
   ╚═══════════════════════════════════════════════════════╝

   FLUJO:
   ├─> /login
   ├─> Email + Password
   ├─> Validar con Supabase Auth
   ├─> Cargar permisos según rol
   └─> Redirigir a /dashboard


3. DASHBOARD (USUARIOS AUTENTICADOS)
   ╔═══════════════════════════════════════════════════════╗
   ║  URL: https://turnos.miempresa.com/dashboard          ║
   ║  Acceso: Solo usuarios con sesión activa             ║
   ║  Propósito: Aplicación principal                     ║
   ║  Protección: Middleware de autenticación             ║
   ╚═══════════════════════════════════════════════════════╝

   FLUJO:
   ├─> Middleware valida sesión
   ├─> Cargar permisos del usuario
   ├─> Construir menú dinámico según rol
   └─> Renderizar LayoutNew


4. KIOSK (PORTAL EMPLEADOS)
   ╔═══════════════════════════════════════════════════════╗
   ║  URL: https://turnos.miempresa.com/kiosk              ║
   ║  Acceso: Pantallas públicas con identificación PIN   ║
   ║  Propósito: Portal de autoservicio empleados         ║
   ║  Protección: PIN de 4 dígitos + token temporal       ║
   ╚═══════════════════════════════════════════════════════╝

   FLUJO:
   ├─> /kiosk/punch (pantalla de login con PIN)
   ├─> Validar PIN con endpoint público
   ├─> Generar session_token temporal
   └─> Acceso a pantallas de autoservicio
```

---

## 🔐 IMPLEMENTACIÓN TÉCNICA

### **A. Estructura de Archivos Next.js App Router**

```
/app/
├── setup/
│   └── page.tsx                    ← Wizard IT (protegido con token)
│
├── login/
│   └── page.tsx                    ← Login productivo
│
├── dashboard/
│   └── page.tsx                    ← Dashboard principal
│
├── kiosk/
│   ├── punch/
│   │   └── page.tsx                ← Marcación
│   ├── regularization/
│   │   └── page.tsx                ← Regularización
│   ├── permission/
│   │   └── page.tsx                ← Permisos
│   ├── justification/
│   │   └── page.tsx                ← Justificaciones
│   └── shift-change/
│       └── page.tsx                ← Cambio de turno
│
└── layout.tsx                      ← Layout raíz
```

---

### **B. Middleware de Protección**

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ==========================================
  // 1. WIZARD SETUP (REQUIERE TOKEN SECRETO)
  // ==========================================
  if (pathname.startsWith('/setup')) {
    const setupToken = req.nextUrl.searchParams.get('token');
    const validToken = process.env.SETUP_SECRET_TOKEN;

    // Validar que el token exista y coincida
    if (!setupToken || setupToken !== validToken) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Verificar que no se haya ejecutado el setup
    const setupCompleted = await checkIfSetupCompleted();
    if (setupCompleted) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  }

  // ==========================================
  // 2. KIOSK (PÚBLICO, NO REQUIERE AUTH)
  // ==========================================
  if (pathname.startsWith('/kiosk')) {
    return NextResponse.next();
  }

  // ==========================================
  // 3. LOGIN (PÚBLICO)
  // ==========================================
  if (pathname === '/login') {
    const session = await getSession(req);
    
    // Si ya tiene sesión, redirigir a dashboard
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    return NextResponse.next();
  }

  // ==========================================
  // 4. RUTAS PROTEGIDAS (REQUIEREN AUTH)
  // ==========================================
  const session = await getSession(req);
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/setup/:path*',
    '/kiosk/:path*',
    '/login',
    '/dashboard/:path*'
  ]
};
```

---

### **C. Variable de Entorno para Setup Token**

```bash
# .env.local (SOLO VISIBLE PARA IT)
SETUP_SECRET_TOKEN=titanium-setup-2026-abc123xyz
```

**Distribución:**
1. Equipo IT recibe archivo `.env.local` cifrado
2. Token se configura una sola vez en instalación
3. Una vez completado el wizard, el token se invalida en BD

---

## 👥 PARTE 2: MATRIZ DE ROLES Y PERMISOS

### **ROLES DEFINIDOS:**

```
┌────────────────────────────────────────────────────────────┐
│                      ROLES DEL SISTEMA                      │
└────────────────────────────────────────────────────────────┘

1. SUPER_ADMIN (Implícito - No visible en UI)
   ├─ Creado por sistema en setup inicial
   ├─ Acceso TOTAL a todas las pantallas
   ├─ Scope: TENANT (ve todo el tenant)
   └─ Uso: Casos excepcionales de soporte

2. TENANT_ADMIN (Primer usuario creado en wizard)
   ├─ Administrador del tenant
   ├─ Crea/administra roles, usuarios y permisos
   ├─ Scope: TENANT (ve todo)
   └─ Pantallas: Seguridad, Usuarios, Configuración

3. SYSTEM_ADMIN
   ├─ Administrador técnico del sistema
   ├─ Configura catálogos, parámetros, dispositivos
   ├─ Scope: TENANT
   └─ Pantallas: Configuración, Mantenimiento

4. RRHH_ADMIN
   ├─ Administrador de Recursos Humanos
   ├─ Gestiona empleados, turnos, reportes
   ├─ Scope: TENANT (puede limitar a COMPANY)
   └─ Pantallas: Empleados, Turnos, Reportes, Solicitudes

5. SUPERVISOR
   ├─ Supervisor de área/departamento
   ├─ Aprueba solicitudes, ve reportes de su área
   ├─ Scope: COMPANY, DEPARTMENT o AREA
   └─ Pantallas: Empleados (vista), Solicitudes, Reportes

6. EMPLOYEE
   ├─ Empleado final
   ├─ Solo portal de autoservicio (KIOSK)
   ├─ Scope: SELF (solo ve sus datos)
   └─ Pantallas: KIOSK completo
```

---

## 📊 MATRIZ COMPLETA DE PERMISOS

| PANTALLA | TENANT_ADMIN | SYSTEM_ADMIN | RRHH_ADMIN | SUPERVISOR | EMPLOYEE |
|----------|--------------|--------------|------------|------------|----------|
| **SEGURIDAD** |
| SEC_SCREENS | ✅ VIEW, CREATE, EDIT | ❌ | ❌ | ❌ | ❌ |
| SEC_ACTIONS | ✅ VIEW, CREATE, EDIT | ❌ | ❌ | ❌ | ❌ |
| SEC_ROLES | ✅ VIEW, CREATE, EDIT, DELETE | ❌ | ❌ | ❌ | ❌ |
| SEC_USER_ROLES | ✅ VIEW, ASSIGN | ❌ | ⚠️ VIEW | ❌ | ❌ |
| SEC_AUDIT_LOG | ✅ VIEW | ✅ VIEW | ⚠️ VIEW | ❌ | ❌ |
| **USUARIOS** |
| SEC_USERS | ✅ VIEW, CREATE, EDIT | ❌ | ⚠️ VIEW, CREATE | ❌ | ❌ |
| **CONFIGURACIÓN** |
| CONF_PARAMS | ✅ VIEW, EDIT | ✅ VIEW, EDIT | ⚠️ VIEW | ❌ | ❌ |
| CONF_DEVICES | ✅ VIEW | ✅ VIEW, CREATE, EDIT | ❌ | ❌ | ❌ |
| CONF_SHIFTS | ✅ VIEW | ✅ VIEW, CREATE, EDIT | ✅ VIEW, CREATE, EDIT | ❌ | ❌ |
| **ORGANIZACIÓN** |
| ORG_COMPANIES | ✅ VIEW, CREATE, EDIT | ⚠️ VIEW | ⚠️ VIEW | ❌ | ❌ |
| ORG_DEPARTMENTS | ✅ VIEW, CREATE, EDIT | ⚠️ VIEW | ✅ VIEW, CREATE, EDIT | ⚠️ VIEW | ❌ |
| ORG_AREAS | ✅ VIEW, CREATE, EDIT | ⚠️ VIEW | ✅ VIEW, CREATE, EDIT | ⚠️ VIEW | ❌ |
| **MANTENIMIENTO** |
| MAINT_CATALOGS | ✅ VIEW, EDIT | ✅ VIEW, EDIT | ❌ | ❌ | ❌ |
| MAINT_HOLIDAYS | ✅ VIEW | ✅ VIEW, CREATE, EDIT | ⚠️ VIEW | ❌ | ❌ |
| **EMPLEADOS** |
| EMPL_LIST | ✅ VIEW, CREATE, EDIT | ❌ | ✅ VIEW, CREATE, EDIT | ⚠️ VIEW | ❌ |
| EMPL_WORK_PATTERNS | ✅ VIEW | ⚠️ VIEW | ✅ VIEW, ASSIGN | ⚠️ VIEW | ❌ |
| EMPL_PUNCHES | ✅ VIEW | ❌ | ✅ VIEW, EDIT | ⚠️ VIEW | ❌ |
| EMPL_JUSTIFICATIONS | ✅ VIEW | ❌ | ✅ VIEW, APPROVE | ⚠️ VIEW, APPROVE | ❌ |
| **ASISTENCIA** |
| ATT_TIME_PUNCHES | ✅ VIEW | ❌ | ✅ VIEW, EDIT | ⚠️ VIEW | ❌ |
| ATT_ANOMALIES | ✅ VIEW | ❌ | ✅ VIEW, RESOLVE | ⚠️ VIEW | ❌ |
| ATT_SHIFT_PLANS | ✅ VIEW | ❌ | ✅ VIEW, CREATE, EDIT | ⚠️ VIEW | ❌ |
| **SOLICITUDES** |
| REQ_PERMITS | ✅ VIEW, APPROVE | ❌ | ✅ VIEW, APPROVE | ⚠️ VIEW, APPROVE | ❌ |
| REQ_JUSTIFICATIONS | ✅ VIEW, APPROVE | ❌ | ✅ VIEW, APPROVE | ⚠️ VIEW, APPROVE | ❌ |
| REQ_SHIFT_CHANGES | ✅ VIEW, APPROVE | ❌ | ✅ VIEW, APPROVE | ⚠️ VIEW, APPROVE | ❌ |
| REQ_REGULARIZATIONS | ✅ VIEW, APPROVE | ❌ | ✅ VIEW, APPROVE | ⚠️ VIEW, APPROVE | ❌ |
| **PROCESOS** |
| PROC_ATT_PURGE | ✅ VIEW, EXECUTE | ✅ VIEW, EXECUTE | ⚠️ VIEW | ❌ | ❌ |
| PROC_GENERATION | ✅ VIEW, EXECUTE | ❌ | ✅ VIEW, EXECUTE | ❌ | ❌ |
| **REPORTES** |
| RPT_ATTENDANCE_REPORT | ✅ VIEW, EXPORT | ⚠️ VIEW | ✅ VIEW, EXPORT | ⚠️ VIEW, EXPORT | ❌ |
| RPT_NOVELTIES_REPORT | ✅ VIEW, EXPORT | ❌ | ✅ VIEW, EXPORT | ⚠️ VIEW, EXPORT | ❌ |
| RPT_ANALYTICS | ✅ VIEW | ⚠️ VIEW | ✅ VIEW | ⚠️ VIEW | ❌ |
| **KIOSK** |
| KIOSK_PUNCH | ❌ | ❌ | ❌ | ❌ | ✅ ALL |
| KIOSK_REGULARIZATION | ❌ | ❌ | ❌ | ❌ | ✅ ALL |
| KIOSK_PERMISSION | ❌ | ❌ | ❌ | ❌ | ✅ ALL |
| KIOSK_JUSTIFICATION | ❌ | ❌ | ❌ | ❌ | ✅ ALL |
| KIOSK_SHIFT_CHANGE | ❌ | ❌ | ❌ | ❌ | ✅ ALL |

**Leyenda:**
- ✅ = Acceso completo con esas acciones
- ⚠️ = Acceso limitado por SCOPE (COMPANY, DEPARTMENT, AREA)
- ❌ = Sin acceso

---

## 🎯 DIFERENCIA CLAVE: RRHH_ADMIN vs SUPERVISOR

```
┌────────────────────────────────────────────────────────────┐
│          RRHH_ADMIN vs SUPERVISOR - COMPARACIÓN            │
└────────────────────────────────────────────────────────────┘

PANTALLAS:
├─ AMBOS ven las MISMAS PANTALLAS
└─ DIFERENCIA SOLO en el ALCANCE (SCOPE)

RRHH_ADMIN:
├─ Scope: TENANT (ve TODAS las empresas/áreas)
├─ Acciones: CREATE, EDIT, DELETE, APPROVE
├─ Ejemplo: Ve TODOS los empleados del tenant
└─ Uso: Jefe de RRHH corporativo

SUPERVISOR:
├─ Scope: COMPANY, DEPARTMENT o AREA (asignado manualmente)
├─ Acciones: VIEW, APPROVE (solo lectura + aprobar)
├─ Ejemplo: Ve SOLO empleados de su área
└─ Uso: Jefe de departamento

IMPLEMENTACIÓN:
├─ Tabla: user_role_scopes
├─ Columnas: 
│   ├─ company_id (FK a companies)
│   ├─ department_id (FK a departments)
│   └─ area_id (FK a areas)
└─ Función: get_user_screens() aplica filtros según scope
```

---

## 🔄 FLUJO COMPLETO DE IMPLEMENTACIÓN

### **FASE 1: INSTALACIÓN INICIAL (IT)**

```
1. Equipo IT recibe:
   ├─ Instalador de Turnos Titanium
   ├─ Archivo .env.local con SETUP_SECRET_TOKEN
   └─ Manual de instalación

2. IT accede a:
   └─> https://turnos.miempresa.com/setup?token=titanium-setup-2026-abc123xyz

3. Wizard de 5 pasos:
   ├─ PASO 1: Configurar Tenant
   ├─ PASO 2: Crear Compañía Principal
   ├─ PASO 3: Configurar Idioma y Zona Horaria
   ├─ PASO 4: Crear Usuario TENANT_ADMIN
   └─ PASO 5: Confirmar y Activar

4. Sistema crea:
   ├─ Registro en tabla tenants
   ├─ Registro en tabla companies
   ├─ Usuario TENANT_ADMIN en Supabase Auth
   ├─ Registro en tabla users
   ├─ Asignación de rol TENANT_ADMIN
   └─ Marca setup_completed = true

5. Redirige a /login con mensaje:
   └─> "Sistema configurado exitosamente. Inicia sesión con tu usuario TENANT_ADMIN"
```

---

### **FASE 2: CONFIGURACIÓN POST-INSTALACIÓN (TENANT_ADMIN)**

```
1. TENANT_ADMIN inicia sesión:
   └─> https://turnos.miempresa.com/login
   └─> Email: admin@miempresa.com
   └─> Password: (definida en wizard)

2. TENANT_ADMIN ve menú completo:
   ├─ Seguridad
   │   ├─ Roles
   │   ├─ Usuarios
   │   ├─ Permisos
   │   └─ Auditoría
   ├─ Configuración
   └─ ... (según permisos)

3. TENANT_ADMIN crea roles adicionales:
   ├─> Seguridad → Roles → Crear Nuevo
   ├─> SYSTEM_ADMIN
   ├─> RRHH_ADMIN
   ├─> SUPERVISOR
   └─> EMPLOYEE

4. TENANT_ADMIN crea usuarios:
   ├─> Seguridad → Usuarios → Crear Nuevo
   ├─> Asignar rol
   └─> Definir scope (si es SUPERVISOR)

5. TENANT_ADMIN asigna permisos específicos:
   └─> Seguridad → Permisos de Rol
   └─> Seleccionar pantallas y acciones por rol
```

---

### **FASE 3: USO PRODUCTIVO (USUARIOS FINALES)**

```
1. Usuario RRHH_ADMIN inicia sesión:
   └─> https://turnos.miempresa.com/login
   └─> Ve menú: Empleados, Turnos, Reportes, Solicitudes
   └─> Scope: TENANT (ve todo)

2. Usuario SUPERVISOR inicia sesión:
   └─> https://turnos.miempresa.com/login
   └─> Ve menú: Empleados (vista), Solicitudes, Reportes
   └─> Scope: DEPARTMENT "Ventas" (solo ve su departamento)

3. Usuario EMPLOYEE NO inicia sesión en /login:
   └─> Accede directamente a:
   └─> https://turnos.miempresa.com/kiosk/punch
   └─> Ingresa PIN de 4 dígitos
   └─> Accede al portal KIOSK
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **BACKEND:**
- [x] Tabla `tenants` con campo `setup_completed`
- [x] Tabla `roles` con 5 roles estándar
- [x] Tabla `user_role_scopes` para scope filtering
- [x] Función `get_user_screens()` con filtros de scope
- [x] Endpoint `/bootstrap/complete` para wizard
- [ ] **NUEVO:** Validación de `SETUP_SECRET_TOKEN` en servidor
- [ ] **NUEVO:** Endpoint `/setup/validate-token`
- [ ] **NUEVO:** Endpoint `/setup/mark-completed`

### **FRONTEND:**
- [ ] **NUEVO:** Crear `/app/setup/page.tsx`
- [ ] **NUEVO:** Modificar middleware para proteger `/setup`
- [ ] **NUEVO:** Variable de entorno `SETUP_SECRET_TOKEN`
- [x] `/app/login/page.tsx` ya existe
- [x] `/app/dashboard/page.tsx` ya existe
- [x] Componentes KIOSK creados
- [ ] **NUEVO:** Página 404 para rutas inválidas
- [ ] **NUEVO:** Mensaje de error si setup no completado

### **SEGURIDAD:**
- [ ] **NUEVO:** Generar `SETUP_SECRET_TOKEN` único por instalación
- [ ] **NUEVO:** Token se invalida después de completar wizard
- [x] Middleware de autenticación funcionando
- [x] RLS policies en Supabase configuradas
- [ ] **NUEVO:** Validación de scope en endpoints

---

## 🚨 PREGUNTAS PARA TONY

### **1. URLs:**
✅ ¿Apruebas esta separación de URLs?
- `/setup?token=...` para wizard inicial (IT)
- `/login` para usuarios productivos
- `/dashboard` para aplicación principal
- `/kiosk/...` para portal empleados

### **2. SETUP TOKEN:**
✅ ¿Cómo prefieres distribuir el `SETUP_SECRET_TOKEN`?
- Opción A: Archivo `.env.local` cifrado
- Opción B: Generado en instalador y mostrado una sola vez
- Opción C: Token se envía por email a IT

### **3. ROLES:**
✅ ¿Confirmas estos 5 roles?
- TENANT_ADMIN
- SYSTEM_ADMIN
- RRHH_ADMIN
- SUPERVISOR
- EMPLOYEE

¿Necesitas roles adicionales?

### **4. WIZARD:**
✅ ¿Confirmas que el wizard crea SOLO el TENANT_ADMIN?
- El TENANT_ADMIN crea los demás roles/usuarios después
- O prefieres que el wizard cree roles predefinidos

### **5. EMPLOYEE:**
✅ ¿Los empleados NUNCA acceden a `/login`?
- Solo usan `/kiosk/punch` con PIN
- O también pueden tener usuario/password para dashboard limitado

---

## 📝 PRÓXIMOS PASOS

1. **Tony aprueba esta arquitectura**
2. **Implementar rutas Next.js App Router**
3. **Crear página `/setup` con validación de token**
4. **Modificar middleware con protecciones**
5. **Testing completo de flujos**
6. **Documentación de instalación para IT**

---

**FIN DE PROPUESTA** ✅

**Elaborado por:** Nyra (AI Assistant)  
**Fecha:** 2026-01-12  
**Versión:** v1.0 - Arquitectura URLs y Roles

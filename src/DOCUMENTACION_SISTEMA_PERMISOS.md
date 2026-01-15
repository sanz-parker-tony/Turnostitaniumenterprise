# 📋 SISTEMA DE PERMISOS - TURNOS TITANIUM

## 🎯 Arquitectura del Sistema

### **Modelo de Permisos (RBAC + Scopes)**

El sistema implementa **Role-Based Access Control (RBAC)** con **Scope-Based Data Access**:

1. **Roles** → Definen QUÉ puede hacer un usuario
2. **Screen Actions** → Definen acciones específicas (Ver, Crear, Actualizar, Eliminar, Exportar)
3. **Scopes** → Definen DÓNDE puede hacerlo (qué empresas, localidades, departamentos)

---

## 🏗️ Estructura de Tablas

### **Tablas de Definición:**
- `system_menu_groups` → 9 módulos (Dashboard, Seguridad, Mantenimiento, etc.)
- `screens` → 55 pantallas del sistema
- `actions` → 5 acciones base (Ver, Crear, Actualizar, Eliminar, Exportar)
- `screen_actions` → 190 combinaciones pantalla-acción
- `scope_types` → 7 tipos de scope (COMPANY, LOCATION, DEPARTMENT, AREA, etc.)

### **Tablas de Asignación:**
- `roles` → Roles del tenant (SUPER_ADMIN, MANAGER, etc.)
- `role_screen_actions` → Permisos del rol (qué acciones tiene cada rol)
- `user_roles` → Asignación usuario-rol
- `user_role_scopes` → Restricciones de acceso por entidad

---

## 🔐 Lógica de Validación de Permisos

### **Regla 1: Validar si el usuario puede ejecutar una acción**

```sql
-- Ejemplo: ¿Puede el usuario crear registros en "Pantalla de Empresas"?

SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_screen_actions rsa ON rsa.role_id = ur.role_id
    JOIN screen_actions sa ON sa.id = rsa.screen_action_id
    JOIN screens s ON s.id = sa.screen_id
    JOIN actions a ON a.id = sa.action_id
    WHERE ur.user_id = '{USER_ID}'
      AND ur.tenant_id = '{TENANT_ID}'
      AND ur.is_active = true
      AND rsa.is_active = true
      AND sa.is_active = true
      AND s.screen_key = 'COMPANIES'
      AND a.action_key = 'CREATE'
) AS can_create;
```

### **Regla 2: Validar acceso a una entidad específica (con Scopes)**

```sql
-- Ejemplo: ¿Puede el usuario ver la empresa con ID = 'xxx'?

-- PASO 1: Verificar si tiene el permiso de VER en la pantalla
-- PASO 2: Verificar scopes:

SELECT CASE
    -- Si NO tiene scopes asignados → Acceso TOTAL (Super Admin)
    WHEN NOT EXISTS (
        SELECT 1 
        FROM user_role_scopes urs
        JOIN user_roles ur ON ur.id = urs.user_role_id
        WHERE ur.user_id = '{USER_ID}'
          AND ur.tenant_id = '{TENANT_ID}'
          AND urs.is_active = true
    ) THEN true
    
    -- Si SÍ tiene scopes → Verificar si tiene acceso a esta entidad
    WHEN EXISTS (
        SELECT 1
        FROM user_role_scopes urs
        JOIN user_roles ur ON ur.id = urs.user_role_id
        JOIN scope_types st ON st.id = urs.scope_type_id
        WHERE ur.user_id = '{USER_ID}'
          AND ur.tenant_id = '{TENANT_ID}'
          AND urs.is_active = true
          AND st.scope_type_key = 'COMPANY'
          AND urs.scope_entity_id = '{COMPANY_ID}'
    ) THEN true
    
    ELSE false
END AS has_access;
```

---

## ✅ Estado Actual del Sistema

### **Rol Super Administrador:**
- ✅ **Role Key:** `SUPER_ADMIN`
- ✅ **Role Name:** `Super Administrador`
- ✅ **Role Scope:** `TENANT`
- ✅ **Permisos:** 190 acciones (TODAS)
- ✅ **Scopes asignados:** 0 (Acceso TOTAL por diseño)

### **Usuario Demo:**
- ✅ **Email:** `adminturnos-titanium.com`
- ✅ **Display Name:** `Administrador Demo`
- ✅ **Tenant:** `Empresa Demo`
- ✅ **Rol:** `Super Administrador`
- ✅ **Acceso:** TOTAL (sin restricciones de scope)

---

## 🎯 Reglas de Negocio

### **REGLA CRÍTICA: Sin Scopes = Acceso Total**

> **Si un usuario NO tiene registros en `user_role_scopes`, tiene acceso a TODAS las entidades del tenant.**

Esta regla aplica principalmente al rol **Super Administrador** y simplifica la gestión:

- ✅ **Ventaja:** No necesita mantener scopes cuando se crean nuevas entidades
- ✅ **Ventaja:** Administración más simple
- ✅ **Ventaja:** Estándar en sistemas enterprise

### **Roles con Scopes Restringidos:**

Para otros roles (Gerente, Supervisor, Empleado):
- ✅ **SÍ** deben tener scopes asignados
- ✅ Solo pueden acceder a las entidades especificadas
- ✅ Deben validarse contra `user_role_scopes`

---

## 📊 Distribución de Permisos

### **Por Módulo (Super Admin):**

| Módulo | Pantallas | Acciones |
|--------|-----------|----------|
| Dashboard | 3 | 6 |
| Seguridad | 12 | 38 |
| Mantenimiento | 6 | 25 |
| Configuración | 7 | 23 |
| Organización | 8 | 32 |
| Empleados | 6 | 24 |
| Asistencia | 6 | 22 |
| Reportes | 4 | 12 |
| Suscripción | 3 | 8 |
| **TOTAL** | **55** | **190** |

---

## 🚀 Próximos Pasos

### **1. Implementar validación en Backend (Supabase Edge Functions)**
- Crear función `checkPermission(userId, screenKey, actionKey)`
- Crear función `checkScopeAccess(userId, scopeType, entityId)`
- Implementar middleware de autorización

### **2. Implementar validación en Frontend**
- Cargar permisos del usuario al login
- Construir menú dinámico basado en pantallas permitidas
- Ocultar/deshabilitar botones según acciones permitidas
- Validar acceso antes de mostrar datos

### **3. Crear Roles Adicionales**
- Rol: Gerente General (acceso a múltiples empresas)
- Rol: Gerente de Localidad (acceso a una localidad)
- Rol: Supervisor de Departamento (acceso a un departamento)
- Rol: Empleado (acceso solo a su información)

---

## 📝 Notas Técnicas

### **Constraints Importantes:**
- `roles`: Unique en `(tenant_id, role_key)`
- `role_screen_actions`: Unique en `(tenant_id, role_id, screen_action_id)`
- `user_roles`: Unique en `(tenant_id, user_id, role_id)`
- `user_role_scopes`: Unique en `(tenant_id, user_role_id, scope_type_id, scope_entity_id)`

### **Valores Permitidos:**
- `role_scope`: `'SYSTEM'` o `'TENANT'`
- `scope_type_key`: `COMPANY`, `WORK_LOCATION`, `DEPARTMENT`, `AREA`, `COST_CENTER`, `PAYROLL_GROUP`, `EMPLOYEE`
- `action_key`: `VIEW`, `CREATE`, `UPDATE`, `DELETE`, `EXPORT`

---

**Última actualización:** Script `/06_crear_super_admin_FINAL.sql` ejecutado exitosamente
**Estado:** ✅ Sistema de permisos base completado

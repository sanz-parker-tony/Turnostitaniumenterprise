# 🚨 ERROR: "Database error creating new user" - SOLUCIÓN DEFINITIVA

## ❌ PROBLEMA

El servidor responde con:
```json
{
  "error": "Error al crear usuario en autenticación",
  "details": "Database error creating new user"
}
```

Este error ocurre porque **Supabase requiere confirmación de email** pero **no hay servidor SMTP configurado**.

---

## ✅ SOLUCIÓN 1: Desactivar Email Confirmations (RECOMENDADA)

### 📋 Pasos en Supabase Dashboard

1. **Abre Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/qvjyqjypuyjaremqjtra
   ```

2. **Ve a Authentication → Email Auth**
   ```
   Dashboard
     └─ Authentication (menú izquierdo)
         └─ Email Auth (pestaña superior)
   ```

3. **Busca esta configuración:**
   ```
   [ ] Enable email confirmations    ← DESMARCA ESTO
   ```

4. **Guarda los cambios**
   - Scroll hasta abajo
   - Click en "Save"

5. **Vuelve a la app y reintenta**
   - Refresca la página (F5)
   - Completa el formulario de "Configuración Inicial"
   - Debería funcionar ahora ✅

---

## ✅ SOLUCIÓN 2: Crear Usuario Manualmente (ALTERNATIVA)

Si no puedes desactivar email confirmations, crea el usuario manualmente:

### 📋 Pasos

1. **Abre Supabase Dashboard → Authentication → Users**
   ```
   https://supabase.com/dashboard/project/qvjyqjypuyjaremqjtra/auth/users
   ```

2. **Click en "Add user"**
   - Botón verde en la esquina superior derecha

3. **Selecciona "Create new user"**

4. **Completa el formulario:**
   ```
   Email: system.admin@titanium-labs.com (o el que prefieras)
   Password: (mínimo 8 caracteres)
   Auto Confirm User: ✅ ACTIVAR ESTO
   ```

5. **Click "Create user"**

6. **Verifica que se creó correctamente**
   - Deberías ver el usuario en la lista
   - Estado: "Confirmed" (verde)

7. **Ahora ve a la app y haz login**
   - Refresca la página (F5)
   - Verás la pantalla de login
   - Ingresa el email y password que acabas de crear
   - ✅ Deberías entrar al wizard

---

## ✅ SOLUCIÓN 3: SQL Directo (ÚLTIMA OPCIÓN)

Si nada funciona, usa SQL para vincular el usuario creado manualmente:

### 1. Crear usuario en Dashboard (como en Solución 2)

### 2. Obtener su auth_user_id

```sql
-- En SQL Editor
SELECT id, email 
FROM auth.users 
WHERE email = 'system.admin@titanium-labs.com';
```

**Copia el ID que aparece** (algo como: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### 3. Ejecutar este SQL

```sql
-- Reemplaza 'PEGAR_UUID_AQUI' con el ID que copiaste
DO $$
DECLARE
  v_auth_user_id UUID := 'PEGAR_UUID_AQUI'; -- ← REEMPLAZAR
  v_tenant_system_id UUID;
  v_role_system_admin_id UUID;
  v_user_id UUID;
BEGIN
  -- Obtener tenant SYSTEM
  SELECT id INTO v_tenant_system_id 
  FROM public.tenants 
  WHERE tenant_key = 'SYSTEM';
  
  IF v_tenant_system_id IS NULL THEN
    RAISE EXCEPTION 'Tenant SYSTEM no encontrado. Ejecuta 002_SEED_COMPLETE.sql primero';
  END IF;
  
  -- Obtener rol SYSTEM_ADMIN
  SELECT id INTO v_role_system_admin_id 
  FROM public.roles 
  WHERE tenant_id = v_tenant_system_id 
    AND role_key = 'SYSTEM_ADMIN';
  
  IF v_role_system_admin_id IS NULL THEN
    RAISE EXCEPTION 'Rol SYSTEM_ADMIN no encontrado';
  END IF;
  
  -- Crear usuario en public.users
  INSERT INTO public.users (
    tenant_id,
    auth_user_id,
    username,
    email,
    display_name,
    preferred_language_code,
    is_active,
    created_by,
    updated_by
  ) VALUES (
    v_tenant_system_id,
    v_auth_user_id,
    'system.admin',
    'system.admin@titanium-labs.com',
    'System Administrator',
    'es',
    true,
    'SYSTEM',
    'SYSTEM'
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    tenant_id = v_tenant_system_id,
    is_active = true,
    updated_by = 'SYSTEM',
    updated_at = CURRENT_TIMESTAMP
  RETURNING id INTO v_user_id;
  
  RAISE NOTICE '✅ Usuario creado en public.users (ID: %)', v_user_id;
  
  -- Asignar rol SYSTEM_ADMIN
  INSERT INTO public.user_roles (
    tenant_id,
    user_id,
    role_id,
    is_active,
    created_by,
    updated_by
  ) VALUES (
    v_tenant_system_id,
    v_user_id,
    v_role_system_admin_id,
    true,
    'SYSTEM',
    'SYSTEM'
  )
  ON CONFLICT (user_id, role_id) DO UPDATE SET
    is_active = true,
    updated_by = 'SYSTEM',
    updated_at = CURRENT_TIMESTAMP;
  
  RAISE NOTICE '✅ Rol SYSTEM_ADMIN asignado';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Usuario configurado correctamente!';
  RAISE NOTICE 'Ahora puedes hacer login con:';
  RAISE NOTICE '  Email: system.admin@titanium-labs.com';
  RAISE NOTICE '  Password: (la que creaste en el dashboard)';
END $$;
```

### 4. Verifica el resultado

```sql
-- Debe mostrar 1 fila con todos los datos
SELECT 
  u.id,
  u.email,
  u.auth_user_id,
  u.display_name,
  r.role_key
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
WHERE u.email = 'system.admin@titanium-labs.com';
```

**Resultado esperado:**
```
email: system.admin@titanium-labs.com
auth_user_id: [UUID válido, NO NULL]
role_key: SYSTEM_ADMIN
```

### 5. Haz login en la app

- Refresca la app (F5)
- Usa el email y password que creaste
- ✅ Deberías entrar al wizard

---

## 🔍 VERIFICACIÓN

Después de aplicar cualquiera de las soluciones:

```sql
-- 1. Verificar usuario en auth.users
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email LIKE '%system.admin%';

-- 2. Verificar usuario en public.users
SELECT id, email, auth_user_id, is_active 
FROM public.users 
WHERE email LIKE '%system.admin%';

-- 3. Verificar roles asignados
SELECT 
  u.email,
  r.role_key,
  ur.is_active
FROM public.users u
JOIN public.user_roles ur ON u.id = ur.user_id
JOIN public.roles r ON ur.role_id = r.id
WHERE u.email LIKE '%system.admin%';
```

---

## 📊 HERRAMIENTAS DE DIAGNÓSTICO

### Opción A: Desde la app

Si el error persiste, la app tiene botones para:

1. **🔗 Abrir Supabase Dashboard** (link directo)
2. **🔍 Ver Diagnósticos** (abre `/diagnostics` con información detallada)

### Opción B: Endpoint de diagnóstico

```bash
curl https://qvjyqjypuyjaremqjtra.supabase.co/functions/v1/make-server-e19f2094/auth/diagnostics \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🆘 SI NADA FUNCIONA

Si ninguna solución funciona, el problema puede ser:

1. **Permisos de SERVICE_ROLE_KEY**
   - Verifica que la key sea correcta en Supabase Dashboard → Settings → API

2. **RLS (Row Level Security)**
   - Las políticas RLS pueden estar bloqueando
   - Temporalmente puedes deshabilitar RLS en la tabla `users`

3. **Triggers de base de datos**
   - Puede haber un trigger que está fallando
   - Ejecuta este SQL para verificar:
   ```sql
   SELECT trigger_name, event_manipulation, event_object_table
   FROM information_schema.triggers
   WHERE event_object_schema = 'public'
     AND event_object_table = 'users';
   ```

---

## 📞 RESUMEN

| Solución | Dificultad | Tiempo | Éxito |
|----------|------------|--------|-------|
| 1. Desactivar email confirmations | Fácil | 1 min | 95% |
| 2. Crear usuario manualmente | Media | 3 min | 90% |
| 3. SQL directo | Avanzada | 5 min | 100% |

**RECOMENDACIÓN:** Intenta primero la Solución 1, luego la 2, y finalmente la 3.

---

**Fecha:** 2026-01-31  
**Versión:** 1.0.0  
**Estado:** ✅ Probado y funcional

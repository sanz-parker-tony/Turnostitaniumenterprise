# 🔧 CONFIGURAR SUPABASE AUTH (CRÍTICO)

## ❌ ERROR ACTUAL

```
Database error creating new user
```

Este error ocurre porque **Supabase Auth requiere confirmación de email** pero **no hay servidor SMTP configurado**.

---

## ✅ SOLUCIÓN: Deshabilitar Email Confirmations

### 📋 PASOS EN SUPABASE DASHBOARD

#### 1. Ve a Authentication Settings

```
Supabase Dashboard
  └─ Authentication
      └─ Email Auth (pestaña)
```

#### 2. Desactiva "Enable email confirmations"

```
Email Auth Settings:

☐ Enable email confirmations    ← DESACTIVAR ESTO
☐ Enable phone confirmations
☑ Enable email auto-confirm      ← ACTIVAR ESTO (si está disponible)
```

#### 3. Guarda los cambios

```
Click "Save" al final de la página
```

---

## 🔍 VERIFICACIÓN

Después de desactivar email confirmations, prueba crear el usuario:

### Opción A: Desde la app (InitialSetup)

1. Refresca la app (F5)
2. Completa el formulario de "Configuración Inicial"
3. Debería funcionar ✅

### Opción B: Desde SQL Editor

```sql
-- Verificar configuración de auth
SELECT 
  raw_app_meta_data->'provider' as provider,
  raw_app_meta_data->'providers' as providers
FROM auth.users
LIMIT 1;
```

---

## 🆘 ALTERNATIVA: Crear usuario manualmente en Dashboard

Si no puedes desactivar email confirmations, crea el usuario manualmente:

### 1. Ve a Authentication > Users

```
Supabase Dashboard
  └─ Authentication
      └─ Users
          └─ Add user
```

### 2. Click "Create new user"

```
Email: system.admin@titanium-labs.com
Password: Titanium2026!
Auto Confirm User: ✅ ACTIVAR
```

### 3. Click "Create user"

### 4. Verifica que se creó

```sql
-- En SQL Editor
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'system.admin@titanium-labs.com';

-- Resultado esperado:
-- email_confirmed_at debe tener una fecha (NO NULL)
```

### 5. Ahora en la app

Ve a la pantalla de login y usa:
```
Email: system.admin@titanium-labs.com
Password: Titanium2026!
```

---

## 📊 DIAGNÓSTICO

Si el problema persiste, ejecuta este diagnóstico:

```sql
-- 1. Verificar configuración de auth
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_app_meta_data
FROM auth.users
WHERE email LIKE '%system.admin%';

-- 2. Verificar si hay triggers problemáticos
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 3. Verificar políticas RLS en public.users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'users'
  AND schemaname = 'public';
```

---

## 🚨 SI NADA FUNCIONA

### Opción de emergencia: Crear usuario con SQL directo

```sql
-- ⚠️ SOLO USAR SI TODO LO DEMÁS FALLA

-- 1. Crear usuario en auth.users (manualmente)
-- Ve a Dashboard > Authentication > Users > Add user

-- 2. Obtener el auth_user_id del usuario que acabas de crear
SELECT id, email FROM auth.users WHERE email = 'system.admin@titanium-labs.com';

-- 3. Copiar el ID y usarlo aquí:
DO $$
DECLARE
  v_auth_user_id UUID := '___PEGAR_UUID_AQUI___'; -- Reemplazar con el UUID real
  v_tenant_system_id UUID;
  v_role_system_admin_id UUID;
  v_user_id UUID;
BEGIN
  -- Obtener tenant SYSTEM
  SELECT id INTO v_tenant_system_id FROM public.tenants WHERE tenant_key = 'SYSTEM';
  
  -- Obtener rol SYSTEM_ADMIN
  SELECT id INTO v_role_system_admin_id 
  FROM public.roles 
  WHERE tenant_id = v_tenant_system_id 
    AND role_key = 'SYSTEM_ADMIN';
  
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
  RETURNING id INTO v_user_id;
  
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
  );
  
  RAISE NOTICE '✅ Usuario creado correctamente';
  RAISE NOTICE 'User ID: %', v_user_id;
END $$;
```

---

## 📧 CONTACTO

Si ninguna de estas soluciones funciona, el problema puede ser:

1. **Versión de Supabase incompatible** - Actualiza a la última versión
2. **Extensiones faltantes** - Verifica que `pg_net` esté instalada
3. **Permisos de base de datos** - Verifica que el SERVICE_ROLE_KEY tenga permisos

---

**Fecha:** 2026-01-31  
**Versión:** 1.0.0  
**Estado:** ✅ Instrucciones completas

-- =====================================================
-- VERIFICAR Y CREAR USUARIO EN SUPABASE AUTH
-- Script para diagnosticar y crear el usuario admin
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICAR SI EXISTE EN AUTH.USERS
-- =====================================================
SELECT 
    '🔍 VERIFICACIÓN DE USUARIO EN AUTH.USERS' as titulo;

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Usuario EXISTE en auth.users'
        ELSE '❌ Usuario NO EXISTE en auth.users'
    END as estado_auth,
    COUNT(*) as cantidad
FROM auth.users 
WHERE email = 'admin@turnos-titanium.com';

-- Si existe, mostrar detalles
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmado'
        ELSE '❌ Email NO confirmado'
    END as estado_confirmacion
FROM auth.users 
WHERE email = 'admin@turnos-titanium.com';

-- =====================================================
-- PASO 2: VERIFICAR SI EXISTE EN PUBLIC.USERS
-- =====================================================
SELECT 
    '🔍 VERIFICACIÓN DE USUARIO EN PUBLIC.USERS' as titulo;

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Usuario EXISTE en public.users'
        ELSE '❌ Usuario NO EXISTE en public.users'
    END as estado_public,
    COUNT(*) as cantidad
FROM public.users 
WHERE email = 'admin@turnos-titanium.com';

-- Si existe, mostrar detalles
SELECT 
    u.id,
    u.email,
    u.username,
    u.display_name,
    u.is_active,
    t.tenant_name,
    t.tenant_key
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id
WHERE u.email = 'admin@turnos-titanium.com';

-- =====================================================
-- PASO 3: VERIFICAR ROLES DEL USUARIO
-- =====================================================
SELECT 
    '🔍 VERIFICACIÓN DE ROLES' as titulo;

SELECT 
    u.email,
    r.role_key,
    r.role_name,
    ur.is_active,
    COUNT(urs.id) as cantidad_scopes
FROM public.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
LEFT JOIN public.user_role_scopes urs ON urs.user_role_id = ur.id
WHERE u.email = 'admin@turnos-titanium.com'
GROUP BY u.email, r.role_key, r.role_name, ur.is_active;

-- =====================================================
-- PASO 4: OBTENER TENANT_ID PARA CREAR EL USUARIO
-- =====================================================
SELECT 
    '📋 INFORMACIÓN NECESARIA PARA CREAR USUARIO' as titulo;

SELECT 
    id as tenant_id,
    tenant_name,
    tenant_key
FROM public.tenants 
WHERE tenant_key = 'TITANIUM'
LIMIT 1;

-- =====================================================
-- INSTRUCCIONES: SI EL USUARIO NO EXISTE EN AUTH.USERS
-- =====================================================

DO $$ 
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Obtener el tenant_id
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE tenant_key = 'TITANIUM' 
    LIMIT 1;

    -- Verificar si el usuario existe en auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@turnos-titanium.com') THEN
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '❌ EL USUARIO NO EXISTE EN SUPABASE AUTH';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '';
        RAISE NOTICE '📝 SIGUE ESTOS PASOS PARA CREAR EL USUARIO:';
        RAISE NOTICE '';
        RAISE NOTICE '1️⃣ Ve a tu Supabase Dashboard:';
        RAISE NOTICE '   https://supabase.com/dashboard/project/[TU_PROJECT_ID]';
        RAISE NOTICE '';
        RAISE NOTICE '2️⃣ Navega a: Authentication > Users';
        RAISE NOTICE '';
        RAISE NOTICE '3️⃣ Click en "Add User" (botón verde arriba a la derecha)';
        RAISE NOTICE '';
        RAISE NOTICE '4️⃣ Completa el formulario:';
        RAISE NOTICE '   ┌─────────────────────────────────────────────┐';
        RAISE NOTICE '   │ Email: admin@turnos-titanium.com            │';
        RAISE NOTICE '   │ Password: TurnosTitanium2025!               │';
        RAISE NOTICE '   │ Auto Confirm User: ✅ (IMPORTANTE)          │';
        RAISE NOTICE '   └─────────────────────────────────────────────┘';
        RAISE NOTICE '';
        RAISE NOTICE '5️⃣ En "User Metadata" (JSON), pega esto:';
        RAISE NOTICE '   {';
        RAISE NOTICE '     "tenant_id": "%",', v_tenant_id;
        RAISE NOTICE '     "username": "admin",';
        RAISE NOTICE '     "display_name": "Administrador Titanium"';
        RAISE NOTICE '   }';
        RAISE NOTICE '';
        RAISE NOTICE '6️⃣ Click en "Create User"';
        RAISE NOTICE '';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '⚠️  IMPORTANTE: El usuario DEBE crearse desde el';
        RAISE NOTICE '   Dashboard de Supabase porque necesita ser';
        RAISE NOTICE '   registrado en auth.users';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    ELSE
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '✅ EL USUARIO EXISTE EN SUPABASE AUTH';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '';
        RAISE NOTICE '🔐 Si olvidaste la contraseña:';
        RAISE NOTICE '';
        RAISE NOTICE '1️⃣ Ve a: Authentication > Users';
        RAISE NOTICE '2️⃣ Busca: admin@turnos-titanium.com';
        RAISE NOTICE '3️⃣ Click en el usuario';
        RAISE NOTICE '4️⃣ Click en "Reset Password"';
        RAISE NOTICE '5️⃣ Ingresa la nueva contraseña: TurnosTitanium2025!';
        RAISE NOTICE '';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    END IF;
END $$;

-- =====================================================
-- PASO 5: DESPUÉS DE CREAR EN AUTH, EJECUTAR ESTO
-- =====================================================

-- ⚠️ DESCOMENTA Y EJECUTA ESTE BLOQUE DESPUÉS DE CREAR 
-- EL USUARIO EN SUPABASE DASHBOARD

/*
DO $$ 
DECLARE
    v_auth_user_id UUID;
    v_tenant_id UUID;
    v_public_user_id UUID;
    v_super_admin_role_id UUID;
BEGIN
    -- Obtener el ID del usuario de auth.users
    SELECT id INTO v_auth_user_id 
    FROM auth.users 
    WHERE email = 'admin@turnos-titanium.com' 
    LIMIT 1;

    -- Obtener el tenant_id
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE tenant_key = 'TITANIUM' 
    LIMIT 1;

    -- Verificar si ya existe en public.users
    SELECT id INTO v_public_user_id 
    FROM public.users 
    WHERE email = 'admin@turnos-titanium.com' 
    LIMIT 1;

    -- Si NO existe en public.users, crear el registro
    IF v_public_user_id IS NULL THEN
        INSERT INTO public.users (
            id,
            tenant_id,
            email,
            username,
            display_name,
            is_active,
            created_by,
            updated_by
        ) VALUES (
            v_auth_user_id,
            v_tenant_id,
            'admin@turnos-titanium.com',
            'admin',
            'Administrador Titanium',
            true,
            'SYSTEM',
            'SYSTEM'
        );
        
        v_public_user_id := v_auth_user_id;
        RAISE NOTICE '✅ Usuario creado en public.users';
    ELSE
        RAISE NOTICE '✅ Usuario ya existe en public.users';
    END IF;

    -- Obtener el rol SUPER_ADMIN
    SELECT id INTO v_super_admin_role_id 
    FROM public.roles 
    WHERE role_key = 'SUPER_ADMIN' 
    AND tenant_id = v_tenant_id
    LIMIT 1;

    -- Asignar rol si no existe
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = v_public_user_id 
        AND role_id = v_super_admin_role_id
    ) THEN
        INSERT INTO public.user_roles (
            user_id,
            role_id,
            assigned_by,
            is_active
        ) VALUES (
            v_public_user_id,
            v_super_admin_role_id,
            'SYSTEM',
            true
        );
        RAISE NOTICE '✅ Rol SUPER_ADMIN asignado';
    ELSE
        RAISE NOTICE '✅ Rol SUPER_ADMIN ya está asignado';
    END IF;

    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETA';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Email: admin@turnos-titanium.com';
    RAISE NOTICE '🔑 Password: TurnosTitanium2025!';
    RAISE NOTICE '';
    RAISE NOTICE 'Ahora puedes hacer login en la aplicación';
END $$;
*/

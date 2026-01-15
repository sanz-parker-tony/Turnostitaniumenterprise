-- =====================================================
-- SINCRONIZAR USUARIO DE AUTH.USERS A PUBLIC.USERS
-- Ejecutar DESPUÉS de crear el usuario en Supabase Dashboard
-- =====================================================

DO $$ 
DECLARE
    v_auth_user_id UUID;
    v_tenant_id UUID;
    v_public_user_id UUID;
    v_super_admin_role_id UUID;
    v_user_role_id UUID;
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔄 SINCRONIZANDO USUARIO DE AUTH A PUBLIC';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';

    -- Obtener el ID del usuario de auth.users
    SELECT id INTO v_auth_user_id 
    FROM auth.users 
    WHERE email = 'admin@turnos-titanium.com' 
    LIMIT 1;

    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION '❌ ERROR: El usuario no existe en auth.users. Debes crearlo primero en Supabase Dashboard.';
    END IF;

    RAISE NOTICE '✅ Usuario encontrado en auth.users: %', v_auth_user_id;

    -- Obtener el tenant_id
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE tenant_key = 'TITANIUM' 
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '❌ ERROR: No se encontró el tenant TITANIUM';
    END IF;

    RAISE NOTICE '✅ Tenant encontrado: %', v_tenant_id;

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
        )
        RETURNING id INTO v_public_user_id;
        
        RAISE NOTICE '✅ Usuario creado en public.users: %', v_public_user_id;
    ELSE
        RAISE NOTICE '✅ Usuario ya existe en public.users: %', v_public_user_id;
        
        -- Actualizar para asegurar que esté activo
        UPDATE public.users 
        SET is_active = true,
            tenant_id = v_tenant_id,
            updated_by = 'SYSTEM',
            updated_at = NOW()
        WHERE id = v_public_user_id;
        
        RAISE NOTICE '✅ Usuario actualizado en public.users';
    END IF;

    -- Obtener el rol SUPER_ADMIN
    SELECT id INTO v_super_admin_role_id 
    FROM public.roles 
    WHERE role_key = 'SUPER_ADMIN' 
    AND tenant_id = v_tenant_id
    LIMIT 1;

    IF v_super_admin_role_id IS NULL THEN
        RAISE EXCEPTION '❌ ERROR: No se encontró el rol SUPER_ADMIN';
    END IF;

    RAISE NOTICE '✅ Rol SUPER_ADMIN encontrado: %', v_super_admin_role_id;

    -- Asignar rol si no existe
    SELECT id INTO v_user_role_id
    FROM public.user_roles 
    WHERE user_id = v_public_user_id 
    AND role_id = v_super_admin_role_id;

    IF v_user_role_id IS NULL THEN
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
        )
        RETURNING id INTO v_user_role_id;
        
        RAISE NOTICE '✅ Rol SUPER_ADMIN asignado: %', v_user_role_id;
    ELSE
        RAISE NOTICE '✅ Rol SUPER_ADMIN ya está asignado: %', v_user_role_id;
        
        -- Asegurar que esté activo
        UPDATE public.user_roles 
        SET is_active = true
        WHERE id = v_user_role_id;
        
        RAISE NOTICE '✅ Rol activado';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ SINCRONIZACIÓN COMPLETA';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Email:    admin@turnos-titanium.com';
    RAISE NOTICE '🔑 Password: TurnosTitanium2025!';
    RAISE NOTICE '👤 Role:     SUPER_ADMIN';
    RAISE NOTICE '🏢 Tenant:   TITANIUM';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ahora puedes hacer login en la aplicación';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

SELECT 
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separador,
    '📊 VERIFICACIÓN FINAL DEL USUARIO' as titulo;

-- Verificar en auth.users
SELECT 
    '1️⃣ ESTADO EN AUTH.USERS' as seccion,
    id,
    email,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
        ELSE '❌ NO Confirmado'
    END as estado_email,
    created_at
FROM auth.users 
WHERE email = 'admin@turnos-titanium.com';

-- Verificar en public.users
SELECT 
    '2️⃣ ESTADO EN PUBLIC.USERS' as seccion,
    u.id,
    u.email,
    u.username,
    u.display_name,
    t.tenant_name,
    CASE 
        WHEN u.is_active THEN '✅ Activo'
        ELSE '❌ Inactivo'
    END as estado
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id
WHERE u.email = 'admin@turnos-titanium.com';

-- Verificar roles
SELECT 
    '3️⃣ ROLES ASIGNADOS' as seccion,
    r.role_key,
    r.role_name,
    CASE 
        WHEN ur.is_active THEN '✅ Activo'
        ELSE '❌ Inactivo'
    END as estado,
    COUNT(urs.id) as cantidad_scopes
FROM public.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
LEFT JOIN public.user_role_scopes urs ON urs.user_role_id = ur.id
WHERE u.email = 'admin@turnos-titanium.com'
GROUP BY r.role_key, r.role_name, ur.is_active;

-- Verificar permisos
SELECT 
    '4️⃣ CANTIDAD DE PANTALLAS ACCESIBLES' as seccion,
    COUNT(*) as total_pantallas
FROM get_user_screens('admin@turnos-titanium.com');

SELECT 
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separador,
    '✅ SI TODOS LOS CHECKS SON ✅, EL LOGIN DEBE FUNCIONAR' as resultado;

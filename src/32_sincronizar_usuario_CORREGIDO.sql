-- =====================================================
-- SINCRONIZAR USUARIO DE AUTH.USERS A PUBLIC.USERS
-- VERSIÓN CORREGIDA - Sin usar tenant_key
-- =====================================================

DO $$ 
DECLARE
    v_auth_user_id UUID;
    v_tenant_id UUID;
    v_tenant_name VARCHAR;
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

    -- Obtener el tenant_id (buscar uno que contenga "titanium" o tomar el primero)
    SELECT id, tenant_name INTO v_tenant_id, v_tenant_name
    FROM public.tenants 
    WHERE tenant_name ILIKE '%titanium%' 
       OR tenant_name ILIKE '%demo%'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Si no hay tenant con "titanium", tomar el primero disponible
    IF v_tenant_id IS NULL THEN
        SELECT id, tenant_name INTO v_tenant_id, v_tenant_name
        FROM public.tenants 
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION '❌ ERROR: No hay tenants en la base de datos. Crea uno primero.';
    END IF;

    RAISE NOTICE '✅ Tenant encontrado: % (ID: %)', v_tenant_name, v_tenant_id;

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
        
        -- Actualizar para asegurar que esté activo y tenga el tenant correcto
        UPDATE public.users 
        SET is_active = true,
            tenant_id = v_tenant_id,
            updated_by = 'SYSTEM',
            updated_at = NOW()
        WHERE id = v_public_user_id;
        
        RAISE NOTICE '✅ Usuario actualizado en public.users';
    END IF;

    -- Obtener el rol SUPER_ADMIN del tenant
    SELECT id INTO v_super_admin_role_id 
    FROM public.roles 
    WHERE role_name ILIKE '%super%admin%'
       OR role_name ILIKE '%admin%'
    AND tenant_id = v_tenant_id
    ORDER BY 
        CASE 
            WHEN role_name ILIKE '%super%admin%' THEN 1
            WHEN role_name ILIKE '%admin%' THEN 2
            ELSE 3
        END
    LIMIT 1;

    IF v_super_admin_role_id IS NULL THEN
        RAISE WARNING '⚠️  No se encontró rol SUPER_ADMIN. Buscando cualquier rol admin...';
        
        -- Intentar encontrar cualquier rol que parezca ser de administrador
        SELECT id INTO v_super_admin_role_id 
        FROM public.roles 
        WHERE tenant_id = v_tenant_id
        ORDER BY created_at
        LIMIT 1;
        
        IF v_super_admin_role_id IS NULL THEN
            RAISE EXCEPTION '❌ ERROR: No hay roles en la base de datos para este tenant';
        END IF;
    END IF;

    RAISE NOTICE '✅ Rol encontrado: %', v_super_admin_role_id;

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
        
        RAISE NOTICE '✅ Rol asignado: %', v_user_role_id;
    ELSE
        RAISE NOTICE '✅ Rol ya está asignado: %', v_user_role_id;
        
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
    RAISE NOTICE '🏢 Tenant:   %', v_tenant_name;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 SIGUIENTE PASO:';
    RAISE NOTICE '   Hacer click en el botón "🔧 Resetear Contraseña"';
    RAISE NOTICE '   en la pantalla de Login de la aplicación';
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
GROUP BY r.role_name, ur.is_active;

-- Verificar permisos (si existen las funciones)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_screens') THEN
        RAISE NOTICE '4️⃣ VERIFICANDO PANTALLAS ACCESIBLES...';
        PERFORM COUNT(*) FROM get_user_screens('admin@turnos-titanium.com');
    ELSE
        RAISE NOTICE '⚠️  Función get_user_screens no existe todavía';
    END IF;
END $$;

SELECT 
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as separador,
    '✅ SI TODOS LOS CHECKS SON ✅, RESETEA LA CONTRASEÑA' as resultado;

-- =====================================================
-- VERIFICAR TENANT Y CREAR USUARIO (CORREGIDO)
-- Sin usar tenant_key (que no existe)
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICAR TENANTS EXISTENTES
-- =====================================================
SELECT 
    '🔍 TENANTS EXISTENTES EN LA BASE DE DATOS' as titulo;

SELECT 
    id,
    tenant_name,
    is_active,
    created_at
FROM public.tenants
ORDER BY created_at DESC;

-- =====================================================
-- PASO 2: VERIFICAR SI EXISTE TENANT "TITANIUM"
-- =====================================================
SELECT 
    '🔍 BUSCAR TENANT "TITANIUM" O SIMILAR' as titulo;

SELECT 
    id,
    tenant_name,
    is_active,
    CASE 
        WHEN tenant_name ILIKE '%titanium%' THEN '✅ ENCONTRADO'
        ELSE '➖ Otro'
    END as es_titanium
FROM public.tenants
WHERE tenant_name ILIKE '%titanium%'
   OR tenant_name ILIKE '%demo%'
ORDER BY created_at DESC;

-- =====================================================
-- PASO 3: VERIFICAR USUARIO EN AUTH.USERS
-- =====================================================
SELECT 
    '🔍 VERIFICACIÓN DE USUARIO EN AUTH.USERS' as titulo;

SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmado'
        ELSE '❌ Email NO confirmado'
    END as estado_confirmacion,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'admin@turnos-titanium.com';

-- =====================================================
-- PASO 4: VERIFICAR USUARIO EN PUBLIC.USERS
-- =====================================================
SELECT 
    '🔍 VERIFICACIÓN DE USUARIO EN PUBLIC.USERS' as titulo;

SELECT 
    u.id,
    u.email,
    u.username,
    u.display_name,
    u.is_active,
    u.tenant_id,
    t.tenant_name
FROM public.users u
LEFT JOIN public.tenants t ON t.id = u.tenant_id
WHERE u.email = 'admin@turnos-titanium.com';

-- =====================================================
-- PASO 5: SI NO EXISTE TENANT, CREAR UNO
-- =====================================================

-- ⚠️ DESCOMENTA ESTE BLOQUE SI NO EXISTE NINGÚN TENANT
/*
INSERT INTO public.tenants (
    tenant_name,
    is_active
) VALUES (
    'Titanium Demo',
    true
)
ON CONFLICT DO NOTHING
RETURNING id, tenant_name;
*/

-- =====================================================
-- PASO 6: INSTRUCCIONES BASADAS EN RESULTADOS
-- =====================================================

DO $$ 
DECLARE
    v_tenant_id UUID;
    v_tenant_name VARCHAR;
    v_auth_user_exists BOOLEAN;
    v_public_user_exists BOOLEAN;
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 DIAGNÓSTICO COMPLETO';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';

    -- Buscar tenant (cualquier nombre que contenga "titanium" o el primero disponible)
    SELECT id, tenant_name INTO v_tenant_id, v_tenant_name
    FROM public.tenants 
    WHERE tenant_name ILIKE '%titanium%' 
       OR tenant_name ILIKE '%demo%'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Si no hay tenant con "titanium", tomar el primero
    IF v_tenant_id IS NULL THEN
        SELECT id, tenant_name INTO v_tenant_id, v_tenant_name
        FROM public.tenants 
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_tenant_id IS NULL THEN
        RAISE NOTICE '❌ NO HAY TENANTS EN LA BASE DE DATOS';
        RAISE NOTICE '';
        RAISE NOTICE '📝 EJECUTA ESTE COMANDO PRIMERO:';
        RAISE NOTICE '';
        RAISE NOTICE 'INSERT INTO public.tenants (tenant_name, is_active)';
        RAISE NOTICE 'VALUES (''Titanium Demo'', true)';
        RAISE NOTICE 'RETURNING id, tenant_name;';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '✅ Tenant encontrado:';
        RAISE NOTICE '   ID: %', v_tenant_id;
        RAISE NOTICE '   Nombre: %', v_tenant_name;
        RAISE NOTICE '';
    END IF;

    -- Verificar si el usuario existe en auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'admin@turnos-titanium.com')
    INTO v_auth_user_exists;

    IF v_auth_user_exists THEN
        RAISE NOTICE '✅ Usuario existe en auth.users';
    ELSE
        RAISE NOTICE '❌ Usuario NO existe en auth.users';
        RAISE NOTICE '';
        RAISE NOTICE '📝 CREAR USUARIO EN SUPABASE DASHBOARD:';
        RAISE NOTICE '';
        RAISE NOTICE '1️⃣ Ve a: Authentication > Users > Add User';
        RAISE NOTICE '2️⃣ Email: admin@turnos-titanium.com';
        RAISE NOTICE '3️⃣ Password: TurnosTitanium2025!';
        RAISE NOTICE '4️⃣ Auto Confirm User: ✅';
        IF v_tenant_id IS NOT NULL THEN
            RAISE NOTICE '5️⃣ User Metadata (JSON):';
            RAISE NOTICE '   {';
            RAISE NOTICE '     "tenant_id": "%",', v_tenant_id;
            RAISE NOTICE '     "username": "admin",';
            RAISE NOTICE '     "display_name": "Administrador Titanium"';
            RAISE NOTICE '   }';
        END IF;
        RAISE NOTICE '';
    END IF;

    -- Verificar si el usuario existe en public.users
    SELECT EXISTS(SELECT 1 FROM public.users WHERE email = 'admin@turnos-titanium.com')
    INTO v_public_user_exists;

    IF v_public_user_exists THEN
        RAISE NOTICE '✅ Usuario existe en public.users';
    ELSE
        RAISE NOTICE '❌ Usuario NO existe en public.users';
        IF v_auth_user_exists THEN
            RAISE NOTICE '';
            RAISE NOTICE '📝 EJECUTA EL SCRIPT: /29_sincronizar_usuario_auth.sql';
            RAISE NOTICE '';
        END IF;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    -- Mostrar próximos pasos
    IF NOT v_auth_user_exists THEN
        RAISE NOTICE '🎯 PRÓXIMO PASO: Crear usuario en Supabase Dashboard';
    ELSIF NOT v_public_user_exists THEN
        RAISE NOTICE '🎯 PRÓXIMO PASO: Ejecutar /29_sincronizar_usuario_auth.sql';
    ELSE
        RAISE NOTICE '🎯 PRÓXIMO PASO: Hacer click en "🔧 Resetear Contraseña" en la app';
    END IF;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- CREAR ROL "SUPER ADMIN" CON ACCESO TOTAL - FIXED
-- =====================================================

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Usuario sistema
    v_super_admin_role_id UUID;
    v_all_scope_id UUID;
    v_tenant_id UUID;
    v_first_user_id UUID;
BEGIN
    -- =====================================================
    -- PASO 1: Crear el rol "Super Admin"
    -- =====================================================
    INSERT INTO public.roles (
        role_key,
        role_name,
        is_active,
        created_by
    )
    VALUES (
        'SUPER_ADMIN',
        'Super Administrador',
        true,
        v_user_id
    )
    ON CONFLICT (role_key) DO UPDATE
    SET 
        role_name = EXCLUDED.role_name,
        is_active = EXCLUDED.is_active
    RETURNING id INTO v_super_admin_role_id;

    RAISE NOTICE 'Rol Super Admin creado con ID: %', v_super_admin_role_id;

    -- =====================================================
    -- PASO 2: Asignar TODAS las screen_actions al rol
    -- =====================================================
    INSERT INTO public.role_screen_actions (
        role_id,
        screen_action_id,
        is_active,
        created_by
    )
    SELECT 
        v_super_admin_role_id,
        sa.id,
        true,
        v_user_id
    FROM public.screen_actions sa
    WHERE sa.is_active = true
    ON CONFLICT (role_id, screen_action_id) DO NOTHING;

    RAISE NOTICE 'Screen_actions asignadas al rol Super Admin: %', 
        (SELECT COUNT(*) FROM role_screen_actions WHERE role_id = v_super_admin_role_id);

    -- =====================================================
    -- PASO 3: Crear scope "TODAS" (acceso completo)
    -- =====================================================
    INSERT INTO public.scopes (
        scope_key,
        scope_name,
        scope_type,
        is_active,
        created_by
    )
    VALUES (
        'ALL',
        'Todas las Entidades',
        'GLOBAL',
        true,
        v_user_id
    )
    ON CONFLICT (scope_key) DO UPDATE
    SET 
        scope_name = EXCLUDED.scope_name,
        is_active = EXCLUDED.is_active
    RETURNING id INTO v_all_scope_id;

    RAISE NOTICE 'Scope "TODAS" creado con ID: %', v_all_scope_id;

    -- =====================================================
    -- PASO 4: Obtener el primer tenant y usuario creado
    -- =====================================================
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;

    SELECT id INTO v_first_user_id 
    FROM public.users 
    WHERE tenant_id = v_tenant_id 
    ORDER BY created_at ASC 
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE WARNING 'No se encontró ningún tenant activo';
    ELSE
        RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    END IF;

    IF v_first_user_id IS NULL THEN
        RAISE WARNING 'No se encontró ningún usuario en el tenant';
    ELSE
        RAISE NOTICE 'Usuario ID: %', v_first_user_id;
    END IF;

    -- =====================================================
    -- PASO 5: Asignar rol Super Admin al primer usuario
    -- =====================================================
    IF v_first_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (
            user_id,
            role_id,
            is_active,
            created_by
        )
        VALUES (
            v_first_user_id,
            v_super_admin_role_id,
            true,
            v_user_id
        )
        ON CONFLICT (user_id, role_id) DO UPDATE
        SET is_active = true;

        RAISE NOTICE 'Rol Super Admin asignado al usuario';

        -- =====================================================
        -- PASO 6: Asignar scope "TODAS" al usuario
        -- =====================================================
        INSERT INTO public.user_role_scopes (
            user_id,
            role_id,
            scope_id,
            entity_type,
            is_active,
            created_by
        )
        VALUES (
            v_first_user_id,
            v_super_admin_role_id,
            v_all_scope_id,
            'GLOBAL',
            true,
            v_user_id
        )
        ON CONFLICT (user_id, role_id, scope_id, entity_type) DO UPDATE
        SET is_active = true;

        RAISE NOTICE 'Scope "TODAS" asignado al usuario';
    END IF;

END $$;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- 1. Ver el rol creado
SELECT 
    r.role_key,
    r.role_name,
    r.is_active,
    COUNT(rsa.id) as total_permisos
FROM public.roles r
LEFT JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
WHERE r.role_key = 'SUPER_ADMIN'
GROUP BY r.id, r.role_key, r.role_name, r.is_active;

-- 2. Ver permisos del rol por módulo
SELECT 
    smg.menu_group_name as modulo,
    COUNT(DISTINCT s.id) as pantallas,
    COUNT(rsa.id) as acciones_asignadas
FROM public.roles r
JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
JOIN public.screens s ON s.id = sa.screen_id
JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
WHERE r.role_key = 'SUPER_ADMIN'
GROUP BY smg.menu_group_key, smg.menu_group_name, smg.sort_order
ORDER BY smg.sort_order;

-- 3. Ver usuario con el rol asignado
SELECT 
    u.id as user_id,
    u.email,
    u.display_name,
    t.tenant_name,
    r.role_name,
    ur.is_active as rol_activo,
    COUNT(DISTINCT urs.scope_id) as scopes_asignados
FROM public.users u
JOIN public.tenants t ON t.id = u.tenant_id
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
LEFT JOIN public.user_role_scopes urs ON urs.user_id = u.id AND urs.role_id = r.id
WHERE r.role_key = 'SUPER_ADMIN'
GROUP BY u.id, u.email, u.display_name, t.tenant_name, r.role_name, ur.is_active;

-- 4. Ver detalle de permisos del usuario
SELECT 
    smg.menu_group_name as modulo,
    s.screen_name as pantalla,
    a.action_name as accion
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
JOIN public.screen_actions sa ON sa.id = rsa.screen_action_id
JOIN public.screens s ON s.id = sa.screen_id
JOIN public.actions a ON a.id = sa.action_id
JOIN public.system_menu_groups smg ON smg.id = s.menu_group_id
WHERE r.role_key = 'SUPER_ADMIN' 
  AND ur.is_active = true
  AND rsa.is_active = true
  AND sa.is_active = true
ORDER BY smg.sort_order, s.sort_order, a.action_name
LIMIT 50;

-- =====================================================
-- CREAR ROL "SUPER ADMIN" CON ACCESO TOTAL
-- VERSION SIMPLIFICADA SIN tabla scopes
-- =====================================================

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Usuario sistema
    v_super_admin_role_id UUID;
    v_tenant_id UUID;
    v_first_user_id UUID;
    v_permisos_count INT;
BEGIN
    -- =====================================================
    -- PASO 1: Obtener el primer tenant activo
    -- =====================================================
    SELECT id INTO v_tenant_id 
    FROM public.tenants 
    WHERE is_active = true 
    ORDER BY created_at ASC 
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ningún tenant activo';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PASO 1: Tenant encontrado';
    RAISE NOTICE 'Tenant ID: %', v_tenant_id;
    RAISE NOTICE '========================================';

    -- =====================================================
    -- PASO 2: Crear o actualizar el rol "Super Admin"
    -- =====================================================
    
    -- Verificar si el rol ya existe para este tenant
    SELECT id INTO v_super_admin_role_id
    FROM public.roles
    WHERE tenant_id = v_tenant_id 
    AND role_key = 'SUPER_ADMIN';
    
    IF v_super_admin_role_id IS NULL THEN
        -- Crear el rol si no existe (usando TENANT como scope)
        INSERT INTO public.roles (
            tenant_id,
            role_key,
            role_name,
            role_scope,
            is_active,
            created_by
        )
        VALUES (
            v_tenant_id,
            'SUPER_ADMIN',
            'Super Administrador',
            'TENANT',
            true,
            v_user_id
        )
        RETURNING id INTO v_super_admin_role_id;
        
        RAISE NOTICE '========================================';
        RAISE NOTICE 'PASO 2: Rol CREADO';
        RAISE NOTICE 'Rol ID: %', v_super_admin_role_id;
        RAISE NOTICE '========================================';
    ELSE
        -- Actualizar el rol si ya existe
        UPDATE public.roles
        SET 
            role_name = 'Super Administrador',
            is_active = true,
            updated_by = v_user_id,
            updated_at = NOW()
        WHERE id = v_super_admin_role_id;
        
        RAISE NOTICE '========================================';
        RAISE NOTICE 'PASO 2: Rol ACTUALIZADO';
        RAISE NOTICE 'Rol ID: %', v_super_admin_role_id;
        RAISE NOTICE '========================================';
    END IF;

    -- =====================================================
    -- PASO 3: Asignar TODAS las screen_actions al rol
    -- =====================================================
    
    -- Primero eliminar asignaciones existentes para este rol
    DELETE FROM public.role_screen_actions 
    WHERE role_id = v_super_admin_role_id;
    
    -- Luego insertar todas las screen_actions activas
    INSERT INTO public.role_screen_actions (
        tenant_id,
        role_id,
        screen_action_id,
        is_active,
        created_by
    )
    SELECT 
        v_tenant_id,
        v_super_admin_role_id,
        sa.id,
        true,
        v_user_id
    FROM public.screen_actions sa
    WHERE sa.is_active = true;

    -- Contar permisos asignados
    SELECT COUNT(*) INTO v_permisos_count
    FROM public.role_screen_actions 
    WHERE role_id = v_super_admin_role_id;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'PASO 3: Permisos asignados';
    RAISE NOTICE 'Total screen_actions: %', v_permisos_count;
    RAISE NOTICE '========================================';

    -- =====================================================
    -- PASO 4: Obtener el primer usuario del tenant
    -- =====================================================
    SELECT id INTO v_first_user_id 
    FROM public.users 
    WHERE tenant_id = v_tenant_id 
    ORDER BY created_at ASC 
    LIMIT 1;

    IF v_first_user_id IS NULL THEN
        RAISE WARNING 'No se encontró ningún usuario en el tenant';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'ADVERTENCIA: Sin usuarios para asignar';
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE '========================================';
        RAISE NOTICE 'PASO 4: Usuario encontrado';
        RAISE NOTICE 'Usuario ID: %', v_first_user_id;
        RAISE NOTICE '========================================';
    END IF;

    -- =====================================================
    -- PASO 5: Asignar rol Super Admin al primer usuario
    -- =====================================================
    IF v_first_user_id IS NOT NULL THEN
        
        -- Verificar si ya existe la asignación
        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = v_first_user_id 
            AND role_id = v_super_admin_role_id
        ) THEN
            -- Crear la asignación si no existe
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
            );
            
            RAISE NOTICE '========================================';
            RAISE NOTICE 'PASO 5: Rol ASIGNADO al usuario';
            RAISE NOTICE '========================================';
        ELSE
            -- Actualizar la asignación si ya existe
            UPDATE public.user_roles
            SET 
                is_active = true,
                updated_by = v_user_id,
                updated_at = NOW()
            WHERE user_id = v_first_user_id 
            AND role_id = v_super_admin_role_id;
            
            RAISE NOTICE '========================================';
            RAISE NOTICE 'PASO 5: Asignación de rol ACTUALIZADA';
            RAISE NOTICE '========================================';
        END IF;
    END IF;

    -- =====================================================
    -- RESUMEN FINAL
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════╗';
    RAISE NOTICE '║   RESUMEN DE LA EJECUCIÓN EXITOSA      ║';
    RAISE NOTICE '╚════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Tenant ID:           %', v_tenant_id;
    RAISE NOTICE '✓ Rol ID:              %', v_super_admin_role_id;
    RAISE NOTICE '✓ Rol Key:             SUPER_ADMIN';
    RAISE NOTICE '✓ Rol Name:            Super Administrador';
    RAISE NOTICE '✓ Rol Scope:           TENANT';
    RAISE NOTICE '✓ Permisos asignados:  %', v_permisos_count;
    IF v_first_user_id IS NOT NULL THEN
        RAISE NOTICE '✓ Usuario ID:          %', v_first_user_id;
        RAISE NOTICE '✓ Rol asignado:        SÍ';
    ELSE
        RAISE NOTICE '⚠ Usuario ID:          (ninguno)';
        RAISE NOTICE '⚠ Rol asignado:        NO';
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════';

END $$;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- 1. Ver el rol creado
SELECT 
    r.role_key,
    r.role_name,
    r.role_scope,
    r.is_active,
    COUNT(rsa.id) as total_permisos
FROM public.roles r
LEFT JOIN public.role_screen_actions rsa ON rsa.role_id = r.id
WHERE r.role_key = 'SUPER_ADMIN'
GROUP BY r.id, r.role_key, r.role_name, r.role_scope, r.is_active;

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
  AND rsa.is_active = true
  AND sa.is_active = true
GROUP BY smg.menu_group_key, smg.menu_group_name, smg.sort_order
ORDER BY smg.sort_order;

-- 3. Ver usuario con el rol asignado
SELECT 
    u.id as user_id,
    u.email,
    u.display_name,
    t.tenant_name,
    r.role_name,
    r.role_scope,
    ur.is_active as rol_activo
FROM public.users u
JOIN public.tenants t ON t.id = u.tenant_id
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
WHERE r.role_key = 'SUPER_ADMIN';

-- 4. Ver detalle de permisos del usuario (primeros 50)
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

-- 5. Resumen general
SELECT 
    'ROLES' as tabla,
    COUNT(*) as total
FROM public.roles
WHERE role_key = 'SUPER_ADMIN'
UNION ALL
SELECT 
    'ROLE_SCREEN_ACTIONS' as tabla,
    COUNT(*) as total
FROM public.role_screen_actions rsa
JOIN public.roles r ON r.id = rsa.role_id
WHERE r.role_key = 'SUPER_ADMIN'
UNION ALL
SELECT 
    'USER_ROLES' as tabla,
    COUNT(*) as total
FROM public.user_roles ur
JOIN public.roles r ON r.id = ur.role_id
WHERE r.role_key = 'SUPER_ADMIN';

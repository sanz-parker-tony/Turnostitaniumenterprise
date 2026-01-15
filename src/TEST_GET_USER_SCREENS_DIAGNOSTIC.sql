-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Verificar estructura antes de actualizar get_user_screens()
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar estructura de tabla users
-- ============================================================================
SELECT 
    '1. Estructura de tabla USERS' AS test_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 2: Verificar estructura de tabla tenants
-- ============================================================================
SELECT 
    '2. Estructura de tabla TENANTS' AS test_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tenants'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 3: Verificar estructura de tabla screens
-- ============================================================================
SELECT 
    '3. Estructura de tabla SCREENS' AS test_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'screens'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 4: Verificar estructura de tabla system_menu_groups
-- ============================================================================
SELECT 
    '4. Estructura de tabla SYSTEM_MENU_GROUPS' AS test_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'system_menu_groups'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 5: Verificar datos de usuarios existentes
-- ============================================================================
SELECT 
    '5. USUARIOS EXISTENTES' AS test_name,
    u.id,
    u.email,
    u.username,
    u.tenant_id,
    t.tenant_name
FROM public.users u
LEFT JOIN public.tenants t ON u.tenant_id = t.id
LIMIT 5;

-- ============================================================================
-- PASO 6: Verificar roles asignados a usuarios
-- ============================================================================
SELECT 
    '6. ROLES ASIGNADOS' AS test_name,
    u.email,
    r.role_key,
    r.role_name,
    ur.is_active
FROM public.user_roles ur
INNER JOIN public.users u ON ur.user_id = u.id
INNER JOIN public.roles r ON ur.role_id = r.id
LIMIT 10;

-- ============================================================================
-- PASO 7: Verificar scopes de usuarios
-- ============================================================================
SELECT 
    '7. SCOPES ASIGNADOS' AS test_name,
    u.email,
    st.scope_type_key,
    st.scope_type_name,
    COUNT(*) as scope_count
FROM public.user_role_scopes urs
INNER JOIN public.user_roles ur ON ur.id = urs.user_role_id
INNER JOIN public.users u ON ur.user_id = u.id
LEFT JOIN public.scope_types st ON st.id = urs.scope_type_id
GROUP BY u.email, st.scope_type_key, st.scope_type_name
LIMIT 10;

-- ============================================================================
-- PASO 8: Verificar pantallas y grupos de menú
-- ============================================================================
SELECT 
    '8. PANTALLAS Y GRUPOS' AS test_name,
    s.screen_key,
    s.screen_name,
    s.icon_key as screen_icon,
    s.route_path,
    mg.menu_group_key,
    mg.menu_group_name,
    mg.icon_key as group_icon
FROM public.screens s
INNER JOIN public.system_menu_groups mg ON s.menu_group_id = mg.id
WHERE s.is_active = true
LIMIT 10;

-- ============================================================================
-- PASO 9: Test de JOIN entre users y tenants
-- ============================================================================
SELECT 
    '9. TEST JOIN users-tenants' AS test_name,
    u.id as user_id,
    u.email,
    u.tenant_id as user_tenant_id,
    t.id as tenant_id,
    t.tenant_name
FROM public.users u
LEFT JOIN public.tenants t ON u.tenant_id = t.id
LIMIT 5;

-- ============================================================================
-- PASO 10: Verificar que existe al menos un usuario con email
-- ============================================================================
SELECT 
    '10. USUARIOS CON EMAIL' AS test_name,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email
FROM public.users;

-- ============================================================================
-- PASO 11: Verificar estructura completa de role_screen_actions
-- ============================================================================
SELECT 
    '11. Estructura ROLE_SCREEN_ACTIONS' AS test_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'role_screen_actions'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 12: Verificar estructura completa de screen_actions
-- ============================================================================
SELECT 
    '12. Estructura SCREEN_ACTIONS' AS test_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'screen_actions'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 13: Verificar estructura completa de user_role_scopes
-- ============================================================================
SELECT 
    '13. Estructura USER_ROLE_SCOPES' AS test_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_role_scopes'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 14: Verificar estructura completa de scope_types
-- ============================================================================
SELECT 
    '14. Estructura SCOPE_TYPES' AS test_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'scope_types'
ORDER BY ordinal_position;

-- ============================================================================
-- RESUMEN DE VERIFICACIONES
-- ============================================================================
SELECT 
    '=== RESUMEN DE VERIFICACIONES ===' AS resultado,
    '' as detalle
UNION ALL
SELECT 
    'Tabla users existe?', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
         THEN '✅ SI' ELSE '❌ NO' END
UNION ALL
SELECT 
    'Tabla tenants existe?', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants' AND table_schema = 'public') 
         THEN '✅ SI' ELSE '❌ NO' END
UNION ALL
SELECT 
    'Tabla screens existe?', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'screens' AND table_schema = 'public') 
         THEN '✅ SI' ELSE '❌ NO' END
UNION ALL
SELECT 
    'Tabla system_menu_groups existe?', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_menu_groups' AND table_schema = 'public') 
         THEN '✅ SI' ELSE '❌ NO' END
UNION ALL
SELECT 
    'Campo tenants.tenant_name existe?', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'tenant_name' AND table_schema = 'public') 
         THEN '✅ SI' ELSE '❌ NO' END
UNION ALL
SELECT 
    'Campo screens.icon_key existe?', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'screens' AND column_name = 'icon_key' AND table_schema = 'public') 
         THEN '✅ SI' ELSE '❌ NO' END
UNION ALL
SELECT 
    'Campo system_menu_groups.icon_key existe?', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_menu_groups' AND column_name = 'icon_key' AND table_schema = 'public') 
         THEN '✅ SI' ELSE '❌ NO' END
UNION ALL
SELECT 
    'screens tiene tenant_id?', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'screens' AND column_name = 'tenant_id' AND table_schema = 'public') 
         THEN '⚠️ SI (tabla tenant-específica)' ELSE '✅ NO (tabla SYSTEM)' END;
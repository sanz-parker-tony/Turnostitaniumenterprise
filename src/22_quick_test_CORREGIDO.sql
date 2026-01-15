-- =====================================================
-- QUICK TEST - Verificación Rápida del Sistema (CORREGIDO)
-- Ejecuta esto para confirmar que todo está funcionando
-- =====================================================

-- TEST 1: Verificar que las 5 funciones existen (CORREGIDO para contar por nombre único)
SELECT 
    'TEST 1: Funciones SQL' as test_name,
    COUNT(DISTINCT routine_name) as funciones_creadas,
    CASE 
        WHEN COUNT(DISTINCT routine_name) = 5 THEN '✅ PASS'
        ELSE '❌ FAIL - Faltan funciones'
    END as resultado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  );

-- TEST 2: Verificar pantallas del Super Admin
SELECT 
    'TEST 2: Pantallas Super Admin' as test_name,
    COUNT(*) as pantallas_disponibles,
    CASE 
        WHEN COUNT(*) >= 50 THEN '✅ PASS'
        ELSE '❌ FAIL - Pocas pantallas'
    END as resultado
FROM get_user_screens('admin@turnos-titanium.com');

-- TEST 3: Verificar permiso específico
SELECT 
    'TEST 3: Permiso CREATE en ORG_COMPANIES' as test_name,
    user_has_permission('admin@turnos-titanium.com', 'ORG_COMPANIES', 'CREATE') as tiene_permiso,
    CASE 
        WHEN user_has_permission('admin@turnos-titanium.com', 'ORG_COMPANIES', 'CREATE') THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as resultado;

-- TEST 4: Verificar acciones de una pantalla
SELECT 
    'TEST 4: Acciones en ORG_COMPANIES' as test_name,
    COUNT(*) as acciones_disponibles,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ PASS'
        ELSE '❌ FAIL - Deben ser 4 acciones (VIEW, CREATE, UPDATE, DELETE)'
    END as resultado
FROM get_user_screen_actions('admin@turnos-titanium.com', 'ORG_COMPANIES');

-- TEST 5: Verificar acceso a entidad
SELECT 
    'TEST 5: Acceso a Empresa Demo' as test_name,
    user_can_access_entity(
        'admin@turnos-titanium.com',
        'COMPANY',
        '33333333-3333-3333-3333-333333333333'::UUID
    ) as puede_acceder,
    CASE 
        WHEN user_can_access_entity(
            'admin@turnos-titanium.com',
            'COMPANY',
            '33333333-3333-3333-3333-333333333333'::UUID
        ) THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as resultado;

-- TEST 6: Verificar usuario existe
SELECT 
    'TEST 6: Usuario existe en public.users' as test_name,
    email,
    CASE 
        WHEN email IS NOT NULL THEN '✅ PASS'
        ELSE '❌ FAIL'
    END as resultado
FROM public.users
WHERE email = 'admin@turnos-titanium.com';

-- TEST 7: Verificar que NO hay scopes para Super Admin (acceso total)
SELECT 
    'TEST 7: Super Admin sin scopes' as test_name,
    COUNT(*) as scopes_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ PASS - Acceso total a todo el tenant'
        ELSE '⚠️ WARNING - Tiene scopes limitados'
    END as resultado
FROM public.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.roles r ON r.id = ur.role_id
LEFT JOIN public.user_role_scopes urs ON urs.user_role_id = ur.id
WHERE u.email = 'admin@turnos-titanium.com'
  AND r.role_key = 'SUPER_ADMIN'
  AND urs.id IS NOT NULL;

-- =====================================================
-- RESULTADO ESPERADO: TODOS LOS TESTS DEBEN SER ✅ PASS
-- =====================================================

-- BONUS: Ver primeras 10 pantallas del menú
SELECT 
    screen_key,
    screen_name,
    menu_group_key,
    menu_group_name
FROM get_user_screens('admin@turnos-titanium.com')
ORDER BY menu_group_name, screen_name
LIMIT 10;

-- BONUS 2: Ver las 5 funciones de permisos con detalles
SELECT 
    routine_name as nombre_funcion,
    COUNT(*) as variantes,
    string_agg(DISTINCT data_type::TEXT, ', ') as tipos_retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_screens',
    'get_user_screen_actions',
    'user_has_permission',
    'user_can_access_entity',
    'get_user_accessible_entities'
  )
GROUP BY routine_name
ORDER BY routine_name;

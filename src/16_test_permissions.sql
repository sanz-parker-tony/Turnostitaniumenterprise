-- =====================================================
-- TEST DE PERMISOS - DESPUÉS DE CREAR LAS FUNCIONES
-- =====================================================

-- =====================================================
-- TEST 1: Verificar permiso CREATE en ORG_COMPANIES
-- =====================================================
SELECT user_has_permission(
    'admin@turnos-titanium.com', 
    'ORG_COMPANIES',
    'CREATE'
) as tiene_permiso_create_companies;

-- =====================================================
-- TEST 2: Obtener todas las pantallas del usuario
-- =====================================================
SELECT * 
FROM get_user_screens('admin@turnos-titanium.com')
WHERE menu_group_key = 'ORG'
ORDER BY screen_key;

-- =====================================================
-- TEST 3: Obtener acciones de ORG_COMPANIES
-- =====================================================
SELECT * 
FROM get_user_screen_actions('admin@turnos-titanium.com', 'ORG_COMPANIES')
ORDER BY action_key;

-- =====================================================
-- TEST 4: Verificar acceso a todas las empresas
-- (Super Admin sin scopes debe tener acceso total)
-- =====================================================
SELECT * 
FROM get_user_accessible_entities('admin@turnos-titanium.com', 'COMPANY');

-- =====================================================
-- TEST 5: Verificar si puede acceder a una empresa específica
-- (Reemplazar con un company_id real de tu BD)
-- =====================================================
SELECT c.id, c.company_name
FROM public.companies c
LIMIT 1;

-- Usa el ID del resultado anterior aquí:
-- SELECT user_can_access_entity(
--     'admin@turnos-titanium.com',
--     'COMPANY',
--     'AQUI_EL_UUID'
-- ) as puede_acceder;

-- =====================================================
-- 🔍 DIAGNÓSTICO COMPLETO - get_user_screens()
-- =====================================================
-- Este script valida paso por paso que la función funcione correctamente
-- =====================================================

-- =====================================================
-- PASO 1: Verificar que la función existe
-- =====================================================
SELECT 
    '✅ PASO 1: Verificar función existe' as paso,
    routine_name as nombre_funcion,
    routine_type as tipo,
    data_type as tipo_retorno
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_user_screens';

-- =====================================================
-- PASO 2: Verificar parámetros de entrada
-- =====================================================
SELECT 
    '✅ PASO 2: Parámetros de entrada' as paso,
    parameter_name as nombre_parametro,
    data_type as tipo_dato,
    parameter_mode as modo
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'get_user_screens%'
  AND parameter_mode = 'IN'
ORDER BY ordinal_position;

-- =====================================================
-- PASO 3: Verificar campos de salida (RETURNS TABLE)
-- =====================================================
SELECT 
    '✅ PASO 3: Campos de salida' as paso,
    parameter_name as nombre_campo,
    data_type as tipo_dato,
    ordinal_position as posicion
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'get_user_screens%'
  AND parameter_mode = 'OUT'
ORDER BY ordinal_position;

-- =====================================================
-- PASO 4: Verificar estructura de system_menu_groups
-- =====================================================
SELECT 
    '✅ PASO 4: Columnas de system_menu_groups' as paso,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'system_menu_groups'
  AND column_name IN ('menu_group_key', 'menu_group_name', 'icon_key', 'sort_order')
ORDER BY ordinal_position;

-- =====================================================
-- PASO 5: Verificar estructura de screens
-- =====================================================
SELECT 
    '✅ PASO 5: Columnas de screens' as paso,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'screens'
  AND column_name IN ('screen_key', 'screen_name', 'icon_key', 'route_path', 'sort_order', 'menu_group_id')
ORDER BY ordinal_position;

-- =====================================================
-- PASO 6: Verificar que existe el usuario admin
-- =====================================================
SELECT 
    '✅ PASO 6: Usuario admin existe' as paso,
    id,
    email,
    tenant_id,
    created_at
FROM public.users
WHERE email = 'admin@turnos-titanium.com'
LIMIT 1;

-- =====================================================
-- PASO 7: Ver datos de ejemplo de system_menu_groups
-- =====================================================
SELECT 
    '✅ PASO 7: Ejemplo system_menu_groups' as paso,
    menu_group_key,
    menu_group_name,
    icon_key,  -- ⚠️ IMPORTANTE: debe tener valores como 'LayoutDashboard', 'Building2', etc.
    sort_order,
    is_active
FROM public.system_menu_groups
WHERE is_active = true
ORDER BY sort_order
LIMIT 5;

-- =====================================================
-- PASO 8: Ver datos de ejemplo de screens
-- =====================================================
SELECT 
    '✅ PASO 8: Ejemplo screens' as paso,
    screen_key,
    screen_name,
    icon_key,  -- ⚠️ IMPORTANTE: debe tener valores como 'AlertTriangle', 'Calendar', etc.
    route_path,  -- ⚠️ IMPORTANTE: debe ser route_path, NO screen_path
    sort_order,
    is_active
FROM public.screens
WHERE is_active = true
ORDER BY sort_order
LIMIT 5;

-- =====================================================
-- PASO 9: 🚀 EJECUTAR LA FUNCIÓN (Primera Prueba)
-- =====================================================
-- Si este paso falla, revisar los pasos anteriores
SELECT 
    '✅ PASO 9: Ejecutar función - Primeras 5 pantallas' as paso,
    menu_group_key,
    menu_group_name,
    menu_group_icon,  -- ⚠️ Debe mostrar valores como 'LayoutDashboard'
    screen_key,
    screen_name,
    screen_icon_key,  -- ⚠️ Debe mostrar valores como 'AlertTriangle'
    route_path,  -- ⚠️ Debe mostrar valores como '/incidents'
    can_view,
    can_create,
    can_update,
    can_delete,
    can_export
FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
)
ORDER BY menu_group_sort, screen_sort
LIMIT 5;

-- =====================================================
-- PASO 10: Contar total de pantallas retornadas
-- =====================================================
SELECT 
    '✅ PASO 10: Total de pantallas' as paso,
    COUNT(*) as total_pantallas,
    COUNT(DISTINCT menu_group_key) as total_grupos
FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
);

-- =====================================================
-- PASO 11: Verificar que los íconos NO son NULL
-- =====================================================
SELECT 
    '✅ PASO 11: Verificar íconos NO NULL' as paso,
    COUNT(*) as total_pantallas,
    COUNT(CASE WHEN menu_group_icon IS NULL THEN 1 END) as iconos_grupo_null,
    COUNT(CASE WHEN screen_icon_key IS NULL THEN 1 END) as iconos_screen_null,
    COUNT(CASE WHEN route_path IS NULL THEN 1 END) as route_path_null
FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
);

-- =====================================================
-- PASO 12: Ver TODAS las pantallas agrupadas por menú
-- =====================================================
SELECT 
    '✅ PASO 12: Todas las pantallas por grupo' as paso,
    menu_group_key,
    menu_group_name,
    menu_group_icon,
    menu_group_sort,
    screen_key,
    screen_name,
    screen_icon_key,
    route_path,
    screen_sort,
    can_view,
    can_create,
    can_update,
    can_delete,
    can_export
FROM public.get_user_screens(
    (SELECT id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1),
    (SELECT tenant_id FROM public.users WHERE email = 'admin@turnos-titanium.com' LIMIT 1)
)
ORDER BY menu_group_sort, screen_sort;

-- =====================================================
-- 📊 RESUMEN DE VALIDACIÓN
-- =====================================================
-- ✅ Si TODOS los pasos retornan datos → La función está OK
-- ❌ Si algún paso falla:
--    - PASO 1 falla → La función no existe, ejecutar script de creación
--    - PASO 2-3 fallan → La función tiene parámetros incorrectos
--    - PASO 4-5 fallan → Las tablas no tienen las columnas correctas
--    - PASO 6 falla → No existe el usuario admin
--    - PASO 7-8 fallan → Las tablas están vacías
--    - PASO 9 falla → Error en la lógica de la función
--    - PASO 11 muestra NULLs → Falta poblar icon_key en las tablas
-- =====================================================

-- =====================================================
-- INSERTAR MÓDULOS (9 módulos principales)
-- =====================================================

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Usuario sistema
BEGIN
    -- Insertar los 9 módulos principales
    INSERT INTO public.modules (module_key, module_name, icon, route_prefix, sort_order, is_active, created_by)
    VALUES
        ('DASHBOARD', 'Dashboard', 'LayoutDashboard', '/dashboard', 1, true, v_user_id),
        ('ATTENDANCE', 'Asistencias', 'Clock', '/asistencias', 2, true, v_user_id),
        ('SHIFTS', 'Turnos', 'Calendar', '/turnos', 3, true, v_user_id),
        ('PLANNING', 'Planificación', 'CalendarDays', '/planificacion', 4, true, v_user_id),
        ('ORGANIZATION', 'Organización', 'Building2', '/organizacion', 5, true, v_user_id),
        ('EMPLOYEES', 'Empleados', 'Users', '/empleados', 6, true, v_user_id),
        ('PAYROLL', 'Nómina', 'DollarSign', '/nomina', 7, true, v_user_id),
        ('CONFIGURATION', 'Configuración', 'Settings', '/configuracion', 8, true, v_user_id),
        ('SECURITY', 'Seguridades', 'Shield', '/seguridades', 9, true, v_user_id)
    ON CONFLICT (module_key) DO UPDATE SET
        module_name = EXCLUDED.module_name,
        icon = EXCLUDED.icon,
        route_prefix = EXCLUDED.route_prefix,
        sort_order = EXCLUDED.sort_order;

    RAISE NOTICE 'Módulos insertados/actualizados exitosamente';
END $$;

-- Verificar módulos insertados
SELECT 
    module_key,
    module_name,
    icon,
    route_prefix,
    sort_order,
    is_active
FROM public.modules
ORDER BY sort_order;

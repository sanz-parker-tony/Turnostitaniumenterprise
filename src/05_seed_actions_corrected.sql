-- =====================================================
-- PASO 1: Insertar ACCIONES genéricas en la tabla actions
-- =====================================================

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Usuario sistema
BEGIN
    -- Insertar acciones genéricas (si no existen)
    INSERT INTO public.actions (action_key, action_name, is_active, created_by)
    VALUES
        ('VIEW', 'Ver/Consultar', true, v_user_id),
        ('CREATE', 'Crear/Nuevo', true, v_user_id),
        ('EDIT', 'Editar/Modificar', true, v_user_id),
        ('DELETE', 'Eliminar', true, v_user_id),
        ('EXPORT', 'Exportar', true, v_user_id),
        ('IMPORT', 'Importar', true, v_user_id),
        ('APPROVE', 'Aprobar', true, v_user_id),
        ('REJECT', 'Rechazar', true, v_user_id),
        ('PRINT', 'Imprimir', true, v_user_id),
        ('COPY', 'Copiar', true, v_user_id),
        ('ASSIGN', 'Asignar', true, v_user_id),
        ('UNASSIGN', 'Desasignar', true, v_user_id),
        ('ACTIVATE', 'Activar', true, v_user_id),
        ('DEACTIVATE', 'Desactivar', true, v_user_id),
        ('COPY_PERMISSIONS', 'Copiar Permisos', true, v_user_id)
    ON CONFLICT (action_key) DO NOTHING;

    RAISE NOTICE 'Acciones genéricas insertadas/verificadas exitosamente';
END $$;


-- =====================================================
-- PASO 2: Relacionar PANTALLAS con ACCIONES en screen_actions
-- =====================================================

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000001';
    v_screen_id UUID;
    v_action_id UUID;
BEGIN

    -- FUNCIÓN AUXILIAR: Asociar una acción a una pantalla
    CREATE OR REPLACE FUNCTION associate_action(p_screen_key VARCHAR, p_action_key VARCHAR, p_user_id UUID)
    RETURNS VOID AS $func$
    DECLARE
        v_scr_id UUID;
        v_act_id UUID;
    BEGIN
        -- Obtener IDs
        SELECT id INTO v_scr_id FROM public.screens WHERE screen_key = p_screen_key;
        SELECT id INTO v_act_id FROM public.actions WHERE action_key = p_action_key;
        
        IF v_scr_id IS NOT NULL AND v_act_id IS NOT NULL THEN
            INSERT INTO public.screen_actions (screen_id, action_id, is_active, created_by)
            VALUES (v_scr_id, v_act_id, true, p_user_id)
            ON CONFLICT (screen_id, action_id) DO NOTHING;
        END IF;
    END;
    $func$ LANGUAGE plpgsql;

    -- ============================================
    -- MÓDULO 1: DASHBOARD (1 pantalla)
    -- ============================================
    PERFORM associate_action('DASHBOARD_MAIN', 'VIEW', v_user_id);
    PERFORM associate_action('DASHBOARD_MAIN', 'EXPORT', v_user_id);

    -- ============================================
    -- MÓDULO 2: ASISTENCIAS (5 pantallas)
    -- ============================================
    
    -- Marcaje Manual
    PERFORM associate_action('ATT_MANUAL_ENTRY', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_MANUAL_ENTRY', 'CREATE', v_user_id);
    PERFORM associate_action('ATT_MANUAL_ENTRY', 'EDIT', v_user_id);
    
    -- Consulta de Asistencias
    PERFORM associate_action('ATT_QUERY', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_QUERY', 'EXPORT', v_user_id);
    
    -- Justificaciones
    PERFORM associate_action('ATT_JUSTIFICATIONS', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_JUSTIFICATIONS', 'CREATE', v_user_id);
    PERFORM associate_action('ATT_JUSTIFICATIONS', 'EDIT', v_user_id);
    PERFORM associate_action('ATT_JUSTIFICATIONS', 'DELETE', v_user_id);
    PERFORM associate_action('ATT_JUSTIFICATIONS', 'APPROVE', v_user_id);
    PERFORM associate_action('ATT_JUSTIFICATIONS', 'REJECT', v_user_id);
    
    -- Reportes
    PERFORM associate_action('ATT_REPORTS', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_REPORTS', 'EXPORT', v_user_id);
    PERFORM associate_action('ATT_REPORTS', 'PRINT', v_user_id);
    
    -- Configuración de Dispositivos
    PERFORM associate_action('ATT_DEVICE_CONFIG', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_DEVICE_CONFIG', 'CREATE', v_user_id);
    PERFORM associate_action('ATT_DEVICE_CONFIG', 'EDIT', v_user_id);
    PERFORM associate_action('ATT_DEVICE_CONFIG', 'DELETE', v_user_id);

    -- ============================================
    -- MÓDULO 3: TURNOS (7 pantallas)
    -- ============================================
    
    -- Maestro de Turnos
    PERFORM associate_action('SHIFT_MASTER', 'VIEW', v_user_id);
    PERFORM associate_action('SHIFT_MASTER', 'CREATE', v_user_id);
    PERFORM associate_action('SHIFT_MASTER', 'EDIT', v_user_id);
    PERFORM associate_action('SHIFT_MASTER', 'DELETE', v_user_id);
    PERFORM associate_action('SHIFT_MASTER', 'COPY', v_user_id);
    
    -- Plantillas de Turnos
    PERFORM associate_action('SHIFT_TEMPLATES', 'VIEW', v_user_id);
    PERFORM associate_action('SHIFT_TEMPLATES', 'CREATE', v_user_id);
    PERFORM associate_action('SHIFT_TEMPLATES', 'EDIT', v_user_id);
    PERFORM associate_action('SHIFT_TEMPLATES', 'DELETE', v_user_id);
    
    -- Calendario de Turnos
    PERFORM associate_action('SHIFT_CALENDAR', 'VIEW', v_user_id);
    PERFORM associate_action('SHIFT_CALENDAR', 'EDIT', v_user_id);
    PERFORM associate_action('SHIFT_CALENDAR', 'EXPORT', v_user_id);
    
    -- Asignación Masiva
    PERFORM associate_action('SHIFT_BULK_ASSIGN', 'VIEW', v_user_id);
    PERFORM associate_action('SHIFT_BULK_ASSIGN', 'CREATE', v_user_id);
    PERFORM associate_action('SHIFT_BULK_ASSIGN', 'IMPORT', v_user_id);
    
    -- Solicitudes de Cambio
    PERFORM associate_action('SHIFT_CHANGE_REQUESTS', 'VIEW', v_user_id);
    PERFORM associate_action('SHIFT_CHANGE_REQUESTS', 'CREATE', v_user_id);
    PERFORM associate_action('SHIFT_CHANGE_REQUESTS', 'APPROVE', v_user_id);
    PERFORM associate_action('SHIFT_CHANGE_REQUESTS', 'REJECT', v_user_id);
    
    -- Rotación de Turnos
    PERFORM associate_action('SHIFT_ROTATION', 'VIEW', v_user_id);
    PERFORM associate_action('SHIFT_ROTATION', 'CREATE', v_user_id);
    PERFORM associate_action('SHIFT_ROTATION', 'EDIT', v_user_id);
    PERFORM associate_action('SHIFT_ROTATION', 'DELETE', v_user_id);
    
    -- Reportes de Turnos
    PERFORM associate_action('SHIFT_REPORTS', 'VIEW', v_user_id);
    PERFORM associate_action('SHIFT_REPORTS', 'EXPORT', v_user_id);
    PERFORM associate_action('SHIFT_REPORTS', 'PRINT', v_user_id);

    -- ============================================
    -- MÓDULO 4: PLANIFICACIÓN (6 pantallas)
    -- ============================================
    
    -- Calendario de Planificación
    PERFORM associate_action('PLAN_CALENDAR', 'VIEW', v_user_id);
    PERFORM associate_action('PLAN_CALENDAR', 'EDIT', v_user_id);
    PERFORM associate_action('PLAN_CALENDAR', 'EXPORT', v_user_id);
    
    -- Plantillas de Planificación
    PERFORM associate_action('PLAN_TEMPLATES', 'VIEW', v_user_id);
    PERFORM associate_action('PLAN_TEMPLATES', 'CREATE', v_user_id);
    PERFORM associate_action('PLAN_TEMPLATES', 'EDIT', v_user_id);
    PERFORM associate_action('PLAN_TEMPLATES', 'DELETE', v_user_id);
    
    -- Asignación de Recursos
    PERFORM associate_action('PLAN_RESOURCE_ASSIGN', 'VIEW', v_user_id);
    PERFORM associate_action('PLAN_RESOURCE_ASSIGN', 'CREATE', v_user_id);
    PERFORM associate_action('PLAN_RESOURCE_ASSIGN', 'EDIT', v_user_id);
    
    -- Disponibilidad
    PERFORM associate_action('PLAN_AVAILABILITY', 'VIEW', v_user_id);
    PERFORM associate_action('PLAN_AVAILABILITY', 'CREATE', v_user_id);
    PERFORM associate_action('PLAN_AVAILABILITY', 'EDIT', v_user_id);
    
    -- Conflictos
    PERFORM associate_action('PLAN_CONFLICTS', 'VIEW', v_user_id);
    PERFORM associate_action('PLAN_CONFLICTS', 'EDIT', v_user_id);
    
    -- Reportes de Planificación
    PERFORM associate_action('PLAN_REPORTS', 'VIEW', v_user_id);
    PERFORM associate_action('PLAN_REPORTS', 'EXPORT', v_user_id);
    PERFORM associate_action('PLAN_REPORTS', 'PRINT', v_user_id);

    -- ============================================
    -- MÓDULO 5: ORGANIZACIÓN (8 pantallas)
    -- ============================================
    
    -- Empresas
    PERFORM associate_action('ORG_COMPANIES', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_COMPANIES', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_COMPANIES', 'EDIT', v_user_id);
    PERFORM associate_action('ORG_COMPANIES', 'DELETE', v_user_id);
    
    -- Localidades
    PERFORM associate_action('ORG_LOCATIONS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_LOCATIONS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_LOCATIONS', 'EDIT', v_user_id);
    PERFORM associate_action('ORG_LOCATIONS', 'DELETE', v_user_id);
    
    -- Departamentos
    PERFORM associate_action('ORG_DEPARTMENTS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_DEPARTMENTS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_DEPARTMENTS', 'EDIT', v_user_id);
    PERFORM associate_action('ORG_DEPARTMENTS', 'DELETE', v_user_id);
    
    -- Áreas
    PERFORM associate_action('ORG_AREAS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_AREAS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_AREAS', 'EDIT', v_user_id);
    PERFORM associate_action('ORG_AREAS', 'DELETE', v_user_id);
    
    -- Puestos
    PERFORM associate_action('ORG_POSITIONS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_POSITIONS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_POSITIONS', 'EDIT', v_user_id);
    PERFORM associate_action('ORG_POSITIONS', 'DELETE', v_user_id);
    
    -- Organigrama
    PERFORM associate_action('ORG_CHART', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_CHART', 'EXPORT', v_user_id);
    
    -- Jerarquías
    PERFORM associate_action('ORG_HIERARCHIES', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_HIERARCHIES', 'EDIT', v_user_id);
    
    -- Centros de Costo
    PERFORM associate_action('ORG_COST_CENTERS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_COST_CENTERS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_COST_CENTERS', 'EDIT', v_user_id);
    PERFORM associate_action('ORG_COST_CENTERS', 'DELETE', v_user_id);

    -- ============================================
    -- MÓDULO 6: EMPLEADOS (6 pantallas)
    -- ============================================
    
    -- Maestro de Empleados
    PERFORM associate_action('EMP_MASTER', 'VIEW', v_user_id);
    PERFORM associate_action('EMP_MASTER', 'CREATE', v_user_id);
    PERFORM associate_action('EMP_MASTER', 'EDIT', v_user_id);
    PERFORM associate_action('EMP_MASTER', 'DELETE', v_user_id);
    PERFORM associate_action('EMP_MASTER', 'EXPORT', v_user_id);
    
    -- Datos Personales
    PERFORM associate_action('EMP_PERSONAL_DATA', 'VIEW', v_user_id);
    PERFORM associate_action('EMP_PERSONAL_DATA', 'EDIT', v_user_id);
    
    -- Datos Laborales
    PERFORM associate_action('EMP_WORK_DATA', 'VIEW', v_user_id);
    PERFORM associate_action('EMP_WORK_DATA', 'EDIT', v_user_id);
    
    -- Documentos
    PERFORM associate_action('EMP_DOCUMENTS', 'VIEW', v_user_id);
    PERFORM associate_action('EMP_DOCUMENTS', 'CREATE', v_user_id);
    PERFORM associate_action('EMP_DOCUMENTS', 'DELETE', v_user_id);
    
    -- Historial
    PERFORM associate_action('EMP_HISTORY', 'VIEW', v_user_id);
    PERFORM associate_action('EMP_HISTORY', 'EXPORT', v_user_id);
    
    -- Importación Masiva
    PERFORM associate_action('EMP_BULK_IMPORT', 'VIEW', v_user_id);
    PERFORM associate_action('EMP_BULK_IMPORT', 'IMPORT', v_user_id);

    -- ============================================
    -- MÓDULO 7: NÓMINA (6 pantallas)
    -- ============================================
    
    -- Exportación a Nómina
    PERFORM associate_action('PAY_EXPORT', 'VIEW', v_user_id);
    PERFORM associate_action('PAY_EXPORT', 'EXPORT', v_user_id);
    
    -- Configuración de Exportación
    PERFORM associate_action('PAY_EXPORT_CONFIG', 'VIEW', v_user_id);
    PERFORM associate_action('PAY_EXPORT_CONFIG', 'EDIT', v_user_id);
    
    -- Conceptos de Nómina
    PERFORM associate_action('PAY_CONCEPTS', 'VIEW', v_user_id);
    PERFORM associate_action('PAY_CONCEPTS', 'CREATE', v_user_id);
    PERFORM associate_action('PAY_CONCEPTS', 'EDIT', v_user_id);
    PERFORM associate_action('PAY_CONCEPTS', 'DELETE', v_user_id);
    
    -- Mapeo de Turnos
    PERFORM associate_action('PAY_SHIFT_MAPPING', 'VIEW', v_user_id);
    PERFORM associate_action('PAY_SHIFT_MAPPING', 'EDIT', v_user_id);
    
    -- Historial de Exportaciones
    PERFORM associate_action('PAY_EXPORT_HISTORY', 'VIEW', v_user_id);
    PERFORM associate_action('PAY_EXPORT_HISTORY', 'EXPORT', v_user_id);
    
    -- Validaciones
    PERFORM associate_action('PAY_VALIDATIONS', 'VIEW', v_user_id);
    PERFORM associate_action('PAY_VALIDATIONS', 'EXPORT', v_user_id);

    -- ============================================
    -- MÓDULO 8: CONFIGURACIÓN (7 pantallas)
    -- ============================================
    
    -- Parámetros Generales
    PERFORM associate_action('CFG_GENERAL_PARAMS', 'VIEW', v_user_id);
    PERFORM associate_action('CFG_GENERAL_PARAMS', 'EDIT', v_user_id);
    
    -- Días Feriados
    PERFORM associate_action('CFG_HOLIDAYS', 'VIEW', v_user_id);
    PERFORM associate_action('CFG_HOLIDAYS', 'CREATE', v_user_id);
    PERFORM associate_action('CFG_HOLIDAYS', 'EDIT', v_user_id);
    PERFORM associate_action('CFG_HOLIDAYS', 'DELETE', v_user_id);
    PERFORM associate_action('CFG_HOLIDAYS', 'IMPORT', v_user_id);
    
    -- Horarios
    PERFORM associate_action('CFG_SCHEDULES', 'VIEW', v_user_id);
    PERFORM associate_action('CFG_SCHEDULES', 'CREATE', v_user_id);
    PERFORM associate_action('CFG_SCHEDULES', 'EDIT', v_user_id);
    PERFORM associate_action('CFG_SCHEDULES', 'DELETE', v_user_id);
    
    -- Tipos de Ausencia
    PERFORM associate_action('CFG_ABSENCE_TYPES', 'VIEW', v_user_id);
    PERFORM associate_action('CFG_ABSENCE_TYPES', 'CREATE', v_user_id);
    PERFORM associate_action('CFG_ABSENCE_TYPES', 'EDIT', v_user_id);
    PERFORM associate_action('CFG_ABSENCE_TYPES', 'DELETE', v_user_id);
    
    -- Reglas de Negocio
    PERFORM associate_action('CFG_BUSINESS_RULES', 'VIEW', v_user_id);
    PERFORM associate_action('CFG_BUSINESS_RULES', 'EDIT', v_user_id);
    
    -- Notificaciones
    PERFORM associate_action('CFG_NOTIFICATIONS', 'VIEW', v_user_id);
    PERFORM associate_action('CFG_NOTIFICATIONS', 'EDIT', v_user_id);
    
    -- Integrations
    PERFORM associate_action('CFG_INTEGRATIONS', 'VIEW', v_user_id);
    PERFORM associate_action('CFG_INTEGRATIONS', 'EDIT', v_user_id);

    -- ============================================
    -- MÓDULO 9: SEGURIDADES (9 pantallas)
    -- ============================================
    
    -- Usuarios
    PERFORM associate_action('SEC_USERS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_USERS', 'CREATE', v_user_id);
    PERFORM associate_action('SEC_USERS', 'EDIT', v_user_id);
    PERFORM associate_action('SEC_USERS', 'DELETE', v_user_id);
    PERFORM associate_action('SEC_USERS', 'ACTIVATE', v_user_id);
    PERFORM associate_action('SEC_USERS', 'DEACTIVATE', v_user_id);
    
    -- Roles
    PERFORM associate_action('SEC_ROLES', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_ROLES', 'CREATE', v_user_id);
    PERFORM associate_action('SEC_ROLES', 'EDIT', v_user_id);
    PERFORM associate_action('SEC_ROLES', 'DELETE', v_user_id);
    
    -- Permisos de Roles
    PERFORM associate_action('SEC_ROLE_PERMISSIONS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_ROLE_PERMISSIONS', 'EDIT', v_user_id);
    
    -- Asignación de Roles
    PERFORM associate_action('SEC_USER_ROLES', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_USER_ROLES', 'ASSIGN', v_user_id);
    PERFORM associate_action('SEC_USER_ROLES', 'UNASSIGN', v_user_id);
    
    -- Alcances de Usuario
    PERFORM associate_action('SEC_USER_SCOPES', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_USER_SCOPES', 'EDIT', v_user_id);
    
    -- Copiar Permisos
    PERFORM associate_action('SEC_COPY_PERMISSIONS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_COPY_PERMISSIONS', 'COPY_PERMISSIONS', v_user_id);
    
    -- Auditoría
    PERFORM associate_action('SEC_AUDIT', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_AUDIT', 'EXPORT', v_user_id);
    
    -- Sesiones Activas
    PERFORM associate_action('SEC_ACTIVE_SESSIONS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_ACTIVE_SESSIONS', 'DELETE', v_user_id);
    
    -- Políticas de Contraseña
    PERFORM associate_action('SEC_PASSWORD_POLICIES', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_PASSWORD_POLICIES', 'EDIT', v_user_id);

    -- Limpiar función auxiliar
    DROP FUNCTION IF EXISTS associate_action(VARCHAR, VARCHAR, UUID);

    RAISE NOTICE 'Screen_Actions: Todas las relaciones pantalla-acción creadas exitosamente';
END $$;


-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Contar acciones insertadas
SELECT COUNT(*) as total_acciones FROM public.actions;

-- Contar relaciones pantalla-acción
SELECT COUNT(*) as total_screen_actions FROM public.screen_actions;

-- Ver resumen por módulo
SELECT 
    s.module_name,
    COUNT(DISTINCT s.id) as pantallas,
    COUNT(sa.id) as total_acciones
FROM public.screens s
LEFT JOIN public.screen_actions sa ON s.id = sa.screen_id
GROUP BY s.module_name
ORDER BY s.module_name;

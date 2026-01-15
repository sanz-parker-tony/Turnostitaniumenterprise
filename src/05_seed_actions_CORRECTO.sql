-- =====================================================
-- SEED DE ACCIONES PARA LAS 55 PANTALLAS REALES
-- Basado en la estructura real de la BD
-- =====================================================

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Usuario sistema
BEGIN
    -- =====================================================
    -- PASO 1: Insertar acciones base si no existen
    -- =====================================================
    INSERT INTO public.actions (action_key, action_name, is_active, created_by)
    VALUES
        ('VIEW', 'Ver', true, v_user_id),
        ('CREATE', 'Crear', true, v_user_id),
        ('UPDATE', 'Actualizar', true, v_user_id),
        ('DELETE', 'Eliminar', true, v_user_id),
        ('EXPORT', 'Exportar', true, v_user_id),
        ('IMPORT', 'Importar', true, v_user_id),
        ('APPROVE', 'Aprobar', true, v_user_id),
        ('REJECT', 'Rechazar', true, v_user_id),
        ('COPY', 'Copiar', true, v_user_id),
        ('ACTIVATE', 'Activar', true, v_user_id),
        ('DEACTIVATE', 'Desactivar', true, v_user_id),
        ('ASSIGN', 'Asignar', true, v_user_id),
        ('UNASSIGN', 'Desasignar', true, v_user_id),
        ('PRINT', 'Imprimir', true, v_user_id),
        ('EXECUTE', 'Ejecutar', true, v_user_id),
        ('COPY_PERMISSIONS', 'Copiar Permisos', true, v_user_id)
    ON CONFLICT (action_key) DO NOTHING;

    RAISE NOTICE 'Acciones base insertadas/verificadas';
END $$;

-- =====================================================
-- PASO 2: Crear función auxiliar para asociar acciones
-- =====================================================

CREATE OR REPLACE FUNCTION associate_action(p_screen_key VARCHAR, p_action_key VARCHAR, p_user_id UUID)
RETURNS VOID AS $$
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
    ELSE
        IF v_scr_id IS NULL THEN
            RAISE WARNING 'Pantalla no encontrada: %', p_screen_key;
        END IF;
        IF v_act_id IS NULL THEN
            RAISE WARNING 'Acción no encontrada: %', p_action_key;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 3: Asociar acciones a las 55 pantallas reales
-- =====================================================

DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

    -- ============================================
    -- MÓDULO 1: DASHBOARD (3 pantallas)
    -- ============================================
    
    -- DASH_MAIN - Dashboard Principal
    PERFORM associate_action('DASH_MAIN', 'VIEW', v_user_id);
    PERFORM associate_action('DASH_MAIN', 'EXPORT', v_user_id);
    
    -- DASH_ALERTS - Alertas
    PERFORM associate_action('DASH_ALERTS', 'VIEW', v_user_id);
    PERFORM associate_action('DASH_ALERTS', 'UPDATE', v_user_id);
    
    -- DASH_TRENDS - Tendencias
    PERFORM associate_action('DASH_TRENDS', 'VIEW', v_user_id);
    PERFORM associate_action('DASH_TRENDS', 'EXPORT', v_user_id);

    -- ============================================
    -- MÓDULO 2: SEGURIDAD (12 pantallas)
    -- ============================================
    
    -- SEC_MENU_GROUPS - Grupos de Menú
    PERFORM associate_action('SEC_MENU_GROUPS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_MENU_GROUPS', 'CREATE', v_user_id);
    PERFORM associate_action('SEC_MENU_GROUPS', 'UPDATE', v_user_id);
    PERFORM associate_action('SEC_MENU_GROUPS', 'DELETE', v_user_id);
    
    -- SEC_SCREENS - Pantallas
    PERFORM associate_action('SEC_SCREENS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_SCREENS', 'CREATE', v_user_id);
    PERFORM associate_action('SEC_SCREENS', 'UPDATE', v_user_id);
    PERFORM associate_action('SEC_SCREENS', 'DELETE', v_user_id);
    
    -- SEC_ACTIONS - Acciones
    PERFORM associate_action('SEC_ACTIONS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_ACTIONS', 'CREATE', v_user_id);
    PERFORM associate_action('SEC_ACTIONS', 'UPDATE', v_user_id);
    PERFORM associate_action('SEC_ACTIONS', 'DELETE', v_user_id);
    
    -- SEC_SCREEN_ACTIONS - Pantalla-Acciones
    PERFORM associate_action('SEC_SCREEN_ACTIONS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_SCREEN_ACTIONS', 'ASSIGN', v_user_id);
    PERFORM associate_action('SEC_SCREEN_ACTIONS', 'UNASSIGN', v_user_id);
    
    -- SEC_ROLES - Roles
    PERFORM associate_action('SEC_ROLES', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_ROLES', 'CREATE', v_user_id);
    PERFORM associate_action('SEC_ROLES', 'UPDATE', v_user_id);
    PERFORM associate_action('SEC_ROLES', 'DELETE', v_user_id);
    
    -- SEC_ROLE_PERMS - Permisos por Rol
    PERFORM associate_action('SEC_ROLE_PERMS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_ROLE_PERMS', 'UPDATE', v_user_id);
    
    -- SEC_USER_ROLES - Asignación de Roles
    PERFORM associate_action('SEC_USER_ROLES', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_USER_ROLES', 'ASSIGN', v_user_id);
    PERFORM associate_action('SEC_USER_ROLES', 'UNASSIGN', v_user_id);
    
    -- SEC_SCOPES - Scopes
    PERFORM associate_action('SEC_SCOPES', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_SCOPES', 'CREATE', v_user_id);
    PERFORM associate_action('SEC_SCOPES', 'UPDATE', v_user_id);
    PERFORM associate_action('SEC_SCOPES', 'DELETE', v_user_id);
    
    -- SEC_COPY_PERMS - Copiar Permisos
    PERFORM associate_action('SEC_COPY_PERMS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_COPY_PERMS', 'COPY_PERMISSIONS', v_user_id);
    
    -- SEC_AUDIT - Auditoría
    PERFORM associate_action('SEC_AUDIT', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_AUDIT', 'EXPORT', v_user_id);
    
    -- SEC_TENANT_MEMBERS - Miembros del Tenant
    PERFORM associate_action('SEC_TENANT_MEMBERS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_TENANT_MEMBERS', 'CREATE', v_user_id);
    PERFORM associate_action('SEC_TENANT_MEMBERS', 'UPDATE', v_user_id);
    PERFORM associate_action('SEC_TENANT_MEMBERS', 'DELETE', v_user_id);
    
    -- SEC_LOGIN_SESSIONS - Sesiones
    PERFORM associate_action('SEC_LOGIN_SESSIONS', 'VIEW', v_user_id);
    PERFORM associate_action('SEC_LOGIN_SESSIONS', 'DELETE', v_user_id);

    -- ============================================
    -- MÓDULO 3: MANTENIMIENTO (6 pantallas)
    -- ============================================
    
    -- MANT_CATALOGS - Catálogos
    PERFORM associate_action('MANT_CATALOGS', 'VIEW', v_user_id);
    PERFORM associate_action('MANT_CATALOGS', 'CREATE', v_user_id);
    PERFORM associate_action('MANT_CATALOGS', 'UPDATE', v_user_id);
    PERFORM associate_action('MANT_CATALOGS', 'DELETE', v_user_id);
    
    -- MANT_HOLIDAYS - Feriados
    PERFORM associate_action('MANT_HOLIDAYS', 'VIEW', v_user_id);
    PERFORM associate_action('MANT_HOLIDAYS', 'CREATE', v_user_id);
    PERFORM associate_action('MANT_HOLIDAYS', 'UPDATE', v_user_id);
    PERFORM associate_action('MANT_HOLIDAYS', 'DELETE', v_user_id);
    PERFORM associate_action('MANT_HOLIDAYS', 'IMPORT', v_user_id);
    
    -- MANT_ATT_MOVEMENTS - Movimientos
    PERFORM associate_action('MANT_ATT_MOVEMENTS', 'VIEW', v_user_id);
    PERFORM associate_action('MANT_ATT_MOVEMENTS', 'CREATE', v_user_id);
    PERFORM associate_action('MANT_ATT_MOVEMENTS', 'UPDATE', v_user_id);
    PERFORM associate_action('MANT_ATT_MOVEMENTS', 'DELETE', v_user_id);
    
    -- MANT_ATT_EVENTS - Eventos de Asistencia
    PERFORM associate_action('MANT_ATT_EVENTS', 'VIEW', v_user_id);
    PERFORM associate_action('MANT_ATT_EVENTS', 'CREATE', v_user_id);
    PERFORM associate_action('MANT_ATT_EVENTS', 'UPDATE', v_user_id);
    PERFORM associate_action('MANT_ATT_EVENTS', 'DELETE', v_user_id);
    
    -- MANT_JUSTIFICATIONS - Motivos de Justificación
    PERFORM associate_action('MANT_JUSTIFICATIONS', 'VIEW', v_user_id);
    PERFORM associate_action('MANT_JUSTIFICATIONS', 'CREATE', v_user_id);
    PERFORM associate_action('MANT_JUSTIFICATIONS', 'UPDATE', v_user_id);
    PERFORM associate_action('MANT_JUSTIFICATIONS', 'DELETE', v_user_id);
    
    -- MANT_MESSAGES - Mensajes del Sistema
    PERFORM associate_action('MANT_MESSAGES', 'VIEW', v_user_id);
    PERFORM associate_action('MANT_MESSAGES', 'CREATE', v_user_id);
    PERFORM associate_action('MANT_MESSAGES', 'UPDATE', v_user_id);
    PERFORM associate_action('MANT_MESSAGES', 'DELETE', v_user_id);

    -- ============================================
    -- MÓDULO 4: CONFIGURACIÓN (7 pantallas)
    -- ============================================
    
    -- CONF_PARAMS - Parámetros Generales
    PERFORM associate_action('CONF_PARAMS', 'VIEW', v_user_id);
    PERFORM associate_action('CONF_PARAMS', 'UPDATE', v_user_id);
    
    -- CONF_SHIFTS - Turnos
    PERFORM associate_action('CONF_SHIFTS', 'VIEW', v_user_id);
    PERFORM associate_action('CONF_SHIFTS', 'CREATE', v_user_id);
    PERFORM associate_action('CONF_SHIFTS', 'UPDATE', v_user_id);
    PERFORM associate_action('CONF_SHIFTS', 'DELETE', v_user_id);
    PERFORM associate_action('CONF_SHIFTS', 'COPY', v_user_id);
    
    -- CONF_WORK_PATTERNS - Patrones de Trabajo
    PERFORM associate_action('CONF_WORK_PATTERNS', 'VIEW', v_user_id);
    PERFORM associate_action('CONF_WORK_PATTERNS', 'CREATE', v_user_id);
    PERFORM associate_action('CONF_WORK_PATTERNS', 'UPDATE', v_user_id);
    PERFORM associate_action('CONF_WORK_PATTERNS', 'DELETE', v_user_id);
    
    -- CONF_SURCHARGES - Reglas de Recargo
    PERFORM associate_action('CONF_SURCHARGES', 'VIEW', v_user_id);
    PERFORM associate_action('CONF_SURCHARGES', 'CREATE', v_user_id);
    PERFORM associate_action('CONF_SURCHARGES', 'UPDATE', v_user_id);
    PERFORM associate_action('CONF_SURCHARGES', 'DELETE', v_user_id);
    
    -- CONF_DEVICES - Dispositivos
    PERFORM associate_action('CONF_DEVICES', 'VIEW', v_user_id);
    PERFORM associate_action('CONF_DEVICES', 'CREATE', v_user_id);
    PERFORM associate_action('CONF_DEVICES', 'UPDATE', v_user_id);
    PERFORM associate_action('CONF_DEVICES', 'DELETE', v_user_id);
    
    -- CONF_ATT_PROCESS - Procesos de Asistencia
    PERFORM associate_action('CONF_ATT_PROCESS', 'VIEW', v_user_id);
    PERFORM associate_action('CONF_ATT_PROCESS', 'UPDATE', v_user_id);
    
    -- CONF_TENANT_SETTINGS - Ajustes del Tenant
    PERFORM associate_action('CONF_TENANT_SETTINGS', 'VIEW', v_user_id);
    PERFORM associate_action('CONF_TENANT_SETTINGS', 'UPDATE', v_user_id);

    -- ============================================
    -- MÓDULO 5: ORGANIZACIÓN (8 pantallas)
    -- ============================================
    
    -- ORG_COMPANIES - Empresas
    PERFORM associate_action('ORG_COMPANIES', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_COMPANIES', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_COMPANIES', 'UPDATE', v_user_id);
    PERFORM associate_action('ORG_COMPANIES', 'DELETE', v_user_id);
    
    -- ORG_WORK_LOCATIONS - Localidades
    PERFORM associate_action('ORG_WORK_LOCATIONS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_WORK_LOCATIONS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_WORK_LOCATIONS', 'UPDATE', v_user_id);
    PERFORM associate_action('ORG_WORK_LOCATIONS', 'DELETE', v_user_id);
    
    -- ORG_DEPARTMENTS - Departamentos
    PERFORM associate_action('ORG_DEPARTMENTS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_DEPARTMENTS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_DEPARTMENTS', 'UPDATE', v_user_id);
    PERFORM associate_action('ORG_DEPARTMENTS', 'DELETE', v_user_id);
    
    -- ORG_AREAS - Áreas
    PERFORM associate_action('ORG_AREAS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_AREAS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_AREAS', 'UPDATE', v_user_id);
    PERFORM associate_action('ORG_AREAS', 'DELETE', v_user_id);
    
    -- ORG_WORK_GROUPS - Grupos de Trabajo
    PERFORM associate_action('ORG_WORK_GROUPS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_WORK_GROUPS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_WORK_GROUPS', 'UPDATE', v_user_id);
    PERFORM associate_action('ORG_WORK_GROUPS', 'DELETE', v_user_id);
    
    -- ORG_PAYROLL_GROUPS - Grupos de Rol de Pago
    PERFORM associate_action('ORG_PAYROLL_GROUPS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_PAYROLL_GROUPS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_PAYROLL_GROUPS', 'UPDATE', v_user_id);
    PERFORM associate_action('ORG_PAYROLL_GROUPS', 'DELETE', v_user_id);
    
    -- ORG_JOB_TITLES - Cargos
    PERFORM associate_action('ORG_JOB_TITLES', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_JOB_TITLES', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_JOB_TITLES', 'UPDATE', v_user_id);
    PERFORM associate_action('ORG_JOB_TITLES', 'DELETE', v_user_id);
    
    -- ORG_COST_CENTERS - Centros de Costo
    PERFORM associate_action('ORG_COST_CENTERS', 'VIEW', v_user_id);
    PERFORM associate_action('ORG_COST_CENTERS', 'CREATE', v_user_id);
    PERFORM associate_action('ORG_COST_CENTERS', 'UPDATE', v_user_id);
    PERFORM associate_action('ORG_COST_CENTERS', 'DELETE', v_user_id);

    -- ============================================
    -- MÓDULO 6: EMPLEADOS (6 pantallas)
    -- ============================================
    
    -- EMPL_LIST - Empleados
    PERFORM associate_action('EMPL_LIST', 'VIEW', v_user_id);
    PERFORM associate_action('EMPL_LIST', 'CREATE', v_user_id);
    PERFORM associate_action('EMPL_LIST', 'UPDATE', v_user_id);
    PERFORM associate_action('EMPL_LIST', 'DELETE', v_user_id);
    PERFORM associate_action('EMPL_LIST', 'EXPORT', v_user_id);
    PERFORM associate_action('EMPL_LIST', 'IMPORT', v_user_id);
    
    -- EMPL_ASSIGN_COMPANY - Asignación a Empresa
    PERFORM associate_action('EMPL_ASSIGN_COMPANY', 'VIEW', v_user_id);
    PERFORM associate_action('EMPL_ASSIGN_COMPANY', 'ASSIGN', v_user_id);
    PERFORM associate_action('EMPL_ASSIGN_COMPANY', 'UNASSIGN', v_user_id);
    
    -- EMPL_PROFILES - Perfiles de Empleado
    PERFORM associate_action('EMPL_PROFILES', 'VIEW', v_user_id);
    PERFORM associate_action('EMPL_PROFILES', 'CREATE', v_user_id);
    PERFORM associate_action('EMPL_PROFILES', 'UPDATE', v_user_id);
    PERFORM associate_action('EMPL_PROFILES', 'DELETE', v_user_id);
    
    -- EMPL_PROFILE_SETTINGS - Ajustes por Perfil
    PERFORM associate_action('EMPL_PROFILE_SETTINGS', 'VIEW', v_user_id);
    PERFORM associate_action('EMPL_PROFILE_SETTINGS', 'UPDATE', v_user_id);
    
    -- EMPL_ABSENCE_REQUESTS - Solicitudes de Ausencia
    PERFORM associate_action('EMPL_ABSENCE_REQUESTS', 'VIEW', v_user_id);
    PERFORM associate_action('EMPL_ABSENCE_REQUESTS', 'CREATE', v_user_id);
    PERFORM associate_action('EMPL_ABSENCE_REQUESTS', 'UPDATE', v_user_id);
    PERFORM associate_action('EMPL_ABSENCE_REQUESTS', 'DELETE', v_user_id);
    PERFORM associate_action('EMPL_ABSENCE_REQUESTS', 'APPROVE', v_user_id);
    PERFORM associate_action('EMPL_ABSENCE_REQUESTS', 'REJECT', v_user_id);
    
    -- EMPL_DOCUMENTS - Documentos
    PERFORM associate_action('EMPL_DOCUMENTS', 'VIEW', v_user_id);
    PERFORM associate_action('EMPL_DOCUMENTS', 'CREATE', v_user_id);
    PERFORM associate_action('EMPL_DOCUMENTS', 'DELETE', v_user_id);

    -- ============================================
    -- MÓDULO 7: ASISTENCIA (6 pantallas)
    -- ============================================
    
    -- ATT_TIME_PUNCHES - Marcaciones
    PERFORM associate_action('ATT_TIME_PUNCHES', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_TIME_PUNCHES', 'CREATE', v_user_id);
    PERFORM associate_action('ATT_TIME_PUNCHES', 'UPDATE', v_user_id);
    PERFORM associate_action('ATT_TIME_PUNCHES', 'DELETE', v_user_id);
    PERFORM associate_action('ATT_TIME_PUNCHES', 'EXPORT', v_user_id);
    
    -- ATT_SHIFT_PLANS - Planificación de Turnos
    PERFORM associate_action('ATT_SHIFT_PLANS', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_SHIFT_PLANS', 'CREATE', v_user_id);
    PERFORM associate_action('ATT_SHIFT_PLANS', 'UPDATE', v_user_id);
    PERFORM associate_action('ATT_SHIFT_PLANS', 'DELETE', v_user_id);
    PERFORM associate_action('ATT_SHIFT_PLANS', 'IMPORT', v_user_id);
    
    -- ATT_PROCESS_RUNS - Ejecuciones de Proceso
    PERFORM associate_action('ATT_PROCESS_RUNS', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_PROCESS_RUNS', 'EXECUTE', v_user_id);
    PERFORM associate_action('ATT_PROCESS_RUNS', 'EXPORT', v_user_id);
    
    -- ATT_CALC_RESULTS - Resultados de Cálculo
    PERFORM associate_action('ATT_CALC_RESULTS', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_CALC_RESULTS', 'UPDATE', v_user_id);
    PERFORM associate_action('ATT_CALC_RESULTS', 'EXPORT', v_user_id);
    
    -- ATT_APPROVALS - Aprobaciones
    PERFORM associate_action('ATT_APPROVALS', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_APPROVALS', 'APPROVE', v_user_id);
    PERFORM associate_action('ATT_APPROVALS', 'REJECT', v_user_id);
    
    -- ATT_ANOMALIES - Anomalías
    PERFORM associate_action('ATT_ANOMALIES', 'VIEW', v_user_id);
    PERFORM associate_action('ATT_ANOMALIES', 'UPDATE', v_user_id);
    PERFORM associate_action('ATT_ANOMALIES', 'EXPORT', v_user_id);

    -- ============================================
    -- MÓDULO 8: REPORTES (4 pantallas)
    -- ============================================
    
    -- RPT_CATALOG - Catálogo de Reportes
    PERFORM associate_action('RPT_CATALOG', 'VIEW', v_user_id);
    PERFORM associate_action('RPT_CATALOG', 'CREATE', v_user_id);
    PERFORM associate_action('RPT_CATALOG', 'UPDATE', v_user_id);
    PERFORM associate_action('RPT_CATALOG', 'DELETE', v_user_id);
    
    -- RPT_PARAMETERS - Parámetros de Reportes
    PERFORM associate_action('RPT_PARAMETERS', 'VIEW', v_user_id);
    PERFORM associate_action('RPT_PARAMETERS', 'UPDATE', v_user_id);
    
    -- RPT_PERMISSIONS - Permisos de Reportes
    PERFORM associate_action('RPT_PERMISSIONS', 'VIEW', v_user_id);
    PERFORM associate_action('RPT_PERMISSIONS', 'ASSIGN', v_user_id);
    PERFORM associate_action('RPT_PERMISSIONS', 'UNASSIGN', v_user_id);
    
    -- RPT_EXECUTIONS - Ejecuciones
    PERFORM associate_action('RPT_EXECUTIONS', 'VIEW', v_user_id);
    PERFORM associate_action('RPT_EXECUTIONS', 'EXECUTE', v_user_id);
    PERFORM associate_action('RPT_EXECUTIONS', 'EXPORT', v_user_id);

    -- ============================================
    -- MÓDULO 9: SUSCRIPCIÓN (3 pantallas)
    -- ============================================
    
    -- SUB_PLANS - Planes
    PERFORM associate_action('SUB_PLANS', 'VIEW', v_user_id);
    PERFORM associate_action('SUB_PLANS', 'CREATE', v_user_id);
    PERFORM associate_action('SUB_PLANS', 'UPDATE', v_user_id);
    PERFORM associate_action('SUB_PLANS', 'DELETE', v_user_id);
    
    -- SUB_TENANT_SUBS - Suscripción del Tenant
    PERFORM associate_action('SUB_TENANT_SUBS', 'VIEW', v_user_id);
    PERFORM associate_action('SUB_TENANT_SUBS', 'UPDATE', v_user_id);
    
    -- SUB_TRANSACTIONS - Transacciones
    PERFORM associate_action('SUB_TRANSACTIONS', 'VIEW', v_user_id);
    PERFORM associate_action('SUB_TRANSACTIONS', 'EXPORT', v_user_id);

    RAISE NOTICE 'Screen_Actions: Todas las relaciones creadas exitosamente';
END $$;

-- Limpiar función auxiliar
DROP FUNCTION IF EXISTS associate_action(VARCHAR, VARCHAR, UUID);

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Contar acciones insertadas
SELECT COUNT(*) as total_acciones FROM public.actions;

-- Contar relaciones pantalla-acción
SELECT COUNT(*) as total_screen_actions FROM public.screen_actions;

-- Ver resumen por módulo (usando menu_group_id)
SELECT 
    smg.menu_group_key,
    smg.menu_group_name,
    COUNT(DISTINCT s.id) as pantallas,
    COUNT(sa.id) as acciones_asignadas
FROM public.system_menu_groups smg
LEFT JOIN public.screens s ON s.menu_group_id = smg.id
LEFT JOIN public.screen_actions sa ON s.id = sa.screen_id
GROUP BY smg.menu_group_key, smg.menu_group_name, smg.sort_order
ORDER BY smg.sort_order;

-- Ver detalle de pantallas con sus acciones
SELECT 
    smg.menu_group_name as modulo,
    s.screen_name as pantalla,
    a.action_name as accion,
    sa.is_active
FROM public.system_menu_groups smg
JOIN public.screens s ON s.menu_group_id = smg.id
JOIN public.screen_actions sa ON s.id = sa.screen_id
JOIN public.actions a ON sa.action_id = a.id
WHERE s.is_active = true AND sa.is_active = true
ORDER BY smg.sort_order, s.sort_order, a.action_name;

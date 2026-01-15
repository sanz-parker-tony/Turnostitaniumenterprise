-- ============================================
-- 🎯 INSERTAR SCREEN_ACTIONS (Acciones por Pantalla)
-- ============================================
-- Sistema: Turnos Titanium
-- Descripción: Crea las acciones/botones disponibles en cada pantalla
-- ============================================

INSERT INTO public.screen_actions (screen_key, action_code, action_name, description, sort_order, is_active, created_by)
VALUES
  -- ========== DASHBOARD ==========
  ('DASH_MAIN', 'VIEW', 'Ver', 'Ver dashboard principal', 10, true, 'SYSTEM'),
  ('DASH_MAIN', 'EXPORT', 'Exportar', 'Exportar datos del dashboard', 20, true, 'SYSTEM'),
  ('DASH_MAIN', 'REFRESH', 'Refrescar', 'Refrescar métricas', 30, true, 'SYSTEM'),
  
  ('DASH_ALERTS', 'VIEW', 'Ver', 'Ver alertas', 10, true, 'SYSTEM'),
  ('DASH_ALERTS', 'DISMISS', 'Descartar', 'Descartar alerta', 20, true, 'SYSTEM'),
  ('DASH_ALERTS', 'RESOLVE', 'Resolver', 'Marcar como resuelta', 30, true, 'SYSTEM'),
  
  ('DASH_TRENDS', 'VIEW', 'Ver', 'Ver tendencias', 10, true, 'SYSTEM'),
  ('DASH_TRENDS', 'EXPORT', 'Exportar', 'Exportar tendencias', 20, true, 'SYSTEM'),
  
  -- ========== SECURITY ==========
  ('SEC_MENU_GROUPS', 'VIEW', 'Ver', 'Ver grupos de menú', 10, true, 'SYSTEM'),
  ('SEC_MENU_GROUPS', 'CREATE', 'Crear', 'Crear grupo de menú', 20, true, 'SYSTEM'),
  ('SEC_MENU_GROUPS', 'EDIT', 'Editar', 'Editar grupo de menú', 30, true, 'SYSTEM'),
  ('SEC_MENU_GROUPS', 'DELETE', 'Eliminar', 'Eliminar grupo de menú', 40, true, 'SYSTEM'),
  
  ('SEC_SCREENS', 'VIEW', 'Ver', 'Ver pantallas', 10, true, 'SYSTEM'),
  ('SEC_SCREENS', 'CREATE', 'Crear', 'Crear pantalla', 20, true, 'SYSTEM'),
  ('SEC_SCREENS', 'EDIT', 'Editar', 'Editar pantalla', 30, true, 'SYSTEM'),
  ('SEC_SCREENS', 'DELETE', 'Eliminar', 'Eliminar pantalla', 40, true, 'SYSTEM'),
  
  ('SEC_ACTIONS', 'VIEW', 'Ver', 'Ver acciones', 10, true, 'SYSTEM'),
  ('SEC_ACTIONS', 'CREATE', 'Crear', 'Crear acción', 20, true, 'SYSTEM'),
  ('SEC_ACTIONS', 'EDIT', 'Editar', 'Editar acción', 30, true, 'SYSTEM'),
  ('SEC_ACTIONS', 'DELETE', 'Eliminar', 'Eliminar acción', 40, true, 'SYSTEM'),
  
  ('SEC_SCREEN_ACTIONS', 'VIEW', 'Ver', 'Ver acciones de pantalla', 10, true, 'SYSTEM'),
  ('SEC_SCREEN_ACTIONS', 'ASSIGN', 'Asignar', 'Asignar acción a pantalla', 20, true, 'SYSTEM'),
  ('SEC_SCREEN_ACTIONS', 'REMOVE', 'Remover', 'Remover acción de pantalla', 30, true, 'SYSTEM'),
  
  ('SEC_ROLES', 'VIEW', 'Ver', 'Ver roles', 10, true, 'SYSTEM'),
  ('SEC_ROLES', 'CREATE', 'Crear', 'Crear rol', 20, true, 'SYSTEM'),
  ('SEC_ROLES', 'EDIT', 'Editar', 'Editar rol', 30, true, 'SYSTEM'),
  ('SEC_ROLES', 'DELETE', 'Eliminar', 'Eliminar rol', 40, true, 'SYSTEM'),
  
  ('SEC_ROLE_PERMS', 'VIEW', 'Ver', 'Ver permisos de rol', 10, true, 'SYSTEM'),
  ('SEC_ROLE_PERMS', 'ASSIGN', 'Asignar', 'Asignar permiso', 20, true, 'SYSTEM'),
  ('SEC_ROLE_PERMS', 'REMOVE', 'Remover', 'Remover permiso', 30, true, 'SYSTEM'),
  ('SEC_ROLE_PERMS', 'BULK_ASSIGN', 'Asignación masiva', 'Asignar múltiples permisos', 40, true, 'SYSTEM'),
  
  ('SEC_USER_ROLES', 'VIEW', 'Ver', 'Ver asignaciones de roles', 10, true, 'SYSTEM'),
  ('SEC_USER_ROLES', 'ASSIGN', 'Asignar', 'Asignar rol a usuario', 20, true, 'SYSTEM'),
  ('SEC_USER_ROLES', 'REMOVE', 'Remover', 'Remover rol de usuario', 30, true, 'SYSTEM'),
  
  ('SEC_SCOPES', 'VIEW', 'Ver', 'Ver scopes', 10, true, 'SYSTEM'),
  ('SEC_SCOPES', 'ASSIGN', 'Asignar', 'Asignar scope', 20, true, 'SYSTEM'),
  ('SEC_SCOPES', 'REMOVE', 'Remover', 'Remover scope', 30, true, 'SYSTEM'),
  
  ('SEC_COPY_PERMS', 'VIEW', 'Ver', 'Ver pantalla copiar permisos', 10, true, 'SYSTEM'),
  ('SEC_COPY_PERMS', 'COPY', 'Copiar', 'Copiar permisos entre roles', 20, true, 'SYSTEM'),
  
  ('SEC_AUDIT', 'VIEW', 'Ver', 'Ver auditoría', 10, true, 'SYSTEM'),
  ('SEC_AUDIT', 'EXPORT', 'Exportar', 'Exportar log de auditoría', 20, true, 'SYSTEM'),
  ('SEC_AUDIT', 'FILTER', 'Filtrar', 'Filtrar eventos', 30, true, 'SYSTEM'),
  
  ('SEC_TENANT_MEMBERS', 'VIEW', 'Ver', 'Ver miembros del tenant', 10, true, 'SYSTEM'),
  ('SEC_TENANT_MEMBERS', 'INVITE', 'Invitar', 'Invitar nuevo miembro', 20, true, 'SYSTEM'),
  ('SEC_TENANT_MEMBERS', 'REMOVE', 'Remover', 'Remover miembro', 30, true, 'SYSTEM'),
  
  ('SEC_LOGIN_SESSIONS', 'VIEW', 'Ver', 'Ver sesiones', 10, true, 'SYSTEM'),
  ('SEC_LOGIN_SESSIONS', 'REVOKE', 'Revocar', 'Revocar sesión', 20, true, 'SYSTEM'),
  
  -- ========== MANTENIMIENTO ==========
  ('MANT_CATALOGS', 'VIEW', 'Ver', 'Ver catálogos', 10, true, 'SYSTEM'),
  ('MANT_CATALOGS', 'CREATE', 'Crear', 'Crear catálogo', 20, true, 'SYSTEM'),
  ('MANT_CATALOGS', 'EDIT', 'Editar', 'Editar catálogo', 30, true, 'SYSTEM'),
  ('MANT_CATALOGS', 'DELETE', 'Eliminar', 'Eliminar catálogo', 40, true, 'SYSTEM'),
  
  ('MANT_HOLIDAYS', 'VIEW', 'Ver', 'Ver feriados', 10, true, 'SYSTEM'),
  ('MANT_HOLIDAYS', 'CREATE', 'Crear', 'Crear feriado', 20, true, 'SYSTEM'),
  ('MANT_HOLIDAYS', 'EDIT', 'Editar', 'Editar feriado', 30, true, 'SYSTEM'),
  ('MANT_HOLIDAYS', 'DELETE', 'Eliminar', 'Eliminar feriado', 40, true, 'SYSTEM'),
  ('MANT_HOLIDAYS', 'IMPORT', 'Importar', 'Importar feriados', 50, true, 'SYSTEM'),
  
  ('MANT_ATT_MOVEMENTS', 'VIEW', 'Ver', 'Ver movimientos', 10, true, 'SYSTEM'),
  ('MANT_ATT_MOVEMENTS', 'CREATE', 'Crear', 'Crear movimiento', 20, true, 'SYSTEM'),
  ('MANT_ATT_MOVEMENTS', 'EDIT', 'Editar', 'Editar movimiento', 30, true, 'SYSTEM'),
  ('MANT_ATT_MOVEMENTS', 'DELETE', 'Eliminar', 'Eliminar movimiento', 40, true, 'SYSTEM'),
  
  ('MANT_ATT_EVENTS', 'VIEW', 'Ver', 'Ver eventos de asistencia', 10, true, 'SYSTEM'),
  ('MANT_ATT_EVENTS', 'CREATE', 'Crear', 'Crear evento', 20, true, 'SYSTEM'),
  ('MANT_ATT_EVENTS', 'EDIT', 'Editar', 'Editar evento', 30, true, 'SYSTEM'),
  ('MANT_ATT_EVENTS', 'DELETE', 'Eliminar', 'Eliminar evento', 40, true, 'SYSTEM'),
  
  ('MANT_JUSTIFICATIONS', 'VIEW', 'Ver', 'Ver justificaciones', 10, true, 'SYSTEM'),
  ('MANT_JUSTIFICATIONS', 'CREATE', 'Crear', 'Crear justificación', 20, true, 'SYSTEM'),
  ('MANT_JUSTIFICATIONS', 'EDIT', 'Editar', 'Editar justificación', 30, true, 'SYSTEM'),
  ('MANT_JUSTIFICATIONS', 'DELETE', 'Eliminar', 'Eliminar justificación', 40, true, 'SYSTEM'),
  
  ('MANT_MESSAGES', 'VIEW', 'Ver', 'Ver mensajes del sistema', 10, true, 'SYSTEM'),
  ('MANT_MESSAGES', 'CREATE', 'Crear', 'Crear mensaje', 20, true, 'SYSTEM'),
  ('MANT_MESSAGES', 'EDIT', 'Editar', 'Editar mensaje', 30, true, 'SYSTEM'),
  ('MANT_MESSAGES', 'DELETE', 'Eliminar', 'Eliminar mensaje', 40, true, 'SYSTEM'),
  
  -- ========== CONFIGURACIÓN ==========
  ('CONF_PARAMS', 'VIEW', 'Ver', 'Ver parámetros', 10, true, 'SYSTEM'),
  ('CONF_PARAMS', 'EDIT', 'Editar', 'Editar parámetros', 20, true, 'SYSTEM'),
  ('CONF_PARAMS', 'RESET', 'Restablecer', 'Restablecer a defaults', 30, true, 'SYSTEM'),
  
  ('CONF_SHIFTS', 'VIEW', 'Ver', 'Ver turnos', 10, true, 'SYSTEM'),
  ('CONF_SHIFTS', 'CREATE', 'Crear', 'Crear turno', 20, true, 'SYSTEM'),
  ('CONF_SHIFTS', 'EDIT', 'Editar', 'Editar turno', 30, true, 'SYSTEM'),
  ('CONF_SHIFTS', 'DELETE', 'Eliminar', 'Eliminar turno', 40, true, 'SYSTEM'),
  ('CONF_SHIFTS', 'DUPLICATE', 'Duplicar', 'Duplicar turno', 50, true, 'SYSTEM'),
  
  ('CONF_WORK_PATTERNS', 'VIEW', 'Ver', 'Ver patrones de trabajo', 10, true, 'SYSTEM'),
  ('CONF_WORK_PATTERNS', 'CREATE', 'Crear', 'Crear patrón', 20, true, 'SYSTEM'),
  ('CONF_WORK_PATTERNS', 'EDIT', 'Editar', 'Editar patrón', 30, true, 'SYSTEM'),
  ('CONF_WORK_PATTERNS', 'DELETE', 'Eliminar', 'Eliminar patrón', 40, true, 'SYSTEM'),
  
  ('CONF_SURCHARGES', 'VIEW', 'Ver', 'Ver reglas de recargo', 10, true, 'SYSTEM'),
  ('CONF_SURCHARGES', 'CREATE', 'Crear', 'Crear regla', 20, true, 'SYSTEM'),
  ('CONF_SURCHARGES', 'EDIT', 'Editar', 'Editar regla', 30, true, 'SYSTEM'),
  ('CONF_SURCHARGES', 'DELETE', 'Eliminar', 'Eliminar regla', 40, true, 'SYSTEM'),
  
  ('CONF_DEVICES', 'VIEW', 'Ver', 'Ver dispositivos', 10, true, 'SYSTEM'),
  ('CONF_DEVICES', 'CREATE', 'Crear', 'Crear dispositivo', 20, true, 'SYSTEM'),
  ('CONF_DEVICES', 'EDIT', 'Editar', 'Editar dispositivo', 30, true, 'SYSTEM'),
  ('CONF_DEVICES', 'DELETE', 'Eliminar', 'Eliminar dispositivo', 40, true, 'SYSTEM'),
  ('CONF_DEVICES', 'SYNC', 'Sincronizar', 'Sincronizar dispositivo', 50, true, 'SYSTEM'),
  
  ('CONF_ATT_PROCESS', 'VIEW', 'Ver', 'Ver procesos de asistencia', 10, true, 'SYSTEM'),
  ('CONF_ATT_PROCESS', 'CREATE', 'Crear', 'Crear proceso', 20, true, 'SYSTEM'),
  ('CONF_ATT_PROCESS', 'EDIT', 'Editar', 'Editar proceso', 30, true, 'SYSTEM'),
  ('CONF_ATT_PROCESS', 'DELETE', 'Eliminar', 'Eliminar proceso', 40, true, 'SYSTEM'),
  ('CONF_ATT_PROCESS', 'EXECUTE', 'Ejecutar', 'Ejecutar proceso', 50, true, 'SYSTEM'),
  
  ('CONF_TENANT_SETTINGS', 'VIEW', 'Ver', 'Ver ajustes del tenant', 10, true, 'SYSTEM'),
  ('CONF_TENANT_SETTINGS', 'EDIT', 'Editar', 'Editar ajustes', 20, true, 'SYSTEM'),
  
  -- ========== ORGANIZACIÓN ==========
  ('ORG_COMPANIES', 'VIEW', 'Ver', 'Ver empresas', 10, true, 'SYSTEM'),
  ('ORG_COMPANIES', 'CREATE', 'Crear', 'Crear empresa', 20, true, 'SYSTEM'),
  ('ORG_COMPANIES', 'EDIT', 'Editar', 'Editar empresa', 30, true, 'SYSTEM'),
  ('ORG_COMPANIES', 'DELETE', 'Eliminar', 'Eliminar empresa', 40, true, 'SYSTEM'),
  
  ('ORG_WORK_LOCATIONS', 'VIEW', 'Ver', 'Ver localidades', 10, true, 'SYSTEM'),
  ('ORG_WORK_LOCATIONS', 'CREATE', 'Crear', 'Crear localidad', 20, true, 'SYSTEM'),
  ('ORG_WORK_LOCATIONS', 'EDIT', 'Editar', 'Editar localidad', 30, true, 'SYSTEM'),
  ('ORG_WORK_LOCATIONS', 'DELETE', 'Eliminar', 'Eliminar localidad', 40, true, 'SYSTEM'),
  
  ('ORG_DEPARTMENTS', 'VIEW', 'Ver', 'Ver departamentos', 10, true, 'SYSTEM'),
  ('ORG_DEPARTMENTS', 'CREATE', 'Crear', 'Crear departamento', 20, true, 'SYSTEM'),
  ('ORG_DEPARTMENTS', 'EDIT', 'Editar', 'Editar departamento', 30, true, 'SYSTEM'),
  ('ORG_DEPARTMENTS', 'DELETE', 'Eliminar', 'Eliminar departamento', 40, true, 'SYSTEM'),
  
  ('ORG_AREAS', 'VIEW', 'Ver', 'Ver áreas', 10, true, 'SYSTEM'),
  ('ORG_AREAS', 'CREATE', 'Crear', 'Crear área', 20, true, 'SYSTEM'),
  ('ORG_AREAS', 'EDIT', 'Editar', 'Editar área', 30, true, 'SYSTEM'),
  ('ORG_AREAS', 'DELETE', 'Eliminar', 'Eliminar área', 40, true, 'SYSTEM'),
  
  ('ORG_WORK_GROUPS', 'VIEW', 'Ver', 'Ver grupos de trabajo', 10, true, 'SYSTEM'),
  ('ORG_WORK_GROUPS', 'CREATE', 'Crear', 'Crear grupo', 20, true, 'SYSTEM'),
  ('ORG_WORK_GROUPS', 'EDIT', 'Editar', 'Editar grupo', 30, true, 'SYSTEM'),
  ('ORG_WORK_GROUPS', 'DELETE', 'Eliminar', 'Eliminar grupo', 40, true, 'SYSTEM'),
  
  ('ORG_PAYROLL_GROUPS', 'VIEW', 'Ver', 'Ver grupos de rol de pago', 10, true, 'SYSTEM'),
  ('ORG_PAYROLL_GROUPS', 'CREATE', 'Crear', 'Crear grupo', 20, true, 'SYSTEM'),
  ('ORG_PAYROLL_GROUPS', 'EDIT', 'Editar', 'Editar grupo', 30, true, 'SYSTEM'),
  ('ORG_PAYROLL_GROUPS', 'DELETE', 'Eliminar', 'Eliminar grupo', 40, true, 'SYSTEM'),
  
  ('ORG_JOB_TITLES', 'VIEW', 'Ver', 'Ver cargos', 10, true, 'SYSTEM'),
  ('ORG_JOB_TITLES', 'CREATE', 'Crear', 'Crear cargo', 20, true, 'SYSTEM'),
  ('ORG_JOB_TITLES', 'EDIT', 'Editar', 'Editar cargo', 30, true, 'SYSTEM'),
  ('ORG_JOB_TITLES', 'DELETE', 'Eliminar', 'Eliminar cargo', 40, true, 'SYSTEM'),
  
  ('ORG_COST_CENTERS', 'VIEW', 'Ver', 'Ver centros de costo', 10, true, 'SYSTEM'),
  ('ORG_COST_CENTERS', 'CREATE', 'Crear', 'Crear centro de costo', 20, true, 'SYSTEM'),
  ('ORG_COST_CENTERS', 'EDIT', 'Editar', 'Editar centro de costo', 30, true, 'SYSTEM'),
  ('ORG_COST_CENTERS', 'DELETE', 'Eliminar', 'Eliminar centro de costo', 40, true, 'SYSTEM'),
  
  -- ========== EMPLEADOS ==========
  ('EMPL_LIST', 'VIEW', 'Ver', 'Ver empleados', 10, true, 'SYSTEM'),
  ('EMPL_LIST', 'CREATE', 'Crear', 'Crear empleado', 20, true, 'SYSTEM'),
  ('EMPL_LIST', 'EDIT', 'Editar', 'Editar empleado', 30, true, 'SYSTEM'),
  ('EMPL_LIST', 'DELETE', 'Eliminar', 'Eliminar empleado', 40, true, 'SYSTEM'),
  ('EMPL_LIST', 'IMPORT', 'Importar', 'Importar empleados', 50, true, 'SYSTEM'),
  ('EMPL_LIST', 'EXPORT', 'Exportar', 'Exportar empleados', 60, true, 'SYSTEM'),
  
  ('EMPL_ASSIGN_COMPANY', 'VIEW', 'Ver', 'Ver asignaciones', 10, true, 'SYSTEM'),
  ('EMPL_ASSIGN_COMPANY', 'ASSIGN', 'Asignar', 'Asignar empleado a empresa', 20, true, 'SYSTEM'),
  ('EMPL_ASSIGN_COMPANY', 'REMOVE', 'Remover', 'Remover asignación', 30, true, 'SYSTEM'),
  
  ('EMPL_PROFILES', 'VIEW', 'Ver', 'Ver perfiles de empleado', 10, true, 'SYSTEM'),
  ('EMPL_PROFILES', 'CREATE', 'Crear', 'Crear perfil', 20, true, 'SYSTEM'),
  ('EMPL_PROFILES', 'EDIT', 'Editar', 'Editar perfil', 30, true, 'SYSTEM'),
  ('EMPL_PROFILES', 'DELETE', 'Eliminar', 'Eliminar perfil', 40, true, 'SYSTEM'),
  
  ('EMPL_PROFILE_SETTINGS', 'VIEW', 'Ver', 'Ver ajustes de perfil', 10, true, 'SYSTEM'),
  ('EMPL_PROFILE_SETTINGS', 'EDIT', 'Editar', 'Editar ajustes', 20, true, 'SYSTEM'),
  
  ('EMPL_ABSENCE_REQUESTS', 'VIEW', 'Ver', 'Ver solicitudes de ausencia', 10, true, 'SYSTEM'),
  ('EMPL_ABSENCE_REQUESTS', 'CREATE', 'Crear', 'Crear solicitud', 20, true, 'SYSTEM'),
  ('EMPL_ABSENCE_REQUESTS', 'EDIT', 'Editar', 'Editar solicitud', 30, true, 'SYSTEM'),
  ('EMPL_ABSENCE_REQUESTS', 'DELETE', 'Eliminar', 'Eliminar solicitud', 40, true, 'SYSTEM'),
  ('EMPL_ABSENCE_REQUESTS', 'APPROVE', 'Aprobar', 'Aprobar solicitud', 50, true, 'SYSTEM'),
  ('EMPL_ABSENCE_REQUESTS', 'REJECT', 'Rechazar', 'Rechazar solicitud', 60, true, 'SYSTEM'),
  
  ('EMPL_DOCUMENTS', 'VIEW', 'Ver', 'Ver documentos', 10, true, 'SYSTEM'),
  ('EMPL_DOCUMENTS', 'UPLOAD', 'Subir', 'Subir documento', 20, true, 'SYSTEM'),
  ('EMPL_DOCUMENTS', 'DOWNLOAD', 'Descargar', 'Descargar documento', 30, true, 'SYSTEM'),
  ('EMPL_DOCUMENTS', 'DELETE', 'Eliminar', 'Eliminar documento', 40, true, 'SYSTEM'),
  
  -- ========== ASISTENCIA ==========
  ('ATT_TIME_PUNCHES', 'VIEW', 'Ver', 'Ver marcaciones', 10, true, 'SYSTEM'),
  ('ATT_TIME_PUNCHES', 'CREATE', 'Crear', 'Registrar marcación manual', 20, true, 'SYSTEM'),
  ('ATT_TIME_PUNCHES', 'EDIT', 'Editar', 'Editar marcación', 30, true, 'SYSTEM'),
  ('ATT_TIME_PUNCHES', 'DELETE', 'Eliminar', 'Eliminar marcación', 40, true, 'SYSTEM'),
  ('ATT_TIME_PUNCHES', 'IMPORT', 'Importar', 'Importar marcaciones', 50, true, 'SYSTEM'),
  ('ATT_TIME_PUNCHES', 'EXPORT', 'Exportar', 'Exportar marcaciones', 60, true, 'SYSTEM'),
  
  ('ATT_SHIFT_PLANS', 'VIEW', 'Ver', 'Ver planificación de turnos', 10, true, 'SYSTEM'),
  ('ATT_SHIFT_PLANS', 'CREATE', 'Crear', 'Crear plan', 20, true, 'SYSTEM'),
  ('ATT_SHIFT_PLANS', 'EDIT', 'Editar', 'Editar plan', 30, true, 'SYSTEM'),
  ('ATT_SHIFT_PLANS', 'DELETE', 'Eliminar', 'Eliminar plan', 40, true, 'SYSTEM'),
  ('ATT_SHIFT_PLANS', 'GENERATE', 'Generar', 'Generar con IA', 50, true, 'SYSTEM'),
  
  ('ATT_PROCESS_RUNS', 'VIEW', 'Ver', 'Ver ejecuciones de proceso', 10, true, 'SYSTEM'),
  ('ATT_PROCESS_RUNS', 'EXECUTE', 'Ejecutar', 'Ejecutar proceso', 20, true, 'SYSTEM'),
  ('ATT_PROCESS_RUNS', 'CANCEL', 'Cancelar', 'Cancelar ejecución', 30, true, 'SYSTEM'),
  
  ('ATT_CALC_RESULTS', 'VIEW', 'Ver', 'Ver resultados de cálculo', 10, true, 'SYSTEM'),
  ('ATT_CALC_RESULTS', 'EXPORT', 'Exportar', 'Exportar resultados', 20, true, 'SYSTEM'),
  ('ATT_CALC_RESULTS', 'RECALCULATE', 'Recalcular', 'Recalcular', 30, true, 'SYSTEM'),
  
  ('ATT_APPROVALS', 'VIEW', 'Ver', 'Ver aprobaciones', 10, true, 'SYSTEM'),
  ('ATT_APPROVALS', 'APPROVE', 'Aprobar', 'Aprobar', 20, true, 'SYSTEM'),
  ('ATT_APPROVALS', 'REJECT', 'Rechazar', 'Rechazar', 30, true, 'SYSTEM'),
  
  ('ATT_ANOMALIES', 'VIEW', 'Ver', 'Ver anomalías', 10, true, 'SYSTEM'),
  ('ATT_ANOMALIES', 'RESOLVE', 'Resolver', 'Resolver anomalía', 20, true, 'SYSTEM'),
  ('ATT_ANOMALIES', 'EXPORT', 'Exportar', 'Exportar anomalías', 30, true, 'SYSTEM'),
  
  -- ========== REPORTES ==========
  ('RPT_CATALOG', 'VIEW', 'Ver', 'Ver catálogo de reportes', 10, true, 'SYSTEM'),
  ('RPT_CATALOG', 'EXECUTE', 'Ejecutar', 'Ejecutar reporte', 20, true, 'SYSTEM'),
  
  ('RPT_PARAMETERS', 'VIEW', 'Ver', 'Ver parámetros de reportes', 10, true, 'SYSTEM'),
  ('RPT_PARAMETERS', 'EDIT', 'Editar', 'Editar parámetros', 20, true, 'SYSTEM'),
  
  ('RPT_PERMISSIONS', 'VIEW', 'Ver', 'Ver permisos de reportes', 10, true, 'SYSTEM'),
  ('RPT_PERMISSIONS', 'ASSIGN', 'Asignar', 'Asignar permiso', 20, true, 'SYSTEM'),
  ('RPT_PERMISSIONS', 'REMOVE', 'Remover', 'Remover permiso', 30, true, 'SYSTEM'),
  
  ('RPT_EXECUTIONS', 'VIEW', 'Ver', 'Ver ejecuciones', 10, true, 'SYSTEM'),
  ('RPT_EXECUTIONS', 'DOWNLOAD', 'Descargar', 'Descargar reporte', 20, true, 'SYSTEM'),
  ('RPT_EXECUTIONS', 'DELETE', 'Eliminar', 'Eliminar ejecución', 30, true, 'SYSTEM'),
  
  -- ========== SUSCRIPCIÓN ==========
  ('SUB_PLANS', 'VIEW', 'Ver', 'Ver planes', 10, true, 'SYSTEM'),
  ('SUB_PLANS', 'CREATE', 'Crear', 'Crear plan', 20, true, 'SYSTEM'),
  ('SUB_PLANS', 'EDIT', 'Editar', 'Editar plan', 30, true, 'SYSTEM'),
  ('SUB_PLANS', 'DELETE', 'Eliminar', 'Eliminar plan', 40, true, 'SYSTEM'),
  
  ('SUB_TENANT_SUBS', 'VIEW', 'Ver', 'Ver suscripción', 10, true, 'SYSTEM'),
  ('SUB_TENANT_SUBS', 'UPGRADE', 'Actualizar', 'Actualizar plan', 20, true, 'SYSTEM'),
  ('SUB_TENANT_SUBS', 'CANCEL', 'Cancelar', 'Cancelar suscripción', 30, true, 'SYSTEM'),
  
  ('SUB_TRANSACTIONS', 'VIEW', 'Ver', 'Ver transacciones', 10, true, 'SYSTEM'),
  ('SUB_TRANSACTIONS', 'EXPORT', 'Exportar', 'Exportar transacciones', 20, true, 'SYSTEM')
ON CONFLICT (screen_key, action_code) DO UPDATE SET
  action_name = EXCLUDED.action_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- ============================================
-- ✅ VERIFICACIÓN
-- ============================================

SELECT 
  'Total Screen Actions' as tipo,
  COUNT(*) as cantidad
FROM public.screen_actions;

SELECT 
  'Pantallas con acciones' as tipo,
  COUNT(DISTINCT screen_key) as cantidad
FROM public.screen_actions;

SELECT 
  screen_key,
  COUNT(*) as num_actions
FROM public.screen_actions
GROUP BY screen_key
ORDER BY screen_key;

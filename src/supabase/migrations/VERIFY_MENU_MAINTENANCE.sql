-- ============================================================================
-- Script de Verificación: Estado del Menú Mantenimiento
-- ============================================================================
-- Ejecutar este script para verificar el estado actual de las pantallas
-- del menú Mantenimiento y sus permisos

-- ============================================================================
-- 1. Listar todas las pantallas del menú MAINT
-- ============================================================================
SELECT 
  s.screen_display_order AS "Orden",
  s.screen_key AS "Clave",
  s.screen_name AS "Nombre",
  s.screen_short_name AS "Nombre Corto",
  s.screen_route AS "Ruta",
  s.screen_icon_key AS "Icono",
  s.is_active AS "Activa",
  s.lookup_scope AS "Scope"
FROM public.screens s
INNER JOIN public.menu_groups mg ON s.menu_group_id = mg.id
WHERE mg.menu_group_key = 'MAINT'
ORDER BY s.screen_display_order, s.screen_key;

-- ============================================================================
-- 2. Verificar permisos de la pantalla SYSTEM_SETTINGS_MANAGEMENT
-- ============================================================================
SELECT 
  r.role_key AS "Rol",
  r.role_name AS "Nombre Rol",
  rsp.can_view AS "Ver",
  rsp.can_create AS "Crear",
  rsp.can_edit AS "Editar",
  rsp.can_delete AS "Eliminar",
  rsp.can_export AS "Exportar",
  rsp.can_approve AS "Aprobar"
FROM public.role_screen_permissions rsp
INNER JOIN public.roles r ON rsp.role_id = r.id
INNER JOIN public.screens s ON rsp.screen_id = s.id
WHERE s.screen_key = 'SYSTEM_SETTINGS_MANAGEMENT'
ORDER BY 
  CASE r.role_key
    WHEN 'SYSTEM_ADMIN' THEN 1
    WHEN 'TENANT_ADMIN' THEN 2
    WHEN 'RRHH_ADMIN' THEN 3
    WHEN 'SUPERVISOR' THEN 4
    WHEN 'EMPLOYEE' THEN 5
    ELSE 6
  END;

-- ============================================================================
-- 3. Verificar si existe la pantalla PARAMETERS_MANAGEMENT (antigua)
-- ============================================================================
SELECT 
  COUNT(*) AS "Existe PARAMETERS_MANAGEMENT (antigua)",
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ DEBE EJECUTAR MIGRACIÓN 006 para actualizar'
    ELSE '✅ No existe pantalla antigua'
  END AS "Estado"
FROM public.screens
WHERE screen_key = 'PARAMETERS_MANAGEMENT';

-- ============================================================================
-- 4. Verificar si existe la pantalla SYSTEM_SETTINGS_MANAGEMENT (nueva)
-- ============================================================================
SELECT 
  COUNT(*) AS "Existe SYSTEM_SETTINGS_MANAGEMENT (nueva)",
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Pantalla configurada correctamente'
    ELSE '❌ DEBE EJECUTAR MIGRACIÓN 006'
  END AS "Estado"
FROM public.screens
WHERE screen_key = 'SYSTEM_SETTINGS_MANAGEMENT';

-- ============================================================================
-- 5. Resumen de pantallas activas en MAINT
-- ============================================================================
SELECT 
  COUNT(*) AS "Total Pantallas",
  SUM(CASE WHEN s.is_active THEN 1 ELSE 0 END) AS "Activas",
  SUM(CASE WHEN NOT s.is_active THEN 1 ELSE 0 END) AS "Inactivas"
FROM public.screens s
INNER JOIN public.menu_groups mg ON s.menu_group_id = mg.id
WHERE mg.menu_group_key = 'MAINT';

-- ============================================================================
-- 6. Contar permisos por pantalla en MAINT
-- ============================================================================
SELECT 
  s.screen_key AS "Pantalla",
  s.screen_name AS "Nombre",
  COUNT(rsp.id) AS "Total Permisos",
  SUM(CASE WHEN rsp.can_view THEN 1 ELSE 0 END) AS "Con Vista",
  SUM(CASE WHEN rsp.can_create THEN 1 ELSE 0 END) AS "Con Creación",
  SUM(CASE WHEN rsp.can_edit THEN 1 ELSE 0 END) AS "Con Edición"
FROM public.screens s
INNER JOIN public.menu_groups mg ON s.menu_group_id = mg.id
LEFT JOIN public.role_screen_permissions rsp ON s.id = rsp.screen_id
WHERE mg.menu_group_key = 'MAINT'
GROUP BY s.screen_key, s.screen_name, s.screen_display_order
ORDER BY s.screen_display_order;

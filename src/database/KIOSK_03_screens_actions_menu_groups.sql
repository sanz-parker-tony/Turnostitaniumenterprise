-- ============================================
-- KIOSK - FASE 1: SCREENS, ACTIONS, MENU GROUPS
-- ============================================
-- Fecha: 2026-01-11
-- Descripción: 
--   1. Eliminar screens de SUBSCRIPTION
--   2. Renombrar screens según diseño final
--   3. Crear screens nuevos KIOSK
--   4. Crear actions nuevas KIOSK
--   5. Actualizar menu_groups (renombrar CONFIG→CONF, EMPLOYEE→EMPL, ATTENDANCE→ATT)
-- ============================================

-- ============================================
-- A. ELIMINAR SCREENS DE SUBSCRIPTION
-- ============================================

DELETE FROM public.screens WHERE screen_key IN ('SUB_PLANS', 'SUB_TENANT_SUBS', 'SUB_TRANSACTIONS');

-- ============================================
-- B. RENOMBRAR SCREENS EXISTENTES
-- ============================================

-- SEC_TENANT_MEMBERS → SEC_USERS
UPDATE public.screens 
SET screen_key = 'SEC_USERS',
    screen_name = 'Usuarios',
    menu_label = 'Usuarios',
    route_path = '/security/users'
WHERE screen_key = 'SEC_TENANT_MEMBERS';

-- SEC_LOGIN_SESSIONS → SEC_SESSIONS
UPDATE public.screens 
SET screen_key = 'SEC_SESSIONS',
    screen_name = 'Sesiones Activas',
    menu_label = 'Sesiones',
    route_path = '/security/sessions'
WHERE screen_key = 'SEC_LOGIN_SESSIONS';

-- MANT_ATT_MOVEMENTS → CONF_ATT_MOVEMENTS
UPDATE public.screens 
SET screen_key = 'CONF_ATT_MOVEMENTS',
    screen_name = 'Movimientos de Asistencia',
    menu_label = 'Movimientos',
    route_path = '/config/attendance-movements'
WHERE screen_key = 'MANT_ATT_MOVEMENTS';

-- MANT_ATT_EVENTS → CONF_ATT_EVENTS
UPDATE public.screens 
SET screen_key = 'CONF_ATT_EVENTS',
    screen_name = 'Eventos de Asistencia',
    menu_label = 'Eventos',
    route_path = '/config/attendance-events'
WHERE screen_key = 'MANT_ATT_EVENTS';

-- CONF_DEVICES → MANT_DEVICES
UPDATE public.screens 
SET screen_key = 'MANT_DEVICES',
    screen_name = 'Dispositivos',
    menu_label = 'Dispositivos',
    route_path = '/maintenance/devices'
WHERE screen_key = 'CONF_DEVICES';

-- ============================================
-- C. ACTUALIZAR MENU_GROUPS
-- ============================================

-- Obtener IDs de módulos
DO $$
DECLARE
  v_kiosk_module_id uuid;
  v_att_module_id uuid;
  v_empl_module_id uuid;
  v_conf_module_id uuid;
  v_maint_module_id uuid;
BEGIN
  -- Obtener module_id de KIOSK (crear si no existe)
  SELECT id INTO v_kiosk_module_id
  FROM public.lookup_values
  WHERE lookup_key = 'KIOSK' AND lookup_scope = 'SYSTEM';
  
  IF v_kiosk_module_id IS NULL THEN
    INSERT INTO public.lookup_values (
      tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, 
      sort_order, is_active, created_by
    )
    SELECT 
      NULL, 
      lg.id, 
      'SYSTEM', 
      'KIOSK', 
      'KIOSK', 
      'Kiosko', 
      90, 
      true, 
      'SYSTEM'
    FROM public.lookup_groups lg
    WHERE lg.lookup_group_key = 'MODULE'
    RETURNING id INTO v_kiosk_module_id;
  END IF;

  -- Obtener otros module_ids
  SELECT id INTO v_att_module_id FROM public.lookup_values WHERE lookup_key = 'ATTENDANCE' AND lookup_scope = 'SYSTEM';
  SELECT id INTO v_empl_module_id FROM public.lookup_values WHERE lookup_key = 'EMPLOYEE' AND lookup_scope = 'SYSTEM';
  SELECT id INTO v_conf_module_id FROM public.lookup_values WHERE lookup_key = 'CONFIG' AND lookup_scope = 'SYSTEM';
  SELECT id INTO v_maint_module_id FROM public.lookup_values WHERE lookup_key = 'MAINT' AND lookup_scope = 'SYSTEM';

  -- Crear menu_group KIOSK
  INSERT INTO public.system_menu_groups (
    menu_group_key, menu_group_name, menu_group_short_name, icon_key, sort_order, is_active, created_by
  )
  VALUES ('KIOSK', 'Kiosko', 'Kiosko', 'Monitor', 90, true, 'SYSTEM')
  ON CONFLICT (menu_group_key) DO NOTHING;

  -- Renombrar menu_groups existentes (key y name)
  UPDATE public.system_menu_groups SET menu_group_key = 'CONF', menu_group_name = 'Configuración' WHERE menu_group_key = 'CONFIG';
  UPDATE public.system_menu_groups SET menu_group_key = 'EMPL', menu_group_name = 'Empleados' WHERE menu_group_key = 'EMPLOYEE';
  UPDATE public.system_menu_groups SET menu_group_key = 'ATT', menu_group_name = 'Asistencia' WHERE menu_group_key = 'ATTENDANCE';
END $$;

-- ============================================
-- D. CREAR SCREENS NUEVOS KIOSK
-- ============================================

WITH 
kiosk_menu AS (
  SELECT id FROM public.system_menu_groups WHERE menu_group_key = 'KIOSK'
),
kiosk_module AS (
  SELECT lv.id 
  FROM public.lookup_values lv
  JOIN public.lookup_groups lg ON lg.id = lv.lookup_group_id
  WHERE lg.lookup_group_key = 'MODULE' AND lv.lookup_key = 'KIOSK' AND lv.lookup_scope = 'SYSTEM'
)
INSERT INTO public.screens (
  screen_key, screen_name, menu_label, menu_group_id, module_id, route_path, icon_key, sort_order, is_active, created_by
)
SELECT 
  t.screen_key,
  t.screen_name,
  t.menu_label,
  km.id,
  kmod.id,
  t.route_path,
  t.icon_key,
  t.sort_order,
  true,
  'SYSTEM'
FROM kiosk_menu km
CROSS JOIN kiosk_module kmod
CROSS JOIN (VALUES
  ('KIOSK_PUNCH', 'Marcación', 'Marcación', '/kiosk/punch', 'Timer', 10),
  ('KIOSK_REGULARIZATION', 'Regularizar Marcaciones', 'Regularización', '/kiosk/regularization', 'FileEdit', 20),
  ('KIOSK_PERMISSION', 'Solicitar Permisos', 'Permisos', '/kiosk/permission', 'ClipboardList', 30),
  ('KIOSK_JUSTIFICATION', 'Justificar Inasistencias', 'Justificación', '/kiosk/justification', 'MessageSquare', 40),
  ('KIOSK_SHIFT_CHANGE', 'Solicitar Cambio de Turno', 'Cambio de Turno', '/kiosk/shift-change', 'ArrowLeftRight', 50)
) AS t(screen_key, screen_name, menu_label, route_path, icon_key, sort_order)
ON CONFLICT (screen_key) DO UPDATE
SET screen_name = EXCLUDED.screen_name,
    menu_label = EXCLUDED.menu_label,
    route_path = EXCLUDED.route_path,
    icon_key = EXCLUDED.icon_key;

-- ============================================
-- E. CREAR ACTIONS NUEVAS KIOSK
-- ============================================

INSERT INTO public.actions (action_key, action_name, is_active, created_by)
VALUES
  ('MARK_ENTRY', 'Marcar Entrada', true, 'SYSTEM'),
  ('MARK_EXIT', 'Marcar Salida', true, 'SYSTEM'),
  ('MARK_LUNCH_OUT', 'Marcar Salida a Lunch', true, 'SYSTEM'),
  ('MARK_LUNCH_IN', 'Marcar Entrada de Lunch', true, 'SYSTEM'),
  ('MARK_PERMISSION_OUT', 'Marcar Salida por Permiso', true, 'SYSTEM'),
  ('MARK_PERMISSION_IN', 'Marcar Entrada de Permiso', true, 'SYSTEM'),
  ('REQUEST_REGULARIZATION', 'Solicitar Regularización', true, 'SYSTEM'),
  ('REQUEST_PERMISSION', 'Solicitar Permiso', true, 'SYSTEM'),
  ('REQUEST_JUSTIFICATION', 'Solicitar Justificación', true, 'SYSTEM'),
  ('REQUEST_SHIFT_CHANGE', 'Solicitar Cambio de Turno', true, 'SYSTEM'),
  ('ACTIVATE_CONTINGENCY', 'Activar Contingencia', true, 'SYSTEM'),
  ('DEACTIVATE_CONTINGENCY', 'Desactivar Contingencia', true, 'SYSTEM')
ON CONFLICT (action_key) DO NOTHING;

-- ============================================
-- F. CREAR SCREEN_ACTIONS PARA KIOSK
-- ============================================

-- KIOSK_PUNCH: acciones de marcación
INSERT INTO public.screen_actions (screen_id, action_id, is_required, sort_order, is_active, created_by)
SELECT 
  s.id,
  a.id,
  true,
  CASE 
    WHEN a.action_key = 'MARK_ENTRY' THEN 10
    WHEN a.action_key = 'MARK_EXIT' THEN 20
    WHEN a.action_key = 'MARK_LUNCH_OUT' THEN 30
    WHEN a.action_key = 'MARK_LUNCH_IN' THEN 40
    WHEN a.action_key = 'MARK_PERMISSION_OUT' THEN 50
    WHEN a.action_key = 'MARK_PERMISSION_IN' THEN 60
    WHEN a.action_key = 'VIEW' THEN 5
  END,
  true,
  'SYSTEM'
FROM public.screens s
CROSS JOIN public.actions a
WHERE s.screen_key = 'KIOSK_PUNCH'
  AND a.action_key IN ('VIEW', 'MARK_ENTRY', 'MARK_EXIT', 'MARK_LUNCH_OUT', 'MARK_LUNCH_IN', 'MARK_PERMISSION_OUT', 'MARK_PERMISSION_IN')
ON CONFLICT (screen_id, action_id) DO NOTHING;

-- KIOSK_REGULARIZATION
INSERT INTO public.screen_actions (screen_id, action_id, is_required, sort_order, is_active, created_by)
SELECT 
  s.id,
  a.id,
  true,
  CASE 
    WHEN a.action_key = 'VIEW' THEN 10
    WHEN a.action_key = 'REQUEST_REGULARIZATION' THEN 20
  END,
  true,
  'SYSTEM'
FROM public.screens s
CROSS JOIN public.actions a
WHERE s.screen_key = 'KIOSK_REGULARIZATION'
  AND a.action_key IN ('VIEW', 'REQUEST_REGULARIZATION')
ON CONFLICT (screen_id, action_id) DO NOTHING;

-- KIOSK_PERMISSION
INSERT INTO public.screen_actions (screen_id, action_id, is_required, sort_order, is_active, created_by)
SELECT 
  s.id,
  a.id,
  true,
  CASE 
    WHEN a.action_key = 'VIEW' THEN 10
    WHEN a.action_key = 'REQUEST_PERMISSION' THEN 20
  END,
  true,
  'SYSTEM'
FROM public.screens s
CROSS JOIN public.actions a
WHERE s.screen_key = 'KIOSK_PERMISSION'
  AND a.action_key IN ('VIEW', 'REQUEST_PERMISSION')
ON CONFLICT (screen_id, action_id) DO NOTHING;

-- KIOSK_JUSTIFICATION
INSERT INTO public.screen_actions (screen_id, action_id, is_required, sort_order, is_active, created_by)
SELECT 
  s.id,
  a.id,
  true,
  CASE 
    WHEN a.action_key = 'VIEW' THEN 10
    WHEN a.action_key = 'REQUEST_JUSTIFICATION' THEN 20
  END,
  true,
  'SYSTEM'
FROM public.screens s
CROSS JOIN public.actions a
WHERE s.screen_key = 'KIOSK_JUSTIFICATION'
  AND a.action_key IN ('VIEW', 'REQUEST_JUSTIFICATION')
ON CONFLICT (screen_id, action_id) DO NOTHING;

-- KIOSK_SHIFT_CHANGE
INSERT INTO public.screen_actions (screen_id, action_id, is_required, sort_order, is_active, created_by)
SELECT 
  s.id,
  a.id,
  true,
  CASE 
    WHEN a.action_key = 'VIEW' THEN 10
    WHEN a.action_key = 'REQUEST_SHIFT_CHANGE' THEN 20
  END,
  true,
  'SYSTEM'
FROM public.screens s
CROSS JOIN public.actions a
WHERE s.screen_key = 'KIOSK_SHIFT_CHANGE'
  AND a.action_key IN ('VIEW', 'REQUEST_SHIFT_CHANGE')
ON CONFLICT (screen_id, action_id) DO NOTHING;

-- ============================================
-- G. VERIFICACIÓN
-- ============================================

-- Verificar screens eliminados
SELECT 
  'Screens eliminados' as verificacion,
  COUNT(*) as cantidad,
  CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END as estado
FROM public.screens
WHERE screen_key IN ('SUB_PLANS', 'SUB_TENANT_SUBS', 'SUB_TRANSACTIONS')

UNION ALL

-- Verificar screens renombrados
SELECT 
  'Screens renombrados' as verificacion,
  COUNT(*) as cantidad,
  CASE WHEN COUNT(*) = 5 THEN '✅' ELSE '❌' END as estado
FROM public.screens
WHERE screen_key IN ('SEC_USERS', 'SEC_SESSIONS', 'CONF_ATT_MOVEMENTS', 'CONF_ATT_EVENTS', 'MANT_DEVICES')

UNION ALL

-- Verificar screens KIOSK creados
SELECT 
  'Screens KIOSK creados' as verificacion,
  COUNT(*) as cantidad,
  CASE WHEN COUNT(*) = 5 THEN '✅' ELSE '❌' END as estado
FROM public.screens
WHERE screen_key LIKE 'KIOSK_%'

UNION ALL

-- Verificar actions KIOSK creadas
SELECT 
  'Actions KIOSK creadas' as verificacion,
  COUNT(*) as cantidad,
  CASE WHEN COUNT(*) = 12 THEN '✅' ELSE '❌' END as estado
FROM public.actions
WHERE action_key IN (
  'MARK_ENTRY', 'MARK_EXIT', 'MARK_LUNCH_OUT', 'MARK_LUNCH_IN', 
  'MARK_PERMISSION_OUT', 'MARK_PERMISSION_IN',
  'REQUEST_REGULARIZATION', 'REQUEST_PERMISSION', 'REQUEST_JUSTIFICATION', 'REQUEST_SHIFT_CHANGE',
  'ACTIVATE_CONTINGENCY', 'DEACTIVATE_CONTINGENCY'
)

UNION ALL

-- Verificar menu_group KIOSK
SELECT 
  'Menu group KIOSK' as verificacion,
  COUNT(*) as cantidad,
  CASE WHEN COUNT(*) = 1 THEN '✅' ELSE '❌' END as estado
FROM public.system_menu_groups
WHERE menu_group_key = 'KIOSK';

-- Mostrar resumen de screens por menu_group
SELECT 
  smg.menu_group_key,
  smg.menu_group_name,
  COUNT(s.id) as cantidad_screens
FROM public.system_menu_groups smg
LEFT JOIN public.screens s ON s.menu_group_id = smg.id
GROUP BY smg.menu_group_key, smg.menu_group_name, smg.sort_order
ORDER BY smg.sort_order;

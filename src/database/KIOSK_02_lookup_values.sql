-- ============================================
-- KIOSK - FASE 1: LOOKUP VALUES
-- ============================================
-- Fecha: 2026-01-11
-- Descripción: Crear lookup groups y values necesarios para KIOSK
-- ============================================

-- ============================================
-- A. LOOKUP GROUPS NUEVOS
-- ============================================

INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES
  ('REQUEST_SOURCE', 'Origen de Solicitud', 'SYSTEM', 200, true, 'SYSTEM'),
  ('REQUEST_STATUS', 'Estado de Solicitud', 'SYSTEM', 210, true, 'SYSTEM'),
  ('REGULARIZATION_REASON', 'Motivo de Regularización', 'SYSTEM', 220, true, 'SYSTEM'),
  ('SHIFT_CHANGE_REASON', 'Motivo de Cambio de Turno', 'SYSTEM', 230, true, 'SYSTEM'),
  ('CONTINGENCY_REASON', 'Motivo de Contingencia', 'SYSTEM', 240, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

-- ============================================
-- B. LOOKUP VALUES: REQUEST_SOURCE
-- ============================================

INSERT INTO public.lookup_values (
  tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, 
  sort_order, is_active, created_by
)
SELECT 
  NULL, 
  lg.id, 
  'SYSTEM', 
  t.lookup_key, 
  t.lookup_code, 
  t.lookup_value, 
  t.sort_order, 
  true, 
  'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (VALUES
  ('REQUEST_SOURCE_ADMIN', 'ADMIN', 'Administrador', 10),
  ('REQUEST_SOURCE_KIOSK', 'KIOSK', 'Kiosko', 20),
  ('REQUEST_SOURCE_MOBILE', 'MOBILE', 'Aplicación Móvil', 30),
  ('REQUEST_SOURCE_EMPLOYEE_PORTAL', 'PORTAL', 'Portal de Empleado', 40)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'REQUEST_SOURCE'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ============================================
-- C. LOOKUP VALUES: REQUEST_STATUS
-- ============================================

INSERT INTO public.lookup_values (
  tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, 
  sort_order, is_active, created_by
)
SELECT 
  NULL, 
  lg.id, 
  'SYSTEM', 
  t.lookup_key, 
  t.lookup_code, 
  t.lookup_value, 
  t.sort_order, 
  true, 
  'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (VALUES
  ('REQUEST_STATUS_PENDING', 'PENDING', 'Pendiente', 10),
  ('REQUEST_STATUS_APPROVED', 'APPROVED', 'Aprobado', 20),
  ('REQUEST_STATUS_REJECTED', 'REJECTED', 'Rechazado', 30),
  ('REQUEST_STATUS_CANCELLED', 'CANCELLED', 'Cancelado', 40)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'REQUEST_STATUS'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ============================================
-- D. LOOKUP VALUES: REGULARIZATION_REASON
-- ============================================

INSERT INTO public.lookup_values (
  tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, 
  sort_order, is_active, created_by
)
SELECT 
  NULL, 
  lg.id, 
  'SYSTEM', 
  t.lookup_key, 
  t.lookup_code, 
  t.lookup_value, 
  t.sort_order, 
  true, 
  'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (VALUES
  ('REG_REASON_FORGOT', 'FORGOT', 'Olvidé marcar', 10),
  ('REG_REASON_DEVICE_FAIL', 'DEVICE_FAIL', 'Falla del dispositivo', 20),
  ('REG_REASON_NETWORK', 'NETWORK', 'Problema de red', 30),
  ('REG_REASON_BIOMETRIC_FAIL', 'BIO_FAIL', 'Biométrico no reconoció', 40),
  ('REG_REASON_URGENT_EXIT', 'URGENT', 'Salida urgente', 50),
  ('REG_REASON_OTHER', 'OTHER', 'Otro motivo', 99)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'REGULARIZATION_REASON'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ============================================
-- E. LOOKUP VALUES: SHIFT_CHANGE_REASON
-- ============================================

INSERT INTO public.lookup_values (
  tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, 
  sort_order, is_active, created_by
)
SELECT 
  NULL, 
  lg.id, 
  'SYSTEM', 
  t.lookup_key, 
  t.lookup_code, 
  t.lookup_value, 
  t.sort_order, 
  true, 
  'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (VALUES
  ('SHIFT_CHG_EMERGENCY', 'EMERGENCY', 'Emergencia personal', 10),
  ('SHIFT_CHG_MEDICAL', 'MEDICAL', 'Cita médica', 20),
  ('SHIFT_CHG_FAMILY', 'FAMILY', 'Compromiso familiar', 30),
  ('SHIFT_CHG_WORKLOAD', 'WORKLOAD', 'Carga de trabajo', 40),
  ('SHIFT_CHG_STUDY', 'STUDY', 'Estudios', 50),
  ('SHIFT_CHG_TRANSPORT', 'TRANSPORT', 'Problema de transporte', 60),
  ('SHIFT_CHG_OTHER', 'OTHER', 'Otro motivo', 99)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'SHIFT_CHANGE_REASON'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ============================================
-- F. LOOKUP VALUES: CONTINGENCY_REASON
-- ============================================

INSERT INTO public.lookup_values (
  tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, 
  sort_order, is_active, created_by
)
SELECT 
  NULL, 
  lg.id, 
  'SYSTEM', 
  t.lookup_key, 
  t.lookup_code, 
  t.lookup_value, 
  t.sort_order, 
  true, 
  'SYSTEM'
FROM public.lookup_groups lg
CROSS JOIN (VALUES
  ('CONT_REASON_BIO_FAIL', 'BIO_FAIL', 'Biométrico dañado', 10),
  ('CONT_REASON_NETWORK', 'NETWORK', 'Sin conexión', 20),
  ('CONT_REASON_MAINTENANCE', 'MAINTENANCE', 'Mantenimiento del dispositivo', 30),
  ('CONT_REASON_POWER', 'POWER', 'Falla eléctrica', 40),
  ('CONT_REASON_SOFTWARE', 'SOFTWARE', 'Problema de software', 50),
  ('CONT_REASON_OTHER', 'OTHER', 'Otro motivo', 99)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'CONTINGENCY_REASON'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ============================================
-- G. AGREGAR A PUNCH_SOURCE (grupo existente)
-- ============================================

-- Agregar KIOSK_CONTINGENCY a PUNCH_SOURCE
INSERT INTO public.lookup_values (
  tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, 
  sort_order, is_active, created_by
)
SELECT 
  NULL, 
  lg.id, 
  'SYSTEM', 
  'PUNCH_SOURCE_KIOSK_CONTINGENCY', 
  'KIOSK_CONTINGENCY', 
  'Kiosko - Contingencia', 
  60, 
  true, 
  'SYSTEM'
FROM public.lookup_groups lg
WHERE lg.lookup_group_key = 'PUNCH_SOURCE'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ============================================
-- H. VERIFICACIÓN
-- ============================================

SELECT 
  lg.lookup_group_key,
  lg.lookup_group_name,
  COUNT(lv.id) as cantidad_valores,
  CASE WHEN COUNT(lv.id) > 0 THEN '✅' ELSE '❌' END as estado
FROM public.lookup_groups lg
LEFT JOIN public.lookup_values lv ON lv.lookup_group_id = lg.id AND lv.lookup_scope = 'SYSTEM'
WHERE lg.lookup_group_key IN (
  'REQUEST_SOURCE', 
  'REQUEST_STATUS', 
  'REGULARIZATION_REASON', 
  'SHIFT_CHANGE_REASON', 
  'CONTINGENCY_REASON',
  'PUNCH_SOURCE'
)
GROUP BY lg.lookup_group_key, lg.lookup_group_name
ORDER BY lg.lookup_group_key;

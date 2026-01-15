-- ==========================================================================================================
-- MIGRATION 002: KIOSK - LOOKUP VALUES (REQUEST_SOURCE, REQUEST_STATUS, REASONS)
-- ==========================================================================================================
-- Proyecto: Turnos Titanium Enterprise
-- Fecha: 2026-01-11
-- Descripción: Creación de lookup groups y values para KIOSK (fuentes de request, estados, motivos)
-- ==========================================================================================================

-- ==========================================================================================================
-- 1) LOOKUP GROUP: REQUEST_SOURCE (origen de solicitudes)
-- ==========================================================================================================

INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES ('REQUEST_SOURCE', 'Origen de Solicitud', 'SYSTEM', 190, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
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
  ('ADMIN', 'ADMIN', 'Administrador', 10),
  ('KIOSK', 'KIOSK', 'Kiosko', 20),
  ('MOBILE', 'MOBILE', 'Aplicación Móvil', 30)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'REQUEST_SOURCE'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ==========================================================================================================
-- 2) LOOKUP GROUP: REQUEST_STATUS (estados de solicitudes)
-- ==========================================================================================================

INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES ('REQUEST_STATUS', 'Estado de Solicitud', 'SYSTEM', 200, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
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
  ('PENDING', 'PENDING', 'Pendiente', 10),
  ('APPROVED', 'APPROVED', 'Aprobado', 20),
  ('REJECTED', 'REJECTED', 'Rechazado', 30),
  ('CANCELLED', 'CANCELLED', 'Cancelado', 40)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'REQUEST_STATUS'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ==========================================================================================================
-- 3) LOOKUP GROUP: REGULARIZATION_REASON (motivos de regularización)
-- ==========================================================================================================

INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES ('REGULARIZATION_REASON', 'Motivo de Regularización', 'SYSTEM', 210, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
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
  ('FORGOT_PUNCH', 'FORGOT', 'Olvidé marcar', 10),
  ('DEVICE_FAILURE', 'DEVICE_FAIL', 'Falla del dispositivo', 20),
  ('NETWORK_ISSUE', 'NETWORK', 'Problema de red', 30),
  ('WRONG_PUNCH', 'WRONG', 'Marcación incorrecta', 40),
  ('OTHER', 'OTHER', 'Otro motivo', 99)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'REGULARIZATION_REASON'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ==========================================================================================================
-- 4) LOOKUP GROUP: SHIFT_CHANGE_REASON (motivos de cambio de turno)
-- ==========================================================================================================

INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES ('SHIFT_CHANGE_REASON', 'Motivo de Cambio de Turno', 'SYSTEM', 220, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
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
  ('PERSONAL_EMERGENCY', 'EMERGENCY', 'Emergencia personal', 10),
  ('MEDICAL_APPOINTMENT', 'MEDICAL', 'Cita médica', 20),
  ('FAMILY_COMMITMENT', 'FAMILY', 'Compromiso familiar', 30),
  ('WORKLOAD', 'WORKLOAD', 'Carga de trabajo', 40),
  ('PERSONAL_REQUEST', 'PERSONAL', 'Solicitud personal', 50),
  ('OTHER', 'OTHER', 'Otro motivo', 99)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'SHIFT_CHANGE_REASON'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ==========================================================================================================
-- 5) LOOKUP GROUP: CONTINGENCY_REASON (motivos de contingencia)
-- ==========================================================================================================

INSERT INTO public.lookup_groups (lookup_group_key, lookup_group_name, lookup_scope, sort_order, is_active, created_by)
VALUES ('CONTINGENCY_REASON', 'Motivo de Contingencia', 'SYSTEM', 230, true, 'SYSTEM')
ON CONFLICT (lookup_group_key) DO NOTHING;

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
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
  ('BIOMETRIC_FAILURE', 'BIO_FAIL', 'Biométrico dañado', 10),
  ('NETWORK_DOWN', 'NETWORK', 'Sin conexión a red', 20),
  ('DEVICE_MAINTENANCE', 'MAINTENANCE', 'Mantenimiento del dispositivo', 30),
  ('POWER_OUTAGE', 'POWER', 'Falla eléctrica', 40),
  ('EMERGENCY', 'EMERGENCY', 'Emergencia', 50),
  ('OTHER', 'OTHER', 'Otro motivo', 99)
) as t(lookup_key, lookup_code, lookup_value, sort_order)
WHERE lg.lookup_group_key = 'CONTINGENCY_REASON'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ==========================================================================================================
-- 6) AGREGAR VALOR A LOOKUP GROUP EXISTENTE: PUNCH_SOURCE (agregar KIOSK_CONTINGENCY)
-- ==========================================================================================================

INSERT INTO public.lookup_values (tenant_id, lookup_group_id, lookup_scope, lookup_key, lookup_code, lookup_value, sort_order, is_active, created_by)
SELECT 
  NULL,
  lg.id,
  'SYSTEM',
  'KIOSK_CONTINGENCY',
  'KIOSK_CONT',
  'Kiosk - Contingencia',
  60,
  true,
  'SYSTEM'
FROM public.lookup_groups lg
WHERE lg.lookup_group_key = 'PUNCH_SOURCE'
ON CONFLICT (lookup_group_id, lookup_key) DO NOTHING;

-- ==========================================================================================================
-- VERIFICACIÓN FINAL
-- ==========================================================================================================

SELECT 
  'Lookup Groups Creados' as verificacion,
  COUNT(*) as total
FROM public.lookup_groups
WHERE lookup_group_key IN ('REQUEST_SOURCE', 'REQUEST_STATUS', 'REGULARIZATION_REASON', 'SHIFT_CHANGE_REASON', 'CONTINGENCY_REASON');

SELECT 
  lg.lookup_group_key,
  lg.lookup_group_name,
  COUNT(lv.id) as valores_creados
FROM public.lookup_groups lg
LEFT JOIN public.lookup_values lv ON lv.lookup_group_id = lg.id AND lv.lookup_scope = 'SYSTEM'
WHERE lg.lookup_group_key IN ('REQUEST_SOURCE', 'REQUEST_STATUS', 'REGULARIZATION_REASON', 'SHIFT_CHANGE_REASON', 'CONTINGENCY_REASON')
GROUP BY lg.lookup_group_key, lg.lookup_group_name
ORDER BY lg.lookup_group_key;

-- FIN MIGRATION 002

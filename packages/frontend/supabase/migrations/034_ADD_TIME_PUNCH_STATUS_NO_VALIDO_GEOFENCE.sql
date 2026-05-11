-- 034_ADD_TIME_PUNCH_STATUS_NO_VALIDO_GEOFENCE
-- Agrega estado especializado para marcaciones fuera de geocerca.

INSERT INTO public.lookup_values (
  tenant_id,
  lookup_group_id,
  lookup_key,
  lookup_label,
  lookup_short_label,
  lookup_scope,
  sort_order,
  is_active,
  created_by
)
SELECT
  NULL,
  lg.id,
  'NO_VALIDO_GEOFENCE',
  'No valido geofence',
  'No valido geo',
  'SYSTEM',
  25,
  true,
  'SYSTEM'
FROM public.lookup_groups lg
WHERE lg.lookup_group_key = 'TIME_PUNCH_STATUS'
ON CONFLICT ON CONSTRAINT uq_lookup_values DO NOTHING;


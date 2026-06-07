-- ============================================================================
-- 054_ADD_MIN_MINUTES_BETWEEN_VALID_PUNCHES_SETTING.sql
-- Parámetro general para evitar marcaciones válidas redundantes en intervalos cortos
-- ============================================================================

DO $$
DECLARE
  v_number_type_id uuid;
BEGIN
  SELECT lv.id
    INTO v_number_type_id
  FROM public.lookup_values lv
  INNER JOIN public.lookup_groups lg
    ON lg.id = lv.lookup_group_id
  WHERE lg.lookup_group_key = 'DATA_TYPE'
    AND lv.lookup_key = 'NUMBER'
    AND lv.is_active = true
  ORDER BY CASE WHEN lv.tenant_id IS NULL THEN 0 ELSE 1 END, lv.created_at
  LIMIT 1;

  UPDATE public.system_settings
     SET setting_name = 'Minutos mínimos entre marcaciones válidas',
         setting_short_key = 'MIN_PUNCH_MIN',
         value_type_id = COALESCE(v_number_type_id, value_type_id),
         default_value = '5',
         description = 'Cantidad mínima de minutos que deben pasar para aceptar una nueva marcación válida del mismo empleado.',
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE setting_key = 'MIN_MINUTES_BETWEEN_VALID_PUNCHES';

  IF NOT FOUND THEN
    INSERT INTO public.system_settings (
      setting_key,
      setting_name,
      setting_short_key,
      value_type_id,
      default_value,
      description,
      is_active,
      created_by
    ) VALUES (
      'MIN_MINUTES_BETWEEN_VALID_PUNCHES',
      'Minutos mínimos entre marcaciones válidas',
      'MIN_PUNCH_MIN',
      v_number_type_id,
      '5',
      'Cantidad mínima de minutos que deben pasar para aceptar una nueva marcación válida del mismo empleado.',
      true,
      'SYSTEM'
    );
  END IF;
END $$;

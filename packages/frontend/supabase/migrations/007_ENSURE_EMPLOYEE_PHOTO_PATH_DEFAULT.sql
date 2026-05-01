-- ============================================================================
-- 007_ENSURE_EMPLOYEE_PHOTO_PATH_DEFAULT.sql
-- Garantiza que exista y tenga default_value la ruta de fotos de empleados
-- ============================================================================

DO $$
DECLARE
  v_text_type_id uuid;
BEGIN
  -- Intentar resolver tipo TEXT desde lookup_values del sistema
  SELECT lv.id
    INTO v_text_type_id
  FROM public.lookup_values lv
  WHERE lv.lookup_key = 'TEXT'
    AND lv.is_active = true
  ORDER BY CASE WHEN lv.tenant_id IS NULL THEN 0 ELSE 1 END, lv.created_at
  LIMIT 1;

  -- Si existe la clave, actualizarla para que conste la ruta por defecto.
  UPDATE public.system_settings
     SET default_value = 'storage/employee-photos',
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE setting_key = 'EMPLOYEE_PHOTO_PATH';

  -- Si no existe, crearla.
  IF NOT FOUND THEN
    INSERT INTO public.system_settings (
      setting_key,
      setting_name,
      setting_short_key,
      value_type_id,
      default_value,
      is_active,
      created_by
    ) VALUES (
      'EMPLOYEE_PHOTO_PATH',
      'Carpeta de fotos de empleados',
      'PHOTO_PATH',
      v_text_type_id,
      'storage/employee-photos',
      true,
      'SYSTEM'
    );
  END IF;
END $$;


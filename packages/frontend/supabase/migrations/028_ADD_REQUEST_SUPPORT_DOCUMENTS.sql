-- ============================================================================
-- 028_ADD_REQUEST_SUPPORT_DOCUMENTS
-- Adjuntos PDF opcionales para:
--   - employee_absence_requests
--   - employee_shift_change_requests
-- y configuración de almacenamiento/tamaño por system_settings + tenant_settings.
-- Idempotente.
-- ============================================================================

SET search_path TO public;

ALTER TABLE IF EXISTS public.employee_absence_requests
  ADD COLUMN IF NOT EXISTS support_document_path character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.employee_absence_requests
  ADD COLUMN IF NOT EXISTS support_document_name character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.employee_absence_requests
  ADD COLUMN IF NOT EXISTS support_document_mime character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.employee_absence_requests
  ADD COLUMN IF NOT EXISTS support_document_size_bytes integer;

ALTER TABLE IF EXISTS public.employee_shift_change_requests
  ADD COLUMN IF NOT EXISTS support_document_path character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.employee_shift_change_requests
  ADD COLUMN IF NOT EXISTS support_document_name character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.employee_shift_change_requests
  ADD COLUMN IF NOT EXISTS support_document_mime character varying COLLATE pg_catalog."default";

ALTER TABLE IF EXISTS public.employee_shift_change_requests
  ADD COLUMN IF NOT EXISTS support_document_size_bytes integer;

DO $$
DECLARE
  v_text_type_id uuid;
BEGIN
  SELECT lv.id
    INTO v_text_type_id
  FROM public.lookup_values lv
  WHERE lv.lookup_key = 'TEXT'
    AND lv.is_active = true
  ORDER BY CASE WHEN lv.tenant_id IS NULL THEN 0 ELSE 1 END, lv.created_at
  LIMIT 1;

  UPDATE public.system_settings
     SET default_value = 'storage/request-support-docs',
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE setting_key = 'REQUEST_SUPPORT_DOCS_PATH';

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
      'REQUEST_SUPPORT_DOCS_PATH',
      'Carpeta de respaldo PDF para solicitudes',
      'REQ_DOC_PATH',
      v_text_type_id,
      'storage/request-support-docs',
      true,
      'SYSTEM'
    );
  END IF;

  UPDATE public.system_settings
     SET default_value = '5242880',
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now()
   WHERE setting_key = 'REQUEST_SUPPORT_DOCS_MAX_SIZE_BYTES';

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
      'REQUEST_SUPPORT_DOCS_MAX_SIZE_BYTES',
      'Tamaño máximo en bytes para PDF de respaldo',
      'REQ_DOC_MAX',
      v_text_type_id,
      '5242880',
      true,
      'SYSTEM'
    );
  END IF;
END $$;


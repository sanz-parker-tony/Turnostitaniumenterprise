-- ============================================================================
-- 033_TENANT_ADMIN_HOME_GEO_ENHANCEMENTS
-- 1) Oculta TENANT_SETTINGS para TENANT_ADMIN (se muestra en Inicio solo lectura)
-- 2) Agrega geocerca (poligono) a work_locations
-- 3) Agrega localidad + latitud/longitud a time_clock_devices
-- Idempotente y sin IDs hardcodeados.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_tenant_settings_screen_id uuid;
BEGIN
  -- 1) Quitar permiso de visualizacion de TENANT_SETTINGS para TENANT_ADMIN
  SELECT id
    INTO v_tenant_settings_screen_id
  FROM public.screens
  WHERE screen_key = 'TENANT_SETTINGS'
  LIMIT 1;

  IF v_tenant_settings_screen_id IS NOT NULL THEN
    UPDATE public.role_screen_actions rsa
       SET is_allowed = false,
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
      FROM public.roles r,
           public.screen_actions sa
     WHERE r.role_key = 'TENANT_ADMIN'
       AND r.is_active = true
       AND sa.screen_id = v_tenant_settings_screen_id
       AND sa.id = rsa.screen_action_id
       AND rsa.tenant_id = r.tenant_id
       AND rsa.role_id = r.id;
  END IF;
END $$;

-- 2) Geocerca en localidades
ALTER TABLE IF EXISTS public.work_locations
  ADD COLUMN IF NOT EXISTS geofence_polygon jsonb;

COMMENT ON COLUMN public.work_locations.geofence_polygon IS
  'Poligono de geocerca en formato GeoJSON Polygon/MultiPolygon para validar marcaciones por recinto.';

-- Localizaciones solo deben manejar poligono.
-- Si existen columnas legacy de coordenadas puntuales, se eliminan.
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.work_locations
    DROP COLUMN IF EXISTS latitude;

  ALTER TABLE IF EXISTS public.work_locations
    DROP COLUMN IF EXISTS longitude;
END $$;

-- 3) Localidad + coordenadas de dispositivo
ALTER TABLE IF EXISTS public.time_clock_devices
  ADD COLUMN IF NOT EXISTS work_location_id uuid;

ALTER TABLE IF EXISTS public.time_clock_devices
  ADD COLUMN IF NOT EXISTS latitude double precision;

ALTER TABLE IF EXISTS public.time_clock_devices
  ADD COLUMN IF NOT EXISTS longitude double precision;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'time_clock_devices_work_location_id_fkey'
  ) THEN
    ALTER TABLE public.time_clock_devices
      ADD CONSTRAINT time_clock_devices_work_location_id_fkey
      FOREIGN KEY (work_location_id)
      REFERENCES public.work_locations (id)
      ON UPDATE NO ACTION
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'time_clock_devices_latitude_chk'
  ) THEN
    ALTER TABLE public.time_clock_devices
      ADD CONSTRAINT time_clock_devices_latitude_chk
      CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'time_clock_devices_longitude_chk'
  ) THEN
    ALTER TABLE public.time_clock_devices
      ADD CONSTRAINT time_clock_devices_longitude_chk
      CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_time_clock_devices_work_location
  ON public.time_clock_devices (work_location_id);

CREATE INDEX IF NOT EXISTS idx_time_clock_devices_lat_lon
  ON public.time_clock_devices (latitude, longitude);

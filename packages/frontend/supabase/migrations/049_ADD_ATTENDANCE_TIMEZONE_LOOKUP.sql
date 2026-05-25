-- ============================================================================
-- 049_ADD_ATTENDANCE_TIMEZONE_LOOKUP
-- Objetivo:
-- - Crear/actualizar catalogo ATTENDANCE_TIMEZONE para parametros de asistencia.
-- - Incluir ciudades principales de Ecuador y ciudades globales relevantes.
-- - Guardar zona horaria IANA en lookup_short_label.
-- ============================================================================

SET search_path TO public;

DO $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id
    INTO v_group_id
  FROM public.lookup_groups
  WHERE lookup_group_key = 'ATTENDANCE_TIMEZONE'
  LIMIT 1;

  IF v_group_id IS NULL THEN
    INSERT INTO public.lookup_groups (
      id,
      lookup_group_key,
      lookup_group_label,
      lookup_group_short_label,
      allows_tenant_items,
      is_active,
      created_by
    )
    VALUES (
      gen_random_uuid(),
      'ATTENDANCE_TIMEZONE',
      'Zona Horaria de Asistencia',
      'Timezone Asistencia',
      false,
      true,
      'SYSTEM'
    )
    RETURNING id INTO v_group_id;
  ELSE
    UPDATE public.lookup_groups
       SET lookup_group_label = 'Zona Horaria de Asistencia',
           lookup_group_short_label = 'Timezone Asistencia',
           is_active = true,
           updated_by = 'SYSTEM',
           updated_at = now()
     WHERE id = v_group_id;
  END IF;

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
    v_group_id,
    x.lookup_key,
    x.lookup_label,
    x.lookup_short_label,
    'SYSTEM',
    x.sort_order,
    true,
    'SYSTEM'
  FROM (
    VALUES
      -- Ecuador
      ('ECUADOR_QUITO', 'Ecuador - Quito', 'America/Guayaquil', 10),
      ('ECUADOR_GUAYAQUIL', 'Ecuador - Guayaquil', 'America/Guayaquil', 20),
      ('ECUADOR_CUENCA', 'Ecuador - Cuenca', 'America/Guayaquil', 30),
      ('ECUADOR_MANTA', 'Ecuador - Manta', 'America/Guayaquil', 40),
      ('ECUADOR_LOJA', 'Ecuador - Loja', 'America/Guayaquil', 50),
      ('ECUADOR_AMBATO', 'Ecuador - Ambato', 'America/Guayaquil', 60),
      ('ECUADOR_SANTO_DOMINGO', 'Ecuador - Santo Domingo', 'America/Guayaquil', 70),
      ('ECUADOR_MACHALA', 'Ecuador - Machala', 'America/Guayaquil', 80),
      ('ECUADOR_GALAPAGOS', 'Ecuador - Galapagos', 'Pacific/Galapagos', 90),

      -- Americas
      ('USA_NEW_YORK', 'Estados Unidos - New York', 'America/New_York', 110),
      ('USA_CHICAGO', 'Estados Unidos - Chicago', 'America/Chicago', 120),
      ('USA_DENVER', 'Estados Unidos - Denver', 'America/Denver', 130),
      ('USA_LOS_ANGELES', 'Estados Unidos - Los Angeles', 'America/Los_Angeles', 140),
      ('MEXICO_MEXICO_CITY', 'Mexico - Ciudad de Mexico', 'America/Mexico_City', 150),
      ('COLOMBIA_BOGOTA', 'Colombia - Bogota', 'America/Bogota', 160),
      ('PERU_LIMA', 'Peru - Lima', 'America/Lima', 170),
      ('CHILE_SANTIAGO', 'Chile - Santiago', 'America/Santiago', 180),
      ('ARGENTINA_BUENOS_AIRES', 'Argentina - Buenos Aires', 'America/Argentina/Buenos_Aires', 190),
      ('BRAZIL_SAO_PAULO', 'Brasil - Sao Paulo', 'America/Sao_Paulo', 200),

      -- Europe
      ('UK_LONDON', 'Reino Unido - Londres', 'Europe/London', 210),
      ('SPAIN_MADRID', 'Espana - Madrid', 'Europe/Madrid', 220),
      ('FRANCE_PARIS', 'Francia - Paris', 'Europe/Paris', 230),
      ('GERMANY_BERLIN', 'Alemania - Berlin', 'Europe/Berlin', 240),
      ('ITALY_ROME', 'Italia - Roma', 'Europe/Rome', 250),
      ('TURKEY_ISTANBUL', 'Turquia - Estambul', 'Europe/Istanbul', 260),
      ('RUSSIA_MOSCOW', 'Rusia - Moscu', 'Europe/Moscow', 270),

      -- Africa / Middle East
      ('EGYPT_CAIRO', 'Egipto - El Cairo', 'Africa/Cairo', 280),
      ('SOUTH_AFRICA_JOHANNESBURG', 'Sudafrica - Johannesburgo', 'Africa/Johannesburg', 290),
      ('UAE_DUBAI', 'EAU - Dubai', 'Asia/Dubai', 300),

      -- Asia / Oceania
      ('INDIA_DELHI', 'India - Nueva Delhi', 'Asia/Kolkata', 310),
      ('THAILAND_BANGKOK', 'Tailandia - Bangkok', 'Asia/Bangkok', 320),
      ('SINGAPORE', 'Singapur - Singapur', 'Asia/Singapore', 330),
      ('HONG_KONG', 'Hong Kong - Hong Kong', 'Asia/Hong_Kong', 340),
      ('CHINA_SHANGHAI', 'China - Shanghai', 'Asia/Shanghai', 350),
      ('JAPAN_TOKYO', 'Japon - Tokio', 'Asia/Tokyo', 360),
      ('SOUTH_KOREA_SEOUL', 'Corea del Sur - Seul', 'Asia/Seoul', 370),
      ('AUSTRALIA_SYDNEY', 'Australia - Sidney', 'Australia/Sydney', 380),
      ('NEW_ZEALAND_AUCKLAND', 'Nueva Zelanda - Auckland', 'Pacific/Auckland', 390)
  ) AS x(lookup_key, lookup_label, lookup_short_label, sort_order)
  ON CONFLICT ON CONSTRAINT uq_lookup_values
  DO UPDATE
     SET lookup_label = EXCLUDED.lookup_label,
         lookup_short_label = EXCLUDED.lookup_short_label,
         sort_order = EXCLUDED.sort_order,
         is_active = true,
         updated_by = 'SYSTEM',
         updated_at = now();
END $$;


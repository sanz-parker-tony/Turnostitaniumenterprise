-- Script: actualiza el menú de EMPLOYEE "Solicitar Marcaciones" -> "Gestionar Marcaciones"
-- Pantalla objetivo: KIOSK_TIME_PUNCH_REQUESTS

BEGIN;

UPDATE public.screens
   SET menu_label = 'Gestionar Marcaciones',
       updated_by = 'SYSTEM',
       updated_at = now()
 WHERE screen_key = 'KIOSK_TIME_PUNCH_REQUESTS';

-- Verificación
SELECT
  screen_key,
  screen_name,
  menu_label,
  route_path,
  is_active,
  updated_at
FROM public.screens
WHERE screen_key = 'KIOSK_TIME_PUNCH_REQUESTS';

COMMIT;


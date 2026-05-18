-- Renombra el menú de EMPLOYEE para KIOSK_TIME_PUNCH_REQUESTS
-- De: "Solicitar Marcaciones"
-- A:  "Gestionar Marcaciones"

UPDATE public.screens
   SET menu_label = 'Gestionar Marcaciones',
       updated_by = 'SYSTEM',
       updated_at = now()
 WHERE screen_key = 'KIOSK_TIME_PUNCH_REQUESTS'
   AND is_active = true;


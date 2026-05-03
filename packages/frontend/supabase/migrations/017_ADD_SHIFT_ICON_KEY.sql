-- ============================================================================
-- 017_ADD_SHIFT_ICON_KEY
-- Agrega icono configurable en turnos para visualizacion de planificacion
-- ============================================================================

SET search_path TO public;

ALTER TABLE IF EXISTS public.shifts
  ADD COLUMN IF NOT EXISTS shift_icon_key character varying;

UPDATE public.shifts
   SET shift_icon_key = CASE
     WHEN UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%LIBRE%'
       OR UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%DESCANSO%'
       OR UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%OFF%'
       OR UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%REST%'
       THEN 'Coffee'
     WHEN UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%NOCHE%'
       OR UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%NOC%'
       THEN 'Moon'
     WHEN UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%TARDE%'
       OR UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%VES%'
       THEN 'Sunset'
     WHEN UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%OFICINA%'
       OR UPPER(COALESCE(shift_name, '') || ' ' || COALESCE(shift_short_name, '')) LIKE '%OFFICE%'
       THEN 'Briefcase'
     ELSE 'Sun'
   END
 WHERE COALESCE(shift_icon_key, '') = '';

ALTER TABLE IF EXISTS public.shifts
  ALTER COLUMN shift_icon_key SET DEFAULT 'Sun';


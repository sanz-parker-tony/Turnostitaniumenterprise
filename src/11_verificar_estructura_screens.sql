-- =====================================================
-- VERIFICAR ESTRUCTURA DE LA TABLA SCREENS
-- =====================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'screens'
ORDER BY ordinal_position;

-- ============================================================================
-- 🌍 INSERTAR IDIOMAS DE EJEMPLO
-- ============================================================================
-- Ejecuta este script para tener idiomas de prueba
-- ============================================================================

-- Insertar idiomas básicos (Español, Inglés, Portugués)
INSERT INTO system_languages (code, language_name, is_active, is_default)
VALUES 
  ('ES', 'Español', true, true),
  ('EN', 'English', true, false),
  ('PT', 'Português', true, false)
ON CONFLICT (code) 
DO UPDATE SET 
  language_name = EXCLUDED.language_name,
  is_active = EXCLUDED.is_active;

-- Verificar
SELECT '✅ IDIOMAS INSERTADOS:' as resultado;
SELECT 
  code,
  language_name,
  is_active,
  is_default,
  created_at
FROM system_languages
ORDER BY is_default DESC, language_name;

-- ============================================================================
-- 🎉 AHORA PUEDES:
-- ============================================================================
-- 1. Crear nuevos idiomas desde la interfaz
-- 2. Editar las traducciones de los grupos de menú
-- 3. Agregar más idiomas si lo necesitas (FR, DE, IT, etc.)
-- ============================================================================

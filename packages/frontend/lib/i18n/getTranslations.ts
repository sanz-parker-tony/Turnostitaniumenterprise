/**
 * Translation Helper - Turnos Titanium Enterprise
 * Resuelve labels en español desde translations de BD
 */

import { createClient } from '@/utils/backend/client';

type TranslationEntity = 'menu_group' | 'screen' | 'action';

interface TranslationParams {
  entity: TranslationEntity;
  key: string;
  lang?: string;
  fallbackName?: string;
}

/**
 * Cache en memoria para translations (evitar queries repetidas)
 */
const translationsCache = new Map<string, string>();

/**
 * Obtiene el label traducido desde BD
 * 
 * @param entity - Tipo de entidad (menu_group, screen, action)
 * @param key - Key de la entidad (menu_group_key, screen_key, action_key)
 * @param lang - Código de idioma (default: 'es')
 * @param fallbackName - Nombre de fallback si no existe traducción
 * @returns Label traducido o fallback
 */
export async function getTranslation({
  entity,
  key,
  lang = 'es',
  fallbackName,
}: TranslationParams): Promise<string> {
  const cacheKey = `${entity}:${key}:${lang}`;

  // Buscar en cache
  if (translationsCache.has(cacheKey)) {
    return translationsCache.get(cacheKey)!;
  }

  const ApiClient = createClient();

  try {
    let tableName: string;
    let keyColumn: string;

    // Determinar tabla según entidad
    switch (entity) {
      case 'menu_group':
        tableName = 'menu_group_translations';
        keyColumn = 'menu_group_key';
        break;
      case 'screen':
        tableName = 'screen_translations';
        keyColumn = 'screen_key';
        break;
      case 'action':
        tableName = 'action_translations';
        keyColumn = 'action_key';
        break;
      default:
        console.warn(`[TRANSLATIONS] Entidad desconocida: ${entity}`);
        return fallbackName || key;
    }

    // Query a BD
    const { data, error } = await ApiClient
      .from(tableName)
      .select('translation')
      .eq(keyColumn, key)
      .eq('language_code', lang)
      .maybeSingle();

    if (error) {
      console.error(`[TRANSLATIONS] Error consultando ${tableName}:`, error);
      return fallbackName || key;
    }

    const translation = data?.translation || fallbackName || key;

    // Guardar en cache
    translationsCache.set(cacheKey, translation);

    return translation;
  } catch (err) {
    console.error('[TRANSLATIONS] Error inesperado:', err);
    return fallbackName || key;
  }
}

/**
 * Limpia el cache de translations (útil en dev)
 */
export function clearTranslationsCache() {
  translationsCache.clear();
  console.log('[TRANSLATIONS] Cache limpiado');
}

/**
 * Obtiene múltiples translations de una vez (batch)
 * 
 * @param entity - Tipo de entidad
 * @param keys - Array de keys
 * @param lang - Código de idioma
 * @returns Map con key → translation
 */
export async function getTranslationsBatch(
  entity: TranslationEntity,
  keys: string[],
  lang: string = 'es'
): Promise<Map<string, string>> {
  const ApiClient = createClient();
  const result = new Map<string, string>();

  try {
    let tableName: string;
    let keyColumn: string;

    switch (entity) {
      case 'menu_group':
        tableName = 'menu_group_translations';
        keyColumn = 'menu_group_key';
        break;
      case 'screen':
        tableName = 'screen_translations';
        keyColumn = 'screen_key';
        break;
      case 'action':
        tableName = 'action_translations';
        keyColumn = 'action_key';
        break;
      default:
        return result;
    }

    const { data, error } = await ApiClient
      .from(tableName)
      .select(`${keyColumn}, translation`)
      .in(keyColumn, keys)
      .eq('language_code', lang);

    if (error) {
      console.error(`[TRANSLATIONS] Error batch ${tableName}:`, error);
      return result;
    }

    // Mapear resultados
    data?.forEach((row: any) => {
      const key = row[keyColumn];
      const translation = row.translation;
      result.set(key, translation);
      // Guardar en cache individual
      translationsCache.set(`${entity}:${key}:${lang}`, translation);
    });

    return result;
  } catch (err) {
    console.error('[TRANSLATIONS] Error batch inesperado:', err);
    return result;
  }
}

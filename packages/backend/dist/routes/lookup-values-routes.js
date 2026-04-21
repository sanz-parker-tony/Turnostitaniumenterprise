/**
 * lookup-values-routes.ts
 * Turnos Titanium Enterprise
 *
 * Rutas para gestión de Valores de Catálogo (lookup_values)
 */
import { Router } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
const router = Router();
// ============================================================================
// GET /lookup-values?group_id=xxx - Listar valores por grupo
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const groupId = req.query.group_id;
        if (!groupId) {
            return res.status(400).json({ error: 'El parámetro group_id es obligatorio' });
        }
        const Postgres = createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
        const { data: values, error } = await Postgres
            .from('lookup_values')
            .select(`
        *,
        lookup_value_translations (
          id,
          language_code,
          label,
          short_label
        )
      `)
            .eq('lookup_group_id', groupId)
            .order('sort_order', { ascending: true });
        if (error) {
            console.error('[LOOKUP-VALUES] Error cargando valores:', error);
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({
            success: true,
            values: values || [],
            count: (values || []).length,
        });
    }
    catch (err) {
        console.error('[LOOKUP-VALUES] Error en GET /:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// ============================================================================
// GET /lookup-values/:id - Obtener un valor específico
// ============================================================================
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const Postgres = createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
        const { data: value, error } = await Postgres
            .from('lookup_values')
            .select(`
        *,
        lookup_value_translations (
          id,
          language_code,
          label,
          short_label
        )
      `)
            .eq('id', id)
            .single();
        if (error) {
            console.error('[LOOKUP-VALUES] Error cargando valor:', error);
            return res.status(500).json({ error: error.message });
        }
        if (!value) {
            return res.status(404).json({ error: 'Valor no encontrado' });
        }
        return res.status(200).json({
            success: true,
            value,
        });
    }
    catch (err) {
        console.error('[LOOKUP-VALUES] Error en GET /:id:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// ============================================================================
// POST /lookup-values - Crear nuevo valor
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const { lookup_group_id, lookup_key, lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, translations } = body;
        // Validaciones
        if (!lookup_group_id) {
            return res.status(400).json({ error: 'El grupo es obligatorio' });
        }
        if (!lookup_key?.trim()) {
            return res.status(400).json({ error: 'La clave es obligatoria' });
        }
        if (!lookup_label?.trim()) {
            return res.status(400).json({ error: 'La etiqueta es obligatoria' });
        }
        if (!lookup_short_label?.trim()) {
            return res.status(400).json({ error: 'La etiqueta corta es obligatoria' });
        }
        if (!lookup_scope || !['SYSTEM', 'TENANT'].includes(lookup_scope)) {
            return res.status(400).json({ error: 'El alcance debe ser SYSTEM o TENANT' });
        }
        // Validar formato de clave
        if (!/^[A-Z0-9_]+$/.test(lookup_key) || lookup_key.length < 2) {
            return res.status(400).json({
                error: 'La clave debe contener solo letras mayúsculas, números y guiones bajos (mínimo 2 caracteres)'
            });
        }
        const Postgres = createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
        // Verificar si ya existe (mismo grupo + tenant + key)
        const { data: existing } = await Postgres
            .from('lookup_values')
            .select('id')
            .eq('lookup_group_id', lookup_group_id)
            .eq('lookup_key', lookup_key.toUpperCase())
            .is('tenant_id', null)
            .maybeSingle();
        if (existing) {
            return res.status(409).json({
                error: `Ya existe un valor con la clave ${lookup_key} en este grupo`
            });
        }
        // Crear valor
        const { data: newValue, error: insertError } = await Postgres
            .from('lookup_values')
            .insert({
            lookup_group_id,
            tenant_id: null,
            lookup_key: lookup_key.toUpperCase(),
            lookup_label: lookup_label.trim(),
            lookup_short_label: lookup_short_label.trim(),
            lookup_scope: lookup_scope,
            sort_order: sort_order ?? 0,
            is_active: is_active ?? true,
            created_by: 'SYSTEM_ADMIN'
        })
            .select()
            .single();
        if (insertError) {
            console.error('[LOOKUP-VALUES] Error creando valor:', insertError);
            return res.status(500).json({ error: insertError.message });
        }
        // Crear traducciones si existen
        if (translations && Array.isArray(translations) && translations.length > 0) {
            const translationsToInsert = translations
                .filter(t => t.label?.trim() && t.short_label?.trim())
                .map(t => ({
                lookup_value_id: newValue.id,
                language_code: t.language_code,
                label: t.label.trim(),
                short_label: t.short_label.trim()
            }));
            if (translationsToInsert.length > 0) {
                const { error: transError } = await Postgres
                    .from('lookup_value_translations')
                    .insert(translationsToInsert);
                if (transError) {
                    console.error('[LOOKUP-VALUES] Error creando traducciones:', transError);
                }
            }
        }
        return res.status(201).json({
            success: true,
            value: newValue,
            message: 'Valor creado exitosamente',
        });
    }
    catch (err) {
        console.error('[LOOKUP-VALUES] Error en POST /:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// ============================================================================
// PUT /lookup-values/:id - Actualizar valor
// ============================================================================
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        const { lookup_label, lookup_short_label, lookup_scope, sort_order, is_active, translations } = body;
        // Validaciones
        if (!lookup_label?.trim()) {
            return res.status(400).json({ error: 'La etiqueta es obligatoria' });
        }
        if (!lookup_short_label?.trim()) {
            return res.status(400).json({ error: 'La etiqueta corta es obligatoria' });
        }
        if (lookup_scope && !['SYSTEM', 'TENANT'].includes(lookup_scope)) {
            return res.status(400).json({ error: 'El alcance debe ser SYSTEM o TENANT' });
        }
        const Postgres = createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
        // Actualizar valor
        const updateData = {
            lookup_label: lookup_label.trim(),
            lookup_short_label: lookup_short_label.trim(),
            is_active: is_active ?? true,
            updated_by: 'SYSTEM_ADMIN',
            updated_at: new Date().toISOString()
        };
        if (lookup_scope) {
            updateData.lookup_scope = lookup_scope;
        }
        if (sort_order !== undefined) {
            updateData.sort_order = sort_order;
        }
        const { data: updatedValue, error: updateError } = await Postgres
            .from('lookup_values')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (updateError) {
            console.error('[LOOKUP-VALUES] Error actualizando valor:', updateError);
            return res.status(500).json({ error: updateError.message });
        }
        // Actualizar traducciones si existen
        if (translations && Array.isArray(translations)) {
            // Eliminar traducciones existentes
            await Postgres
                .from('lookup_value_translations')
                .delete()
                .eq('lookup_value_id', id);
            // Insertar nuevas
            const translationsToInsert = translations
                .filter(t => t.label?.trim() && t.short_label?.trim())
                .map(t => ({
                lookup_value_id: id,
                language_code: t.language_code,
                label: t.label.trim(),
                short_label: t.short_label.trim()
            }));
            if (translationsToInsert.length > 0) {
                const { error: transError } = await Postgres
                    .from('lookup_value_translations')
                    .insert(translationsToInsert);
                if (transError) {
                    console.error('[LOOKUP-VALUES] Error actualizando traducciones:', transError);
                }
            }
        }
        return res.status(200).json({
            success: true,
            value: updatedValue,
            message: 'Valor actualizado exitosamente',
        });
    }
    catch (err) {
        console.error('[LOOKUP-VALUES] Error en PUT /:id:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
export default router;
//# sourceMappingURL=lookup-values-routes.js.map
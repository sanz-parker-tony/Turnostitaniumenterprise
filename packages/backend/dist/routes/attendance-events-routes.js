/**
 * attendance-events-routes.ts
 * Turnos Titanium Enterprise
 *
 * Rutas para gestión de Novedades de Asistencia (attendance_events)
 */
import { Router } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
const router = Router();
// ============================================================================
// GET /attendance-events - Listar todas las novedades
// ============================================================================
router.get('/', async (req, res) => {
    try {
        const Postgres = createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
        // Query principal con JOINs para obtener labels
        const { data: events, error } = await Postgres
            .from('attendance_events')
            .select(`
        *,
        transaction_direction:lookup_values!attendance_events_transaction_direction_id_fkey(lookup_key, lookup_label),
        event_type:lookup_values!attendance_events_event_type_id_fkey(lookup_key, lookup_label),
        movement:attendance_movements!attendance_events_movement_id_fkey(movement_short_name, movement_name),
        calculation_method:lookup_values!attendance_events_calculation_method_id_fkey(lookup_key, lookup_label)
      `)
            .order('event_short_name', { ascending: true });
        if (error) {
            console.error('[ATTENDANCE-EVENTS] Error cargando novedades:', error);
            return res.status(500).json({ error: error.message });
        }
        // Transformar datos para incluir labels desnormalizados
        const eventsWithLabels = (events || []).map((event) => ({
            ...event,
            transaction_direction_key: event.transaction_direction?.lookup_key || null,
            transaction_direction_label: event.transaction_direction?.lookup_label || null,
            event_type_key: event.event_type?.lookup_key || null,
            event_type_label: event.event_type?.lookup_label || null,
            movement_code: event.movement?.movement_short_name || null,
            calculation_method_label: event.calculation_method?.lookup_label || null,
        }));
        return res.status(200).json({
            success: true,
            events: eventsWithLabels,
            count: eventsWithLabels.length,
        });
    }
    catch (err) {
        console.error('[ATTENDANCE-EVENTS] Error en GET /:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// ============================================================================
// GET /attendance-events/:id - Obtener una novedad específica
// ============================================================================
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const Postgres = createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
        const { data: event, error } = await Postgres
            .from('attendance_events')
            .select(`
        *,
        transaction_direction:lookup_values!attendance_events_transaction_direction_id_fkey(lookup_key, lookup_label),
        event_type:lookup_values!attendance_events_event_type_id_fkey(lookup_key, lookup_label),
        movement:attendance_movements!attendance_events_movement_id_fkey(movement_short_name, movement_name),
        calculation_method:lookup_values!attendance_events_calculation_method_id_fkey(lookup_key, lookup_label)
      `)
            .eq('id', id)
            .single();
        if (error) {
            console.error('[ATTENDANCE-EVENTS] Error cargando novedad:', error);
            return res.status(500).json({ error: error.message });
        }
        if (!event) {
            return res.status(404).json({ error: 'Novedad no encontrada' });
        }
        return res.status(200).json({
            success: true,
            event: {
                ...event,
                transaction_direction_label: event.transaction_direction?.lookup_label || null,
                event_type_label: event.event_type?.lookup_label || null,
                movement_code: event.movement?.movement_short_name || null,
                calculation_method_label: event.calculation_method?.lookup_label || null,
            },
        });
    }
    catch (err) {
        console.error('[ATTENDANCE-EVENTS] Error en GET /:id:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// ============================================================================
// POST /attendance-events - Crear nueva novedad
// ============================================================================
router.post('/', async (req, res) => {
    try {
        const body = req.body;
        const { tenant_id, event_name, event_short_name, tolerance_minutes, weight_value, transaction_direction_id, event_type_id, movement_id, calculation_method_id, external_mapping, is_active = true, } = body;
        // Validaciones
        if (!event_name || !event_short_name || !tenant_id) {
            return res.status(400).json({ error: 'Campos obligatorios: event_name, event_short_name, tenant_id' });
        }
        if (tolerance_minutes < 0 || weight_value < 0) {
            return res.status(400).json({ error: 'Tolerancia y peso deben ser >= 0' });
        }
        const Postgres = createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
        // Verificar unicidad de event_short_name por tenant
        const { data: existing } = await Postgres
            .from('attendance_events')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('event_short_name', event_short_name.toUpperCase())
            .maybeSingle();
        if (existing) {
            return res.status(409).json({ error: 'Ya existe una novedad con ese código corto' });
        }
        // Insertar nueva novedad
        const { data: newEvent, error } = await Postgres
            .from('attendance_events')
            .insert({
            tenant_id,
            event_name,
            event_short_name: event_short_name.toUpperCase(),
            tolerance_minutes: parseInt(tolerance_minutes),
            weight_value: parseInt(weight_value),
            transaction_direction_id,
            event_type_id,
            movement_id,
            calculation_method_id,
            external_mapping: external_mapping || null,
            is_active,
            created_by: 'system',
        })
            .select()
            .single();
        if (error) {
            console.error('[ATTENDANCE-EVENTS] Error creando novedad:', error);
            return res.status(500).json({ error: error.message });
        }
        return res.status(201).json({
            success: true,
            event: newEvent,
            message: 'Novedad creada exitosamente',
        });
    }
    catch (err) {
        console.error('[ATTENDANCE-EVENTS] Error en POST /:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// ============================================================================
// PUT /attendance-events/:id - Actualizar novedad
// ============================================================================
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        const { event_name, event_short_name, tolerance_minutes, weight_value, transaction_direction_id, event_type_id, movement_id, calculation_method_id, external_mapping, is_active, } = body;
        // Validaciones
        if (tolerance_minutes !== undefined && tolerance_minutes < 0) {
            return res.status(400).json({ error: 'Tolerancia debe ser >= 0' });
        }
        if (weight_value !== undefined && weight_value < 0) {
            return res.status(400).json({ error: 'Peso debe ser >= 0' });
        }
        const Postgres = createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
        // Verificar que la novedad existe
        const { data: existing } = await Postgres
            .from('attendance_events')
            .select('tenant_id, event_short_name')
            .eq('id', id)
            .maybeSingle();
        if (!existing) {
            return res.status(404).json({ error: 'Novedad no encontrada' });
        }
        // Si se cambia event_short_name, verificar unicidad
        if (event_short_name && event_short_name.toUpperCase() !== existing.event_short_name) {
            const { data: duplicate } = await Postgres
                .from('attendance_events')
                .select('id')
                .eq('tenant_id', existing.tenant_id)
                .eq('event_short_name', event_short_name.toUpperCase())
                .neq('id', id)
                .maybeSingle();
            if (duplicate) {
                return res.status(409).json({ error: 'Ya existe una novedad con ese código corto' });
            }
        }
        // Actualizar novedad
        const updateData = {
            updated_by: 'system',
            updated_at: new Date().toISOString(),
        };
        if (event_name !== undefined)
            updateData.event_name = event_name;
        if (event_short_name !== undefined)
            updateData.event_short_name = event_short_name.toUpperCase();
        if (tolerance_minutes !== undefined)
            updateData.tolerance_minutes = parseInt(tolerance_minutes);
        if (weight_value !== undefined)
            updateData.weight_value = parseInt(weight_value);
        if (transaction_direction_id !== undefined)
            updateData.transaction_direction_id = transaction_direction_id;
        if (event_type_id !== undefined)
            updateData.event_type_id = event_type_id;
        if (movement_id !== undefined)
            updateData.movement_id = movement_id;
        if (calculation_method_id !== undefined)
            updateData.calculation_method_id = calculation_method_id;
        if (external_mapping !== undefined)
            updateData.external_mapping = external_mapping || null;
        if (is_active !== undefined)
            updateData.is_active = is_active;
        const { data: updatedEvent, error } = await Postgres
            .from('attendance_events')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('[ATTENDANCE-EVENTS] Error actualizando novedad:', error);
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({
            success: true,
            event: updatedEvent,
            message: 'Novedad actualizada exitosamente',
        });
    }
    catch (err) {
        console.error('[ATTENDANCE-EVENTS] Error en PUT /:id:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// ============================================================================
// PATCH /attendance-events/:id/status - Activar/Desactivar novedad
// ============================================================================
router.patch('/:id/status', async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        const { is_active } = body;
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
        }
        const Postgres = createDbClient(process.env.Postgres_URL || '', process.env.Postgres_SERVICE_ROLE_KEY || '');
        const { data: updatedEvent, error } = await Postgres
            .from('attendance_events')
            .update({
            is_active,
            updated_by: 'system',
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('[ATTENDANCE-EVENTS] Error actualizando estado:', error);
            return res.status(500).json({ error: error.message });
        }
        if (!updatedEvent) {
            return res.status(404).json({ error: 'Novedad no encontrada' });
        }
        return res.status(200).json({
            success: true,
            event: updatedEvent,
            message: `Novedad ${is_active ? 'activada' : 'desactivada'} exitosamente`,
        });
    }
    catch (err) {
        console.error('[ATTENDANCE-EVENTS] Error en PATCH /:id/status:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});
export default router;
//# sourceMappingURL=attendance-events-routes.js.map
/**
 * attendance-events-routes.tsx
 * Turnos Titanium Enterprise
 * 
 * Rutas para gestión de Novedades de Asistencia (attendance_events)
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// ============================================================================
// GET /attendance-events - Listar todas las novedades
// ============================================================================

app.get('/', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Query principal con JOINs para obtener labels
    const { data: events, error } = await supabase
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
      return c.json({ error: error.message }, 500);
    }

    // Transformar datos para incluir labels desnormalizados
    const eventsWithLabels = (events || []).map(event => ({
      ...event,
      transaction_direction_key: event.transaction_direction?.lookup_key || null,
      transaction_direction_label: event.transaction_direction?.lookup_label || null,
      event_type_key: event.event_type?.lookup_key || null,
      event_type_label: event.event_type?.lookup_label || null,
      movement_code: event.movement?.movement_short_name || null,
      calculation_method_label: event.calculation_method?.lookup_label || null,
    }));

    return c.json({
      success: true,
      events: eventsWithLabels,
      count: eventsWithLabels.length,
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en GET /:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// GET /attendance-events/:id - Obtener una novedad específica
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: event, error } = await supabase
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
      return c.json({ error: error.message }, 500);
    }

    if (!event) {
      return c.json({ error: 'Novedad no encontrada' }, 404);
    }

    return c.json({
      success: true,
      event: {
        ...event,
        transaction_direction_label: event.transaction_direction?.lookup_label || null,
        event_type_label: event.event_type?.lookup_label || null,
        movement_code: event.movement?.movement_short_name || null,
        calculation_method_label: event.calculation_method?.lookup_label || null,
      },
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en GET /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// POST /attendance-events - Crear nueva novedad
// ============================================================================

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      tenant_id,
      event_name,
      event_short_name,
      tolerance_minutes,
      weight_value,
      transaction_direction_id,
      event_type_id,
      movement_id,
      calculation_method_id,
      external_mapping,
      is_active = true,
    } = body;

    // Validaciones
    if (!event_name || !event_short_name || !tenant_id) {
      return c.json({ error: 'Campos obligatorios: event_name, event_short_name, tenant_id' }, 400);
    }

    if (tolerance_minutes < 0 || weight_value < 0) {
      return c.json({ error: 'Tolerancia y peso deben ser >= 0' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar unicidad de event_short_name por tenant
    const { data: existing } = await supabase
      .from('attendance_events')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('event_short_name', event_short_name.toUpperCase())
      .maybeSingle();

    if (existing) {
      return c.json({ error: 'Ya existe una novedad con ese código corto' }, 409);
    }

    // Insertar nueva novedad
    const { data: newEvent, error } = await supabase
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
        created_by: 'system', // TODO: Obtener del token
      })
      .select()
      .single();

    if (error) {
      console.error('[ATTENDANCE-EVENTS] Error creando novedad:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      event: newEvent,
      message: 'Novedad creada exitosamente',
    }, 201);

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en POST /:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// PUT /attendance-events/:id - Actualizar novedad
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const {
      event_name,
      event_short_name,
      tolerance_minutes,
      weight_value,
      transaction_direction_id,
      event_type_id,
      movement_id,
      calculation_method_id,
      external_mapping,
      is_active,
    } = body;

    // Validaciones
    if (tolerance_minutes !== undefined && tolerance_minutes < 0) {
      return c.json({ error: 'Tolerancia debe ser >= 0' }, 400);
    }

    if (weight_value !== undefined && weight_value < 0) {
      return c.json({ error: 'Peso debe ser >= 0' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar que la novedad existe
    const { data: existing } = await supabase
      .from('attendance_events')
      .select('tenant_id, event_short_name')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return c.json({ error: 'Novedad no encontrada' }, 404);
    }

    // Si se cambia event_short_name, verificar unicidad
    if (event_short_name && event_short_name.toUpperCase() !== existing.event_short_name) {
      const { data: duplicate } = await supabase
        .from('attendance_events')
        .select('id')
        .eq('tenant_id', existing.tenant_id)
        .eq('event_short_name', event_short_name.toUpperCase())
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return c.json({ error: 'Ya existe una novedad con ese código corto' }, 409);
      }
    }

    // Actualizar novedad
    const updateData: any = {
      updated_by: 'system', // TODO: Obtener del token
      updated_at: new Date().toISOString(),
    };

    if (event_name !== undefined) updateData.event_name = event_name;
    if (event_short_name !== undefined) updateData.event_short_name = event_short_name.toUpperCase();
    if (tolerance_minutes !== undefined) updateData.tolerance_minutes = parseInt(tolerance_minutes);
    if (weight_value !== undefined) updateData.weight_value = parseInt(weight_value);
    if (transaction_direction_id !== undefined) updateData.transaction_direction_id = transaction_direction_id;
    if (event_type_id !== undefined) updateData.event_type_id = event_type_id;
    if (movement_id !== undefined) updateData.movement_id = movement_id;
    if (calculation_method_id !== undefined) updateData.calculation_method_id = calculation_method_id;
    if (external_mapping !== undefined) updateData.external_mapping = external_mapping || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedEvent, error } = await supabase
      .from('attendance_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ATTENDANCE-EVENTS] Error actualizando novedad:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      event: updatedEvent,
      message: 'Novedad actualizada exitosamente',
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en PUT /:id:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// PATCH /attendance-events/:id/status - Activar/Desactivar novedad
// ============================================================================

app.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return c.json({ error: 'El campo is_active debe ser booleano' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: updatedEvent, error } = await supabase
      .from('attendance_events')
      .update({
        is_active,
        updated_by: 'system', // TODO: Obtener del token
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ATTENDANCE-EVENTS] Error actualizando estado:', error);
      return c.json({ error: error.message }, 500);
    }

    if (!updatedEvent) {
      return c.json({ error: 'Novedad no encontrada' }, 404);
    }

    return c.json({
      success: true,
      event: updatedEvent,
      message: `Novedad ${is_active ? 'activada' : 'desactivada'} exitosamente`,
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en PATCH /:id/status:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// ============================================================================
// GET /attendance-movements - Listar movimientos de asistencia
// ============================================================================

app.get('/catalogs/movements', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: movements, error } = await supabase
      .from('attendance_movements')
      .select('*')
      .order('movement_short_name', { ascending: true });

    if (error) {
      console.error('[ATTENDANCE-EVENTS] Error cargando movimientos:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      movements: movements || [],
      count: (movements || []).length,
    });

  } catch (err) {
    console.error('[ATTENDANCE-EVENTS] Error en GET /catalogs/movements:', err);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

export default app;
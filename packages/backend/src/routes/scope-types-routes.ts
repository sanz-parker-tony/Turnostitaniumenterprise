/**
 * scope-types-routes.ts
 * Turnos Titanium Enterprise
 *
 * CRUD para la tabla scope_types
 * Ubicación: Mantenimiento → Alcances
 *
 * Política: NO se pueden eliminar registros.
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

function getPostgres() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

// ============================================================================
// GET / - Listar tipos de alcance
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();

    const { data: scopeTypes, error } = await Postgres
      .from('scope_types')
      .select('*')
      .order('scope_type_key', { ascending: true });

    if (error) {
      console.error('[SCOPE-TYPES] Error cargando scope_types:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, scopeTypes: scopeTypes || [], count: (scopeTypes || []).length });
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// GET /:id - Obtener un tipo de alcance específico
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const Postgres = getPostgres();

    const { data: scopeType, error } = await Postgres
      .from('scope_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !scopeType) {
      return res.status(404).json({ error: 'Tipo de alcance no encontrado' });
    }

    return res.status(200).json({ success: true, scopeType });
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en GET /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// POST / - Crear tipo de alcance
// ============================================================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { scope_type_key, scope_type_name, is_active = true } = body;

    if (!scope_type_key || !scope_type_name) {
      return res.status(400).json({ error: 'Campos obligatorios: scope_type_key, scope_type_name' });
    }

    if (scope_type_key.length > 80) {
      return res.status(400).json({ error: 'scope_type_key no puede superar 80 caracteres' });
    }

    const Postgres = getPostgres();

    // Verificar unicidad
    const { data: existing } = await Postgres
      .from('scope_types')
      .select('id')
      .eq('scope_type_key', scope_type_key.toUpperCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Ya existe un tipo de alcance con esa clave' });
    }

    const { data: newScopeType, error } = await Postgres
      .from('scope_types')
      .insert({
        scope_type_key: scope_type_key.toUpperCase(),
        scope_type_name,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[SCOPE-TYPES] Error creando scope_type:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, scopeType: newScopeType, message: 'Tipo de alcance creado exitosamente' });
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en POST /:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// PUT /:id - Actualizar tipo de alcance
// ============================================================================

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { scope_type_key, scope_type_name, is_active } = body;

    const Postgres = getPostgres();

    const { data: existing } = await Postgres
      .from('scope_types')
      .select('scope_type_key')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Tipo de alcance no encontrado' });
    }

    // Si se cambia scope_type_key, verificar unicidad
    if (scope_type_key && scope_type_key.toUpperCase() !== existing.scope_type_key) {
      const { data: dup } = await Postgres
        .from('scope_types')
        .select('id')
        .eq('scope_type_key', scope_type_key.toUpperCase())
        .neq('id', id)
        .maybeSingle();

      if (dup) {
        return res.status(409).json({ error: 'Ya existe un tipo de alcance con esa clave' });
      }
    }

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (scope_type_key !== undefined) updateData.scope_type_key = scope_type_key.toUpperCase();
    if (scope_type_name !== undefined) updateData.scope_type_name = scope_type_name;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedScopeType, error } = await Postgres
      .from('scope_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SCOPE-TYPES] Error actualizando scope_type:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, scopeType: updatedScopeType, message: 'Tipo de alcance actualizado exitosamente' });
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en PUT /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// PATCH /:id/status - Activar/Desactivar tipo de alcance
// ============================================================================

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
    }

    const Postgres = getPostgres();

    const { data: updatedScopeType, error } = await Postgres
      .from('scope_types')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SCOPE-TYPES] Error actualizando estado:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!updatedScopeType) {
      return res.status(404).json({ error: 'Tipo de alcance no encontrado' });
    }

    return res.status(200).json({
      success: true,
      scopeType: updatedScopeType,
      message: `Tipo de alcance ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[SCOPE-TYPES] Error en PATCH /:id/status:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

export default router;


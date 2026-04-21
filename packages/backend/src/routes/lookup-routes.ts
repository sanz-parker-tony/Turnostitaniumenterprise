/**
 * lookup-routes.ts
 * Turnos Titanium Enterprise
 * 
 * Rutas para obtener lookup_values por grupo
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

// ============================================================================
// GET /lookup-values?group=XXX - Obtener valores de lookup por grupo
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const group = req.query.group as string;

    if (!group) {
      return res.status(400).json({ error: 'El parámetro group es obligatorio' });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    // Obtener el lookup_group
    const { data: lookupGroup, error: groupError } = await Postgres
      .from('lookup_groups')
      .select('id')
      .eq('lookup_group_key', group)
      .maybeSingle();

    if (groupError) {
      console.error('[LOOKUP] Error buscando grupo:', groupError);
      return res.status(500).json({ error: groupError.message });
    }

    if (!lookupGroup) {
      return res.status(200).json({ 
        success: true,
        values: [],
        message: `Grupo ${group} no encontrado` 
      });
    }

    // Obtener los valores
    const { data: values, error: valuesError } = await Postgres
      .from('lookup_values')
      .select('id, lookup_key, lookup_label, lookup_short_label, is_active, sort_order')
      .eq('lookup_group_id', lookupGroup.id)
      .order('sort_order', { ascending: true });

    if (valuesError) {
      console.error('[LOOKUP] Error obteniendo valores:', valuesError);
      return res.status(500).json({ error: valuesError.message });
    }

    return res.status(200).json({
      success: true,
      group,
      values: values || [],
      count: (values || []).length,
    });

  } catch (err) {
    console.error('[LOOKUP] Error en GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;


/**
 * lookup-groups-routes.ts
 * Turnos Titanium Enterprise
 * 
 * Rutas para gestión de Grupos de Catálogo (lookup_groups)
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

// ============================================================================
// GET /lookup-groups - Listar todos los grupos
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    const { data: groups, error } = await Postgres
      .from('lookup_groups')
      .select(`
        *,
        lookup_group_translations (
          id,
          language_code,
          label,
          short_label
        )
      `)
      .order('lookup_group_key', { ascending: true });

    if (error) {
      console.error('[LOOKUP-GROUPS] Error cargando grupos:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      groups: groups || [],
      count: (groups || []).length,
    });

  } catch (err) {
    console.error('[LOOKUP-GROUPS] Error en GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// GET /lookup-groups/:id - Obtener un grupo específico
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    const { data: group, error } = await Postgres
      .from('lookup_groups')
      .select(`
        *,
        lookup_group_translations (
          id,
          language_code,
          label,
          short_label
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[LOOKUP-GROUPS] Error cargando grupo:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    return res.status(200).json({
      success: true,
      group,
    });

  } catch (err) {
    console.error('[LOOKUP-GROUPS] Error en GET /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// POST /lookup-groups - Crear nuevo grupo
// ============================================================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const {
      lookup_group_key,
      lookup_group_label,
      lookup_group_short_label,
      allows_tenant_items,
      is_active,
      translations
    } = body;

    // Validaciones
    if (!lookup_group_key?.trim()) {
      return res.status(400).json({ error: 'La clave del grupo es obligatoria' });
    }

    if (!lookup_group_label?.trim()) {
      return res.status(400).json({ error: 'La etiqueta del grupo es obligatoria' });
    }

    if (!lookup_group_short_label?.trim()) {
      return res.status(400).json({ error: 'La etiqueta corta del grupo es obligatoria' });
    }

    // Validar formato de clave
    if (!/^[A-Z0-9_]+$/.test(lookup_group_key)) {
      return res.status(400).json({ 
        error: 'La clave debe contener solo letras mayúsculas, números y guiones bajos' 
      });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    // Verificar si ya existe
    const { data: existing } = await Postgres
      .from('lookup_groups')
      .select('id')
      .eq('lookup_group_key', lookup_group_key.toUpperCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ 
        error: `Ya existe un grupo con la clave ${lookup_group_key}` 
      });
    }

    // Crear grupo
    const { data: newGroup, error: insertError } = await Postgres
      .from('lookup_groups')
      .insert({
        lookup_group_key: lookup_group_key.toUpperCase(),
        lookup_group_label: lookup_group_label.trim(),
        lookup_group_short_label: lookup_group_short_label.trim(),
        allows_tenant_items: allows_tenant_items ?? false,
        is_active: is_active ?? true,
        created_by: 'SYSTEM_ADMIN'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[LOOKUP-GROUPS] Error creando grupo:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Crear traducciones si existen
    if (translations && Array.isArray(translations) && translations.length > 0) {
      const translationsToInsert = translations
        .filter(t => t.label?.trim() && t.short_label?.trim())
        .map(t => ({
          lookup_group_id: newGroup.id,
          language_code: t.language_code,
          label: t.label.trim(),
          short_label: t.short_label.trim()
        }));

      if (translationsToInsert.length > 0) {
        const { error: transError } = await Postgres
          .from('lookup_group_translations')
          .insert(translationsToInsert);

        if (transError) {
          console.error('[LOOKUP-GROUPS] Error creando traducciones:', transError);
        }
      }
    }

    return res.status(201).json({
      success: true,
      group: newGroup,
      message: 'Grupo creado exitosamente',
    });

  } catch (err) {
    console.error('[LOOKUP-GROUPS] Error en POST /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// PUT /lookup-groups/:id - Actualizar grupo
// ============================================================================

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const {
      lookup_group_label,
      lookup_group_short_label,
      allows_tenant_items,
      is_active,
      translations
    } = body;

    // Validaciones
    if (!lookup_group_label?.trim()) {
      return res.status(400).json({ error: 'La etiqueta del grupo es obligatoria' });
    }

    if (!lookup_group_short_label?.trim()) {
      return res.status(400).json({ error: 'La etiqueta corta del grupo es obligatoria' });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    // Actualizar grupo
    const { data: updatedGroup, error: updateError } = await Postgres
      .from('lookup_groups')
      .update({
        lookup_group_label: lookup_group_label.trim(),
        lookup_group_short_label: lookup_group_short_label.trim(),
        allows_tenant_items: allows_tenant_items ?? false,
        is_active: is_active ?? true,
        updated_by: 'SYSTEM_ADMIN',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[LOOKUP-GROUPS] Error actualizando grupo:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Actualizar traducciones si existen
    if (translations && Array.isArray(translations)) {
      // Eliminar traducciones existentes
      await Postgres
        .from('lookup_group_translations')
        .delete()
        .eq('lookup_group_id', id);

      // Insertar nuevas traducciones
      const translationsToInsert = translations
        .filter(t => t.label?.trim() && t.short_label?.trim())
        .map(t => ({
          lookup_group_id: id,
          language_code: t.language_code,
          label: t.label.trim(),
          short_label: t.short_label.trim()
        }));

      if (translationsToInsert.length > 0) {
        const { error: transError } = await Postgres
          .from('lookup_group_translations')
          .insert(translationsToInsert);

        if (transError) {
          console.error('[LOOKUP-GROUPS] Error actualizando traducciones:', transError);
        }
      }
    }

    return res.status(200).json({
      success: true,
      group: updatedGroup,
      message: 'Grupo actualizado exitosamente',
    });

  } catch (err) {
    console.error('[LOOKUP-GROUPS] Error en PUT /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;


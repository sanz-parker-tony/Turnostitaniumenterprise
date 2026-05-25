/**
 * lookup-groups-routes.ts
 * Turnos Titanium Enterprise
 * 
 * Rutas para gestión de Grupos de Catálogo (lookup_groups)
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
import { pool } from '../lib/db.js';

const router = Router();

type AuthContext = {
  userId: string;
  tenantId: string;
  authUserId: string;
};

async function resolveAuthContext(req: Request): Promise<AuthContext | null> {
  const authUserId = String((req as any)?.user?.id || '').trim();
  if (!authUserId) return null;

  const userResult = await pool.query(
    `
      SELECT u.id AS user_id, u.tenant_id
      FROM users u
      WHERE u.auth_user_id = $1
        AND u.is_active = true
      LIMIT 1
    `,
    [authUserId]
  );

  const row = userResult.rows[0];
  if (!row?.user_id || !row?.tenant_id) return null;
  return {
    userId: String(row.user_id),
    tenantId: String(row.tenant_id),
    authUserId,
  };
}

async function hasRole(ctx: AuthContext, roleKey: 'SYSTEM_ADMIN' | 'TENANT_ADMIN'): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM user_roles ur
      JOIN roles r
        ON r.id = ur.role_id
       AND r.is_active = true
      WHERE ur.user_id = $1
        AND ur.tenant_id = $2
        AND ur.is_active = true
        AND r.role_key = $3
      LIMIT 1
    `,
    [ctx.userId, ctx.tenantId, roleKey]
  );

  return result.rows.length > 0;
}

// ============================================================================
// GET /lookup-groups - Listar todos los grupos
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    const isSystemAdmin = ctx ? await hasRole(ctx, 'SYSTEM_ADMIN') : false;
    const isTenantAdmin = ctx ? await hasRole(ctx, 'TENANT_ADMIN') : false;

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

    let filteredGroups = groups || [];
    if (ctx && isTenantAdmin && !isSystemAdmin) {
      const ownTag = `TENANT_ADMIN:${ctx.tenantId}`;
      filteredGroups = filteredGroups.filter((g: any) => {
        const createdBy = String(g?.created_by || '');
        const isTenantOwnedByAny = createdBy.startsWith('TENANT_ADMIN:');
        if (!isTenantOwnedByAny) return true; // grupo de sistema/global
        return createdBy === ownTag; // solo sus grupos tenant
      });
    }

    const groupsWithFlags = filteredGroups.map((g: any) => {
      const createdBy = String(g?.created_by || '');
      const ownerTenantId = createdBy.startsWith('TENANT_ADMIN:') ? createdBy.replace('TENANT_ADMIN:', '') : null;
      const isTenantCatalog = !!ownerTenantId;
      const canEditForCurrentUser = isSystemAdmin || (ctx ? ownerTenantId === ctx.tenantId : false);
      return {
        ...g,
        owner_tenant_id: ownerTenantId,
        is_tenant_catalog: isTenantCatalog,
        can_edit_for_current_user: canEditForCurrentUser,
      };
    });

    return res.status(200).json({
      success: true,
      groups: groupsWithFlags,
      count: groupsWithFlags.length,
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

    const { data: translations, error: transError } = await Postgres
      .from('lookup_group_translations')
      .select('id, language_code, label, short_label')
      .eq('lookup_group_id', id)
      .order('language_code', { ascending: true });

    if (transError) {
      console.error('[LOOKUP-GROUPS] Error cargando traducciones del grupo:', transError);
      return res.status(500).json({ error: transError.message });
    }

    const groupWithTranslations = {
      ...group,
      lookup_group_translations: translations || []
    };

    return res.status(200).json({
      success: true,
      group: groupWithTranslations,
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
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const [isSystemAdmin, isTenantAdmin] = await Promise.all([
      hasRole(ctx, 'SYSTEM_ADMIN'),
      hasRole(ctx, 'TENANT_ADMIN'),
    ]);

    if (!isSystemAdmin && !isTenantAdmin) {
      return res.status(403).json({ error: 'Solo SYSTEM_ADMIN o TENANT_ADMIN puede crear grupos de catalogo' });
    }

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
        allows_tenant_items: isSystemAdmin ? (allows_tenant_items ?? false) : true,
        is_active: is_active ?? true,
        created_by: isSystemAdmin ? 'SYSTEM_ADMIN' : `TENANT_ADMIN:${ctx.tenantId}`
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
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const [isSystemAdmin, isTenantAdmin] = await Promise.all([
      hasRole(ctx, 'SYSTEM_ADMIN'),
      hasRole(ctx, 'TENANT_ADMIN'),
    ]);
    if (!isSystemAdmin && !isTenantAdmin) {
      return res.status(403).json({ error: 'No autorizado para editar grupos de catalogo' });
    }

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

    const { data: existingGroup, error: existingGroupError } = await Postgres
      .from('lookup_groups')
      .select('id, created_by, allows_tenant_items')
      .eq('id', id)
      .maybeSingle();

    if (existingGroupError) {
      return res.status(500).json({ error: existingGroupError.message });
    }
    if (!existingGroup) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    if (!isSystemAdmin) {
      const ownerTag = `TENANT_ADMIN:${ctx.tenantId}`;
      if (String(existingGroup.created_by || '') !== ownerTag) {
        return res.status(403).json({
          error: 'TENANT_ADMIN solo puede editar grupos de catalogo creados por su tenant'
        });
      }
    }

    // Actualizar grupo
    const { data: updatedGroup, error: updateError } = await Postgres
      .from('lookup_groups')
      .update({
        lookup_group_label: lookup_group_label.trim(),
        lookup_group_short_label: lookup_group_short_label.trim(),
        allows_tenant_items: isSystemAdmin ? (allows_tenant_items ?? false) : true,
        is_active: is_active ?? true,
        updated_by: isSystemAdmin ? 'SYSTEM_ADMIN' : `TENANT_ADMIN:${ctx.tenantId}`,
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


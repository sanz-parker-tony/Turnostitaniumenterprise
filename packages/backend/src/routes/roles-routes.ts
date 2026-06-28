/**
 * roles-routes.ts
 * Turnos Titanium Enterprise
 *
 * CRUD para la tabla roles
 * Ubicación: Mantenimiento → Roles
 *
 * IMPORTANTE: Las rutas estáticas (/catalogs/*) van ANTES de las rutas
 * dinámicas (/:id) para evitar que Express capture "catalogs" como un UUID.
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
// CATÁLOGOS — deben ir ANTES de /:id para que Express no los capture como UUID
// ============================================================================

// GET /catalogs/tenants - Tenants disponibles (para el selector)
router.get('/catalogs/tenants', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data: tenants, error } = await Postgres
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .order('tenant_name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, tenants: tenants || [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// GET / - Listar roles
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();

    const { data: roles, error } = await Postgres
      .from('roles')
      .select(`
        *,
        tenant:tenants!roles_tenant_id_fkey(tenant_key, tenant_name)
      `)
      .order('role_scope', { ascending: true })
      .order('role_key', { ascending: true });

    if (error) {
      console.error('[ROLES] Error cargando roles:', error);
      return res.status(500).json({ error: error.message });
    }

    // Self-join manual para evitar problemas con el hint de FK en PostgREST
    const baseRoleIds = [...new Set((roles || []).map((r: any) => r.base_role_id).filter(Boolean))];
    let baseRolesMap: Record<string, { role_key: string; role_name: string }> = {};

    if (baseRoleIds.length > 0) {
      const { data: baseRoles } = await Postgres
        .from('roles')
        .select('id, role_key, role_name')
        .in('id', baseRoleIds);

      (baseRoles || []).forEach((br: any) => {
        baseRolesMap[br.id] = { role_key: br.role_key, role_name: br.role_name };
      });
    }

    const rolesWithLabels = (roles || []).map((r: any) => ({
      ...r,
      base_role_key: r.base_role_id ? (baseRolesMap[r.base_role_id]?.role_key || null) : null,
      base_role_name: r.base_role_id ? (baseRolesMap[r.base_role_id]?.role_name || null) : null,
      tenant_key: r.tenant?.tenant_key || null,
      tenant_name: r.tenant?.tenant_name || null,
    }));

    return res.status(200).json({ success: true, roles: rolesWithLabels, count: rolesWithLabels.length });
  } catch (err: any) {
    console.error('[ROLES] Error en GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// GET /:id - Obtener un rol específico
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const Postgres = getPostgres();

    const { data: role, error } = await Postgres
      .from('roles')
      .select(`
        *,
        tenant:tenants!roles_tenant_id_fkey(tenant_key, tenant_name)
      `)
      .eq('id', id)
      .single();

    if (error || !role) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    // Self-join manual
    let base_role_key = null;
    let base_role_name = null;
    if (role.base_role_id) {
      const { data: baseRole } = await Postgres
        .from('roles')
        .select('role_key, role_name')
        .eq('id', role.base_role_id)
        .maybeSingle();
      base_role_key = baseRole?.role_key || null;
      base_role_name = baseRole?.role_name || null;
    }

    return res.status(200).json({
      success: true,
      role: {
        ...role,
        base_role_key,
        base_role_name,
        tenant_key: role.tenant?.tenant_key || null,
        tenant_name: role.tenant?.tenant_name || null,
      },
    });
  } catch (err: any) {
    console.error('[ROLES] Error en GET /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// POST / - Crear nuevo rol
// ============================================================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const {
      tenant_id,
      role_key,
      role_name,
      role_scope = 'TENANT',
      base_role_id,
      data_scope = 'ALL',
      is_active = true,
    } = body;

    if (!tenant_id || !role_key || !role_name) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, role_key, role_name' });
    }

    if (!/^[A-Z0-9_]+$/.test(role_key) || role_key.length < 2) {
      return res.status(400).json({
        error: 'role_key debe contener solo letras mayúsculas, números y guión bajo (mínimo 2 caracteres)',
      });
    }

    const validScopes = ['SYSTEM', 'TENANT', 'SCOPE', 'SELF'];
    if (!validScopes.includes(role_scope)) {
      return res.status(400).json({ error: `role_scope inválido. Valores permitidos: ${validScopes.join(', ')}` });
    }

    const validDataScopes = ['ALL', 'DIRECT_REPORTS', 'SELF'];
    if (!validDataScopes.includes(data_scope)) {
      return res.status(400).json({ error: `data_scope inválido. Valores permitidos: ${validDataScopes.join(', ')}` });
    }

    const Postgres = getPostgres();

    const { data: existing } = await Postgres
      .from('roles')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('role_key', role_key.toUpperCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Ya existe un rol con esa clave en este tenant' });
    }

    const { data: newRole, error } = await Postgres
      .from('roles')
      .insert({
        tenant_id,
        role_key: role_key.toUpperCase(),
        role_name,
        role_scope,
        base_role_id: base_role_id || null,
        data_scope,
        is_active,
        is_system_role: false,
        is_locked: false,
        role_version: 1,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[ROLES] Error creando rol:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, role: newRole, message: 'Rol creado exitosamente' });
  } catch (err: any) {
    console.error('[ROLES] Error en POST /:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// PUT /:id - Actualizar rol
// ============================================================================

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { role_key, role_name, role_scope, base_role_id, data_scope, is_active } = body;

    const Postgres = getPostgres();

    const { data: existing } = await Postgres
      .from('roles')
      .select('role_key, tenant_id, is_system_role, is_locked')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    if (existing.is_locked) {
      return res.status(403).json({ error: 'Este rol está bloqueado y no puede ser modificado' });
    }

    if (existing.is_system_role && (role_key || role_name || role_scope || data_scope !== undefined)) {
      return res.status(403).json({ error: 'Los roles de sistema solo permiten cambiar su estado activo/inactivo' });
    }

    if (role_key) {
      if (!/^[A-Z0-9_]+$/.test(role_key) || role_key.length < 2) {
        return res.status(400).json({
          error: 'role_key debe contener solo letras mayúsculas, números y guión bajo (mínimo 2 caracteres)',
        });
      }

      if (role_key.toUpperCase() !== existing.role_key) {
        const { data: dup } = await Postgres
          .from('roles')
          .select('id')
          .eq('tenant_id', existing.tenant_id)
          .eq('role_key', role_key.toUpperCase())
          .neq('id', id)
          .maybeSingle();

        if (dup) {
          return res.status(409).json({ error: 'Ya existe un rol con esa clave en este tenant' });
        }
      }
    }

    if (role_scope) {
      const validScopes = ['SYSTEM', 'TENANT', 'SCOPE', 'SELF'];
      if (!validScopes.includes(role_scope)) {
        return res.status(400).json({ error: `role_scope inválido. Valores permitidos: ${validScopes.join(', ')}` });
      }
    }

    if (data_scope) {
      const validDataScopes = ['ALL', 'DIRECT_REPORTS', 'SELF'];
      if (!validDataScopes.includes(data_scope)) {
        return res.status(400).json({ error: `data_scope inválido. Valores permitidos: ${validDataScopes.join(', ')}` });
      }
    }

    const updateData: any = {
      updated_by: 'system',
      updated_at: new Date().toISOString(),
    };

    if (role_key !== undefined) updateData.role_key = role_key.toUpperCase();
    if (role_name !== undefined) updateData.role_name = role_name;
    if (role_scope !== undefined) updateData.role_scope = role_scope;
    if (base_role_id !== undefined) updateData.base_role_id = base_role_id || null;
    if (data_scope !== undefined) updateData.data_scope = data_scope;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedRole, error } = await Postgres
      .from('roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ROLES] Error actualizando rol:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, role: updatedRole, message: 'Rol actualizado exitosamente' });
  } catch (err: any) {
    console.error('[ROLES] Error en PUT /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// PATCH /:id/status - Activar/Desactivar rol
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

    const { data: existing } = await Postgres
      .from('roles')
      .select('is_locked')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    if (existing.is_locked) {
      return res.status(403).json({ error: 'Este rol está bloqueado y no puede ser modificado' });
    }

    const { data: updatedRole, error } = await Postgres
      .from('roles')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ROLES] Error actualizando estado:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      role: updatedRole,
      message: `Rol ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[ROLES] Error en PATCH /:id/status:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// DELETE /:id - Eliminar rol creado si todavía no fue asignado
// ============================================================================

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const Postgres = getPostgres();

    const { data: existing, error: existingError } = await Postgres
      .from('roles')
      .select('id, role_key, is_system_role, is_locked')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ error: existingError.message });
    }

    if (!existing) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    if (existing.is_system_role || existing.is_locked) {
      return res.status(403).json({ error: 'Los roles de sistema o bloqueados no pueden eliminarse' });
    }

    const { data: assignedRole } = await Postgres
      .from('user_roles')
      .select('id')
      .eq('role_id', id)
      .limit(1)
      .maybeSingle();

    if (assignedRole) {
      return res.status(409).json({ error: 'No se puede eliminar: el rol ya fue asignado a un usuario' });
    }

    const { data: childRole } = await Postgres
      .from('roles')
      .select('id')
      .eq('base_role_id', id)
      .limit(1)
      .maybeSingle();

    if (childRole) {
      return res.status(409).json({ error: 'No se puede eliminar: otro rol hereda de este rol' });
    }

    const { error: permissionDeleteError } = await Postgres
      .from('role_screen_actions')
      .delete()
      .eq('role_id', id);

    if (permissionDeleteError) {
      return res.status(500).json({ error: permissionDeleteError.message });
    }

    const { error: deleteError } = await Postgres
      .from('roles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true, message: 'Rol eliminado exitosamente' });
  } catch (err: any) {
    console.error('[ROLES] Error en DELETE /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

export default router;


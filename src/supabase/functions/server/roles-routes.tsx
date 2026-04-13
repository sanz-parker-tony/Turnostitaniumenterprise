/**
 * roles-routes.tsx
 * Turnos Titanium Enterprise
 *
 * CRUD para la tabla roles
 * Ubicación: Mantenimiento → Roles
 *
 * IMPORTANTE: Las rutas estáticas (/catalogs/*) van ANTES de las rutas
 * dinámicas (/:id) para evitar que Hono capture "catalogs" como un UUID.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// ============================================================================
// CATÁLOGOS — deben ir ANTES de /:id para que Hono no los capture como UUID
// ============================================================================

// GET /catalogs/tenants - Tenants disponibles (para el selector)
app.get('/catalogs/tenants', async (c) => {
  try {
    const supabase = getSupabase();
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .order('tenant_name', { ascending: true });

    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, tenants: tenants || [] });
  } catch (err: any) {
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// GET / - Listar roles
// ============================================================================

app.get('/', async (c) => {
  try {
    const supabase = getSupabase();

    const { data: roles, error } = await supabase
      .from('roles')
      .select(`
        *,
        tenant:tenants!roles_tenant_id_fkey(tenant_key, tenant_name)
      `)
      .order('role_scope', { ascending: true })
      .order('role_key', { ascending: true });

    if (error) {
      console.error('[ROLES] Error cargando roles:', error);
      return c.json({ error: error.message }, 500);
    }

    // Self-join manual para evitar problemas con el hint de FK en PostgREST
    const baseRoleIds = [...new Set((roles || []).map(r => r.base_role_id).filter(Boolean))];
    let baseRolesMap: Record<string, { role_key: string; role_name: string }> = {};

    if (baseRoleIds.length > 0) {
      const { data: baseRoles } = await supabase
        .from('roles')
        .select('id, role_key, role_name')
        .in('id', baseRoleIds);

      (baseRoles || []).forEach(br => {
        baseRolesMap[br.id] = { role_key: br.role_key, role_name: br.role_name };
      });
    }

    const rolesWithLabels = (roles || []).map(r => ({
      ...r,
      base_role_key: r.base_role_id ? (baseRolesMap[r.base_role_id]?.role_key || null) : null,
      base_role_name: r.base_role_id ? (baseRolesMap[r.base_role_id]?.role_name || null) : null,
      tenant_key: r.tenant?.tenant_key || null,
      tenant_name: r.tenant?.tenant_name || null,
    }));

    return c.json({ success: true, roles: rolesWithLabels, count: rolesWithLabels.length });
  } catch (err: any) {
    console.error('[ROLES] Error en GET /:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// GET /:id - Obtener un rol específico
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabase();

    const { data: role, error } = await supabase
      .from('roles')
      .select(`
        *,
        tenant:tenants!roles_tenant_id_fkey(tenant_key, tenant_name)
      `)
      .eq('id', id)
      .single();

    if (error || !role) {
      return c.json({ error: 'Rol no encontrado' }, 404);
    }

    // Self-join manual
    let base_role_key = null;
    let base_role_name = null;
    if (role.base_role_id) {
      const { data: baseRole } = await supabase
        .from('roles')
        .select('role_key, role_name')
        .eq('id', role.base_role_id)
        .maybeSingle();
      base_role_key = baseRole?.role_key || null;
      base_role_name = baseRole?.role_name || null;
    }

    return c.json({
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
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// POST / - Crear nuevo rol
// ============================================================================

app.post('/', async (c) => {
  try {
    const body = await c.req.json();
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
      return c.json({ error: 'Campos obligatorios: tenant_id, role_key, role_name' }, 400);
    }

    if (!/^[A-Z0-9_]+$/.test(role_key) || role_key.length < 2) {
      return c.json({
        error: 'role_key debe contener solo letras mayúsculas, números y guión bajo (mínimo 2 caracteres)',
      }, 400);
    }

    const validScopes = ['SYSTEM', 'TENANT', 'SCOPE', 'SELF'];
    if (!validScopes.includes(role_scope)) {
      return c.json({ error: `role_scope inválido. Valores permitidos: ${validScopes.join(', ')}` }, 400);
    }

    const validDataScopes = ['ALL', 'DIRECT_REPORTS', 'SELF'];
    if (!validDataScopes.includes(data_scope)) {
      return c.json({ error: `data_scope inválido. Valores permitidos: ${validDataScopes.join(', ')}` }, 400);
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('roles')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('role_key', role_key.toUpperCase())
      .maybeSingle();

    if (existing) {
      return c.json({ error: 'Ya existe un rol con esa clave en este tenant' }, 409);
    }

    const { data: newRole, error } = await supabase
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
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, role: newRole, message: 'Rol creado exitosamente' }, 201);
  } catch (err: any) {
    console.error('[ROLES] Error en POST /:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// PUT /:id - Actualizar rol
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { role_key, role_name, role_scope, base_role_id, data_scope, is_active } = body;

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('roles')
      .select('role_key, tenant_id, is_system_role, is_locked')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return c.json({ error: 'Rol no encontrado' }, 404);
    }

    if (existing.is_locked) {
      return c.json({ error: 'Este rol está bloqueado y no puede ser modificado' }, 403);
    }

    if (existing.is_system_role && (role_key || role_name || role_scope || data_scope !== undefined)) {
      return c.json({ error: 'Los roles de sistema solo permiten cambiar su estado activo/inactivo' }, 403);
    }

    if (role_key) {
      if (!/^[A-Z0-9_]+$/.test(role_key) || role_key.length < 2) {
        return c.json({
          error: 'role_key debe contener solo letras mayúsculas, números y guión bajo (mínimo 2 caracteres)',
        }, 400);
      }

      if (role_key.toUpperCase() !== existing.role_key) {
        const { data: dup } = await supabase
          .from('roles')
          .select('id')
          .eq('tenant_id', existing.tenant_id)
          .eq('role_key', role_key.toUpperCase())
          .neq('id', id)
          .maybeSingle();

        if (dup) {
          return c.json({ error: 'Ya existe un rol con esa clave en este tenant' }, 409);
        }
      }
    }

    if (role_scope) {
      const validScopes = ['SYSTEM', 'TENANT', 'SCOPE', 'SELF'];
      if (!validScopes.includes(role_scope)) {
        return c.json({ error: `role_scope inválido. Valores permitidos: ${validScopes.join(', ')}` }, 400);
      }
    }

    if (data_scope) {
      const validDataScopes = ['ALL', 'DIRECT_REPORTS', 'SELF'];
      if (!validDataScopes.includes(data_scope)) {
        return c.json({ error: `data_scope inválido. Valores permitidos: ${validDataScopes.join(', ')}` }, 400);
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

    const { data: updatedRole, error } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ROLES] Error actualizando rol:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, role: updatedRole, message: 'Rol actualizado exitosamente' });
  } catch (err: any) {
    console.error('[ROLES] Error en PUT /:id:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

// ============================================================================
// PATCH /:id/status - Activar/Desactivar rol
// ============================================================================

app.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return c.json({ error: 'El campo is_active debe ser booleano' }, 400);
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('roles')
      .select('is_locked')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return c.json({ error: 'Rol no encontrado' }, 404);
    }

    if (existing.is_locked) {
      return c.json({ error: 'Este rol está bloqueado y no puede ser modificado' }, 403);
    }

    const { data: updatedRole, error } = await supabase
      .from('roles')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ROLES] Error actualizando estado:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      role: updatedRole,
      message: `Rol ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[ROLES] Error en PATCH /:id/status:', err);
    return c.json({ error: 'Error interno del servidor', details: err.message }, 500);
  }
});

export default app;

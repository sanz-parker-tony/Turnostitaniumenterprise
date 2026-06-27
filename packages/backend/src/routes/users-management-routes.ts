/**
 * users-management-routes.ts
 * Turnos Titanium Enterprise
 *
 * CRUD para users, user_roles y user_role_scopes
 * Ubicación: Mantenimiento → Usuarios
 *
 * IMPORTANTE: Las rutas estáticas (/catalogs/*, /user-roles/*) van ANTES
 * de las rutas dinámicas (/:id, /:user_id/*) para que Express no capture
 * palabras como "catalogs" o "user-roles" como UUIDs.
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
// CATÁLOGOS — deben ir ANTES de /:id para que Express no los capture como UUID
// ============================================================================

// GET /catalogs/tenants - Tenants disponibles
router.get('/catalogs/tenants', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .order('tenant_name');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, tenants: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /catalogs/roles - Roles disponibles (para selector)
router.get('/catalogs/roles', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('roles')
      .select('id, role_key, role_name, role_scope, tenant_id, is_active')
      .eq('is_active', true)
      .order('role_name');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, roles: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /catalogs/scope-types - Tipos de alcance disponibles (para selector)
router.get('/catalogs/scope-types', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('scope_types')
      .select('id, scope_type_key, scope_type_name, is_active')
      .eq('is_active', true)
      .order('scope_type_name');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, scopeTypes: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /catalogs/companies - Empresas disponibles (para selector de user_roles)
router.get('/catalogs/companies', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('companies')
      .select('id, company_name, tenant_id')
      .eq('is_active', true)
      .order('company_name');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, companies: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /catalogs/scope-entities - Entidades disponibles segun tipo de alcance
router.get('/catalogs/scope-entities', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const scopeTypeId = String(req.query.scope_type_id || '').trim();
    const scopeTypeKeyParam = String(req.query.scope_type_key || '').trim().toUpperCase();
    const tenantId = String(req.query.tenant_id || '').trim();

    if (!scopeTypeId && !scopeTypeKeyParam) {
      return res.status(400).json({ error: 'scope_type_id o scope_type_key es obligatorio' });
    }

    let scopeTypeKey = scopeTypeKeyParam;
    if (!scopeTypeKey) {
      const { data: scopeType, error: scopeTypeError } = await Postgres
        .from('scope_types')
        .select('scope_type_key')
        .eq('id', scopeTypeId)
        .maybeSingle();

      if (scopeTypeError) return res.status(500).json({ error: scopeTypeError.message });
      if (!scopeType?.scope_type_key) return res.status(404).json({ error: 'Tipo de alcance no encontrado' });
      scopeTypeKey = String(scopeType.scope_type_key).toUpperCase();
    }

    const scopedTenantId = tenantId || null;
    let query: any;
    let rows: any[] = [];

    switch (scopeTypeKey) {
      case 'TENANT': {
        query = Postgres
          .from('tenants')
          .select('id, tenant_key, tenant_name')
          .order('tenant_name');
        if (scopedTenantId) query = query.eq('id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.tenant_name || row.tenant_key || row.id,
          description: row.tenant_key || null,
        }));
        break;
      }
      case 'COMPANY': {
        query = Postgres
          .from('companies')
          .select('id, tenant_id, company_name, company_code, is_active')
          .eq('is_active', true)
          .order('company_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.company_code ? `${row.company_name} (${row.company_code})` : row.company_name,
          description: row.company_code || null,
        }));
        break;
      }
      case 'WORK_LOCATION': {
        query = Postgres
          .from('work_locations')
          .select('id, tenant_id, work_location_name, work_location_code, is_active')
          .eq('is_active', true)
          .order('work_location_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.work_location_code ? `${row.work_location_name} (${row.work_location_code})` : row.work_location_name,
          description: row.work_location_code || null,
        }));
        break;
      }
      case 'DEPARTMENT': {
        query = Postgres
          .from('departments')
          .select('id, tenant_id, department_name, department_code, is_active')
          .eq('is_active', true)
          .order('department_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.department_code ? `${row.department_name} (${row.department_code})` : row.department_name,
          description: row.department_code || null,
        }));
        break;
      }
      case 'AREA': {
        query = Postgres
          .from('areas')
          .select('id, tenant_id, area_name, area_code, is_active')
          .eq('is_active', true)
          .order('area_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.area_code ? `${row.area_name} (${row.area_code})` : row.area_name,
          description: row.area_code || null,
        }));
        break;
      }
      case 'COST_CENTER': {
        query = Postgres
          .from('cost_centers')
          .select('id, tenant_id, cost_center_name, cost_center_code, is_active')
          .eq('is_active', true)
          .order('cost_center_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.cost_center_code ? `${row.cost_center_name} (${row.cost_center_code})` : row.cost_center_name,
          description: row.cost_center_code || null,
        }));
        break;
      }
      case 'WORK_GROUP': {
        query = Postgres
          .from('work_groups')
          .select('id, tenant_id, work_group_name, work_group_code, is_active')
          .eq('is_active', true)
          .order('work_group_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.work_group_code ? `${row.work_group_name} (${row.work_group_code})` : row.work_group_name,
          description: row.work_group_code || null,
        }));
        break;
      }
      case 'EMPLOYEE_PROFILE': {
        query = Postgres
          .from('employee_profiles')
          .select('id, tenant_id, profile_name, employee_profile_code, is_active')
          .eq('is_active', true)
          .order('profile_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.employee_profile_code ? `${row.profile_name} (${row.employee_profile_code})` : row.profile_name,
          description: row.employee_profile_code || null,
        }));
        break;
      }
      case 'EMPLOYEE':
      case 'EMPLOYEE_EXCLUDE': {
        query = Postgres
          .from('employees')
          .select('id, tenant_id, employee_code, employee_lastname, employee_name, is_active')
          .eq('is_active', true)
          .order('employee_lastname')
          .order('employee_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: `${row.employee_code ? `${row.employee_code} - ` : ''}${row.employee_lastname || ''} ${row.employee_name || ''}`.trim(),
          description: row.employee_code || null,
        }));
        break;
      }
      default:
        return res.status(400).json({ error: `Tipo de alcance sin catalogo asociado: ${scopeTypeKey}` });
    }

    return res.status(200).json({
      success: true,
      scope_type_key: scopeTypeKey,
      entities: rows,
      count: rows.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /catalogs/languages - Idiomas disponibles
router.get('/catalogs/languages', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('system_languages')
      .select('code, language_name')
      .eq('is_active', true)
      .order('language_name');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, languages: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /catalogs/user-role-summaries - Resumen de roles activos por usuario
router.get('/catalogs/user-role-summaries', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('user_roles')
      .select(`
        user_id,
        role_id,
        created_at,
        role:roles!user_roles_role_id_fkey(role_name, role_key)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const roleIds = Array.from(new Set((data || []).map((row: any) => row.role_id).filter(Boolean)));
    const roleMap = new Map<string, any>();
    if (roleIds.length > 0) {
      const { data: roleRows } = await Postgres
        .from('roles')
        .select('id, role_name, role_key')
        .in('id', roleIds);
      for (const roleRow of roleRows || []) roleMap.set(roleRow.id, roleRow);
    }

    const summariesByUserId: Record<string, {
      user_id: string;
      primary_role_name: string | null;
      primary_role_key: string | null;
      role_count: number;
    }> = {};

    for (const row of (data || []) as any[]) {
      const userId = row.user_id as string;
      const fallbackRole = roleMap.get(row.role_id);
      const roleName = row.role?.role_name || fallbackRole?.role_name || null;
      const roleKey = row.role?.role_key || fallbackRole?.role_key || null;
      if (!userId) continue;

      if (!summariesByUserId[userId]) {
        summariesByUserId[userId] = {
          user_id: userId,
          primary_role_name: roleName,
          primary_role_key: roleKey,
          role_count: 1,
        };
      } else {
        summariesByUserId[userId].role_count += 1;
      }
    }

    return res.status(200).json({
      success: true,
      summaries: Object.values(summariesByUserId),
      count: Object.keys(summariesByUserId).length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// USER-ROLES (sub-recursos estáticos) — ANTES de /:user_id/*
// ============================================================================

// PUT /user-roles/:user_role_id - Actualizar asignación de rol
router.put('/user-roles/:user_role_id', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const body = req.body;
    const { tenant_id, role_id, company_id, valid_from, valid_to, is_active } = body;

    const Postgres = getPostgres();

    const { data: currentUserRole, error: currentError } = await Postgres
      .from('user_roles')
      .select('id, tenant_id, user_id, role_id, company_id')
      .eq('id', userRoleId)
      .single();

    if (currentError || !currentUserRole) {
      return res.status(404).json({ error: 'Asignación de rol no encontrada' });
    }

    const nextTenantId = tenant_id || currentUserRole.tenant_id;
    const nextRoleId = role_id || currentUserRole.role_id;
    const nextCompanyId = company_id === undefined ? currentUserRole.company_id : (company_id || null);

    const { data: duplicated } = await Postgres
      .from('user_roles')
      .select('id')
      .eq('tenant_id', nextTenantId)
      .eq('user_id', currentUserRole.user_id)
      .eq('role_id', nextRoleId)
      .is('company_id', nextCompanyId)
      .neq('id', userRoleId)
      .maybeSingle();

    if (duplicated) {
      return res.status(409).json({ error: 'Ya existe una asignación con ese rol y empresa para este usuario' });
    }

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (tenant_id !== undefined) updateData.tenant_id = nextTenantId;
    if (role_id !== undefined) updateData.role_id = nextRoleId;
    if (company_id !== undefined) updateData.company_id = nextCompanyId;
    if (valid_from !== undefined) updateData.valid_from = valid_from || null;
    if (valid_to !== undefined) updateData.valid_to = valid_to || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedUserRole, error } = await Postgres
      .from('user_roles')
      .update(updateData)
      .eq('id', userRoleId)
      .select()
      .single();

    if (error) {
      console.error('[USERS-MGMT] Error actualizando user_role:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!updatedUserRole) {
      return res.status(404).json({ error: 'Asignación de rol no encontrada' });
    }

    return res.status(200).json({ success: true, userRole: updatedUserRole, message: 'Asignación actualizada exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PUT /user-roles/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PATCH /user-roles/:user_role_id/status - Activar/Desactivar user_role
router.patch('/user-roles/:user_role_id/status', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const body = req.body;
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
    }

    const Postgres = getPostgres();

    const { data: updatedUserRole, error } = await Postgres
      .from('user_roles')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', userRoleId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!updatedUserRole) return res.status(404).json({ error: 'Asignación de rol no encontrada' });

    return res.status(200).json({
      success: true,
      userRole: updatedUserRole,
      message: `Asignación de rol ${is_active ? 'activada' : 'desactivada'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /user-roles/:id/status:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// DELETE /user-roles/:user_role_id - Desasignar rol de usuario (elimina relación y sus alcances)
router.delete('/user-roles/:user_role_id', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const Postgres = getPostgres();

    const { data: existingUserRole, error: existingError } = await Postgres
      .from('user_roles')
      .select('id')
      .eq('id', userRoleId)
      .maybeSingle();

    if (existingError) return res.status(500).json({ error: existingError.message });
    if (!existingUserRole) return res.status(404).json({ error: 'Asignación de rol no encontrada' });

    const { error: deleteScopesError } = await Postgres
      .from('user_role_scopes')
      .delete()
      .eq('user_role_id', userRoleId);

    if (deleteScopesError) return res.status(500).json({ error: deleteScopesError.message });

    const { error: deleteRoleError } = await Postgres
      .from('user_roles')
      .delete()
      .eq('id', userRoleId);

    if (deleteRoleError) return res.status(500).json({ error: deleteRoleError.message });

    return res.status(200).json({ success: true, message: 'Rol desasignado exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en DELETE /user-roles/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /user-roles/:user_role_id/scopes - Listar alcances de una asignación
router.get('/user-roles/:user_role_id/scopes', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const Postgres = getPostgres();

    const { data: scopes, error } = await Postgres
      .from('user_role_scopes')
      .select(`
        *,
        scope_type:scope_types!user_role_scopes_scope_type_id_fkey(scope_type_key, scope_type_name)
      `)
      .eq('user_role_id', userRoleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[USERS-MGMT] Error cargando user_role_scopes:', error);
      return res.status(500).json({ error: error.message });
    }

    const scopesWithLabels = (scopes || []).map((s: any) => ({
      ...s,
      scope_type_key: s.scope_type?.scope_type_key || null,
      scope_type_name: s.scope_type?.scope_type_name || null,
    }));

    return res.status(200).json({ success: true, scopes: scopesWithLabels, count: scopesWithLabels.length });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en GET /user-roles/:id/scopes:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// POST /user-roles/:user_role_id/scopes - Agregar alcance a una asignación
router.post('/user-roles/:user_role_id/scopes', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const body = req.body;
    const { tenant_id, scope_type_id, scope_entity_id, is_active = true } = body;

    if (!tenant_id || !scope_type_id || !scope_entity_id) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, scope_type_id, scope_entity_id' });
    }

    const Postgres = getPostgres();

    const { data: existing } = await Postgres
      .from('user_role_scopes')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('user_role_id', userRoleId)
      .eq('scope_type_id', scope_type_id)
      .eq('scope_entity_id', scope_entity_id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Ya existe ese alcance para esta asignación de rol' });
    }

    const { data: newScope, error } = await Postgres
      .from('user_role_scopes')
      .insert({
        tenant_id,
        user_role_id: userRoleId,
        scope_type_id,
        scope_entity_id,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[USERS-MGMT] Error creando user_role_scope:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, scope: newScope, message: 'Alcance asignado exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en POST /user-roles/:id/scopes:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PUT /scopes/:scope_id - Editar alcance
router.put('/scopes/:scope_id', async (req: Request, res: Response) => {
  try {
    const scopeId = req.params.scope_id;
    const body = req.body;
    const { tenant_id, user_role_id, scope_type_id, scope_entity_id, is_active } = body;

    if (!tenant_id || !user_role_id || !scope_type_id || !scope_entity_id) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, user_role_id, scope_type_id, scope_entity_id' });
    }

    const Postgres = getPostgres();

    const { data: currentScope, error: currentError } = await Postgres
      .from('user_role_scopes')
      .select('id')
      .eq('id', scopeId)
      .maybeSingle();

    if (currentError) return res.status(500).json({ error: currentError.message });
    if (!currentScope) return res.status(404).json({ error: 'Alcance no encontrado' });

    const { data: duplicated } = await Postgres
      .from('user_role_scopes')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('user_role_id', user_role_id)
      .eq('scope_type_id', scope_type_id)
      .eq('scope_entity_id', scope_entity_id)
      .neq('id', scopeId)
      .maybeSingle();

    if (duplicated) {
      return res.status(409).json({ error: 'Ya existe ese alcance para esta asignación de rol' });
    }

    const updateData: any = {
      tenant_id,
      user_role_id,
      scope_type_id,
      scope_entity_id,
      updated_by: 'system',
      updated_at: new Date().toISOString(),
    };
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    const { data: updatedScope, error } = await Postgres
      .from('user_role_scopes')
      .update(updateData)
      .eq('id', scopeId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!updatedScope) return res.status(404).json({ error: 'Alcance no encontrado' });

    return res.status(200).json({ success: true, scope: updatedScope, message: 'Alcance actualizado exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PUT /scopes/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PATCH /scopes/:scope_id/status - Activar/Desactivar alcance
router.patch('/scopes/:scope_id/status', async (req: Request, res: Response) => {
  try {
    const scopeId = req.params.scope_id;
    const body = req.body;
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
    }

    const Postgres = getPostgres();

    const { data: updatedScope, error } = await Postgres
      .from('user_role_scopes')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', scopeId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!updatedScope) return res.status(404).json({ error: 'Alcance no encontrado' });

    return res.status(200).json({
      success: true,
      scope: updatedScope,
      message: `Alcance ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /scopes/:id/status:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// ============================================================================
// USERS — rutas dinámicas van AL FINAL
// ============================================================================

// GET / - Listar usuarios
router.get('/', async (req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();

    const { data: users, error } = await Postgres
      .from('users')
      .select(`
        *,
        tenant:tenants!users_tenant_id_fkey(tenant_key, tenant_name),
        language:system_languages!users_preferred_language_code_fkey(language_name)
      `)
      .order('username', { ascending: true });

    if (error) {
      console.error('[USERS-MGMT] Error cargando usuarios:', error);
      return res.status(500).json({ error: error.message });
    }

    const usersWithLabels = (users || []).map((u: any) => ({
      ...u,
      tenant_key: u.tenant?.tenant_key || null,
      tenant_name: u.tenant?.tenant_name || null,
      language_name: u.language?.language_name || null,
    }));

    return res.status(200).json({ success: true, users: usersWithLabels, count: usersWithLabels.length });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /:id - Obtener usuario específico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const Postgres = getPostgres();

    const { data: user, error } = await Postgres
      .from('users')
      .select(`
        *,
        tenant:tenants!users_tenant_id_fkey(tenant_key, tenant_name),
        language:system_languages!users_preferred_language_code_fkey(language_name)
      `)
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        tenant_key: user.tenant?.tenant_key || null,
        tenant_name: user.tenant?.tenant_name || null,
        language_name: user.language?.language_name || null,
      },
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en GET /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// POST / - Crear usuario (crea auth.users + public.users)
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const {
      tenant_id,
      username,
      display_name,
      email,
      phone,
      preferred_language_code,
      password,
      is_active = true,
    } = body;

    if (!tenant_id || !username || !email || !password) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, username, email, password' });
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return res.status(400).json({ error: 'El formato del email no es válido' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const Postgres = getPostgres();

    const { data: existingUsername } = await Postgres
      .from('users')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese nombre de usuario en este tenant' });
    }

    const { data: authData, error: authError } = await Postgres.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: display_name || username },
    });

    if (authError || !authData?.user) {
      console.error('[USERS-MGMT] Error creando auth user:', authError);
      return res.status(500).json({ error: 'Error al crear usuario de autenticación', details: authError?.message });
    }

    const authUserId = authData.user.id;

    const { data: newUser, error: userError } = await Postgres
      .from('users')
      .insert({
        tenant_id,
        auth_user_id: authUserId,
        username,
        display_name: display_name || null,
        email,
        phone: phone || null,
        preferred_language_code: preferred_language_code || null,
        is_active,
        created_by: 'system',
      })
      .select()
      .single();

    if (userError) {
      console.error('[USERS-MGMT] Error creando public user:', userError);
      await Postgres.auth.admin.deleteUser(authUserId);
      return res.status(500).json({ error: 'Error al crear perfil de usuario', details: userError.message });
    }

    const { error: syncPasswordError } = await Postgres.auth.admin.updateUserById(authUserId, {
      password,
    });
    if (syncPasswordError) {
      return res.status(500).json({
        error: 'Error al sincronizar contraseña en users',
        details: syncPasswordError.message,
      });
    }

    return res.status(201).json({ success: true, user: newUser, message: 'Usuario creado exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en POST /:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PUT /:id - Actualizar usuario
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { username, display_name, email, phone, preferred_language_code, is_active, password } = body;

    const Postgres = getPostgres();

    const { data: existing } = await Postgres
      .from('users')
      .select('username, email, tenant_id, auth_user_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (email && email !== existing.email) {
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
        return res.status(400).json({ error: 'El formato del email no es válido' });
      }
    }

    if (username && username !== existing.username) {
      const { data: dup } = await Postgres
        .from('users')
        .select('id')
        .eq('tenant_id', existing.tenant_id)
        .eq('username', username)
        .neq('id', id)
        .maybeSingle();

      if (dup) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese nombre de usuario en este tenant' });
      }
    }

    if (password && String(password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const updateData: any = { updated_by: 'system', updated_at: new Date().toISOString() };
    if (username !== undefined) updateData.username = username;
    if (display_name !== undefined) updateData.display_name = display_name || null;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (preferred_language_code !== undefined) updateData.preferred_language_code = preferred_language_code || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedUser, error } = await Postgres
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[USERS-MGMT] Error actualizando usuario:', error);
      return res.status(500).json({ error: error.message });
    }

    const authUpdatePayload: { email?: string; password?: string } = {};
    if (email && email !== existing.email) authUpdatePayload.email = email;
    if (password) authUpdatePayload.password = String(password);

    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: authUpdateError } = await Postgres.auth.admin.updateUserById(existing.auth_user_id, authUpdatePayload);
      if (authUpdateError) {
        return res.status(500).json({ error: 'Error al sincronizar usuario de autenticación', details: authUpdateError.message });
      }
    }

    return res.status(200).json({ success: true, user: updatedUser, message: 'Usuario actualizado exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PUT /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PATCH /:id/status - Activar/Desactivar usuario
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
    }

    const Postgres = getPostgres();

    const { data: updatedUser, error } = await Postgres
      .from('users')
      .update({ is_active, updated_by: 'system', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!updatedUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    return res.status(200).json({
      success: true,
      user: updatedUser,
      message: `Usuario ${is_active ? 'activado' : 'desactivado'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /:id/status:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PATCH /:id/reset-password - Resetear contraseña de usuario
router.patch('/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const { new_password } = body;

    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const Postgres = getPostgres();

    const { data: user } = await Postgres
      .from('users')
      .select('auth_user_id')
      .eq('id', id)
      .maybeSingle();

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { error: pwError } = await Postgres.auth.admin.updateUserById(user.auth_user_id, {
      password: new_password,
    });

    if (pwError) {
      return res.status(500).json({ error: 'Error al resetear contraseña', details: pwError.message });
    }

    return res.status(200).json({ success: true, message: 'Contraseña reseteada exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /:id/reset-password:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /:user_id/roles - Listar roles de un usuario
router.get('/:user_id/roles', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id;
    const Postgres = getPostgres();

    const { data: userRoles, error } = await Postgres
      .from('user_roles')
      .select(`
        *,
        role:roles!user_roles_role_id_fkey(role_key, role_name, role_scope, data_scope),
        company:companies!user_roles_company_id_fkey(id, company_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[USERS-MGMT] Error cargando user_roles:', error);
      return res.status(500).json({ error: error.message });
    }

    const roleIds = Array.from(new Set((userRoles || []).map((ur: any) => ur.role_id).filter(Boolean)));
    const roleMap = new Map<string, any>();
    if (roleIds.length > 0) {
      const { data: roleRows } = await Postgres
        .from('roles')
        .select('id, role_key, role_name, role_scope, data_scope')
        .in('id', roleIds);
      for (const roleRow of roleRows || []) roleMap.set(roleRow.id, roleRow);
    }

    const rolesWithLabels = (userRoles || []).map((ur: any) => {
      const fallbackRole = roleMap.get(ur.role_id);
      return ({
      ...ur,
      role_key: ur.role?.role_key || fallbackRole?.role_key || null,
      role_name: ur.role?.role_name || fallbackRole?.role_name || null,
      role_scope: ur.role?.role_scope || fallbackRole?.role_scope || null,
      data_scope: ur.role?.data_scope || fallbackRole?.data_scope || null,
      company_name: ur.company?.company_name || null,
      });
    });

    return res.status(200).json({ success: true, userRoles: rolesWithLabels, count: rolesWithLabels.length });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en GET /:user_id/roles:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// POST /:user_id/roles - Asignar rol a usuario
router.post('/:user_id/roles', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id;
    const body = req.body;
    const { tenant_id, role_id, company_id, valid_from, valid_to, is_active = true } = body;

    if (!tenant_id || !role_id) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, role_id' });
    }

    const Postgres = getPostgres();

    const { data: existing } = await Postgres
      .from('user_roles')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('user_id', userId)
      .eq('role_id', role_id)
      .is('company_id', company_id || null)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'El usuario ya tiene asignado ese rol en esa empresa' });
    }

    const { data: newUserRole, error } = await Postgres
      .from('user_roles')
      .insert({
        tenant_id,
        user_id: userId,
        role_id,
        company_id: company_id || null,
        is_active,
        valid_from: valid_from || null,
        valid_to: valid_to || null,
        created_by: 'system',
      })
      .select()
      .single();

    if (error) {
      console.error('[USERS-MGMT] Error creando user_role:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, userRole: newUserRole, message: 'Rol asignado exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en POST /:user_id/roles:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

export default router;


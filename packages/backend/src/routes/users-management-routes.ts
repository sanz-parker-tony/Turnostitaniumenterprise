/**
 * users-management-routes.ts
 * Turnos Titanium Enterprise
 *
 * CRUD para users, user_roles y user_role_scopes
 * UbicaciÃ³n: Mantenimiento â†’ Usuarios
 *
 * IMPORTANTE: Las rutas estÃ¡ticas (/catalogs/*, /user-roles/*) van ANTES
 * de las rutas dinÃ¡micas (/:id, /:user_id/*) para que Express no capture
 * palabras como "catalogs" o "user-roles" como UUIDs.
 *
 * PolÃ­tica: NO se pueden eliminar registros.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
import { pool } from '../lib/db.js';

const router = Router();

type UserAdministrationContext = {
  userId: string;
  tenantId: string;
  authUserId: string;
};

function administrationContext(req: Request): UserAdministrationContext {
  return (req as any).userAdministrationContext as UserAdministrationContext;
}

async function resolveAdministrationContext(req: Request): Promise<UserAdministrationContext | null> {
  const authUserId = String((req as any)?.user?.id || '').trim();
  if (!authUserId) return null;

  const result = await pool.query(
    `
      SELECT u.id AS user_id, u.tenant_id
      FROM users u
      WHERE u.auth_user_id = $1
        AND u.is_active = true
      LIMIT 1
    `,
    [authUserId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { userId: String(row.user_id), tenantId: String(row.tenant_id), authUserId };
}

async function manageableRoleIds(ctx: UserAdministrationContext): Promise<string[]> {
  const result = await pool.query(
    `
      SELECT DISTINCT target_role.id
      FROM user_roles actor_ur
      JOIN roles actor_role ON actor_role.id = actor_ur.role_id AND actor_role.is_active = true
      JOIN roles target_role
        ON target_role.tenant_id = actor_ur.tenant_id
       AND target_role.user_manager_role_id = actor_role.id
       AND target_role.is_active = true
      WHERE actor_ur.user_id = $1
        AND actor_ur.tenant_id = $2
        AND actor_ur.is_active = true
    `,
    [ctx.userId, ctx.tenantId]
  );
  return result.rows.map((row) => String(row.id));
}

async function manageableUserIds(ctx: UserAdministrationContext): Promise<string[]> {
  const result = await pool.query(
    `
      WITH actor_roles AS (
        SELECT ur.role_id
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id AND r.is_active = true
        WHERE ur.user_id = $1
          AND ur.tenant_id = $2
          AND ur.is_active = true
      )
      SELECT target_user.id
      FROM users target_user
      JOIN user_roles target_ur
        ON target_ur.user_id = target_user.id
       AND target_ur.tenant_id = target_user.tenant_id
       AND target_ur.is_active = true
      JOIN roles target_role
        ON target_role.id = target_ur.role_id
       AND target_role.is_active = true
      WHERE target_user.tenant_id = $2
      GROUP BY target_user.id
      HAVING bool_and(target_role.user_manager_role_id IN (SELECT role_id FROM actor_roles))
    `,
    [ctx.userId, ctx.tenantId]
  );
  return result.rows.map((row) => String(row.id));
}

async function canManageRole(ctx: UserAdministrationContext, roleId: string): Promise<boolean> {
  const roleIds = await manageableRoleIds(ctx);
  return roleIds.includes(roleId);
}

async function canManageUser(ctx: UserAdministrationContext, userId: string): Promise<boolean> {
  const userIds = await manageableUserIds(ctx);
  return userIds.includes(userId);
}

async function canCreateUsers(ctx: UserAdministrationContext): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles actor_ur
        JOIN roles actor_role
          ON actor_role.id = actor_ur.role_id
         AND actor_role.is_active = true
        JOIN role_screen_actions rsa
          ON rsa.tenant_id = actor_ur.tenant_id
         AND rsa.role_id = actor_ur.role_id
         AND rsa.is_active = true
         AND rsa.is_allowed = true
        JOIN screen_actions sa
          ON sa.id = rsa.screen_action_id
         AND sa.is_active = true
        JOIN screens screen
          ON screen.id = sa.screen_id
         AND screen.is_active = true
         AND screen.screen_key = 'USER_MANAGEMENT'
        JOIN actions action
          ON action.id = sa.action_id
         AND action.is_active = true
         AND action.action_key = 'CREATE'
        WHERE actor_ur.user_id = $1
          AND actor_ur.tenant_id = $2
          AND actor_ur.is_active = true
      ) AS can_create_users
    `,
    [ctx.userId, ctx.tenantId]
  );
  return Boolean(result.rows[0]?.can_create_users);
}

async function canManageUserRole(
  ctx: UserAdministrationContext,
  userRoleId: string,
  requireOrgScope = false
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM user_roles target_ur
      JOIN roles target_role
        ON target_role.id = target_ur.role_id
       AND target_role.is_active = true
      JOIN user_roles actor_ur
        ON actor_ur.user_id = $1
       AND actor_ur.tenant_id = target_ur.tenant_id
       AND actor_ur.role_id = target_role.user_manager_role_id
       AND actor_ur.is_active = true
      WHERE target_ur.id = $2
        AND target_ur.tenant_id = $3
        AND ($4::boolean = false OR target_role.is_org_scope_target = true)
      LIMIT 1
    `,
    [ctx.userId, userRoleId, ctx.tenantId, requireOrgScope]
  );
  return result.rows.length > 0;
}

async function canManageScope(ctx: UserAdministrationContext, scopeId: string): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM user_role_scopes scope
      JOIN user_roles target_ur ON target_ur.id = scope.user_role_id
      JOIN roles target_role
        ON target_role.id = target_ur.role_id
       AND target_role.is_active = true
       AND target_role.is_org_scope_target = true
      JOIN user_roles actor_ur
        ON actor_ur.user_id = $1
       AND actor_ur.tenant_id = target_ur.tenant_id
       AND actor_ur.role_id = target_role.user_manager_role_id
       AND actor_ur.is_active = true
      WHERE scope.id = $2
        AND target_ur.tenant_id = $3
      LIMIT 1
    `,
    [ctx.userId, scopeId, ctx.tenantId]
  );
  return result.rows.length > 0;
}

router.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await resolveAdministrationContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });
    const roleIds = await manageableRoleIds(ctx);
    if (roleIds.length === 0) {
      return res.status(403).json({ error: 'Su rol no tiene responsabilidad para administrar usuarios' });
    }
    (req as any).userAdministrationContext = ctx;
    return next();
  } catch (error: any) {
    return res.status(500).json({ error: 'Error validando gobierno de usuarios', details: error.message });
  }
});

function getPostgres() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

// GET /capabilities - Capacidades efectivas de la pantalla para el usuario actor.
// Se resuelve desde role_screen_actions; no depende de nombres de roles en el código.
router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const ctx = administrationContext(req);
    return res.status(200).json({
      success: true,
      can_create_users: await canCreateUsers(ctx),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error resolviendo capacidades de usuarios', details: err.message });
  }
});

type ScopeEntityConfig = {
  table: string;
  select: string;
  label: (row: any) => string;
  description: (row: any) => string | null;
};

const SCOPE_ENTITY_CONFIGS: Record<string, ScopeEntityConfig> = {
  TENANT: {
    table: 'tenants',
    select: 'id, tenant_key, tenant_name',
    label: (row) => row.tenant_name || row.tenant_key || row.id,
    description: (row) => row.tenant_key || null,
  },
  COMPANY: {
    table: 'companies',
    select: 'id, company_name, legacy_id',
    label: (row) => row.legacy_id ? `${row.company_name} (${row.legacy_id})` : row.company_name,
    description: (row) => row.legacy_id || null,
  },
  WORK_LOCATION: {
    table: 'work_locations',
    select: 'id, work_location_name, legacy_id',
    label: (row) => row.legacy_id ? `${row.work_location_name} (${row.legacy_id})` : row.work_location_name,
    description: (row) => row.legacy_id || null,
  },
  DEPARTMENT: {
    table: 'departments',
    select: 'id, department_name, legacy_id',
    label: (row) => row.legacy_id ? `${row.department_name} (${row.legacy_id})` : row.department_name,
    description: (row) => row.legacy_id || null,
  },
  AREA: {
    table: 'areas',
    select: 'id, area_name, legacy_id',
    label: (row) => row.legacy_id ? `${row.area_name} (${row.legacy_id})` : row.area_name,
    description: (row) => row.legacy_id || null,
  },
  COST_CENTER: {
    table: 'cost_centers',
    select: 'id, cost_center_name, legacy_id',
    label: (row) => row.legacy_id ? `${row.cost_center_name} (${row.legacy_id})` : row.cost_center_name,
    description: (row) => row.legacy_id || null,
  },
  WORK_GROUP: {
    table: 'work_groups',
    select: 'id, work_group_name, legacy_id',
    label: (row) => row.legacy_id ? `${row.work_group_name} (${row.legacy_id})` : row.work_group_name,
    description: (row) => row.legacy_id || null,
  },
  EMPLOYEE_PROFILE: {
    table: 'employee_profiles',
    select: 'id, profile_name, legacy_id',
    label: (row) => row.legacy_id ? `${row.profile_name} (${row.legacy_id})` : row.profile_name,
    description: (row) => row.legacy_id || null,
  },
  EMPLOYEE: {
    table: 'employees',
    select: 'id, employee_code, employee_lastname, employee_name',
    label: (row) => `${row.employee_code ? `${row.employee_code} - ` : ''}${row.employee_lastname || ''} ${row.employee_name || ''}`.trim(),
    description: (row) => row.employee_code || null,
  },
  EMPLOYEE_EXCLUDE: {
    table: 'employees',
    select: 'id, employee_code, employee_lastname, employee_name',
    label: (row) => `${row.employee_code ? `${row.employee_code} - ` : ''}${row.employee_lastname || ''} ${row.employee_name || ''}`.trim(),
    description: (row) => row.employee_code || null,
  },
};

async function resolveScopeEntityLabels(Postgres: any, scopes: any[]) {
  const labels = new Map<string, { label: string; description: string | null }>();
  const scopesByType = new Map<string, Set<string>>();

  for (const scope of scopes) {
    const scopeTypeKey = String(scope.scope_type?.scope_type_key || '').trim().toUpperCase();
    const entityId = String(scope.scope_entity_id || '').trim();
    if (!scopeTypeKey || !entityId || !SCOPE_ENTITY_CONFIGS[scopeTypeKey]) continue;
    if (!scopesByType.has(scopeTypeKey)) scopesByType.set(scopeTypeKey, new Set());
    scopesByType.get(scopeTypeKey)!.add(entityId);
  }

  for (const [scopeTypeKey, entityIds] of scopesByType.entries()) {
    const config = SCOPE_ENTITY_CONFIGS[scopeTypeKey];
    const { data, error } = await Postgres
      .from(config.table)
      .select(config.select)
      .in('id', Array.from(entityIds));

    if (error) {
      console.warn(`[USERS-MGMT] No se pudieron resolver entidades para scope ${scopeTypeKey}:`, error);
      continue;
    }

    for (const row of data || []) {
      labels.set(`${scopeTypeKey}:${row.id}`, {
        label: config.label(row) || row.id,
        description: config.description(row),
      });
    }
  }

  return labels;
}

// ============================================================================
// CATÃLOGOS â€” deben ir ANTES de /:id para que Express no los capture como UUID
// ============================================================================

// GET /catalogs/tenants - Tenants disponibles
router.get('/catalogs/tenants', async (req: Request, res: Response) => {
  try {
    const ctx = administrationContext(req);
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('tenants')
      .select('id, tenant_key, tenant_name')
      .eq('id', ctx.tenantId)
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
    const ctx = administrationContext(req);
    const roleIds = await manageableRoleIds(ctx);
    if (roleIds.length === 0) return res.status(200).json({ success: true, roles: [] });
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('roles')
      .select('id, role_key, role_name, role_scope, tenant_id, is_active, user_manager_role_id, is_org_scope_target, is_employee_access_target')
      .eq('is_active', true)
      .in('id', roleIds)
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
    const ctx = administrationContext(req);
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('companies')
      .select('id, company_name, tenant_id')
      .eq('tenant_id', ctx.tenantId)
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
    const ctx = administrationContext(req);
    const Postgres = getPostgres();
    const scopeTypeId = String(req.query.scope_type_id || '').trim();
    const scopeTypeKeyParam = String(req.query.scope_type_key || '').trim().toUpperCase();
    const tenantId = String(req.query.tenant_id || '').trim();

    if (tenantId && tenantId !== ctx.tenantId) {
      return res.status(403).json({ error: 'No puede consultar entidades de otro tenant' });
    }

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
          .select('id, tenant_id, company_name, legacy_id, is_active')
          .eq('is_active', true)
          .order('company_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.legacy_id ? `${row.company_name} (${row.legacy_id})` : row.company_name,
          description: row.legacy_id || null,
        }));
        break;
      }
      case 'WORK_LOCATION': {
        query = Postgres
          .from('work_locations')
          .select('id, tenant_id, work_location_name, legacy_id, is_active')
          .eq('is_active', true)
          .order('work_location_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.legacy_id ? `${row.work_location_name} (${row.legacy_id})` : row.work_location_name,
          description: row.legacy_id || null,
        }));
        break;
      }
      case 'DEPARTMENT': {
        query = Postgres
          .from('departments')
          .select('id, tenant_id, department_name, legacy_id, is_active')
          .eq('is_active', true)
          .order('department_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.legacy_id ? `${row.department_name} (${row.legacy_id})` : row.department_name,
          description: row.legacy_id || null,
        }));
        break;
      }
      case 'AREA': {
        query = Postgres
          .from('areas')
          .select('id, tenant_id, area_name, legacy_id, is_active')
          .eq('is_active', true)
          .order('area_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.legacy_id ? `${row.area_name} (${row.legacy_id})` : row.area_name,
          description: row.legacy_id || null,
        }));
        break;
      }
      case 'COST_CENTER': {
        query = Postgres
          .from('cost_centers')
          .select('id, tenant_id, cost_center_name, legacy_id, is_active')
          .eq('is_active', true)
          .order('cost_center_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.legacy_id ? `${row.cost_center_name} (${row.legacy_id})` : row.cost_center_name,
          description: row.legacy_id || null,
        }));
        break;
      }
      case 'WORK_GROUP': {
        query = Postgres
          .from('work_groups')
          .select('id, tenant_id, work_group_name, legacy_id, is_active')
          .eq('is_active', true)
          .order('work_group_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.legacy_id ? `${row.work_group_name} (${row.legacy_id})` : row.work_group_name,
          description: row.legacy_id || null,
        }));
        break;
      }
      case 'EMPLOYEE_PROFILE': {
        query = Postgres
          .from('employee_profiles')
          .select('id, tenant_id, profile_name, legacy_id, is_active')
          .eq('is_active', true)
          .order('profile_name');
        if (scopedTenantId) query = query.eq('tenant_id', scopedTenantId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        rows = (data || []).map((row: any) => ({
          id: row.id,
          label: row.legacy_id ? `${row.profile_name} (${row.legacy_id})` : row.profile_name,
          description: row.legacy_id || null,
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
    const ctx = administrationContext(req);
    const userIds = await manageableUserIds(ctx);
    if (userIds.length === 0) {
      return res.status(200).json({ success: true, summaries: [], count: 0 });
    }
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('user_roles')
      .select(`
        user_id,
        role_id,
        created_at,
        role:roles!user_roles_role_id_fkey(role_name, role_key)
      `)
      .in('user_id', userIds)
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
      role_ids: string[];
      role_keys: string[];
      role_names: string[];
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
          role_ids: row.role_id ? [row.role_id] : [],
          role_keys: roleKey ? [roleKey] : [],
          role_names: roleName ? [roleName] : [],
          role_count: 1,
        };
      } else {
        if (row.role_id && !summariesByUserId[userId].role_ids.includes(row.role_id)) {
          summariesByUserId[userId].role_ids.push(row.role_id);
        }
        if (roleKey && !summariesByUserId[userId].role_keys.includes(roleKey)) {
          summariesByUserId[userId].role_keys.push(roleKey);
        }
        if (roleName && !summariesByUserId[userId].role_names.includes(roleName)) {
          summariesByUserId[userId].role_names.push(roleName);
        }
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
// USER-ROLES (sub-recursos estÃ¡ticos) â€” ANTES de /:user_id/*
// ============================================================================

// PUT /user-roles/:user_role_id - Actualizar asignaciÃ³n de rol
router.put('/user-roles/:user_role_id', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const ctx = administrationContext(req);
    if (!(await canManageUserRole(ctx, userRoleId))) {
      return res.status(403).json({ error: 'No puede administrar esta asignación de rol' });
    }
    const body = req.body;
    const { tenant_id, role_id, company_id, valid_from, valid_to, is_active } = body;

    const Postgres = getPostgres();

    const { data: currentUserRole, error: currentError } = await Postgres
      .from('user_roles')
      .select('id, tenant_id, user_id, role_id, company_id')
      .eq('id', userRoleId)
      .single();

    if (currentError || !currentUserRole) {
      return res.status(404).json({ error: 'AsignaciÃ³n de rol no encontrada' });
    }

    const nextTenantId = tenant_id || currentUserRole.tenant_id;
    const nextRoleId = role_id || currentUserRole.role_id;
    const nextCompanyId = company_id === undefined ? currentUserRole.company_id : (company_id || null);

    if (!(await canManageRole(ctx, nextRoleId))) {
      return res.status(403).json({ error: 'No puede asignar el rol solicitado' });
    }

    const { data: duplicated } = await Postgres
      .from('user_roles')
      .select('id, is_active')
      .eq('tenant_id', nextTenantId)
      .eq('user_id', currentUserRole.user_id)
      .eq('role_id', nextRoleId)
      .is('company_id', nextCompanyId)
      .neq('id', userRoleId)
      .maybeSingle();

    if (duplicated) {
      return res.status(409).json({ error: 'Ya existe una asignaciÃ³n con ese rol y empresa para este usuario' });
    }

    const updateData: any = { updated_by: ctx.userId, updated_at: new Date().toISOString() };
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
      return res.status(404).json({ error: 'AsignaciÃ³n de rol no encontrada' });
    }

    return res.status(200).json({ success: true, userRole: updatedUserRole, message: 'AsignaciÃ³n actualizada exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PUT /user-roles/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PATCH /user-roles/:user_role_id/status - Activar/Desactivar user_role
router.patch('/user-roles/:user_role_id/status', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const ctx = administrationContext(req);
    if (!(await canManageUserRole(ctx, userRoleId))) {
      return res.status(403).json({ error: 'No puede administrar esta asignación de rol' });
    }
    const body = req.body;
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
    }

    const Postgres = getPostgres();

    const { data: updatedUserRole, error } = await Postgres
      .from('user_roles')
      .update({ is_active, updated_by: ctx.userId, updated_at: new Date().toISOString() })
      .eq('id', userRoleId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!updatedUserRole) return res.status(404).json({ error: 'AsignaciÃ³n de rol no encontrada' });

    return res.status(200).json({
      success: true,
      userRole: updatedUserRole,
      message: `AsignaciÃ³n de rol ${is_active ? 'activada' : 'desactivada'} exitosamente`,
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /user-roles/:id/status:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// DELETE /user-roles/:user_role_id - Desasignar rol de usuario (elimina relaciÃ³n y sus alcances)
router.delete('/user-roles/:user_role_id', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const ctx = administrationContext(req);
    if (!(await canManageUserRole(ctx, userRoleId))) {
      return res.status(403).json({ error: 'No puede administrar esta asignación de rol' });
    }
    const Postgres = getPostgres();

    const { data: existingUserRole, error: existingError } = await Postgres
      .from('user_roles')
      .select('id')
      .eq('id', userRoleId)
      .maybeSingle();

    if (existingError) return res.status(500).json({ error: existingError.message });
    if (!existingUserRole) return res.status(404).json({ error: 'AsignaciÃ³n de rol no encontrada' });

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

// GET /user-roles/:user_role_id/scopes - Listar alcances de una asignaciÃ³n
router.delete('/user-roles/:user_role_id/scopes/inactive', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const ctx = administrationContext(req);
    if (!(await canManageUserRole(ctx, userRoleId, true))) {
      return res.status(403).json({ error: 'Este rol de usuario no admite administración de alcances' });
    }
    const Postgres = getPostgres();

    const { data: deletedScopes, error } = await Postgres
      .from('user_role_scopes')
      .delete()
      .eq('user_role_id', userRoleId)
      .eq('is_active', false)
      .select('id');

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      deleted_count: deletedScopes?.length || 0,
      message: 'Alcances inactivos eliminados exitosamente',
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en DELETE /user-roles/:id/scopes/inactive:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

router.get('/user-roles/:user_role_id/scopes', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const ctx = administrationContext(req);
    if (!(await canManageUserRole(ctx, userRoleId, true))) {
      return res.status(403).json({ error: 'Este rol de usuario no admite administración de alcances' });
    }
    const Postgres = getPostgres();

    const { data: scopes, error } = await Postgres
      .from('user_role_scopes')
      .select(`
        *,
        scope_type:scope_types!user_role_scopes_scope_type_id_fkey(scope_type_key, scope_type_name)
      `)
      .eq('user_role_id', userRoleId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[USERS-MGMT] Error cargando user_role_scopes:', error);
      return res.status(500).json({ error: error.message });
    }

    const { data: inactiveScopes, error: inactiveCountError } = await Postgres
      .from('user_role_scopes')
      .select('id')
      .eq('user_role_id', userRoleId)
      .eq('is_active', false);

    if (inactiveCountError) {
      console.error('[USERS-MGMT] Error contando user_role_scopes inactivos:', inactiveCountError);
      return res.status(500).json({ error: inactiveCountError.message });
    }

    const entityLabels = await resolveScopeEntityLabels(Postgres, scopes || []);
    const scopeIds = (scopes || []).map((s: any) => s.id).filter(Boolean);
    const resolvedEntityNames = new Map<string, string>();

    if (scopeIds.length > 0) {
      const { data: resolvedScopes, error: resolvedScopesError } = await Postgres
        .from('v_user_role_scopes_resolved')
        .select('id, scope_entity_name')
        .in('id', scopeIds);

      if (resolvedScopesError) {
        console.warn('[USERS-MGMT] No se pudieron resolver nombres desde v_user_role_scopes_resolved:', resolvedScopesError);
      } else {
        for (const resolvedScope of resolvedScopes || []) {
          if (resolvedScope.id && resolvedScope.scope_entity_name) {
            resolvedEntityNames.set(resolvedScope.id, resolvedScope.scope_entity_name);
          }
        }
      }
    }

    const scopesWithLabels = (scopes || []).map((s: any) => {
      const scopeTypeKey = s.scope_type?.scope_type_key || null;
      const entityLabel = entityLabels.get(`${String(scopeTypeKey || '').toUpperCase()}:${s.scope_entity_id}`);
      const resolvedEntityName = resolvedEntityNames.get(s.id);
      return {
        ...s,
        scope_type_key: scopeTypeKey,
        scope_type_name: s.scope_type?.scope_type_name || null,
        scope_entity_label: resolvedEntityName || entityLabel?.label || null,
        scope_entity_description: null,
      };
    });

    return res.status(200).json({
      success: true,
      scopes: scopesWithLabels,
      count: scopesWithLabels.length,
      inactive_count: inactiveScopes?.length || 0,
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en GET /user-roles/:id/scopes:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// POST /user-roles/:user_role_id/scopes - Agregar alcance a una asignaciÃ³n
router.post('/user-roles/:user_role_id/scopes', async (req: Request, res: Response) => {
  try {
    const userRoleId = req.params.user_role_id;
    const ctx = administrationContext(req);
    if (!(await canManageUserRole(ctx, userRoleId, true))) {
      return res.status(403).json({ error: 'Este rol de usuario no admite administración de alcances' });
    }
    const body = req.body;
    const { tenant_id, scope_type_id, scope_entity_id } = body;

    if (!tenant_id || !scope_type_id || !scope_entity_id) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, scope_type_id, scope_entity_id' });
    }

    const Postgres = getPostgres();

    const { data: existing } = await Postgres
      .from('user_role_scopes')
      .select('id, is_active')
      .eq('tenant_id', tenant_id)
      .eq('user_role_id', userRoleId)
      .eq('scope_type_id', scope_type_id)
      .eq('scope_entity_id', scope_entity_id)
      .maybeSingle();

    if (existing?.is_active) {
      return res.status(409).json({ error: 'Ya existe ese alcance para esta asignaciÃ³n de rol' });
    }

    if (existing?.id) {
      const { data: reactivatedScope, error: reactivateError } = await Postgres
        .from('user_role_scopes')
        .update({
          is_active: true,
          updated_by: ctx.userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (reactivateError) {
        console.error('[USERS-MGMT] Error reactivando user_role_scope:', reactivateError);
        return res.status(500).json({ error: reactivateError.message });
      }

      return res.status(200).json({ success: true, scope: reactivatedScope, message: 'Alcance reactivado exitosamente' });
    }

    const { data: newScope, error } = await Postgres
      .from('user_role_scopes')
      .insert({
        tenant_id,
        user_role_id: userRoleId,
        scope_type_id,
        scope_entity_id,
        is_active: true,
        created_by: ctx.userId,
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
    const ctx = administrationContext(req);
    if (!(await canManageScope(ctx, scopeId))) {
      return res.status(403).json({ error: 'No puede administrar este alcance' });
    }
    const body = req.body;
    const { tenant_id, user_role_id, scope_type_id, scope_entity_id } = body;

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
      .eq('is_active', true)
      .neq('id', scopeId)
      .maybeSingle();

    if (duplicated) {
      return res.status(409).json({ error: 'Ya existe ese alcance para esta asignaciÃ³n de rol' });
    }

    const updateData: any = {
      tenant_id,
      user_role_id,
      scope_type_id,
      scope_entity_id,
      is_active: true,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    };

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
    const ctx = administrationContext(req);
    if (!(await canManageScope(ctx, scopeId))) {
      return res.status(403).json({ error: 'No puede administrar este alcance' });
    }
    const body = req.body;
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
    }

    const Postgres = getPostgres();

    const { data: updatedScope, error } = await Postgres
      .from('user_role_scopes')
      .update({ is_active, updated_by: ctx.userId, updated_at: new Date().toISOString() })
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
// USERS â€” rutas dinÃ¡micas van AL FINAL
// ============================================================================

// DELETE /scopes/:scope_id - Eliminar alcance
router.delete('/scopes/:scope_id', async (req: Request, res: Response) => {
  try {
    const scopeId = req.params.scope_id;
    const ctx = administrationContext(req);
    if (!(await canManageScope(ctx, scopeId))) {
      return res.status(403).json({ error: 'No puede administrar este alcance' });
    }
    const Postgres = getPostgres();

    const { data: deletedScope, error } = await Postgres
      .from('user_role_scopes')
      .delete()
      .eq('id', scopeId)
      .select('id, user_role_id')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!deletedScope) return res.status(404).json({ error: 'Alcance no encontrado' });

    return res.status(200).json({
      success: true,
      scope: deletedScope,
      message: 'Alcance eliminado exitosamente',
    });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en DELETE /scopes/:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET / - Listar usuarios
router.get('/', async (req: Request, res: Response) => {
  try {
    const ctx = administrationContext(req);
    const userIds = await manageableUserIds(ctx);
    if (userIds.length === 0) return res.status(200).json({ success: true, users: [], count: 0 });
    const Postgres = getPostgres();

    const { data: users, error } = await Postgres
      .from('users')
      .select(`
        *,
        tenant:tenants!users_tenant_id_fkey(tenant_key, tenant_name),
        language:system_languages!users_preferred_language_code_fkey(language_name)
      `)
      .in('id', userIds)
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

// GET /:id - Obtener usuario especÃ­fico
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const ctx = administrationContext(req);
    if (!(await canManageUser(ctx, id))) {
      return res.status(403).json({ error: 'No puede administrar este usuario' });
    }
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
    const ctx = administrationContext(req);
    if (!(await canCreateUsers(ctx))) {
      return res.status(403).json({ error: 'No tiene permiso para crear nuevos usuarios' });
    }

    const body = req.body;
    const {
      tenant_id,
      username,
      display_name,
      email,
      phone,
      preferred_language_code,
      role_id,
      password,
      is_active = true,
    } = body;

    if (!tenant_id || !username || !email || !password || !role_id) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, username, email, password, role_id' });
    }

    if (tenant_id !== ctx.tenantId) {
      return res.status(403).json({ error: 'No puede crear usuarios en otro tenant' });
    }
    if (!(await canManageRole(ctx, role_id))) {
      return res.status(403).json({ error: 'Su rol no puede crear usuarios con el rol solicitado' });
    }

    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return res.status(400).json({ error: 'El formato del email no es vÃ¡lido' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseÃ±a debe tener al menos 8 caracteres' });
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
      return res.status(500).json({ error: 'Error al crear usuario de autenticaciÃ³n', details: authError?.message });
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
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (userError) {
      console.error('[USERS-MGMT] Error creando public user:', userError);
      await Postgres.auth.admin.deleteUser(authUserId);
      return res.status(500).json({ error: 'Error al crear perfil de usuario', details: userError.message });
    }

    const { error: roleAssignmentError } = await Postgres
      .from('user_roles')
      .insert({
        tenant_id,
        user_id: newUser.id,
        role_id,
        company_id: null,
        is_active: true,
        created_by: ctx.userId,
      });

    if (roleAssignmentError) {
      await Postgres.from('users').delete().eq('id', newUser.id);
      await Postgres.auth.admin.deleteUser(authUserId);
      return res.status(500).json({ error: 'Error al asignar el rol inicial', details: roleAssignmentError.message });
    }

    const { error: syncPasswordError } = await Postgres.auth.admin.updateUserById(authUserId, {
      password,
    });
    if (syncPasswordError) {
      return res.status(500).json({
        error: 'Error al sincronizar contraseÃ±a en users',
        details: syncPasswordError.message,
      });
    }

    return res.status(201).json({ success: true, user: newUser, role_id, message: 'Usuario creado exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en POST /:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// PUT /:id - Actualizar usuario
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const ctx = administrationContext(req);
    if (!(await canManageUser(ctx, id))) {
      return res.status(403).json({ error: 'No puede administrar este usuario' });
    }
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
        return res.status(400).json({ error: 'El formato del email no es vÃ¡lido' });
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
      return res.status(400).json({ error: 'La contraseÃ±a debe tener al menos 8 caracteres' });
    }

    const updateData: any = { updated_by: ctx.userId, updated_at: new Date().toISOString() };
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
        return res.status(500).json({ error: 'Error al sincronizar usuario de autenticaciÃ³n', details: authUpdateError.message });
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
    const ctx = administrationContext(req);
    if (!(await canManageUser(ctx, id))) {
      return res.status(403).json({ error: 'No puede administrar este usuario' });
    }
    const body = req.body;
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
    }

    const Postgres = getPostgres();

    const { data: updatedUser, error } = await Postgres
      .from('users')
      .update({ is_active, updated_by: ctx.userId, updated_at: new Date().toISOString() })
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

// PATCH /:id/reset-password - Resetear contraseÃ±a de usuario
router.patch('/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const ctx = administrationContext(req);
    if (!(await canManageUser(ctx, id))) {
      return res.status(403).json({ error: 'No puede administrar este usuario' });
    }
    const body = req.body;
    const { new_password } = body;

    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'La contraseÃ±a debe tener al menos 8 caracteres' });
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
      return res.status(500).json({ error: 'Error al resetear contraseÃ±a', details: pwError.message });
    }

    return res.status(200).json({ success: true, message: 'ContraseÃ±a reseteada exitosamente' });
  } catch (err: any) {
    console.error('[USERS-MGMT] Error en PATCH /:id/reset-password:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
});

// GET /:user_id/roles - Listar roles de un usuario
router.get('/:user_id/roles', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id;
    const ctx = administrationContext(req);
    if (!(await canManageUser(ctx, userId))) {
      return res.status(403).json({ error: 'No puede administrar este usuario' });
    }
    const Postgres = getPostgres();

    const { data: userRoles, error } = await Postgres
      .from('user_roles')
      .select(`
        *,
        role:roles!user_roles_role_id_fkey(role_key, role_name, role_scope, data_scope, is_org_scope_target, is_employee_access_target),
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
        .select('id, role_key, role_name, role_scope, data_scope, is_org_scope_target, is_employee_access_target')
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
      is_org_scope_target: ur.role?.is_org_scope_target ?? fallbackRole?.is_org_scope_target ?? false,
      is_employee_access_target: ur.role?.is_employee_access_target ?? fallbackRole?.is_employee_access_target ?? false,
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
    const ctx = administrationContext(req);
    const body = req.body;
    const { tenant_id, role_id, company_id, valid_from, valid_to, is_active = true } = body;

    if (!tenant_id || !role_id) {
      return res.status(400).json({ error: 'Campos obligatorios: tenant_id, role_id' });
    }

    if (!(await canManageUser(ctx, userId)) || !(await canManageRole(ctx, role_id))) {
      return res.status(403).json({ error: 'No puede asignar este rol al usuario' });
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
        created_by: ctx.userId,
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


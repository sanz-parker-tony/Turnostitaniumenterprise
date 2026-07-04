import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';

type AuthContext = {
  userId: string;
  tenantId: string;
  authUserId: string;
};

type ScopeRulePayload = {
  company_id: string | null;
  work_location_id: string | null;
  department_id: string | null;
  area_id: string | null;
  cost_center_id: string | null;
  work_group_id: string | null;
  employee_profile_id: string | null;
};

type ScopeRemovalConflict = {
  company_id: string;
  company_name: string | null;
  assigned_employee_count: number;
  employees: Array<{
    employee_id: string;
    employee_code: string | null;
    employee_name: string | null;
    employee_lastname: string | null;
  }>;
};

const router = Router();

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

async function ensureTenantAdmin(ctx: AuthContext): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
        AND ur.tenant_id = $2
        AND ur.is_active = true
        AND r.is_active = true
        AND r.role_key = 'TENANT_ADMIN'
      LIMIT 1
    `,
    [ctx.userId, ctx.tenantId]
  );

  return result.rows.length > 0;
}

async function ensureTargetUserRole(tenantId: string, userRoleId: string): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM v_user_roles_employee_scope_targets t
      WHERE t.tenant_id = $1
        AND t.user_role_id = $2
      LIMIT 1
    `,
    [tenantId, userRoleId]
  );

  return result.rows.length > 0;
}

async function hasScreenActionPermission(
  ctx: AuthContext,
  screenKey: string,
  actionKey: string
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM user_roles ur
      JOIN roles r
        ON r.id = ur.role_id
       AND r.is_active = true
      JOIN role_screen_actions rsa
        ON rsa.role_id = r.id
       AND rsa.tenant_id = ur.tenant_id
       AND rsa.is_active = true
       AND rsa.is_allowed = true
      JOIN screen_actions sa
        ON sa.id = rsa.screen_action_id
       AND sa.is_active = true
      JOIN screens s
        ON s.id = sa.screen_id
       AND s.is_active = true
      JOIN actions a
        ON a.id = sa.action_id
       AND a.is_active = true
      WHERE ur.user_id = $1
        AND ur.tenant_id = $2
        AND ur.is_active = true
        AND s.screen_key = $3
        AND a.action_key = $4
      LIMIT 1
    `,
    [ctx.userId, ctx.tenantId, screenKey, actionKey]
  );

  return result.rows.length > 0;
}

function normalizeLimit(raw: unknown, fallback = 50, max = 200): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(max, Math.floor(value));
}

function normalizeOffset(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

function normalizeUuid(raw: unknown): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  return value;
}

function normalizeSearch(raw: unknown): string | null {
  const value = String(raw || '').trim();
  return value ? value : null;
}

async function validateScopeEntityBelongsTenant(
  tenantId: string,
  scopeTypeKey: string,
  scopeEntityId: string
): Promise<boolean> {
  const tableByScopeType: Record<string, { table: string; idColumn: string; tenantColumn: string }> = {
    COMPANY: { table: 'companies', idColumn: 'id', tenantColumn: 'tenant_id' },
    WORK_LOCATION: { table: 'work_locations', idColumn: 'id', tenantColumn: 'tenant_id' },
    DEPARTMENT: { table: 'departments', idColumn: 'id', tenantColumn: 'tenant_id' },
    AREA: { table: 'areas', idColumn: 'id', tenantColumn: 'tenant_id' },
    COST_CENTER: { table: 'cost_centers', idColumn: 'id', tenantColumn: 'tenant_id' },
    WORK_GROUP: { table: 'work_groups', idColumn: 'id', tenantColumn: 'tenant_id' },
    EMPLOYEE_PROFILE: { table: 'employee_profiles', idColumn: 'id', tenantColumn: 'tenant_id' },
    EMPLOYEE: { table: 'employees', idColumn: 'id', tenantColumn: 'tenant_id' },
    EMPLOYEE_EXCLUDE: { table: 'employees', idColumn: 'id', tenantColumn: 'tenant_id' },
  };

  const mapping = tableByScopeType[scopeTypeKey];
  if (!mapping) return false;

  const result = await pool.query(
    `SELECT 1 FROM ${mapping.table} WHERE ${mapping.idColumn} = $1 AND ${mapping.tenantColumn} = $2 LIMIT 1`,
    [scopeEntityId, tenantId]
  );
  return result.rows.length > 0;
}

async function validateRuleReferencesBelongTenant(
  tenantId: string,
  rule: ScopeRulePayload
): Promise<{ ok: boolean; field?: string }> {
  const tableByField: Record<keyof ScopeRulePayload, string> = {
    company_id: 'companies',
    work_location_id: 'work_locations',
    department_id: 'departments',
    area_id: 'areas',
    cost_center_id: 'cost_centers',
    work_group_id: 'work_groups',
    employee_profile_id: 'employee_profiles',
  };

  for (const [field, table] of Object.entries(tableByField) as Array<[keyof ScopeRulePayload, string]>) {
    const value = normalizeUuid(rule[field]);
    if (!value) continue;

    const result = await pool.query(
      `SELECT 1 FROM ${table} WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [value, tenantId]
    );
    if (result.rows.length === 0) return { ok: false, field };
  }

  return { ok: true };
}

async function getRemovedCompanyAssignmentConflicts(
  tenantId: string,
  userRoleId: string,
  removedCompanyIds: string[]
): Promise<ScopeRemovalConflict[]> {
  if (removedCompanyIds.length === 0) return [];

  const result = await pool.query(
    `
      SELECT DISTINCT
        c.id::text AS company_id,
        c.company_name,
        e.id::text AS employee_id,
        e.employee_code,
        e.employee_name,
        e.employee_lastname
      FROM user_role_employee_assignments ura
      JOIN employees e
        ON e.id = ura.employee_id
       AND e.tenant_id = ura.tenant_id
       AND e.is_active = true
      JOIN employee_companies ec
        ON ec.employee_id = ura.employee_id
       AND ec.tenant_id = ura.tenant_id
       AND ec.is_active = true
       AND ec.company_id = ANY($3::uuid[])
      JOIN companies c
        ON c.id = ec.company_id
      WHERE ura.tenant_id = $1
        AND ura.user_role_id = $2
        AND ura.is_active = true
      ORDER BY c.company_name ASC, e.employee_lastname ASC, e.employee_name ASC, e.employee_code ASC
    `,
    [tenantId, userRoleId, removedCompanyIds]
  );

  const byCompany = new Map<string, ScopeRemovalConflict>();
  for (const row of result.rows) {
    const companyId = String(row.company_id);
    const current: ScopeRemovalConflict = byCompany.get(companyId) || {
      company_id: companyId,
      company_name: row.company_name || null,
      assigned_employee_count: 0,
      employees: [],
    };

    current.assigned_employee_count += 1;
    current.employees.push({
      employee_id: String(row.employee_id),
      employee_code: row.employee_code || null,
      employee_name: row.employee_name || null,
      employee_lastname: row.employee_lastname || null,
    });
    byCompany.set(companyId, current);
  }

  return Array.from(byCompany.values());
}

function normalizeRuleId(raw: unknown): string | null {
  const value = String(raw || '').trim();
  if (!value || value === '0' || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') return null;
  return value;
}

router.get('/targets', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const roleKey = String(req.query.role_key || '').trim().toUpperCase();
    const search = normalizeSearch(req.query.search);

    const params: any[] = [ctx.tenantId];
    const where: string[] = ['t.tenant_id = $1'];

    if (roleKey) {
      params.push(roleKey);
      where.push(`t.role_key = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(`(t.username ILIKE $${params.length} OR COALESCE(t.display_name, '') ILIKE $${params.length})`);
    }

    const result = await pool.query(
      `
        SELECT
          t.user_role_id,
          t.user_id,
          t.username,
          t.display_name,
          t.role_id,
          t.role_key,
          t.role_name
        FROM v_user_roles_employee_scope_targets t
        WHERE ${where.join(' AND ')}
        ORDER BY t.role_key, COALESCE(t.display_name, t.username), t.username
      `,
      params
    );

    return res.status(200).json({ success: true, targets: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /targets error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/catalogs/hierarchy', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const companyId = normalizeUuid(req.query.company_id);
    const workLocationId = normalizeUuid(req.query.work_location_id);
    const departmentId = normalizeUuid(req.query.department_id);
    const areaId = normalizeUuid(req.query.area_id);
    const costCenterId = normalizeUuid(req.query.cost_center_id);

    const params: any[] = [ctx.tenantId];
    const filters: string[] = ['ec.tenant_id = $1', 'ec.is_active = true'];

    if (companyId) {
      params.push(companyId);
      filters.push(`ec.company_id = $${params.length}`);
    }
    if (workLocationId) {
      params.push(workLocationId);
      filters.push(`ec.work_location_id = $${params.length}`);
    }
    if (departmentId) {
      params.push(departmentId);
      filters.push(`ec.department_id = $${params.length}`);
    }
    if (areaId) {
      params.push(areaId);
      filters.push(`ec.area_id = $${params.length}`);
    }
    if (costCenterId) {
      params.push(costCenterId);
      filters.push(`ec.cost_center_id = $${params.length}`);
    }

    const baseWhere = filters.join(' AND ');

    const [companies, workLocations, departments, areas, costCenters, workGroups] = await Promise.all([
      pool.query(
        `
          SELECT DISTINCT c.id, c.company_name
          FROM employee_companies ec
          JOIN companies c ON c.id = ec.company_id
          WHERE ${baseWhere}
          ORDER BY c.company_name
        `,
        params
      ),
      pool.query(
        `
          SELECT DISTINCT wl.id, wl.work_location_name
          FROM employee_companies ec
          JOIN work_locations wl ON wl.id = ec.work_location_id
          WHERE ${baseWhere}
            AND ec.work_location_id IS NOT NULL
          ORDER BY wl.work_location_name
        `,
        params
      ),
      pool.query(
        `
          SELECT DISTINCT d.id, d.department_name
          FROM employee_companies ec
          JOIN departments d ON d.id = ec.department_id
          WHERE ${baseWhere}
            AND ec.department_id IS NOT NULL
          ORDER BY d.department_name
        `,
        params
      ),
      pool.query(
        `
          SELECT DISTINCT a.id, a.area_name
          FROM employee_companies ec
          JOIN areas a ON a.id = ec.area_id
          WHERE ${baseWhere}
            AND ec.area_id IS NOT NULL
          ORDER BY a.area_name
        `,
        params
      ),
      pool.query(
        `
          SELECT DISTINCT cc.id, cc.cost_center_name
          FROM employee_companies ec
          JOIN cost_centers cc ON cc.id = ec.cost_center_id
          WHERE ${baseWhere}
            AND ec.cost_center_id IS NOT NULL
          ORDER BY cc.cost_center_name
        `,
        params
      ),
      pool.query(
        `
          SELECT DISTINCT wg.id, wg.work_group_name
          FROM employee_companies ec
          JOIN work_groups wg ON wg.id = ec.work_group_id
          WHERE ${baseWhere}
            AND ec.work_group_id IS NOT NULL
          ORDER BY wg.work_group_name
        `,
        params
      ),
    ]);

    return res.status(200).json({
      success: true,
      catalogs: {
        companies: companies.rows,
        work_locations: workLocations.rows,
        departments: departments.rows,
        areas: areas.rows,
        cost_centers: costCenters.rows,
        work_groups: workGroups.rows,
      },
    });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /catalogs/hierarchy error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/catalogs/tree', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const companyId = normalizeUuid(req.query.company_id);
    const workLocationId = normalizeUuid(req.query.work_location_id);
    const departmentId = normalizeUuid(req.query.department_id);
    const areaId = normalizeUuid(req.query.area_id);

    const params: any[] = [ctx.tenantId];
    const filters: string[] = ['ec.tenant_id = $1', 'ec.is_active = true'];

    if (companyId) {
      params.push(companyId);
      filters.push(`ec.company_id = $${params.length}`);
    }
    if (workLocationId) {
      params.push(workLocationId);
      filters.push(`ec.work_location_id = $${params.length}`);
    }
    if (departmentId) {
      params.push(departmentId);
      filters.push(`ec.department_id = $${params.length}`);
    }
    if (areaId) {
      params.push(areaId);
      filters.push(`ec.area_id = $${params.length}`);
    }

    const result = await pool.query(
      `
        SELECT DISTINCT
          ec.company_id,
          c.company_name,
          ec.work_location_id,
          wl.work_location_name,
          ec.department_id,
          d.department_name,
          ec.area_id,
          ar.area_name,
          ec.cost_center_id,
          cc.cost_center_name,
          ec.work_group_id,
          wg.work_group_name,
          ec.employee_profile_id,
          ep.profile_name
        FROM employee_companies ec
        JOIN companies c ON c.id = ec.company_id
        LEFT JOIN work_locations wl ON wl.id = ec.work_location_id
        LEFT JOIN departments d ON d.id = ec.department_id
        LEFT JOIN areas ar ON ar.id = ec.area_id
        LEFT JOIN cost_centers cc ON cc.id = ec.cost_center_id
        LEFT JOIN work_groups wg ON wg.id = ec.work_group_id
        LEFT JOIN employee_profiles ep ON ep.id = ec.employee_profile_id
        WHERE ${filters.join(' AND ')}
        ORDER BY
          c.company_name,
          wl.work_location_name NULLS LAST,
          d.department_name NULLS LAST,
          ar.area_name NULLS LAST,
          cc.cost_center_name NULLS LAST,
          wg.work_group_name NULLS LAST,
          ep.profile_name NULLS LAST
      `,
      params
    );

    const companyMap = new Map<string, any>();

    for (const row of result.rows) {
      const companyKey = String(row.company_id);
      if (!companyMap.has(companyKey)) {
        companyMap.set(companyKey, {
          id: companyKey,
          name: row.company_name,
          work_locations: [],
          _workLocationMap: new Map<string, any>(),
        });
      }
      const companyNode = companyMap.get(companyKey);

      const workLocationKey = row.work_location_id ? String(row.work_location_id) : null;
      if (!workLocationKey) continue;
      if (!companyNode._workLocationMap.has(workLocationKey)) {
        const workLocationNode = {
          id: workLocationKey,
          name: row.work_location_name,
          departments: [],
          _departmentMap: new Map<string, any>(),
        };
        companyNode._workLocationMap.set(workLocationKey, workLocationNode);
        companyNode.work_locations.push(workLocationNode);
      }
      const workLocationNode = companyNode._workLocationMap.get(workLocationKey);

      const departmentKey = row.department_id ? String(row.department_id) : null;
      if (!departmentKey) continue;
      if (!workLocationNode._departmentMap.has(departmentKey)) {
        const departmentNode = {
          id: departmentKey,
          name: row.department_name,
          areas: [],
          _areaMap: new Map<string, any>(),
        };
        workLocationNode._departmentMap.set(departmentKey, departmentNode);
        workLocationNode.departments.push(departmentNode);
      }
      const departmentNode = workLocationNode._departmentMap.get(departmentKey);

      const areaKey = row.area_id ? String(row.area_id) : null;
      if (!areaKey) continue;
      if (!departmentNode._areaMap.has(areaKey)) {
        const areaNode = {
          id: areaKey,
          name: row.area_name,
          cost_centers: [],
          work_groups: [],
          employee_profiles: [],
          _costCenterMap: new Map<string, any>(),
          _workGroupMap: new Map<string, any>(),
          _employeeProfileMap: new Map<string, any>(),
        };
        departmentNode._areaMap.set(areaKey, areaNode);
        departmentNode.areas.push(areaNode);
      }
      const areaNode = departmentNode._areaMap.get(areaKey);

      const costCenterKey = row.cost_center_id ? String(row.cost_center_id) : null;
      if (costCenterKey && !areaNode._costCenterMap.has(costCenterKey)) {
        const costCenterNode = {
          id: costCenterKey,
          name: row.cost_center_name,
        };
        areaNode._costCenterMap.set(costCenterKey, costCenterNode);
        areaNode.cost_centers.push(costCenterNode);
      }

      const workGroupKey = row.work_group_id ? String(row.work_group_id) : null;
      if (workGroupKey && !areaNode._workGroupMap.has(workGroupKey)) {
        const workGroupNode = {
          id: workGroupKey,
          name: row.work_group_name,
        };
        areaNode._workGroupMap.set(workGroupKey, workGroupNode);
        areaNode.work_groups.push(workGroupNode);
      }

      const employeeProfileKey = row.employee_profile_id ? String(row.employee_profile_id) : null;
      if (employeeProfileKey && !areaNode._employeeProfileMap.has(employeeProfileKey)) {
        const employeeProfileNode = {
          id: employeeProfileKey,
          name: row.profile_name,
        };
        areaNode._employeeProfileMap.set(employeeProfileKey, employeeProfileNode);
        areaNode.employee_profiles.push(employeeProfileNode);
      }
    }

    const tree = Array.from(companyMap.values()).map((companyNode) => {
      const workLocations = (companyNode.work_locations || []).map((workLocationNode: any) => {
        const departments = (workLocationNode.departments || []).map((departmentNode: any) => {
          const areas = (departmentNode.areas || []).map((areaNode: any) => ({
            id: areaNode.id,
            name: areaNode.name,
            cost_centers: areaNode.cost_centers,
            work_groups: areaNode.work_groups,
            employee_profiles: areaNode.employee_profiles,
          }));
          return {
            id: departmentNode.id,
            name: departmentNode.name,
            areas,
          };
        });
        return {
          id: workLocationNode.id,
          name: workLocationNode.name,
          departments,
        };
      });

      return {
        id: companyNode.id,
        name: companyNode.name,
        work_locations: workLocations,
      };
    });

    return res.status(200).json({
      success: true,
      tree,
      count: tree.length,
    });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /catalogs/tree error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/employee-access/capabilities', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const screenKey = 'SEC_USER_EMPLOYEE_ACCESS';
    const [canAuthorizeOne, canAuthorizeAll, canRevokeOne, canRevokeAll] = await Promise.all([
      hasScreenActionPermission(ctx, screenKey, 'AUTH_ONE'),
      hasScreenActionPermission(ctx, screenKey, 'AUTH_ALL'),
      hasScreenActionPermission(ctx, screenKey, 'REVOKE_ONE'),
      hasScreenActionPermission(ctx, screenKey, 'REVOKE_ALL'),
    ]);

    return res.status(200).json({
      success: true,
      capabilities: {
        can_authorize_one: canAuthorizeOne,
        can_authorize_all: canAuthorizeAll,
        can_revoke_one: canRevokeOne,
        can_revoke_all: canRevokeAll,
      },
    });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /employee-access/capabilities error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/:user_role_id/scope-rules', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const result = await pool.query(
      `
        SELECT
          r.id,
          r.tenant_id,
          r.user_role_id,
          r.company_id,
          c.company_name,
          r.work_location_id,
          wl.work_location_name,
          r.department_id,
          d.department_name,
          r.area_id,
          a.area_name,
          r.cost_center_id,
          cc.cost_center_name,
          r.work_group_id,
          wg.work_group_name,
          r.employee_profile_id,
          ep.profile_name AS employee_profile_name,
          r.is_active,
          r.created_by,
          r.created_at,
          r.updated_by,
          r.updated_at
        FROM user_role_scope_rules r
        JOIN companies c ON c.id = r.company_id
        LEFT JOIN work_locations wl ON wl.id = r.work_location_id
        LEFT JOIN departments d ON d.id = r.department_id
        LEFT JOIN areas a ON a.id = r.area_id
        LEFT JOIN cost_centers cc ON cc.id = r.cost_center_id
        LEFT JOIN work_groups wg ON wg.id = r.work_group_id
        LEFT JOIN employee_profiles ep ON ep.id = r.employee_profile_id
        WHERE r.tenant_id = $1
          AND r.user_role_id = $2
          AND r.is_active = true
        ORDER BY
          c.company_name,
          wl.work_location_name NULLS FIRST,
          d.department_name NULLS FIRST,
          a.area_name NULLS FIRST,
          cc.cost_center_name NULLS FIRST,
          wg.work_group_name NULLS FIRST,
          ep.profile_name NULLS FIRST
      `,
      [ctx.tenantId, userRoleId]
    );

    return res.status(200).json({ success: true, rules: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /:user_role_id/scope-rules error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.post('/:user_role_id/scope-rules/removal-preview', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const companyIds = Array.isArray(req.body?.company_ids)
      ? Array.from(new Set(req.body.company_ids.map((value: any) => normalizeRuleId(value)).filter(Boolean) as string[]))
      : [];

    if (companyIds.length === 0) {
      return res.status(400).json({ error: 'company_ids debe contener al menos una empresa' });
    }

    for (const companyId of companyIds) {
      const belongsToTenant = await validateScopeEntityBelongsTenant(ctx.tenantId, 'COMPANY', companyId);
      if (!belongsToTenant) {
        return res.status(400).json({ error: 'Una empresa no pertenece al tenant o no existe', company_id: companyId });
      }
    }

    const conflicts = await getRemovedCompanyAssignmentConflicts(ctx.tenantId, userRoleId, companyIds);

    return res.status(200).json({
      success: true,
      conflicts,
      has_conflicts: conflicts.length > 0,
    });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] POST /:user_role_id/scope-rules/removal-preview error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.put('/:user_role_id/scope-rules', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const rules = Array.isArray(req.body?.rules) ? req.body.rules : null;
    if (rules === null) {
      return res.status(400).json({ error: 'Body invalido: rules debe ser un arreglo' });
    }
    const cascadeEmployeeAssignments = req.body?.cascade_employee_assignments === true;
    const requestedCascadeCompanyIds = Array.isArray(req.body?.cascade_company_ids)
      ? Array.from(new Set(req.body.cascade_company_ids.map((value: any) => normalizeRuleId(value)).filter(Boolean) as string[]))
      : [];

    const parsedRules: ScopeRulePayload[] = rules.map((raw: any) => ({
      company_id: normalizeRuleId(raw?.company_id),
      work_location_id: normalizeRuleId(raw?.work_location_id),
      department_id: normalizeRuleId(raw?.department_id),
      area_id: normalizeRuleId(raw?.area_id),
      cost_center_id: normalizeRuleId(raw?.cost_center_id),
      work_group_id: normalizeRuleId(raw?.work_group_id),
      employee_profile_id: normalizeRuleId(raw?.employee_profile_id),
    }));

    for (const rule of parsedRules) {
      if (!rule.company_id) {
        return res.status(400).json({ error: 'Cada regla requiere company_id' });
      }

      const validation = await validateRuleReferencesBelongTenant(ctx.tenantId, rule);
      if (!validation.ok) {
        return res.status(400).json({
          error: `La referencia ${validation.field} no pertenece al tenant o no existe`,
          field: validation.field,
        });
      }
    }

    const dedupedRules = Array.from(
      parsedRules
        .reduce((acc: Map<string, ScopeRulePayload>, rule: ScopeRulePayload) => {
          const key = [
            rule.company_id,
            rule.work_location_id || '',
            rule.department_id || '',
            rule.area_id || '',
            rule.cost_center_id || '',
            rule.work_group_id || '',
            rule.employee_profile_id || '',
          ].join('::');
          acc.set(key, rule);
          return acc;
        }, new Map<string, ScopeRulePayload>())
        .values()
    );

    const currentCompaniesResult = await pool.query(
      `
        SELECT DISTINCT company_id::text AS company_id
        FROM user_role_scope_rules
        WHERE tenant_id = $1
          AND user_role_id = $2
          AND is_active = true
          AND company_id IS NOT NULL
      `,
      [ctx.tenantId, userRoleId]
    );
    const nextCompanyIds = new Set(dedupedRules.map((rule) => String(rule.company_id || '')).filter(Boolean));
    const removedCompanyIds = currentCompaniesResult.rows
      .map((row) => String(row.company_id || '').trim())
      .filter((companyId) => companyId && !nextCompanyIds.has(companyId));

    const conflicts = await getRemovedCompanyAssignmentConflicts(ctx.tenantId, userRoleId, removedCompanyIds);
    const requestedCascadeCompanySet = new Set(
      cascadeEmployeeAssignments ? removedCompanyIds : requestedCascadeCompanyIds
    );
    const unconfirmedConflicts = conflicts.filter((conflict) => !requestedCascadeCompanySet.has(conflict.company_id));
    if (unconfirmedConflicts.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'SCOPE_COMPANY_HAS_ASSIGNED_EMPLOYEES',
        requires_confirmation: true,
        message: 'Una o mas empresas removidas tienen empleados asignados al usuario. Confirma para remover tambien esos empleados.',
        conflicts: unconfirmedConflicts,
      });
    }

    await client.query('BEGIN');

    await client.query(
      `
        DELETE FROM user_role_scope_rules
         WHERE tenant_id = $1
           AND user_role_id = $2
      `,
      [ctx.tenantId, userRoleId]
    );

    let revokedEmployeeAssignments = 0;
    const confirmedCascadeCompanyIds = removedCompanyIds.filter((companyId) => requestedCascadeCompanySet.has(companyId));
    if (confirmedCascadeCompanyIds.length > 0) {
      const cascadeResult = await client.query(
        `
          UPDATE user_role_employee_assignments ura
             SET is_active = false,
                 updated_by = $4,
                 updated_at = now()
           WHERE ura.tenant_id = $1
             AND ura.user_role_id = $2
             AND ura.is_active = true
             AND EXISTS (
               SELECT 1
               FROM employee_companies ec
               WHERE ec.tenant_id = ura.tenant_id
                 AND ec.employee_id = ura.employee_id
                 AND ec.is_active = true
                 AND ec.company_id = ANY($3::uuid[])
             )
        `,
        [ctx.tenantId, userRoleId, confirmedCascadeCompanyIds, 'TENANT_ADMIN']
      );
      revokedEmployeeAssignments = cascadeResult.rowCount || 0;
    }

    for (const rule of dedupedRules) {
      await client.query(
        `
          INSERT INTO user_role_scope_rules (
            id,
            tenant_id,
            user_role_id,
            company_id,
            work_location_id,
            department_id,
            area_id,
            cost_center_id,
            work_group_id,
            employee_profile_id,
            is_active,
            created_by
          )
          VALUES (
            gen_random_uuid(),
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            true,
            $10
          )
        `,
        [
          ctx.tenantId,
          userRoleId,
          rule.company_id,
          rule.work_location_id,
          rule.department_id,
          rule.area_id,
          rule.cost_center_id,
          rule.work_group_id,
          rule.employee_profile_id,
          'TENANT_ADMIN',
        ]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Reglas de alcance actualizadas exitosamente',
      applied_count: dedupedRules.length,
      revoked_employee_assignments: revokedEmployeeAssignments,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[SECURITY-SCOPES] PUT /:user_role_id/scope-rules error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

router.get('/:user_role_id/scopes', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const result = await pool.query(
      `
        SELECT
          v.id,
          v.tenant_id,
          v.user_role_id,
          v.scope_type_id,
          v.scope_type_key,
          v.scope_type_name,
          v.scope_entity_id,
          COALESCE(
            v.scope_entity_name,
            CASE WHEN v.scope_type_key = 'EMPLOYEE_PROFILE' THEN ep.profile_name ELSE NULL END
          ) AS scope_entity_name,
          v.is_active,
          v.created_by,
          v.created_at,
          v.updated_by,
          v.updated_at
        FROM v_user_role_scopes_resolved v
        LEFT JOIN employee_profiles ep
          ON v.scope_type_key = 'EMPLOYEE_PROFILE'
         AND ep.id = v.scope_entity_id
        WHERE v.tenant_id = $1
          AND v.user_role_id = $2
          AND v.is_active = true
        ORDER BY v.scope_type_key, scope_entity_name NULLS LAST, v.scope_entity_id
      `,
      [ctx.tenantId, userRoleId]
    );

    return res.status(200).json({ success: true, scopes: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /:user_role_id/scopes error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.put('/:user_role_id/scopes', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes : null;
    if (scopes === null) {
      return res.status(400).json({ error: 'Body invalido: scopes debe ser un arreglo' });
    }

    const parsedScopes: Array<{ scopeTypeKey: string; scopeEntityId: string }> = [];
    for (const raw of scopes) {
      const scopeTypeKey = String(raw?.scope_type_key || '').trim().toUpperCase();
      const scopeEntityId = String(raw?.scope_entity_id || '').trim();
      if (!scopeTypeKey || !scopeEntityId) {
        return res.status(400).json({ error: 'Cada item de scopes requiere scope_type_key y scope_entity_id' });
      }
      parsedScopes.push({ scopeTypeKey, scopeEntityId });
    }

    const dedupedScopes = Array.from(
      parsedScopes.reduce((acc, row) => {
        acc.set(`${row.scopeTypeKey}::${row.scopeEntityId}`, row);
        return acc;
      }, new Map<string, { scopeTypeKey: string; scopeEntityId: string }>())
      .values()
    );

    const uniqueKeys = Array.from(new Set(dedupedScopes.map((s) => s.scopeTypeKey)));
    const scopeTypesResult = await pool.query(
      `
        SELECT id, scope_type_key
        FROM scope_types
        WHERE is_active = true
          AND scope_type_key = ANY($1::text[])
      `,
      [uniqueKeys]
    );

    const typeMap = new Map<string, string>();
    for (const row of scopeTypesResult.rows) {
      typeMap.set(String(row.scope_type_key), String(row.id));
    }

    const missingScopeTypeKeys = uniqueKeys.filter((key) => !typeMap.has(key));
    if (missingScopeTypeKeys.includes('EMPLOYEE_PROFILE')) {
      return res.status(400).json({
        error:
          'El scope_type_key EMPLOYEE_PROFILE no existe o esta inactivo. Ejecuta la migracion 039_ADD_EMPLOYEE_PROFILE_SCOPE_TYPE.sql y vuelve a intentar.',
      });
    }
    if (missingScopeTypeKeys.includes('EMPLOYEE_EXCLUDE')) {
      return res.status(400).json({
        error:
          'El scope_type_key EMPLOYEE_EXCLUDE no existe o esta inactivo. Ejecuta la migracion 041_ADD_EMPLOYEE_EXCLUDE_SCOPE_TYPE.sql y vuelve a intentar.',
      });
    }

    for (const s of dedupedScopes) {
      if (!typeMap.has(s.scopeTypeKey)) {
        return res.status(400).json({ error: `scope_type_key no valido o inactivo: ${s.scopeTypeKey}` });
      }

      const belongsToTenant = await validateScopeEntityBelongsTenant(ctx.tenantId, s.scopeTypeKey, s.scopeEntityId);
      if (!belongsToTenant) {
        return res.status(400).json({
          error: `scope_entity_id no pertenece al tenant o no existe para scope_type_key=${s.scopeTypeKey}`,
          scope_type_key: s.scopeTypeKey,
          scope_entity_id: s.scopeEntityId,
        });
      }
    }

    await client.query('BEGIN');

    await client.query(
      `
        DELETE FROM user_role_scopes
         WHERE tenant_id = $1
           AND user_role_id = $2
      `,
      [ctx.tenantId, userRoleId]
    );

    for (const s of dedupedScopes) {
      const scopeTypeId = typeMap.get(s.scopeTypeKey) as string;
      await client.query(
        `
          INSERT INTO user_role_scopes (
            id,
            tenant_id,
            user_role_id,
            scope_type_id,
            scope_entity_id,
            is_active,
            created_by
          )
          VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5)
        `,
        [ctx.tenantId, userRoleId, scopeTypeId, s.scopeEntityId, 'TENANT_ADMIN']
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Scopes actualizados exitosamente',
      applied_count: dedupedScopes.length,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[SECURITY-SCOPES] PUT /:user_role_id/scopes error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

function buildEmployeeFilters(params: any[], query: Request['query'], prefixAlias: string): string[] {
  const where: string[] = [];

  const companyId = normalizeUuid(query.company_id);
  const workLocationId = normalizeUuid(query.work_location_id);
  const departmentId = normalizeUuid(query.department_id);
  const areaId = normalizeUuid(query.area_id);
  const costCenterId = normalizeUuid(query.cost_center_id);
  const workGroupId = normalizeUuid(query.work_group_id);
  const employeeProfileId = normalizeUuid(query.employee_profile_id);

  if (companyId) {
    params.push(companyId);
    where.push(`${prefixAlias}.company_id = $${params.length}`);
  }
  if (workLocationId) {
    params.push(workLocationId);
    where.push(`${prefixAlias}.work_location_id = $${params.length}`);
  }
  if (departmentId) {
    params.push(departmentId);
    where.push(`${prefixAlias}.department_id = $${params.length}`);
  }
  if (areaId) {
    params.push(areaId);
    where.push(`${prefixAlias}.area_id = $${params.length}`);
  }
  if (costCenterId) {
    params.push(costCenterId);
    where.push(`${prefixAlias}.cost_center_id = $${params.length}`);
  }
  if (workGroupId) {
    params.push(workGroupId);
    where.push(`${prefixAlias}.work_group_id = $${params.length}`);
  }
  if (employeeProfileId) {
    params.push(employeeProfileId);
    where.push(`${prefixAlias}.employee_profile_id = $${params.length}`);
  }

  return where;
}

router.get('/:user_role_id/employees/authorized', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const search = normalizeSearch(req.query.search);
    const limit = normalizeLimit(req.query.limit, 50, 200);
    const offset = normalizeOffset(req.query.offset);

    const params: any[] = [ctx.tenantId, userRoleId];
    const where: string[] = [
      'a.tenant_id = $1',
      'a.user_role_id = $2',
      `NOT EXISTS (
        SELECT 1
        FROM user_role_scopes ux
        JOIN scope_types sx ON sx.id = ux.scope_type_id
        WHERE ux.tenant_id = a.tenant_id
          AND ux.user_role_id = a.user_role_id
          AND ux.scope_entity_id = a.employee_id
          AND ux.is_active = true
          AND sx.is_active = true
          AND sx.scope_type_key = 'EMPLOYEE_EXCLUDE'
      )`,
    ];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(e.employee_name ILIKE $${params.length} OR e.employee_lastname ILIKE $${params.length} OR COALESCE(e.employee_code,'') ILIKE $${params.length})`);
    }

    where.push(...buildEmployeeFilters(params, req.query, 'a'));

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const listResult = await pool.query(
      `
        WITH base AS (
          SELECT
            a.employee_id,
            e.employee_code,
            e.employee_name,
            e.employee_lastname,
            MIN(a.company_id) AS company_id,
            MIN(c.company_name) AS company_name,
            MIN(a.work_location_id) AS work_location_id,
            MIN(wl.work_location_name) AS work_location_name,
            MIN(a.department_id) AS department_id,
            MIN(d.department_name) AS department_name,
            MIN(a.area_id) AS area_id,
            MIN(ar.area_name) AS area_name,
            MIN(a.cost_center_id) AS cost_center_id,
            MIN(cc.cost_center_name) AS cost_center_name,
            MIN(a.work_group_id) AS work_group_id,
            MIN(wg.work_group_name) AS work_group_name,
            BOOL_OR(a.authorization_source IN ('EMPLOYEE', 'BOTH')) AS has_employee_source,
            BOOL_OR(a.authorization_source IN ('STRUCTURAL', 'BOTH')) AS has_structural_source
          FROM v_user_role_authorized_employees a
          JOIN employees e ON e.id = a.employee_id
          LEFT JOIN companies c ON c.id = a.company_id
          LEFT JOIN work_locations wl ON wl.id = a.work_location_id
          LEFT JOIN departments d ON d.id = a.department_id
          LEFT JOIN areas ar ON ar.id = a.area_id
          LEFT JOIN cost_centers cc ON cc.id = a.cost_center_id
          LEFT JOIN work_groups wg ON wg.id = a.work_group_id
          WHERE ${where.join(' AND ')}
          GROUP BY a.employee_id, e.employee_code, e.employee_name, e.employee_lastname
        )
        SELECT
          employee_id,
          employee_code,
          employee_name,
          employee_lastname,
          company_id,
          company_name,
          work_location_id,
          work_location_name,
          department_id,
          department_name,
          area_id,
          area_name,
          cost_center_id,
          cost_center_name,
          work_group_id,
          work_group_name,
          CASE
            WHEN has_employee_source AND has_structural_source THEN 'BOTH'
            WHEN has_employee_source THEN 'EMPLOYEE'
            ELSE 'STRUCTURAL'
          END AS authorization_source
        FROM base
        ORDER BY employee_lastname, employee_name
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      params
    );

    const countResult = await pool.query(
      `
        SELECT COUNT(DISTINCT a.employee_id) AS total
        FROM v_user_role_authorized_employees a
        JOIN employees e ON e.id = a.employee_id
        WHERE ${where.join(' AND ')}
      `,
      params.slice(0, params.length - 2)
    );

    return res.status(200).json({
      success: true,
      employees: listResult.rows,
      count: Number(countResult.rows[0]?.total || 0),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /:user_role_id/employees/authorized error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/:user_role_id/employees/unauthorized', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const search = normalizeSearch(req.query.search);
    const limit = normalizeLimit(req.query.limit, 50, 200);
    const offset = normalizeOffset(req.query.offset);

    const params: any[] = [ctx.tenantId, userRoleId];
    const where: string[] = [
      'ec.tenant_id = $1',
      'ec.is_active = true',
      'e.is_active = true',
      `(
        NOT EXISTS (
          SELECT 1
          FROM v_user_role_authorized_employees a
          WHERE a.tenant_id = $1
            AND a.user_role_id = $2
            AND a.employee_id = ec.employee_id
        )
        OR EXISTS (
          SELECT 1
          FROM user_role_scopes ux
          JOIN scope_types sx ON sx.id = ux.scope_type_id
          WHERE ux.tenant_id = $1
            AND ux.user_role_id = $2
            AND ux.scope_entity_id = ec.employee_id
            AND ux.is_active = true
            AND sx.is_active = true
            AND sx.scope_type_key = 'EMPLOYEE_EXCLUDE'
        )
      )`,
    ];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(e.employee_name ILIKE $${params.length} OR e.employee_lastname ILIKE $${params.length} OR COALESCE(e.employee_code,'') ILIKE $${params.length})`);
    }

    where.push(...buildEmployeeFilters(params, req.query, 'ec'));

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const listResult = await pool.query(
      `
        SELECT DISTINCT ON (ec.employee_id)
          ec.employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          ec.company_id,
          c.company_name,
          ec.work_location_id,
          wl.work_location_name,
          ec.department_id,
          d.department_name,
          ec.area_id,
          ar.area_name,
          ec.cost_center_id,
          cc.cost_center_name,
          ec.work_group_id,
          wg.work_group_name
        FROM employee_companies ec
        JOIN employees e ON e.id = ec.employee_id
        LEFT JOIN companies c ON c.id = ec.company_id
        LEFT JOIN work_locations wl ON wl.id = ec.work_location_id
        LEFT JOIN departments d ON d.id = ec.department_id
        LEFT JOIN areas ar ON ar.id = ec.area_id
        LEFT JOIN cost_centers cc ON cc.id = ec.cost_center_id
        LEFT JOIN work_groups wg ON wg.id = ec.work_group_id
        WHERE ${where.join(' AND ')}
        ORDER BY ec.employee_id, e.employee_lastname, e.employee_name
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      params
    );

    const countResult = await pool.query(
      `
        SELECT COUNT(DISTINCT ec.employee_id) AS total
        FROM employee_companies ec
        JOIN employees e ON e.id = ec.employee_id
        WHERE ${where.join(' AND ')}
      `,
      params.slice(0, params.length - 2)
    );

    return res.status(200).json({
      success: true,
      employees: listResult.rows,
      count: Number(countResult.rows[0]?.total || 0),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /:user_role_id/employees/unauthorized error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/:user_role_id/employee-access/filters', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const optionParams: any[] = [ctx.tenantId, userRoleId];
    const optionWhere: string[] = [
      'a.tenant_id = $1',
      'a.user_role_id = $2',
      'e.is_active = true',
    ];
    optionWhere.push(...buildEmployeeFilters(optionParams, req.query, 'a'));

    const [companies, workLocations, departments, areas, costCenters, workGroups, profiles] = await Promise.all([
      pool.query(
        `
          SELECT DISTINCT c.id, c.company_name AS name
          FROM v_user_role_authorized_employees a
          JOIN employees e ON e.id = a.employee_id
          JOIN companies c ON c.id = a.company_id
          WHERE a.tenant_id = $1
            AND a.user_role_id = $2
            AND e.is_active = true
          ORDER BY c.company_name
        `,
        [ctx.tenantId, userRoleId]
      ),
      pool.query(
        `
          SELECT DISTINCT wl.id, wl.work_location_name AS name
          FROM v_user_role_authorized_employees a
          JOIN employees e ON e.id = a.employee_id
          JOIN work_locations wl ON wl.id = a.work_location_id
          WHERE ${optionWhere.join(' AND ')}
            AND a.work_location_id IS NOT NULL
          ORDER BY wl.work_location_name
        `,
        optionParams
      ),
      pool.query(
        `
          SELECT DISTINCT d.id, d.department_name AS name
          FROM v_user_role_authorized_employees a
          JOIN employees e ON e.id = a.employee_id
          JOIN departments d ON d.id = a.department_id
          WHERE ${optionWhere.join(' AND ')}
            AND a.department_id IS NOT NULL
          ORDER BY d.department_name
        `,
        optionParams
      ),
      pool.query(
        `
          SELECT DISTINCT a.id, a.area_name AS name
          FROM v_user_role_authorized_employees auth
          JOIN employees e ON e.id = auth.employee_id
          JOIN areas a ON a.id = auth.area_id
          WHERE ${optionWhere.join(' AND ').replace(/\ba\./g, 'auth.')}
            AND auth.area_id IS NOT NULL
          ORDER BY a.area_name
        `,
        optionParams
      ),
      pool.query(
        `
          SELECT DISTINCT cc.id, cc.cost_center_name AS name
          FROM v_user_role_authorized_employees a
          JOIN employees e ON e.id = a.employee_id
          JOIN cost_centers cc ON cc.id = a.cost_center_id
          WHERE ${optionWhere.join(' AND ')}
            AND a.cost_center_id IS NOT NULL
          ORDER BY cc.cost_center_name
        `,
        optionParams
      ),
      pool.query(
        `
          SELECT DISTINCT wg.id, wg.work_group_name AS name
          FROM v_user_role_authorized_employees a
          JOIN employees e ON e.id = a.employee_id
          JOIN work_groups wg ON wg.id = a.work_group_id
          WHERE ${optionWhere.join(' AND ')}
            AND a.work_group_id IS NOT NULL
          ORDER BY wg.work_group_name
        `,
        optionParams
      ),
      pool.query(
        `
          SELECT DISTINCT ep.id, ep.profile_name AS name
          FROM v_user_role_authorized_employees a
          JOIN employees e ON e.id = a.employee_id
          JOIN employee_profiles ep ON ep.id = a.employee_profile_id
          WHERE ${optionWhere.join(' AND ')}
            AND a.employee_profile_id IS NOT NULL
          ORDER BY ep.profile_name
        `,
        optionParams
      ),
    ]);

    return res.status(200).json({
      success: true,
      filters: {
        companies: companies.rows,
        work_locations: workLocations.rows,
        departments: departments.rows,
        areas: areas.rows,
        cost_centers: costCenters.rows,
        work_groups: workGroups.rows,
        employee_profiles: profiles.rows,
      },
    });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /:user_role_id/employee-access/filters error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/:user_role_id/employee-access/authorized', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const search = normalizeSearch(req.query.search);
    const limit = normalizeLimit(req.query.limit, 50, 500);
    const offset = normalizeOffset(req.query.offset);

    const params: any[] = [ctx.tenantId, userRoleId];
    const where: string[] = [
      'ura.tenant_id = $1',
      'ura.user_role_id = $2',
      'ura.is_active = true',
      'e.is_active = true',
      'ec.is_active = true',
    ];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(e.employee_name ILIKE $${params.length} OR e.employee_lastname ILIKE $${params.length} OR COALESCE(e.employee_code,'') ILIKE $${params.length})`);
    }

    where.push(...buildEmployeeFilters(params, req.query, 'ec'));

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const listResult = await pool.query(
      `
        SELECT DISTINCT ON (e.id)
          e.id AS employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          ec.company_id,
          c.company_name,
          ec.work_location_id,
          wl.work_location_name,
          ec.department_id,
          d.department_name,
          ec.area_id,
          ar.area_name,
          ec.cost_center_id,
          cc.cost_center_name,
          ec.work_group_id,
          wg.work_group_name,
          'ASSIGNED'::text AS authorization_source
        FROM user_role_employee_assignments ura
        JOIN employees e
          ON e.id = ura.employee_id
         AND e.tenant_id = ura.tenant_id
        JOIN employee_companies ec
          ON ec.employee_id = e.id
         AND ec.tenant_id = ura.tenant_id
        JOIN v_user_role_authorized_employees scope
          ON scope.tenant_id = ura.tenant_id
         AND scope.user_role_id = ura.user_role_id
         AND scope.employee_id = e.id
         AND scope.company_id = ec.company_id
        LEFT JOIN companies c ON c.id = ec.company_id
        LEFT JOIN work_locations wl ON wl.id = ec.work_location_id
        LEFT JOIN departments d ON d.id = ec.department_id
        LEFT JOIN areas ar ON ar.id = ec.area_id
        LEFT JOIN cost_centers cc ON cc.id = ec.cost_center_id
        LEFT JOIN work_groups wg ON wg.id = ec.work_group_id
        WHERE ${where.join(' AND ')}
        ORDER BY e.id, e.employee_lastname, e.employee_name
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      params
    );

    const countResult = await pool.query(
      `
        SELECT COUNT(DISTINCT e.id) AS total
        FROM user_role_employee_assignments ura
        JOIN employees e
          ON e.id = ura.employee_id
         AND e.tenant_id = ura.tenant_id
        JOIN employee_companies ec
          ON ec.employee_id = e.id
         AND ec.tenant_id = ura.tenant_id
        JOIN v_user_role_authorized_employees scope
          ON scope.tenant_id = ura.tenant_id
         AND scope.user_role_id = ura.user_role_id
         AND scope.employee_id = e.id
         AND scope.company_id = ec.company_id
        WHERE ${where.join(' AND ')}
      `,
      params.slice(0, params.length - 2)
    );

    return res.status(200).json({
      success: true,
      employees: listResult.rows,
      count: Number(countResult.rows[0]?.total || 0),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /:user_role_id/employee-access/authorized error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.get('/:user_role_id/employee-access/unauthorized', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const search = normalizeSearch(req.query.search);
    const limit = normalizeLimit(req.query.limit, 50, 500);
    const offset = normalizeOffset(req.query.offset);

    const params: any[] = [ctx.tenantId, userRoleId];
    const where: string[] = [
      'scope.tenant_id = $1',
      'scope.user_role_id = $2',
      'e.is_active = true',
      `NOT EXISTS (
        SELECT 1
        FROM user_role_employee_assignments ura
        WHERE ura.tenant_id = $1
          AND ura.user_role_id = $2
          AND ura.employee_id = scope.employee_id
          AND ura.is_active = true
      )`,
    ];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(e.employee_name ILIKE $${params.length} OR e.employee_lastname ILIKE $${params.length} OR COALESCE(e.employee_code,'') ILIKE $${params.length})`);
    }

    where.push(...buildEmployeeFilters(params, req.query, 'scope'));

    params.push(limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const listResult = await pool.query(
      `
        SELECT DISTINCT ON (scope.employee_id)
          scope.employee_id,
          e.employee_code,
          e.employee_name,
          e.employee_lastname,
          scope.company_id,
          c.company_name,
          scope.work_location_id,
          wl.work_location_name,
          scope.department_id,
          d.department_name,
          scope.area_id,
          ar.area_name,
          scope.cost_center_id,
          cc.cost_center_name,
          scope.work_group_id,
          wg.work_group_name
        FROM v_user_role_authorized_employees scope
        JOIN employees e ON e.id = scope.employee_id
        LEFT JOIN companies c ON c.id = scope.company_id
        LEFT JOIN work_locations wl ON wl.id = scope.work_location_id
        LEFT JOIN departments d ON d.id = scope.department_id
        LEFT JOIN areas ar ON ar.id = scope.area_id
        LEFT JOIN cost_centers cc ON cc.id = scope.cost_center_id
        LEFT JOIN work_groups wg ON wg.id = scope.work_group_id
        WHERE ${where.join(' AND ')}
        ORDER BY scope.employee_id, e.employee_lastname, e.employee_name
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      params
    );

    const countResult = await pool.query(
      `
        SELECT COUNT(DISTINCT scope.employee_id) AS total
        FROM v_user_role_authorized_employees scope
        JOIN employees e ON e.id = scope.employee_id
        WHERE ${where.join(' AND ')}
      `,
      params.slice(0, params.length - 2)
    );

    return res.status(200).json({
      success: true,
      employees: listResult.rows,
      count: Number(countResult.rows[0]?.total || 0),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] GET /:user_role_id/employee-access/unauthorized error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

router.post('/:user_role_id/employee-access/authorize', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const employeeIds = Array.isArray(req.body?.employee_ids)
      ? Array.from(new Set(req.body.employee_ids.map((x: any) => String(x || '').trim()).filter(Boolean)))
      : [];
    if (employeeIds.length === 0) return res.status(400).json({ error: 'employee_ids es requerido y debe contener elementos' });

    const requiredActionKey = employeeIds.length > 1 ? 'AUTH_ALL' : 'AUTH_ONE';
    const canRun = await hasScreenActionPermission(ctx, 'SEC_USER_EMPLOYEE_ACCESS', requiredActionKey);
    if (!canRun) {
      return res.status(403).json({
        error: `No autorizado para esta accion (${requiredActionKey}).`,
      });
    }

    const check = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM v_user_role_authorized_employees scope
        JOIN employees e
          ON e.id = scope.employee_id
         AND e.tenant_id = scope.tenant_id
        WHERE scope.tenant_id = $1
          AND scope.user_role_id = $2
          AND e.is_active = true
          AND scope.employee_id = ANY($3::uuid[])
      `,
      [ctx.tenantId, userRoleId, employeeIds]
    );
    if (Number(check.rows[0]?.total || 0) !== employeeIds.length) {
      return res.status(400).json({ error: 'Uno o mas employee_ids no pertenecen al alcance autorizado del usuario' });
    }

    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO user_role_employee_assignments (
          tenant_id,
          user_role_id,
          employee_id,
          is_active,
          created_by,
          updated_by,
          updated_at
        )
        SELECT $1, $2, x.employee_id::uuid, true, 'TENANT_ADMIN', 'TENANT_ADMIN', now()
        FROM unnest($3::text[]) AS x(employee_id)
        ON CONFLICT (tenant_id, user_role_id, employee_id)
        DO UPDATE SET
          is_active = true,
          updated_by = 'TENANT_ADMIN',
          updated_at = now()
      `,
      [ctx.tenantId, userRoleId, employeeIds]
    );
    await client.query('COMMIT');

    return res.status(200).json({ success: true, updated: employeeIds.length });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[SECURITY-SCOPES] POST /:user_role_id/employee-access/authorize error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  } finally {
    client.release();
  }
});

router.post('/:user_role_id/employee-access/revoke', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const isTenantAdmin = await ensureTenantAdmin(ctx);
    if (!isTenantAdmin) return res.status(403).json({ error: 'Solo TENANT_ADMIN puede gestionar estos alcances' });

    const userRoleId = String(req.params.user_role_id || '').trim();
    if (!userRoleId) return res.status(400).json({ error: 'user_role_id es requerido' });

    const targetExists = await ensureTargetUserRole(ctx.tenantId, userRoleId);
    if (!targetExists) return res.status(404).json({ error: 'Asignacion de rol objetivo no encontrada para este tenant' });

    const employeeIds = Array.isArray(req.body?.employee_ids)
      ? Array.from(new Set(req.body.employee_ids.map((x: any) => String(x || '').trim()).filter(Boolean)))
      : [];
    if (employeeIds.length === 0) return res.status(400).json({ error: 'employee_ids es requerido y debe contener elementos' });

    const requiredActionKey = employeeIds.length > 1 ? 'REVOKE_ALL' : 'REVOKE_ONE';
    const canRun = await hasScreenActionPermission(ctx, 'SEC_USER_EMPLOYEE_ACCESS', requiredActionKey);
    if (!canRun) {
      return res.status(403).json({
        error: `No autorizado para esta accion (${requiredActionKey}).`,
      });
    }

    const result = await pool.query(
      `
        UPDATE user_role_employee_assignments
           SET is_active = false,
               updated_by = 'TENANT_ADMIN',
               updated_at = now()
         WHERE tenant_id = $1
           AND user_role_id = $2
           AND employee_id = ANY($3::uuid[])
           AND is_active = true
      `,
      [ctx.tenantId, userRoleId, employeeIds]
    );

    return res.status(200).json({ success: true, updated: result.rowCount || 0 });
  } catch (error: any) {
    console.error('[SECURITY-SCOPES] POST /:user_role_id/employee-access/revoke error:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

export default router;

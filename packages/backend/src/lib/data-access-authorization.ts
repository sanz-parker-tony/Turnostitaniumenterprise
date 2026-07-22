import type { Pool } from 'pg';

export type DataOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';

export type DataAuthorizationDecision = {
  configured: boolean;
  allowed: boolean;
  tenantId: string | null;
  unrestrictedTenantScope: boolean;
  tableHasTenantId: boolean;
  screenKey?: string;
  actionKey?: string;
};

export async function authorizeDataAccess(
  pool: Pool,
  authUserId: string,
  tableName: string,
  operation: DataOperation
): Promise<DataAuthorizationDecision> {
  if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
    return {
      configured: false,
      allowed: false,
      tenantId: null,
      unrestrictedTenantScope: false,
      tableHasTenantId: false,
    };
  }

  const result = await pool.query(
    `
      WITH actor AS (
        SELECT user_row.id AS user_id, user_row.tenant_id
        FROM public.users user_row
        JOIN public.tenants tenant
          ON tenant.id = user_row.tenant_id
         AND tenant.is_active = true
        WHERE user_row.auth_user_id = $1::uuid
          AND user_row.is_active = true
        LIMIT 1
      ), configured_rule AS (
        SELECT rule.id, rule.screen_id, rule.action_id,
               screen.screen_key, action.action_key
        FROM public.data_access_authorization_rules rule
        JOIN public.screens screen
          ON screen.id = rule.screen_id
         AND screen.is_active = true
        JOIN public.actions action
          ON action.id = rule.action_id
         AND action.is_active = true
        WHERE rule.table_name = $2
          AND rule.operation = $3
          AND rule.is_active = true
        LIMIT 1
      )
      SELECT
        actor.tenant_id,
        configured_rule.id IS NOT NULL AS configured,
        configured_rule.screen_key,
        configured_rule.action_key,
        EXISTS (
          SELECT 1
          FROM public.user_roles user_role
          JOIN public.roles role_row
            ON role_row.id = user_role.role_id
           AND role_row.is_active = true
          JOIN public.screen_actions screen_action
            ON screen_action.screen_id = configured_rule.screen_id
           AND screen_action.action_id = configured_rule.action_id
           AND screen_action.is_active = true
          JOIN public.role_screen_actions permission
            ON permission.tenant_id = user_role.tenant_id
           AND permission.role_id = user_role.role_id
           AND permission.screen_action_id = screen_action.id
           AND permission.is_active = true
           AND permission.is_allowed = true
           AND (permission.valid_from IS NULL OR permission.valid_from <= now())
           AND (permission.valid_to IS NULL OR permission.valid_to >= now())
          WHERE user_role.user_id = actor.user_id
            AND user_role.tenant_id = actor.tenant_id
            AND user_role.is_active = true
            AND (user_role.valid_from IS NULL OR user_role.valid_from <= now())
            AND (user_role.valid_to IS NULL OR user_role.valid_to >= now())
        ) AS allowed,
        EXISTS (
          SELECT 1
          FROM public.user_roles user_role
          JOIN public.roles role_row
            ON role_row.id = user_role.role_id
           AND role_row.is_active = true
          WHERE user_role.user_id = actor.user_id
            AND user_role.tenant_id = actor.tenant_id
            AND user_role.is_active = true
            AND role_row.role_scope = 'SYSTEM'
            AND role_row.is_system_role = true
            AND (user_role.valid_from IS NULL OR user_role.valid_from <= now())
            AND (user_role.valid_to IS NULL OR user_role.valid_to >= now())
        ) AS unrestricted_tenant_scope,
        EXISTS (
          SELECT 1
          FROM information_schema.columns column_row
          WHERE column_row.table_schema = 'public'
            AND column_row.table_name = $2
            AND column_row.column_name = 'tenant_id'
        ) AS table_has_tenant_id
      FROM actor
      LEFT JOIN configured_rule ON true
    `,
    [authUserId, tableName, operation]
  );

  const row = result.rows[0];
  if (!row) {
    return {
      configured: false,
      allowed: false,
      tenantId: null,
      unrestrictedTenantScope: false,
      tableHasTenantId: false,
    };
  }
  return {
    configured: Boolean(row.configured),
    allowed: Boolean(row.configured) && Boolean(row.allowed),
    tenantId: row.tenant_id ? String(row.tenant_id) : null,
    unrestrictedTenantScope: Boolean(row.unrestricted_tenant_scope),
    tableHasTenantId: Boolean(row.table_has_tenant_id),
    screenKey: row.screen_key ? String(row.screen_key) : undefined,
    actionKey: row.action_key ? String(row.action_key) : undefined,
  };
}

import type { Pool } from 'pg';

export async function hasUnrestrictedEmployeeDataScope(
  pool: Pool,
  tenantId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT COALESCE(BOOL_OR(UPPER(COALESCE(role_row.data_scope, '')) = 'ALL'), false) AS unrestricted
      FROM public.user_roles user_role
      JOIN public.roles role_row
        ON role_row.id = user_role.role_id
       AND role_row.tenant_id = user_role.tenant_id
       AND role_row.is_active = true
      WHERE user_role.tenant_id = $1::uuid
        AND user_role.user_id = $2::uuid
        AND user_role.is_active = true
        AND (user_role.valid_from IS NULL OR user_role.valid_from <= now())
        AND (user_role.valid_to IS NULL OR user_role.valid_to >= now())
    `,
    [tenantId, userId]
  );
  return result.rows[0]?.unrestricted === true;
}

export async function resolveAuthorizedEmployeeIds(
  pool: Pool,
  tenantId: string,
  userId: string
): Promise<string[]> {
  const result = await pool.query(
    `
      SELECT DISTINCT authorized.employee_id::text AS employee_id
      FROM public.user_roles user_role
      JOIN public.roles role_row
        ON role_row.id = user_role.role_id
       AND role_row.tenant_id = user_role.tenant_id
       AND role_row.is_active = true
      JOIN public.v_user_role_authorized_employees authorized
        ON authorized.tenant_id = user_role.tenant_id
       AND authorized.user_role_id = user_role.id
      JOIN public.employees employee
        ON employee.id = authorized.employee_id
       AND employee.tenant_id = authorized.tenant_id
       AND employee.is_active = true
      WHERE user_role.tenant_id = $1::uuid
        AND user_role.user_id = $2::uuid
        AND user_role.is_active = true
        AND (user_role.valid_from IS NULL OR user_role.valid_from <= now())
        AND (user_role.valid_to IS NULL OR user_role.valid_to >= now())
    `,
    [tenantId, userId]
  );
  return result.rows.map((row) => String(row.employee_id));
}

import type { Request } from 'express';
import { pool } from './db.js';

export type ApiAuthorizationDecision =
  | { configured: false; allowed: false }
  | {
      configured: true;
      allowed: boolean;
      ruleId: string;
      screenKey: string;
      actionKey: string;
    };

function requestPath(req: Request): string {
  const original = String(req.originalUrl || req.url || req.path || '/');
  const path = original.split('?', 1)[0] || '/';
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

export async function authorizeConfiguredApiRequest(
  req: Request,
  authUserId: string
): Promise<ApiAuthorizationDecision> {
  const path = requestPath(req);
  const method = String(req.method || 'GET').toUpperCase();

  const result = await pool.query(
    `
      WITH matched_rule AS (
        SELECT
          rule.id,
          rule.screen_id,
          rule.action_id,
          screen.screen_key,
          action.action_key
          ,rule.authorization_mode
        FROM public.api_authorization_rules rule
        JOIN public.screens screen ON screen.id = rule.screen_id AND screen.is_active = true
        JOIN public.actions action ON action.id = rule.action_id AND action.is_active = true
        WHERE rule.is_active = true
          AND (rule.http_method = $1 OR rule.http_method = '*')
          AND (
            $2 = rule.route_prefix
            OR $2 LIKE rule.route_prefix || '/%'
            OR (
              rule.route_prefix ~ ':[A-Za-z_][A-Za-z0-9_]*'
              AND $2 ~ (
                '^'
                || regexp_replace(
                     rule.route_prefix,
                     ':[A-Za-z_][A-Za-z0-9_]*',
                     '[^/]+',
                     'g'
                   )
                || '(?:/.*)?$'
              )
            )
          )
        ORDER BY
          length(rule.route_prefix) DESC,
          CASE WHEN rule.http_method = $1 THEN 0 ELSE 1 END,
          rule.priority DESC,
          rule.id
        LIMIT 1
      ), actor AS (
        SELECT user_row.id AS user_id, user_row.tenant_id
        FROM public.users user_row
        WHERE user_row.auth_user_id = $3
          AND user_row.is_active = true
        LIMIT 1
      )
      SELECT
        matched_rule.id AS rule_id,
        matched_rule.screen_key,
        matched_rule.action_key,
        matched_rule.authorization_mode = 'AUTHENTICATED' OR EXISTS (
          SELECT 1
          FROM actor
          JOIN public.user_roles user_role
            ON user_role.user_id = actor.user_id
           AND user_role.tenant_id = actor.tenant_id
           AND user_role.is_active = true
           AND (user_role.valid_from IS NULL OR user_role.valid_from <= now())
           AND (user_role.valid_to IS NULL OR user_role.valid_to >= now())
          JOIN public.roles role_row ON role_row.id = user_role.role_id AND role_row.is_active = true
          JOIN public.screen_actions screen_action
            ON screen_action.screen_id = matched_rule.screen_id
           AND screen_action.action_id = matched_rule.action_id
           AND screen_action.is_active = true
          JOIN public.role_screen_actions permission
            ON permission.tenant_id = user_role.tenant_id
           AND permission.role_id = user_role.role_id
           AND permission.screen_action_id = screen_action.id
           AND permission.is_active = true
           AND permission.is_allowed = true
           AND (permission.valid_from IS NULL OR permission.valid_from <= now())
           AND (permission.valid_to IS NULL OR permission.valid_to >= now())
        ) AS allowed
      FROM matched_rule
    `,
    [method, path, authUserId]
  );

  const row = result.rows[0];
  if (!row) return { configured: false, allowed: false };

  return {
    configured: true,
    allowed: Boolean(row.allowed),
    ruleId: String(row.rule_id),
    screenKey: String(row.screen_key),
    actionKey: String(row.action_key),
  };
}

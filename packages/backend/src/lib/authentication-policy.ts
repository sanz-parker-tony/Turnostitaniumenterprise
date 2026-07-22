import type { Pool } from 'pg';

export type AuthenticationPolicy = {
  maxLoginAttempts: number;
  loginLockoutMinutes: number;
  passwordMinLength: number;
  sessionTimeoutMinutes: number;
};

const POLICY_KEYS = [
  'SECURITY_MAX_LOGIN_ATTEMPTS',
  'SECURITY_LOGIN_LOCKOUT_MINUTES',
  'SECURITY_PASSWORD_MIN_LENGTH',
  'SECURITY_SESSION_TIMEOUT_MIN',
] as const;

function requiredInteger(
  values: Map<string, string>,
  key: typeof POLICY_KEYS[number],
  min: number,
  max: number
): number {
  const value = Number(values.get(key));
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${key} debe estar configurado en la base de datos con un entero entre ${min} y ${max}`);
  }
  return value;
}

export async function loadAuthenticationPolicy(pool: Pool): Promise<AuthenticationPolicy> {
  const result = await pool.query(
    `
      SELECT setting_key, default_value
      FROM public.system_settings
      WHERE setting_key = ANY($1::text[])
        AND is_active = true
    `,
    [POLICY_KEYS]
  );
  const values = new Map<string, string>(
    result.rows.map((row) => [String(row.setting_key), String(row.default_value ?? '')])
  );

  return {
    maxLoginAttempts: requiredInteger(values, 'SECURITY_MAX_LOGIN_ATTEMPTS', 1, 100),
    loginLockoutMinutes: requiredInteger(values, 'SECURITY_LOGIN_LOCKOUT_MINUTES', 1, 10080),
    passwordMinLength: requiredInteger(values, 'SECURITY_PASSWORD_MIN_LENGTH', 12, 256),
    sessionTimeoutMinutes: requiredInteger(values, 'SECURITY_SESSION_TIMEOUT_MIN', 1, 10080),
  };
}

import { useEffect, useState } from 'react';
import { buildApiUrl } from '../utils/api-config';

export type AuthenticationPolicy = {
  passwordMinLength: number;
};

let cachedPolicy: AuthenticationPolicy | null = null;
let pendingPolicy: Promise<AuthenticationPolicy> | null = null;

export async function getAuthenticationPolicy(): Promise<AuthenticationPolicy> {
  if (cachedPolicy) return cachedPolicy;
  if (!pendingPolicy) {
    pendingPolicy = fetch(buildApiUrl('/auth/policy'))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        const passwordMinLength = Number(payload?.password_min_length);
        if (!response.ok || !Number.isInteger(passwordMinLength) || passwordMinLength < 1) {
          throw new Error(payload?.error || 'No se pudo cargar la política de autenticación.');
        }
        cachedPolicy = { passwordMinLength };
        return cachedPolicy;
      })
      .finally(() => {
        pendingPolicy = null;
      });
  }
  return pendingPolicy;
}

export function useAuthenticationPolicy() {
  const [policy, setPolicy] = useState<AuthenticationPolicy | null>(cachedPolicy);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getAuthenticationPolicy()
      .then((resolvedPolicy) => {
        if (mounted) setPolicy(resolvedPolicy);
      })
      .catch((reason) => {
        if (mounted) {
          setError(reason?.message || 'No se pudo cargar la política de autenticación.');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { policy, error, isLoading: !policy && !error };
}

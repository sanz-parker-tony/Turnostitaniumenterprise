/**
 * Legacy compatibility helper for old Next routes.
 * Frontend now authenticates against backend endpoints.
 */

export function createApiClientServerClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: 'Not implemented' } }),
        }),
      }),
    }),
  };
}

export const createClient = createApiClientServerClient;


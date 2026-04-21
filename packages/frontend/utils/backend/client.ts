import { ApiClient } from '@/lib/api-client';

export function createClient() {
  return ApiClient;
}

export const createApiClient = createClient;

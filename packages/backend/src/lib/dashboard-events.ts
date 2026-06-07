type DashboardEvent = {
  tenant_id: string;
  version: number;
  reason: string;
  employee_id: string | null;
  emitted_at: string;
};

type DashboardEventListener = (event: DashboardEvent) => void;

const tenantVersions = new Map<string, number>();
const tenantListeners = new Map<string, Set<DashboardEventListener>>();

function normalizeTenantId(tenantId: string | null | undefined): string | null {
  const normalized = String(tenantId || '').trim().toLowerCase();
  return normalized || null;
}

export function getTenantDashboardEventVersion(tenantId: string): number {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) return 0;
  return tenantVersions.get(normalizedTenantId) || 0;
}

export function publishTenantDashboardEvent(
  tenantId: string | null | undefined,
  reason = 'time_punch_changed',
  employeeId: string | null = null
): DashboardEvent | null {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) return null;

  const version = getTenantDashboardEventVersion(normalizedTenantId) + 1;
  tenantVersions.set(normalizedTenantId, version);

  const event: DashboardEvent = {
    tenant_id: normalizedTenantId,
    version,
    reason,
    employee_id: employeeId,
    emitted_at: new Date().toISOString(),
  };

  const listeners = tenantListeners.get(normalizedTenantId);
  if (listeners) {
    for (const listener of Array.from(listeners)) {
      listener(event);
    }
  }

  return event;
}

export function waitForTenantDashboardEvent(
  tenantId: string,
  sinceVersion: number,
  timeoutMs = 25000
): Promise<{ event: DashboardEvent | null; timed_out: boolean; version: number }> {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) {
    return Promise.resolve({ event: null, timed_out: true, version: 0 });
  }

  const currentVersion = getTenantDashboardEventVersion(normalizedTenantId);
  if (currentVersion > sinceVersion) {
    return Promise.resolve({ event: null, timed_out: false, version: currentVersion });
  }

  return new Promise((resolve) => {
    let settled = false;
    const listeners = tenantListeners.get(normalizedTenantId) || new Set<DashboardEventListener>();
    tenantListeners.set(normalizedTenantId, listeners);

    const cleanup = () => {
      listeners.delete(listener);
      if (listeners.size === 0) tenantListeners.delete(normalizedTenantId);
    };

    const finish = (event: DashboardEvent | null, timedOut: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      resolve({
        event,
        timed_out: timedOut,
        version: getTenantDashboardEventVersion(normalizedTenantId),
      });
    };

    const listener: DashboardEventListener = (event) => finish(event, false);
    const timeout = setTimeout(() => finish(null, true), timeoutMs);
    listeners.add(listener);
  });
}

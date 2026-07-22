export type ShiftPlanningEvent = {
  tenant_id: string;
  version: number;
  source_table: string;
  operation: string | null;
  employee_id: string | null;
  company_id: string | null;
  emitted_at: string;
};

type ShiftPlanningEventListener = (event: ShiftPlanningEvent) => void;

const tenantVersions = new Map<string, number>();
const tenantListeners = new Map<string, Set<ShiftPlanningEventListener>>();

function normalizeTenantId(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

export function publishTenantShiftPlanningEvent(event: ShiftPlanningEvent): ShiftPlanningEvent | null {
  const tenantId = normalizeTenantId(event.tenant_id);
  const version = Number(event.version);
  if (!tenantId || !Number.isFinite(version) || version < 1) return null;

  const normalizedEvent: ShiftPlanningEvent = {
    ...event,
    tenant_id: tenantId,
    version: Math.trunc(version),
  };
  tenantVersions.set(tenantId, Math.max(tenantVersions.get(tenantId) || 0, normalizedEvent.version));

  const listeners = tenantListeners.get(tenantId);
  if (listeners) {
    for (const listener of Array.from(listeners)) listener(normalizedEvent);
  }
  return normalizedEvent;
}

export function waitForTenantShiftPlanningEvent(
  tenantId: string,
  sinceVersion: number,
  timeoutMs = 25000
): Promise<{ event: ShiftPlanningEvent | null; timed_out: boolean; version: number }> {
  const normalizedTenantId = normalizeTenantId(tenantId);
  if (!normalizedTenantId) return Promise.resolve({ event: null, timed_out: true, version: 0 });

  const currentVersion = tenantVersions.get(normalizedTenantId) || 0;
  if (currentVersion > sinceVersion) {
    return Promise.resolve({ event: null, timed_out: false, version: currentVersion });
  }

  return new Promise((resolve) => {
    let settled = false;
    const listeners = tenantListeners.get(normalizedTenantId) || new Set<ShiftPlanningEventListener>();
    tenantListeners.set(normalizedTenantId, listeners);

    const cleanup = () => {
      listeners.delete(listener);
      if (listeners.size === 0) tenantListeners.delete(normalizedTenantId);
    };
    const finish = (event: ShiftPlanningEvent | null, timedOut: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      resolve({
        event,
        timed_out: timedOut,
        version: Math.max(tenantVersions.get(normalizedTenantId) || 0, event?.version || 0),
      });
    };
    const listener: ShiftPlanningEventListener = (event) => finish(event, false);
    const timeout = setTimeout(() => finish(null, true), timeoutMs);
    listeners.add(listener);
  });
}

export type UserNotificationEvent = {
  tenant_id: string;
  user_id: string;
  version: number;
  reason: string;
  notification_id: string | null;
  operation: string | null;
  emitted_at: string;
};

type UserNotificationEventListener = (event: UserNotificationEvent) => void;

const userVersions = new Map<string, number>();
const userListeners = new Map<string, Set<UserNotificationEventListener>>();

function normalizeIdentifier(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

function getUserKey(tenantId: string | null | undefined, userId: string | null | undefined): string | null {
  const normalizedTenantId = normalizeIdentifier(tenantId);
  const normalizedUserId = normalizeIdentifier(userId);
  if (!normalizedTenantId || !normalizedUserId) return null;
  return `${normalizedTenantId}:${normalizedUserId}`;
}

export function getUserNotificationEventVersion(tenantId: string, userId: string): number {
  const key = getUserKey(tenantId, userId);
  if (!key) return 0;
  return userVersions.get(key) || 0;
}

export function publishUserNotificationEvent(
  tenantId: string | null | undefined,
  userId: string | null | undefined,
  reason = 'user_notifications_changed',
  notificationId: string | null = null,
  operation: string | null = null
): UserNotificationEvent | null {
  const normalizedTenantId = normalizeIdentifier(tenantId);
  const normalizedUserId = normalizeIdentifier(userId);
  const key = getUserKey(normalizedTenantId, normalizedUserId);
  if (!normalizedTenantId || !normalizedUserId || !key) return null;

  const version = getUserNotificationEventVersion(normalizedTenantId, normalizedUserId) + 1;
  userVersions.set(key, version);

  const event: UserNotificationEvent = {
    tenant_id: normalizedTenantId,
    user_id: normalizedUserId,
    version,
    reason,
    notification_id: notificationId,
    operation,
    emitted_at: new Date().toISOString(),
  };

  const listeners = userListeners.get(key);
  if (listeners) {
    for (const listener of Array.from(listeners)) listener(event);
  }

  return event;
}

export function waitForUserNotificationEvent(
  tenantId: string,
  userId: string,
  sinceVersion: number,
  timeoutMs = 25000
): Promise<{ event: UserNotificationEvent | null; timed_out: boolean; version: number }> {
  const key = getUserKey(tenantId, userId);
  if (!key) return Promise.resolve({ event: null, timed_out: true, version: 0 });

  const currentVersion = getUserNotificationEventVersion(tenantId, userId);
  if (currentVersion > sinceVersion) {
    return Promise.resolve({ event: null, timed_out: false, version: currentVersion });
  }

  return new Promise((resolve) => {
    let settled = false;
    const listeners = userListeners.get(key) || new Set<UserNotificationEventListener>();
    userListeners.set(key, listeners);

    const cleanup = () => {
      listeners.delete(listener);
      if (listeners.size === 0) userListeners.delete(key);
    };

    const finish = (event: UserNotificationEvent | null, timedOut: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      cleanup();
      resolve({
        event,
        timed_out: timedOut,
        version: getUserNotificationEventVersion(tenantId, userId),
      });
    };

    const listener: UserNotificationEventListener = (event) => finish(event, false);
    const timeout = setTimeout(() => finish(null, true), timeoutMs);
    listeners.add(listener);
  });
}

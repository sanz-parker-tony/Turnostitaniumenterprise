export function getClientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Guayaquil';
  } catch {
    return 'America/Guayaquil';
  }
}

export function formatClientDate(date: Date, locale = 'es-EC', timeZone = getClientTimeZone()): string {
  return date.toLocaleDateString(locale, {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatClientTime(date: Date, locale = 'es-EC', timeZone = getClientTimeZone()): string {
  return date.toLocaleTimeString(locale, {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatClientDateTime(
  value: string | Date | null | undefined,
  locale = 'es-EC',
  timeZone = getClientTimeZone()
): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString(locale, {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function toClientDateTimeLocal(value: string | Date | null | undefined, timeZone = getClientTimeZone()): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

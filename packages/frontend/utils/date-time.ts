export function getClientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function formatDateParts(date: Date, timeZone: string): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function formatStandardDate(
  value: string | Date | null | undefined,
  timeZone = getClientTimeZone()
): string {
  if (!value) return '-';
  if (typeof value === 'string') {
    const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) return `${dateOnly[1]}/${dateOnly[2]}/${dateOnly[3]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  const { year, month, day } = formatDateParts(date, timeZone);
  return `${year}/${month}/${day}`;
}

export function formatClientDate(date: Date, locale = 'es-EC', timeZone = getClientTimeZone()): string {
  void locale;
  return formatStandardDate(date, timeZone);
}

export function formatClientTime(date: Date, locale = 'es-EC', timeZone = getClientTimeZone()): string {
  return formatClientTime24(date, locale, timeZone);
}

function normalizeTimeOnly(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || '0');
  if (hour < 0 || hour > 23 || minute > 59 || second > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

export function formatClientTime24(
  value: string | Date | null | undefined,
  locale = 'es-EC',
  timeZone = getClientTimeZone()
): string {
  if (!value) return '-';
  if (typeof value === 'string') {
    const timeOnly = normalizeTimeOnly(value);
    if (timeOnly) return timeOnly;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    const text = String(value || '').trim();
    const match = text.match(/(?:T|\s)(\d{2}:\d{2})(?::(\d{2}))?/);
    if (!match) return text || '-';
    return `${match[1]}:${match[2] || '00'}`;
  }

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    hourCycle: 'h23',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  return `${get('hour')}:${get('minute')}:${get('second')}`;
}

export function formatClientDateTime(
  value: string | Date | null | undefined,
  locale = 'es-EC',
  timeZone = getClientTimeZone()
): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  void locale;
  return `${formatStandardDate(date, timeZone)} ${formatClientTime24(date, 'es-EC', timeZone)}`;
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

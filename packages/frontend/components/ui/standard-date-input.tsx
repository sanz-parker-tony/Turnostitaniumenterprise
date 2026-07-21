'use client';

import { useEffect, useState } from 'react';
import { cn } from './utils';

type BaseProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'>;

type StandardInputProps = BaseProps & {
  value: string;
  onValueChange: (value: string) => void;
};

function isValidDate(year: string, month: string, day: string): boolean {
  const date = new Date(`${year}-${month}-${day}T12:00:00`);
  return Number.isFinite(date.getTime())
    && date.getFullYear() === Number(year)
    && date.getMonth() + 1 === Number(month)
    && date.getDate() === Number(day);
}

function isoDateToDisplay(value: string): string {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
}

function displayDateToIso(value: string): string | null {
  const match = value.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match || !isValidDate(match[1], match[2], match[3])) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function isDateWithinRange(value: string, min?: string | number, max?: string | number): boolean {
  const minimum = typeof min === 'string' ? min.slice(0, 10) : '';
  const maximum = typeof max === 'string' ? max.slice(0, 10) : '';
  return (!minimum || value >= minimum) && (!maximum || value <= maximum);
}

function formatTypedDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
}

export function StandardDateInput({ value, onValueChange, className, onBlur, min, max, title, ...props }: StandardInputProps) {
  const [displayValue, setDisplayValue] = useState(() => isoDateToDisplay(value));

  useEffect(() => setDisplayValue(isoDateToDisplay(value)), [value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="AAAA/MM/DD"
      title={title || 'Formato: AAAA/MM/DD'}
      className={cn(className)}
      value={displayValue}
      onChange={(event) => {
        const formatted = formatTypedDate(event.target.value);
        setDisplayValue(formatted);
        const iso = displayDateToIso(formatted);
        if (iso && isDateWithinRange(iso, min, max)) onValueChange(iso);
        if (!formatted) onValueChange('');
      }}
      onBlur={(event) => {
        const iso = displayDateToIso(displayValue);
        if (!iso || !isDateWithinRange(iso, min, max)) setDisplayValue(isoDateToDisplay(value));
        onBlur?.(event);
      }}
    />
  );
}

function localDateTimeToDisplay(value: string): string {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  return match ? `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}:${match[6] || '00'}` : '';
}

function displayDateTimeToLocal(value: string): string | null {
  const match = value.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/);
  if (!match || !isValidDate(match[1], match[2], match[3])) return null;
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
}

function formatTypedDateTime(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  let formatted = digits.slice(0, 4);
  if (digits.length > 4) formatted += `/${digits.slice(4, 6)}`;
  if (digits.length > 6) formatted += `/${digits.slice(6, 8)}`;
  if (digits.length > 8) formatted += ` ${digits.slice(8, 10)}`;
  if (digits.length > 10) formatted += `:${digits.slice(10, 12)}`;
  if (digits.length > 12) formatted += `:${digits.slice(12, 14)}`;
  return formatted;
}

export function StandardDateTimeInput({ value, onValueChange, className, onBlur, title, ...props }: StandardInputProps) {
  const [displayValue, setDisplayValue] = useState(() => localDateTimeToDisplay(value));

  useEffect(() => setDisplayValue(localDateTimeToDisplay(value)), [value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="AAAA/MM/DD HH:MI:SS"
      title={title || 'Formato: AAAA/MM/DD HH:MI:SS (24 horas)'}
      className={cn(className)}
      value={displayValue}
      onChange={(event) => {
        const formatted = formatTypedDateTime(event.target.value);
        setDisplayValue(formatted);
        const local = displayDateTimeToLocal(formatted);
        if (local) onValueChange(local);
        if (!formatted) onValueChange('');
      }}
      onBlur={(event) => {
        const local = displayDateTimeToLocal(displayValue);
        if (!local) setDisplayValue(localDateTimeToDisplay(value));
        onBlur?.(event);
      }}
    />
  );
}

function normalizeTimeDisplay(value: string): string {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}` : '';
}

function validTime(value: string): boolean {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59 && Number(match[3]) <= 59);
}

function timeToSeconds(value: string): number | null {
  const match = String(value || '').match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTime(value: number): string {
  const secondsInDay = 24 * 60 * 60;
  const normalized = ((Math.trunc(value) % secondsInDay) + secondsInDay) % secondsInDay;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatTypedTime(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  let formatted = digits.slice(0, 2);
  if (digits.length > 2) formatted += `:${digits.slice(2, 4)}`;
  if (digits.length > 4) formatted += `:${digits.slice(4, 6)}`;
  return formatted;
}

export function StandardTimeInput({ value, onValueChange, className, onBlur, onKeyDown, title, ...props }: StandardInputProps) {
  const [displayValue, setDisplayValue] = useState(() => normalizeTimeDisplay(value));

  useEffect(() => setDisplayValue(normalizeTimeDisplay(value)), [value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="HH:MI:SS"
      title={title || 'Formato: HH:MI:SS (24 horas)'}
      className={cn(className)}
      value={displayValue}
      onChange={(event) => {
        const formatted = formatTypedTime(event.target.value);
        setDisplayValue(formatted);
        if (validTime(formatted)) onValueChange(formatted);
        if (!formatted) onValueChange('');
      }}
      onKeyDown={(event) => {
        if (!props.readOnly && !props.disabled && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
          const currentSeconds = timeToSeconds(displayValue) ?? timeToSeconds(normalizeTimeDisplay(value));
          if (currentSeconds !== null) {
            event.preventDefault();
            const cursor = event.currentTarget.selectionStart ?? 0;
            const unitSeconds = cursor <= 2 ? 3600 : cursor <= 5 ? 60 : 1;
            const direction = event.key === 'ArrowUp' ? 1 : -1;
            const nextValue = secondsToTime(currentSeconds + direction * unitSeconds);
            const input = event.currentTarget;
            setDisplayValue(nextValue);
            onValueChange(nextValue);
            requestAnimationFrame(() => {
              const start = cursor <= 2 ? 0 : cursor <= 5 ? 3 : 6;
              input.setSelectionRange(start, start + 2);
            });
          }
        }
        onKeyDown?.(event);
      }}
      onBlur={(event) => {
        if (!validTime(displayValue)) setDisplayValue(normalizeTimeDisplay(value));
        onBlur?.(event);
      }}
    />
  );
}

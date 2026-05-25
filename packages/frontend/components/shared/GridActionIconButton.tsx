'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type ActionTone = 'blue' | 'red' | 'green' | 'amber' | 'gray';

const TONE_CLASSES: Record<ActionTone, string> = {
  blue: 'text-blue-700 bg-blue-100 border-blue-300 hover:text-white hover:bg-blue-600 hover:border-blue-700 hover:shadow-blue-300',
  red: 'text-red-700 bg-red-100 border-red-300 hover:text-white hover:bg-red-600 hover:border-red-700 hover:shadow-red-300',
  green: 'text-green-700 bg-green-100 border-green-300 hover:text-white hover:bg-green-600 hover:border-green-700 hover:shadow-green-300',
  amber: 'text-amber-700 bg-amber-100 border-amber-300 hover:text-white hover:bg-amber-600 hover:border-amber-700 hover:shadow-amber-300',
  gray: 'text-gray-600 bg-gray-100 border-gray-300 hover:text-white hover:bg-gray-600 hover:border-gray-700 hover:shadow-gray-300',
};

type Props = {
  icon: ReactNode;
  label: string;
  tone?: ActionTone;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export default function GridActionIconButton({
  icon,
  label,
  tone = 'blue',
  className = '',
  disabled,
  ...props
}: Props) {
  const colorClasses = disabled
    ? 'text-gray-300 bg-gray-100 border-gray-200 cursor-not-allowed'
    : TONE_CLASSES[tone];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`p-2.5 rounded-lg border transition-all duration-150 ${colorClasses} ${
        disabled ? '' : 'hover:shadow-md hover:scale-110'
      } ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}

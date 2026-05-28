'use client';

import { Pencil, PowerOff } from 'lucide-react';
import { ButtonHTMLAttributes, ReactNode, cloneElement, isValidElement } from 'react';

type ActionTone = 'blue' | 'red' | 'green' | 'amber' | 'brown' | 'gray';

const TONE_CLASSES: Record<ActionTone, string> = {
  blue: 'text-blue-700 bg-blue-100 border-blue-300 hover:text-white hover:bg-blue-600 hover:border-blue-700 hover:shadow-blue-300',
  red: 'text-red-700 bg-red-100 border-red-300 hover:text-white hover:bg-red-600 hover:border-red-700 hover:shadow-red-300',
  green: 'text-green-700 bg-green-100 border-green-300 hover:text-white hover:bg-green-600 hover:border-green-700 hover:shadow-green-300',
  amber: 'text-amber-700 bg-amber-100 border-amber-300 hover:text-white hover:bg-amber-600 hover:border-amber-700 hover:shadow-amber-300',
  brown: 'text-[#8B5E34] bg-[#F6ECDD] border-[#D8BC9B] hover:text-white hover:bg-[#8B5E34] hover:border-[#7A4F2A] hover:shadow-[#B99167]',
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
  const normalized = (label || '').toLowerCase();
  const isEditAction = normalized.includes('editar') || normalized.includes('edit');
  const isStatusToggleAction =
    normalized.includes('activar') || normalized.includes('desactivar') || normalized.includes('inactivar');
  const resolvedTone = isStatusToggleAction ? 'brown' : tone;
  const baseIcon = isEditAction
    ? <Pencil className="size-4" />
    : isStatusToggleAction
      ? <PowerOff className="size-4" />
      : icon;
  const resolvedIcon = isValidElement(baseIcon)
    ? cloneElement(baseIcon as any, {
        className: `${(baseIcon as any).props?.className || ''} size-4`,
      })
    : baseIcon;

  const colorClasses = disabled
    ? 'text-gray-300 bg-gray-100 border-gray-200 cursor-not-allowed'
    : TONE_CLASSES[resolvedTone];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`p-2.5 rounded-lg border transition-all duration-150 [&_svg]:size-4 [&_svg]:shrink-0 ${colorClasses} ${
        disabled ? '' : 'hover:shadow-md hover:scale-110'
      } ${className}`}
      {...props}
    >
      {resolvedIcon}
    </button>
  );
}

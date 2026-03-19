/**
 * FormSelect.tsx - Turnos Titanium Enterprise
 * Select component con validación integrada para react-hook-form
 */

import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form@7.55.0';
import { Label } from '../ui/label';
import { AlertCircle } from 'lucide-react';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
  helperText?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export function FormSelect({
  name,
  label,
  register,
  error,
  required = false,
  helperText,
  options,
  placeholder = 'Seleccione una opción',
  className = '',
  ...props
}: FormSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <select
        id={name}
        {...register(name)}
        {...props}
        className={`
          flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm
          ring-offset-background focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed 
          disabled:opacity-50
          ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
      
      {error && (
        <div className="flex items-start gap-1.5 text-red-600">
          <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
          <p id={`${name}-error`} className="text-sm">
            {error.message}
          </p>
        </div>
      )}
    </div>
  );
}

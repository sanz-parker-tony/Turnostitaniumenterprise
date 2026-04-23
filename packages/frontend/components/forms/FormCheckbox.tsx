/**
 * FormCheckbox.tsx - Turnos Titanium Enterprise
 * Checkbox component con validación integrada para react-hook-form
 */

import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form@7.55.0';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { AlertCircle } from 'lucide-react';

interface FormCheckboxProps {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  helperText?: string;
  disabled?: boolean;
}

export function FormCheckbox({
  name,
  label,
  register,
  error,
  helperText,
  disabled = false,
}: FormCheckboxProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={name}
          {...register(name)}
          disabled={disabled}
          className={`
            size-4 rounded border-gray-300 text-[#0074D9] 
            focus:ring-[#0074D9] focus:ring-2 focus:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-500' : ''}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        <Label 
          htmlFor={name} 
          className={`text-sm font-medium cursor-pointer ${disabled ? 'opacity-50' : ''}`}
        >
          {label}
        </Label>
      </div>
      
      {helperText && !error && (
        <p className="text-sm text-gray-500 ml-6">{helperText}</p>
      )}
      
      {error && (
        <div className="flex items-start gap-1.5 text-red-600 ml-6">
          <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
          <p id={`${name}-error`} className="text-sm">
            {error.message}
          </p>
        </div>
      )}
    </div>
  );
}

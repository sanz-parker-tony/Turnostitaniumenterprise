/**
 * FormInput.tsx - Turnos Titanium Enterprise
 * Input component con validación integrada para react-hook-form
 * 
 * CARACTERÍSTICAS:
 * ✅ Muestra errores de validación con texto rojo
 * ✅ Borde rojo cuando hay error
 * ✅ Icono de error opcional
 * ✅ Label con asterisco para campos requeridos
 * ✅ Integración perfecta con react-hook-form
 */

import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form@7.55.0';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertCircle } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
  helperText?: string;
}

export function FormInput({
  name,
  label,
  register,
  error,
  required = false,
  helperText,
  className = '',
  ...props
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <Input
        id={name}
        {...register(name)}
        {...props}
        className={`
          ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
          ${className}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      
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

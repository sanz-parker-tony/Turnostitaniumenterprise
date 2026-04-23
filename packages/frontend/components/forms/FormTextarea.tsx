/**
 * FormTextarea.tsx - Turnos Titanium Enterprise
 * Textarea component con validación integrada para react-hook-form
 */

import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form@7.55.0';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { AlertCircle } from 'lucide-react';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
  helperText?: string;
}

export function FormTextarea({
  name,
  label,
  register,
  error,
  required = false,
  helperText,
  className = '',
  ...props
}: FormTextareaProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <Textarea
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

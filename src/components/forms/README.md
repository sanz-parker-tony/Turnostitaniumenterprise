# 🎯 Form Components - Quick Reference

Sistema de componentes de formulario con validación integrada.

## 📦 **Componentes Disponibles**

```typescript
import { 
  FormInput, 
  FormTextarea, 
  FormSelect, 
  FormCheckbox 
} from '@/components/forms';
```

## 🚀 **Uso Rápido**

### **1. Setup básico del formulario**

```typescript
import { useForm } from 'react-hook-form@7.55.0';
import { zodResolver } from '@hookform/resolvers/zod';
import { myFormSchema } from '@/lib/validation';

const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm({
  resolver: zodResolver(myFormSchema),
  mode: 'onSubmit',
});
```

### **2. FormInput - Input de Texto**

```typescript
<FormInput
  name="username"
  label="Nombre de Usuario"
  register={register}
  error={errors.username}
  required
  placeholder="johndoe"
  helperText="Mínimo 3 caracteres"
/>
```

**Props:**
- `name` (string) - Nombre del campo
- `label` (string) - Etiqueta visible
- `register` (función) - Hook de react-hook-form
- `error` (FieldError) - Objeto de error de validación
- `required` (boolean) - Muestra asterisco rojo
- `placeholder` (string) - Texto de placeholder
- `helperText` (string) - Texto de ayuda
- `type` (string) - text, email, password, number, etc.
- `disabled` (boolean) - Deshabilitar input

### **3. FormSelect - Dropdown**

```typescript
<FormSelect
  name="role"
  label="Rol"
  register={register}
  error={errors.role}
  required
  options={[
    { value: 'admin', label: 'Administrador' },
    { value: 'user', label: 'Usuario' },
  ]}
  placeholder="Seleccione un rol"
/>
```

**Props:**
- `options` (Array) - `[{ value, label }]`
- Resto igual que FormInput

### **4. FormCheckbox - Casilla de verificación**

```typescript
<FormCheckbox
  name="is_active"
  label="Usuario activo"
  register={register}
  error={errors.is_active}
  helperText="El usuario podrá iniciar sesión"
/>
```

### **5. FormTextarea - Área de texto**

```typescript
<FormTextarea
  name="description"
  label="Descripción"
  register={register}
  error={errors.description}
  rows={4}
  placeholder="Escribe aquí..."
/>
```

## ✅ **Características Automáticas**

- ✅ **Borde rojo** cuando hay error
- ✅ **Icono de alerta** (⚠️) con error
- ✅ **Mensaje de error** claro y específico
- ✅ **Asterisco rojo** (*) en campos requeridos
- ✅ **Texto de ayuda** opcional (helperText)
- ✅ **Accesibilidad** (aria-invalid, aria-describedby)
- ✅ **Estilos consistentes** con diseño corporativo

## 📝 **Ejemplo Completo**

Ver: `/components/forms/LookupGroupForm.tsx`

## 📚 **Documentación Completa**

Ver: `/docs/VALIDATION_SYSTEM_GUIDE.md`

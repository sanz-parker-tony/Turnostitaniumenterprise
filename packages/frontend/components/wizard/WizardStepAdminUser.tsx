/**
 * WizardStepAdminUser.tsx
 * Paso 5: Creación del Usuario Administrador del Tenant
 * Este usuario tendrá permisos completos para gestionar el sistema
 */

import { useState, useEffect } from 'react';
import { UserCog, ChevronRight, ChevronLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { projectId, publicApiToken } from '../../utils/backend/info';

interface WizardStepAdminUserProps {
  onComplete: (data: any) => void;
  onGoBack?: () => void;
}

export default function WizardStepAdminUser({ onComplete, onGoBack }: WizardStepAdminUserProps) {
  const [formData, setFormData] = useState({
    admin_username: '', // ✅ NUEVO: Username personalizado (opcional)
    admin_name: '',
    admin_lastname: '',
    admin_email: '',
    admin_phone: '', // ✅ NUEVO: Teléfono (opcional)
    admin_password: '',
    admin_password_confirm: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // ========================================
  // VERIFICAR TENANT_ID AL MONTAR EL COMPONENTE
  // ========================================
  useEffect(() => {
    const fetchTenantId = async () => {
      console.log('🔍 [PASO 5] Verificando tenant_id en localStorage...');
      const storedTenantId = localStorage.getItem('tenant_id');
      console.log('   - tenant_id encontrado:', storedTenantId);
      
      if (storedTenantId) {
        // Validar que sea un UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValid = uuidRegex.test(storedTenantId);
        console.log('   - ¿Es UUID válido?:', isValid);
        
        if (isValid) {
          setTenantId(storedTenantId);
          console.log('✅ Tenant ID válido encontrado y cargado:', storedTenantId);
          return;
        } else {
          console.error('❌ Tenant ID inválido (no pasa regex UUID):', storedTenantId);
        }
      }
      
      // Si no hay tenant_id en localStorage, obtenerlo del backend
      console.log('🔄 Obteniendo tenant_id desde el servidor...');
      
      try {
        const bootstrapToken = localStorage.getItem('bootstrapToken') || '';
        const response = await fetch(
          `http://localhost:3001/bootstrap/tenant-info`,
          {
            headers: {
              'Authorization': `Bearer ${publicApiToken}`,
              'X-Bootstrap-Token': bootstrapToken
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.tenant_id) {
            setTenantId(data.tenant_id);
            localStorage.setItem('tenant_id', data.tenant_id);
            console.log('✅ Tenant ID obtenido desde backend y guardado:', data.tenant_id);
          } else {
            console.error('❌ Backend no devolvió tenant_id');
          }
        } else {
          console.error('❌ Error obteniendo tenant info:', response.status);
        }
      } catch (error) {
        console.error('❌ Error fetching tenant_id:', error);
      }
    };

    fetchTenantId();
  }, []);

  // ========================================
  // VALIDACIONES
  // ========================================
  const validateForm = (): string | null => {
    if (!formData.admin_name.trim()) {
      return 'El nombre es obligatorio';
    }
    if (!formData.admin_lastname.trim()) {
      return 'El apellido es obligatorio';
    }
    if (!formData.admin_email.trim()) {
      return 'El correo electrónico es obligatorio';
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.admin_email)) {
      return 'El correo electrónico no tiene un formato válido';
    }

    if (!formData.admin_password) {
      return 'La contraseña es obligatoria';
    }
    if (formData.admin_password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (formData.admin_password !== formData.admin_password_confirm) {
      return 'Las contraseñas no coinciden';
    }

    return null;
  };

  // ========================================
  // CREAR USUARIO ADMIN Y COMPLETAR WIZARD
  // ========================================
  const handleCreateAdmin = async () => {
    // ========================================
    // 1. VALIDAR TENANT_ID
    // ========================================
    if (!tenantId) {
      setError('El tenant aún no está listo. Vuelve al Paso 1.');
      return;
    }

    // ========================================
    // 2. VALIDAR FORMULARIO
    // ========================================
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      console.log('🎯 Creando usuario administrador del tenant...');
      console.log('   - Tenant ID:', tenantId);

      const bootstrapToken = localStorage.getItem('bootstrapToken') || '';

      // ========================================
      // 3. ENVIAR REQUEST (formato v1.0)
      // ========================================
      const response = await fetch(
        `http://localhost:3001/bootstrap/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicApiToken}`,
            'X-Bootstrap-Token': bootstrapToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            email: formData.admin_email.trim().toLowerCase(),
            password: formData.admin_password,
            username: formData.admin_username.trim() || null,
            name: formData.admin_name.trim(),
            lastname: formData.admin_lastname.trim(),
            phone: formData.admin_phone.trim() || null,
            preferred_language_code: null, // Se obtiene desde tenant_language_settings
            email_confirm: true
          })
        }
      );

      // ✅ VERIFICAR STATUS CODE ANTES DE PARSEAR JSON
      if (!response.ok) {
        console.error(`❌ Error HTTP ${response.status}: ${response.statusText}`);
        
        // Intentar leer el cuerpo como texto para mejor diagnóstico
        const errorText = await response.text();
        console.error('❌ Respuesta del servidor:', errorText);
        
        if (response.status === 404) {
          setError('El endpoint de completar wizard no está disponible. Por favor contacta al administrador del sistema.');
        } else {
          setError(`Error del servidor (${response.status}): ${response.statusText}`);
        }
        return;
      }

      const result = await response.json();

      // ========================================
      // 4. PROCESAR RESPUESTA SEGÚN CONTRATO v1.0
      // ========================================

      // 4.1 CASO: Éxito total (COMPLETED o ALREADY_EXISTS)
      if (result.ok && (result.status === 'COMPLETED' || result.status === 'ALREADY_EXISTS')) {
        console.log(`✅ [${result.status}] Usuario administrador configurado:`, result.admin_user);
        console.log(`   - Auth User ID: ${result.admin_user.auth_user_id}`);
        console.log(`   - Public User ID: ${result.admin_user.public_user_id}`);
        console.log(`   - Email: ${result.admin_user.email}`);
        console.log(`   - Username: ${result.admin_user.username}`);
        console.log(`   - Display Name: ${result.admin_user.display_name}`);
        console.log(`   - Phone: ${result.admin_user.phone}`);
        console.log(`   - Onboarding: ${result.onboarding.onboarding_status}`);

        if (result.status === 'ALREADY_EXISTS') {
          console.log('ℹ️ Usuario administrador ya configurado previamente (idempotencia)');
        }

        // ✅ LIMPIAR TOKENS Y DATOS TEMPORALES
        localStorage.removeItem('bootstrapToken');
        localStorage.removeItem('tenant_id');
        console.log('✅ Tokens limpiados. Completando wizard...');

        // ✅ COMPLETAR WIZARD (el componente padre manejará la redirección)
        onComplete({
          adminEmail: result.admin_user.email,
          adminUsername: result.admin_user.username,
          displayName: result.admin_user.display_name,
          message: result.status === 'ALREADY_EXISTS' 
            ? 'Usuario administrador ya existía (verificado)' 
            : 'Usuario administrador creado exitosamente',
          wizardCompleted: true,
          status: result.status
        });

        return;
      }

      // 4.2 CASO: Error (ok=false)
      if (!result.ok) {
        console.error(`❌ [${result.stage}] ${result.error.code}:`, result.error.message);
        console.error('   Diagnóstico:', result.diagnostics);
        
        if (result.partial) {
          console.warn('⚠️ Creación parcial:', result.partial);
        }
        
        if (result.rollback) {
          console.log('🔄 Rollback:', result.rollback);
        }

        // Mostrar error al usuario con información contextual
        let errorMessage = result.error.message;
        
        if (result.stage === 'VALIDATE_INPUT') {
          errorMessage = `Validación: ${result.error.message}`;
        } else if (result.stage === 'CREATE_AUTH_USER') {
          errorMessage = `Error creando usuario: ${result.error.message}`;
        } else if (result.stage === 'ENSURE_PUBLIC_USER') {
          errorMessage = `Error en base de datos: ${result.error.message}`;
        } else if (result.stage === 'UPDATE_PUBLIC_USER') {
          errorMessage = `Usuario creado pero falló actualización. ${result.retry.hint}`;
        }

        setError(errorMessage);

        // Si se permite retry, mostrar botón (el botón "Crear Usuario Administrador" ya existe)
        if (result.retry?.allowed) {
          console.log(`💡 Hint: ${result.retry.hint}`);
        }

        return;
      }

      // 4.3 CASO: Respuesta inesperada
      console.error('❌ Respuesta inesperada del servidor:', result);
      setError('Respuesta inesperada del servidor. Revisa la consola.');

    } catch (error: any) {
      console.error('❌ Error creando usuario administrador:', error);
      setError(error.message || 'Error desconocido');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Título */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#0074D9] rounded-lg flex items-center justify-center">
            <UserCog className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Usuario Administrador
          </h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Cree el usuario administrador principal del sistema. Este usuario tendrá permisos completos para 
          gestionar empleados, usuarios, turnos y todas las funcionalidades del sistema.
        </p>
      </div>

      {/* Alerta de bloqueo si no hay tenant_id */}
      {!tenantId && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <strong className="font-semibold">El tenant aún no está listo.</strong>
              <p className="mt-1">Debes completar el Paso 1 (Tenant) antes de crear el usuario administrador.</p>
            </div>
          </div>
        </div>
      )}

      {/* Nota informativa */}
      {tenantId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong className="font-semibold">Permisos del Administrador:</strong>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Crear y gestionar usuarios adicionales</li>
                <li>Registrar y administrar empleados</li>
                <li>Configurar turnos y horarios</li>
                <li>Acceder a reportes y análisis</li>
                <li>Modificar configuraciones del sistema</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <div className="space-y-4">
          {/* Username personalizado (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username (opcional)
            </label>
            <input
              type="text"
              value={formData.admin_username}
              onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              placeholder="adminuser"
              disabled={isCreating}
            />
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.admin_name}
              onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              placeholder="Juan"
              disabled={isCreating}
            />
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.admin_lastname}
              onChange={(e) => setFormData({ ...formData, admin_lastname: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              placeholder="Pérez"
              disabled={isCreating}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.admin_email}
              onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              placeholder="admin@empresa.com"
              disabled={isCreating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Este correo se utilizará para iniciar sesión en el sistema
            </p>
          </div>

          {/* Teléfono (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono (opcional)
            </label>
            <input
              type="tel"
              value={formData.admin_phone}
              onChange={(e) => setFormData({ ...formData, admin_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              placeholder="123-456-7890"
              disabled={isCreating}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.admin_password}
                onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                placeholder="Mínimo 8 caracteres"
                disabled={isCreating}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isCreating}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                value={formData.admin_password_confirm}
                onChange={(e) => setFormData({ ...formData, admin_password_confirm: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                placeholder="Repita la contraseña"
                disabled={isCreating}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isCreating}
              >
                {showPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            disabled={isCreating}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>
        )}
        <button
          type="button"
          onClick={handleCreateAdmin}
          disabled={isCreating || !tenantId}
          className="flex-1 bg-[#2ECC71] text-white px-6 py-2.5 rounded-lg hover:bg-[#27AE60] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!tenantId ? 'Completa primero el Paso 1 (Tenant)' : ''}
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creando usuario...
            </>
          ) : !tenantId ? (
            <>
              <AlertCircle className="w-4 h-4" />
              Tenant no disponible
            </>
          ) : (
            <>
              Completar Configuración
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * /dashboard/system/tenant - Configuración del Cliente
 * 
 * Gestión de datos del tenant (cliente)
 * Acceso: SOLO SYSTEM_ADMIN
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Database, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface TenantData {
  tenant_id: string;
  tenant_name: string;
  tenant_legal_name: string;
  tenant_tax_id: string;
  license_type: string;
  max_employees: number;
  license_expires_at: string | null;
  created_at: string;
}

export default function TenantConfigPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<TenantData>({
    tenant_id: '',
    tenant_name: '',
    tenant_legal_name: '',
    tenant_tax_id: '',
    license_type: 'ENTERPRISE',
    max_employees: 500,
    license_expires_at: null,
    created_at: ''
  });

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Conectar con endpoint real
      // Por ahora cargar desde localStorage como fallback
      const tenantId = localStorage.getItem('turnosTitanium_tenantId');
      const tenantName = localStorage.getItem('turnosTitanium_tenantName');

      if (tenantId && tenantName) {
        setFormData(prev => ({
          ...prev,
          tenant_id: tenantId,
          tenant_name: tenantName,
          tenant_legal_name: tenantName,
          created_at: new Date().toISOString()
        }));
      }
    } catch (err: any) {
      console.error('Error cargando tenant:', err);
      setError('Error al cargar datos del cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // TODO: Conectar con endpoint real
      // await updateTenant(formData);
      
      // Simulación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Tenant actualizado:', formData);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error actualizando tenant:', err);
      setError('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="size-8 text-[#0074D9] animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando datos del cliente...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/system"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="size-4" />
          Volver a Configuración del Sistema
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Database className="size-5 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración del Cliente
          </h1>
        </div>
        <p className="text-gray-600">
          Datos del cliente y configuración de licencia
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">Cambios guardados exitosamente</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Tenant ID (read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ID del Cliente
              </label>
              <input
                type="text"
                value={formData.tenant_id}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este campo no se puede modificar
              </p>
            </div>

            {/* Tenant Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                value={formData.tenant_name}
                onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                placeholder="Ej: Acme Corporation"
              />
            </div>

            {/* Legal Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Razón Social *
              </label>
              <input
                type="text"
                value={formData.tenant_legal_name}
                onChange={(e) => setFormData({ ...formData, tenant_legal_name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                placeholder="Ej: Acme Corporation S.A."
              />
            </div>

            {/* Tax ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                RUT / Tax ID *
              </label>
              <input
                type="text"
                value={formData.tenant_tax_id}
                onChange={(e) => setFormData({ ...formData, tenant_tax_id: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                placeholder="Ej: 12.345.678-9"
              />
            </div>

            {/* License Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Licencia
              </label>
              <select
                value={formData.license_type}
                onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              >
                <option value="ENTERPRISE">Enterprise On-Premise</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="STARTER">Starter</option>
              </select>
            </div>

            {/* Max Employees */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Máximo de Empleados
              </label>
              <input
                type="number"
                value={formData.max_employees}
                onChange={(e) => setFormData({ ...formData, max_employees: parseInt(e.target.value) })}
                min={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              />
            </div>

            {/* License Expiration */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de Expiración de Licencia
              </label>
              <input
                type="date"
                value={formData.license_expires_at || ''}
                onChange={(e) => setFormData({ ...formData, license_expires_at: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Dejar vacío para licencia perpetua
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between rounded-b-lg">
            <p className="text-sm text-gray-600">
              * Campos requeridos
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/system"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056A3] transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

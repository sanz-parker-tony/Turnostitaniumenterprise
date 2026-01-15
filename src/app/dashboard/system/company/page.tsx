/**
 * /dashboard/system/company - Configuración de Empresa
 * 
 * Gestión de datos de la empresa
 * Acceso: SOLO SYSTEM_ADMIN
 */

'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Building2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface CompanyData {
  company_id: string;
  company_name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
}

export default function CompanyConfigPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<CompanyData>({
    company_id: '',
    company_name: '',
    address: '',
    city: '',
    country: 'Chile',
    phone: '',
    email: '',
    website: '',
    logo_url: ''
  });

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Conectar con endpoint real
      const companyId = localStorage.getItem('turnosTitanium_companyId');
      const companyName = localStorage.getItem('turnosTitanium_companyName');

      if (companyId && companyName) {
        setFormData(prev => ({
          ...prev,
          company_id: companyId,
          company_name: companyName
        }));
      }
    } catch (err: any) {
      console.error('Error cargando empresa:', err);
      setError('Error al cargar datos de la empresa');
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Empresa actualizada:', formData);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error actualizando empresa:', err);
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
            <p className="text-gray-600">Cargando datos de la empresa...</p>
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
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Building2 className="size-5 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración de Empresa
          </h1>
        </div>
        <p className="text-gray-600">
          Datos de la empresa y configuración general
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
            {/* Company ID (read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ID de Empresa
              </label>
              <input
                type="text"
                value={formData.company_id}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dirección
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              />
            </div>

            {/* City & Country */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  País
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sitio Web
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.ejemplo.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              />
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL del Logo
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://ejemplo.com/logo.png"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0074D9] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL pública del logo de la empresa
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

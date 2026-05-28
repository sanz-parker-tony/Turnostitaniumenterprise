/**
 * WizardStepCompany.tsx
 * Paso 2: Empresa Principal
 */

import { buildApiUrl } from '../../utils/api-config';
import { useState, useEffect } from 'react';
import { Building2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { projectId, publicApiToken } from '../../utils/backend/info';
import { ApiClient } from '../../lib/api-client';
import { resolveOrganizationTenantContext } from './organization-wizard-api';
import OrganizationCompanyExcelStep from './OrganizationCompanyExcelStep';

interface WizardStepCompanyProps {
  onComplete: (data: any) => void;
  // ELIMINADO: onCompleteLater - el wizard es BLOQUEANTE
  onGoBack?: () => void;
  mode?: 'bootstrap' | 'organization';
}

export default function WizardStepCompany({ onComplete, onGoBack, mode = 'bootstrap' }: WizardStepCompanyProps) {
  if (mode === 'organization') {
    return <OrganizationCompanyExcelStep onComplete={onComplete} onGoBack={onGoBack} />;
  }

  const [formData, setFormData] = useState({
    legalName: '',
    taxId: '',
    companyCode: '',
    address: '',
    city: '',
    country: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bootstrapToken, setBootstrapToken] = useState<string>('');
  const [loadingToken, setLoadingToken] = useState(true);

  // Cargar bootstrap token al montar el componente
  useEffect(() => {
    loadBootstrapToken();
  }, []);

  const loadBootstrapToken = async () => {
    setLoadingToken(true);
    try {
      console.log('🔐 [Step2] Cargando bootstrap token...');
      
      const urlDirect = buildApiUrl(`/bootstrap/token-direct`);
      
      let response = await fetch(urlDirect, {
        headers: {
          'Authorization': `Bearer ${publicApiToken}`
        }
      });

      if (!response.ok) {
        console.log('⚠️ [Step2] Endpoint directo falló, intentando con módulo bootstrap...');
        const urlModule = buildApiUrl(`/bootstrap/token`);
        response = await fetch(urlModule, {
          headers: {
            'Authorization': `Bearer ${publicApiToken}`
          }
        });
      }

      if (!response.ok) {
        throw new Error('No se pudo obtener el bootstrap token');
      }

      const data = await response.json();
      console.log('✅ [Step2] Bootstrap token obtenido');
      setBootstrapToken(data.bootstrapToken);
    } catch (error: any) {
      console.error('❌ [Step2] Error cargando bootstrap token:', error);
      toast.error('Error de autenticación del sistema');
    } finally {
      setLoadingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.legalName || !formData.taxId || !formData.companyCode) {
      toast.error('Complete los campos obligatorios');
      return;
    }

    if (!bootstrapToken) {
      toast.error('Error de autenticación del sistema');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('💾 [Step2] Guardando empresa...', {
        legalName: formData.legalName,
        taxId: formData.taxId,
        companyCode: formData.companyCode,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        city_length: formData.city?.length || 0,
        country_length: formData.country?.length || 0
      });

      const response = await fetch(
        buildApiUrl(`/bootstrap/step2-company`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicApiToken}`,
            'X-Bootstrap-Token': bootstrapToken
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();
      console.log('📥 [Step2] Respuesta del servidor:', data);

      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.details || 'Error guardando información de la empresa');
      }

      toast.success('✅ Empresa configurada correctamente');
      console.log('✅ [Step2] PASO 2 completado:', data);

      // Avanzar al siguiente paso
      onComplete(data);
    } catch (error: any) {
      console.error('❌ [Step2] Error guardando paso 2:', error);
      toast.error(error.message || 'Error al guardar la configuración de la empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingToken) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#0074D9] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Título */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#0074D9] rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Empresa Principal
          </h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Registre la empresa principal que operará en el sistema. Esta será la entidad base 
          para la estructura organizacional y empleados.
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Razón Social */}
        <div>
          <Label htmlFor="legalName" className="text-sm font-medium text-gray-700 mb-2 block">
            Razón social *
          </Label>
          <Input
            id="legalName"
            value={formData.legalName}
            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            placeholder="Nombre legal registrado de la empresa"
            required
            disabled={isSubmitting}
            className="h-11"
          />
        </div>

        {/* RUT/RFC/Tax ID y Código */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label htmlFor="taxId" className="text-sm font-medium text-gray-700 mb-2 block">
              RUT / RFC / Tax ID *
            </Label>
            <Input
              id="taxId"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
              placeholder="Ej: 99.999.999-9"
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          <div>
            <Label htmlFor="companyCode" className="text-sm font-medium text-gray-700 mb-2 block">
              Código interno *
            </Label>
            <Input
              id="companyCode"
              value={formData.companyCode}
              onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
              placeholder="Ej: EMP-001"
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>
        </div>

        {/* Dirección */}
        <div>
          <Label htmlFor="address" className="text-sm font-medium text-gray-700 mb-2 block">
            Dirección <span className="text-gray-400 font-normal">(opcional)</span>
          </Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Dirección física de la empresa"
            disabled={isSubmitting}
            className="h-11"
          />
        </div>

        {/* Ciudad y País */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label htmlFor="city" className="text-sm font-medium text-gray-700 mb-2 block">
              Ciudad
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Ciudad"
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          <div>
            <Label htmlFor="country" className="text-sm font-medium text-gray-700 mb-2 block">
              País
            </Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="País"
              disabled={isSubmitting}
              className="h-11"
            />
          </div>
        </div>

        {/* Nota informativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong className="font-semibold">Nota:</strong> Podrá agregar empresas adicionales 
            posteriormente desde el módulo de Organización.
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              disabled={isSubmitting}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !bootstrapToken}
            className="flex-1 bg-[#0074D9] text-white px-6 py-2.5 rounded-lg hover:bg-[#0066C0] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Guardando...' : 'Continuar'}
            {!isSubmitting && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

function OrganizationCompanyStep({ onComplete, onGoBack }: Pick<WizardStepCompanyProps, 'onComplete' | 'onGoBack'>) {
  const [formData, setFormData] = useState({
    companyName: '',
    companyShortName: '',
    companyCode: '',
    companyPhone: '',
    companyAddressLine1: '',
    companyAddressLine2: '',
    companyPostalCode: '',
    locationName: '',
    locationShortName: '',
    locationCode: '',
    locationAddress: '',
    latitude: '',
    longitude: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName.trim() || !formData.companyShortName.trim() || !formData.companyCode.trim()) {
      toast.error('Complete los datos obligatorios de empresa');
      return;
    }

    if (!formData.locationName.trim() || !formData.locationShortName.trim() || !formData.locationCode.trim()) {
      toast.error('Complete los datos obligatorios de localizacion');
      return;
    }

    setIsSubmitting(true);
    try {
      const context = await resolveOrganizationTenantContext();

      const { data: createdCompany, error: companyError } = await ApiClient
        .from('companies')
        .insert({
          tenant_id: context.tenantId,
          company_name: formData.companyName.trim(),
          company_short_name: formData.companyShortName.trim(),
          company_code: formData.companyCode.trim().toUpperCase(),
          company_phone: formData.companyPhone.trim() || null,
          company_address: [formData.companyAddressLine1, formData.companyAddressLine2].filter(Boolean).join(' ').trim() || null,
          company_address_line1: formData.companyAddressLine1.trim() || null,
          company_address_line2: formData.companyAddressLine2.trim() || null,
          company_postal_code: formData.companyPostalCode.trim() || null,
          created_by: context.createdBy,
        })
        .select('id, company_name, company_code')
        .single();

      if (companyError || !createdCompany?.id) {
        throw new Error(companyError?.message || 'No se pudo crear la empresa');
      }

      const latitude = formData.latitude.trim();
      const longitude = formData.longitude.trim();

      const { error: locationError } = await ApiClient
        .from('work_locations')
        .insert({
          tenant_id: context.tenantId,
          company_id: createdCompany.id,
          work_location_name: formData.locationName.trim(),
          work_location_short_name: formData.locationShortName.trim(),
          work_location_code: formData.locationCode.trim().toUpperCase(),
          address_line1: formData.locationAddress.trim() || null,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          created_by: context.createdBy,
        });

      if (locationError) {
        throw new Error(locationError.message || 'No se pudo crear la localizacion');
      }

      toast.success('Empresa y localizacion creadas correctamente');
      onComplete({
        companyId: createdCompany.id,
      });
    } catch (error: any) {
      console.error('Error creando empresa/localizacion:', error);
      toast.error(error?.message || 'Error creando la empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#0074D9] rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Empresa y Localizacion Principal</h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Registre la empresa y su primera localizacion de trabajo para iniciar la estructura organizacional.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 md:col-span-1">
            <Label htmlFor="companyCode">Codigo Empresa *</Label>
            <Input
              id="companyCode"
              value={formData.companyCode}
              onChange={(e) => setFormData((prev) => ({ ...prev, companyCode: e.target.value }))}
              placeholder="EMP-001"
              disabled={isSubmitting}
            />
          </div>
          <div className="col-span-3 md:col-span-2">
            <Label htmlFor="companyName">Nombre Empresa *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
              placeholder="Turnos Titanium S.A."
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companyShortName">Nombre Corto *</Label>
            <Input
              id="companyShortName"
              value={formData.companyShortName}
              onChange={(e) => setFormData((prev) => ({ ...prev, companyShortName: e.target.value }))}
              placeholder="Titanium"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="companyPhone">Telefono</Label>
            <Input
              id="companyPhone"
              value={formData.companyPhone}
              onChange={(e) => setFormData((prev) => ({ ...prev, companyPhone: e.target.value }))}
              placeholder="+593 999 000 000"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="companyAddressLine1">Direccion Linea 1</Label>
            <Input
              id="companyAddressLine1"
              value={formData.companyAddressLine1}
              onChange={(e) => setFormData((prev) => ({ ...prev, companyAddressLine1: e.target.value }))}
              placeholder="Av. Principal 123"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="companyAddressLine2">Direccion Linea 2</Label>
            <Input
              id="companyAddressLine2"
              value={formData.companyAddressLine2}
              onChange={(e) => setFormData((prev) => ({ ...prev, companyAddressLine2: e.target.value }))}
              placeholder="Piso, oficina o referencia"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-3 md:col-span-1">
            <Label htmlFor="companyPostalCode">Codigo Postal</Label>
            <Input
              id="companyPostalCode"
              value={formData.companyPostalCode}
              onChange={(e) => setFormData((prev) => ({ ...prev, companyPostalCode: e.target.value }))}
              placeholder="170101"
              disabled={isSubmitting}
            />
          </div>
          <div className="col-span-3 md:col-span-1">
            <Label htmlFor="locationCode">Codigo Localizacion *</Label>
            <Input
              id="locationCode"
              value={formData.locationCode}
              onChange={(e) => setFormData((prev) => ({ ...prev, locationCode: e.target.value }))}
              placeholder="LOC-UIO"
              disabled={isSubmitting}
            />
          </div>
          <div className="col-span-3 md:col-span-1">
            <Label htmlFor="locationShortName">Localizacion Corta *</Label>
            <Input
              id="locationShortName"
              value={formData.locationShortName}
              onChange={(e) => setFormData((prev) => ({ ...prev, locationShortName: e.target.value }))}
              placeholder="Matriz"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="locationName">Nombre Localizacion *</Label>
          <Input
            id="locationName"
            value={formData.locationName}
            onChange={(e) => setFormData((prev) => ({ ...prev, locationName: e.target.value }))}
            placeholder="Sede Principal Quito"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="locationAddress">Direccion Localizacion</Label>
          <Input
            id="locationAddress"
            value={formData.locationAddress}
            onChange={(e) => setFormData((prev) => ({ ...prev, locationAddress: e.target.value }))}
            placeholder="Direccion de la sede"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="latitude">Latitud</Label>
            <Input
              id="latitude"
              value={formData.latitude}
              onChange={(e) => setFormData((prev) => ({ ...prev, latitude: e.target.value }))}
              placeholder="-0.180653"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <Label htmlFor="longitude">Longitud</Label>
            <Input
              id="longitude"
              value={formData.longitude}
              onChange={(e) => setFormData((prev) => ({ ...prev, longitude: e.target.value }))}
              placeholder="-78.467834"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-gray-200">
          {onGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              disabled={isSubmitting}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-[#0074D9] text-white px-6 py-2.5 rounded-lg hover:bg-[#0066C0] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Guardando...' : 'Continuar'}
            {!isSubmitting && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

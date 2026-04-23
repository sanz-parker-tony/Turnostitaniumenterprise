/**
 * WizardStepCompany.tsx
 * Paso 2: Empresa Principal
 */

import { useState, useEffect } from 'react';
import { Building2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { projectId, publicApiToken } from '../../utils/backend/info';

interface WizardStepCompanyProps {
  onComplete: (data: any) => void;
  // ELIMINADO: onCompleteLater - el wizard es BLOQUEANTE
  onGoBack?: () => void;
}

export default function WizardStepCompany({ onComplete, onGoBack }: WizardStepCompanyProps) {
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
      
      const urlDirect = `http://localhost:3001/bootstrap/token-direct`;
      
      let response = await fetch(urlDirect, {
        headers: {
          'Authorization': `Bearer ${publicApiToken}`
        }
      });

      if (!response.ok) {
        console.log('⚠️ [Step2] Endpoint directo falló, intentando con módulo bootstrap...');
        const urlModule = `http://localhost:3001/bootstrap/token`;
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
        `http://localhost:3001/bootstrap/step2-company`,
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

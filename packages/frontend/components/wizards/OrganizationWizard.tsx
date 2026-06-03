/**
 * OrganizationWizard.tsx
 * Wizard de archivo único (15 pestañas) para carga masiva organizacional
 * Ejecuta: TENANT_ADMIN
 * Ubicacion: Menu ORGANIZATION -> Asistente de Configuracion
 */

import { X, FileSpreadsheet } from 'lucide-react';
import OrganizationMassiveSingleFileStep from '../wizard/OrganizationMassiveSingleFileStep';

interface OrganizationWizardProps {
  onClose: () => void;
  onComplete?: () => void;
}

export default function OrganizationWizard({ onClose, onComplete }: OrganizationWizardProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Asistente de Carga Masiva Organizacional</h2>
            <p className="text-sm text-slate-600 mt-1">
              Flujo TENANT_ADMIN con archivo único de 15 pestañas: estructura + empleados + seguridad.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-8 py-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-center gap-3 max-w-3xl mx-auto text-[#0F4C81]">
            <div className="w-10 h-10 rounded-full bg-[#0F4C81] text-white flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium">Importación completa desde archivo único (15 pestañas)</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
          <div className="max-w-4xl mx-auto">
            <OrganizationMassiveSingleFileStep
              onComplete={() => {
                onComplete?.();
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

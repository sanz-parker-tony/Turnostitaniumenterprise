import { useMemo, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { downloadTemplate } from '../../utils/excel-templates';
import {
  generateOrganizationEntityTemplate,
  parseOrganizationEntityFile,
} from './organization-wizard-excel';
import {
  resolveOrganizationTenantContext,
  upsertByTenantAndCode,
} from './organization-wizard-api';

interface OrganizationCompanyExcelStepProps {
  onComplete: (data: any) => void;
  onGoBack?: () => void;
}

type EntityStatus = {
  uploaded: boolean;
  fileName: string;
  rowCount: number;
  errors: string[];
};

export default function OrganizationCompanyExcelStep({ onComplete, onGoBack }: OrganizationCompanyExcelStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Record<'companies' | 'work_locations', EntityStatus>>({
    companies: { uploaded: false, fileName: '', rowCount: 0, errors: [] },
    work_locations: { uploaded: false, fileName: '', rowCount: 0, errors: [] },
  });

  const entities = useMemo(
    () => [
      {
        key: 'companies' as const,
        title: 'Empresas',
        description: 'Incluye country/state/city IDs (UUID) cuando corresponda.',
        codeColumn: 'legacy_id',
      },
      {
        key: 'work_locations' as const,
        title: 'Localizaciones',
        description: 'Incluye company_id y coordenadas latitude/longitude.',
        codeColumn: 'legacy_id',
      },
    ],
    []
  );

  const handleDownload = (entity: 'companies' | 'work_locations') => {
    const blob = generateOrganizationEntityTemplate(entity);
    downloadTemplate(blob, `plantilla_${entity}.xlsx`);
  };

  const handleUpload = async (
    entity: 'companies' | 'work_locations',
    codeColumn: string,
    file: File
  ) => {
    setIsSubmitting(true);
    try {
      const parseResult = await parseOrganizationEntityFile(file, entity);
      if (!parseResult.success) {
        const errors = parseResult.errors.map((error) => `Fila ${error.row}: ${error.column} - ${error.message}`);
        setStatus((prev) => ({
          ...prev,
          [entity]: {
            uploaded: false,
            fileName: file.name,
            rowCount: parseResult.rowCount,
            errors,
          },
        }));
        toast.error(`Archivo ${entity} con errores de validacion`);
        return;
      }

      const ctx = await resolveOrganizationTenantContext();
      for (const row of parseResult.data) {
        if (entity === 'work_locations' && !row.company_id) {
          throw new Error('En work_locations el campo company_id es obligatorio');
        }

        await upsertByTenantAndCode(entity, ctx.tenantId, codeColumn, row, ctx.createdBy);
      }

      setStatus((prev) => ({
        ...prev,
        [entity]: {
          uploaded: true,
          fileName: file.name,
          rowCount: parseResult.data.length,
          errors: [],
        },
      }));

      toast.success(`${entity}: ${parseResult.data.length} registros procesados`);
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        [entity]: {
          uploaded: false,
          fileName: file.name,
          rowCount: 0,
          errors: [error?.message || 'Error inesperado'],
        },
      }));
      toast.error(error?.message || 'Error procesando archivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (!status.companies.uploaded) {
      toast.error('Debe cargar al menos la entidad companies');
      return;
    }
    if (!status.work_locations.uploaded) {
      toast.error('Debe cargar al menos la entidad work_locations');
      return;
    }
    onComplete({ status });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-[#0F4C81] text-white flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Empresa y Localizaciones</h2>
            <p className="text-sm text-slate-600">
              Descargue la plantilla, complete la informacion y cargue cada entidad.
            </p>
          </div>
        </div>
      </div>

      {entities.map((entity) => {
        const entityStatus = status[entity.key];
        return (
          <div key={entity.key} className={`rounded-xl border p-4 ${entityStatus.uploaded ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {entityStatus.uploaded ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-slate-300 mt-1" />}
                  <h3 className="font-semibold text-slate-900">{entity.title}</h3>
                </div>
                <p className="text-sm text-slate-600 mt-1">{entity.description}</p>
                {entityStatus.fileName && (
                  <p className="text-xs text-slate-500 mt-2">
                    Archivo: {entityStatus.fileName} � {entityStatus.rowCount} filas
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(entity.key)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
                <label className="px-3 py-2 rounded-lg bg-[#0F4C81] text-white text-sm hover:bg-[#0b3b64] cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Cargar
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      handleUpload(entity.key, entity.codeColumn, file);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {entityStatus.errors.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Errores
                </div>
                <ul className="list-disc ml-5 space-y-0.5">
                  {entityStatus.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>
        )}
        <button
          type="button"
          onClick={handleContinue}
          disabled={isSubmitting}
          className="flex-1 px-5 py-2.5 rounded-lg bg-[#0F4C81] text-white hover:bg-[#0b3b64] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          Continuar
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

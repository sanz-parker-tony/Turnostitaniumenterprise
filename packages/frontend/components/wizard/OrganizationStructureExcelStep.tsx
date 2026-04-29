import { useMemo, useState } from 'react';
import { Network, Download, Upload, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { downloadTemplate } from '../../utils/excel-templates';
import {
  generateOrganizationEntityTemplate,
  parseOrganizationEntityFile,
  type OrganizationEntityKey,
} from './organization-wizard-excel';
import {
  resolveOrganizationTenantContext,
  upsertByTenantAndCode,
} from './organization-wizard-api';

interface OrganizationStructureExcelStepProps {
  onComplete: (data: any) => void;
  onGoBack?: () => void;
}

type EntityStatus = {
  uploaded: boolean;
  fileName: string;
  rowCount: number;
  errors: string[];
};

type EntityConfig = {
  key: OrganizationEntityKey;
  title: string;
  description: string;
  codeColumn: string;
  required: boolean;
};

function normalizeNullable(value: any) {
  if (value === null || value === undefined) return null;
  const parsed = String(value).trim();
  return parsed || null;
}

export default function OrganizationStructureExcelStep({ onComplete, onGoBack }: OrganizationStructureExcelStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<Record<string, EntityStatus>>({});

  const entities = useMemo<EntityConfig[]>(
    () => [
      { key: 'payroll_groups', title: 'Grupos de Nomina', description: 'Base para areas y grupos de trabajo.', codeColumn: 'payroll_group_code', required: false },
      { key: 'departments', title: 'Departamentos', description: 'Primer nivel jerarquico.', codeColumn: 'department_code', required: true },
      { key: 'areas', title: 'Areas', description: 'Segundo nivel jerarquico. Incluye payroll_group_id.', codeColumn: 'area_code', required: true },
      { key: 'cost_centers', title: 'Centros de Costo', description: 'Control presupuestario y contable.', codeColumn: 'cost_center_code', required: true },
      { key: 'job_titles', title: 'Cargos', description: 'Requerido para asignacion de empleados.', codeColumn: 'job_title_code', required: true },
      { key: 'work_groups', title: 'Grupos de Trabajo', description: 'Puede incluir payroll_group_id.', codeColumn: 'work_group_code', required: true },
      { key: 'employee_profiles', title: 'Perfiles de Empleado', description: 'Clasifica empleados por perfil.', codeColumn: 'employee_profile_code', required: true },
    ],
    []
  );

  const getStatus = (key: string): EntityStatus => status[key] || { uploaded: false, fileName: '', rowCount: 0, errors: [] };

  const handleDownload = (entity: OrganizationEntityKey) => {
    const blob = generateOrganizationEntityTemplate(entity);
    downloadTemplate(blob, `plantilla_${entity}.xlsx`);
  };

  const handleUpload = async (entity: EntityConfig, file: File) => {
    setIsSubmitting(true);
    try {
      const parseResult = await parseOrganizationEntityFile(file, entity.key);
      if (!parseResult.success) {
        const errors = parseResult.errors.map((error) => `Fila ${error.row}: ${error.column} - ${error.message}`);
        setStatus((prev) => ({ ...prev, [entity.key]: { uploaded: false, fileName: file.name, rowCount: parseResult.rowCount, errors } }));
        toast.error(`Archivo ${entity.key} con errores`);
        return;
      }

      const ctx = await resolveOrganizationTenantContext();

      for (const row of parseResult.data) {
        const payload = {
          ...row,
          payroll_group_id: normalizeNullable(row.payroll_group_id),
          company_id: normalizeNullable(row.company_id),
        };

        await upsertByTenantAndCode(entity.key, ctx.tenantId, entity.codeColumn, payload, ctx.createdBy);
      }

      setStatus((prev) => ({
        ...prev,
        [entity.key]: { uploaded: true, fileName: file.name, rowCount: parseResult.data.length, errors: [] },
      }));
      toast.success(`${entity.title}: ${parseResult.data.length} registros procesados`);
    } catch (error: any) {
      setStatus((prev) => ({
        ...prev,
        [entity.key]: { uploaded: false, fileName: file.name, rowCount: 0, errors: [error?.message || 'Error inesperado'] },
      }));
      toast.error(error?.message || 'Error procesando archivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    const missing = entities.filter((entity) => entity.required && !getStatus(entity.key).uploaded);
    if (missing.length > 0) {
      toast.error(`Faltan entidades obligatorias: ${missing.map((item) => item.title).join(', ')}`);
      return;
    }

    onComplete({ status });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0F4C81] text-white flex items-center justify-center">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Estructura Organizacional</h2>
            <p className="text-sm text-slate-600">Carga por archivo Excel en cada nivel de la estructura.</p>
          </div>
        </div>
      </div>

      {entities.map((entity) => {
        const entityStatus = getStatus(entity.key);
        return (
          <div key={entity.key} className={`rounded-xl border p-4 ${entityStatus.uploaded ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {entityStatus.uploaded ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <div className="w-2 h-2 rounded-full bg-slate-300 mt-1" />}
                  <h3 className="font-semibold text-slate-900">{entity.title}</h3>
                  {entity.required && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Obligatorio</span>}
                </div>
                <p className="text-sm text-slate-600 mt-1">{entity.description}</p>
                {entityStatus.fileName && <p className="text-xs text-slate-500 mt-2">{entityStatus.fileName} · {entityStatus.rowCount} filas</p>}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => handleDownload(entity.key)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
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
                      handleUpload(entity, file);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {entityStatus.errors.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="w-4 h-4" /> Errores
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
          <button type="button" onClick={onGoBack} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Volver
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

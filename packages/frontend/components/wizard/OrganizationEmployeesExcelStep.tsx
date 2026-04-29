import { useEffect, useState } from 'react';
import { Users, Download, Upload, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadTemplate } from '../../utils/excel-templates';
import {
  generateEmployeeCompaniesTemplateWithDropdowns,
  parseEmployeeCompaniesFile,
} from './organization-wizard-excel';
import {
  fetchOrganizationCatalogs,
  resolveOrganizationTenantContext,
  upsertEmployeesAndCompanies,
} from './organization-wizard-api';

interface OrganizationEmployeesExcelStepProps {
  onComplete: (data: any) => void;
  onGoBack?: () => void;
}

export default function OrganizationEmployeesExcelStep({ onComplete, onGoBack }: OrganizationEmployeesExcelStepProps) {
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [catalogs, setCatalogs] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({
    uploaded: false,
    fileName: '',
    rows: 0,
    errors: [] as string[],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await resolveOrganizationTenantContext();
        const fetched = await fetchOrganizationCatalogs(ctx.tenantId);
        setCatalogs(fetched);
      } catch (error: any) {
        toast.error(error?.message || 'No se pudieron cargar catalogos');
      } finally {
        setLoadingCatalogs(false);
      }
    };

    load();
  }, []);

  const handleDownload = async () => {
    if (!catalogs) {
      toast.error('Catalogos aun no disponibles');
      return;
    }

    const blob = await generateEmployeeCompaniesTemplateWithDropdowns({
      companies: catalogs.companies,
      employeeProfiles: catalogs.employeeProfiles,
      workGroups: catalogs.workGroups,
      workLocations: catalogs.workLocations,
      departments: catalogs.departments,
      areas: catalogs.areas,
      jobTitles: catalogs.jobTitles,
      costCenters: catalogs.costCenters,
      payrollGroups: catalogs.payrollGroups,
      contractTypes: catalogs.contractTypes,
      genders: catalogs.genders,
    });

    downloadTemplate(blob, 'plantilla_employee_companies.xlsx');
  };

  const handleUpload = async (file: File) => {
    setIsSubmitting(true);
    try {
      const parsed = await parseEmployeeCompaniesFile(file);

      if (!parsed.success) {
        const errors = parsed.errors.map((error) => `Fila ${error.row}: ${error.column} - ${error.message}`);
        setUploadStatus({ uploaded: false, fileName: file.name, rows: parsed.rowCount, errors });
        toast.error('El archivo tiene errores de validacion');
        return;
      }

      const ctx = await resolveOrganizationTenantContext();
      const result = await upsertEmployeesAndCompanies(ctx.tenantId, ctx.createdBy, parsed.data);

      setUploadStatus({
        uploaded: true,
        fileName: file.name,
        rows: result.insertedOrUpdated,
        errors: [],
      });
      toast.success(`Se procesaron ${result.insertedOrUpdated} empleados`);
    } catch (error: any) {
      setUploadStatus({ uploaded: false, fileName: file.name, rows: 0, errors: [error?.message || 'Error inesperado'] });
      toast.error(error?.message || 'Error procesando empleados');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinue = uploadStatus.uploaded;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0F4C81] text-white flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Empleados y Asignaciones</h2>
            <p className="text-sm text-slate-600">
              Descargue plantilla con dropdowns de IDs ya cargados y suba el archivo para crear employees + employee_companies.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="text-sm text-slate-600">
          Columnas con dropdowns: <strong>company_id, department_id, employee_profile_id, work_location_id, area_id, job_title_id, cost_center_id, payroll_group_id</strong>.
        </div>

        {loadingCatalogs ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando catalogos...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600">
            <div>Empresas: {catalogs?.companies?.length || 0}</div>
            <div>Departamentos: {catalogs?.departments?.length || 0}</div>
            <div>Perfiles: {catalogs?.employeeProfiles?.length || 0}</div>
            <div>Cargos: {catalogs?.jobTitles?.length || 0}</div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleDownload} disabled={loadingCatalogs || isSubmitting} className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
            <Download className="w-4 h-4" />
            Descargar plantilla
          </button>

          <label className="px-3 py-2 rounded-lg bg-[#0F4C81] text-white text-sm hover:bg-[#0b3b64] cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Cargar archivo
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                handleUpload(file);
                event.target.value = '';
              }}
            />
          </label>
        </div>

        {uploadStatus.fileName && (
          <div className={`rounded-lg border p-3 text-sm ${uploadStatus.uploaded ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <div className="flex items-center gap-2 font-medium">
              {uploadStatus.uploaded ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {uploadStatus.fileName}
            </div>
            <div className="mt-1">Filas procesadas: {uploadStatus.rows}</div>
            {uploadStatus.errors.length > 0 && (
              <ul className="mt-2 list-disc ml-5 space-y-0.5">
                {uploadStatus.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        {onGoBack && (
          <button type="button" onClick={onGoBack} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
        )}
        <button
          type="button"
          onClick={() => onComplete({ uploadStatus })}
          disabled={!canContinue || isSubmitting}
          className="flex-1 px-5 py-2.5 rounded-lg bg-[#0F4C81] text-white hover:bg-[#0b3b64] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          Finalizar
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  EmployeeImportRow,
  downloadMigrationExport,
  ImportLogEvent,
  StagedAssignment,
  parseEmployeeImportFile,
  runEmployeesMassiveImport,
} from './organization-massive-import';

type OrganizationMassiveEmployeesStepProps = {
  stagedAssignments: StagedAssignment[];
  onGoBack: () => void;
  onComplete: (payload: {
    employeeRows: EmployeeImportRow[];
    summary: any;
    events: ImportLogEvent[];
  }) => void;
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString();
}

export default function OrganizationMassiveEmployeesStep({
  stagedAssignments,
  onGoBack,
  onComplete,
}: OrganizationMassiveEmployeesStepProps) {
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rows, setRows] = useState<EmployeeImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [logs, setLogs] = useState<ImportLogEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const canProcess = rows.length > 0 && stagedAssignments.length > 0 && !processing && errors.length === 0;

  const summaryItems = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary);
  }, [summary]);

  const handleUpload = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    setRows([]);
    setErrors([]);
    setLogs([]);
    setSummary(null);
    setProgress(0);

    try {
      const result = await parseEmployeeImportFile(file);
      if (!result.success) {
        setErrors(result.errors.map((err) => `Fila ${err.row} · ${err.column}: ${err.message}`));
        return;
      }

      setRows(result.data);
      setLogs([
        {
          timestamp: new Date().toISOString(),
          phase: 'employees',
          level: 'info',
          message: `Archivo válido. ${result.rowCount} filas listas para procesar.`,
          progress: 5,
        },
      ]);
      toast.success(`Archivo válido: ${result.rowCount} empleados`);
    } catch (error: any) {
      setErrors([error?.message || 'Error leyendo el archivo']);
    } finally {
      setParsing(false);
    }
  };

  const handleProcess = async () => {
    if (!canProcess) return;
    setProcessing(true);
    setProgress(10);
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        phase: 'employees',
        level: 'info',
        message: 'Enviando información al backend...',
        progress: 10,
      },
    ]);

    const interval = window.setInterval(() => {
      setProgress((prev) => Math.min(prev + 3, 95));
    }, 700);

    try {
      const response = await runEmployeesMassiveImport(rows, stagedAssignments);
      window.clearInterval(interval);
      setProgress(100);
      setLogs(response.events || []);
      setSummary(response.summary || null);
      toast.success('Paso 2 completado: empleados y seguridad creados/actualizados');
      onComplete({
        employeeRows: rows,
        summary: response.summary || {},
        events: response.events || [],
      });
    } catch (error: any) {
      window.clearInterval(interval);
      setProgress(0);
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          phase: 'employees',
          level: 'error',
          message: error?.message || 'Error procesando empleados',
          progress: 0,
        },
      ]);
      toast.error(error?.message || 'No se pudo procesar el paso 2');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadExport = async () => {
    setExporting(true);
    try {
      const { blob, fileName } = await downloadMigrationExport();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exportacion generada: ${fileName}`);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo generar la exportacion');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Paso 2 · Empleados, Usuarios y Seguridad</h3>
            <p className="text-sm text-slate-600 mt-1">
              Cargue el archivo de empleados para crear empleados, usuarios, roles y scopes. Se consolidará con las asignaciones del paso 1.
            </p>
            <div className="text-xs text-slate-500 mt-2">
              Asignaciones staged recibidas del paso 1: <strong>{stagedAssignments.length}</strong>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg bg-[#0F4C81] px-3 py-2 text-sm text-white cursor-pointer hover:bg-[#0b3b64]">
            <Upload className="w-4 h-4" />
            Seleccionar archivo
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

        {fileName && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            {fileName}
            {rows.length > 0 && <span className="text-slate-500">· {rows.length} filas</span>}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="font-medium mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Errores de validación
            </div>
            <ul className="list-disc ml-5 space-y-0.5 max-h-48 overflow-y-auto">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-[#0F4C81] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Progreso: {progress}% {processing && progress >= 85 ? '· Procesando en servidor...' : ''}
          </div>
        </div>

        <div className="mt-4 flex justify-between gap-2">
          <button
            type="button"
            onClick={onGoBack}
            disabled={processing || parsing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={!canProcess || parsing}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {(parsing || processing) && <Loader2 className="w-4 h-4 animate-spin" />}
            Procesar paso 2
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="font-semibold text-slate-900 mb-2">Log de ejecución</div>
        <div className="h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          {logs.length === 0 ? (
            <div className="text-slate-500">Sin eventos aún.</div>
          ) : (
            <div className="space-y-1">
              {logs.map((event, idx) => (
                <div key={`${event.timestamp}-${idx}`} className="flex gap-2 text-slate-700">
                  <span className="text-slate-500 w-20">{formatTime(event.timestamp)}</span>
                  <span className="w-16 uppercase text-[10px] text-slate-500">{event.level}</span>
                  <span>{event.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {summaryItems.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="font-medium text-emerald-800 flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            Resumen final de procesamiento
          </div>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={handleDownloadExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F4C81] px-3 py-2 text-sm text-white hover:bg-[#0b3b64] disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Descargar matriz de migracion
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-emerald-900">
            {summaryItems.map(([key, value]) => (
              <div key={key} className="flex justify-between rounded border border-emerald-100 bg-white px-3 py-2">
                <span>{key}</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

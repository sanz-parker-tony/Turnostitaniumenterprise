import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatClientTime24 } from '@/utils/date-time';
import {
  ImportLogEvent,
  StagedAssignment,
  StructureImportRow,
  parseStructureImportFile,
  runStructureMassiveImport,
} from './organization-massive-import';

type OrganizationMassiveStructureStepProps = {
  onComplete: (payload: {
    stagedAssignments: StagedAssignment[];
    structureRows: StructureImportRow[];
    summary: Record<string, { created: number; updated: number }>;
    events: ImportLogEvent[];
  }) => void;
};

const EMPTY_LOGS: ImportLogEvent[] = [];

function formatTime(iso: string): string {
  return formatClientTime24(iso);
}

export default function OrganizationMassiveStructureStep({ onComplete }: OrganizationMassiveStructureStepProps) {
  const [parsing, setParsing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<StructureImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [logs, setLogs] = useState<ImportLogEvent[]>(EMPTY_LOGS);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<Record<string, { created: number; updated: number }> | null>(null);

  const canProcess = rows.length > 0 && !processing && errors.length === 0;

  const summaryItems = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary).map(([key, value]) => ({ key, ...value }));
  }, [summary]);

  const handleUpload = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    setRows([]);
    setErrors([]);
    setLogs(EMPTY_LOGS);
    setProgress(0);
    setSummary(null);

    try {
      const result = await parseStructureImportFile(file);
      if (!result.success) {
        setErrors(result.errors.map((err) => `Fila ${err.row} · ${err.column}: ${err.message}`));
        return;
      }

      setRows(result.data);
      setLogs([
        {
          timestamp: new Date().toISOString(),
          phase: 'structure',
          level: 'info',
          message: `Archivo válido. ${result.rowCount} filas listas para procesar.`,
          progress: 5,
        },
      ]);
      toast.success(`Archivo válido: ${result.rowCount} filas`);
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
        phase: 'structure',
        level: 'info',
        message: 'Enviando información al backend...',
        progress: 10,
      },
    ]);

    const interval = window.setInterval(() => {
      setProgress((prev) => Math.min(prev + 3, 95));
    }, 700);

    try {
      const response = await runStructureMassiveImport(rows);
      window.clearInterval(interval);
      setProgress(100);
      setLogs(response.events || EMPTY_LOGS);
      setSummary(response.summary || null);

      toast.success('Paso 1 completado: estructura y catálogos preparados');
      onComplete({
        stagedAssignments: response.staged_assignments || [],
        structureRows: rows,
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
          phase: 'structure',
          level: 'error',
          message: error?.message || 'Error procesando importación',
          progress: 0,
        },
      ]);
      toast.error(error?.message || 'No se pudo procesar el paso 1');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Paso 1 · Estructura y empleados por empresa</h3>
            <p className="text-sm text-slate-600 mt-1">
              Cargue el archivo organizacional para crear/actualizar catálogos maestros y preparar asignaciones employee-company.
            </p>
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

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!canProcess || parsing}
            onClick={handleProcess}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {(parsing || processing) && <Loader2 className="w-4 h-4 animate-spin" />}
            Procesar paso 1
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
            Resumen de creación/actualización
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-emerald-900">
            {summaryItems.map((item) => (
              <div key={item.key} className="flex justify-between rounded border border-emerald-100 bg-white px-3 py-2">
                <span>{item.key}</span>
                <span>+{item.created} / ~{item.updated}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

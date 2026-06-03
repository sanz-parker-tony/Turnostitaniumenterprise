import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, StopCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  downloadMigrationExport,
  getMassImportCapabilities,
  ImportCapabilities,
  ImportLogEvent,
  parseSingleWorkbook15Tabs,
  runEmployeesMassiveImport,
  runReverseMassiveImport,
  runStructureMassiveImport,
  SingleWorkbookPreparedPayload,
} from './organization-massive-import';

type OrganizationMassiveSingleFileStepProps = {
  onComplete: () => void;
};

type ActivityBar = {
  key: string;
  label: string;
  progress: number;
  level: ImportLogEvent['level'];
};

type ImportRunRecord = {
  id: string;
  fileName: string;
  createdAt: string;
  completedAt?: string | null;
  status: 'pending' | 'completed' | 'reversed' | 'failed' | 'aborted';
  progress: number;
  importStartedAt: string | null;
  structureRows: SingleWorkbookPreparedPayload['structureRows'];
  employeeRows: SingleWorkbookPreparedPayload['employeeRows'];
  stagedAssignments: any[];
  summary: Record<string, any> | null;
};

const RUN_STORAGE_KEY = 'tt.organization.massive.runs';

function nowEvent(
  level: ImportLogEvent['level'],
  message: string,
  progress: number,
  phase = 'single_workbook',
  activity?: { key: string; label?: string; progress?: number }
): ImportLogEvent {
  return {
    timestamp: new Date().toISOString(),
    phase,
    level,
    message,
    progress,
    activity_key: activity?.key,
    activity_label: activity?.label || activity?.key,
    activity_progress: activity?.progress,
  };
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString();
}

function inferActivity(event: ImportLogEvent): { key: string; label: string } | null {
  if (event.activity_key) {
    return {
      key: event.activity_key,
      label: event.activity_label || event.activity_key,
    };
  }
  const message = String(event.message || '');
  const startMatch = message.match(/Procesando tabla\s+(.+)$/i);
  if (startMatch?.[1]) {
    const label = startMatch[1].trim();
    return { key: `table_${label}`, label };
  }
  const summaryMatch = message.match(/Tabla\s+(.+):/i);
  if (summaryMatch?.[1]) {
    const label = summaryMatch[1].trim();
    return { key: `table_${label}`, label };
  }
  return null;
}

export default function OrganizationMassiveSingleFileStep({ onComplete }: OrganizationMassiveSingleFileStepProps) {
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [abortRequested, setAbortRequested] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [logs, setLogs] = useState<ImportLogEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [prepared, setPrepared] = useState<SingleWorkbookPreparedPayload | null>(null);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importStartedAt, setImportStartedAt] = useState<string | null>(null);
  const [runs, setRuns] = useState<ImportRunRecord[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ImportCapabilities>({
    can_import: true,
    can_abort: true,
    can_reverse: true,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(RUN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRuns(parsed);
        setSelectedRunId(parsed[0]?.id || null);
      }
    } catch {
      // Ignore storage issues.
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(runs));
    } catch {
      // Ignore storage issues.
    }
  }, [runs]);

  useEffect(() => {
    if (!processing && !reversing) return;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (processing) return Math.min(92, current + 1);
        if (reversing) return Math.min(98, current + 1);
        return current;
      });
    }, 1200);
    return () => window.clearInterval(timer);
  }, [processing, reversing]);

  useEffect(() => {
    let mounted = true;
    const loadCapabilities = async () => {
      try {
        const data = await getMassImportCapabilities();
        if (mounted) setCapabilities(data);
      } catch (error: any) {
        if (!mounted) return;
        setLogs((prev) => [
          ...prev,
          nowEvent('warn', `No se pudieron cargar capacidades de screen_actions (${error?.message || 'sin detalle'})`, 0),
        ]);
      }
    };
    void loadCapabilities();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const node = logContainerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [logs]);

  const canProcess = !!prepared && !parsing && !processing && !reversing && errors.length === 0 && capabilities.can_import;
  const canReverse = !!selectedRun && !parsing && !processing && !reversing && capabilities.can_reverse;

  const summaryItems = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary);
  }, [summary]);

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) || null,
    [runs, selectedRunId]
  );

  const activityBars = useMemo<ActivityBar[]>(() => {
    const map = new Map<string, ActivityBar>();
    logs.forEach((event) => {
      const inferred = inferActivity(event);
      if (!inferred) return;
      const current = map.get(inferred.key);
      const progressValue = Math.max(0, Math.min(100, event.activity_progress ?? event.progress ?? 0));
      const next: ActivityBar = {
        key: inferred.key,
        label: inferred.label,
        progress: current ? Math.max(current.progress, progressValue) : progressValue,
        level: event.level,
      };
      if (event.level === 'error') next.level = 'error';
      map.set(inferred.key, next);
    });
    return Array.from(map.values());
  }, [logs]);

  const upsertRun = (run: ImportRunRecord) => {
    setRuns((current) => {
      const next = [run, ...current.filter((item) => item.id !== run.id)].slice(0, 12);
      return next;
    });
    setSelectedRunId(run.id);
  };

  const patchRun = (runId: string, patch: Partial<ImportRunRecord>) => {
    setRuns((current) =>
      current.map((run) => {
        if (run.id !== runId) return run;
        return { ...run, ...patch };
      })
    );
  };

  const reverseRun = async (run: ImportRunRecord, reason: string) => {
    setReversing(true);
    setSelectedRunId(run.id);
    setLogs((prev) => [
      ...prev,
      nowEvent('warn', `Iniciando reversa de ${run.fileName}: ${reason}`, 2, 'reverse', {
        key: `reverse_${run.id}`,
        label: `Reversa ${run.fileName}`,
        progress: 5,
      }),
    ]);
    try {
      const reverseResponse = await runReverseMassiveImport({
        structureRows: run.structureRows,
        employeeRows: run.employeeRows,
        importStartedAt: run.importStartedAt,
      });
      setLogs((prev) => [
        ...prev,
        ...((reverseResponse.events || []).map((event) => ({
          ...event,
          message: `[Reverse] ${event.message}`,
        })) as ImportLogEvent[]),
      ]);
      setSummary({
        reversal_started_at: reverseResponse.started_at,
        ...reverseResponse.summary,
      });
      setProgress(100);
      patchRun(run.id, {
        status: 'reversed',
        completedAt: new Date().toISOString(),
        progress: 100,
        summary: {
          ...(run.summary || {}),
          reversal_started_at: reverseResponse.started_at,
          ...reverseResponse.summary,
        },
      });
      toast.success(`Reversa ejecutada para ${run.fileName}`);
    } catch (error: any) {
      setLogs((prev) => [...prev, nowEvent('error', error?.message || 'Error ejecutando reversa', progress, 'reverse')]);
      patchRun(run.id, { status: 'failed' });
      toast.error(error?.message || 'No se pudo ejecutar la reversa');
    } finally {
      setReversing(false);
    }
  };

  const handleUpload = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    setErrors([]);
    setLogs([]);
    setProgress(0);
    setPrepared(null);
    setSummary(null);
    setImportStartedAt(null);

    try {
      const parsed = await parseSingleWorkbook15Tabs(file);
      if (!parsed.success || parsed.data.length === 0) {
        setErrors(parsed.errors.map((err) => `Fila ${err.row} · ${err.column}: ${err.message}`));
        return;
      }

      const payload = parsed.data[0];
      setPrepared(payload);

      const startEvents: ImportLogEvent[] = [
        nowEvent('info', `Archivo valido (${payload.tabStats.length} pestanas detectadas).`, 5, 'single_workbook', {
          key: 'parse_workbook',
          label: 'Validar workbook',
          progress: 30,
        }),
      ];
      payload.tabStats.forEach((tab, idx) => {
        const p = 8 + Math.round(((idx + 1) / Math.max(payload.tabStats.length, 1)) * 22);
        startEvents.push(nowEvent('info', `Pestana ${tab.tab}: ${tab.rows} filas preparadas`, p));
      });
      startEvents.push(
        nowEvent('success', 'Transformacion a formato interno completada.', 30, 'single_workbook', {
          key: 'parse_workbook',
          label: 'Validar workbook',
          progress: 100,
        })
      );
      setLogs(startEvents);
      setProgress(30);
      toast.success('Archivo preparado correctamente');
    } catch (error: any) {
      setErrors([error?.message || 'No se pudo procesar el archivo unico']);
    } finally {
      setParsing(false);
    }
  };

  const handleAbort = () => {
    if (!processing || !capabilities.can_abort) return;
    setAbortRequested(true);
    abortControllerRef.current?.abort();
    setLogs((prev) => [
      ...prev,
      nowEvent('warn', 'Abort solicitado por usuario. Se intentara revertir la importacion.', progress, 'single_workbook', {
        key: 'abort_signal',
        label: 'Abort',
        progress: 100,
      }),
    ]);
  };

  const handleProcess = async () => {
    if (!prepared || !capabilities.can_import) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setAbortRequested(false);
    setProcessing(true);
    const startedAt = new Date().toISOString();
    setImportStartedAt(startedAt);
    const runId = `${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
    const runRecord: ImportRunRecord = {
      id: runId,
      fileName: fileName || 'workbook.xlsx',
      createdAt: startedAt,
      completedAt: null,
      status: 'pending',
      progress: 35,
      importStartedAt: startedAt,
      structureRows: prepared.structureRows,
      employeeRows: prepared.employeeRows,
      stagedAssignments: [],
      summary: null,
    };
    upsertRun(runRecord);
    setProgress((prev) => Math.max(prev, 35));
    setLogs((prev) => [
      ...prev,
      nowEvent('info', 'Iniciando importacion paso 1 (estructura)...', 35, 'single_workbook', {
        key: 'step1_structure',
        label: 'Paso 1 estructura',
        progress: 10,
      }),
    ]);

    try {
      const structureResponse = await runStructureMassiveImport(prepared.structureRows, controller.signal);
      runRecord.stagedAssignments = structureResponse.staged_assignments || [];
      patchRun(runId, {
        stagedAssignments: structureResponse.staged_assignments || [],
        progress: 70,
      });
      setProgress(70);
      setLogs((prev) => [
        ...prev,
        ...((structureResponse.events || []).map((event) => ({ ...event, message: `[Paso 1] ${event.message}` })) as ImportLogEvent[]),
        nowEvent('success', 'Paso 1 completado. Iniciando paso 2 (empleados/usuarios)...', 72, 'single_workbook', {
          key: 'step1_structure',
          label: 'Paso 1 estructura',
          progress: 100,
        }),
        nowEvent('info', 'Procesando paso 2 (empleados, usuarios y seguridad)...', 73, 'single_workbook', {
          key: 'step2_employees',
          label: 'Paso 2 empleados',
          progress: 10,
        }),
      ]);

      if (abortRequested) {
        throw new Error('Abort solicitado por usuario');
      }

      const employeesResponse = await runEmployeesMassiveImport(
        prepared.employeeRows,
        structureResponse.staged_assignments || [],
        controller.signal
      );

      setProgress(100);
      setLogs((prev) => [
        ...prev,
        ...((employeesResponse.events || []).map((event) => ({ ...event, message: `[Paso 2] ${event.message}` })) as ImportLogEvent[]),
        nowEvent('success', 'Importacion general completada.', 100, 'single_workbook', {
          key: 'step2_employees',
          label: 'Paso 2 empleados',
          progress: 100,
        }),
      ]);

      setSummary({
        rows_structure_payload: prepared.structureRows.length,
        rows_employees_payload: prepared.employeeRows.length,
        rows_staged_assignments: (structureResponse.staged_assignments || []).length,
        ...employeesResponse.summary,
      });
      patchRun(runId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        progress: 100,
        summary: {
          rows_structure_payload: prepared.structureRows.length,
          rows_employees_payload: prepared.employeeRows.length,
          rows_staged_assignments: (structureResponse.staged_assignments || []).length,
          ...employeesResponse.summary,
        },
      });
      toast.success('Carga masiva finalizada');
      onComplete();
    } catch (error: any) {
      const message = error?.message || 'Error ejecutando importacion';
      const isAbort = abortRequested || /cancelada|abort/i.test(message);
      if (isAbort) {
        setLogs((prev) => [...prev, nowEvent('warn', `Importacion interrumpida: ${message}`, 0)]);
        patchRun(runId, {
          status: 'aborted',
          completedAt: new Date().toISOString(),
          progress: 0,
        });
        if (capabilities.can_reverse) {
          await reverseRun(runRecord, 'Abort de usuario');
        } else {
          setLogs((prev) => [
            ...prev,
            nowEvent('warn', 'No hay permiso de reversa (screen_actions). Solicite accion REVERSE_IMPORT.', 0),
          ]);
        }
      } else {
        setProgress(0);
        setLogs((prev) => [...prev, nowEvent('error', message, 0)]);
        toast.error(message || 'No se pudo completar la importacion');
      }
    } finally {
      abortControllerRef.current = null;
      setProcessing(false);
      setAbortRequested(false);
    }
  };

  const handleDownloadExport = async () => {
    setExporting(true);
    try {
      const { blob, fileName: out } = await downloadMigrationExport();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = out;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exportacion generada: ${out}`);
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
            <h3 className="text-lg font-semibold text-slate-900">Archivo unico · 15 pestanas</h3>
            <p className="text-sm text-slate-600 mt-1">
              Cargue el archivo transformed de 15 pestanas. El sistema ejecuta estructura (paso 1) y empleados (paso 2).
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
            {prepared && <span className="text-slate-500">· {prepared.tabStats.length} pestanas</span>}
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="font-medium mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Errores de validacion
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
            Progreso general: {progress}% {processing && progress >= 85 ? '· Procesando en servidor...' : ''}
          </div>
        </div>

        {activityBars.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-700">Progreso por actividad</div>
            {activityBars.map((activity) => (
              <div key={activity.key}>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>{activity.label}</span>
                  <span>{activity.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      activity.level === 'error'
                        ? 'bg-red-500'
                        : activity.level === 'warn'
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                    }`}
                    style={{ width: `${activity.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => selectedRun && reverseRun(selectedRun, 'Reversa manual solicitada')}
            disabled={!canReverse || !selectedRun}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {reversing && <Loader2 className="w-4 h-4 animate-spin" />}
            Reversar importacion
          </button>
          <button
            type="button"
            onClick={handleAbort}
            disabled={!processing || !capabilities.can_abort}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            <StopCircle className="w-4 h-4" />
            Abort
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={!canProcess}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {(processing || parsing) && <Loader2 className="w-4 h-4 animate-spin" />}
            Ejecutar importacion completa
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="font-semibold text-slate-900 mb-2">Log de ejecucion</div>
        <div ref={logContainerRef} className="h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          {logs.length === 0 ? (
            <div className="text-slate-500">Sin eventos aun.</div>
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

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="font-semibold text-slate-900">Historial de cargas</div>
            <div className="text-xs text-slate-500">Mantiene las cargas recientes de esta sesion para reversa o limpieza visual.</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setRuns([]);
              setSelectedRunId(null);
              try {
                window.sessionStorage.removeItem(RUN_STORAGE_KEY);
              } catch {
                // Ignore storage issues.
              }
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
          >
            Limpiar historial
          </button>
        </div>
        {runs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Aun no hay cargas registradas.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {runs.map((run) => {
              const isSelected = run.id === selectedRunId;
              const statusLabel =
                run.status === 'completed'
                  ? 'Completada'
                  : run.status === 'reversed'
                    ? 'Revertida'
                    : run.status === 'aborted'
                      ? 'Abortada'
                      : run.status === 'failed'
                        ? 'Fallida'
                        : 'En proceso';
              const statusClass =
                run.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : run.status === 'reversed'
                    ? 'bg-amber-100 text-amber-700'
                    : run.status === 'aborted'
                      ? 'bg-orange-100 text-orange-700'
                      : run.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700';

              return (
                <div
                  key={run.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRunId(run.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedRunId(run.id);
                    }
                  }}
                  className={`cursor-pointer text-left rounded-xl border p-4 transition-colors ${
                    isSelected ? 'border-[#0F4C81] bg-[#0F4C81]/5' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{run.fileName}</div>
                      <div className="text-xs text-slate-500">{formatTime(run.createdAt)}</div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-[#0F4C81] transition-all duration-300" style={{ width: `${run.progress}%` }} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>Structure rows: {run.structureRows.length}</div>
                    <div>Employee rows: {run.employeeRows.length}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                      {run.summary ? 'Con resumen' : 'Sin resumen'}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                      {run.stagedAssignments.length} asignaciones
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        reverseRun(run, 'Reversa desde historial');
                      }}
                      disabled={!capabilities.can_reverse || reversing || run.status === 'reversed' || run.status === 'pending'}
                      className="rounded-lg bg-amber-600 px-3 py-2 text-xs text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Reversar
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setRuns((current) => current.filter((item) => item.id !== run.id));
                        if (selectedRunId === run.id) setSelectedRunId(null);
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Borrar de lista
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {summaryItems.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="font-medium text-emerald-800 flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            Resumen final
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

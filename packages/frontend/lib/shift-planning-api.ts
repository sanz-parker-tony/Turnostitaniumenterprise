import { publicApiToken } from '@/utils/backend/info';

export type ShiftPlanningEmployeeFilter = {
  soloEmpleadosTurnosRotativos: boolean;
  areaId: string | null;
  grupoTrabajoId: string | null;
};

export type ShiftPlanningDateRange = {
  fechaInicio: string;
  fechaFin: string;
};

export type ShiftPlanningActivePattern = {
  patronId: string;
  nombrePatron: string;
  esquemaActual: {
    diasTrabajo: number;
    diasLibres: number;
  };
};

export type ShiftPlanningRequiredCoverageItem = {
  turnoId: string;
  nombreTurno: string;
  codigoTurno: string;
  horaInicio: string | null;
  horaFin: string | null;
  cantidadRequerida: number;
};

export type ShiftPlanningAIRules = {
  evitarTurnoNocheManana: boolean;
  priorizarEquidadHoras: boolean;
  equilibrarFeriados: boolean;
  permitirSwaps: boolean;
};

export type ShiftPlanningAvailableEmployee = {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  companyId: string | null;
  companyName: string | null;
};

export type ShiftPlanningAvailableShift = {
  id: string;
  nombreTurno: string;
  codigoTurno: string;
  horaInicio: string | null;
  horaFin: string | null;
  duracionMinutos: number | null;
  companyId: string;
};

export type ShiftPlanningGeneratePayload = {
  filtrosEmpleados: ShiftPlanningEmployeeFilter;
  rangoFechas: ShiftPlanningDateRange;
  patronActivo: ShiftPlanningActivePattern;
  dotacionRequerida: ShiftPlanningRequiredCoverageItem[];
  reglasIA: ShiftPlanningAIRules;
  empleadosDisponibles: ShiftPlanningAvailableEmployee[];
  turnosDisponibles: ShiftPlanningAvailableShift[];
};

type GenerateShiftPlanningOptions = {
  dryRun?: boolean;
};

function getToken() {
  return localStorage.getItem('tt-access-token') || publicApiToken;
}

export async function generateShiftPlanning(
  payload: ShiftPlanningGeneratePayload,
  options?: GenerateShiftPlanningOptions
) {
  if (options?.dryRun) {
    return { success: true, dryRun: true } as const;
  }

  const response = await fetch('http://localhost:3001/api/shift-planning/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `HTTP ${response.status}`);
  }

  return body;
}

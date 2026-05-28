import { buildApiUrl } from '../utils/api-config';
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
  modoDistribucionTurnos?: 'ESCALONADOS' | 'IGUALES';
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

export type ShiftPlanningGeneratedItem = {
  empleadoId: string;
  empleadoNombre: string;
  fecha: string;
  turnoId: string | null;
  nombreTurno: string | null;
  codigoTurno: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  esLibre: boolean;
};

export type ShiftPlanningGenerateResponse = {
  success: boolean;
  message: string;
  planificacion: ShiftPlanningGeneratedItem[];
  resumen?: {
    totalEmpleados?: number;
    totalFechas?: number;
    totalAsignacionesTrabajo?: number;
    totalAsignacionesLibre?: number;
  };
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
): Promise<ShiftPlanningGenerateResponse> {
  if (options?.dryRun) {
    return {
      success: true,
      message: 'Dry run',
      planificacion: [],
    };
  }

  const response = await fetch(buildApiUrl('/api/shift-planning/generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || body?.error || `HTTP ${response.status}`);
  }

  return body as ShiftPlanningGenerateResponse;
}

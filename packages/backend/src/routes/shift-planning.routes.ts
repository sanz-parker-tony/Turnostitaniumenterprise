import { Request, Response, Router } from 'express';

const router = Router();

const DEFAULT_OPTIMIZER_URL = 'http://localhost:8010';

type ShiftPlanningGeneratePayload = {
  rangoFechas?: {
    fechaInicio?: string;
    fechaFin?: string;
  };
  empleadosDisponibles?: Array<unknown>;
  dotacionRequerida?: Array<{
    cantidadRequerida?: number;
  }>;
};

function normalizeBaseUrl(url?: string): string {
  const base = String(url || DEFAULT_OPTIMIZER_URL).trim() || DEFAULT_OPTIMIZER_URL;
  return base.replace(/\/+$/, '');
}

function toIsoDate(value: unknown): string {
  return String(value || '').trim();
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateGeneratePayload(payload: ShiftPlanningGeneratePayload): string | null {
  const fechaInicio = toIsoDate(payload?.rangoFechas?.fechaInicio);
  const fechaFin = toIsoDate(payload?.rangoFechas?.fechaFin);

  if (!fechaInicio) return 'rangoFechas.fechaInicio es obligatorio';
  if (!fechaFin) return 'rangoFechas.fechaFin es obligatorio';
  if (!isIsoDate(fechaInicio) || !isIsoDate(fechaFin)) {
    return 'rangoFechas.fechaInicio y rangoFechas.fechaFin deben tener formato YYYY-MM-DD';
  }

  const start = new Date(`${fechaInicio}T00:00:00`);
  const end = new Date(`${fechaFin}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'rangoFechas contiene fechas inválidas';
  }
  if (start.getTime() > end.getTime()) {
    return 'rangoFechas.fechaInicio no puede ser mayor a rangoFechas.fechaFin';
  }

  const empleadosDisponibles = Array.isArray(payload?.empleadosDisponibles) ? payload.empleadosDisponibles : [];
  if (empleadosDisponibles.length < 1) {
    return 'empleadosDisponibles debe tener al menos 1 empleado';
  }

  const dotacionRequerida = Array.isArray(payload?.dotacionRequerida) ? payload.dotacionRequerida : [];
  if (dotacionRequerida.length < 1) {
    return 'dotacionRequerida debe tener al menos 1 turno';
  }

  const hasAtLeastOneRequired = dotacionRequerida.some((row) => Number(row?.cantidadRequerida || 0) >= 1);
  if (!hasAtLeastOneRequired) {
    return 'Al menos un turno en dotacionRequerida debe tener cantidadRequerida >= 1';
  }

  return null;
}

router.post('/generate', async (req: Request, res: Response) => {
  const payload = req.body as ShiftPlanningGeneratePayload;
  const optimizerBaseUrl = normalizeBaseUrl(process.env.OPTIMIZER_URL);
  const optimizerGenerateUrl = `${optimizerBaseUrl}/generate`;

  console.log('[shift-planning] Payload recibido:', JSON.stringify(payload));
  console.log('[shift-planning] URL optimizer:', optimizerGenerateUrl);

  const validationError = validateGeneratePayload(payload);
  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const optimizerResponse = await fetch(optimizerGenerateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const rawText = await optimizerResponse.text();
    let optimizerBody: any = null;
    try {
      optimizerBody = rawText ? JSON.parse(rawText) : {};
    } catch {
      optimizerBody = { success: false, message: rawText || 'Respuesta no JSON del optimizador' };
    }

    console.log('[shift-planning] Respuesta optimizer:', JSON.stringify({
      status: optimizerResponse.status,
      ok: optimizerResponse.ok,
      body: optimizerBody,
    }));

    if (!optimizerResponse.ok) {
      return res.status(optimizerResponse.status).json(optimizerBody);
    }

    return res.status(optimizerResponse.status).json(optimizerBody);
  } catch (error: any) {
    const isConnectivityError = error?.name === 'AbortError' || error instanceof TypeError;
    if (isConnectivityError) {
      console.error('[shift-planning] Error conectando con optimizer:', error);
      return res.status(502).json({
        success: false,
        message: 'No se pudo conectar con el optimizador de turnos',
      });
    }

    console.error('[shift-planning] Error inesperado:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Error interno en generación de planificación',
    });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from ortools.sat.python import cp_model
from pydantic import BaseModel


app = FastAPI(title="Shift Planning Optimizer")

NIGHT_CODES = {"VELA", "NOCHE", "NOCT", "N"}


class GeneratePlanningRequest(BaseModel):
    filtrosEmpleados: Dict[str, Any]
    rangoFechas: Dict[str, Any]
    patronActivo: Dict[str, Any]
    dotacionRequerida: List[Dict[str, Any]]
    reglasIA: Dict[str, bool]
    empleadosDisponibles: List[Dict[str, Any]]
    turnosDisponibles: List[Dict[str, Any]]


def _normalize_text(value: Any) -> str:
    return str(value or "").strip().upper()


def _parse_iso_date(value: Any) -> Optional[datetime]:
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%Y-%m-%d")
    except ValueError:
        return None


def _build_date_list(fecha_inicio: str, fecha_fin: str) -> List[str]:
    start = _parse_iso_date(fecha_inicio)
    end = _parse_iso_date(fecha_fin)
    if not start or not end or start > end:
        return []

    days: List[str] = []
    current = start
    while current <= end:
        days.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)
    return days


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _is_libre(turno: Dict[str, Any]) -> bool:
    codigo = _normalize_text(turno.get("codigoTurno"))
    nombre = _normalize_text(turno.get("nombreTurno"))
    return codigo == "LIBRE" or nombre == "LIBRE"


def _is_night_shift(turno: Dict[str, Any]) -> bool:
    codigo = _normalize_text(turno.get("codigoTurno"))
    return codigo in NIGHT_CODES


def _is_morning_shift(turno: Dict[str, Any]) -> bool:
    codigo = _normalize_text(turno.get("codigoTurno"))
    nombre = _normalize_text(turno.get("nombreTurno"))

    if codigo in {"M", "MAT", "MATU", "MORNING"}:
        return True
    return "MATUT" in nombre or "MANANA" in nombre or "MAÑANA" in nombre


def _employee_display_name(employee: Dict[str, Any]) -> str:
    apellidos = str(employee.get("apellidos") or "").strip()
    nombres = str(employee.get("nombres") or "").strip()
    full = f"{apellidos} {nombres}".strip()
    if full:
        return full
    return str(employee.get("codigo") or employee.get("id") or "Empleado")


@app.get("/health")
def health():
    return {"ok": True, "service": "optimizer", "ortools": "ready"}


@app.post("/generate")
def generate_planning(payload: GeneratePlanningRequest):
    data = payload.model_dump()

    empleados = data.get("empleadosDisponibles") or []
    rango = data.get("rangoFechas") or {}
    dotacion = data.get("dotacionRequerida") or []
    turnos_disponibles = data.get("turnosDisponibles") or []
    reglas = data.get("reglasIA") or {}

    fecha_inicio = str(rango.get("fechaInicio") or "").strip()
    fecha_fin = str(rango.get("fechaFin") or "").strip()
    fechas = _build_date_list(fecha_inicio, fecha_fin)

    print(
        "[optimizer] /generate payload:",
        {
            "empleados": len(empleados),
            "dotacion": len(dotacion),
            "turnosDisponibles": len(turnos_disponibles),
            "fechaInicio": fecha_inicio,
            "fechaFin": fecha_fin,
            "reglasIA": reglas,
        },
    )

    if not fechas:
        return {
            "success": False,
            "message": "Rango de fechas inv�lido",
            "planificacion": [],
        }

    if len(empleados) < 1:
        return {
            "success": False,
            "message": "No hay empleados disponibles para planificar",
            "planificacion": [],
        }

    turnos_catalogo_by_id: Dict[str, Dict[str, Any]] = {}
    for turno in turnos_disponibles:
        turno_id = str(turno.get("id") or "").strip()
        if turno_id:
            turnos_catalogo_by_id[turno_id] = turno

    dotacion_enriquecida: List[Dict[str, Any]] = []
    for row in dotacion:
        turno_id = str(row.get("turnoId") or "").strip()
        catalog = turnos_catalogo_by_id.get(turno_id, {})

        cantidad = max(0, _safe_int(row.get("cantidadRequerida"), 0))
        turno_info = {
            "turnoId": turno_id,
            "nombreTurno": row.get("nombreTurno")
            or catalog.get("nombreTurno")
            or catalog.get("shift_name")
            or "",
            "codigoTurno": row.get("codigoTurno")
            or catalog.get("codigoTurno")
            or catalog.get("shift_short_name")
            or "",
            "horaInicio": row.get("horaInicio") or catalog.get("horaInicio"),
            "horaFin": row.get("horaFin") or catalog.get("horaFin"),
            "cantidadRequerida": cantidad,
        }
        dotacion_enriquecida.append(turno_info)

    turno_libre = next((t for t in dotacion_enriquecida if _is_libre(t)), None)
    turnos_trabajo = [t for t in dotacion_enriquecida if not _is_libre(t)]

    demanda_diaria_total = sum(max(0, _safe_int(t.get("cantidadRequerida"), 0)) for t in turnos_trabajo)
    if demanda_diaria_total > len(empleados):
        print(
            "[optimizer] factibilidad fallida:",
            {"demanda_diaria_total": demanda_diaria_total, "empleados": len(empleados)},
        )
        return {
            "success": False,
            "message": "La dotacion requerida supera la cantidad de empleados disponibles por dia",
            "planificacion": [],
        }

    model = cp_model.CpModel()

    total_empleados = len(empleados)
    total_fechas = len(fechas)
    total_turnos_trabajo = len(turnos_trabajo)

    asignacion: Dict[tuple[int, int, int], cp_model.IntVar] = {}

    for e_idx in range(total_empleados):
        for d_idx in range(total_fechas):
            vars_dia: List[cp_model.IntVar] = []
            for s_idx in range(total_turnos_trabajo):
                var = model.NewBoolVar(f"a_e{e_idx}_d{d_idx}_s{s_idx}")
                asignacion[(e_idx, d_idx, s_idx)] = var
                vars_dia.append(var)
            if vars_dia:
                model.Add(sum(vars_dia) <= 1)

    for d_idx in range(total_fechas):
        for s_idx, turno in enumerate(turnos_trabajo):
            required = max(0, _safe_int(turno.get("cantidadRequerida"), 0))
            model.Add(
                sum(asignacion[(e_idx, d_idx, s_idx)] for e_idx in range(total_empleados)) == required
            )

    if reglas.get("evitarTurnoNocheManana") is True and total_fechas > 1:
        night_idx = [idx for idx, turno in enumerate(turnos_trabajo) if _is_night_shift(turno)]
        morning_idx = [idx for idx, turno in enumerate(turnos_trabajo) if _is_morning_shift(turno)]
        print("[optimizer] regla evitar N->M activa", {"night": night_idx, "morning": morning_idx})
        for e_idx in range(total_empleados):
            for d_idx in range(total_fechas - 1):
                for n_idx in night_idx:
                    for m_idx in morning_idx:
                        model.Add(
                            asignacion[(e_idx, d_idx, n_idx)]
                            + asignacion[(e_idx, d_idx + 1, m_idx)]
                            <= 1
                        )

    if reglas.get("priorizarEquidadHoras") is True and total_turnos_trabajo > 0:
        max_turnos = total_fechas
        max_asign = model.NewIntVar(0, max_turnos, "max_asign")
        min_asign = model.NewIntVar(0, max_turnos, "min_asign")

        for e_idx in range(total_empleados):
            total_emp = model.NewIntVar(0, max_turnos, f"total_emp_{e_idx}")
            model.Add(
                total_emp
                == sum(
                    asignacion[(e_idx, d_idx, s_idx)]
                    for d_idx in range(total_fechas)
                    for s_idx in range(total_turnos_trabajo)
                )
            )
            model.Add(total_emp <= max_asign)
            model.Add(total_emp >= min_asign)

        model.Minimize(max_asign - min_asign)
        print("[optimizer] regla equidad activa")

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0

    print("[optimizer] resolviendo modelo CP-SAT...")
    status = solver.Solve(model)
    status_ok = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
    print("[optimizer] status:", solver.StatusName(status))

    if not status_ok:
        return {
            "success": False,
            "message": "No se encontr� una planificaci�n v�lida con las restricciones seleccionadas",
            "planificacion": [],
        }

    planificacion: List[Dict[str, Any]] = []
    total_asignaciones_trabajo = 0
    total_asignaciones_libre = 0

    for e_idx, empleado in enumerate(empleados):
        empleado_id = str(empleado.get("id") or "")
        empleado_nombre = _employee_display_name(empleado)

        for d_idx, fecha in enumerate(fechas):
            trabajo_asignado = False

            for s_idx, turno in enumerate(turnos_trabajo):
                if solver.Value(asignacion[(e_idx, d_idx, s_idx)]) == 1:
                    planificacion.append(
                        {
                            "empleadoId": empleado_id,
                            "empleadoNombre": empleado_nombre,
                            "fecha": fecha,
                            "turnoId": turno.get("turnoId"),
                            "nombreTurno": turno.get("nombreTurno"),
                            "codigoTurno": turno.get("codigoTurno"),
                            "horaInicio": turno.get("horaInicio"),
                            "horaFin": turno.get("horaFin"),
                            "esLibre": False,
                        }
                    )
                    total_asignaciones_trabajo += 1
                    trabajo_asignado = True
                    break

            if not trabajo_asignado and turno_libre is not None:
                planificacion.append(
                    {
                        "empleadoId": empleado_id,
                        "empleadoNombre": empleado_nombre,
                        "fecha": fecha,
                        "turnoId": turno_libre.get("turnoId"),
                        "nombreTurno": turno_libre.get("nombreTurno"),
                        "codigoTurno": turno_libre.get("codigoTurno"),
                        "horaInicio": turno_libre.get("horaInicio"),
                        "horaFin": turno_libre.get("horaFin"),
                        "esLibre": True,
                    }
                )
                total_asignaciones_libre += 1

    print(
        "[optimizer] planificaci�n generada:",
        {
            "filas": len(planificacion),
            "trabajo": total_asignaciones_trabajo,
            "libre": total_asignaciones_libre,
        },
    )

    return {
        "success": True,
        "message": "Planificacion generada correctamente",
        "planificacion": planificacion,
        "resumen": {
            "totalEmpleados": total_empleados,
            "totalFechas": total_fechas,
            "totalAsignacionesTrabajo": total_asignaciones_trabajo,
            "totalAsignacionesLibre": total_asignaciones_libre,
        },
    }

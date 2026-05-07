from typing import Any, Dict, List

from fastapi import FastAPI
from pydantic import BaseModel
from ortools.sat.python import cp_model


app = FastAPI(title="Shift Planning Optimizer")


class GeneratePlanningRequest(BaseModel):
    filtrosEmpleados: Dict[str, Any]
    rangoFechas: Dict[str, Any]
    patronActivo: Dict[str, Any]
    dotacionRequerida: List[Dict[str, Any]]
    reglasIA: Dict[str, bool]
    empleadosDisponibles: List[Dict[str, Any]]
    turnosDisponibles: List[Dict[str, Any]]


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "optimizer",
        "ortools": "ready"
    }


@app.post("/generate")
def generate_planning(payload: GeneratePlanningRequest):
    data = payload.model_dump()

    empleados = data["empleadosDisponibles"]
    dotacion = data["dotacionRequerida"]

    # Prueba mínima de OR-Tools
    model = cp_model.CpModel()

    # Variable booleana de prueba
    test_var = model.NewBoolVar("test_var")

    # Restricción simple: test_var debe ser 1
    model.Add(test_var == 1)

    solver = cp_model.CpSolver()
    status = solver.Solve(model)

    if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
        return {
            "success": False,
            "message": "OR-Tools no pudo resolver el modelo de prueba",
            "planificacion": []
        }

    return {
        "success": True,
        "message": "Payload recibido correctamente y OR-Tools está funcionando",
        "ortoolsStatus": solver.StatusName(status),
        "ortoolsTestValue": solver.Value(test_var),
        "received": data,
        "resumen": {
            "totalEmpleados": len(empleados),
            "totalTurnosDotacion": len(dotacion),
        },
        "planificacion": []
    }
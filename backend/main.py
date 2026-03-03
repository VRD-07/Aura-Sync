from __future__ import annotations

from typing import Any, Dict, List, Optional

import io
import sys
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import socketio

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from ai.data_loader import process_project_bytes, process_project_df
except Exception:  # pragma: no cover
    process_project_bytes = None  # type: ignore[assignment]
    process_project_df = None  # type: ignore[assignment]


# -----------------------------------------------------------------------------
# In-memory project state
# -----------------------------------------------------------------------------

class ProjectState:
    """
    Simple in-memory storage for project tasks.

    In Day 1–2 this is backed by mock data.
    Later, this will hold the real output from M1.process_project().
    """

    def __init__(self) -> None:
        self.csv_bytes: Optional[bytes] = None
        self.tasks: List[Dict[str, Any]] = self._default_dashboard_tasks()

    @staticmethod
    def _default_dashboard_tasks() -> List[Dict[str, Any]]:
        # Contract matches the current frontend components.
        return [
            {
                "task_id": "T01",
                "task_name": "Foundation",
                "start_date": "2026-03-10",
                "end_date": "2026-03-20",
                "risk_label": "High",
                "risk_score": 0.87,
                "on_time_probability": 28.4,
                "p90_duration": 14.0,
                "optimized_start": "2026-03-10",
                "optimized_end": "2026-03-22",
                "recommendation": "Start 2 days earlier",
            },
            {
                "task_id": "T02",
                "task_name": "Electrical Wiring",
                "start_date": "2026-03-15",
                "end_date": "2026-03-25",
                "risk_label": "Medium",
                "risk_score": 0.61,
                "on_time_probability": 55.0,
                "p90_duration": 12.0,
                "optimized_start": "2026-03-15",
                "optimized_end": "2026-03-25",
                "recommendation": "Monitor resource load",
            },
            {
                "task_id": "T03",
                "task_name": "Roofing",
                "start_date": "2026-03-22",
                "end_date": "2026-03-30",
                "risk_label": "Low",
                "risk_score": 0.21,
                "on_time_probability": 88.5,
                "p90_duration": 9.0,
                "optimized_start": "2026-03-22",
                "optimized_end": "2026-03-30",
                "recommendation": "On track",
            },
        ]

    def set_project_csv(self, csv_bytes: bytes) -> None:
        self.csv_bytes = csv_bytes

    def set_tasks(self, tasks: List[Dict[str, Any]]) -> None:
        self.tasks = tasks

    def get_tasks(self) -> List[Dict[str, Any]]:
        return self.tasks


project_state = ProjectState()


# -----------------------------------------------------------------------------
# FastAPI app + CORS
# -----------------------------------------------------------------------------

app = FastAPI(title="Aura-Sync EPC Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to known M3 origins.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Socket.IO setup
# -----------------------------------------------------------------------------

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
)
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)


@sio.event
async def connect(sid, environ):
    # A client has connected to the Socket.IO server.
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    # A client has disconnected.
    print(f"Client disconnected: {sid}")


# -----------------------------------------------------------------------------
# Helper functions
# -----------------------------------------------------------------------------

def parse_csv_to_mock_tasks(file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    For Day 1–2, we ignore the real CSV semantics and simply
    return mock data. This function is still here so the /upload
    endpoint is structurally ready for M1 integration.
    """
    # In the future, you'll:
    #  - decode CSV
    #  - validate columns
    #  - pass structured data into M1.process_project()
    #  - return M1's enriched task list
    _ = file_bytes  # currently unused
    return project_state._default_dashboard_tasks()


def _ai_available() -> bool:
    return callable(process_project_bytes) and callable(process_project_df)


def _load_csv_df_from_bytes(csv_bytes: bytes):
    import pandas as pd

    return pd.read_csv(io.BytesIO(csv_bytes))


def _apply_duration_multiplier(df_raw, duration_multiplier: float):
    import pandas as pd

    if duration_multiplier <= 0:
        raise ValueError("duration_multiplier must be > 0")

    df = df_raw.copy()
    start = pd.to_datetime(df["start_date"], errors="coerce", dayfirst=True)
    end = pd.to_datetime(df["end_date"], errors="coerce", dayfirst=True)
    if start.isna().any() or end.isna().any():
        raise ValueError("start_date/end_date must be valid dates for what-if scenarios")

    durations = (end - start).dt.days.clip(lower=1)
    new_durations = (durations.astype(float) * float(duration_multiplier)).round().astype(int).clip(lower=1)
    df["end_date"] = (start + pd.to_timedelta(new_durations, unit="D")).dt.strftime("%Y-%m-%d")
    return df


async def broadcast_tasks_update(reason: str = "what-if") -> None:
    """
    Emit the current task list to all connected Socket.IO clients.
    """
    payload = {
        "reason": reason,
        "tasks": project_state.get_tasks(),
    }
    await sio.emit("tasks_update", payload)


# -----------------------------------------------------------------------------
# API models (simple, untyped bodies for now)
# -----------------------------------------------------------------------------

@app.get("/health")
async def health_check() -> Dict[str, str]:
    return {"status": "ok", "service": "Aura-Sync EPC backend"}


@app.post("/upload")
async def upload_project(file: UploadFile = File(...)) -> JSONResponse:
    """
    Receives a CSV file from M3.

    Day 1–2:
      - Pretends to process the CSV.
      - Returns hardcoded/mock task data.

    Day 3:
      - Replace mock pipeline with M1.process_project() call.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    try:
        content = await file.read()
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=f"Failed to read file: {exc}") from exc

    project_state.set_project_csv(content)

    if _ai_available():
        try:
            tasks = process_project_bytes(content)  # type: ignore[misc]
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"AI processing failed: {exc}") from exc
    else:
        tasks = parse_csv_to_mock_tasks(content)

    project_state.set_tasks(tasks)

    await broadcast_tasks_update(reason="upload")
    return JSONResponse(content={"tasks": tasks})


@app.get("/results")
async def get_results() -> JSONResponse:
    """
    Returns the currently stored task list.

    M3 can call this to render the Gantt chart.
    """
    tasks = project_state.get_tasks()
    return JSONResponse(content={"tasks": tasks})


@app.post("/whatif")
async def what_if(body: Dict[str, Any]) -> JSONResponse:
    """
    Receives a modified scenario from M4.

    Day 1–2:
      - Applies a very simple fake transformation on the in-memory tasks
        (e.g. scale durations) just to simulate a changed schedule.
      - Broadcasts the updated list over Socket.IO.

    Day 3:
      - Use body + current project as inputs to M1.process_project()
        and store + broadcast the real recomputed schedule.
    """
    duration_multiplier: Optional[float] = None
    if "duration_multiplier" in body:
        try:
            duration_multiplier = float(body["duration_multiplier"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid duration_multiplier value.")
    elif "multiplier" in body:
        try:
            duration_multiplier = float(body["multiplier"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Invalid multiplier value.")

    if duration_multiplier is None:
        raise HTTPException(status_code=400, detail="Provide duration_multiplier (e.g. 1.2).")

    if not project_state.csv_bytes:
        raise HTTPException(status_code=400, detail="Upload a CSV first.")

    if _ai_available():
        try:
            df_raw = _load_csv_df_from_bytes(project_state.csv_bytes)
            df_mod = _apply_duration_multiplier(df_raw, duration_multiplier)
            updated_tasks = process_project_df(df_mod)  # type: ignore[misc]
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"What-if processing failed: {exc}") from exc
    else:
        updated_tasks = project_state.get_tasks()

    project_state.set_tasks(updated_tasks)
    await broadcast_tasks_update(reason="what-if")
    return JSONResponse(content={"tasks": updated_tasks})


# -----------------------------------------------------------------------------
# ASGI entrypoint for uvicorn
# -----------------------------------------------------------------------------

app_socketio = sio_app

# You can run this server with:
#   uvicorn main:app_socketio --reload


# -----------------------------------------------------------------------------
# Optional: serve built frontend (single-app deployment)
# -----------------------------------------------------------------------------

dist_dir = REPO_ROOT / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")


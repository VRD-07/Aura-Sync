# Aura-Sync EPC Backend (M2)

This service is the **server layer** of Aura-Sync EPC.  
It sits between the **AI brain (M1)** and the **visual dashboard (M3)**.

The server now calls **M1 (`ai/data_loader.py`)** on upload/what-if (when dependencies are installed),
and falls back to simple mock tasks only if the AI module can't be imported.

---

## Tech Stack

- **FastAPI** (HTTP API)
- **Socket.IO** (real-time updates over WebSocket)
- **Uvicorn** (ASGI server)

---

## Installation

From the `backend` directory:

```bash
pip install -r requirements.txt
```

---

## Running the server

From the `backend` directory:

```bash
uvicorn main:app_socketio --reload --host 0.0.0.0 --port 8000
```

The Socket.IO endpoint is served on the **same host/port** (default path `/socket.io/`).

---

## Available endpoints

- `GET /health`  
  Simple health-check.

- `POST /upload`  
  - Accepts a CSV file (`multipart/form-data`, field name: `file`).  
  - Runs the AI pipeline and returns a task list for the dashboard.
  - Stores the uploaded CSV + latest tasks in memory.

- `GET /results`  
  - Returns the **current task list** from memory as JSON.  
  - M3 can call this to render the Gantt chart.

- `POST /whatif`  
  - Receives a JSON body with `duration_multiplier` (e.g. `1.2`).  
  - Scales the schedule durations, re-runs the AI pipeline, stores the updated list, and
  - Broadcasts `tasks_update` to all connected Socket.IO clients.  
  - Returns the updated task list as JSON.

Example `POST /whatif` body:

```json
{
  "duration_multiplier": 1.2
}
```

---

## Socket.IO events

- **Server → Client**
  - `tasks_update`

    Payload:

    ```json
    {
      "reason": "what-if",
      "tasks": [ /* task objects */ ]
    }
    ```

Any time `/whatif` is called, all connected dashboards receive this event.

---

## Notes

- The backend can also serve the built frontend if you run `npm run build` in `frontend/`
  (it mounts `frontend/dist` at `/` when it exists).


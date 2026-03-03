## Aura-Sync EPC (Integrated App)

This repo now runs as **one working application**:

- **Frontend**: React (Vite) dashboard
- **Backend**: FastAPI + Socket.IO
- **AI**: `ai/data_loader.py` computes risk + schedule optimization

---

## Run in development (recommended)

### 1) Start the backend (API + Socket.IO)

From `backend/`:

```bash
pip install -r requirements.txt
uvicorn main:app_socketio --reload --host 0.0.0.0 --port 8000
```

### 2) Start the frontend (Vite dev server)

From `frontend/`:

```bash
npm install
npm run dev
```

Open the UI at the Vite URL (usually `http://localhost:5173`).

The frontend is configured to proxy these paths to the backend during dev:
`/health`, `/upload`, `/results`, `/whatif`, and `/socket.io`.

---

## Run as a single app (backend serves the built frontend)

### 1) Build the frontend

From `frontend/`:

```bash
npm install
npm run build
```

This creates `frontend/dist`.

### 2) Run the backend

From `backend/`:

```bash
pip install -r requirements.txt
uvicorn main:app_socketio --host 0.0.0.0 --port 8000
```

Open the app at `http://localhost:8000`.

---

## Using the app

- Go to **Import Project Data**
- Upload a CSV with these required columns:
  - `task_id, task_name, start_date, end_date, workers_assigned, machine_hours, depends_on`
- A sample file is included: `aura_sync_epc_tasks.csv`
- Use **Scenario Analysis** to run a simple what-if by scaling task durations.


import io
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from ortools.sat.python import cp_model
from sklearn.ensemble import RandomForestClassifier


DATE_FMT = "%Y-%m-%d"


def _parse_date(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        # Excel-style serials are out of scope; expect ISO-style strings
        value = str(value)
    try:
        return datetime.strptime(str(value), DATE_FMT)
    except Exception:
        # Fallback: let pandas try to parse, then normalize to date-only
        dt = pd.to_datetime(value, errors="coerce", dayfirst=True)
        if pd.isna(dt):
            raise ValueError(f"Unparseable date value: {value!r}")
        if isinstance(dt, pd.Timestamp):
            dt = dt.to_pydatetime()
        return datetime(dt.year, dt.month, dt.day)


def _safe_int(x: Any, default: int = 0) -> int:
    try:
        if pd.isna(x):
            return default
        return int(x)
    except Exception:
        return default


def _compute_basic_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Normalize dates
    df["start_dt"] = df["start_date"].apply(_parse_date)
    df["end_dt"] = df["end_date"].apply(_parse_date)

    # Ensure non-zero, positive durations in days
    durations = (df["end_dt"] - df["start_dt"]).dt.days.clip(lower=1)
    df["duration_days"] = durations

    # Workers and machines
    df["workers_assigned"] = df["workers_assigned"].apply(_safe_int)
    df["machine_hours"] = df["machine_hours"].apply(
        lambda x: float(x) if not pd.isna(x) else 0.0
    )

    df["worker_load"] = df["workers_assigned"] * df["duration_days"]

    # Parse dependencies: assume comma- or semicolon-separated task_ids
    def parse_deps(v: Any) -> List[str]:
        if pd.isna(v):
            return []
        s = str(v).strip()
        if not s or s.lower() in {"none", "nan"}:
            return []
        # support both "," and ";" separated
        parts = [p.strip() for p in s.replace(";", ",").split(",")]
        return [p for p in parts if p]

    df["dep_list"] = df["depends_on"].apply(parse_deps)
    df["dep_count"] = df["dep_list"].apply(len)

    # Compute buffer days as slack to earliest successor
    # Build mapping task_id -> start_dt for quick lookup
    id_to_start: Dict[str, datetime] = {
        str(tid): s for tid, s in zip(df["task_id"].astype(str), df["start_dt"])
    }
    id_to_end: Dict[str, datetime] = {
        str(tid): e for tid, e in zip(df["task_id"].astype(str), df["end_dt"])
    }

    # For each task, look at tasks that depend on it and compute gap
    successors: Dict[str, List[str]] = {str(tid): [] for tid in df["task_id"].astype(str)}
    for idx, row in df.iterrows():
        this_id = str(row["task_id"])
        for dep in row["dep_list"]:
            dep = str(dep)
            if dep in successors:
                successors[dep].append(this_id)

    buffer_days: List[int] = []
    for tid_str in df["task_id"].astype(str):
        succ_ids = successors.get(tid_str, [])
        if not succ_ids:
            # If no successors, treat buffer as a relatively large slack
            buffer_days.append(7)
            continue
        end_dt = id_to_end[tid_str]
        min_gap: Optional[int] = None
        for succ in succ_ids:
            succ_start = id_to_start.get(succ, end_dt)
            gap = (succ_start - end_dt).days
            if min_gap is None or gap < min_gap:
                min_gap = gap
        if min_gap is None:
            buffer_days.append(7)
        else:
            buffer_days.append(max(min_gap, 0))

    df["buffer_days"] = buffer_days

    # Print a small sample for quick verification
    print("Loaded project features (head):")
    print(
        df[
            [
                "task_id",
                "task_name",
                "duration_days",
                "workers_assigned",
                "machine_hours",
                "dep_count",
                "buffer_days",
            ]
        ].head()
    )

    return df


def _rule_based_label(row: pd.Series, q33: float, q66: float) -> str:
    load = row["worker_load"]
    buffer_days = row["buffer_days"]
    dep_count = row["dep_count"]

    if (load >= q66 and buffer_days <= 1) or (dep_count >= 3 and buffer_days <= 2):
        return "High"
    if load >= q33 and buffer_days <= 3:
        return "Medium"
    return "Low"


def _train_risk_model(df: pd.DataFrame) -> Tuple[RandomForestClassifier, np.ndarray, np.ndarray]:
    features = df[
        [
            "duration_days",
            "workers_assigned",
            "machine_hours",
            "worker_load",
            "buffer_days",
            "dep_count",
        ]
    ].fillna(0.0)

    # Derive pseudo-labels from simple rules
    q33, q66 = df["worker_load"].quantile([0.33, 0.66])
    labels = df.apply(lambda r: _rule_based_label(r, q33, q66), axis=1)

    label_to_int = {"Low": 0, "Medium": 1, "High": 2}
    int_to_label = {v: k for k, v in label_to_int.items()}

    y = labels.map(label_to_int).values

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced",
    )
    clf.fit(features.values, y)

    return clf, features.values, np.array([int_to_label[i] for i in sorted(int_to_label)])


def _monte_carlo_duration(
    base_duration: int, risk_score: float, runs: int = 500
) -> Tuple[float, float]:
    """
    Simulate uncertain duration around the planned duration.
    Returns (on_time_probability in [0, 100], p90_duration in days).
    """
    if base_duration <= 0:
        base_duration = 1

    # Higher risk_score -> higher variance and right tail
    sigma = 0.10 + 0.40 * float(risk_score)  # between ~0.1 and 0.5
    mu = -0.5 * sigma * sigma  # keep median close to 1.0

    samples = np.random.lognormal(mean=mu, sigma=sigma, size=runs)
    simulated = np.maximum(1, np.round(base_duration * samples)).astype(int)

    on_time_probability = 100.0 * float(np.mean(simulated <= base_duration))
    p90_duration = float(np.percentile(simulated, 90))

    return on_time_probability, p90_duration


def _optimize_schedule(df: pd.DataFrame, risk_scores: Dict[str, float]) -> Dict[str, Tuple[datetime, datetime]]:
    """
    Use OR-Tools CP-SAT to slightly reschedule high-risk tasks while keeping
    lower-risk tasks close to their original dates.
    Returns mapping task_id -> (optimized_start_dt, optimized_end_dt).
    """
    if df.empty:
        return {}

    model = cp_model.CpModel()

    # Establish a common time origin (day 0)
    project_start = df["start_dt"].min()
    horizons = (df["end_dt"] - project_start).dt.days + 7
    horizon = int(horizons.max())

    # Collect simple capacity estimates from original schedule
    max_workers_capacity = max(int(df["workers_assigned"].max()), 1)

    task_vars = {}
    intervals = []
    demands = []

    for idx, row in df.iterrows():
        tid = str(row["task_id"])
        dur = int(row["duration_days"])
        original_start = (row["start_dt"] - project_start).days

        start_var = model.NewIntVar(0, horizon, f"s_{tid}")
        end_var = model.NewIntVar(0, horizon, f"e_{tid}")
        dur_var = model.NewIntVar(dur, dur, f"d_{tid}")

        interval_var = model.NewIntervalVar(start_var, dur_var, end_var, f"int_{tid}")

        task_vars[tid] = (start_var, end_var, dur_var, original_start, dur)
        intervals.append(interval_var)
        demands.append(int(row["workers_assigned"]))

    # Precedence constraints from dependencies
    id_to_index = {str(tid): i for i, tid in enumerate(df["task_id"].astype(str))}
    for idx, row in df.iterrows():
        tid = str(row["task_id"])
        for dep in row["dep_list"]:
            dep = str(dep)
            if dep in task_vars:
                dep_end = task_vars[dep][1]
                this_start = task_vars[tid][0]
                model.Add(this_start >= dep_end)

    # Resource capacity (workers) with a simple cumulative constraint
    model.AddCumulative(intervals, demands, max_workers_capacity)

    # Keep low/medium risk tasks close to original schedule
    for tid, (start_var, end_var, _, original_start, dur) in task_vars.items():
        risk = risk_scores.get(tid, 0.0)
        # High-risk tasks are allowed to move more; others are softly fixed
        if risk < 0.6:
            # Hard-fix non-high-risk tasks to original start
            model.Add(start_var == original_start)
        else:
            # Do not start before original plan
            model.Add(start_var >= original_start)

    # Objective: minimize the completion time of all tasks
    makespan = model.NewIntVar(0, horizon, "makespan")
    for tid, (_, end_var, _, _, _) in task_vars.items():
        model.Add(makespan >= end_var)
    model.Minimize(makespan)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0
    solver.parameters.num_search_workers = 8

    status = solver.Solve(model)

    optimized: Dict[str, Tuple[datetime, datetime]] = {}
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        # Fall back to original dates if optimization fails
        for idx, row in df.iterrows():
            tid = str(row["task_id"])
            optimized[tid] = (row["start_dt"], row["end_dt"])
        return optimized

    for tid, (start_var, _, _, _, dur) in task_vars.items():
        start_day = solver.Value(start_var)
        start_dt = project_start + timedelta(days=start_day)
        end_dt = start_dt + timedelta(days=dur)
        optimized[tid] = (start_dt, end_dt)

    return optimized


def _build_recommendation(
    task_name: str,
    risk_label: str,
    risk_score: float,
    on_time_probability: float,
    original_start: datetime,
    original_end: datetime,
    optimized_start: datetime,
    optimized_end: datetime,
) -> str:
    delay_days = (optimized_start - original_start).days
    base = f"Task '{task_name}' is classified as {risk_label} risk (score {risk_score:.2f}, on-time probability {on_time_probability:.1f}%)."

    if risk_label == "High":
        if delay_days > 0:
            return (
                base
                + f" Consider starting {delay_days} day(s) earlier or reallocating resources; optimized schedule shifts it to start on {optimized_start.date()} and finish on {optimized_end.date()}."
            )
        return (
            base
            + f" Prioritize resource allocation and monitor closely; optimized schedule keeps it starting on {optimized_start.date()} and finishing on {optimized_end.date()}."
        )
    if risk_label == "Medium":
        return (
            base
            + f" Monitor dependencies and buffer; optimized schedule plans it from {optimized_start.date()} to {optimized_end.date()}."
        )
    return (
        base
        + f" Current plan appears robust; optimized schedule keeps it from {optimized_start.date()} to {optimized_end.date()}."
    )


def process_project(csv_path: str) -> List[Dict[str, Any]]:
    """
    Main entrypoint:
    - Load CSV from M4.
    - Compute engineered features.
    - Label risk with rule-based heuristics and refine with Random Forest.
    - Run Monte Carlo duration simulation.
    - Optimize schedule for high-risk tasks with CP-SAT.
    - Return list of task dicts with the exact contract fields.
    """
    df_raw = pd.read_csv(csv_path)
    return process_project_df(df_raw)


def process_project_bytes(csv_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Convenience wrapper for server integrations that receive file bytes.
    """
    df_raw = pd.read_csv(io.BytesIO(csv_bytes))
    return process_project_df(df_raw)


def process_project_df(df_raw: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Main entrypoint (DataFrame-based):
    - Validate expected columns
    - Compute engineered features
    - Label risk with heuristics + Random Forest
    - Run Monte Carlo duration simulation
    - Optimize schedule for high-risk tasks with CP-SAT
    - Return list of task dicts with the contract fields used by the dashboard
    """
    required_cols = [
        "task_id",
        "task_name",
        "start_date",
        "end_date",
        "workers_assigned",
        "machine_hours",
        "depends_on",
    ]
    missing = [c for c in required_cols if c not in df_raw.columns]
    if missing:
        raise ValueError(f"Missing required columns in CSV: {missing}")

    df = _compute_basic_features(df_raw)

    clf, feature_matrix, _ = _train_risk_model(df)

    # Predict risk class and probability of "High"
    proba = clf.predict_proba(feature_matrix)
    classes = clf.classes_  # numeric labels 0,1,2

    # Map numeric label to textual name
    int_to_label = {0: "Low", 1: "Medium", 2: "High"}

    # Locate the column corresponding to "High" (2)
    if 2 in classes:
        high_col_idx = list(classes).index(2)
    else:
        # In the unlikely event no "High" labels appear, treat highest class as "High"
        high_col_idx = int(np.argmax(classes))

    risk_scores: List[float] = proba[:, high_col_idx].tolist()
    pred_classes = clf.predict(feature_matrix)
    risk_labels = [int_to_label[int(c)] for c in pred_classes]

    # Build a simple mapping for the optimizer
    risk_score_map: Dict[str, float] = {}
    for tid, score in zip(df["task_id"].astype(str), risk_scores):
        risk_score_map[str(tid)] = float(score)

    optimized_dates = _optimize_schedule(df, risk_score_map)

    results: List[Dict[str, Any]] = []
    for idx, row in df.iterrows():
        tid = str(row["task_id"])
        task_name = row["task_name"]
        original_start = row["start_dt"]
        original_end = row["end_dt"]
        base_duration = int(row["duration_days"])

        risk_score = float(risk_score_map.get(tid, 0.0))
        risk_label = risk_labels[idx]

        on_time_prob, p90_duration = _monte_carlo_duration(base_duration, risk_score)

        opt_start, opt_end = optimized_dates.get(tid, (original_start, original_end))

        recommendation = _build_recommendation(
            task_name=task_name,
            risk_label=risk_label,
            risk_score=risk_score,
            on_time_probability=on_time_prob,
            original_start=original_start,
            original_end=original_end,
            optimized_start=opt_start,
            optimized_end=opt_end,
        )

        task_obj: Dict[str, Any] = {
            "task_id": row["task_id"],
            "task_name": task_name,
            "start_date": original_start.date().isoformat(),
            "end_date": original_end.date().isoformat(),
            "risk_label": risk_label,
            "risk_score": risk_score,
            "on_time_probability": float(on_time_prob),
            "p90_duration": float(p90_duration),
            "optimized_start": opt_start.date().isoformat(),
            "optimized_end": opt_end.date().isoformat(),
            "recommendation": recommendation,
        }
        results.append(task_obj)

    return results


import React, { useEffect, useMemo, useState } from "react";
import "./QueueManager.css";
import { Link } from "react-router-dom";

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function formatCountdownParts(targetIso) {
  if (!targetIso) {
    return {
      label: "No stage target",
      tone: "none",
      overdue: false,
    };
  }

  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) {
    return {
      label: "No stage target",
      tone: "none",
      overdue: false,
    };
  }

  const diffMs = targetMs - Date.now();
  const overdue = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let timeLabel = "";
  if (hours > 0) {
    timeLabel = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    timeLabel = `${minutes}m ${seconds}s`;
  } else {
    timeLabel = `${seconds}s`;
  }

  let tone = "normal";
  if (overdue) {
    tone = "overdue";
  } else if (diffMs <= 5 * 60 * 1000) {
    tone = "urgent";
  } else if (diffMs <= 15 * 60 * 1000) {
    tone = "soon";
  }

  return {
    label: overdue ? `Late ${timeLabel}` : `Stage in ${timeLabel}`,
    tone,
    overdue,
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatClock24(isoString) {
  if (!isoString) return "--:--";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatSlotLabelFromFlightName(name) {
  if (!name) return "Flight";
  return name;
}

function formatTimeOnly(isoValue) {
  if (!isoValue) return "";
  const dt = new Date(isoValue);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function FlightCountdown({ plannedDepartureTime }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((v) => v + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const countdown = formatCountdownParts(plannedDepartureTime);

  return (
    <span className={`qm-flight-timer qm-flight-timer--${countdown.tone}`}>
      {countdown.label}
    </span>
  );
}

function FlightRulesBar({ preferences }) {
  if (!preferences) return null;

  return (
    <div className="qm-rules-bar">
      <div className="qm-rules-pill">
        Pick lead: <strong>{preferences.picking_lead_time_min ?? "--"}m</strong>
      </div>
      <div className="qm-rules-pill">
        Flight interval:{" "}
        <strong>{preferences.flight_interval_min ?? "--"}m</strong>
      </div>
      <div className="qm-rules-pill">
        AdHoc lead: <strong>{preferences.adhoc_lead_time_min ?? "--"}m</strong>
      </div>
      <div className="qm-rules-pill">
        Train length:{" "}
        <strong>{preferences.normal_carts_per_train ?? "--"}</strong>
      </div>
      <div className="qm-rules-pill">
        Station time:{" "}
        <strong>{preferences.time_at_station_sec ?? "--"}s</strong>
      </div>
    </div>
  );
}

function formatDepartureCountdown(targetIso) {
  if (!targetIso) {
    return { label: "No departure set", tone: "none" };
  }

  const targetMs = new Date(targetIso).getTime();
  if (Number.isNaN(targetMs)) {
    return { label: "No departure set", tone: "none" };
  }

  const diffMs = targetMs - Date.now();
  const overdue = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let timeLabel = "";
  if (hours > 0) {
    timeLabel = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    timeLabel = `${minutes}m ${seconds}s`;
  } else {
    timeLabel = `${seconds}s`;
  }

  let tone = "normal";
  if (overdue) {
    tone = "overdue";
  } else if (diffMs <= 5 * 60 * 1000) {
    tone = "urgent";
  } else if (diffMs <= 15 * 60 * 1000) {
    tone = "soon";
  }

  return {
    label: overdue ? `Late ${timeLabel}` : `Departs in ${timeLabel}`,
    tone,
  };
}

function AssignmentCountdown({ expectedStageTime }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((v) => v + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const countdown = formatCountdownParts(expectedStageTime);

  return (
    <span className={`qm-chip-timer qm-chip-timer--${countdown.tone}`}>
      {countdown.label}
    </span>
  );
}

function AssignmentChip({ assignment, onDragStart }) {
  const urgency =
    assignment.meta_json?.urgency ??
    assignment.meta_json?.manager_guidance?.urgency ??
    null;

  const note = assignment.note ?? assignment.meta_json?.note ?? "";
  const workstation =
    assignment.workstation_future_csmr ??
    assignment.meta_json?.workstation_future_csmr ??
    "";

  const displayPartName =
    assignment.part_name ||
    assignment.meta_json?.part_name ||
    assignment.meta_json?.description ||
    "Part";

  return (
    <div
      className="qm-assignment-chip"
      draggable
      onDragStart={(e) => onDragStart(e, assignment)}
      title={`${assignment.part_number}${displayPartName ? ` • ${displayPartName}` : ""}`}
    >
      <div className="qm-assignment-top">
        <div className="qm-chip-title-wrap">
          <div className="qm-part-name qm-part-name--primary">
            {displayPartName}
          </div>
          <div className="qm-part-number qm-part-number--secondary">
            {assignment.part_number}
          </div>
        </div>

        {urgency !== null && (
          <span
            className={`qm-urgency qm-urgency--${Number(urgency) >= 4 ? "high" : Number(urgency) >= 2 ? "med" : "low"}`}
          >
            U{urgency}
          </span>
        )}
      </div>

      <div className="qm-chip-detail-row">
        <span className="qm-chip-label">POU</span>
        <span className="qm-chip-value">{workstation || "Not assigned"}</span>
      </div>

      <div className="qm-chip-footer">
        <div className="qm-chip-footer-left">
          <AssignmentCountdown
            expectedStageTime={assignment.expected_stage_time}
          />

          {assignment.qty ? (
            <span className="qm-chip-meta">Qty: {assignment.qty}</span>
          ) : null}
        </div>

        <div className="qm-chip-footer-right">
          {note ? (
            <button
              type="button"
              className="qm-note-btn"
              title={note}
              aria-label="Assignment note"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              🗒
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptySlot({ flightId, position, onDrop, onDragOver }) {
  return (
    <div
      className="qm-flight-slot qm-flight-slot--empty"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, flightId, position)}
      data-flight-id={flightId}
      data-position={position}
    >
      <div className="qm-slot-label">Spot {position}</div>
      <div className="qm-slot-placeholder">Drop assignment here</div>
    </div>
  );
}

function FilledSlot({
  assignment,
  flightId,
  position,
  onDrop,
  onDragOver,
  onDragStart,
}) {
  return (
    <div
      className="qm-flight-slot qm-flight-slot--filled"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, flightId, position)}
      data-flight-id={flightId}
      data-position={position}
    >
      <div className="qm-slot-label">Spot {position}</div>
      <AssignmentChip assignment={assignment} onDragStart={onDragStart} />
    </div>
  );
}

function FlightCard({
  flight,
  capacity,
  onDrop,
  onDragOver,
  onDragStart,
  onDelayFlight,
  onCancelFlight,
}) {
  const assignedCount = (flight.assignments || []).length;
  const remaining = Math.max(0, (capacity || 0) - assignedCount);

  return (
    <section className="qm-flight-card">
      <div className="qm-flight-card-header">
        <div className="qm-flight-card-title-wrap">
          <div className="qm-flight-card-title">
            {formatSlotLabelFromFlightName(flight.name)}
          </div>
          <div className="qm-flight-card-subtitle">
            Planned departure {formatClock24(flight.planned_departure_time)}
            {flight.status_label ? ` • ${flight.status_label}` : ""}
          </div>
        </div>

        <div className="qm-flight-card-header-right">
          <FlightCountdown
            plannedDepartureTime={flight.planned_departure_time}
          />
        </div>
      </div>

      <div className="qm-flight-meta-row">
        <span className="qm-flight-meta-pill">
          Loaded: {assignedCount}/{capacity}
        </span>
        <span className="qm-flight-meta-pill">Open slots: {remaining}</span>
      </div>

      <div className="qm-flight-slots">
        {Array.from({ length: capacity || 0 }).map((_, idx) => {
          const position = idx + 1;
          const assignment = (flight.assignments || []).find(
            (a) => Number(a.position) === position,
          );

          return (
            <div
              key={position}
              className={`qm-flight-slot ${
                assignment ? "qm-flight-slot--filled" : "qm-flight-slot--empty"
              }`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, flight.id, position)}
            >
              <div className="qm-slot-label">Pos {position}</div>

              {assignment ? (
                <AssignmentChip
                  assignment={assignment}
                  onDragStart={onDragStart}
                />
              ) : (
                <div className="qm-slot-placeholder">Drop assignment here</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="qm-flight-card-actions">
        <button
          type="button"
          className="qm-btn qm-btn--ghost"
          onClick={() => onDelayFlight(flight)}
        >
          Delay +5m
        </button>

        <button
          type="button"
          className="qm-btn qm-btn--danger"
          onClick={() => onCancelFlight(flight)}
        >
          Cancel Flight
        </button>
      </div>
    </section>
  );
}

export default function QueueManager() {
  const [data, setData] = useState(null);
  const [draggingAssignment, setDraggingAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const queueId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("queue_id") || "";
  }, []);

  const backendBase = import.meta.env.VITE_BACKEND_URL;

  async function postFlightAction(path, payload = {}) {
    const response = await fetch(`${backendBase}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || "Flight action failed.");
    }

    return result;
  }
  async function loadBoard() {
    try {
      setLoading(true);
      setError("");

      const url = queueId
        ? `${backendBase}/mhsa/api/queue-manager/?queue_id=${encodeURIComponent(queueId)}`
        : `${backendBase}/mhsa/api/queue-manager/`;

      console.log("[QueueManager] loading board", { queueId, url });

      const res = await fetch(url, {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      console.log("[QueueManager] board response status", res.status);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load queue manager (${res.status}) ${text}`);
      }

      const json = await res.json();

      console.log("[QueueManager] board json", json);

      setData(json);
    } catch (err) {
      console.error("[QueueManager] loadBoard failed", err);
      setError(err.message || "Unable to load queue manager.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, [queueId]);

  function onDragStart(e, assignment) {
    setDraggingAssignment(assignment);
    e.dataTransfer.setData("text/plain", assignment.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function moveAssignment(payload) {
    try {
      setSaving(true);
      setError("");

      const res = await fetch(
        `${backendBase}/mhsa/api/queue-manager/move-assignment/`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken(),
          },
          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Move failed (${res.status})`);
      }

      setData(json.board);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to move assignment.");
    } finally {
      setSaving(false);
      setDraggingAssignment(null);
    }
  }

  const preferences = data?.preferences?.group_7 || null;

  async function onAddFlight() {
    try {
      setBusy(true);
      const result = await postFlightAction("/mhsa/queue-manager/add-flight/", {
        queue_id: data?.queue?.id,
      });
      setData(result.board);
    } catch (err) {
      console.error(err);
      window.alert(err.message || "Unable to add flight.");
    } finally {
      setBusy(false);
    }
  }

  async function onAddAdHocFlight() {
    try {
      setBusy(true);
      const result = await postFlightAction(
        "/mhsa/queue-manager/add-adhoc-flight/",
        {
          queue_id: data?.queue?.id,
        },
      );
      setData(result.board);
    } catch (err) {
      console.error(err);
      window.alert(err.message || "Unable to add ad hoc flight.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelayFlight(flight) {
    try {
      setBusy(true);
      const result = await postFlightAction(
        "/mhsa/queue-manager/delay-flight/",
        {
          flight_id: flight.id,
        },
      );
      setData(result.board);
    } catch (err) {
      console.error(err);
      window.alert(err.message || "Unable to delay flight.");
    } finally {
      setBusy(false);
    }
  }

  async function onCancelFlight(flight) {
    const ok = window.confirm(`Cancel ${flight.name}?`);
    if (!ok) return;

    try {
      setBusy(true);
      const result = await postFlightAction(
        "/mhsa/queue-manager/cancel-flight/",
        {
          flight_id: flight.id,
        },
      );
      setData(result.board);
    } catch (err) {
      console.error(err);
      window.alert(err.message || "Unable to cancel flight.");
    } finally {
      setBusy(false);
    }
  }

  async function onDropToFlight(e, flightId, position) {
    e.preventDefault();
    const assignmentId = e.dataTransfer.getData("text/plain");
    if (!assignmentId) return;

    await moveAssignment({
      assignment_id: assignmentId,
      flight_id: flightId,
      position,
    });
  }

  async function onDropToWaiting(e) {
    e.preventDefault();
    const assignmentId = e.dataTransfer.getData("text/plain");
    if (!assignmentId) return;

    await moveAssignment({
      assignment_id: assignmentId,
      flight_id: null,
      position: null,
    });
  }

  if (loading) {
    return (
      <div className="qm-page">
        <div className="qm-loading">Loading Queue Manager…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="qm-page">
        <div className="qm-error">No data returned.</div>
      </div>
    );
  }

  return (
    <div className="qm-page">
      <header className="qm-topbar">
        <div>
          <h1 className="qm-title">Queue Manager</h1>
          <div className="qm-subtitle">
            {data.queue?.name || "Queue"} • Owner:{" "}
            {data.queue?.owner_label || "Unassigned"}
          </div>

          <FlightRulesBar preferences={data?.preferences} />
        </div>

        <div className="qm-topbar-right">
          <div className="qm-stats">
            <div className="qm-stat">
              <span className="qm-stat-label">Waiting</span>
              <span className="qm-stat-value">
                {data.summary?.waiting_count ?? 0}
              </span>
            </div>
            <div className="qm-stat">
              <span className="qm-stat-label">Staged</span>
              <span className="qm-stat-value">
                {data.summary?.staged_count ?? 0}
              </span>
            </div>
            <div className="qm-stat">
              <span className="qm-stat-label">Capacity</span>
              <span className="qm-stat-value">{data.capacity}</span>
            </div>
            <div>
              <Link to="/clubcar">← MHSA Home</Link>
            </div>
          </div>

          <div className="qm-board-actions">
            <button
              type="button"
              className="qm-btn qm-btn--secondary"
              onClick={onAddFlight}
              disabled={busy}
            >
              Add Flight
            </button>

            <button
              type="button"
              className="qm-btn qm-btn--primary"
              onClick={onAddAdHocFlight}
              disabled={busy}
            >
              Add AdHoc Flight
            </button>
          </div>
        </div>
      </header>

      {error && <div className="qm-error-banner">{error}</div>}
      {saving && <div className="qm-saving-banner">Saving move…</div>}

      <main className="qm-board">
        <section
          className="qm-waiting-card"
          onDragOver={onDragOver}
          onDrop={onDropToWaiting}
        >
          <div className="qm-lane-header">
            <div>
              <div className="qm-lane-title">Assignments Waiting</div>
              <div className="qm-lane-subtitle">
                Drag into the next departing flight
              </div>
            </div>
          </div>

          <div className="qm-waiting-list">
            {(data.waiting_assignments || []).map((assignment) => (
              <AssignmentChip
                key={assignment.id}
                assignment={assignment}
                onDragStart={onDragStart}
              />
            ))}
          </div>
        </section>

        <div className="qm-flights-wrap">
          {(data.flights || []).map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              capacity={data.capacity}
              onDrop={onDropToFlight}
              onDragOver={onDragOver}
              onDragStart={onDragStart}
              onDelayFlight={onDelayFlight}
              onCancelFlight={onCancelFlight}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

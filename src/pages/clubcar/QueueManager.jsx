import React, { useEffect, useMemo, useState } from "react";
import "./QueueManager.css";

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function AssignmentChip({ assignment, onDragStart }) {
  const urgency =
    assignment.meta_json?.urgency ??
    assignment.meta_json?.manager_guidance?.urgency ??
    null;

  return (
    <div
      className="qm-assignment-chip"
      draggable
      onDragStart={(e) => onDragStart(e, assignment)}
      title={`${assignment.part_number}${assignment.part_name ? ` • ${assignment.part_name}` : ""}`}
    >
      <div className="qm-assignment-top">
        <span className="qm-part-number">{assignment.part_number}</span>
        {urgency !== null && (
          <span
            className={`qm-urgency qm-urgency--${Number(urgency) >= 4 ? "high" : Number(urgency) >= 2 ? "med" : "low"}`}
          >
            U{urgency}
          </span>
        )}
      </div>

      <div className="qm-part-name">
        {assignment.part_name || assignment.meta_json?.part_name || "Part"}
      </div>

      {assignment.qty && (
        <div className="qm-chip-meta">Qty: {assignment.qty}</div>
      )}
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

function FlightCard({ flight, capacity, onDrop, onDragOver, onDragStart }) {
  const slotMap = {};
  (flight.assignments || []).forEach((a) => {
    if (a.position) slotMap[a.position] = a;
  });

  const slots = [];
  for (let i = 1; i <= capacity; i += 1) {
    const assignment = slotMap[i];
    slots.push(
      assignment ? (
        <FilledSlot
          key={`${flight.id}-${i}`}
          assignment={assignment}
          flightId={flight.id}
          position={i}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragStart={onDragStart}
        />
      ) : (
        <EmptySlot
          key={`${flight.id}-${i}`}
          flightId={flight.id}
          position={i}
          onDrop={onDrop}
          onDragOver={onDragOver}
        />
      ),
    );
  }

  return (
    <section className="qm-flight-card">
      <div className="qm-flight-header">
        <div>
          <div className="qm-flight-title">{flight.name}</div>
          <div className="qm-flight-subtitle">
            {flight.status_label || flight.status || "planned"}
          </div>
        </div>
        <div className="qm-flight-capacity">{capacity} spots</div>
      </div>

      <div className="qm-flight-slots">{slots}</div>
    </section>
  );
}

export default function QueueManager() {
  const [data, setData] = useState(null);
  const [draggingAssignment, setDraggingAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const queueId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("queue_id") || "";
  }, []);

  const backendBase = import.meta.env.VITE_BACKEND_URL;

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
        </div>

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
            />
          ))}
        </div>
      </main>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import "./QueueManager.css";
import { Link } from "react-router-dom";

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

//const backendBase = import.meta.env.VITE_BACKEND_URL;

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatManifestQty(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function buildManifestPreviewHtml(manifest) {
  const rows = Array.isArray(manifest?.rows) ? manifest.rows : [];
  const pouGroups = Array.isArray(manifest?.pou_groups)
    ? manifest.pou_groups
    : [];
  const flight = manifest?.flight || {};
  const queue = manifest?.queue || {};
  const summary = manifest?.summary || {};

  const generatedAt = new Date().toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const groupsHtml = (
    pouGroups.length
      ? pouGroups
      : [
          {
            pou: "ALL",
            rows,
          },
        ]
  )
    .map((group) => {
      const groupRows = Array.isArray(group?.rows) ? group.rows : [];

      const bodyHtml = groupRows
        .map((row) => {
          return `
        <tr>
          <td class="col-pou">${escapeHtml(row.pou || "")}</td>
          <td class="col-desc">${escapeHtml(row.description || "")}</td>
          <td class="col-part">${escapeHtml(row.part_number || "")}</td>
          <td class="col-qty">${escapeHtml(formatManifestQty(row.qty))}</td>
        </tr>
      `;
        })
        .join("");

      return `
      <section class="ep-group">
        <div class="ep-group-title">${escapeHtml(group.pou || "UNASSIGNED")}</div>
        <table class="ep-table">
          <thead>
            <tr>
              <th class="col-pou">POU</th>
              <th class="col-desc">Description</th>
              <th class="col-part">Part Number</th>
              <th class="col-qty">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${
              bodyHtml ||
              `
              <tr>
                <td colspan="4" class="ep-empty">No rows</td>
              </tr>
            `
            }
          </tbody>
        </table>
      </section>
    `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(flight.name || "Flight Manifest")}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --ep-black: #111;
      --ep-red: #b00020;
      --ep-white: #ffffff;
      --ep-line: #1f1f1f;
      --ep-soft: #f4f4f4;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: #d7d7d7;
      font-family: Arial, Helvetica, sans-serif;
      color: var(--ep-black);
      padding: 24px;
    }

    .device {
      width: 480px;
      min-height: 800px;
      margin: 0 auto;
      background: var(--ep-white);
      border: 2px solid var(--ep-black);
      box-shadow: 0 10px 30px rgba(0,0,0,0.18);
    }

    .ep-header {
      padding: 18px 18px 12px 18px;
      border-bottom: 3px solid var(--ep-black);
    }

    .ep-kicker {
      font-size: 12px;
      font-weight: 700;
      color: var(--ep-red);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .ep-title {
      font-size: 28px;
      line-height: 1.05;
      font-weight: 800;
      margin: 0 0 8px 0;
    }

    .ep-subtitle {
      font-size: 14px;
      line-height: 1.3;
      margin: 0;
    }

    .ep-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 12px 18px;
      border-bottom: 2px solid var(--ep-black);
      background: var(--ep-soft);
    }

    .ep-summary-card {
      border: 1px solid var(--ep-black);
      padding: 8px;
      background: var(--ep-white);
    }

    .ep-summary-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ep-red);
      margin-bottom: 4px;
      font-weight: 700;
    }

    .ep-summary-value {
      font-size: 18px;
      font-weight: 800;
    }

    .ep-content {
      padding: 12px 14px 18px 14px;
    }

    .ep-group {
      margin-bottom: 14px;
      border: 1px solid var(--ep-black);
    }

    .ep-group-title {
      padding: 8px 10px;
      background: var(--ep-red);
      color: var(--ep-white);
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .ep-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .ep-table th,
    .ep-table td {
      border-top: 1px solid var(--ep-line);
      padding: 6px 8px;
      vertical-align: top;
    }

    .ep-table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #ededed;
    }

    .ep-table td {
      font-size: 14px;
      line-height: 1.2;
    }

    .col-pou  { width: 19%; font-weight: 700; }
    .col-desc { width: 44%; }
    .col-part { width: 22%; font-size: 11px !important; }
    .col-qty  { width: 15%; text-align: right; font-weight: 800; }

    .ep-empty {
      text-align: center;
      color: #555;
      padding: 18px 8px !important;
    }

    .ep-footer {
      padding: 10px 18px 16px 18px;
      border-top: 2px solid var(--ep-black);
      font-size: 11px;
      color: #444;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      .device {
        box-shadow: none;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="device">
    <header class="ep-header">
      <div class="ep-kicker">MHSA Flight Manifest</div>
      <h1 class="ep-title">${escapeHtml(flight.name || "Flight")}</h1>
      <p class="ep-subtitle">
        Queue: <strong>${escapeHtml(queue.name || "")}</strong><br/>
        Departure: <strong>${escapeHtml(formatTimeOnly(flight.planned_departure_time) || "--:--")}</strong>
        ${flight.status_label ? `&nbsp;&nbsp;•&nbsp;&nbsp;Status: <strong>${escapeHtml(flight.status_label)}</strong>` : ""}
      </p>
    </header>

    <section class="ep-summary">
      <div class="ep-summary-card">
        <div class="ep-summary-label">Assignments</div>
        <div class="ep-summary-value">${escapeHtml(summary.staged_assignment_count ?? 0)}</div>
      </div>
      <div class="ep-summary-card">
        <div class="ep-summary-label">Carts</div>
        <div class="ep-summary-value">${escapeHtml(summary.cart_count ?? 0)}</div>
      </div>
      <div class="ep-summary-card">
        <div class="ep-summary-label">Rows</div>
        <div class="ep-summary-value">${escapeHtml(summary.row_count ?? 0)}</div>
      </div>
    </section>

    <main class="ep-content">
      ${groupsHtml}
    </main>

    <footer class="ep-footer">
      Generated ${escapeHtml(generatedAt)}
    </footer>
  </div>
</body>
</html>`;
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
      className="qm-assignment-chip qm-assignment-chip--compact"
      draggable
      onDragStart={(e) => onDragStart(e, assignment)}
      title={`${assignment.part_number}${displayPartName ? ` • ${displayPartName}` : ""}`}
    >
      <div className="qm-chip-main">
        <div className="qm-chip-row-top">
          <div className="qm-chip-title-wrap">
            <div className="qm-chip-title-line">
              <div className="qm-part-name qm-part-name--primary">
                {displayPartName}
              </div>

              <div className="qm-part-number qm-part-number--secondary">
                {assignment.part_number}
              </div>
            </div>

            <div className="qm-chip-detail-row">
              <span className="qm-chip-label">POU</span>
              <span className="qm-chip-value">
                {workstation || "Not assigned"}
              </span>
            </div>
          </div>

          {urgency !== null && (
            <span
              className={`qm-urgency qm-urgency--${
                Number(urgency) >= 4
                  ? "high"
                  : Number(urgency) >= 2
                    ? "med"
                    : "low"
              }`}
            >
              U{urgency}
            </span>
          )}
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

function SlotCartButton({ assignment, cart, isExpanded, onToggle }) {
  const resolvedCart =
    cart || assignment?.cart || assignment?.meta_json?.cart || null;

  const iconUri =
    resolvedCart?.icon_uri ||
    assignment?.cart_icon_uri ||
    assignment?.meta_json?.cart_icon_uri ||
    "";

  const cartCategory = Number(
    resolvedCart?.cart_category ??
      assignment?.cart_category ??
      assignment?.meta_json?.cart_category ??
      0,
  );

  const isSmallPartsCart = cartCategory === 7;
  const cartId = resolvedCart?.id || assignment?.cart_id || null;
  const podsUsed = resolvedCart?.pods_used ?? (isSmallPartsCart ? 1 : 0);
  const podCapacity = resolvedCart?.pod_capacity ?? (isSmallPartsCart ? 12 : 1);

  function handleClick(e) {
    e.stopPropagation();
    if (!isSmallPartsCart) return;
    if (typeof onToggle === "function") {
      onToggle(cartId);
    }
  }

  return (
    <button
      type="button"
      className={`qm-slot-cart-btn ${
        isSmallPartsCart ? "qm-slot-cart-btn--interactive" : ""
      } ${isExpanded ? "qm-slot-cart-btn--open" : ""}`}
      aria-label={isSmallPartsCart ? "Small parts cart" : "Cart"}
      title={isSmallPartsCart ? "Small parts cart" : "Cart"}
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {iconUri ? (
        <img
          src={iconUri}
          alt=""
          className="qm-slot-cart-icon"
          draggable="false"
        />
      ) : (
        <span className="qm-slot-cart-fallback">🛒</span>
      )}

      {isSmallPartsCart ? (
        <span className="qm-slot-cart-badge">
          {podsUsed}/{podCapacity}
        </span>
      ) : null}
    </button>
  );
}

function CartPodsPanel({ cart }) {
  const pods = cart?.pods || [];

  return (
    <div className="qm-cart-pods-panel">
      <div className="qm-cart-pods-header">
        <div className="qm-cart-pods-title">Small Parts Cart</div>
        <div className="qm-cart-pods-subtitle">
          {cart?.pods_used ?? 0}/{cart?.pod_capacity ?? 12} pods used
        </div>
      </div>

      <div className="qm-cart-pods-grid">
        {pods.map((pod) => (
          <div
            key={pod.pod_number}
            className={`qm-cart-pod ${
              pod.is_filled ? "qm-cart-pod--filled" : "qm-cart-pod--empty"
            }`}
          >
            <div className="qm-cart-pod-label">Pod {pod.pod_number}</div>

            {pod.is_filled ? (
              <>
                <div className="qm-cart-pod-name">
                  {pod.part_name || pod.part_number || "Assigned part"}
                </div>
                <div className="qm-cart-pod-meta">{pod.part_number || "—"}</div>
                <div className="qm-cart-pod-meta">
                  POU {pod.workstation_future_csmr || "—"}
                </div>
              </>
            ) : (
              <div className="qm-cart-pod-empty">Empty</div>
            )}
          </div>
        ))}
      </div>
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
  onOpenManifest,
  expandedCartIds,
  toggleCartExpanded,
  busy,
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

          const slotCart = assignment?.cart || null;
          const slotCartId = slotCart?.id || assignment?.cart_id || null;

          const isSmallPartsCart =
            Number(
              slotCart?.cart_category ?? assignment?.cart_category ?? 0,
            ) === 7;

          const isExpanded = !!expandedCartIds[slotCartId];

          return (
            <div
              key={position}
              className={`qm-flight-slot ${
                assignment ? "qm-flight-slot--filled" : "qm-flight-slot--empty"
              } ${isExpanded ? "qm-flight-slot--pods-open" : ""}`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, flight.id, position)}
            >
              <div className="qm-slot-label">Pos {position}</div>

              <div className="qm-slot-row">
                <SlotCartButton
                  assignment={assignment}
                  cart={slotCart}
                  isExpanded={isExpanded}
                  onToggle={toggleCartExpanded}
                />

                {assignment ? (
                  <AssignmentChip
                    assignment={assignment}
                    onDragStart={onDragStart}
                  />
                ) : (
                  <div className="qm-slot-placeholder">
                    Drop assignment here
                  </div>
                )}
              </div>

              {assignment && isSmallPartsCart && isExpanded ? (
                <CartPodsPanel cart={slotCart} />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="qm-flight-card-actions">
        <button
          type="button"
          className="qm-btn qm-btn--secondary qm-btn--icon"
          onClick={() => onOpenManifest(flight)}
          disabled={busy}
          title="Open e-paper manifest preview"
          aria-label="Open e-paper manifest preview"
        >
          📄 Manifest
        </button>

        <button
          type="button"
          className="qm-btn qm-btn--ghost"
          onClick={() => onDelayFlight(flight)}
          disabled={busy}
        >
          Delay +5m
        </button>

        <button
          type="button"
          className="qm-btn qm-btn--danger"
          onClick={() => onCancelFlight(flight)}
          disabled={busy}
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
    console.log("[CSRF debug]", {
      cookieString: document.cookie,
      csrfFromCookieHelper: getCsrfToken(),
      targetUrl: `${backendBase}/mhsa/api/queue-manager/move-assignment/`,
      origin: window.location.origin,
    });
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

  const [expandedCartIds, setExpandedCartIds] = useState({});

  function toggleCartExpanded(cartId) {
    if (!cartId) return;

    setExpandedCartIds((prev) => ({
      ...prev,
      [cartId]: !prev[cartId],
    }));
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

  const preferences = data?.preferences || null;
  //const preferences = data?.preferences?.group_7 || null;

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

  function onOpenManifest(flight) {
    if (!flight?.id) {
      window.alert("Flight id is missing.");
      return;
    }

    const previewUrl = `/clubcar/flight-manifest-preview?flight_id=${encodeURIComponent(flight.id)}`;

    window.open(previewUrl, "_blank", "noopener,noreferrer");
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
              onOpenManifest={onOpenManifest}
              expandedCartIds={expandedCartIds}
              toggleCartExpanded={toggleCartExpanded}
              busy={busy}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

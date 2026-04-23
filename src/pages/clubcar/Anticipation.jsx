import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "./Anticipation.css";
import { Popover } from "bootstrap";

const backendBase = import.meta.env.VITE_BACKEND_URL; // import.meta.env.VITE_BACKEND_URL

const demoPlan = {
  id: "plan-1",
  name: "Planner Reviewed – Today.csv",
  status: "active",
  forecast_length_minutes: 120,
  assignment_release_horizon_minutes: 40,
  concurrent_assignments_limit: 2,
  lineup_source_label: "Today.csv",
  created_by_label: "Planner",
  generated_at_label: "Today · 09:40",
};

const demoReleaseItems = [
  {
    id: "fri-1",
    queue_label: "KansasCity-Bulk",
    release_window_start: "2026-04-12T09:40:00",
    release_window_end: "2026-04-12T09:50:00",
    recommended_release_at: "2026-04-12T09:42:00",
    projected_need_at: "2026-04-12T09:52:00",
    part_number: "104023402",
    pou_code: "05SM1",
    description_snapshot: "SEAT BOTTOM, ASM, PREC, WHITE",
    status: "planned",
    estimated_pou_qty_at_need: 2,
    warning_qty_effective: 8,
    conflict_level: "high",
  },
  {
    id: "fri-2",
    queue_label: "KansasCity-Bulk",
    release_window_start: "2026-04-12T09:40:00",
    release_window_end: "2026-04-12T09:50:00",
    recommended_release_at: "2026-04-12T09:44:00",
    projected_need_at: "2026-04-12T09:56:00",
    part_number: "104023404",
    pou_code: "05SM1",
    description_snapshot: "SEAT BOTTOM, ASM, PREC, GRAY",
    status: "planned",
    estimated_pou_qty_at_need: 5,
    warning_qty_effective: 8,
    conflict_level: "high",
  },
  {
    id: "fri-3",
    queue_label: "KansasCity-Bulk",
    release_window_start: "2026-04-12T10:00:00",
    release_window_end: "2026-04-12T10:10:00",
    recommended_release_at: "2026-04-12T10:02:00",
    projected_need_at: "2026-04-12T10:13:00",
    part_number: "103635212",
    pou_code: "05M05",
    description_snapshot: "UNDERBODY, FRONT, FRONT HALF",
    status: "planned",
    estimated_pou_qty_at_need: 6,
    warning_qty_effective: 8,
    conflict_level: "normal",
  },
  {
    id: "fri-4",
    queue_label: "Martinsville-Bulk",
    release_window_start: "2026-04-12T10:10:00",
    release_window_end: "2026-04-12T10:20:00",
    recommended_release_at: "2026-04-12T10:12:00",
    projected_need_at: "2026-04-12T10:21:00",
    part_number: "47786539001",
    pou_code: "05M09",
    description_snapshot: "BATTERY, LI, 4 KW, PROD",
    status: "planned",
    estimated_pou_qty_at_need: 4,
    warning_qty_effective: 6,
    conflict_level: "normal",
  },
];

function clsx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function getCsrfToken() {
  const token = getCookie("csrftoken");
  return token || "";
}

function fmtQty(value) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function fmtTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtWindow(start, end) {
  return `${fmtTime(start)}–${fmtTime(end)}`;
}

function getRowTone(row) {
  const pou = Number(row.estimated_pou_qty ?? 0);
  const warning = Number(row.warning_qty_effective ?? 0);
  if (pou <= 0) return "critical";
  if (warning > 0 && pou <= warning) return "warning";
  return "normal";
}

function normalizePartsScope(value, options = []) {
  if (!value) return "my_favorites";

  const exact = options.find(
    (opt) =>
      String(opt.label || "")
        .toLowerCase()
        .trim() === String(value).toLowerCase().trim(),
  );
  if (exact?.code) return exact.code;

  const v = String(value).toLowerCase().trim();
  if (v.includes("favorite")) return "my_favorites";
  if (v.includes("high")) return "high_risk";
  return "all_tracked";
}

function normalizeSort(value) {
  if (!value) return "sort_rank";
  const v = String(value).trim();
  if (v === "StartQty") return "StartQty";
  if (v === "POUQty") return "POUQty";
  if (v === "LeadTime") return "LeadTime";
  if (v === "Queue") return "Queue";
  return "sort_rank";
}

function getPlanGroups(items, concurrencyLimit) {
  const map = new Map();

  for (const item of items) {
    const queue = item.queue_label || "Unassigned Queue";
    const windowKey = `${queue}__${item.release_window_start || "na"}`;
    if (!map.has(queue)) map.set(queue, new Map());
    const queueMap = map.get(queue);
    if (!queueMap.has(windowKey)) {
      queueMap.set(windowKey, {
        queue,
        windowKey,
        release_window_start: item.release_window_start,
        release_window_end: item.release_window_end,
        items: [],
      });
    }
    queueMap.get(windowKey).items.push(item);
  }

  return Array.from(map.entries()).map(([queue, groups]) => ({
    queue,
    windows: Array.from(groups.values())
      .map((group) => ({
        ...group,
        isConflict: group.items.length > concurrencyLimit,
      }))
      .sort((a, b) =>
        String(a.release_window_start).localeCompare(
          String(b.release_window_start),
        ),
      ),
  }));
}

function MetricCard({ label, value, subvalue, tone = "normal" }) {
  return (
    <div
      className={clsx(
        "anticipation-metric-card",
        tone !== "normal" && `is-${tone}`,
      )}
    >
      <div className="anticipation-metric-card__label">{label}</div>
      <div className="anticipation-metric-card__value">{value}</div>
      {subvalue ? (
        <div className="anticipation-metric-card__subvalue">{subvalue}</div>
      ) : null}
    </div>
  );
}

function minutesToForecastLabel(minutes) {
  const num = Number(minutes);
  if (!Number.isFinite(num) || num <= 0) return "2 hr";
  const hours = num / 60;
  return `${hours} hr`;
}

function forecastLabelToMinutes(label) {
  const match = String(label || "").match(/(\d+)/);
  if (!match) return 120;
  return Number(match[1]) * 60;
}

function minutesToReleaseLabel(minutes) {
  const num = Number(minutes);
  if (!Number.isFinite(num) || num <= 0) return "40 min";
  return `${num} min`;
}

function releaseLabelToMinutes(label) {
  const match = String(label || "").match(/(\d+)/);
  if (!match) return 40;
  return Number(match[1]);
}

function partsListCodeToLabel(value, options = []) {
  const code = String(value || "")
    .toLowerCase()
    .trim();

  const exact = options.find(
    (opt) =>
      String(opt.code || "")
        .toLowerCase()
        .trim() === code,
  );
  if (exact?.label) return exact.label;

  if (code.includes("favorite")) return "My Favorites";
  if (code.includes("high")) return "High Risk";
  return "All Tracked";
}

function sortBackendToUi(value) {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (v === "startqty" || v === "start_qty") return "StartQty";
  if (v === "pouqty" || v === "pou_qty") return "POUQty";
  if (v === "leadtime" || v === "lead_time") return "LeadTime";
  if (v === "queue") return "Queue";
  return "sort_rank";
}

function timeToInputValue(value) {
  if (!value) return "";
  const text = String(value).trim();

  if (/^\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{4}$/.test(text)) return `${text.slice(0, 2)}:${text.slice(2, 4)}`;

  return "";
}

function inputValueToCompactTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{2}:\d{2}$/.test(text)) return text.replace(":", "");
  return text;
}

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.slice(name.length + 1));
    }
  }
  return "";
}

function resolveGraphStart(startTime) {
  const now = new Date();
  const base = new Date(now);

  if (startTime && /^\d{2}:\d{2}$/.test(String(startTime))) {
    const [hh, mm] = String(startTime).split(":").map(Number);
    base.setHours(hh, mm, 0, 0);
    return base;
  }

  return now;
}

function fmtEpochLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function nearestEpochIndex(epochs, value) {
  if (!value || !Array.isArray(epochs) || !epochs.length) return -1;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return -1;

  let bestIdx = 0;
  let bestDiff = Math.abs(new Date(epochs[0].at).getTime() - target);

  for (let i = 1; i < epochs.length; i += 1) {
    const diff = Math.abs(new Date(epochs[i].at).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  return bestIdx;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fmtGraphQty(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function AnticipationGraphRow({ row, epochs, width = 760, height = 56 }) {
  const series = Array.isArray(row.series) ? row.series : [];
  const leftPad = 6;
  const rightPad = 6;
  const topPad = 6;
  const bottomPad = 6;
  const innerW = Math.max(20, width - leftPad - rightPad);
  const innerH = Math.max(20, height - topPad - bottomPad);

  const maxQty = Math.max(
    Number(row.start_qty || 0),
    Number(row.warning_qty || 0),
    Number(row.resupply_qty || 0),
    ...series.map((pt) => Number(pt.qty || 0)),
    1,
  );

  const xForIndex = (idx) => {
    if (!series.length) return leftPad;
    if (series.length === 1) return leftPad + innerW / 2;
    return leftPad + (idx / (series.length - 1)) * innerW;
  };

  const yForQty = (qty) => {
    const ratio = clamp(Number(qty || 0) / maxQty, 0, 1);
    return topPad + (1 - ratio) * innerH;
  };

  const warningY = yForQty(row.warning_qty || 0);

  const points = series.map((pt, idx) => ({
    ...pt,
    x: xForIndex(idx),
    y: yForQty(pt.qty),
  }));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="anticipation-graph-row-svg"
      role="img"
      aria-label={`Projected quantity for part ${row.part_number}`}
    >
      <line
        x1={leftPad}
        x2={width - rightPad}
        y1={height - bottomPad}
        y2={height - bottomPad}
        className="anticipation-graph-axis-line"
      />

      <line
        x1={leftPad}
        x2={width - rightPad}
        y1={warningY}
        y2={warningY}
        className="anticipation-graph-warning-line"
      />

      {points.map((pt) => (
        <line
          key={`tick-${row.id}-${pt.idx}`}
          x1={pt.x}
          x2={pt.x}
          y1={topPad}
          y2={height - bottomPad}
          className="anticipation-graph-epoch-line"
        />
      ))}

      {points.slice(0, -1).map((pt, idx) => {
        const next = points[idx + 1];
        const up = next.y < pt.y;
        const danger = Number(next.qty || 0) <= 0;
        const warn =
          !danger && Number(next.qty || 0) <= Number(row.warning_qty || 0);

        let className = "anticipation-graph-segment";
        if (up) className += " is-resupply";
        else if (danger) className += " is-critical";
        else if (warn) className += " is-warning";

        return (
          <g key={`seg-${row.id}-${idx}`}>
            <line
              x1={pt.x}
              y1={pt.y}
              x2={next.x}
              y2={pt.y}
              className={className}
            />
            <line
              x1={next.x}
              y1={pt.y}
              x2={next.x}
              y2={next.y}
              className={className}
            />
          </g>
        );
      })}

      {points.map((pt) => {
        const hasRelease =
          Array.isArray(pt.releaseEvents) && pt.releaseEvents.length > 0;
        const hasNeed =
          Array.isArray(pt.needEvents) && pt.needEvents.length > 0;

        return (
          <g key={`marker-${row.id}-${pt.idx}`}>
            {hasRelease ? (
              <rect
                x={pt.x - 5}
                y={pt.y - 5}
                width={10}
                height={10}
                className="anticipation-graph-marker anticipation-graph-marker--release"
              />
            ) : null}

            {hasNeed ? (
              <circle
                cx={pt.x}
                cy={pt.y}
                r={5}
                className="anticipation-graph-marker anticipation-graph-marker--need"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function AnticipationSawtoothGraph({ rows, epochs, partsWindow = 8 }) {
  const visibleRows = (rows || []).slice(0, Number(partsWindow || 8));

  if (!visibleRows.length) {
    return (
      <div className="anticipation-note" style={{ marginTop: 8 }}>
        No projected graph rows available yet.
      </div>
    );
  }

  return (
    <div className="anticipation-sawtooth-graph">
      <div className="anticipation-sawtooth-graph__header">
        <div className="anticipation-sawtooth-graph__meta">Tracked Part</div>
        <div className="anticipation-sawtooth-graph__timeline">
          <div className="anticipation-sawtooth-graph__epoch-labels">
            {epochs.map((epoch) => (
              <div
                key={epoch.key || epoch.idx}
                className="anticipation-sawtooth-graph__epoch"
              >
                {epoch.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="anticipation-sawtooth-graph__body">
        {visibleRows.map((row) => (
          <div key={row.id} className="anticipation-sawtooth-graph__row">
            <div className="anticipation-sawtooth-graph__meta">
              <div className="anticipation-sawtooth-graph__part">
                {row.part_number}
              </div>
              <div className="anticipation-sawtooth-graph__desc">
                {row.description}
              </div>
              <div className="anticipation-sawtooth-graph__submeta">
                {row.pou_code} · {row.default_queue_label || "—"} · start{" "}
                {fmtGraphQty(row.start_qty)} · warn{" "}
                {fmtGraphQty(row.warning_qty)}
              </div>
            </div>

            <div className="anticipation-sawtooth-graph__timeline">
              <AnticipationGraphRow row={row} epochs={epochs} />
            </div>
          </div>
        ))}
      </div>

      <div className="anticipation-sawtooth-legend">
        <span className="anticipation-mini-pill">green = resupply jump</span>
        <span className="anticipation-mini-pill">yellow = warning zone</span>
        <span className="anticipation-mini-pill">red = stockout risk</span>
        <span className="anticipation-mini-pill">square = release</span>
        <span className="anticipation-mini-pill">circle = need</span>
      </div>
    </div>
  );
}

function buildPartGraphRows({
  rows,
  releaseItems,
  startTime,
  standardTaktSeconds,
  forecastLengthMinutes,
}) {
  const epochSeconds = Number(standardTaktSeconds || 280);
  const totalSeconds = Number(forecastLengthMinutes || 120) * 60;
  const epochCount = Math.max(1, Math.ceil(totalSeconds / epochSeconds));

  const startDate = resolveGraphStart(startTime);
  const epochs = Array.from({ length: epochCount + 1 }, (_, idx) => {
    const at = new Date(startDate.getTime() + idx * epochSeconds * 1000);
    return {
      idx,
      at,
      key: at.toISOString(),
      label: fmtEpochLabel(at),
    };
  });

  const releaseByPart = new Map();
  for (const item of releaseItems || []) {
    const key = String(item.part_number || "");
    if (!releaseByPart.has(key)) releaseByPart.set(key, []);
    releaseByPart.get(key).push(item);
  }

  const graphRows = (rows || []).map((row) => {
    const partKey = String(row.part_number || "");
    const partEvents = releaseByPart.get(partKey) || [];

    return {
      id: row.id,
      part_number: row.part_number,
      description: row.description_snapshot,
      pou_code: row.pou_code,
      default_queue_label: row.default_queue_label,
      lead_time_minutes: row.lead_time_minutes,
      resupply_qty: row.resupply_qty,
      start_qty: Number(
        row.estimated_pou_qty ?? row.estimated_total_maplayer_qty ?? 0,
      ),
      warning_qty: Number(row.warning_qty_effective ?? 0),
      epochs,
      events: partEvents,
    };
  });

  return { epochs, graphRows };
}

function projectPartSeries(partRow) {
  let qty = Number(partRow.start_qty || 0);

  const releaseEpochs = new Map();
  for (const evt of partRow.events) {
    const needIdx = nearestEpochIndex(partRow.epochs, evt.projected_need_at);
    const relIdx = nearestEpochIndex(
      partRow.epochs,
      evt.recommended_release_at,
    );

    if (!releaseEpochs.has(relIdx)) {
      releaseEpochs.set(relIdx, []);
    }
    releaseEpochs.get(relIdx).push(evt);

    // Optional:
    // if backend later provides per-epoch consumption, use that instead
    // of inferring from release items.
  }

  return partRow.epochs.map((epoch, idx) => {
    // Placeholder depletion logic:
    // for now, decrement when a need event lands in this epoch
    const needsNow = partRow.events.filter(
      (evt) => nearestEpochIndex(partRow.epochs, evt.projected_need_at) === idx,
    );
    for (const evt of needsNow) {
      qty -= Math.max(1, Number(evt.projected_consumption_qty || 1));
    }

    const releasesNow = releaseEpochs.get(idx) || [];
    for (const evt of releasesNow) {
      qty += Number(evt.resupply_qty ?? partRow.resupply_qty ?? 0);
    }

    return {
      idx,
      at: epoch.at,
      qty,
      isWarning: qty <= partRow.warning_qty,
      isCritical: qty <= 0,
      releaseEvents: releasesNow,
      needEvents: needsNow,
    };
  });
}

function buildGenerateReleaseSchedulePayload({
  resolvedPreferenceId,
  partsToTrack,
  partsToTrackOptions,
  forecastLength,
  releaseHorizon,
  concurrentAssignmentsLimit,
  previewWindow,
  partsWindow,
  defaultSort,
  startTime,
  createAssignments,
  generateCommandFile,
  triggerOnMes,
  useSmartTakt,
  standardTaktSeconds,
  lineupSourceLabel,
}) {
  return {
    controls: {
      preference_id: resolvedPreferenceId || null,
      parts_list_code: normalizePartsScope(partsToTrack, partsToTrackOptions),
      forecast_length_minutes: forecastLabelToMinutes(forecastLength),
      assignment_release_horizon_minutes: releaseLabelToMinutes(releaseHorizon),
      concurrent_assignments_limit:
        Number(concurrentAssignmentsLimit || 0) || 2,
      preview_window_width: Number(previewWindow || 0) || 10,
      parts_list_window: Number(partsWindow || 0) || 8,
      default_sort_criteria: defaultSort || "sort_rank",
      start_time: startTime || null,
      create_assignments_default: !!createAssignments,
      generate_assignments_file: !!generateCommandFile,
      trigger_on_mes: !!triggerOnMes,
      use_smart_takt: !!useSmartTakt,
      standard_takt_seconds: Number(standardTaktSeconds || 0) || 280,
    },
    lineup: {
      source_type: "existing",
      source_ref: null,
      source_label: lineupSourceLabel || null,
    },
    context: {
      map_layer_id: null,
      requested_parts_scope: normalizePartsScope(
        partsToTrack,
        partsToTrackOptions,
      ),
    },
    client: {
      page: "AnticipationPage",
      generated_at_client: new Date().toISOString(),
      ui_version: 1,
    },
  };
}

const styles = {
  link: { textDecoration: "none" },
  page: { padding: 16, minHeight: "100vh", boxSizing: "border-box" },

  headerRow: {
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 320,
  },
  headerRight: {
    marginLeft: "auto",
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  h2: { margin: 0, fontSize: 20 },
  h3: { margin: "0 0 10px 0", fontSize: 16 },
};

export default function AnticipationPage() {
  const [forecastLength, setForecastLength] = useState("2 hr");
  const [forecastLengthOptions, setForecastLengthOptions] = useState([
    { value_hours: 2, value_minutes: 120, label: "2 hr" },
    { value_hours: 4, value_minutes: 240, label: "4 hr" },
    { value_hours: 6, value_minutes: 360, label: "6 hr" },
  ]);

  const [partsToTrack, setPartsToTrack] = useState("My Favorites");
  const [partsToTrackOptions, setPartsToTrackOptions] = useState([
    { code: "my_favorites", label: "My Favorites" },
    { code: "all_tracked", label: "All Tracked" },
    { code: "high_risk", label: "High Risk" },
  ]);

  const [releaseHorizon, setReleaseHorizon] = useState("40 min");
  const [releaseHorizonOptions, setReleaseHorizonOptions] = useState([
    { value_minutes: 40, label: "40 min" },
    { value_minutes: 60, label: "60 min" },
    { value_minutes: 90, label: "90 min" },
  ]);

  const [previewWindow, setPreviewWindow] = useState("10");
  const [partsWindow, setPartsWindow] = useState("8");
  const [defaultSort, setDefaultSort] = useState("sort_rank");
  const [createAssignments, setCreateAssignments] = useState(true);
  const [generateCommandFile, setGenerateCommandFile] = useState(false);

  const [pageLoadLoading, setPageLoadLoading] = useState(false);
  const [pageLoadError, setPageLoadError] = useState("");
  const [resolvedPreferenceId, setResolvedPreferenceId] = useState("");
  const [concurrentAssignmentsLimit, setConcurrentAssignmentsLimit] =
    useState("2");
  const [startTime, setStartTime] = useState("");

  const [rows, setRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState("");
  const [tableSummary, setTableSummary] = useState({
    tracked_parts: 0,
    selected_count: 0,
    low_count: 0,
  });
  const [generatedReleaseItems, setGeneratedReleaseItems] = useState([]);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generationWarnings, setGenerationWarnings] = useState([]);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [generatedSummary, setGeneratedSummary] = useState(null);
  const [generateRunState, setGenerateRunState] = useState({
    isRunning: false,
    phase: "idle",
    startedAt: null,
    finishedAt: null,
    telemetry: {
      lineupLoaded: null,
      epochMapLoaded: null,
      bomLookupLoaded: null,
      stateMatches: null,
      stateMisses: null,
      partsWithConsumption: null,
      generatedItems: null,
      dataIssues: null,
      conflictCount: null,
      sequenceEpochZero: null,
    },
    sourceStatus: {
      scheduling: "idle",
      routing: "idle",
      erpBom: "idle",
      localState: "idle",
      simulation: "idle",
      diagnostics: "idle",
    },
    analysisExport: {
      ok: false,
      row_count: 0,
      download_url: "",
      error: "",
    },
    message: "Ready to generate release schedule.",
    error: "",
  });
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);

  const selectedCount = tableSummary.selected_count || 0;
  const lowCount = tableSummary.low_count || 0;
  const activeReleaseItems =
    generatedReleaseItems.length > 0 ? generatedReleaseItems : demoReleaseItems;

  const activePlan = generatedPlan || demoPlan;

  const [standardTaktSeconds, setStandardTaktSeconds] = useState(280);
  const [triggerOnMes, setTriggerOnMes] = useState(true);
  const [useSmartTakt, setUseSmartTakt] = useState(false);

  const graphForecastLengthMinutes =
    activePlan?.forecast_length_minutes ??
    forecastLabelToMinutes(forecastLength);

  const partGraphModel = useMemo(() => {
    return buildPartGraphRows({
      rows,
      releaseItems: activeReleaseItems,
      startTime,
      standardTaktSeconds,
      forecastLengthMinutes: graphForecastLengthMinutes,
    });
  }, [
    rows,
    activeReleaseItems,
    startTime,
    standardTaktSeconds,
    graphForecastLengthMinutes,
  ]);

  const projectedGraphRows = useMemo(() => {
    return (partGraphModel.graphRows || []).map((row) => ({
      ...row,
      series: projectPartSeries(row),
    }));
  }, [partGraphModel]);

  const graphEpochs = partGraphModel.epochs || [];
  const lineupFileInputRef = useRef(null);
  const tableScrollRef = useRef(null);
  const graphScrollRef = useRef(null);
  const syncingScrollRef = useRef(false);
  const generateBtnRef = useRef(null);
  const generateProgressTimersRef = useRef([]);

  const bumpPreviewWindow = (delta) =>
    setPreviewWindow((prev) => String(Math.max(1, Number(prev || 0) + delta)));

  const bumpPartsWindow = (delta) =>
    setPartsWindow((prev) => String(Math.max(1, Number(prev || 0) + delta)));

  const openLineupFilePicker = () => lineupFileInputRef.current?.click();

  function toggleRow(id) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, selected: !row.selected } : row,
      ),
    );
  }

  function clearPseudoProgressTimers() {
    generateProgressTimersRef.current.forEach((id) => window.clearTimeout(id));
    generateProgressTimersRef.current = [];
  }

  function startPseudoProgress() {
    clearPseudoProgressTimers();

    setGenerateRunState({
      isRunning: true,
      phase: "starting",
      startedAt: Date.now(),
      finishedAt: null,
      telemetry: {
        lineupLoaded: null,
        epochMapLoaded: null,
        bomLookupLoaded: null,
        stateMatches: null,
        stateMisses: null,
        partsWithConsumption: null,
        generatedItems: null,
        dataIssues: null,
        conflictCount: null,
        sequenceEpochZero: null,
      },
      sourceStatus: {
        scheduling: "working",
        routing: "idle",
        erpBom: "idle",
        localState: "idle",
        simulation: "idle",
        diagnostics: "idle",
      },
      analysisExport: {
        ok: false,
        row_count: 0,
        download_url: "",
        error: "",
      },

      message:
        "MHSA is initializing a planning session and validating external source connectivity.",
      error: "",
    });

    generateProgressTimersRef.current.push(
      window.setTimeout(() => {
        setGenerateRunState((prev) => ({
          ...prev,
          phase: "loading_sources",
          sourceStatus: {
            ...prev.sourceStatus,
            scheduling: "done",
            routing: "working",
          },
          message:
            "Scheduling source connected. Loading epoch-order routing references for point-of-use timing.",
        }));
      }, 700),
    );

    generateProgressTimersRef.current.push(
      window.setTimeout(() => {
        setGenerateRunState((prev) => ({
          ...prev,
          phase: "loading_sources",
          sourceStatus: {
            ...prev.sourceStatus,
            routing: "done",
            erpBom: "working",
          },
          message:
            "Routing references loaded. Querying BOM and external requirement coverage.",
        }));
      }, 1500),
    );

    generateProgressTimersRef.current.push(
      window.setTimeout(() => {
        setGenerateRunState((prev) => ({
          ...prev,
          phase: "loading_sources",
          sourceStatus: {
            ...prev.sourceStatus,
            erpBom: "done",
            localState: "working",
          },
          message:
            "Requirement lookup prepared. Matching tracked parts to local advisory state.",
        }));
      }, 2400),
    );

    generateProgressTimersRef.current.push(
      window.setTimeout(() => {
        setGenerateRunState((prev) => ({
          ...prev,
          phase: "simulating",
          sourceStatus: {
            ...prev.sourceStatus,
            localState: "done",
            simulation: "working",
          },
          message:
            "Tracked part state matched. Running anticipation simulation and threshold analysis.",
        }));
      }, 3400),
    );

    generateProgressTimersRef.current.push(
      window.setTimeout(() => {
        setGenerateRunState((prev) => ({
          ...prev,
          phase: "finalizing",
          sourceStatus: {
            ...prev.sourceStatus,
            simulation: "done",
            diagnostics: "working",
          },
          message:
            "Simulation complete. Building diagnostics, issue report, and release-plan summary.",
        }));
      }, 4600),
    );
  }

  async function handleGenerateReleaseSchedule() {
    if (generateRunState.isRunning) return;

    setShowGeneratePanel(true);

    startPseudoProgress();
    setGenerationLoading(true);
    setGenerationError("");
    setGenerationWarnings([]);

    try {
      const payload = buildGenerateReleaseSchedulePayload({
        resolvedPreferenceId,
        partsToTrack,
        partsToTrackOptions,
        forecastLength,
        releaseHorizon,
        concurrentAssignmentsLimit,
        previewWindow,
        partsWindow,
        defaultSort,
        startTime,
        createAssignments,
        generateCommandFile,
        triggerOnMes,
        useSmartTakt,
        standardTaktSeconds,
        lineupSourceLabel: activePlan?.lineup_source_label || "Today.csv",
      });

      const response = await fetch(
        `${backendBase}/mhsa/api/anticipation/generate-release-schedule/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken(),
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
          credentials: "include",
        },
      );

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Generate Release Schedule failed.");
      }

      clearPseudoProgressTimers();
      applyGenerateResponseToRunState(data);

      setGeneratedPlan(data.plan || null);
      setGeneratedSummary(data.summary || null);
      setGenerationWarnings(Array.isArray(data.warnings) ? data.warnings : []);

      if (data?.plan?.id) {
        await loadGeneratedPlanItems(data.plan.id);
      } else {
        setGeneratedReleaseItems([]);
      }
    } catch (err) {
      const message = err?.message || "Unexpected forecast generation error.";
      clearPseudoProgressTimers();
      setGenerationError(message);
      failGenerateRun(message);
    } finally {
      setGenerationLoading(false);
    }
  }

  function applyGenerateResponseToRunState(data) {
    const plan = data?.plan || {};
    const summary = data?.summary || {};

    const lineupSummary =
      data?.plan_json?.lineup_summary ||
      data?.lineup_summary ||
      data?.plan?.lineup_summary ||
      {};

    const planJson = data?.plan_json || {};

    const effectiveLineupSummary =
      planJson.lineup_summary || lineupSummary || {};

    const effectiveEpochSummary = planJson.epoch_order_summary || {};
    const effectiveBomSummary = planJson.bom_summary || {};
    const analysisExport = plan.analysis_export || {};

    setGenerateRunState((prev) => ({
      ...prev,
      isRunning: false,
      phase: "complete",
      finishedAt: Date.now(),
      sourceStatus: {
        scheduling: "done",
        routing: "done",
        erpBom: "done",
        localState: "done",
        simulation: "done",
        diagnostics: "done",
      },
      telemetry: {
        lineupLoaded:
          summary.lineup_order_count ??
          effectiveLineupSummary.order_count ??
          null,
        epochMapLoaded:
          summary.mapped_pou_count ??
          effectiveEpochSummary.mapped_pou_count ??
          null,
        bomLookupLoaded:
          summary.bom_lookup_count ??
          effectiveBomSummary.bom_lookup_count ??
          null,
        stateMatches: summary.parts_with_state_match ?? null,
        stateMisses: summary.parts_without_state_match ?? null,
        partsWithConsumption: summary.parts_with_consumption ?? null,
        generatedItems: plan.generated_item_count ?? null,
        dataIssues: summary.data_issue_count ?? null,
        conflictCount: plan.conflict_count ?? null,
        sequenceEpochZero:
          plan.sequence_epoch_zero ?? planJson.sequence_epoch_zero ?? null,
      },
      analysisExport: {
        ok: !!analysisExport.ok,
        row_count: Number(analysisExport.row_count || 0),
        download_url: analysisExport.download_url || "",
        error: analysisExport.error || "",
      },
      message:
        (plan.generated_item_count || 0) > 0
          ? "Planning session complete. MHSA generated advisory release activity and captured supporting telemetry."
          : "Planning session complete. No release events were generated in the current horizon, but MHSA confirmed source loading, matching, and diagnostics.",
      error: "",
    }));
  }

  function failGenerateRun(errorText) {
    setGenerateRunState((prev) => ({
      ...prev,
      isRunning: false,
      phase: "error",
      finishedAt: Date.now(),
      sourceStatus: {
        ...prev.sourceStatus,
        diagnostics: "error",
      },
      message:
        "The planning session did not complete normally. Review the diagnostic details below.",
      error: errorText || "Unknown anticipation run error.",
    }));
  }

  function buildGeneratePopoverHtml(runState) {
    const icon = (status) => {
      if (status === "done") return "✅";
      if (status === "working") return "⏳";
      if (status === "error") return "⚠️";
      return "◌";
    };

    const metric = (label, value) => {
      if (value === null || value === undefined) {
        return `<div class="anticipation-run-metric"><span>${label}</span><strong>—</strong></div>`;
      }
      return `<div class="anticipation-run-metric"><span>${label}</span><strong>${value}</strong></div>`;
    };

    const telemetry = runState.telemetry || {};
    const sourceStatus = runState.sourceStatus || {};
    const analysis = runState.analysisExport || {};

    const hasErrors = Number(telemetry.dataIssues || 0) > 0 || !!runState.error;

    const checklistHref = analysis.download_url
      ? /^https?:\/\//i.test(analysis.download_url)
        ? analysis.download_url
        : `${String(backendBase || "").replace(/\/$/, "")}/${String(
            analysis.download_url,
          ).replace(/^\//, "")}`
      : "";

    const hasChecklist =
      !!analysis.ok && Number(analysis.row_count || 0) > 0 && !!checklistHref;

    return `
    <div class="anticipation-run-popover">
      <div class="anticipation-run-popover__intro">
        <div class="anticipation-run-popover__headline">
          ${runState.isRunning ? "MHSA Anticipation Run In Progress" : "MHSA Anticipation Session"}
        </div>
        <div class="anticipation-run-popover__copy">
          ${runState.message || "Preparing forecast session."}
        </div>
      </div>

      <div class="anticipation-run-popover__section">
        <div class="anticipation-run-popover__section-title">Workstreams</div>

        <div class="anticipation-run-step">
          <span class="anticipation-run-step__icon">${icon(sourceStatus.scheduling)}</span>
          <span class="anticipation-run-step__label">Scheduling / Lineup source</span>
        </div>

        <div class="anticipation-run-step">
          <span class="anticipation-run-step__icon">${icon(sourceStatus.routing)}</span>
          <span class="anticipation-run-step__label">POU epoch / routing map</span>
        </div>

        <div class="anticipation-run-step">
          <span class="anticipation-run-step__icon">${icon(sourceStatus.erpBom)}</span>
          <span class="anticipation-run-step__label">ERP / BOM requirement lookup</span>
        </div>

        <div class="anticipation-run-step">
          <span class="anticipation-run-step__icon">${icon(sourceStatus.localState)}</span>
          <span class="anticipation-run-step__label">Tracked part advisory state</span>
        </div>

        <div class="anticipation-run-step">
          <span class="anticipation-run-step__icon">${icon(sourceStatus.simulation)}</span>
          <span class="anticipation-run-step__label">Forecast simulation</span>
        </div>

        <div class="anticipation-run-step">
          <span class="anticipation-run-step__icon">${icon(sourceStatus.diagnostics)}</span>
          <span class="anticipation-run-step__label">Diagnostics / issue report</span>
        </div>
      </div>

      <div class="anticipation-run-popover__section">
        <div class="anticipation-run-popover__section-title">Telemetry</div>
        <div class="anticipation-run-metrics">
          ${metric("Orders loaded", telemetry.lineupLoaded)}
          ${metric("POUs mapped", telemetry.epochMapLoaded)}
          ${metric("BOM lookup rows", telemetry.bomLookupLoaded)}
          ${metric("Tracked parts matched", telemetry.stateMatches)}
          ${metric("Tracked parts unmatched", telemetry.stateMisses)}
          ${metric("Parts with consumption", telemetry.partsWithConsumption)}
          ${metric("Release items generated", telemetry.generatedItems)}
          ${metric("Data issues detected", telemetry.dataIssues)}
          ${metric("Conflicts", telemetry.conflictCount)}
          ${metric("Epoch 0 sequence", telemetry.sequenceEpochZero)}
        </div>
      </div>

      <div class="anticipation-run-popover__section">
        <div class="anticipation-run-popover__section-title">Run Summary</div>
        <div class="anticipation-run-metrics">
          ${metric("Generated Items", telemetry.generatedItems)}
          ${metric("Data Issues", telemetry.dataIssues)}
          ${metric("State Matches", telemetry.stateMatches)}
          ${metric("Consumption Timelines", telemetry.partsWithConsumption)}
        </div>
      </div>

      ${
        hasErrors
          ? `
        <div class="anticipation-run-popover__section anticipation-run-popover__section--warning">
          <div class="anticipation-run-popover__section-title">Issues detected</div>
          <div class="anticipation-run-popover__copy">
            MHSA found forecast or data anomalies for this run.
          </div>
        </div>
      `
          : ""
      }

      ${
        hasChecklist
          ? `
        <div class="anticipation-run-popover__section">
          <div class="anticipation-run-popover__section-title">Operations Checklist</div>
          <div class="anticipation-run-popover__copy">
            A CSV checklist was generated for follow-up and data cleanup.
          </div>
          <div class="anticipation-diagnostics-popover__actions">
            <a
              class="btn btn-sm btn-outline-primary"
              href="${checklistHref}"
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              Download Checklist CSV
            </a>
          </div>
        </div>
      `
          : ""
      }

      ${
        runState.error
          ? `
        <div class="anticipation-run-popover__section anticipation-run-popover__section--error">
          <div class="anticipation-run-popover__section-title">Attention</div>
          <div class="anticipation-run-popover__error">${runState.error}</div>
        </div>
      `
          : ""
      }
    </div>
  `;
  }

  function handleGenerateAssignmentsFile() {
    const generationPrefs = {
      create_assignments: createAssignments,
      generate_assignments_file: generateCommandFile,
    };

    console.log(
      "Generate Assignments File clicked with prefs:",
      generationPrefs,
    );

    // later:
    // fetch("/mhsa/api/anticipation/generate-assignments-file/", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "X-CSRFToken": getCsrfTokenSomehow(),
    //   },
    //   body: JSON.stringify(generationPrefs),
    // });

    if (generateCommandFile) {
      // current placeholder behavior
    }
  }

  async function loadGeneratedPlanItems(planId) {
    if (!planId) {
      setGeneratedReleaseItems([]);
      return;
    }

    const response = await fetch(
      `${backendBase}/mhsa/api/anticipation/release-plan-detail/?plan_id=${encodeURIComponent(planId)}`,
      {
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Plan detail request failed (${response.status})`);
    }

    const data = await response.json();

    if (!data?.ok) {
      throw new Error(data?.error || "Plan detail payload was not ok.");
    }

    setGeneratedPlan(data.plan || null);
    setGeneratedReleaseItems(Array.isArray(data.items) ? data.items : []);
  }

  function toggleAll() {
    const shouldSelectAll = rows.some((row) => !row.selected);
    setRows((prev) =>
      prev.map((row) => ({ ...row, selected: shouldSelectAll })),
    );
  }

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll('[data-bs-toggle="popover"]'),
    ).filter((node) => node !== generateBtnRef.current);

    const popovers = nodes.map((node) => {
      const existing = Popover.getInstance(node);
      if (existing) {
        existing.dispose();
      }
      return new Popover(node);
    });

    return () => {
      popovers.forEach((popover) => popover.dispose());
    };
  }, [rows, projectedGraphRows, generationWarnings, generatedPlan]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPagePreferences() {
      setPageLoadLoading(true);
      setPageLoadError("");

      try {
        const response = await fetch(
          `${backendBase}/mhsa/api/anticipation/page-load/`,
          {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Page load request failed (${response.status})`);
        }

        const data = await response.json();

        if (!data?.ok) {
          throw new Error(data?.error || "Page load payload was not ok.");
        }

        if (isCancelled) return;

        const controls = data?.controls || {};
        const options = data?.options || {};

        const forecastOpts = Array.isArray(options.forecast_length)
          ? options.forecast_length
          : [];
        const releaseOpts = Array.isArray(options.assignment_release_horizon)
          ? options.assignment_release_horizon
          : [];
        const partsScopeOpts = Array.isArray(options.parts_to_track)
          ? options.parts_to_track
          : [];

        if (forecastOpts.length) {
          setForecastLengthOptions(forecastOpts);
        }

        if (releaseOpts.length) {
          setReleaseHorizonOptions(releaseOpts);
        }

        if (partsScopeOpts.length) {
          setPartsToTrackOptions(partsScopeOpts);
        }

        setResolvedPreferenceId(controls.id || "");

        setForecastLength(
          minutesToForecastLabel(controls.forecast_length_minutes),
        );

        setReleaseHorizon(
          minutesToReleaseLabel(controls.assignment_release_horizon_minutes),
        );

        setConcurrentAssignmentsLimit(
          String(controls.concurrent_assignments_limit ?? 2),
        );

        setPreviewWindow(String(controls.preview_window_width ?? 10));
        setPartsWindow(String(controls.parts_list_window ?? 8));

        setDefaultSort(sortBackendToUi(controls.default_sort_criteria));
        setCreateAssignments(!!controls.create_assignments_default);
        setGenerateCommandFile(!!controls.export_csv_default);

        setPartsToTrack(
          partsListCodeToLabel(controls.active_parts_list_code, partsScopeOpts),
        );

        setStartTime(timeToInputValue(controls.start_time));
      } catch (err) {
        if (!isCancelled) {
          setPageLoadError(
            err?.message || "Unable to load anticipation page controls.",
          );
        }
      } finally {
        if (!isCancelled) {
          setPageLoadLoading(false);
        }
      }
    }

    loadPagePreferences();

    return () => {
      isCancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let isCancelled = false;

    async function loadTableRows() {
      setTableLoading(true);
      setTableError("");

      try {
        const params = new URLSearchParams({
          parts_scope: normalizePartsScope(partsToTrack, partsToTrackOptions),
          sort: normalizeSort(defaultSort),
        });

        const response = await fetch(
          `${backendBase}/mhsa/api/anticipation/table/?${params.toString()}`,
          {
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Table request failed (${response.status})`);
        }

        const data = await response.json();

        if (!data?.ok) {
          throw new Error(data?.error || "Table payload was not ok.");
        }

        if (!isCancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
          setTableSummary(
            data.summary || {
              tracked_parts: 0,
              selected_count: 0,
              low_count: 0,
            },
          );
        }
      } catch (err) {
        if (!isCancelled) {
          setTableError(err?.message || "Unable to load anticipation table.");
          setRows([]);
          setTableSummary({
            tracked_parts: 0,
            selected_count: 0,
            low_count: 0,
          });
        }
      } finally {
        if (!isCancelled) {
          setTableLoading(false);
        }
      }
    }

    loadTableRows();

    return () => {
      isCancelled = true;
    };
  }, [partsToTrack, partsToTrackOptions, defaultSort, resolvedPreferenceId]);

  function syncVerticalScroll(source, target) {
    if (!source?.current || !target?.current) return;
    if (syncingScrollRef.current) return;

    syncingScrollRef.current = true;
    target.current.scrollTop = source.current.scrollTop;

    window.requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  }

  return (
    <div className="mhsa-page mhsa-home mhsa-dark anticipation-page-shell">
      <div className="anticipation-toolbar-wrap">
        <div className="anticipation-toolbar" style={{ width: "100%" }}>
          <div className="anticipation-toolbar-links">
            <button className="mhsa-btn mhsa-btn-primary" type="button">
              Manage Lineup Preferences
            </button>

            <div style={styles.headerRight}>
              <Link to="/clubcar" style={styles.link}>
                ← MHSA Home
              </Link>
            </div>
          </div>
        </div>

        <div className="anticipation-toolbar">
          <div className="anticipation-toolbar-card">
            <div
              className="anticipation-toolbar-grid"
              style={{ maxWidth: "1320px", width: "100%" }}
            >
              <div className="anticipation-field">
                <label>ANTICIPATION Length</label>
                <select
                  value={forecastLength}
                  onChange={(e) => setForecastLength(e.target.value)}
                >
                  {forecastLengthOptions.map((opt) => (
                    <option key={opt.value_minutes} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="anticipation-field">
                <label>Parts to Track</label>
                <select
                  value={partsToTrack}
                  onChange={(e) => setPartsToTrack(e.target.value)}
                >
                  {partsToTrackOptions.map((opt) => (
                    <option key={opt.code} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="anticipation-field">
                <label>Assignment Release Horizon</label>
                <select
                  value={releaseHorizon}
                  onChange={(e) => setReleaseHorizon(e.target.value)}
                >
                  {releaseHorizonOptions.map((opt) => (
                    <option key={opt.value_minutes} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="anticipation-field">
                <label>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="anticipation-field">
                <label>Concurrent Assignments Limit</label>
                <input
                  value={concurrentAssignmentsLimit}
                  onChange={(e) =>
                    setConcurrentAssignmentsLimit(e.target.value)
                  }
                />
              </div>

              <div className="anticipation-field anticipation-field--spinner">
                <label>Preview Window Width</label>
                <div
                  className="anticipation-spinner-shell"
                  style={{ position: "relative", width: "100%" }}
                >
                  <input
                    value={previewWindow}
                    onChange={(e) => setPreviewWindow(e.target.value)}
                    style={{ width: "100%", paddingRight: "34px" }}
                  />
                  <div
                    className="anticipation-spinner-buttons"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "6px",
                      transform: "translateY(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <button
                      type="button"
                      className="anticipation-spinner-btn"
                      onClick={() => bumpPreviewWindow(1)}
                      aria-label="Increase preview window width"
                      style={{
                        border: 0,
                        background: "transparent",
                        padding: 0,
                        lineHeight: 1,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="anticipation-spinner-btn"
                      onClick={() => bumpPreviewWindow(-1)}
                      aria-label="Decrease preview window width"
                      style={{
                        border: 0,
                        background: "transparent",
                        padding: 0,
                        lineHeight: 1,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>

              <div className="anticipation-field anticipation-field--spinner">
                <label>Parts List Window</label>
                <div
                  className="anticipation-spinner-shell"
                  style={{ position: "relative", width: "100%" }}
                >
                  <input
                    value={partsWindow}
                    onChange={(e) => setPartsWindow(e.target.value)}
                    style={{ width: "100%", paddingRight: "34px" }}
                  />
                  <div
                    className="anticipation-spinner-buttons"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: "6px",
                      transform: "translateY(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <button
                      type="button"
                      className="anticipation-spinner-btn"
                      onClick={() => bumpPartsWindow(1)}
                      aria-label="Increase parts list window"
                      style={{
                        border: 0,
                        background: "transparent",
                        padding: 0,
                        lineHeight: 1,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="anticipation-spinner-btn"
                      onClick={() => bumpPartsWindow(-1)}
                      aria-label="Decrease parts list window"
                      style={{
                        border: 0,
                        background: "transparent",
                        padding: 0,
                        lineHeight: 1,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>

              <div className="anticipation-field">
                <label>TAKT Time (secs)</label>
                <input
                  value={standardTaktSeconds}
                  onChange={(e) => setStandardTaktSeconds(e.target.value)}
                />
              </div>

              <div
                className="anticipation-field anticipation-field--inline"
                style={{ gridColumn: "1 / span 4" }}
              >
                <label>Lineup File</label>

                <button
                  type="button"
                  className="mhsa-linkbtn"
                  onClick={openLineupFilePicker}
                >
                  {activePlan.lineup_source_label || "Select lineup .csv"}
                </button>

                <input
                  ref={lineupFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // later: set selected file state / upload state here
                  }}
                />

                <button className="mhsa-linkbtn" type="button">
                  Ingest
                </button>
              </div>

              <div
                className="anticipation-field anticipation-field--inline"
                style={{ gridColumn: "5 / span 3", alignItems: "end" }}
              >
                <label style={{ visibility: "hidden" }}>Trigger on MES</label>
                <label className="mhsa-switch" htmlFor="TriggerOnMesPref">
                  <span className="mhsa-switch__label">Trigger on MES</span>
                  <input
                    id="TriggerOnMesPref"
                    className="mhsa-switch__input"
                    type="checkbox"
                    checked={triggerOnMes}
                    onChange={(e) => setTriggerOnMes(e.target.checked)}
                  />
                  <span className="mhsa-switch__slider" aria-hidden="true" />
                </label>
              </div>
            </div>

            <div className="anticipation-toolbar-actions">
              <div className="anticipation-toolbar-links">
                <button className="mhsa-btn mhsa-btn-primary" type="button">
                  MITZO Tasking
                </button>
                <button className="mhsa-btn mhsa-btn-primary" type="button">
                  ERP Query
                </button>
              </div>
              <div className="anticipation-note">
                Planner-facing advisory control panel.
                {resolvedPreferenceId ? (
                  <span style={{ marginLeft: 8, opacity: 0.75 }}>
                    pref {resolvedPreferenceId}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className="anticipation-rail-card"
            style={{ maxWidth: "620px", width: "100%" }}
          >
            <div>
              <div
                className="anticipation-rail-title-wrap"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <p className="anticipation-rail-title" style={{ margin: 0 }}>
                  AI Analysis
                </p>

                <button
                  type="button"
                  className="anticipation-help-icon"
                  aria-label="Executive explanation of anticipation logic"
                  data-bs-toggle="popover"
                  data-bs-trigger="click focus"
                  data-bs-placement="left"
                  data-bs-html="true"
                  data-bs-custom-class="anticipation-exec-popover"
                  title="Anticipation Logic Explained"
                  data-bs-content={`
      <div class="anticipation-exec-popover__body">
        <div class="anticipation-exec-popover__copy">
          MHSA works backward from projected point-of-use risk.
          It estimates when a part will cross its warning threshold,
          subtracts lead time, aligns that need to the best release window,
          and recommends when work should be released to the queue so the part
          arrives before local starvation occurs.
        </div>
        <img
          src="https://www.engineering-z.com/images/clubcar/Exec_Anticipation_logic.png"
          alt="Executive anticipation planning logic"
          class="anticipation-exec-popover__img"
        />
      </div>
    `}
                  style={{
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#d7dce5",
                    width: "26px",
                    height: "26px",
                    borderRadius: "999px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ?
                </button>
              </div>

              <div className="anticipation-ai-block">
                <button
                  className="mhsa-ai-avatar-btn"
                  type="button"
                  aria-label="AI Analysis"
                />
                <button
                  className="mhsa-btn mhsa-btn-primary"
                  type="button"
                  style={{ whiteSpace: "nowrap" }}
                >
                  TAKT ANALYSIS
                </button>
              </div>

              <div className="anticipation-ai-caption">
                (Future) Simulate Forecasting without committing queue work.
              </div>

              <div
                className="anticipation-field"
                style={{ gridColumn: "span 2", marginTop: 16 }}
              >
                <label>Planner Toggles</label>

                <div className="anticipation-switch-row">
                  <label
                    className="mhsa-switch"
                    htmlFor="CreateAssignmentsPref"
                  >
                    <span className="mhsa-switch__label">
                      Create Assignments
                    </span>
                    <input
                      id="CreateAssignmentsPref"
                      className="mhsa-switch__input"
                      type="checkbox"
                      checked={createAssignments}
                      onChange={(e) => setCreateAssignments(e.target.checked)}
                    />
                    <span className="mhsa-switch__slider" aria-hidden="true" />
                  </label>

                  <label className="mhsa-switch" htmlFor="UseSmartTaktPref">
                    <span className="mhsa-switch__label">Smart Takt</span>
                    <input
                      id="UseSmartTaktPref"
                      className="mhsa-switch__input"
                      type="checkbox"
                      checked={useSmartTakt}
                      onChange={(e) => setUseSmartTakt(e.target.checked)}
                    />
                    <span className="mhsa-switch__slider" aria-hidden="true" />
                  </label>

                  <label
                    className="mhsa-switch"
                    htmlFor="GenerateAssignmentsFilePref"
                  >
                    <span className="mhsa-switch__label">
                      Generate Assignments File
                    </span>
                    <input
                      id="GenerateAssignmentsFilePref"
                      className="mhsa-switch__input"
                      type="checkbox"
                      checked={generateCommandFile}
                      onChange={(e) => setGenerateCommandFile(e.target.checked)}
                    />
                    <span className="mhsa-switch__slider" aria-hidden="true" />
                  </label>
                </div>
              </div>
            </div>
            <button
              ref={generateBtnRef}
              type="button"
              className="mhsa-linkbtn"
              onClick={handleGenerateReleaseSchedule}
              aria-label="Generate release schedule"
              aria-expanded={showGeneratePanel ? "true" : "false"}
              style={{
                opacity: generateRunState.isRunning ? 0.72 : 1,
                cursor: generateRunState.isRunning ? "progress" : "pointer",
              }}
            >
              {generateRunState.isRunning
                ? "Generating..."
                : "Generate Release Schedule"}
            </button>
          </div>
        </div>
      </div>
      {showGeneratePanel ? (
        <div
          className="anticipation-run-floating-panel"
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            width: "420px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "calc(100vh - 40px)",
            zIndex: 9999,
            background: "#1f2630",
            color: "#e6edf5",
            border: "2px solid rgba(255,255,255,0.18)",
            borderRadius: "14px",
            boxShadow: "0 18px 48px rgba(0,0,0,0.38)",
            overflow: "hidden",
          }}
        >
          <div className="anticipation-run-floating-panel__header">
            <div className="anticipation-run-floating-panel__title">
              Anticipation Run Status
            </div>
            <button
              type="button"
              className="anticipation-run-floating-panel__close"
              onClick={() => setShowGeneratePanel(false)}
              aria-label="Close anticipation run status"
            >
              ×
            </button>
          </div>

          <div
            className="anticipation-run-floating-panel__body"
            style={{
              maxHeight: "calc(100vh - 92px)",
              overflowY: "auto",
            }}
            dangerouslySetInnerHTML={{
              __html: buildGeneratePopoverHtml(generateRunState),
            }}
          />
        </div>
      ) : null}
      <div className="anticipation-stage">
        <section className="anticipation-results">
          <div className="anticipation-table-shell">
            <div className="anticipation-table-header">
              <div>
                <h3 className="anticipation-table-title">{partsToTrack}</h3>
                <div className="anticipation-table-subtitle">
                  Durable advisory state from AnticipationPartState. In-house
                  quantity is contextual; POU quantity drives local starvation
                  risk.
                </div>
                {pageLoadLoading ? (
                  <div
                    className="anticipation-table-subtitle"
                    style={{ marginTop: 6 }}
                  >
                    Loading anticipation preferences…
                  </div>
                ) : null}
                {pageLoadError ? (
                  <div
                    className="anticipation-table-subtitle"
                    style={{ marginTop: 6, color: "#ff9f9f" }}
                  >
                    {pageLoadError}
                  </div>
                ) : null}
                {tableLoading ? (
                  <div
                    className="anticipation-table-subtitle"
                    style={{ marginTop: 6 }}
                  >
                    Loading seeded anticipation rows…
                  </div>
                ) : null}
                {tableError ? (
                  <div
                    className="anticipation-table-subtitle"
                    style={{ marginTop: 6, color: "#ff9f9f" }}
                  >
                    {tableError}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              ref={tableScrollRef}
              className="anticipation-table-wrap mhsa-table-wrap anticipation-linked-pane anticipation-linked-pane--left"
              onScroll={() =>
                syncVerticalScroll(tableScrollRef, graphScrollRef)
              }
            >
              <table className="table mhsa-table mhsa-table--sm anticipation-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="cell-checkbox">
                      <input
                        type="checkbox"
                        aria-label="Select all rows"
                        checked={
                          rows.length > 0 && rows.every((row) => !!row.selected)
                        }
                        onChange={toggleAll}
                      />
                    </th>

                    <th>Incoming</th>
                    <th>In House</th>
                    <th>Part Number</th>

                    <th
                      style={{
                        minWidth: "220px",
                        maxWidth: "220px",
                        whiteSpace: "normal",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      Description
                    </th>

                    <th>POU</th>
                    <th>Zone</th>
                    <th
                      style={{
                        minWidth: "50px",
                        maxWidth: "50px",
                        whiteSpace: "normal",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      POU Qty
                    </th>

                    <th
                      style={{
                        minWidth: "150px",
                        maxWidth: "150px",
                        whiteSpace: "normal",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      Default Queue
                    </th>

                    <th
                      style={{
                        minWidth: "68px",
                        maxWidth: "78px",
                        whiteSpace: "normal",
                        lineHeight: "1.05",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      <span
                        tabIndex={0}
                        role="button"
                        data-bs-toggle="popover"
                        data-bs-trigger="hover focus"
                        data-bs-placement="top"
                        data-bs-html="true"
                        title="Lead Time"
                        data-bs-content="Estimated minutes needed to respond before the part is needed at the point of use."
                        style={{ cursor: "help" }}
                      >
                        Lead Time
                      </span>
                    </th>

                    <th
                      style={{
                        minWidth: "68px",
                        maxWidth: "78px",
                        whiteSpace: "normal",
                        lineHeight: "1.05",
                        textAlign: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      <span
                        tabIndex={0}
                        role="button"
                        data-bs-toggle="popover"
                        data-bs-trigger="hover focus"
                        data-bs-placement="top"
                        data-bs-html="true"
                        title="Resupply Quantity"
                        data-bs-content="Typical replenishment quantity suggested when this part requires attention."
                        style={{ cursor: "help" }}
                      >
                        Resup Qty
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const tone = row.row_tone || getRowTone(row);

                    return (
                      <tr
                        key={row.id}
                        className={clsx(
                          tone === "warning" && "anticipation-row--warning",
                          tone === "critical" && "anticipation-row--critical",
                        )}
                      >
                        <td className="cell-checkbox">
                          <input
                            type="checkbox"
                            checked={!!row.selected}
                            onChange={() => toggleRow(row.id)}
                            aria-label={`Select ${row.part_number}`}
                          />
                        </td>

                        <td>{fmtQty(row.estimated_incoming_qty)}</td>
                        <td>{fmtQty(row.estimated_total_maplayer_qty)}</td>
                        <td>{row.part_number}</td>

                        <td
                          style={{
                            minWidth: "220px",
                            maxWidth: "220px",
                            whiteSpace: "normal",
                          }}
                        >
                          {row.description_snapshot}
                        </td>

                        <td>{row.pou_code}</td>
                        <td>{row.zone || "—"}</td>

                        <td>
                          <div className="anticipation-qty-badges">
                            <span>{fmtQty(row.estimated_pou_qty)}</span>
                            {tone !== "normal" ? (
                              <span
                                className={clsx(
                                  "anticipation-mini-pill",
                                  tone === "critical" ? "is-danger" : "is-info",
                                )}
                              >
                                warn {fmtQty(row.warning_qty_effective)}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td>{row.default_queue_label || "—"}</td>
                        <td>{row.lead_time_minutes} min</td>
                        <td>{fmtQty(row.resupply_qty)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="anticipation-results-top">
            <MetricCard
              label="Tracked Parts"
              value={tableSummary.tracked_parts || rows.length}
              subvalue={`${selectedCount} selected`}
            />
            <MetricCard
              label="Low / Watch Rows"
              value={lowCount}
              subvalue="based on warning level of estimated quantity"
              tone={lowCount ? "warning" : "normal"}
            />
            <MetricCard
              label="Anticipation Horizon"
              value={forecastLength}
              subvalue={`Release horizon ${releaseHorizon}`}
            />
            <MetricCard
              label="Lineup Source"
              value={activePlan.lineup_source_label}
              subvalue={
                startTime
                  ? `Epoch 0 starts at ${inputValueToCompactTime(startTime)}`
                  : "Apriso Export of Production Schedule"
              }
            />
          </div>
        </section>

        <aside className="anticipation-plan-panel">
          <div
            ref={graphScrollRef}
            className="anticipation-plan-groups anticipation-linked-pane anticipation-linked-pane--right"
            onScroll={() => syncVerticalScroll(graphScrollRef, tableScrollRef)}
          >
            <AnticipationSawtoothGraph
              rows={projectedGraphRows}
              epochs={graphEpochs}
              partsWindow={partsWindow}
            />

            {generatedReleaseItems.length ? (
              <div className="anticipation-note" style={{ marginTop: 8 }}>
                Loaded {generatedReleaseItems.length} release item(s) for graph
                rendering.
              </div>
            ) : null}
          </div>

          <div className="anticipation-plan-card">
            <h3>Material Handling Release Schedule Graph</h3>
            <div className="anticipation-note" style={{ marginTop: 6 }}>
              Grouped by queue, then by release window. Conflict highlighting is
              based on queue + flight window versus concurrent assignment limit.
            </div>
            {generationError ? (
              <div
                className="anticipation-note"
                style={{ marginTop: 8, color: "#ff9f9f" }}
              >
                {generationError}
              </div>
            ) : null}

            {generatedPlan ? (
              <div className="anticipation-note" style={{ marginTop: 8 }}>
                Generated plan <strong>{generatedPlan.name}</strong>
                {generatedPlan.generated_at
                  ? ` at ${fmtTime(generatedPlan.generated_at)}`
                  : ""}
              </div>
            ) : null}

            {generatedSummary ? (
              <div className="anticipation-note" style={{ marginTop: 8 }}>
                Considered {generatedSummary.tracked_parts_considered ?? 0}{" "}
                tracked parts · matched{" "}
                {generatedSummary.parts_with_state_match ?? 0} · missing state{" "}
                {generatedSummary.parts_without_state_match ?? 0}
              </div>
            ) : null}

            {generationWarnings.length ? (
              <div className="anticipation-note" style={{ marginTop: 8 }}>
                {generationWarnings.slice(0, 3).map((warning, idx) => (
                  <div key={idx}>• {warning}</div>
                ))}
              </div>
            ) : null}
            <div className="anticipation-plan-meta">
              <div className="meta">
                <div className="label">Plan Status</div>
                <div>{activePlan.status}</div>
              </div>
              <div className="meta">
                <div className="label">Concurrent Limit</div>
                <div>
                  {activePlan.concurrent_assignments_limit ??
                    concurrentAssignmentsLimit}
                </div>
              </div>
              <div className="meta">
                <div className="label">ANTICIPATION HORIZON</div>
                <div>
                  {activePlan.forecast_length_minutes ??
                    forecastLabelToMinutes(forecastLength)}{" "}
                  min
                </div>
              </div>
              <div className="meta">
                <div className="label">Release Horizon</div>
                <div>
                  {activePlan.assignment_release_horizon_minutes ??
                    releaseLabelToMinutes(releaseHorizon)}{" "}
                  min
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";

const backendBase = import.meta.env.VITE_BACKEND_URL; // import.meta.env.VITE_BACKEND_URL

const demoPartStates = [
  {
    id: "aps-1",
    selected: false,
    estimated_total_maplayer_qty: 100,
    estimated_pou_qty: 30,
    estimated_incoming_qty: 0,
    default_queue_label: "Martinsville-SB",
    lead_time_minutes: 10,
    resupply_qty: 30,
    pou_code: "05M06",
    zone: "M5",
    part_number: "102521901",
    description_snapshot: "BRACKET-CLAMSHELL",
    warning_qty_effective: 12,
    sort_rank: 10,
    model_code: "FAVORITES",
  },
  {
    id: "aps-2",
    selected: true,
    estimated_total_maplayer_qty: 48,
    estimated_pou_qty: 6,
    estimated_incoming_qty: 12,
    default_queue_label: "KansasCity-Bulk",
    lead_time_minutes: 20,
    resupply_qty: 6,
    pou_code: "05M05",
    zone: "M5",
    part_number: "103635212",
    description_snapshot: "UNDERBODY, FRONT, FRONT HALF",
    warning_qty_effective: 8,
    sort_rank: 20,
    model_code: "FAVORITES",
  },
  {
    id: "aps-3",
    selected: false,
    estimated_total_maplayer_qty: 200,
    estimated_pou_qty: 36,
    estimated_incoming_qty: 0,
    default_queue_label: "KansasCity-Bulk",
    lead_time_minutes: 20,
    resupply_qty: 36,
    pou_code: "05SP2",
    zone: "SP",
    part_number: "103833601",
    description_snapshot: "HIP RESTRAINT, DRIVER",
    warning_qty_effective: 10,
    sort_rank: 30,
    model_code: "FAVORITES",
  },
  {
    id: "aps-4",
    selected: false,
    estimated_total_maplayer_qty: 22,
    estimated_pou_qty: 16,
    estimated_incoming_qty: 0,
    default_queue_label: "KansasCity-Bulk",
    lead_time_minutes: 10,
    resupply_qty: 16,
    pou_code: "05SM1",
    zone: "SM",
    part_number: "104023401",
    description_snapshot: "SEAT BOTTOM, ASM, PREC, BEIGE",
    warning_qty_effective: 8,
    sort_rank: 40,
    model_code: "FAVORITES",
  },
  {
    id: "aps-5",
    selected: true,
    estimated_total_maplayer_qty: 6,
    estimated_pou_qty: 2,
    estimated_incoming_qty: 0,
    default_queue_label: "KansasCity-Bulk",
    lead_time_minutes: 10,
    resupply_qty: 16,
    pou_code: "05SM1",
    zone: "SM",
    part_number: "104023402",
    description_snapshot: "SEAT BOTTOM, ASM, PREC, WHITE",
    warning_qty_effective: 8,
    sort_rank: 50,
    model_code: "FAVORITES",
  },
  {
    id: "aps-6",
    selected: false,
    estimated_total_maplayer_qty: 24,
    estimated_pou_qty: 5,
    estimated_incoming_qty: 10,
    default_queue_label: "KansasCity-Bulk",
    lead_time_minutes: 10,
    resupply_qty: 16,
    pou_code: "05SM1",
    zone: "SM",
    part_number: "104023404",
    description_snapshot: "SEAT BOTTOM, ASM, PREC, GRAY",
    warning_qty_effective: 8,
    sort_rank: 60,
    model_code: "FAVORITES",
  },
  {
    id: "aps-7",
    selected: false,
    estimated_total_maplayer_qty: 55,
    estimated_pou_qty: 9,
    estimated_incoming_qty: 12,
    default_queue_label: "Martinsville-Bulk",
    lead_time_minutes: 7,
    resupply_qty: 9,
    pou_code: "05M09",
    zone: "M9",
    part_number: "47786539001",
    description_snapshot: "BATTERY, LI, 4 KW, PROD",
    warning_qty_effective: 6,
    sort_rank: 70,
    model_code: "FAVORITES",
  },
  {
    id: "aps-8",
    selected: false,
    estimated_total_maplayer_qty: 60,
    estimated_pou_qty: 12,
    estimated_incoming_qty: 0,
    default_queue_label: "Martinsville-Bulk",
    lead_time_minutes: 7,
    resupply_qty: 12,
    pou_code: "05M12",
    zone: "M12",
    part_number: "47788791001",
    description_snapshot: "BODY, CENTER, REAR, BLK",
    warning_qty_effective: 8,
    sort_rank: 80,
    model_code: "FAVORITES",
  },
];

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

function normalizePartsScope(value) {
  if (!value) return "my_favorites";
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

export default function AnticipationPage() {
  const [forecastLength, setForecastLength] = useState("2 hr");
  const [partsToTrack, setPartsToTrack] = useState("My Favorites");
  const [releaseHorizon, setReleaseHorizon] = useState("40 min");
  const [previewWindow, setPreviewWindow] = useState("10");
  const [partsWindow, setPartsWindow] = useState("8");
  const [defaultSort, setDefaultSort] = useState("StartQty");
  const [createAssignments, setCreateAssignments] = useState(true);
  const [generateCommandFile, setGenerateCommandFile] = useState(false);
  const [rows, setRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState("");
  const [tableSummary, setTableSummary] = useState({
    tracked_parts: 0,
    selected_count: 0,
    low_count: 0,
  });

  const selectedCount = tableSummary.selected_count || 0;
  const lowCount = tableSummary.low_count || 0;
  const releaseGroups = useMemo(
    () =>
      getPlanGroups(demoReleaseItems, demoPlan.concurrent_assignments_limit),
    [],
  );

  function toggleRow(id) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, selected: !row.selected } : row,
      ),
    );
  }

  function toggleAll() {
    const shouldSelectAll = rows.some((row) => !row.selected);
    setRows((prev) =>
      prev.map((row) => ({ ...row, selected: shouldSelectAll })),
    );
  }

  React.useEffect(() => {
    let isCancelled = false;

    async function loadTableRows() {
      setTableLoading(true);
      setTableError("");

      try {
        const params = new URLSearchParams({
          parts_scope: normalizePartsScope(partsToTrack),
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
  }, [partsToTrack, defaultSort]);

  return (
    <div className="mhsa-page mhsa-home mhsa-dark anticipation-page-shell">
      <style>{`
        .anticipation-page-shell {
          min-height: 100vh;
        }

        .anticipation-toolbar-wrap {
          padding: 18px 18px 0;
        }

        .anticipation-toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.9fr) minmax(240px, 0.9fr);
          gap: 14px;
          align-items: stretch;
        }

        .anticipation-toolbar-card,
        .anticipation-rail-card,
        .anticipation-stage {
          border-radius: var(--mhsa-radius);
          background: var(--mhsa-shell-panel-bg);
          border: 1px solid var(--mhsa-border);
          box-shadow: var(--mhsa-shell-shadow);
          backdrop-filter: blur(10px);
        }

        .anticipation-toolbar-card {
          padding: 14px;
        }

        .anticipation-toolbar-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(110px, 1fr));
          gap: 10px;
        }

        .anticipation-field label {
          display: block;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--mhsa-muted);
          margin-bottom: 6px;
          font-weight: 800;
        }

        .anticipation-field input,
        .anticipation-field select {
          width: 100%;
          border-radius: 10px;
          border: 1px solid var(--mhsa-border);
          background: rgba(255,255,255,0.04);
          color: var(--mhsa-text);
          padding: 10px 12px;
          outline: none;
          font-weight: 700;
        }

        .anticipation-switch-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .anticipation-switch {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--mhsa-border);
          background: rgba(255,255,255,0.04);
          font-size: 0.84rem;
          font-weight: 800;
        }

        .anticipation-switch button {
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          cursor: pointer;
          padding: 0;
        }

        .anticipation-pill-on,
        .anticipation-pill-off {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.78rem;
        }

        .anticipation-pill-on {
          background: rgba(120, 220, 70, 0.28);
          color: #dff7c7;
          border: 1px solid rgba(120, 220, 70, 0.35);
        }

        .anticipation-pill-off {
          background: rgba(255,255,255,0.08);
          color: var(--mhsa-muted);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .anticipation-toolbar-actions {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .anticipation-toolbar-links {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .anticipation-rail-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 14px;
        }

        .anticipation-rail-title {
          margin: 0;
          color: var(--mhsa-heading);
          font-size: 0.88rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .anticipation-ai-block {
          display: grid;
          place-items: center;
          gap: 10px;
          text-align: center;
        }

        .anticipation-ai-caption {
          font-size: 0.86rem;
          color: var(--mhsa-muted);
          font-weight: 700;
        }

        .anticipation-stage {
          padding: 16px;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(240px, 0.9fr);
          gap: 16px;
          margin: 18px;
          height: calc(100vh - 216px);
          min-height: 680px;
        }

        .anticipation-results {
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .anticipation-results-top {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .anticipation-metric-card {
          border-radius: 14px;
          padding: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .anticipation-metric-card.is-warning {
          background: rgba(255, 196, 0, 0.10);
          border-color: rgba(255, 196, 0, 0.28);
        }

        .anticipation-metric-card.is-critical {
          background: rgba(255, 68, 68, 0.14);
          border-color: rgba(255, 68, 68, 0.28);
        }

        .anticipation-metric-card__label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--mhsa-muted);
          font-weight: 800;
        }

        .anticipation-metric-card__value {
          margin-top: 8px;
          font-size: 1.45rem;
          font-weight: 950;
        }

        .anticipation-metric-card__subvalue {
          margin-top: 4px;
          color: var(--mhsa-muted);
          font-size: 0.82rem;
        }

        .anticipation-table-shell {
          min-height: 0;
          display: flex;
          flex-direction: column;
          border-radius: var(--mhsa-radius);
          overflow: hidden;
          border: 1px solid var(--mhsa-border);
          background: rgba(0,0,0,0.16);
        }

        .anticipation-table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--mhsa-border2);
          background: rgba(255,255,255,0.03);
        }

        .anticipation-table-title {
          margin: 0;
          font-size: 1.1rem;
        }

        .anticipation-table-subtitle {
          font-size: 0.82rem;
          color: var(--mhsa-muted);
          margin-top: 3px;
        }

        .anticipation-table-wrap {
          overflow: auto;
          min-height: 0;
          padding: 0;
        }

        .anticipation-table .cell-checkbox {
          width: 42px;
          text-align: center;
        }

        .anticipation-row--warning td {
          box-shadow: inset 4px 0 0 rgba(255, 196, 0, 0.75);
        }

        .anticipation-row--critical td {
          box-shadow: inset 4px 0 0 rgba(255, 68, 68, 0.85);
          background-image: linear-gradient(90deg, rgba(255, 68, 68, 0.14), rgba(255,255,255,0)) !important;
        }

        .anticipation-qty-badges {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .anticipation-mini-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.06);
          font-size: 0.72rem;
          font-weight: 800;
        }

        .anticipation-mini-pill.is-danger {
          background: rgba(255, 68, 68, 0.14);
          border-color: rgba(255, 68, 68, 0.26);
        }

        .anticipation-mini-pill.is-info {
          background: rgba(20, 141, 151, 0.12);
          border-color: rgba(20, 141, 151, 0.26);
        }

        .anticipation-plan-panel {
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow: hidden;
        }

        .anticipation-plan-card {
          border-radius: var(--mhsa-radius);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 14px;
        }

        .anticipation-plan-card h3,
        .anticipation-plan-card h4 {
          margin: 0;
        }

        .anticipation-plan-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .anticipation-plan-meta .meta {
          border-radius: 12px;
          background: rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 10px 12px;
        }

        .anticipation-plan-meta .meta .label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--mhsa-muted);
          margin-bottom: 4px;
          font-weight: 800;
        }

        .anticipation-plan-groups {
          min-height: 0;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 2px;
        }

        .anticipation-queue-card {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.14);
          overflow: hidden;
        }

        .anticipation-queue-card__header {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .anticipation-queue-card__header h4 {
          font-size: 0.98rem;
        }
.anticipation-field--inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.anticipation-field--inline label {
  margin-bottom: 0;
  white-space: nowrap;
}

.anticipation-field--inline input {
  flex: 1 1 auto;
  min-width: 0;
}

        .anticipation-window-list {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .anticipation-window {
          border-radius: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .anticipation-window.is-conflict {
          background: rgba(255, 68, 68, 0.12);
          border-color: rgba(255, 68, 68, 0.28);
        }

        .anticipation-window__top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .anticipation-window__items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .anticipation-window-item {
          border-radius: 10px;
          background: rgba(0,0,0,0.18);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 10px;
        }

        .anticipation-window-item__top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
        }

        .anticipation-window-item__title {
          font-weight: 800;
          font-size: 0.9rem;
        }

        .anticipation-window-item__desc {
          color: var(--mhsa-muted);
          font-size: 0.78rem;
          margin-top: 3px;
        }

        .anticipation-window-item__times {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .anticipation-note {
          color: var(--mhsa-muted);
          font-size: 0.8rem;
          line-height: 1.45;
        }

        @media (max-width: 1400px) {
          .anticipation-toolbar {
            grid-template-columns: 1fr;
          }

          .anticipation-stage {
            grid-template-columns: 1fr;
            height: auto;
          }

          .anticipation-results-top {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 960px) {
          .anticipation-toolbar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .anticipation-results-top {
            grid-template-columns: 1fr;
          }

          .anticipation-plan-meta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="anticipation-toolbar-wrap">
        <div className="anticipation-toolbar" style={{ width: "100%" }}>
          <div className="anticipation-toolbar-links">
            <div>
              <p className="anticipation-rail-title">Current Plan</p>
              <div
                style={{ fontSize: "4.05rem", fontWeight: 900, marginTop: 6 }}
              >
                {demoPlan.name}
              </div>
              <div className="anticipation-ai-caption" style={{ marginTop: 6 }}>
                {demoPlan.generated_at_label} · {demoPlan.created_by_label}
              </div>
            </div>
            <div className="anticipation-note">
              This preliminary page emphasizes research, seeded data validation,
              and shape-of-model review before dynamic charting.
            </div>

            <button className="mhsa-linkbtn" type="button">
              Manage Lineup Preferences
            </button>
            <a className="mhsa-linkbtn" href="#back">
              Back to MHSA
            </a>
          </div>
        </div>
        <div className="anticipation-toolbar">
          <div className="anticipation-toolbar-card">
            <div
              className="anticipation-toolbar-grid"
              style={{ maxWidth: "1320px", width: "80%" }}
            >
              <div className="anticipation-field">
                <label>ANTICIPATION Length</label>
                <select
                  value={forecastLength}
                  onChange={(e) => setForecastLength(e.target.value)}
                >
                  <option>2 hr</option>
                  <option>4 hr</option>
                  <option>6 hr</option>
                </select>
              </div>
              <div className="anticipation-field">
                <label>Parts to Track</label>
                <select
                  value={partsToTrack}
                  onChange={(e) => setPartsToTrack(e.target.value)}
                >
                  <option>My Favorites</option>
                  <option>All Tracked</option>
                  <option>High Risk</option>
                </select>
              </div>
              <div className="anticipation-field">
                <label>Assignment Release Horizon</label>
                <select
                  value={releaseHorizon}
                  onChange={(e) => setReleaseHorizon(e.target.value)}
                >
                  <option>40 min</option>
                  <option>60 min</option>
                  <option>90 min</option>
                </select>
              </div>
              <div className="anticipation-field">
                <label>Concurrent Assignments Limit</label>
                <input value={demoPlan.concurrent_assignments_limit} readOnly />
              </div>
              <div className="anticipation-field">
                <label>Preview Window Width</label>
                <input
                  value={previewWindow}
                  onChange={(e) => setPreviewWindow(e.target.value)}
                />
              </div>
              <div className="anticipation-field">
                <label>Parts List Window</label>
                <input
                  value={partsWindow}
                  onChange={(e) => setPartsWindow(e.target.value)}
                />
              </div>
              <div
                className="anticipation-field anticipation-field--inline"
                style={{ maxWidth: "1520px", width: "100%" }}
              >
                <label>Lineup File</label>
                <input
                  value={demoPlan.lineup_source_label || "Today.csvicipatioh"}
                  readOnly
                />
                <button className="mhsa-linkbtn" type="button">
                  Ingest
                </button>
              </div>
            </div>

            <div className="anticipation-toolbar-actions">
              <div className="anticipation-toolbar-links">
                <button className="mhsa-linkbtn" type="button">
                  MITZO Tasking
                </button>
                <button className="mhsa-linkbtn" type="button">
                  ERP Query
                </button>
              </div>
              <div className="anticipation-note">
                Planner-facing advisory control panel.
              </div>
            </div>
          </div>

          <div
            className="anticipation-rail-card"
            style={{ maxWidth: "320px", width: "100%" }}
          >
            <div>
              <p className="anticipation-rail-title">AI Analysis</p>
              <div className="anticipation-ai-block">
                <button
                  className="mhsa-ai-avatar-btn"
                  type="button"
                  aria-label="AI Analysis"
                />
                <div className="anticipation-ai-caption">
                  (Future) Simulate Forecasting without committing queue work.
                </div>
              </div>
              <div
                className="anticipation-field"
                style={{ gridColumn: "span 2" }}
              >
                <label>Planner Toggles</label>
                <div className="anticipation-switch-row">
                  <span className="anticipation-switch">
                    <button
                      type="button"
                      onClick={() => setCreateAssignments((v) => !v)}
                    >
                      Create Assignments
                    </button>
                    <span
                      className={
                        createAssignments
                          ? "anticipation-pill-on"
                          : "anticipation-pill-off"
                      }
                    >
                      {createAssignments ? "On" : "Off"}
                    </span>
                  </span>
                  <span className="anticipation-switch">
                    <button
                      type="button"
                      onClick={() => setGenerateCommandFile((v) => !v)}
                    >
                      Generate Assignments File
                    </button>
                    <span
                      className={
                        generateCommandFile
                          ? "anticipation-pill-on"
                          : "anticipation-pill-off"
                      }
                    >
                      {generateCommandFile ? "On" : "Off"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <button className="mhsa-btn mhsa-btn-primary" type="button">
              Generate MH Release Schedule
            </button>
          </div>
        </div>
      </div>

      <div className="anticipation-stage">
        <section className="anticipation-results">
          <div className="anticipation-table-shell">
            <div className="anticipation-table-header">
              <div>
                <h3 className="anticipation-table-title">My Favorites</h3>
                <div className="anticipation-table-subtitle">
                  Durable advisory state from AnticipationPartState. In-house
                  quantity is contextual; POU quantity drives local starvation
                  risk.
                </div>
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
              <button
                className="mhsa-linkbtn"
                type="button"
                onClick={toggleAll}
              >
                Toggle All
              </button>
            </div>

            <div className="anticipation-table-wrap mhsa-table-wrap">
              <table className="table mhsa-table mhsa-table--sm anticipation-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th className="cell-checkbox">✓</th>
                    <th>In House</th>
                    <th>POU Qty</th>
                    <th>Incoming</th>
                    <th>Default Queue</th>
                    <th>Lead</th>
                    <th>Resupply</th>
                    <th>POU</th>
                    <th>Zone</th>
                    <th>Part Number</th>
                    <th>Description</th>
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
                          />
                        </td>
                        <td>{fmtQty(row.estimated_total_maplayer_qty)}</td>
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
                        <td>{fmtQty(row.estimated_incoming_qty)}</td>
                        <td>{row.default_queue_label || "—"}</td>
                        <td>{row.lead_time_minutes} min</td>
                        <td>{fmtQty(row.resupply_qty)}</td>
                        <td>{row.pou_code}</td>
                        <td>{row.zone || "—"}</td>
                        <td>{row.part_number}</td>
                        <td>{row.description_snapshot}</td>
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
              value={demoPlan.lineup_source_label}
              subvalue="Apriso Export of Production Schedule"
            />
          </div>
        </section>

        <aside className="anticipation-plan-panel">
          <div className="anticipation-plan-card">
            <h3>Release Schedule Preview</h3>
            <div className="anticipation-note" style={{ marginTop: 6 }}>
              Grouped by queue, then by release window. Conflict highlighting is
              based on queue + flight window versus concurrent assignment limit.
            </div>
            <div className="anticipation-plan-meta">
              <div className="meta">
                <div className="label">Plan Status</div>
                <div>{demoPlan.status}</div>
              </div>
              <div className="meta">
                <div className="label">Concurrent Limit</div>
                <div>{demoPlan.concurrent_assignments_limit}</div>
              </div>
              <div className="meta">
                <div className="label">ANTICIPATION HORIZON</div>
                <div>{demoPlan.forecast_length_minutes} min</div>
              </div>
              <div className="meta">
                <div className="label">Release Horizon</div>
                <div>{demoPlan.assignment_release_horizon_minutes} min</div>
              </div>
            </div>
          </div>

          <div className="anticipation-plan-groups">
            {releaseGroups.map((group) => (
              <div key={group.queue} className="anticipation-queue-card">
                <div className="anticipation-queue-card__header">
                  <h4>{group.queue}</h4>
                  <span className="anticipation-mini-pill">
                    {group.windows.length} window(s)
                  </span>
                </div>
                <div className="anticipation-window-list">
                  {group.windows.map((windowGroup) => (
                    <div
                      key={windowGroup.windowKey}
                      className={clsx(
                        "anticipation-window",
                        windowGroup.isConflict && "is-conflict",
                      )}
                    >
                      <div className="anticipation-window__top">
                        <strong>
                          {fmtWindow(
                            windowGroup.release_window_start,
                            windowGroup.release_window_end,
                          )}
                        </strong>
                        <span
                          className={clsx(
                            "anticipation-mini-pill",
                            windowGroup.isConflict && "is-danger",
                          )}
                        >
                          {windowGroup.items.length} item(s)
                          {windowGroup.isConflict ? " · conflict" : ""}
                        </span>
                      </div>
                      <div className="anticipation-window__items">
                        {windowGroup.items.map((item) => (
                          <div
                            key={item.id}
                            className="anticipation-window-item"
                          >
                            <div className="anticipation-window-item__top">
                              <div>
                                <div className="anticipation-window-item__title">
                                  {item.part_number} · {item.pou_code}
                                </div>
                                <div className="anticipation-window-item__desc">
                                  {item.description_snapshot}
                                </div>
                              </div>
                              <span
                                className={clsx(
                                  "anticipation-mini-pill",
                                  item.conflict_level === "high" && "is-danger",
                                )}
                              >
                                {item.status}
                              </span>
                            </div>
                            <div className="anticipation-window-item__times">
                              <span className="anticipation-mini-pill">
                                release {fmtTime(item.recommended_release_at)}
                              </span>
                              <span className="anticipation-mini-pill">
                                need {fmtTime(item.projected_need_at)}
                              </span>
                              <span className="anticipation-mini-pill">
                                qty@need{" "}
                                {fmtQty(item.estimated_pou_qty_at_need)}
                              </span>
                              <span className="anticipation-mini-pill">
                                warn {fmtQty(item.warning_qty_effective)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "./Anticipation.css";

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

const styles = {
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

  const selectedCount = tableSummary.selected_count || 0;
  const lowCount = tableSummary.low_count || 0;
  const releaseGroups = useMemo(
    () =>
      getPlanGroups(
        demoReleaseItems,
        Number(concurrentAssignmentsLimit || 0) || 2,
      ),
    [concurrentAssignmentsLimit],
  );

  const [standardTaktSeconds, setStandardTaktSeconds] = useState(280);
  const [triggerOnMes, setTriggerOnMes] = useState(true);
  const [useSmartTakt, setUseSmartTakt] = useState(false);

  const lineupFileInputRef = useRef(null);

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

  function toggleAll() {
    const shouldSelectAll = rows.some((row) => !row.selected);
    setRows((prev) =>
      prev.map((row) => ({ ...row, selected: shouldSelectAll })),
    );
  }

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
                  {demoPlan.lineup_source_label || "Select lineup .csv"}
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
              <p className="anticipation-rail-title">AI Analysis</p>

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

            <div className="anticipation-table-wrap mhsa-table-wrap">
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
              value={demoPlan.lineup_source_label}
              subvalue={
                startTime
                  ? `Epoch 0 starts at ${inputValueToCompactTime(startTime)}`
                  : "Apriso Export of Production Schedule"
              }
            />
          </div>
        </section>

        <aside className="anticipation-plan-panel">
          <div className="anticipation-plan-card">
            <h3>Material Handling Release Schedule Graph</h3>
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
                <div>{concurrentAssignmentsLimit}</div>
              </div>
              <div className="meta">
                <div className="label">ANTICIPATION HORIZON</div>
                <div>{forecastLabelToMinutes(forecastLength)} min</div>
              </div>
              <div className="meta">
                <div className="label">Release Horizon</div>
                <div>{releaseLabelToMinutes(releaseHorizon)} min</div>
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

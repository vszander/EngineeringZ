/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import "./mhsa_home.css"; // reusing your established look
import MapOverlay from "/src/components/map/MapOverlay";
import { MapNavProvider, useMapNav } from "/src/components/map/MapNavContext";

// NEW (we’ll add this file next)
import { buildIconsFromCockpitSummary } from "/src/components/map/cockpit_map_icons";

const backendBase = import.meta.env.VITE_BACKEND_URL;

// Evans default (same as Search.jsx for now)
const DEFAULT_MAP_LAYER_ID = "87403789-d602-4382-8ba1-130efb74dbd2";

export default function CockpitPage() {
  return (
    <MapNavProvider initialLayerId={DEFAULT_MAP_LAYER_ID}>
      <CockpitInner />
    </MapNavProvider>
  );
}

function CockpitInner() {
  const { mapLayerId } = useMapNav();

  // --- core “architecture spine” ---
  const [selection, setSelection] = useState({
    kind: null, // "container" | "cart" | "cartpod" | "location" | "part"
    id: null,
    summary: null,
    details: null,
  });

  const [mode, setMode] = useState("inspect"); // "inspect" | "move_container" | "snap_preferred" | ...

  // --- map layer + summary model ---
  const [maplayer, setMaplayer] = useState(null);
  const [mapImageSrc, setMapImageSrc] = useState(
    "/images/clubcar/darkcarbackground.jpg",
  );

  const [summaryModel, setSummaryModel] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // 1) load MapLayer (same contract you already use in Search.jsx)
  useEffect(() => {
    if (!mapLayerId) return;
    const url = `${backendBase}/mhsa/maplayer/${mapLayerId}/`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`MapLayer HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        setMaplayer(j);
        if (j?.image_uri) setMapImageSrc(`${j.image_uri}?layer=${j.id}`);
      })
      .catch((e) => {
        console.warn("MapLayer fetch failed:", e);
      });
  }, [backendBase, mapLayerId]);

  // 2) load “summary” (fast, light payload; no meta_json drill-down)
  //    You can point this at a real endpoint later.
  useEffect(() => {
    if (!mapLayerId) return;

    let cancelled = false;
    async function loadSummary() {
      try {
        setLoadingSummary(true);
        setSummaryError(null);

        // Placeholder endpoint (we’ll align to whatever you choose)
        // Expected to return containers/carts/locations/pods already filtered or filterable by layer.
        const url = `${backendBase}/mhsa/cockpit/summary?map_layer_id=${encodeURIComponent(mapLayerId)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Summary HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;
        setSummaryModel(data);
      } catch (e) {
        if (cancelled) return;
        setSummaryError(String(e?.message || e));
        setSummaryModel(null);
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [backendBase, mapLayerId]);

  // 3) build icons from summary
  const icons = useMemo(() => {
    return buildIconsFromCockpitSummary(summaryModel, mapLayerId);
  }, [summaryModel, mapLayerId]);

  // 4) icon click → sets selection (details can lazy-load later)
  const onIconClick = (icon) => {
    setMode("inspect");
    setSelection({
      kind: icon?.kind || null,
      id: icon?.entityId || null,
      summary: icon?.summary || null,
      details: null, // details fetched lazily later
    });
  };

  // --- UI: right rail tabs ---
  const [tab, setTab] = useState("overview"); // overview | contents | actions | history | meta

  const rightCard = (
    <aside className="mhsa-aside">
      <div className="mhsa-card">
        <div className="mhsa-card__header">
          <div style={{ opacity: 0.7, fontSize: 12 }}>Cockpit</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {selection?.kind ? `${selection.kind}` : "No selection"}
          </div>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            {selection?.id ? String(selection.id) : "Click an icon on the map."}
          </div>
        </div>

        <div className="mhsa-tabs">
          <button
            className={tab === "overview" ? "mhsa-tab active" : "mhsa-tab"}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            className={tab === "contents" ? "mhsa-tab active" : "mhsa-tab"}
            onClick={() => setTab("contents")}
            disabled={!selection?.kind}
          >
            Contents
          </button>
          <button
            className={tab === "actions" ? "mhsa-tab active" : "mhsa-tab"}
            onClick={() => setTab("actions")}
            disabled={!selection?.kind}
          >
            Actions
          </button>
          <button
            className={tab === "history" ? "mhsa-tab active" : "mhsa-tab"}
            onClick={() => setTab("history")}
            disabled={!selection?.kind}
          >
            History
          </button>
          <button
            className={tab === "meta" ? "mhsa-tab active" : "mhsa-tab"}
            onClick={() => setTab("meta")}
            disabled={!selection?.kind}
            title="Drill-down only"
          >
            Meta
          </button>
        </div>

        <div className="mhsa-card__body">
          {loadingSummary && (
            <div style={{ opacity: 0.7 }}>Loading cockpit summary…</div>
          )}
          {summaryError && (
            <div style={{ color: "salmon" }}>
              Summary error: {summaryError}
              <div style={{ opacity: 0.7, marginTop: 6 }}>
                (This is expected until the summary endpoint exists.)
              </div>
            </div>
          )}

          {tab === "overview" && (
            <OverviewPanel selection={selection} mode={mode} />
          )}

          {tab === "contents" && (
            <div style={{ opacity: 0.8 }}>
              Contents panel placeholder (container contents / cart pods grid).
            </div>
          )}

          {tab === "actions" && (
            <ActionsPanel selection={selection} mode={mode} setMode={setMode} />
          )}

          {tab === "history" && (
            <div style={{ opacity: 0.8 }}>
              History placeholder (future timeline driven by MhsaEvent).
            </div>
          )}

          {tab === "meta" && (
            <div style={{ opacity: 0.8 }}>
              Meta drill-down placeholder (only loaded on demand).
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="mhsa-page mhsa-home">
      <main className="mhsa-main">
        <section className="mhsa-left">
          <MapOverlay
            mapImageSrc={mapImageSrc}
            icons={icons}
            onIconClick={onIconClick}
            fitMode="width"
          />
          {/* Optional: a small footer/status line */}
          <div style={{ padding: 10, opacity: 0.65, fontSize: 12 }}>
            Layer: {maplayer?.name || mapLayerId || "—"} · Icons:{" "}
            {icons?.length || 0}
          </div>
        </section>

        {rightCard}
      </main>
    </div>
  );
}

function OverviewPanel({ selection, mode }) {
  if (!selection?.kind) {
    return <div style={{ opacity: 0.7 }}>Click an icon to begin.</div>;
  }
  return (
    <div>
      <div style={{ marginBottom: 8, opacity: 0.7 }}>
        Mode: <b>{mode}</b>
      </div>
      <pre style={{ whiteSpace: "pre-wrap", opacity: 0.85 }}>
        {JSON.stringify(selection?.summary || {}, null, 2)}
      </pre>
    </div>
  );
}

function ActionsPanel({ selection, mode, setMode }) {
  if (!selection?.kind) return <div style={{ opacity: 0.7 }}>No actions.</div>;

  const isContainer = selection.kind === "container";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {!isContainer && (
        <div style={{ opacity: 0.7 }}>
          (Actions will depend on selection type; container moves are first.)
        </div>
      )}

      {isContainer && (
        <>
          <button
            className="mhsa-btn"
            onClick={() => setMode("move_container")}
          >
            Move Container…
          </button>
          <button
            className="mhsa-btn"
            onClick={() => setMode("snap_preferred")}
          >
            Snap to Preferred Location…
          </button>
          <button className="mhsa-btn" onClick={() => setMode("snap_open_pod")}>
            Snap to Cart Open Pod…
          </button>
          <button
            className="mhsa-btn"
            onClick={() => setMode("create_location")}
          >
            Create New Location…
          </button>
        </>
      )}

      <div style={{ opacity: 0.7, marginTop: 6 }}>
        (These buttons will open SWAL / modal flows once endpoints are wired.)
      </div>
    </div>
  );
}

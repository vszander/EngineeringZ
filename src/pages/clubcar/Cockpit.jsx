/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import "./mhsa_home.css";
import "./mhsa_mapping.css";

import MapOverlay from "/src/components/map/MapOverlay";
import { MapNavProvider, useMapNav } from "/src/components/map/MapNavContext";

const backendBase = import.meta.env.VITE_BACKEND_URL;
const DEFAULT_MAP_LAYER_ID = "87403789-d602-4382-8ba1-130efb74dbd2"; // Evans

export default function CockpitPage() {
  return (
    <MapNavProvider initialLayerId={DEFAULT_MAP_LAYER_ID}>
      <CockpitInner />
    </MapNavProvider>
  );
}

function CockpitInner() {
  const { mapLayerId } = useMapNav();

  const [selection, setSelection] = useState({
    kind: null,
    id: null,
    summary: null,
    details: null,
  });

  const [mode, setMode] = useState("inspect");
  const [tab, setTab] = useState("overview");

  const [maplayer, setMaplayer] = useState(null);
  const [mapImageSrc, setMapImageSrc] = useState(
    "/images/clubcar/darkcarbackground.jpg",
  );

  const [summaryModel, setSummaryModel] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // MapLayer
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
      .catch((e) => console.warn("MapLayer fetch failed:", e));
  }, [mapLayerId]);

  // Summary
  useEffect(() => {
    if (!mapLayerId) return;

    let cancelled = false;

    async function loadSummary() {
      try {
        setLoadingSummary(true);
        setSummaryError(null);

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
  }, [mapLayerId]);

  // Icons: prefer backend-provided icons, else build minimal
  const icons = useMemo(() => {
    if (!summaryModel) return [];

    // ✅ If your endpoint already returns { icons: [...] }, use it.
    if (Array.isArray(summaryModel.icons) && summaryModel.icons.length) {
      return summaryModel.icons;
    }

    // Fallback: build from containers/carts if present
    const out = [];

    for (const c of summaryModel?.containers || []) {
      if (c?.x_px == null || c?.y_px == null) continue;
      const subtype = String(
        c.container_type || c.container_subtype || "unknown",
      )
        .trim()
        .toLowerCase();

      out.push({
        key: c.id,
        kind: "container",
        entityId: c.id,
        title: subtype || "container",
        x_px: c.x_px,
        y_px: c.y_px,
        iconClass: `mi-container mi-container--${subtype || "unknown"}`,
        summary: c,
      });
    }

    for (const cart of summaryModel?.carts || []) {
      if (cart?.x_px == null || cart?.y_px == null) continue;
      const code = String(cart.carttype_code || cart.code || "unknown").trim();

      out.push({
        key: cart.id,
        kind: "cart",
        entityId: cart.id,
        title: code || "cart",
        x_px: cart.x_px,
        y_px: cart.y_px,
        iconClass: `mi-cart mi-cart--${code || "unknown"}`,
        summary: cart,
      });
    }

    return out;
  }, [summaryModel]);

  const onIconClick = (icon) => {
    setMode("inspect");
    setSelection({
      kind: icon?.kind || null,
      id: icon?.entityId || null,
      summary: icon?.summary || null,
      details: null,
    });
    setTab("overview");
  };

  return (
    <div className="mhsa-page mhsa-home">
      <main className="mhsa-main">
        <section className="mhsa-left">
          <div className="mhsa-results">
            <div className="mhsa-results-header">
              <h3>Cockpit</h3>
              <div className="mhsa-results-meta mhsa-dim">
                {maplayer?.name || mapLayerId || "—"} · Icons: {icons.length}
              </div>
            </div>

            <div className="mhsa-results-body">
              <div className="mhsa-map-stage">
                <MapOverlay
                  mapImageSrc={mapImageSrc}
                  icons={icons}
                  onIconClick={onIconClick}
                  fitMode="width"
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="mhsa-aside">
          <div className="mhsa-card">
            <div className="mhsa-card__header">
              <div style={{ opacity: 0.7, fontSize: 12 }}>Cockpit</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {selection?.kind ? `${selection.kind}` : "No selection"}
              </div>
              <div style={{ opacity: 0.7, marginTop: 4 }}>
                {selection?.id
                  ? String(selection.id)
                  : "Click an icon on the map."}
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
                    (Expected until the summary endpoint is stable.)
                  </div>
                </div>
              )}

              {tab === "overview" && (
                <OverviewPanel selection={selection} mode={mode} />
              )}
              {tab === "contents" && (
                <div style={{ opacity: 0.8 }}>
                  Contents placeholder (container contents / cart pods grid).
                </div>
              )}
              {tab === "actions" && (
                <ActionsPanel
                  selection={selection}
                  mode={mode}
                  setMode={setMode}
                />
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
      </main>
    </div>
  );
}

function OverviewPanel({ selection, mode }) {
  if (!selection?.kind)
    return <div style={{ opacity: 0.7 }}>Click an icon to begin.</div>;
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
          (Actions depend on selection type; container moves are first.)
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
        (These will become SWAL/modal flows once endpoints are wired.)
      </div>
    </div>
  );
}

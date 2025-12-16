// TODO: add Navbar and router links once layout is finalized

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
// import Navbar from "../../components/Navbar"; // uncomment when ready

export default function TuggerMap() {
  const backendURL = "http://localhost:8000"; // optional convenience link

  // ✅ Hooks must live INSIDE the component
  const [mapLayer, setMapLayer] = useState(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/mhsa/maplayer/evans")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMapLayer({
          id: data.id,
          name: data.name,
          src: data.image_uri,
          widthPx: data.pixel_width,
          heightPx: data.pixel_height,
          scale: data.px_to_real_scale,
          unit: data.scale_unit,
        });
        setLoadingMap(false);
      })
      .catch((err) => {
        console.error("Failed to load map layer:", err);
        setMapError(err.message);
        setLoadingMap(false);
      });
  }, []);

  // request position changes
  useEffect(() => {
    if (!mapLayer) return;

    const tick = () => {
      fetch(`http://localhost:8000/mhsa/positions?map_layer_id=${mapLayer.id}`)
        .then((r) => r.json())
        .then((bundle) => {
          // bundle.positions: [{id, x_px, y_px, heading_deg, source}]
          // Update “target” positions keyed by id
          // (Your animation loop can lerp current → target)
        })
        .catch(console.error);
    };

    tick(); // immediate
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mapLayer]);

  // Temporary tugger state (we’ll swap to polling later)
  const [tugger, setTugger] = useState({
    label: "T12",
    x: 200,
    y: 300,
    heading_deg: 90,
  });

  // Keep marker inside map bounds (prevents “lost offscreen” confusion)
  const clamped = useMemo(() => {
    const w = mapLayer?.widthPx ?? 864;
    const h = mapLayer?.heightPx ?? 1076;
    const x = Math.max(0, Math.min(w, tugger.x ?? 0));
    const y = Math.max(0, Math.min(h, tugger.y ?? 0));
    return { ...tugger, x, y };
  }, [tugger, mapLayer]);

  if (loadingMap) {
    return <div style={{ padding: 16 }}>Loading map layer…</div>;
  }

  if (mapError) {
    return (
      <div style={{ padding: 16, color: "crimson" }}>
        Failed to load map layer: {mapError}
      </div>
    );
  }

  if (!mapLayer) {
    return <div style={{ padding: 16 }}>No map layer available.</div>;
  }

  return (
    <>
      {/* <Navbar /> */}

      <div style={styles.page}>
        {/* Header row */}
        <div style={styles.headerRow}>
          <div style={styles.headerLeft}>
            <h2 style={styles.h2}>MHSA Tugger Map</h2>
            <span style={styles.sep}>|</span>
            <span style={styles.meta}>
              MapLayer: <strong>{mapLayer.name}</strong>
            </span>
          </div>

          <div style={styles.headerRight}>
            <Link to="/" style={styles.link}>
              ← Home
            </Link>
            <a
              href={backendURL}
              target="_blank"
              rel="noreferrer"
              style={styles.link}
            >
              Backend
            </a>
          </div>
        </div>

        {/* Main layout */}
        <div style={styles.grid}>
          {/* MAP AREA */}
          <section style={styles.mapCard}>
            {/* viewport: fixed “window” with scrollbars */}
            <div style={styles.mapViewport}>
              {/* fixed-size stage */}
              <div
                style={{
                  ...styles.mapStage,
                  width: mapLayer.widthPx,
                  height: mapLayer.heightPx,
                }}
              >
                <img
                  src={mapLayer.src}
                  alt={mapLayer.name}
                  draggable={false}
                  style={styles.mapImg}
                />

                {/* Tugger overlay */}
                <button
                  type="button"
                  title={`${clamped.label} @ (${clamped.x}, ${clamped.y})`}
                  onClick={() => {
                    alert(
                      `${clamped.label} clicked\nx=${clamped.x}, y=${
                        clamped.y
                      }\nheading=${clamped.heading_deg ?? 0}`
                    );
                  }}
                  style={{
                    ...styles.markerBtn,
                    left: clamped.x,
                    top: clamped.y,
                    transform: `translate(-50%, -50%) rotate(${
                      clamped.heading_deg ?? 0
                    }deg)`,
                  }}
                >
                  <img
                    src="/images/clubcar/Tugger.png"
                    alt="Tugger"
                    draggable={false}
                    style={styles.markerImg}
                  />
                </button>
              </div>
            </div>

            {/* Optional mini footer under the map */}
            <div style={styles.mapFooter}>
              <span style={styles.footerText}>
                Map size: {mapLayer.widthPx}×{mapLayer.heightPx}px • Scroll to
                pan
              </span>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={styles.smallBtn}
                  onClick={() =>
                    setTugger((t) => ({
                      ...t,
                      x: 200,
                      y: 300,
                      heading_deg: 90,
                    }))
                  }
                >
                  Reset
                </button>
                <button
                  type="button"
                  style={styles.smallBtn}
                  onClick={() =>
                    setTugger((t) => ({ ...t, x: t.x + 20, y: t.y + 10 }))
                  }
                >
                  Nudge
                </button>
              </div>
            </div>
          </section>

          {/* INFO PANEL */}
          <aside style={styles.infoCard}>
            <div style={styles.sticky}>
              <h3 style={styles.h3}>Information Panel</h3>

              <div style={styles.infoBody}>
                <div style={styles.infoRow}>
                  <strong>Selected Asset:</strong> {clamped.label}
                </div>

                <div style={styles.infoRow}>
                  <strong>Position (px):</strong> {clamped.x}, {clamped.y}
                </div>

                <div style={styles.infoRow}>
                  <strong>Heading:</strong> {clamped.heading_deg ?? 0}°
                </div>

                <div style={styles.infoRow}>
                  <strong>MapLayer:</strong> {mapLayer.name}
                </div>

                <div style={styles.infoRow}>
                  <strong>Scale:</strong> {mapLayer.scale} {mapLayer.unit} / px
                </div>

                <hr style={styles.hr} />

                <div style={styles.muted}>
                  Future wiring:
                  <ul style={styles.ul}>
                    <li>Polling or WebSocket/SSE updates x/y</li>
                    <li>Backend selects current mapLayer + image_uri</li>
                    <li>Query tugger train: carts/pods/containers</li>
                    <li>Hover/click actions & detail drawer</li>
                  </ul>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
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
  headerLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 320 },
  headerRight: {
    marginLeft: "auto",
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  h2: { margin: 0, fontSize: 20 },
  h3: { margin: "0 0 10px 0", fontSize: 16 },
  sep: { opacity: 0.6 },
  meta: { opacity: 0.85, fontSize: 14 },
  link: { textDecoration: "none", fontSize: 14 },

  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(520px, 1fr) 360px",
    gap: 14,
    alignItems: "start",
  },

  mapCard: {
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 12,
    background: "rgba(0,0,0,0.02)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  mapViewport: {
    height: "calc(100vh - 170px)",
    minHeight: 520,
    overflow: "auto",
  },

  mapStage: { position: "relative", background: "white" },

  mapImg: {
    display: "block",
    width: "100%",
    height: "100%",
    userSelect: "none",
    pointerEvents: "none",
  },

  markerBtn: {
    position: "absolute",
    width: 36,
    height: 36,
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  markerImg: {
    width: "100%",
    height: "100%",
    display: "block",
    pointerEvents: "none",
  },

  mapFooter: {
    borderTop: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.9)",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  footerText: { fontSize: 12, opacity: 0.75 },

  smallBtn: {
    border: "1px solid rgba(0,0,0,0.2)",
    background: "white",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 13,
  },

  infoCard: {
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 12,
    padding: 14,
    background: "white",
  },

  sticky: { position: "sticky", top: 12 },

  infoBody: { fontSize: 14, lineHeight: 1.45 },
  infoRow: { marginBottom: 10 },

  hr: { margin: "14px 0" },

  muted: { opacity: 0.75 },
  ul: { marginTop: 8, paddingLeft: 18 },
};

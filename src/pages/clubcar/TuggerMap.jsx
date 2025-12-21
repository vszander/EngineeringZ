import { useEffect, useMemo, useRef, useState } from "react";

import { Link } from "react-router-dom";
// import Navbar from "../../components/Navbar"; // uncomment when ready

// const backendBase = "http://localhost:8000";

const backendBase = import.meta.env.VITE_BACKEND_URL;
const backendURL = backendBase;

export default function TuggerMap() {
  //{
  //  `${backendURL}/storefront/product_list/`;
  //}

  // Step 2 bootstrap state
  const [mapLayer, setMapLayer] = useState(null);
  const [assetsById, setAssetsById] = useState({}); // static-ish asset dataset by UUID
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [infoPanelHtml, setInfoPanelHtml] = useState(
    "<div style='opacity:0.7'>Click a cart to view details.</div>"
  );

  // Live pose state: current (rendered) + target (from backend)
  const [poseById, setPoseById] = useState({}); // { [id]: { x, y, heading } }
  const [prevPoseById, setPrevPoseById] = useState({});
  const lastPoseRef = useRef({});
  //const cartUuid = "9c5d1788-e15e-42dd-97ad-01317bd42dc8";

  //const [selectedCartId, setSelectedCartId] = useState(null);

  const targetPoseRef = useRef({}); // mutable targets (no rerender spam)

  // UI state
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [lastBundleTs, setLastBundleTs] = useState(null);

  // --- Step 2: Bootstrap (map layer + objects) ---
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        setLoading(true);
        setBootError(null);

        const res = await fetch(`${backendBase}/mhsa/bootstrap`);
        if (!res.ok) throw new Error(`bootstrap HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        // MapLayer
        const ml = data.map_layer;
        setMapLayer({
          id: ml.id,
          name: ml.name,
          src: ml.image_uri,
          widthPx: ml.pixel_width,
          heightPx: ml.pixel_height,
          rotationDeg: ml.rotation_deg ?? 0,
          meta: ml.meta_json ?? {},
        });

        // Assets dataset
        const nextAssetsById = {};
        const nextPoseById = {};
        const assets = data?.objects?.assets ?? [];

        for (const a of assets) {
          nextAssetsById[a.id] = a;

          // Seed pose for rendering (0,0 if unknown)
          nextPoseById[a.id] = {
            x: 0,
            y: 0,
            heading: 0,
          };

          // Seed target too
          targetPoseRef.current[a.id] = {
            x: 0,
            y: 0,
            heading: 0,
          };
        }

        setAssetsById(nextAssetsById);
        setPoseById(nextPoseById);

        // Auto-select first tugger if present
        const firstTugger =
          assets.find((a) => a.asset_type === "tugger") || assets[0];
        setSelectedAssetId(firstTugger ? firstTugger.id : null);

        setLoading(false);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setBootError(err.message);
          setLoading(false);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [backendBase]);

  // --- Step 3: Poll positions bundle (1 Hz) ---
  useEffect(() => {
    if (!mapLayer?.id) return;

    let cancelled = false;

    async function tick() {
      try {
        const url = `${backendBase}/mhsa/positions?map_layer_id=${encodeURIComponent(
          mapLayer.id
        )}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`positions HTTP ${res.status}`);
        const bundle = await res.json();
        if (cancelled) return;

        setLastBundleTs(bundle.ts ?? null);

        // ✅ Snapshot the previous rendered pose ONCE PER BUNDLE (1Hz)
        setPrevPoseById(lastPoseRef.current);

        const updates = bundle.positions ?? [];
        // Update targets only; animation loop will smoothly move rendered pose toward targets
        for (const p of updates) {
          targetPoseRef.current[p.id] = {
            x: p.x_px ?? 0,
            y: p.y_px ?? 0,
            heading: p.heading_deg ?? 0,
          };
        }
      } catch (err) {
        console.error("positions poll failed:", err);
      }
    }

    // fire immediately, then 1Hz
    tick();
    const id = setInterval(tick, 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [backendBase, mapLayer?.id]);

  // --- Animation loop: smooth current pose toward target pose ---
  // Also captures prevPoseById correctly for “trail” rendering (cart behind tugger).
  useEffect(() => {
    if (!mapLayer?.id) return;

    let raf = 0;
    let last = performance.now();

    // smoothing factor: higher = snappier
    // At 1Hz updates, ~6–10 feels good
    const smooth = 8.0;

    const step = (now) => {
      const dt = Math.max(0.001, (now - last) / 1000.0);
      last = now;

      setPoseById((prev) => {
        let changed = false;
        const next = { ...prev };

        const a = 1 - Math.exp(-smooth * dt);

        for (const id of Object.keys(targetPoseRef.current)) {
          const cur = prev[id] ?? { x: 0, y: 0, heading: 0 };
          const tgt = targetPoseRef.current[id] ?? { x: 0, y: 0, heading: 0 };

          const nx = cur.x + (tgt.x - cur.x) * a;
          const ny = cur.y + (tgt.y - cur.y) * a;

          // shortest-angle interpolation for heading
          const ch = cur.heading ?? 0;
          const th = tgt.heading ?? 0;
          const diff = ((th - ch + 540) % 360) - 180; // [-180, 180]
          const nh = (ch + diff * a + 360) % 360;

          if (
            Math.abs(nx - cur.x) > 0.05 ||
            Math.abs(ny - cur.y) > 0.05 ||
            Math.abs(nh - ch) > 0.05
          ) {
            next[id] = { x: nx, y: ny, heading: nh };
            changed = true;
          }
        }

        // Commit "this frame" as the last pose for the next frame
        // IMPORTANT: set this to the new object we return (or prev if unchanged)
        lastPoseRef.current = changed ? next : prev;

        return changed ? next : prev;
      });

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mapLayer?.id, setPoseById, setPrevPoseById]);

  // Guards
  if (loading) return <div style={{ padding: 16 }}>Loading bootstrap…</div>;
  if (bootError)
    return (
      <div style={{ padding: 16, color: "crimson" }}>
        Bootstrap failed: {bootError}
      </div>
    );
  if (!mapLayer)
    return <div style={{ padding: 16 }}>No map layer available.</div>;

  // Helpers
  const selectedAsset = selectedAssetId ? assetsById[selectedAssetId] : null;
  const selectedPose = selectedAssetId ? poseById[selectedAssetId] : null;

  // Keep markers inside map bounds (so you never lose them)
  const clampPose = (pose) => {
    const x = Math.max(0, Math.min(mapLayer.widthPx, pose?.x ?? 0));
    const y = Math.max(0, Math.min(mapLayer.heightPx, pose?.y ?? 0));
    const heading = pose?.heading ?? 0;
    return { x, y, heading };
  };

  return (
    <>
      {/* <Navbar /> */}

      <div style={styles.page}>
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

        <div style={styles.grid}>
          {/* MAP */}
          <section style={styles.mapCard}>
            <div style={styles.mapViewport}>
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

                {/* Render all assets as overlays */}
                {Object.keys(assetsById).map((id) => {
                  const a = assetsById[id];
                  const prevPose = clampPose(prevPoseById[id] ?? poseById[id]); // <-- use prev if exists, else current

                  const isSelected = id === selectedAssetId;

                  // For now: render only tugger icon; later: carts/pods as divs
                  if (a.asset_type !== "tugger") return null;

                  const pose = clampPose(poseById[id]);

                  //  const isSelected = id === selectedAssetId;

                  // Basic cart style (tune sizes later)
                  const cartW = 62;
                  const cartH = 42;
                  const cartRadius = 12;

                  return (
                    <div key={id}>
                      {/* CART (trail) */}
                      <div
                        title={`${a.name} cart`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoPanelHtml("");

                          fetch(
                            `http://localhost:8000/mhsa/cart/9c5d1788-e15e-42dd-97ad-01317bd42dc8/panel`
                          )
                            .then((r) => {
                              if (!r.ok) throw new Error(`HTTP ${r.status}`);
                              return r.text();
                            })
                            .then((html) => {
                              setInfoPanelHtml(html);
                              // alert("Cart panel loaded"); // optional
                            })
                            .catch((err) => {
                              console.error("Cart panel fetch failed:", err);
                              alert("Failed to load cart panel (see console)");
                            });
                        }}
                        style={{
                          position: "absolute",
                          left: prevPose.x,
                          top: prevPose.y,
                          width: cartW,
                          height: cartH,
                          transform: "translate(-50%, -50%)",
                          borderRadius: cartRadius,
                          background: "rgba(255,255,255,0.92)",
                          border: "2px solid rgba(0,0,0,0.35)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                          zIndex: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          opacity: 0.95,
                          cursor: "pointer", // ✅ obvious click target
                          userSelect: "none",
                          //pointerEvents: "none", // cart doesn't intercept clicks
                        }}
                      >
                        CART-01
                      </div>

                      {/* TUGGER */}
                      <button
                        type="button"
                        title={`${a.name} @ (${Math.round(
                          pose.x
                        )}, ${Math.round(pose.y)})`}
                        onClick={() => {
                          setSelectedAssetId(id);
                          setInfoPanelHtml(""); // <-- clear cart panel so default panel shows again
                        }}
                        style={{
                          ...styles.markerBtn,
                          left: pose.x,
                          top: pose.y,
                          transform: `translate(-50%, -50%) rotate(${pose.heading}deg)`,
                          outline: isSelected
                            ? "2px solid rgba(20,141,151,0.7)"
                            : "none",
                          borderRadius: 10,
                          zIndex: 6, // above cart
                        }}
                      >
                        <img
                          src="/images/clubcar/Tugger.png"
                          alt={a.name}
                          draggable={false}
                          style={styles.markerImg}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.mapFooter}>
              <span style={styles.footerText}>
                Map: {mapLayer.widthPx}×{mapLayer.heightPx}px • Bundle:{" "}
                {lastBundleTs ? lastBundleTs : "—"}
              </span>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={styles.smallBtn}
                  onClick={() => {
                    // Re-bootstrap (useful while iterating)
                    window.location.reload();
                  }}
                >
                  Reload
                </button>
              </div>
            </div>
          </section>

          {/* INFO */}
          <aside style={styles.infoCard}>
            <div style={styles.sticky}>
              {infoPanelHtml ? (
                // CART (or other) HTML fragment replaces the whole panel
                <div dangerouslySetInnerHTML={{ __html: infoPanelHtml }} />
              ) : (
                // Default static panel
                <>
                  <h3 style={styles.h3}>Information Panel</h3>

                  {!selectedAsset ? (
                    <div style={{ opacity: 0.75 }}>No asset selected.</div>
                  ) : (
                    <div style={styles.infoBody}>
                      <div style={styles.infoRow}>
                        <strong>Selected Asset:</strong> {selectedAsset.name}
                      </div>
                      <div style={styles.infoRow}>
                        <strong>Asset UUID:</strong>{" "}
                        <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                          {selectedAsset.id}
                        </span>
                      </div>
                      <div style={styles.infoRow}>
                        <strong>Type:</strong> {selectedAsset.asset_type}
                      </div>
                      <div style={styles.infoRow}>
                        <strong>Mode:</strong>{" "}
                        {selectedAsset.operating_mode ?? "—"}
                      </div>

                      <hr style={styles.hr} />

                      <div style={styles.infoRow}>
                        <strong>Position (px):</strong>{" "}
                        {selectedPose
                          ? `${Math.round(selectedPose.x)}, ${Math.round(
                              selectedPose.y
                            )}`
                          : "—"}
                      </div>
                      <div style={styles.infoRow}>
                        <strong>Heading:</strong>{" "}
                        {selectedPose
                          ? `${Math.round(selectedPose.heading)}°`
                          : "—"}
                      </div>

                      <hr style={styles.hr} />

                      <div style={styles.muted}>
                        Next upgrades:
                        <ul style={styles.ul}>
                          <li>
                            Render carts/pods from bootstrap train scaffold
                          </li>
                          <li>
                            Apply events[] (attach/detach, UI instructions)
                          </li>
                          <li>SSE/WebSocket instead of polling</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}
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

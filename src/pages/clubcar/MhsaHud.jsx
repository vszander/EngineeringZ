import { useEffect, useMemo, useRef, useState } from "react";

import { Link } from "react-router-dom";
//import Navbar from "../../components/Navbar"; // uncomment when ready
import "../../components/mhsa.theme.clubcar.css"; // skin first
import "./mhsa_home.css"; // rename later to mhsa_base.css when you refactor
import "./mhsa_mapping.css";
import "./mhsa_hud_pulses.css";
import "../../components/map/mhsa_hud_pins.js";
import { initAiAsidePanel } from "../../components/map/mhsa_hud_ai_panel";

const backendBase = import.meta.env.VITE_BACKEND_URL; // import.meta.env.VITE_BACKEND_URL

export default function MhsaHud() {
  // Step 2 bootstrap state
  const [mapLayer, setMapLayer] = useState(null);
  const [assetsById, setAssetsById] = useState({}); // static-ish asset dataset by UUID
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [infoPanelHtml, setInfoPanelHtml] = useState(
    "<div style='opacity:0.7'>Click a cart to view details.</div>",
  );
  const [activeAsideMode, setActiveAsideMode] = useState("");

  // Live pose state: current (rendered) + target (from backend)
  const [poseById, setPoseById] = useState({}); // { [id]: { x, y, heading } }
  const [prevPoseById, setPrevPoseById] = useState({});
  const lastPoseRef = useRef({});
  //const cartUuid = "9c5d1788-e15e-42dd-97ad-01317bd42dc8";

  const targetPoseRef = useRef({}); // mutable targets (no rerender spam)

  // UI state
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [lastBundleTs, setLastBundleTs] = useState(null);
  // --- HUD events (scan pulses / blips) ---
  const [hudEvents, setHudEvents] = useState([]); // [{id, kind, x, y, ts, label, ackRequired, severity}]
  const seenHudEventIdsRef = useRef(new Set());

  const [selectedHudId, setSelectedHudId] = useState(null);
  const selectedHudEvent =
    hudEvents.find((x) => String(x.id) === String(selectedHudId)) ?? null;

  // Keep ~N seconds of HUD overlays
  const HUD_TTL_MS = 70_000;
  const viewportRef = useRef(null);
  const [stageScale, setStageScale] = useState(1);

  const infoCardRef = useRef(null);

  function pruneHudEvents(list) {
    const now = Date.now();
    return (list ?? []).filter((e) => {
      const tsMs = e?.created_at ? Date.parse(e.created_at) : 0;
      const decayMs = Number(e?.decay_ms ?? HUD_TTL_MS);
      if (!tsMs) return true; // if missing timestamp, keep briefly (or change to false)
      return now - tsMs <= decayMs;
    });
  }

  function addHudEvent(evt) {
    // Dedup by id (important when polling “recent”)
    if (evt?.id && seenHudEventIdsRef.current.has(evt.id)) return;
    if (evt?.id) seenHudEventIdsRef.current.add(evt.id);

    setHudEvents((prev) => pruneHudEvents([...(prev ?? []), evt]));
  }

  // If you don’t yet have a location→px mapping, this is the safe fallback:
  // place the pulse at the selected tugger position (still useful for FillCart demos).
  function fallbackXY() {
    const p = selectedPose ?? {
      x: mapLayer.widthPx * 0.5,
      y: mapLayer.heightPx * 0.5,
    };
    return { x: p.x, y: p.y };
  }

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 250); // 250ms smooth
    return () => clearInterval(id);
  }, []);

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

  // --- 2b  make sure map is stretchable  horizontally  ---
  useEffect(() => {
    if (!mapLayer?.widthPx) return;

    const el = viewportRef.current;
    if (!el) return;

    const compute = () => {
      // fit-to-width like cockpit
      const w = el.clientWidth || 1;
      setStageScale(w / mapLayer.widthPx);
    };

    compute();

    const ro = new ResizeObserver(compute);
    ro.observe(el);

    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [mapLayer?.widthPx]);

  // --- Step 3: Poll positions bundle (1 Hz) ---
  useEffect(() => {
    if (!mapLayer?.id) return;

    let cancelled = false;

    async function tick() {
      try {
        const url = `${backendBase}/mhsa/positions?map_layer_id=${encodeURIComponent(
          mapLayer.id,
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

  // --- Step 3b: Poll HUD events (scan pulses / blips) ---
  // --- Step 3b: Poll HUD events (scan pulses / blips) ---
  useEffect(() => {
    if (!mapLayer?.id) return;

    let cancelled = false;

    async function tickHud() {
      try {
        const url = `${backendBase}/mhsa/api/events/recent/?limit=30`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`hud events HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        //  console.log("fetch");

        const rows = data?.rows ?? [];

        for (const r of rows) {
          // only draw resolved events
          // draw if resolved flag is true OR coords exist
          const isResolved =
            r?.resolved === true ||
            (r?.x_px != null && r?.y_px != null && r?.map_layer_id);

          if (!isResolved) continue;

          //     console.log("resolved");

          // layer filter
          if (r.map_layer_id && String(r.map_layer_id) !== String(mapLayer.id))
            continue;

          // must have coords
          if (r.x_px == null || r.y_px == null) continue;
          //     console.log("coords");
          const stableId = r.id
            ? String(r.id)
            : `${r.created_at ?? "no-ts"}|${r.event_class ?? ""}|${r.event_type ?? ""}|${r.x_px ?? ""},${r.y_px ?? ""}|${r.label ?? ""}`;
          //     console.log("HUD row", r.id, r.created_at, r.label, r.x_px, r.y_px);
          // ✅ Store the backend row shape (snake_case) because your renderer expects it
          addHudEvent({
            //id: String(r.id),
            id: stableId,

            created_at: r.created_at ?? null,
            event_class: r.event_class ?? null,
            event_type: r.event_type ?? null,
            label: r.label ?? r.event_type ?? "event",

            x_px: Number(r.x_px),
            y_px: Number(r.y_px),
            map_layer_id: r.map_layer_id ?? null,
            resolved: true,
            ui_kind: r.ui_kind ?? "pulse",
            icon_url: r.icon_url ?? null,
            icon_w_px: r.icon_w_px ?? null,
            icon_anchor: r.icon_anchor ?? "center",
            ack_required: !!r.ack_required,

            pulse_color: r.pulse_color ?? "#148d97",
            pulse_radius: Number(
              r.pulse_radius ?? (r.ack_required ? 140 : 110),
            ),
            pulse_count: Number(r.pulse_count ?? 1),
            pulse_speed: r.pulse_speed ?? null,
            decay_ms: Number(r.decay_ms ?? 60000),
          });
        }

        // trim
        setHudEvents((prev) => pruneHudEvents(prev ?? []));
      } catch (err) {
        console.error("hud events poll failed:", err);
      }
    }

    tickHud();
    const id = setInterval(tickHud, 2000);

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

  //Zander
  useEffect(() => {
    function onSetInfoHtml(e) {
      const html = e?.detail?.html || "";
      if (!html) return;
      setInfoPanelHtml(html);
    }

    window.addEventListener("mhsa:hud:setInfoHtml", onSetInfoHtml);
    return () =>
      window.removeEventListener("mhsa:hud:setInfoHtml", onSetInfoHtml);
  }, []);

  useEffect(() => {
    function onClick(e) {
      const btn = e.target.closest(
        ".mhsa-hud-aside-actions button[data-event-id]",
      );
      if (!btn) return;

      const eventId = btn.dataset.eventId;
      const mode = (btn.dataset.mode || btn.dataset.ui || "")
        .trim()
        .toLowerCase(); // supports your current template
      loadAside(eventId, mode).catch(console.error);
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendBase]);

  useEffect(() => {
    if (!infoPanelHtml) return;
    if (!infoCardRef.current) return;

    const mountEl = infoCardRef.current.querySelector("#mhsaHudAsideMount");
    if (!mountEl) {
      console.warn("[HUD] aside mount not found after render");
      return;
    }

    console.log("[HUD] infoPanelHtml mounted", {
      activeAsideMode,
      mountFound: !!mountEl,
      aiPanels: mountEl.querySelectorAll(".mhsa-ai-panel").length,
      sliders: mountEl.querySelectorAll(".mhsa-ai-slider").length,
    });

    initAsideMode(activeAsideMode, mountEl);
  }, [infoPanelHtml, activeAsideMode]);

  async function loadAside(eventId, mode = "") {
    const safeId = (eventId ?? "").toString().trim();
    if (!safeId || safeId === "undefined" || safeId === "null") {
      console.warn("[HUD] loadAside called with bad eventId", {
        eventId,
        mode,
      });
      return;
    }

    const safeMode = (mode ?? "").toString().trim().toLowerCase();

    const url = `${backendBase}/mhsa/api/events/pin-aside/${encodeURIComponent(safeId)}/?mode=${encodeURIComponent(safeMode)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/html" },
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Aside HTTP ${res.status}`);

    const html = await res.text();

    console.log("[HUD] aside html loaded", {
      eventId: safeId,
      mode: safeMode,
      htmlLength: html?.length || 0,
    });

    setActiveAsideMode(safeMode);
    setInfoPanelHtml(html);
  }

  function initAsideMode(mode, mountEl) {
    const m = (mode || "").toLowerCase();

    console.log("[HUD] initAsideMode", {
      mode: m,
      hasMountEl: !!mountEl,
      aiInitImported: typeof initAiAsidePanel === "function",
    });

    if (!mountEl) return;

    if (m === "ai") {
      const panelRoot = mountEl.querySelector(".mhsa-ai-panel");
      if (!panelRoot) {
        console.warn("[HUD] AI panel root not found in mounted aside");
        return;
      }

      console.log("[HUD] calling initAiAsidePanel", panelRoot);
      initAiAsidePanel(panelRoot);
      return;
    }

    // future modes:
    // if (m === "assign") initAssignAsidePanel(...);
    // if (m === "benign") initBenignAsidePanel(...);
    // if (m === "snooze") initSnoozeAsidePanel(...);
  }
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

      <div className="mhsaHudPage" style={styles.page}>
        <div style={styles.headerRow}>
          <div style={styles.headerLeft}>
            <h2 style={styles.h2}>MHSA Heads-Up Display (HUD)</h2>
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
              href={backendBase}
              target="_blank"
              rel="noreferrer"
              style={styles.link}
            >
              Backend
            </a>
          </div>
        </div>

        <div style={styles.grid}>
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              zIndex: 9999,
              color: "white",
              background: "rgba(0,0,0,0.6)",
              padding: "4px 6px",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            hudEvents: {hudEvents.length}
          </div>
          {/* MAP */}
          <section style={styles.mapCard}>
            <div ref={viewportRef} style={styles.mapViewport}>
              {/* This wrapper provides the *scaled* scroll height */}
              <div
                style={{
                  width: mapLayer.widthPx * stageScale,
                  height: mapLayer.heightPx * stageScale,
                  position: "relative",
                }}
              >
                {/* This keeps everything in native px coordinates, then scales */}
                <div
                  style={{
                    ...styles.mapStage,
                    width: mapLayer.widthPx,
                    height: mapLayer.heightPx,
                    transform: `scale(${stageScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <img
                    src={mapLayer.src}
                    alt={mapLayer.name}
                    draggable={false}
                    style={styles.mapImg}
                  />
                  {/* HUD Event Overlays (pulses/blips) */}
                  {hudEvents.map((e) => {
                    if (e.x_px == null || e.y_px == null) return null;

                    const size = e.pulse_radius ?? (e.ack_required ? 140 : 110);

                    const tsMs = e.created_at
                      ? Date.parse(e.created_at)
                      : nowMs;
                    const ageMs = Math.max(0, nowMs - tsMs);

                    // "sticky until ack" behavior for ack_required
                    const decayMs = e.ack_required
                      ? 60 * 60 * 1000
                      : (e.decay_ms ?? 60000);
                    const t = Math.min(1, ageMs / decayMs);

                    const k = 4;
                    const ghostOpacity = Math.exp(-k * t);

                    const pulseColor = e.pulse_color ?? "#148d97";

                    const isPin = e.ui_kind === "pin";

                    // Cache-bust GIF per pin instance so each one restarts its animation.
                    // e.id can include pipes/commas (your stableId), so encode it.
                    const iconUrl =
                      isPin && e.icon_url
                        ? `${e.icon_url}${String(e.icon_url).includes("?") ? "&" : "?"}v=${encodeURIComponent(String(e.id))}`
                        : null;

                    // backend-driven sizing (recommended)
                    const iconW = Number(e.icon_w_px ?? 70);
                    const iconH = Number(e.icon_h_px ?? 80);
                    return (
                      <div
                        key={e.id}
                        // ✅ attributes used by mhsa_hud_pins.js
                        className={isPin ? "mhsa-pin-hit" : undefined}
                        data-mhsa-pin={isPin ? "1" : undefined}
                        data-event-id={isPin ? String(e.id) : undefined}
                        title={e.label || e.event_type || "event"}
                        style={{
                          position: "absolute",
                          left: e.x_px,
                          top: e.y_px,

                          // ✅ PULSES centered on (x,y)
                          // ✅ PINS bottom-center anchored on (x,y) and wrapper HAS a real hitbox
                          transform: isPin
                            ? "translate(-50%, -100%)"
                            : "translate(-50%, -50%)",

                          // ✅ CRITICAL: give pins a real clickable box
                          width: isPin ? `${iconW}px` : size,
                          height: isPin ? `${iconH}px` : size,

                          zIndex: isPin ? 20 : 5,
                          pointerEvents: isPin ? "auto" : "none",
                          cursor: isPin ? "pointer" : "default",
                        }}
                        onClick={(evt) => {
                          if (!isPin) return;
                          evt.preventDefault();
                          evt.stopPropagation();

                          const eventId = evt.currentTarget?.dataset?.eventId;
                          if (!eventId) {
                            console.warn(
                              "[HUD] pin click missing data-event-id",
                              {
                                rowId: e?.id,
                                dataset: evt.currentTarget?.dataset,
                              },
                            );
                            return;
                          }

                          // ✅ NEW CONTRACT: pin click loads server fragment
                          loadAside(eventId, "").catch(console.error);
                        }}
                        onMouseDown={(evt) => {
                          if (!isPin) return;
                          evt.stopPropagation();
                        }}
                      >
                        {/* ✅ PINS (GIF) */}
                        {isPin && iconUrl ? (
                          <img
                            src={iconUrl}
                            alt=""
                            draggable="false"
                            className="mhsa-pin__img"
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "block",
                              pointerEvents: "none", // click goes to wrapper
                              userSelect: "none",
                            }}
                          />
                        ) : null}

                        {/* ✅ PULSES / BLIPS (only when NOT a pin) */}
                        {!isPin && (
                          <>
                            <div
                              className="mhsaHudGhost"
                              style={{
                                border: `2px solid ${pulseColor}33`,
                                boxShadow: `0 0 18px ${pulseColor}22`,
                                opacity: ghostOpacity,
                                pointerEvents: "none",
                              }}
                            />

                            <div
                              className={
                                e.ack_required
                                  ? "mhsaHudPulseAck"
                                  : "mhsaHudPulse"
                              }
                              style={{
                                "--pulse-color": pulseColor,
                                "--pulse-speed":
                                  e.pulse_speed ??
                                  (e.ack_required ? "0.9s" : "1.2s"),
                                "--pulse-count": e.pulse_count ?? 1,
                                pointerEvents: "none",
                              }}
                            />
                          </>
                        )}

                        {/* ✅ STICKY PIN (only when pin) */}
                        {isPin && iconUrl ? (
                          <div
                            className="mhsa-pin mhsa-pin--bottom-center"
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,

                              // hard demo sizing at this resolution
                              width: "70px",
                              height: "80px",

                              // bottom-center anchor at (x_px,y_px)
                              transform: "translate(-50%, -100%)",
                              pointerEvents: "none",
                            }}
                          >
                            <img
                              src={iconUrl}
                              alt=""
                              draggable={false}
                              className="mhsa-pin__img"
                              style={{
                                width: "70px",
                                height: "80px",
                                display: "block",
                                pointerEvents: "none",
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {/* ... your hudEvents + assets overlays stay EXACTLY as-is ... */}
                  {/* Render all assets as overlays */}
                  {Object.keys(assetsById).map((id) => {
                    const a = assetsById[id];
                    const prevPose = clampPose(
                      prevPoseById[id] ?? poseById[id],
                    );
                    const isSelected = id === selectedAssetId;

                    if (a.asset_type !== "tugger") return null;

                    const pose = clampPose(poseById[id]);

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
                              `${backendBase}/mhsa/cart/9c5d1788-e15e-42dd-97ad-01317bd42dc8/panel`,
                            )
                              .then((r) => {
                                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                                return r.text();
                              })
                              .then((html) => setInfoPanelHtml(html))
                              .catch((err) => {
                                console.error("Cart panel fetch failed:", err);
                                alert(
                                  "Failed to load cart panel (see console)",
                                );
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
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          CART-01
                        </div>

                        {/* TUGGER */}
                        <button
                          type="button"
                          title={`${a.name} @ (${Math.round(pose.x)}, ${Math.round(pose.y)})`}
                          onClick={() => {
                            setSelectedAssetId(id);
                            setInfoPanelHtml("");
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
                            zIndex: 6,
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
            </div>

            {/* footer unchanged */}
          </section>

          {/* INFO */}
          <aside style={styles.infoCard}>
            <div
              className="mhsaHudInfoCard"
              style={styles.sticky}
              ref={infoCardRef} // <-- NEW
            >
              <div id="mhsaHudAsideMount">
                {infoPanelHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: infoPanelHtml }} />
                ) : (
                  <>
                    <h3 style={styles.h3}>Information Panel</h3>
                    {!selectedAsset ? (
                      <div style={{ opacity: 0.75 }}>No asset selected.</div>
                    ) : (
                      <div style={styles.infoBody}>
                        {/* ... your existing static panel content ... */} This
                        is the Information Panel.
                      </div>
                    )}
                  </>
                )}
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
    background: "black",
  },

  sticky: { position: "sticky", top: 12 },

  infoBody: { fontSize: 14, lineHeight: 1.45 },
  infoRow: { marginBottom: 10 },

  hr: { margin: "14px 0" },

  muted: { opacity: 0.75 },
  ul: { marginTop: 8, paddingLeft: 18 },
};

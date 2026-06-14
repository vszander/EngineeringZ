/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./mhsa_home.css";
import "./mhsa_mapping.css";

import MapOverlay from "/src/components/map/MapOverlay";
import { MapNavProvider, useMapNav } from "/src/components/map/MapNavContext";

const backendBase = import.meta.env.VITE_BACKEND_URL;
const DEFAULT_MAP_LAYER_ID = "87403789-d602-4382-8ba1-130efb74dbd2"; // Evans

const TOPIC_CONTAINERS = "containers";
const TOPIC_ASSETS = "assets";

const DEFAULT_ASSET_FILTERS = {
  valet_vest: true,
  tugger: true,
  otr: true,
  yardtruck: true,
  reachtruck: true,
  transporter: true,
  forklift: true,
  agv: true,
  trailer: true,
  custom: true,
  online: true,
  offline: true,
  off_map: true,
};

const EMPTY_SELECTION = {
  kind: null,
  id: null,
  summary: null,
  details: null,
};

let csrfTokenCache = "";

async function getCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;

  const res = await fetch(`${backendBase}/mhsa/csrf/`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`CSRF token HTTP ${res.status}`);
  }

  const data = await res.json();
  csrfTokenCache = data?.csrfToken || "";

  if (!csrfTokenCache) {
    throw new Error("CSRF token was not returned by backend.");
  }

  return csrfTokenCache;
}

async function csrfHeaders(extra = {}) {
  const token = await getCsrfToken();

  return {
    ...extra,
    "X-CSRFToken": token,
  };
}

export default function CockpitPage() {
  return (
    <MapNavProvider initialLayerId={DEFAULT_MAP_LAYER_ID}>
      <CockpitInner />
    </MapNavProvider>
  );
}

function CockpitInner() {
  const mapNav = useMapNav();
  const mapLayerId = mapNav?.mapLayerId;
  const setMapLayerId = mapNav?.setMapLayerId || mapNav?.setLayerId || null;

  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [mode, setMode] = useState("inspect");

  // Top-level cockpit topic.
  const [topic, setTopic] = useState(TOPIC_CONTAINERS);

  // Right-aside selected-object tab.
  const [tab, setTab] = useState("overview");

  const [assetFilters, setAssetFilters] = useState(DEFAULT_ASSET_FILTERS);

  const [contentsModel, setContentsModel] = useState(null);
  const [loadingContents, setLoadingContents] = useState(false);
  const [contentsError, setContentsError] = useState(null);

  const [assetDetails, setAssetDetails] = useState(null);
  const [loadingAssetDetails, setLoadingAssetDetails] = useState(false);
  const [assetDetailsError, setAssetDetailsError] = useState(null);

  const [deviceTwin, setDeviceTwin] = useState(null);
  const [loadingDeviceTwin, setLoadingDeviceTwin] = useState(false);
  const [deviceTwinError, setDeviceTwinError] = useState(null);

  const [deviceCommands, setDeviceCommands] = useState(null);
  const [loadingDeviceCommands, setLoadingDeviceCommands] = useState(false);
  const [deviceCommandsError, setDeviceCommandsError] = useState(null);

  const [csrfToken, setCsrfToken] = useState("");
  const [csrfError, setCsrfError] = useState(null);

  const [maplayer, setMaplayer] = useState(null);
  const [mapImageSrc, setMapImageSrc] = useState(
    "/images/clubcar/darkcarbackground.jpg",
  );

  const [summaryModel, setSummaryModel] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const [leftPct, setLeftPct] = useState(() => {
    const stored = Number(localStorage.getItem("mhsaCockpitLeftPct"));
    if (Number.isFinite(stored) && stored >= 45 && stored <= 82) return stored;
    return 68;
  });

  const [assetListCardPos, setAssetListCardPos] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("mhsaCockpitAssetListCardPos"),
      );
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        return saved;
      }
    } catch {
      // ignore bad localStorage
    }

    return { x: 14, y: 14 };
  });

  const shellRef = useRef(null);
  const draggingRef = useRef(false);

  const assetListDragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 14,
    originY: 14,
  });

  const clearSelection = useCallback(() => {
    setSelection(EMPTY_SELECTION);
    setMode("inspect");
    setTab("overview");
    setContentsModel(null);
    setContentsError(null);
    setAssetDetails(null);
    setAssetDetailsError(null);
    setDeviceTwin(null);
    setDeviceTwinError(null);
    setDeviceCommands(null);
    setDeviceCommandsError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // CSRF bootstrap
  // ---------------------------------------------------------------------------
  const loadCsrfToken = useCallback(async () => {
    try {
      setCsrfError(null);

      const res = await fetch(`${backendBase}/csrf/`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error(`CSRF HTTP ${res.status}`);

      const data = await res.json();
      const token = data?.csrfToken || data?.csrf_token || "";

      if (!token) throw new Error("CSRF token missing from response.");

      setCsrfToken(token);
      return token;
    } catch (e) {
      const msg = String(e?.message || e);
      setCsrfError(msg);
      throw e;
    }
  }, []);

  useEffect(() => {
    loadCsrfToken().catch((e) => {
      console.warn("CSRF bootstrap failed:", e);
    });
  }, [loadCsrfToken]);

  // ---------------------------------------------------------------------------
  // MapLayer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapLayerId) return;

    let cancelled = false;

    async function loadMapLayer() {
      try {
        const url = `${backendBase}/mhsa/maplayer/${mapLayerId}/`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`MapLayer HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        setMaplayer(data);
        if (data?.image_uri) {
          setMapImageSrc(`${data.image_uri}?layer=${data.id}`);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("MapLayer fetch failed:", e);
        }
      }
    }

    loadMapLayer();

    return () => {
      cancelled = true;
    };
  }, [mapLayerId]);

  // ---------------------------------------------------------------------------
  // Cockpit summary
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapLayerId) return;

    let cancelled = false;

    async function loadSummary() {
      try {
        setLoadingSummary(true);
        setSummaryError(null);

        const url = `${backendBase}/mhsa/cockpit/summary?map_layer_id=${encodeURIComponent(
          mapLayerId,
        )}`;

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

  // ---------------------------------------------------------------------------
  // Container contents
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (tab !== "contents") return;

    if (selection?.kind !== "container" || !selection?.id) {
      setContentsModel(null);
      setContentsError(null);
      setLoadingContents(false);
      return;
    }

    let cancelled = false;

    async function loadContents() {
      try {
        setLoadingContents(true);
        setContentsError(null);

        const url = `${backendBase}/mhsa/cockpit/container/contents?container_id=${encodeURIComponent(
          selection.id,
        )}`;

        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Contents HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;
        if (!data?.ok) throw new Error(data?.error || "Contents failed");

        setContentsModel(data);
      } catch (e) {
        if (cancelled) return;
        setContentsModel(null);
        setContentsError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoadingContents(false);
      }
    }

    loadContents();

    return () => {
      cancelled = true;
    };
  }, [tab, selection?.kind, selection?.id]);

  // ---------------------------------------------------------------------------
  // Asset details
  // New endpoint target:
  //   GET /mhsa/cockpit/asset/<asset_id>/
  // Until wired, the panel falls back to icon summary.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (selection?.kind !== "asset" || !selection?.id) {
      setAssetDetails(null);
      setAssetDetailsError(null);
      setLoadingAssetDetails(false);
      return;
    }

    let cancelled = false;

    async function loadAssetDetails() {
      try {
        setLoadingAssetDetails(true);
        setAssetDetailsError(null);

        const url = `${backendBase}/mhsa/cockpit/asset/${encodeURIComponent(
          selection.id,
        )}/`;

        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Asset detail HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;
        setAssetDetails(data);
      } catch (e) {
        if (cancelled) return;
        setAssetDetails(null);
        setAssetDetailsError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoadingAssetDetails(false);
      }
    }

    loadAssetDetails();

    return () => {
      cancelled = true;
    };
  }, [selection?.kind, selection?.id]);

  const onAssetListPointerMove = useCallback((e) => {
    const drag = assetListDragRef.current;
    if (!drag.dragging) return;

    const next = {
      x: Math.max(0, drag.originX + (e.clientX - drag.startX)),
      y: Math.max(0, drag.originY + (e.clientY - drag.startY)),
    };

    setAssetListCardPos(next);
    localStorage.setItem("mhsaCockpitAssetListCardPos", JSON.stringify(next));
  }, []);

  const stopAssetListDrag = useCallback(() => {
    assetListDragRef.current.dragging = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    window.removeEventListener("pointermove", onAssetListPointerMove);
    window.removeEventListener("pointerup", stopAssetListDrag);
  }, [onAssetListPointerMove]);

  const startAssetListDrag = useCallback(
    (e) => {
      e.preventDefault();

      assetListDragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: assetListCardPos.x,
        originY: assetListCardPos.y,
      };

      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      window.addEventListener("pointermove", onAssetListPointerMove);
      window.addEventListener("pointerup", stopAssetListDrag);
    },
    [assetListCardPos, onAssetListPointerMove, stopAssetListDrag],
  );

  const selectedDeviceId = useMemo(() => {
    return resolveDeviceId(selection, assetDetails);
  }, [selection, assetDetails]);

  // ---------------------------------------------------------------------------
  // Device twin
  // New endpoint target:
  //   GET /mhsa/cockpit/device/<device_id>/twin/
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (selection?.kind !== "asset") return;
    if (tab !== "twin" && tab !== "device") return;

    if (!selectedDeviceId) {
      setDeviceTwin(null);
      setDeviceTwinError(null);
      setLoadingDeviceTwin(false);
      return;
    }

    let cancelled = false;

    async function loadDeviceTwin() {
      try {
        setLoadingDeviceTwin(true);
        setDeviceTwinError(null);

        const url = `${backendBase}/mhsa/cockpit/device/${encodeURIComponent(
          selectedDeviceId,
        )}/twin/`;

        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Twin HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;
        setDeviceTwin(data);
      } catch (e) {
        if (cancelled) return;
        setDeviceTwin(null);
        setDeviceTwinError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoadingDeviceTwin(false);
      }
    }

    loadDeviceTwin();

    return () => {
      cancelled = true;
    };
  }, [selection?.kind, tab, selectedDeviceId]);

  // ---------------------------------------------------------------------------
  // Device commands
  // New endpoint target:
  //   GET /mhsa/cockpit/device/<device_id>/commands/
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (selection?.kind !== "asset") return;
    if (tab !== "commands") return;

    if (!selectedDeviceId) {
      setDeviceCommands(null);
      setDeviceCommandsError(null);
      setLoadingDeviceCommands(false);
      return;
    }

    let cancelled = false;

    async function loadDeviceCommands() {
      try {
        setLoadingDeviceCommands(true);
        setDeviceCommandsError(null);

        const url = `${backendBase}/mhsa/cockpit/device/${encodeURIComponent(
          selectedDeviceId,
        )}/commands/`;

        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Commands HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;
        setDeviceCommands(data);
      } catch (e) {
        if (cancelled) return;
        setDeviceCommands(null);
        setDeviceCommandsError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoadingDeviceCommands(false);
      }
    }

    loadDeviceCommands();

    return () => {
      cancelled = true;
    };
  }, [selection?.kind, tab, selectedDeviceId]);

  // ---------------------------------------------------------------------------
  // Resize divider
  // ---------------------------------------------------------------------------
  const onResizePointerMove = useCallback((e) => {
    if (!draggingRef.current || !shellRef.current) return;

    const rect = shellRef.current.getBoundingClientRect();
    const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
    const nextPct = Math.min(82, Math.max(45, rawPct));

    setLeftPct(nextPct);
    localStorage.setItem("mhsaCockpitLeftPct", String(nextPct));
  }, []);

  const stopResize = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onResizePointerMove);
    window.removeEventListener("pointerup", stopResize);
  }, [onResizePointerMove]);

  const startResize = useCallback(
    (e) => {
      e.preventDefault();
      draggingRef.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onResizePointerMove);
      window.addEventListener("pointerup", stopResize);
    },
    [onResizePointerMove, stopResize],
  );

  useEffect(() => {
    return () => {
      stopResize();
      stopAssetListDrag();
    };
  }, [stopResize, stopAssetListDrag]);

  // ---------------------------------------------------------------------------
  // Icons
  // ---------------------------------------------------------------------------
  const containerCartIcons = useMemo(() => {
    if (!summaryModel) return [];

    const backendIcons = Array.isArray(summaryModel.icons)
      ? summaryModel.icons
          .filter((i) => ["container", "cart"].includes(String(i?.kind || "")))
          .map((i) => ({
            ...i,
            iconClass: normalizeMapIconClass(i),
          }))
      : [];

    if (backendIcons.length) return backendIcons;

    const out = [];

    for (const c of summaryModel?.containers || []) {
      if (c?.x_px == null || c?.y_px == null) continue;

      const subtype = String(
        c.container_type || c.container_subtype || "unknown",
      )
        .trim()
        .toLowerCase();

      out.push({
        key: `container:${c.id}`,
        kind: "container",
        entityId: c.id,
        title: subtype || "container",
        x_px: c.x_px,
        y_px: c.y_px,
        iconClass: normalizeMapIconClass(
          null,
          `mi mi-container mi-container--${subtype || "unknown"}`,
        ),
        summary: c,
      });
    }

    for (const cart of summaryModel?.carts || []) {
      if (cart?.x_px == null || cart?.y_px == null) continue;

      const code = String(cart.carttype_code || cart.code || "unknown").trim();

      out.push({
        key: `cart:${cart.id}`,
        kind: "cart",
        entityId: cart.id,
        title: code || "cart",
        x_px: cart.x_px,
        y_px: cart.y_px,
        iconClass: normalizeMapIconClass(
          null,
          `mi mi-cart mi-cart--${code || "unknown"}`,
        ),
        summary: cart,
      });
    }

    return out;
  }, [summaryModel]);

  const rawAssetIcons = useMemo(() => {
    if (!summaryModel) return [];

    const backendAssetIcons = Array.isArray(summaryModel.icons)
      ? summaryModel.icons.filter((i) => String(i?.kind || "") === "asset")
      : [];

    if (backendAssetIcons.length) {
      return backendAssetIcons.map(normalizeAssetIcon);
    }

    const assets = Array.isArray(summaryModel.assets)
      ? summaryModel.assets
      : [];

    return assets.map((asset) =>
      normalizeAssetIcon({
        key: `asset:${asset.id}`,
        kind: "asset",
        entityId: asset.id,
        title: asset.name || asset.device_id || "asset",
        x_px: asset.current_x_px ?? asset.x_px,
        y_px: asset.current_y_px ?? asset.y_px,
        icon_uri: asset.icon_uri,
        iconClass: assetIconClass(asset),
        summary: asset,
      }),
    );
  }, [summaryModel]);

  const visibleAssetIcons = useMemo(() => {
    return rawAssetIcons.filter((icon) =>
      assetPassesFilters(icon, assetFilters),
    );
  }, [rawAssetIcons, assetFilters]);

  const visibleAssetList = useMemo(() => {
    const assets = rawAssetIcons.filter((icon) =>
      assetPassesFilters(icon, assetFilters, { includeOffMap: true }),
    );

    return assets.sort((a, b) =>
      String(a?.title || "").localeCompare(String(b?.title || "")),
    );
  }, [rawAssetIcons, assetFilters]);

  const mapIcons = useMemo(() => {
    if (topic === TOPIC_ASSETS) {
      return visibleAssetIcons.filter(
        (icon) => icon?.x_px != null && icon?.y_px != null,
      );
    }

    return containerCartIcons;
  }, [topic, visibleAssetIcons, containerCartIcons]);

  const iconCountLabel = useMemo(() => {
    if (topic === TOPIC_ASSETS) {
      return `${visibleAssetIcons.length}/${rawAssetIcons.length} assets`;
    }

    return `${containerCartIcons.length} containers/carts`;
  }, [
    topic,
    visibleAssetIcons.length,
    rawAssetIcons.length,
    containerCartIcons.length,
  ]);

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

  const mapPixelWidth = Number(
    maplayer?.pixel_width ||
      maplayer?.width_px ||
      maplayer?.widthPx ||
      maplayer?.image_width ||
      0,
  );

  const mapPixelHeight = Number(
    maplayer?.pixel_height ||
      maplayer?.height_px ||
      maplayer?.heightPx ||
      maplayer?.image_height ||
      0,
  );

  const parentLayerId =
    maplayer?.parent_id ||
    maplayer?.parent?.id ||
    maplayer?.parent_map_layer_id ||
    maplayer?.parent_layer_id ||
    null;

  const parentLayerName =
    maplayer?.parent_name ||
    maplayer?.parent?.name ||
    maplayer?.parent_map_layer_name ||
    "Parent MapLayer";

  const canGoUp = Boolean(parentLayerId && setMapLayerId);

  const goUpOneMapLayer = () => {
    if (!canGoUp) return;
    clearSelection();
    setMapLayerId(parentLayerId);
  };

  return (
    <div className="mhsa-page mhsa-home">
      <main
        ref={shellRef}
        className="mhsa-main mhsa-cockpit-resizable"
        style={{
          display: "grid",
          gridTemplateColumns: `minmax(420px, ${leftPct}%) 10px minmax(360px, 1fr)`,
          gap: 0,
          alignItems: "stretch",
          width: "100%",
          minWidth: 0,
        }}
      >
        <section
          className="mhsa-left"
          style={{
            minWidth: 0,
            width: "100%",
            paddingRight: 10,
            overflow: "hidden",
          }}
        >
          <div className="mhsa-results">
            <div className="mhsa-results-header">
              <div>
                <h3 style={{ marginBottom: 4 }}>Cockpit</h3>
                <div className="mhsa-results-meta mhsa-dim">
                  {maplayer?.name || mapLayerId || "—"} · {iconCountLabel}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                  alignItems: "center",
                }}
              >
                <button
                  className="mhsa-btn"
                  type="button"
                  onClick={goUpOneMapLayer}
                  disabled={!canGoUp}
                  title={
                    canGoUp
                      ? `Go up to ${parentLayerName}`
                      : "No parent MapLayer available from this response"
                  }
                >
                  ↑ Go Up One MapLayer
                </button>

                <button
                  className="mhsa-btn"
                  type="button"
                  onClick={clearSelection}
                  disabled={!selection?.kind}
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: "10px 12px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                flexWrap: "wrap",
              }}
            >
              <TopicButton
                active={topic === TOPIC_CONTAINERS}
                onClick={() => {
                  setTopic(TOPIC_CONTAINERS);
                  clearSelection();
                }}
              >
                Containers / Carts
              </TopicButton>

              <TopicButton
                active={topic === TOPIC_ASSETS}
                onClick={() => {
                  setTopic(TOPIC_ASSETS);
                  clearSelection();
                }}
              >
                Assets
              </TopicButton>

              {loadingSummary && (
                <span style={{ opacity: 0.65, fontSize: 12 }}>
                  Loading summary…
                </span>
              )}

              {summaryError && (
                <span style={{ color: "salmon", fontSize: 12 }}>
                  Summary error: {summaryError}
                </span>
              )}
            </div>

            {topic === TOPIC_ASSETS && (
              <AssetFilterBar
                filters={assetFilters}
                setFilters={setAssetFilters}
                assetCount={rawAssetIcons.length}
                visibleCount={visibleAssetIcons.length}
              />
            )}

            <div className="mhsa-results-body">
              <div className="mhsa-map-viewport">
                <div
                  className="mhsa-map-scroll-content"
                  style={
                    mapPixelWidth && mapPixelHeight
                      ? {
                          width: mapPixelWidth,
                          height: mapPixelHeight,
                        }
                      : undefined
                  }
                >
                  <div className="mhsa-map-stage mhsa-map-stage--native">
                    <MapOverlay
                      mapImageSrc={mapImageSrc}
                      icons={mapIcons}
                      onIconClick={onIconClick}
                      fitMode="native"
                    />

                    {topic === TOPIC_ASSETS && (
                      <FloatingAssetListCard
                        assets={visibleAssetList}
                        selectedId={
                          selection?.kind === "asset" ? selection?.id : null
                        }
                        pos={assetListCardPos}
                        onDragStart={startAssetListDrag}
                        onSelect={(icon) => onIconClick(icon)}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ResizeDivider onPointerDown={startResize} />

        <aside
          className="mhsa-aside"
          style={{
            minWidth: 0,
            width: "100%",
            paddingLeft: 10,
            overflow: "hidden",
          }}
        >
          <div className="mhsa-card">
            <div className="mhsa-card__header">
              <div
                style={{
                  opacity: 0.7,
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span>
                  Cockpit ·{" "}
                  {topic === TOPIC_ASSETS ? "Assets" : "Containers/Carts"}
                </span>
                <Link
                  to="/clubcar"
                  style={{ textDecoration: "none", fontSize: 14 }}
                >
                  ← MHSA Home
                </Link>
              </div>

              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>
                {selection?.kind
                  ? `${capitalize(selection.kind)}: ${selectionTitle(selection)}`
                  : "No selection"}
              </div>

              <div style={{ opacity: 0.7, marginTop: 4, fontSize: 12 }}>
                {selection?.id
                  ? String(selection.id)
                  : topic === TOPIC_ASSETS
                    ? "Click an asset icon or select from the asset list."
                    : "Click an icon on the map."}
              </div>
            </div>

            <AsideTabs
              topic={topic}
              selection={selection}
              tab={tab}
              setTab={setTab}
            />

            <div className="mhsa-card__body">
              {topic === TOPIC_ASSETS && !selection?.kind && (
                <AssetLandingPanel
                  assets={visibleAssetList}
                  onSelect={(icon) => onIconClick(icon)}
                  filters={assetFilters}
                  setFilters={setAssetFilters}
                />
              )}

              {topic !== TOPIC_ASSETS && tab === "overview" && (
                <OverviewPanel selection={selection} mode={mode} />
              )}

              {topic !== TOPIC_ASSETS && tab === "contents" && (
                <ContentsPanel
                  selection={selection}
                  loading={loadingContents}
                  error={contentsError}
                  model={contentsModel}
                />
              )}

              {topic !== TOPIC_ASSETS && tab === "actions" && (
                <ActionsPanel
                  selection={selection}
                  mode={mode}
                  setMode={setMode}
                />
              )}

              {topic !== TOPIC_ASSETS && tab === "history" && (
                <PlaceholderPanel title="History">
                  History placeholder. This can later be driven by MhsaEvent and
                  AssetPositionEvent.
                </PlaceholderPanel>
              )}

              {topic !== TOPIC_ASSETS && tab === "meta" && (
                <MetaPanel selection={selection} />
              )}

              {topic === TOPIC_ASSETS &&
                selection?.kind === "asset" &&
                tab === "overview" && (
                  <AssetOverviewPanel
                    selection={selection}
                    assetDetails={assetDetails}
                    loading={loadingAssetDetails}
                    error={assetDetailsError}
                  />
                )}

              {topic === TOPIC_ASSETS &&
                selection?.kind === "asset" &&
                tab === "device" && (
                  <AssetDevicePanel
                    selection={selection}
                    assetDetails={assetDetails}
                    selectedDeviceId={selectedDeviceId}
                    deviceTwin={deviceTwin}
                    loadingTwin={loadingDeviceTwin}
                    twinError={deviceTwinError}
                  />
                )}

              {topic === TOPIC_ASSETS &&
                selection?.kind === "asset" &&
                tab === "twin" && (
                  <DeviceTwinPanel
                    selectedDeviceId={selectedDeviceId}
                    deviceTwin={deviceTwin}
                    loading={loadingDeviceTwin}
                    error={deviceTwinError}
                  />
                )}

              {topic === TOPIC_ASSETS &&
                selection?.kind === "asset" &&
                tab === "commands" && (
                  <DeviceCommandsPanel
                    selectedDeviceId={selectedDeviceId}
                    commandsModel={deviceCommands}
                    loading={loadingDeviceCommands}
                    error={deviceCommandsError}
                    csrfToken={csrfToken}
                    csrfError={csrfError}
                    loadCsrfToken={loadCsrfToken}
                    onCommandCreated={() => {
                      setDeviceCommands(null);
                      setDeviceCommandsError(null);
                    }}
                  />
                )}

              {topic === TOPIC_ASSETS &&
                selection?.kind === "asset" &&
                tab === "events" && (
                  <AssetEventsPanel
                    selection={selection}
                    assetDetails={assetDetails}
                  />
                )}

              {topic === TOPIC_ASSETS &&
                selection?.kind === "asset" &&
                tab === "meta" && (
                  <MetaPanel
                    selection={{
                      ...selection,
                      details: assetDetails,
                    }}
                  />
                )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Topic / layout controls
// -----------------------------------------------------------------------------

function TopicButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={active ? "mhsa-tab active" : "mhsa-tab"}
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "7px 12px",
      }}
    >
      {children}
    </button>
  );
}

function ResizeDivider({ onPointerDown }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize Cockpit panels"
      onPointerDown={onPointerDown}
      style={{
        cursor: "col-resize",
        width: 10,
        minWidth: 10,
        alignSelf: "stretch",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.8,
      }}
    >
      <div
        style={{
          width: 2,
          minHeight: "60%",
          borderRadius: 999,
          background: "rgba(255,255,255,0.18)",
          boxShadow: "0 0 10px rgba(20,141,151,0.35)",
        }}
      />
    </div>
  );
}

function AsideTabs({ topic, selection, tab, setTab }) {
  const hasSelection = Boolean(selection?.kind);

  const tabs =
    topic === TOPIC_ASSETS
      ? [
          ["overview", "Overview"],
          ["device", "Device"],
          ["twin", "Twin"],
          ["commands", "Commands"],
          ["events", "Events"],
          ["meta", "Meta"],
        ]
      : [
          ["overview", "Overview"],
          ["contents", "Contents"],
          ["actions", "Actions"],
          ["history", "History"],
          ["meta", "Meta"],
        ];

  return (
    <div className="mhsa-tabs">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          className={tab === key ? "mhsa-tab active" : "mhsa-tab"}
          onClick={() => setTab(key)}
          disabled={!hasSelection}
          title={!hasSelection ? "Select an item first" : undefined}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function AssetFilterBar({ filters, setFilters, assetCount, visibleCount }) {
  const toggle = (key) => {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setAll = (value) => {
    setFilters((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) next[key] = value;
      return next;
    });
  };

  return (
    <div
      style={{
        padding: "10px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "grid",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ opacity: 0.75, fontSize: 12 }}>
          Asset filters · {visibleCount}/{assetCount}
        </span>

        <button className="mhsa-btn" type="button" onClick={() => setAll(true)}>
          All
        </button>
        <button
          className="mhsa-btn"
          type="button"
          onClick={() => setAll(false)}
        >
          None
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <FilterCheck
          label="ValetVest"
          checked={filters.valet_vest}
          onChange={() => toggle("valet_vest")}
        />
        <FilterCheck
          label="Transporter"
          checked={filters.transporter}
          onChange={() => toggle("transporter")}
        />
        <FilterCheck
          label="Forklift"
          checked={filters.forklift}
          onChange={() => toggle("forklift")}
        />
        <FilterCheck
          label="AGV"
          checked={filters.agv}
          onChange={() => toggle("agv")}
        />
        <FilterCheck
          label="Tugger"
          checked={filters.tugger}
          onChange={() => toggle("tugger")}
        />
        <FilterCheck
          label="OTR"
          checked={filters.otr}
          onChange={() => toggle("otr")}
        />
        <FilterCheck
          label="Yard Truck"
          checked={filters.yardtruck}
          onChange={() => toggle("yardtruck")}
        />
        <FilterCheck
          label="Reach Truck"
          checked={filters.reachtruck}
          onChange={() => toggle("reachtruck")}
        />
        <FilterCheck
          label="Custom"
          checked={filters.custom}
          onChange={() => toggle("custom")}
        />
        <FilterCheck
          label="Online"
          checked={filters.online}
          onChange={() => toggle("online")}
        />
        <FilterCheck
          label="Offline"
          checked={filters.offline}
          onChange={() => toggle("offline")}
        />
        <FilterCheck
          label="Off-map"
          checked={filters.off_map}
          onChange={() => toggle("off_map")}
        />
      </div>
    </div>
  );
}

function FloatingAssetListCard({
  assets,
  selectedId,
  pos,
  onDragStart,
  onSelect,
}) {
  const visible = Array.isArray(assets) ? assets : [];

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        zIndex: 20,
        width: 280,
        maxWidth: "calc(100% - 28px)",
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(18,20,23,0.92)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
        overflow: "hidden",
      }}
    >
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onDragStart(e);
        }}
        onWheel={(e) => e.stopPropagation()}
        style={{
          cursor: "grab",
          padding: "9px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "center",
          userSelect: "none",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Assets</div>
          <div style={{ opacity: 0.65, fontSize: 11 }}>
            {visible.length} matching filter{visible.length === 1 ? "" : "s"}
          </div>
        </div>

        <div
          style={{
            opacity: 0.55,
            fontSize: 16,
            lineHeight: 1,
            letterSpacing: 1,
          }}
          title="Drag"
        >
          ⋮⋮
        </div>
      </div>

      <div
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          height: 252,
          overflowY: "scroll",
          overscrollBehavior: "contain",
          scrollbarGutter: "stable",
          display: "block",
        }}
      >
        {visible.length === 0 ? (
          <div style={{ padding: 10, opacity: 0.7, fontSize: 12 }}>
            No assets match the selected filters.
          </div>
        ) : (
          visible.map((icon) => {
            const summary = icon?.summary || {};
            const active = String(icon?.entityId) === String(selectedId);
            const online = assetOnline(summary);
            const offMap = isOffMapAsset(icon);
            const deviceId =
              resolveDeviceId({ summary }, null) ||
              summary?.device_id ||
              summary?.name ||
              "";

            return (
              <button
                key={icon.key || icon.entityId}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(icon);
                }}
                onWheel={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  background: active
                    ? "rgba(20,141,151,0.28)"
                    : "rgba(255,255,255,0.00)",
                  color: "inherit",
                  padding: "8px 10px",
                  cursor: "pointer",
                  display: "grid",
                  gap: 3,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    alignItems: "baseline",
                  }}
                >
                  <strong
                    style={{
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {icon.title || summary.name || "Asset"}
                  </strong>

                  <span
                    style={{
                      fontSize: 10,
                      opacity: 0.72,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {online ? "online" : "offline"}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.62,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "monospace",
                  }}
                >
                  {deviceId || "no-device-id"}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.68,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>
                    {assetProfile(summary) || summary.asset_type || "asset"}
                  </span>
                  <span>{offMap ? "off-map" : formatPosition(summary)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterCheck({ label, checked, onChange }) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        opacity: checked ? 0.95 : 0.55,
        cursor: "pointer",
      }}
    >
      <input type="checkbox" checked={Boolean(checked)} onChange={onChange} />
      {label}
    </label>
  );
}

// -----------------------------------------------------------------------------
// Existing container/cart panels
// -----------------------------------------------------------------------------

function OverviewPanel({ selection, mode }) {
  if (!selection?.kind) {
    return <div style={{ opacity: 0.7 }}>Click an icon to begin.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 8, opacity: 0.7 }}>
        Mode: <b>{mode}</b>
      </div>
      <pre style={preStyle()}>
        {JSON.stringify(selection?.summary || {}, null, 2)}
      </pre>
    </div>
  );
}

function ContentsPanel({ selection, loading, error, model }) {
  if (selection?.kind !== "container") {
    return (
      <div style={{ opacity: 0.8 }}>
        Contents currently supported for containers only.
      </div>
    );
  }

  if (loading) return <div style={{ opacity: 0.7 }}>Loading contents…</div>;
  if (error)
    return <div style={{ color: "salmon" }}>Contents error: {error}</div>;

  const contents = model?.contents || [];
  const last = model?.last_event || null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ opacity: 0.8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Container Contents
        </div>

        {contents.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No items found in this container.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle()}>
              <thead>
                <tr style={{ opacity: 0.8, textAlign: "left" }}>
                  <th style={thTdStyle()}>Part #</th>
                  <th style={thTdStyle()}>Description</th>
                  <th style={{ ...thTdStyle(), width: 90 }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {contents.map((r) => (
                  <tr key={r.item_id} style={rowBorderStyle()}>
                    <td style={{ ...thTdStyle(), fontFamily: "monospace" }}>
                      {r.part_number}
                    </td>
                    <td style={thTdStyle()}>
                      {r.description || (
                        <span style={{ opacity: 0.6 }}>(none)</span>
                      )}
                    </td>
                    <td
                      style={{
                        ...thTdStyle(),
                        textAlign: "right",
                        fontFamily: "monospace",
                      }}
                    >
                      {String(r.qty ?? "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ opacity: 0.85 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Most Recent Event
        </div>
        {!last ? (
          <div style={{ opacity: 0.7 }}>No related events found.</div>
        ) : (
          <EventCard event={last} />
        )}
      </div>
    </div>
  );
}

function ActionsPanel({ selection, mode, setMode }) {
  if (!selection?.kind) return <div style={{ opacity: 0.7 }}>No actions.</div>;

  const isContainer = selection.kind === "container";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ opacity: 0.7 }}>
        Current mode: <b>{mode}</b>
      </div>

      {!isContainer && (
        <div style={{ opacity: 0.7 }}>
          Actions depend on selection type; container moves are first.
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
        These can become SWAL/modal flows once endpoints are wired.
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Asset panels
// -----------------------------------------------------------------------------

function AssetLandingPanel({ assets, onSelect }) {
  if (!assets.length) {
    return (
      <PlaceholderPanel title="Assets">
        No assets match the current filters. If the backend summary endpoint
        does not yet return assets, this panel will populate after
        `/mhsa/cockpit/summary` includes an `assets` array or `icons` with
        `kind: "asset"`.
      </PlaceholderPanel>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Assets</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Select an asset to inspect its device, twin variables, commands,
          events, and check-in state.
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {assets.map((icon) => {
          const summary = icon?.summary || {};
          const status = assetOnline(summary) ? "online" : "offline";
          const offMap = isOffMapAsset(icon);

          return (
            <button
              key={icon.key || icon.entityId}
              type="button"
              className="mhsa-btn"
              onClick={() => onSelect(icon)}
              style={{
                textAlign: "left",
                display: "grid",
                gap: 4,
                padding: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <strong>{icon.title || summary.name || "Asset"}</strong>
                <span style={{ opacity: 0.7, fontSize: 12 }}>
                  {status}
                  {offMap ? " · off-map" : ""}
                </span>
              </div>
              <div style={{ opacity: 0.72, fontSize: 12 }}>
                {assetProfile(summary) || summary.asset_type || "asset"} ·{" "}
                {resolveDeviceId({ summary }, null) || "no device_id"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AssetOverviewPanel({ selection, assetDetails, loading, error }) {
  const summary = selection?.summary || {};
  const detail = normalizeDetail(assetDetails);
  const asset = detail?.asset || summary;
  const device = detail?.device || summary?.device || null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {loading && <div style={{ opacity: 0.7 }}>Loading asset detail…</div>}

      {error && (
        <SoftWarning
          title="Asset detail endpoint not available yet"
          message={error}
        />
      )}

      <Section title="Asset">
        <KeyValueGrid
          rows={[
            ["Name", asset?.name || summary?.name || selectionTitle(selection)],
            ["Asset type", asset?.asset_type],
            ["Asset profile", assetProfile(asset)],
            ["Operating mode", asset?.operating_mode],
            ["Last heard", asset?.last_heard_ts || asset?.last_heard_at],
            [
              "Map layer",
              asset?.current_map_layer_name || asset?.current_map_layer,
            ],
            ["Position", formatPosition(asset)],
            ["Device ID", resolveDeviceId(selection, assetDetails)],
          ]}
        />
      </Section>

      <Section title="Device Snapshot">
        {device ? (
          <KeyValueGrid
            rows={[
              ["Device ID", device.device_id],
              ["Class", device.device_class],
              ["Profile", device.asset_profile],
              ["MAC", device.mac_id],
              ["Heltec FW", device.firmware_heltec],
              ["XIAO FW", device.firmware_xiao],
              ["GPS fix", device.last_gps_fix],
              ["GPS", formatLatLon(device.last_lat, device.last_lon)],
              ["WiFi RSSI", device.last_wifi_rssi],
              ["Mailbox", formatMailbox(device)],
              ["Last heard", device.last_heard_at],
            ]}
          />
        ) : (
          <div style={{ opacity: 0.72 }}>
            No linked device detail loaded yet. The summary can still be used if
            it includes `device_id` in asset meta.
          </div>
        )}
      </Section>

      <Section title="Raw Summary">
        <pre style={preStyle()}>{JSON.stringify(summary, null, 2)}</pre>
      </Section>
    </div>
  );
}

function AssetDevicePanel({
  selection,
  assetDetails,
  selectedDeviceId,
  deviceTwin,
  loadingTwin,
  twinError,
}) {
  const detail = normalizeDetail(assetDetails);
  const device = detail?.device || selection?.summary?.device || null;
  const summary = selection?.summary || {};

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Section title="Device Identity">
        <KeyValueGrid
          rows={[
            ["Device ID", selectedDeviceId],
            ["Display name", device?.display_name],
            ["Device class", device?.device_class || summary?.device_class],
            ["Asset profile", device?.asset_profile || assetProfile(summary)],
            ["MAC", device?.mac_id || summary?.mac_id],
            ["Active", formatBool(device?.is_active)],
            ["Supports mailbox", formatBool(device?.supports_mailbox)],
            ["Mailbox enabled", formatBool(device?.mailbox_enabled)],
            ["Protocol", device?.mailbox_protocol],
            ["Last mailbox poll", device?.last_mailbox_poll_at],
          ]}
        />
      </Section>

      <Section title="Runtime Status">
        <KeyValueGrid
          rows={[
            ["Last heard", device?.last_heard_at || summary?.last_heard_ts],
            ["GPS fix", device?.last_gps_fix || summary?.gps_fix],
            [
              "GPS",
              formatLatLon(
                device?.last_lat || summary?.lat,
                device?.last_lon || summary?.lon,
              ),
            ],
            ["WiFi RSSI", device?.last_wifi_rssi || summary?.wifi_rssi],
            ["Heltec FW", device?.firmware_heltec],
            ["XIAO FW", device?.firmware_xiao],
          ]}
        />
      </Section>

      <Section title="Important Twin Values">
        {loadingTwin && (
          <div style={{ opacity: 0.7 }}>Loading twin values…</div>
        )}
        {twinError && (
          <SoftWarning
            title="Twin endpoint not available yet"
            message={twinError}
          />
        )}
        <TwinSummary deviceTwin={deviceTwin} />
      </Section>
    </div>
  );
}

function DeviceTwinPanel({ selectedDeviceId, deviceTwin, loading, error }) {
  const values = extractTwinValues(deviceTwin);

  if (!selectedDeviceId) {
    return (
      <PlaceholderPanel title="Digital Twin">
        No device_id linked to this asset.
      </PlaceholderPanel>
    );
  }

  if (loading) return <div style={{ opacity: 0.7 }}>Loading twin values…</div>;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {error && (
        <SoftWarning title="Twin endpoint not available yet" message={error} />
      )}

      <Section title={`Digital Twin · ${selectedDeviceId}`}>
        {!values.length ? (
          <div style={{ opacity: 0.72 }}>
            No twin values returned yet. Expected rows map to
            `MhsaDeviceTwinValue`: key, value_type, value, state, source,
            reported_at, desired_at, acked_at, and last_command_id.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle()}>
              <thead>
                <tr style={{ opacity: 0.8, textAlign: "left" }}>
                  <th style={thTdStyle()}>Key</th>
                  <th style={thTdStyle()}>Value</th>
                  <th style={thTdStyle()}>State</th>
                  <th style={thTdStyle()}>Source</th>
                  <th style={thTdStyle()}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {values.map((row) => (
                  <tr
                    key={row.id || `${row.device_id}:${row.key}`}
                    style={rowBorderStyle()}
                  >
                    <td style={{ ...thTdStyle(), fontFamily: "monospace" }}>
                      {row.key}
                    </td>
                    <td style={{ ...thTdStyle(), fontFamily: "monospace" }}>
                      {formatTwinValue(row)}
                    </td>
                    <td style={thTdStyle()}>{row.state}</td>
                    <td style={thTdStyle()}>{row.source}</td>
                    <td style={thTdStyle()}>
                      {row.updated_at ||
                        row.reported_at ||
                        row.desired_at ||
                        row.acked_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {values.length > 0 && (
        <Section title="Raw Twin Payload">
          <pre style={preStyle()}>{JSON.stringify(deviceTwin, null, 2)}</pre>
        </Section>
      )}
    </div>
  );
}

function DeviceCommandsPanel({
  selectedDeviceId,
  commandsModel,
  loading,
  error,
  csrfToken,
  csrfError,
  loadCsrfToken,
  onCommandCreated,
}) {
  const [commandKey, setCommandKey] = useState("heartbeat_ms");
  const [value, setValue] = useState("9000");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const commands = extractCommands(commandsModel);

  const createCommand = async () => {
    if (!selectedDeviceId) return;

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const payload = buildCommandPayload(commandKey, value);

      const url = `${backendBase}/mhsa/cockpit/device/${encodeURIComponent(
        selectedDeviceId,
      )}/commands/`;

      let token = csrfToken;

      if (!token) {
        if (typeof loadCsrfToken !== "function") {
          throw new Error("CSRF token loader is not available.");
        }

        token = await loadCsrfToken();
      }

      let res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFToken": token,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.status === 403 && typeof loadCsrfToken === "function") {
        token = await loadCsrfToken();

        res = await fetch(url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRFToken": token,
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error(`Create command HTTP ${res.status}`);
      const data = await res.json();

      if (data?.ok === false) {
        throw new Error(data?.error || "Command creation failed");
      }

      setSubmitMessage(
        "Command queued. Device should receive it on next check-in.",
      );
      onCommandCreated?.();
    } catch (e) {
      setSubmitMessage(`Command create failed: ${String(e?.message || e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedDeviceId) {
    return (
      <PlaceholderPanel title="Commands">
        No device_id linked to this asset.
      </PlaceholderPanel>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Section title={`Queue Command · ${selectedDeviceId}`}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={labelStyle()}>
            Command
            <select
              value={commandKey}
              onChange={(e) => setCommandKey(e.target.value)}
              style={inputStyle()}
            >
              <option value="heartbeat_ms">Set heartbeat_ms</option>
              <option value="gps_report_period_ms">
                Set gps_report_period_ms
              </option>
              <option value="oled_event_latch_ms">
                Set oled_event_latch_ms
              </option>
              <option value="bump_accel_mag_threshold">
                Set bump_accel_mag_threshold
              </option>
              <option value="bump_cooldown_ms">Set bump_cooldown_ms</option>
              <option value="get_status">Get status</option>
              <option value="get_config">Get config</option>
              <option value="send_battery_level">Request battery level</option>
              <option value="clear_logs">Clear device logs</option>
            </select>
          </label>

          {!isDirectCommand(commandKey) && (
            <label style={labelStyle()}>
              Value
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                style={inputStyle()}
                inputMode="numeric"
                placeholder="9000"
              />
            </label>
          )}

          {isDirectCommand(commandKey) && (
            <div style={{ opacity: 0.72, fontSize: 12 }}>
              This command does not require a value.
            </div>
          )}

          {csrfError && (
            <SoftWarning title="CSRF token warning" message={csrfError} />
          )}

          <button
            type="button"
            className="mhsa-btn"
            disabled={submitting}
            onClick={createCommand}
          >
            {submitting ? "Queuing…" : "Queue Command"}
          </button>

          {submitMessage && (
            <div
              style={{
                color: submitMessage.includes("failed")
                  ? "salmon"
                  : "rgba(255,255,255,0.78)",
                fontSize: 12,
              }}
            >
              {submitMessage}
            </div>
          )}

          <div style={{ opacity: 0.65, fontSize: 12 }}>
            UI sends a human-readable command row. Backend should serialize to
            compact M1 during device check-in.
          </div>
        </div>
      </Section>

      <Section title="Recent Commands">
        {loading && <div style={{ opacity: 0.7 }}>Loading commands…</div>}
        {error && (
          <SoftWarning
            title="Commands endpoint not available yet"
            message={error}
          />
        )}

        {!commands.length ? (
          <div style={{ opacity: 0.72 }}>
            No command history returned yet. Expected rows map to
            `MhsaDeviceCommand`: command_key, payload_json, status, issued_at,
            sent_at, acked_at, ack_payload_json, and error_text.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle()}>
              <thead>
                <tr style={{ opacity: 0.8, textAlign: "left" }}>
                  <th style={thTdStyle()}>Command</th>
                  <th style={thTdStyle()}>Status</th>
                  <th style={thTdStyle()}>Issued</th>
                  <th style={thTdStyle()}>Sent</th>
                  <th style={thTdStyle()}>Acked</th>
                </tr>
              </thead>
              <tbody>
                {commands.map((cmd) => (
                  <tr
                    key={cmd.id || `${cmd.command_key}:${cmd.issued_at}`}
                    style={rowBorderStyle()}
                  >
                    <td style={{ ...thTdStyle(), fontFamily: "monospace" }}>
                      {cmd.command_key}
                    </td>
                    <td style={thTdStyle()}>{cmd.status}</td>
                    <td style={thTdStyle()}>{cmd.issued_at}</td>
                    <td style={thTdStyle()}>{cmd.sent_at}</td>
                    <td style={thTdStyle()}>{cmd.acked_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function AssetEventsPanel({ selection, assetDetails }) {
  const detail = normalizeDetail(assetDetails);
  const events =
    detail?.events ||
    detail?.recent_events ||
    selection?.summary?.events ||
    selection?.summary?.recent_events ||
    [];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Section title="Recent Asset Events">
        {!Array.isArray(events) || events.length === 0 ? (
          <div style={{ opacity: 0.72 }}>
            No events returned yet. This panel can later show bump events,
            position events, check-in summaries, command lifecycle events, and
            high-density BNO-derived detections.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {events.map((event, idx) => (
              <EventCard key={event.id || idx} event={event} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Event Endpoint Target">
        <pre style={preStyle()}>
          {`GET /mhsa/cockpit/asset/${selection?.id}/events?limit=25`}
        </pre>
      </Section>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared display components
// -----------------------------------------------------------------------------

function MetaPanel({ selection }) {
  if (!selection?.kind) {
    return <div style={{ opacity: 0.7 }}>No selection.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Section title="Selection">
        <pre style={preStyle()}>{JSON.stringify(selection, null, 2)}</pre>
      </Section>
    </div>
  );
}

function PlaceholderPanel({ title, children }) {
  return (
    <Section title={title}>
      <div style={{ opacity: 0.75, lineHeight: 1.45 }}>{children}</div>
    </Section>
  );
}

function Section({ title, children }) {
  return (
    <section
      style={{
        display: "grid",
        gap: 8,
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.16)",
      }}
    >
      <div style={{ fontWeight: 700 }}>{title}</div>
      {children}
    </section>
  );
}

function SoftWarning({ title, message }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,160,122,0.35)",
        background: "rgba(255,160,122,0.08)",
        borderRadius: 10,
        padding: 10,
        display: "grid",
        gap: 4,
      }}
    >
      <div style={{ color: "lightsalmon", fontWeight: 700 }}>{title}</div>
      <div style={{ opacity: 0.75, fontSize: 12 }}>{message}</div>
    </div>
  );
}

function KeyValueGrid({ rows }) {
  const cleanRows = rows.filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );

  if (!cleanRows.length) {
    return <div style={{ opacity: 0.7 }}>No values available.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {cleanRows.map(([label, value]) => (
        <div
          key={label}
          style={{
            display: "grid",
            gridTemplateColumns: "130px minmax(0, 1fr)",
            gap: 8,
            alignItems: "baseline",
          }}
        >
          <div style={{ opacity: 0.62, fontSize: 12 }}>{label}</div>
          <div
            style={{
              fontFamily: typeof value === "number" ? "monospace" : undefined,
              wordBreak: "break-word",
            }}
          >
            {String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({ event }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ opacity: 0.8 }}>
        <span style={{ fontFamily: "monospace" }}>
          {event.event_type ||
            event.event_class ||
            event.command_key ||
            "(event)"}
        </span>
        {event.created_at || event.ts || event.received_at ? (
          <span style={{ opacity: 0.7 }}>
            {" "}
            · {event.created_at || event.ts || event.received_at}
          </span>
        ) : null}
      </div>

      {(event.source || event.scan_value || event.status) && (
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          {event.source ? (
            <>
              source:{" "}
              <span style={{ fontFamily: "monospace" }}>{event.source}</span>
            </>
          ) : null}
          {event.source && event.scan_value ? " · " : null}
          {event.scan_value ? (
            <>
              scan:{" "}
              <span style={{ fontFamily: "monospace" }}>
                {event.scan_value}
              </span>
            </>
          ) : null}
          {event.status ? (
            <>
              {" "}
              status:{" "}
              <span style={{ fontFamily: "monospace" }}>{event.status}</span>
            </>
          ) : null}
        </div>
      )}

      {event.meta_json ? (
        <pre style={preStyle()}>{JSON.stringify(event.meta_json, null, 2)}</pre>
      ) : null}
    </div>
  );
}

function TwinSummary({ deviceTwin }) {
  const values = extractTwinValues(deviceTwin);
  const importantKeys = [
    "heartbeat_ms",
    "gps_report_period_ms",
    "oled_event_latch_ms",
    "bno_detected",
    "bno_streaming",
    "gps_fix",
    "wifi_rssi",
  ];

  const selected = values.filter((v) => importantKeys.includes(String(v.key)));

  if (!selected.length) {
    return (
      <div style={{ opacity: 0.72 }}>
        No important twin values returned yet.
      </div>
    );
  }

  return (
    <KeyValueGrid
      rows={selected.map((v) => [
        `${v.key} (${v.state || "state?"})`,
        formatTwinValue(v),
      ])}
    />
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function normalizeMapIconClass(icon, fallbackClass = "") {
  const raw = String(icon?.iconClass || fallbackClass || "").trim();

  if (!raw) return "mi";

  // Backend older malformed shape:
  //   mi-mi-cart-mi-cart-02
  //   mi-mi-container-mi-container-gaylord
  if (raw.startsWith("mi-mi-cart-mi-cart-")) {
    const code = raw.replace("mi-mi-cart-mi-cart-", "");
    return `mi mi-cart mi-cart--${code}`;
  }

  if (raw.startsWith("mi-mi-container-mi-container-")) {
    const code = raw.replace("mi-mi-container-mi-container-", "");
    return `mi mi-container mi-container--${code}`;
  }

  const parts = raw.split(/\s+/).filter(Boolean);

  const normalized = parts.map((cls) => {
    // Already-good BEM classes: leave untouched.
    if (cls.startsWith("mi-cart--")) return cls;
    if (cls.startsWith("mi-container--")) return cls;
    if (cls.startsWith("mi-cart-role--")) return cls;
    if (cls.startsWith("mi-state--")) return cls;
    if (cls.startsWith("mi-outline--")) return cls;
    if (cls.startsWith("mi-shape--")) return cls;
    if (cls.startsWith("mi-size--")) return cls;
    if (cls.startsWith("mi-anchor--")) return cls;

    // Old single-dash classes only:
    //   mi-cart-02 -> mi-cart--02
    //   mi-container-gaylord -> mi-container--gaylord
    if (/^mi-cart-[^-]/.test(cls)) {
      return cls.replace(/^mi-cart-/, "mi-cart--");
    }

    if (/^mi-container-[^-]/.test(cls)) {
      return cls.replace(/^mi-container-/, "mi-container--");
    }

    return cls;
  });

  if (!normalized.includes("mi")) {
    normalized.unshift("mi");
  }

  return Array.from(new Set(normalized)).join(" ");
}

function normalizeAssetIcon(icon) {
  const summary = icon?.summary || {};
  const x = icon?.x_px ?? summary?.current_x_px ?? summary?.x_px;
  const y = icon?.y_px ?? summary?.current_y_px ?? summary?.y_px;

  return {
    ...icon,
    key: icon?.key || `asset:${icon?.entityId || summary?.id || summary?.name}`,
    kind: "asset",
    entityId: icon?.entityId || summary?.id || icon?.id,
    title: icon?.title || summary?.name || summary?.device_id || "asset",
    x_px: x,
    y_px: y,
    iconClass: normalizeMapIconClass(icon, assetIconClass(summary)),
    summary,
  };
}

function assetIconClass(asset) {
  const profile = assetProfile(asset);
  const type = String(asset?.asset_type || "custom")
    .trim()
    .toLowerCase();
  const token = (profile || type || "custom").replace(/_/g, "-");

  return `mi-asset mi-asset--${token}`;
}

function assetProfile(asset) {
  const meta = asset?.meta_json || asset?.meta || {};
  return (
    asset?.asset_profile ||
    asset?.profile ||
    meta?.asset_profile ||
    meta?.device_class ||
    ""
  );
}

function assetOnline(asset) {
  const explicit = asset?.online ?? asset?.is_online;
  if (explicit !== undefined && explicit !== null) return Boolean(explicit);

  const ts = asset?.last_heard_ts || asset?.last_heard_at;
  if (!ts) return false;

  const parsed = new Date(ts).getTime();
  if (!Number.isFinite(parsed)) return false;

  // First pass: online if heard within 5 minutes.
  return Date.now() - parsed < 5 * 60 * 1000;
}

function isOffMapAsset(icon) {
  if (!icon) return false;
  if (icon?.summary?.off_map === true || icon?.summary?.is_off_map === true)
    return true;
  return (
    icon.x_px == null ||
    icon.y_px == null ||
    Number(icon.x_px) < 0 ||
    Number(icon.y_px) < 0
  );
}

function assetPassesFilters(icon, filters, opts = {}) {
  const asset = icon?.summary || {};

  const norm = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");

  const profile = norm(assetProfile(asset));
  const type = norm(asset?.asset_type || asset?.assetType);
  const name = norm(asset?.name || asset?.title || asset?.device_id);

  const online = assetOnline(asset);
  const offMap = isOffMapAsset(icon);

  // Off-map handling.
  // The opts.includeOffMap flag is retained for compatibility with your current calls,
  // but the checkbox is still the source of truth.
  if (offMap && !filters.off_map) return false;

  // Online / offline handling.
  if (online && !filters.online) return false;
  if (!online && !filters.offline) return false;

  // ValetVest
  if (
    profile === "valet_vest" ||
    profile === "valetvest" ||
    type === "valet_vest" ||
    type === "valetvest" ||
    name.includes("valet_vest") ||
    name.includes("valetvest") ||
    name.includes("vest")
  ) {
    return Boolean(filters.valet_vest);
  }

  // Tugger
  if (profile === "tugger" || type === "tugger" || name.includes("tugger")) {
    return Boolean(filters.tugger);
  }

  // OTR
  if (
    profile === "otr" ||
    type === "otr" ||
    profile === "over_the_road" ||
    type === "over_the_road" ||
    name.includes("otr") ||
    name.includes("over_the_road")
  ) {
    return Boolean(filters.otr);
  }

  // Yard Truck
  if (
    profile === "yardtruck" ||
    type === "yardtruck" ||
    profile === "yard_truck" ||
    type === "yard_truck" ||
    name.includes("yardtruck") ||
    name.includes("yard_truck")
  ) {
    return Boolean(filters.yardtruck);
  }

  // Reach Truck
  if (
    profile === "reachtruck" ||
    type === "reachtruck" ||
    profile === "reach_truck" ||
    type === "reach_truck" ||
    name.includes("reachtruck") ||
    name.includes("reach_truck")
  ) {
    return Boolean(filters.reachtruck);
  }

  // Existing categories
  if (type === "transporter" || profile === "transporter") {
    return Boolean(filters.transporter);
  }

  if (type === "forklift" || profile === "forklift") {
    return Boolean(filters.forklift);
  }

  if (
    type === "agv" ||
    profile === "agv" ||
    type === "amr" ||
    profile === "amr"
  ) {
    return Boolean(filters.agv);
  }

  // Keep trailer support if the backend ever returns it, even if you removed the checkbox.
  // If filters.trailer is undefined, this falls through to custom instead of breaking.
  if (type === "trailer" || profile === "trailer") {
    return filters.trailer === undefined
      ? Boolean(filters.custom)
      : Boolean(filters.trailer);
  }

  // Unknown / future asset types land in Custom.
  if (type === "custom" || profile === "custom" || (!type && !profile)) {
    return Boolean(filters.custom);
  }

  return Boolean(filters.custom);
}

function selectionTitle(selection) {
  const summary = selection?.summary || {};
  return (
    summary.name ||
    summary.title ||
    summary.device_id ||
    summary.label ||
    selection?.id ||
    ""
  );
}

function normalizeDetail(data) {
  if (!data) return null;
  if (data?.ok && data?.model) return data.model;
  if (data?.ok && data?.asset) return data;
  return data;
}

function resolveDeviceId(selection, assetDetails) {
  const summary = selection?.summary || {};
  const meta = summary?.meta_json || summary?.meta || {};
  const detail = normalizeDetail(assetDetails);
  const asset = detail?.asset || detail || {};
  const assetMeta = asset?.meta_json || asset?.meta || {};
  const device = detail?.device || summary?.device || {};

  return (
    device?.device_id ||
    summary?.device_id ||
    summary?.deviceId ||
    meta?.device_id ||
    asset?.device_id ||
    assetMeta?.device_id ||
    ""
  );
}

function extractTwinValues(deviceTwin) {
  if (!deviceTwin) return [];
  if (Array.isArray(deviceTwin)) return deviceTwin;
  if (Array.isArray(deviceTwin.values)) return deviceTwin.values;
  if (Array.isArray(deviceTwin.twin_values)) return deviceTwin.twin_values;
  if (Array.isArray(deviceTwin.rows)) return deviceTwin.rows;
  if (deviceTwin.model && Array.isArray(deviceTwin.model.values))
    return deviceTwin.model.values;
  return [];
}

function extractCommands(commandsModel) {
  if (!commandsModel) return [];
  if (Array.isArray(commandsModel)) return commandsModel;
  if (Array.isArray(commandsModel.commands)) return commandsModel.commands;
  if (Array.isArray(commandsModel.rows)) return commandsModel.rows;
  if (commandsModel.model && Array.isArray(commandsModel.model.commands)) {
    return commandsModel.model.commands;
  }
  return [];
}

function formatTwinValue(row) {
  if (!row) return "";

  if (row.value !== undefined && row.value !== null)
    return JSON.stringify(row.value);

  switch (row.value_type) {
    case "int":
      return row.value_int ?? "";
    case "float":
      return row.value_float ?? "";
    case "bool":
      return row.value_bool === true
        ? "true"
        : row.value_bool === false
          ? "false"
          : "";
    case "json":
      return row.value_json == null ? "" : JSON.stringify(row.value_json);
    case "text":
    default:
      return row.value_text ?? "";
  }
}

function isDirectCommand(commandKey) {
  return [
    "get_status",
    "get_config",
    "send_battery_level",
    "clear_logs",
  ].includes(String(commandKey || ""));
}

function isDirectCommand(commandKey) {
  return [
    "get_status",
    "get_config",
    "send_battery_level",
    "clear_logs",
  ].includes(String(commandKey || ""));
}

function buildCommandPayload(commandKey, value) {
  if (isDirectCommand(commandKey)) {
    return {
      command_key: commandKey,
      payload_json: {},
    };
  }

  const intValue = Number.parseInt(value, 10);
  if (!Number.isFinite(intValue)) {
    throw new Error("Value must be an integer.");
  }

  return {
    command_key: "set_config",
    payload_json: {
      [commandKey]: intValue,
    },
  };
}

function formatPosition(asset) {
  const x = asset?.current_x_px ?? asset?.x_px;
  const y = asset?.current_y_px ?? asset?.y_px;

  if (x == null || y == null) return "none";
  if (Number(x) < 0 || Number(y) < 0) return `${x}, ${y} (off-map)`;
  return `${x}, ${y}`;
}

function formatLatLon(lat, lon) {
  if (lat == null || lon == null) return "";
  return `${lat}, ${lon}`;
}

function formatMailbox(device) {
  if (!device) return "";
  const enabled = device.mailbox_enabled === true ? "enabled" : "disabled";
  const supports =
    device.supports_mailbox === true ? "supported" : "not supported";
  return `${enabled}, ${supports}`;
}

function formatBool(value) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

function capitalize(value) {
  const s = String(value || "");
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

// -----------------------------------------------------------------------------
// Inline styles to avoid requiring CSS changes in this first drop.
// -----------------------------------------------------------------------------

function preStyle() {
  return {
    margin: 0,
    padding: 10,
    borderRadius: 10,
    background: "rgba(0,0,0,0.25)",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    fontSize: 12,
    opacity: 0.88,
  };
}

function tableStyle() {
  return {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  };
}

function thTdStyle() {
  return {
    padding: "6px 8px",
    verticalAlign: "top",
  };
}

function rowBorderStyle() {
  return {
    borderTop: "1px solid rgba(255,255,255,0.08)",
  };
}

function labelStyle() {
  return {
    display: "grid",
    gap: 5,
    fontSize: 12,
    opacity: 0.9,
  };
}

function inputStyle() {
  return {
    width: "100%",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "inherit",
    padding: "8px 10px",
  };
}

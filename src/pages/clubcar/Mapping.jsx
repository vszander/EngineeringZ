/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./mhsa_home.css";
import "./mhsa_mapping.css";

const backendBase = import.meta.env.VITE_BACKEND_URL;

const DEFAULT_MAP_LAYER_ID = "87403789-d602-4382-8ba1-130efb74dbd2"; // Evans Consumer

function normalizeGeometryPoints(geometryJson) {
  if (!geometryJson) return [];

  let g = geometryJson;
  if (typeof g === "string") {
    try {
      g = JSON.parse(g);
    } catch {
      return [];
    }
  }

  // Expected Edge sample:
  // { "type": "LineString", "coordinates": [[449, 530], [449, 540]] }
  if (Array.isArray(g.coordinates)) return g.coordinates;

  // Expected Zone sample:
  // { "type": "polygon", "points": [[107, 839], [260, 839], ...] }
  if (Array.isArray(g.points)) return g.points;

  return [];
}

function pointKey(x, y) {
  return `${Number(x || 0).toFixed(1)},${Number(y || 0).toFixed(1)}`;
}

export default function MappingPage() {
  const [mapLayerId, setMapLayerId] = useState(DEFAULT_MAP_LAYER_ID);
  const [mapLayers, setMapLayers] = useState([]);

  const [model, setModel] = useState(null);
  const [mapImageSrc, setMapImageSrc] = useState(
    "/images/clubcar/darkcarbackground.jpg",
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [enabledTypes, setEnabledTypes] = useState({});
  const [showZones, setShowZones] = useState(false);
  const [showEdges, setShowEdges] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);

  const [selection, setSelection] = useState(null);

  // Optional endpoint. If you do not have this yet, hard-code the dropdown
  // to Evans for now and remove this effect.
  useEffect(() => {
    let cancelled = false;

    async function loadMapLayers() {
      try {
        const res = await fetch(`${backendBase}/mhsa/api/mapping/maplayers/`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        const rows = Array.isArray(data?.map_layers)
          ? data.map_layers
          : Array.isArray(data)
            ? data
            : [];

        setMapLayers(rows);
      } catch (e) {
        console.warn("[MappingPage] map layer list unavailable:", e);
      }
    }

    loadMapLayers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapLayerId) return;

    let cancelled = false;

    async function loadMappingData() {
      try {
        setLoading(true);
        setError(null);
        setSelection(null);

        const url =
          `${backendBase}/mhsa/api/mapping/workbench/` +
          `?map_layer_id=${encodeURIComponent(mapLayerId)}`;

        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`Mapping HTTP ${res.status}`);

        const data = await res.json();
        if (cancelled) return;

        if (!data?.ok) {
          throw new Error(data?.error || "Mapping payload failed.");
        }

        setModel(data);

        const layer = data.map_layer || data.maplayer || {};
        if (layer.image_uri) {
          setMapImageSrc(`${layer.image_uri}?layer=${layer.id || mapLayerId}`);
        }

        // Requirement: default all type checkboxes OFF.
        // We still compute the unique types, but set them false.
        const nextTypes = {};
        for (const t of collectLocationTypes(data.locations || [])) {
          nextTypes[t] = false;
        }
        setEnabledTypes(nextTypes);

        setShowZones(false);
        setShowEdges(false);
        setShowRoutes(false);
      } catch (e) {
        if (cancelled) return;
        setError(String(e?.message || e));
        setModel(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMappingData();

    return () => {
      cancelled = true;
    };
  }, [mapLayerId]);

  const mapLayer = model?.map_layer || model?.maplayer || null;
  const locations = Array.isArray(model?.locations) ? model.locations : [];
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  const edges = Array.isArray(model?.edges) ? model.edges : [];
  const routes = Array.isArray(model?.routes) ? model.routes : [];

  const locationTypes = useMemo(
    () => collectLocationTypes(locations),
    [locations],
  );

  const visibleLocations = useMemo(() => {
    return locations.filter((loc) => {
      const t = String(loc.location_type || "unknown");
      return !!enabledTypes[t];
    });
  }, [locations, enabledTypes]);

  const visibleRouteEdgeIds = useMemo(() => {
    if (!showRoutes) return new Set();

    const ids = new Set();

    for (const route of routes) {
      const routeEdges = Array.isArray(route.route_edges)
        ? route.route_edges
        : Array.isArray(route.edges)
          ? route.edges
          : [];

      for (const re of routeEdges) {
        if (re.edge_id) ids.add(String(re.edge_id));
        if (re.edge?.id) ids.add(String(re.edge.id));
        if (re.id && re.from_location_id && re.to_location_id)
          ids.add(String(re.id));
      }
    }

    return ids;
  }, [routes, showRoutes]);

  const visibleEdges = useMemo(() => {
    if (!showEdges && !showRoutes) return [];

    if (!showRoutes) return edges;

    // When showRoutes is ON, emphasize route-member edges.
    // If route payload is not nested yet, this still safely renders all edges
    // when there are no route edge ids available.
    if (visibleRouteEdgeIds.size === 0) return edges;

    return edges.filter((e) => visibleRouteEdgeIds.has(String(e.id)));
  }, [edges, showEdges, showRoutes, visibleRouteEdgeIds]);

  const mapWidth =
    Number(mapLayer?.pixel_width || model?.pixel_width || 1000) || 1000;
  const mapHeight =
    Number(mapLayer?.pixel_height || model?.pixel_height || 1000) || 1000;

  const countsByType = useMemo(() => {
    const out = {};
    for (const loc of locations) {
      const t = String(loc.location_type || "unknown");
      out[t] = (out[t] || 0) + 1;
    }
    return out;
  }, [locations]);

  return (
    <div className="mhsa-page mhsa-home mhsa-mapping-page">
      <main className="mhsa-main">
        <section className="mhsa-left">
          <div className="mhsa-results">
            <div className="mhsa-results-header">
              <h3>Location / Route / Mapping</h3>

              <div className="mhsa-results-meta mhsa-dim">
                {mapLayer?.name || mapLayerId || "—"} · Locations:{" "}
                {locations.length} · Edges: {edges.length} · Zones:{" "}
                {zones.length}
              </div>
            </div>

            <div className="mhsa-mapping-toolbar">
              <label className="mhsa-field-label">
                MapLayer
                <select
                  className="mhsa-select"
                  value={mapLayerId}
                  onChange={(e) => setMapLayerId(e.target.value)}
                >
                  {mapLayers.length === 0 ? (
                    <option value={DEFAULT_MAP_LAYER_ID}>Evans Consumer</option>
                  ) : (
                    mapLayers.map((ml) => (
                      <option key={ml.id} value={ml.id}>
                        {ml.name || ml.id}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="mhsa-toggle-group">
                <label className="mhsa-check">
                  <input
                    type="checkbox"
                    checked={showZones}
                    onChange={(e) => setShowZones(e.target.checked)}
                  />
                  Zones ({zones.length})
                </label>

                <label className="mhsa-check">
                  <input
                    type="checkbox"
                    checked={showEdges}
                    onChange={(e) => setShowEdges(e.target.checked)}
                  />
                  Route Edges ({edges.length})
                </label>

                <label className="mhsa-check">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                  />
                  Routes ({routes.length})
                </label>
              </div>
            </div>

            <div className="mhsa-location-type-bar">
              {locationTypes.length === 0 ? (
                <span className="mhsa-dim">No location types loaded.</span>
              ) : (
                locationTypes.map((t) => (
                  <label key={t} className="mhsa-check mhsa-check--compact">
                    <input
                      type="checkbox"
                      checked={!!enabledTypes[t]}
                      onChange={(e) =>
                        setEnabledTypes((prev) => ({
                          ...prev,
                          [t]: e.target.checked,
                        }))
                      }
                    />
                    <span
                      className={`mhsa-type-swatch mhsa-loc--${safeClass(t)}`}
                    />
                    {t} ({countsByType[t] || 0})
                  </label>
                ))
              )}
            </div>

            <div className="mhsa-results-body">
              {loading && (
                <div className="mhsa-map-notice">Loading mapping data…</div>
              )}

              {error && (
                <div className="mhsa-map-notice mhsa-map-notice--error">
                  {error}
                </div>
              )}

              <MappingCanvas
                mapImageSrc={mapImageSrc}
                mapWidth={mapWidth}
                mapHeight={mapHeight}
                locations={visibleLocations}
                zones={showZones ? zones : []}
                edges={visibleEdges}
                routeEdgeIds={visibleRouteEdgeIds}
                onSelect={setSelection}
              />
            </div>
          </div>
        </section>

        <aside className="mhsa-aside">
          <div className="mhsa-card">
            <div className="mhsa-card__header">
              <div className="mhsa-aside-kicker">
                Mapping
                <Link to="/clubcar" className="mhsa-aside-link">
                  ← MHSA Home
                </Link>
              </div>

              <div className="mhsa-aside-title">
                {selection?.kind ? selection.kind : "No selection"}
              </div>

              <div className="mhsa-aside-subtitle">
                {selection?.id
                  ? String(selection.id)
                  : "Turn on a layer, then click a dot, edge, or zone."}
              </div>
            </div>

            <div className="mhsa-card__body">
              <MappingAside
                selection={selection}
                model={model}
                enabledTypes={enabledTypes}
                showZones={showZones}
                showEdges={showEdges}
                showRoutes={showRoutes}
              />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function collectLocationTypes(locations) {
  const s = new Set();

  for (const loc of locations || []) {
    s.add(String(loc.location_type || "unknown"));
  }

  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function safeClass(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-");
}

function MappingCanvas({
  mapImageSrc,
  mapWidth,
  mapHeight,
  locations,
  zones,
  edges,
  routeEdgeIds,
  onSelect,
}) {
  return (
    <div className="mhsa-map-stage mhsa-mapping-stage">
      <img
        src={mapImageSrc}
        alt="MHSA map layer"
        className="mhsa-mapping-image"
        draggable="false"
      />

      <svg
        className="mhsa-mapping-svg"
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        preserveAspectRatio="xMinYMin meet"
      >
        <g className="mhsa-zone-layer">
          {zones.map((zone) => (
            <ZoneShape key={zone.id} zone={zone} onSelect={onSelect} />
          ))}
        </g>

        <g className="mhsa-edge-layer">
          {edges.map((edge) => (
            <EdgeShape
              key={edge.id}
              edge={edge}
              isRouteEdge={routeEdgeIds?.has?.(String(edge.id))}
              onSelect={onSelect}
            />
          ))}
        </g>

        <g className="mhsa-location-layer">
          {locations.map((loc) => (
            <LocationMark key={loc.id} loc={loc} onSelect={onSelect} />
          ))}
        </g>
      </svg>
    </div>
  );
}

function LocationMark({ loc, onSelect }) {
  const x = Number(loc.x_px);
  const y = Number(loc.y_px);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const type = String(loc.location_type || "unknown");
  const cls = `mhsa-loc-point mhsa-loc--${safeClass(type)}`;

  if (type === "edge_point") {
    return (
      <rect
        className={cls}
        x={x - 1.5}
        y={y - 1.5}
        width="3"
        height="3"
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.({
            kind: "location",
            id: loc.id,
            label: loc.name,
            location_type: type,
            data: loc,
          });
        }}
      >
        <title>{loc.name || loc.id}</title>
      </rect>
    );
  }

  return (
    <circle
      className={cls}
      cx={x}
      cy={y}
      r="2"
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.({
          kind: "location",
          id: loc.id,
          label: loc.name,
          location_type: type,
          data: loc,
        });
      }}
    >
      <title>{loc.name || loc.id}</title>
    </circle>
  );
}

function EdgeShape({ edge, isRouteEdge, onSelect }) {
  const points = normalizeGeometryPoints(edge.geometry_json);

  if (points.length < 2) {
    const from = edge.from_location || edge.from || null;
    const to = edge.to_location || edge.to || null;

    if (
      from?.x_px == null ||
      from?.y_px == null ||
      to?.x_px == null ||
      to?.y_px == null
    ) {
      return null;
    }

    points.push([from.x_px, from.y_px], [to.x_px, to.y_px]);
  }

  const path = points
    .map(([x, y], idx) => `${idx === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");

  return (
    <path
      className={
        isRouteEdge
          ? "mhsa-route-edge-line mhsa-route-edge-line--route"
          : "mhsa-route-edge-line"
      }
      d={path}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.({
          kind: isRouteEdge ? "route_edge" : "edge",
          id: edge.id,
          data: edge,
        });
      }}
    >
      <title>{edge.id}</title>
    </path>
  );
}

function ZoneShape({ zone, onSelect }) {
  const points = normalizeGeometryPoints(zone.geometry_json);
  if (points.length < 3) return null;

  const pointString = points.map(([x, y]) => pointKey(x, y)).join(" ");

  return (
    <polygon
      className={`mhsa-zone-poly mhsa-zone--${safeClass(
        zone.zone_classification || "unknown",
      )}`}
      points={pointString}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.({
          kind: "zone",
          id: zone.id,
          label: zone.name,
          zone_classification: zone.zone_classification,
          data: zone,
        });
      }}
    >
      <title>{zone.name || zone.id}</title>
    </polygon>
  );
}

function MappingAside({
  selection,
  model,
  enabledTypes,
  showZones,
  showEdges,
  showRoutes,
}) {
  const locations = Array.isArray(model?.locations) ? model.locations : [];
  const edges = Array.isArray(model?.edges) ? model.edges : [];
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  const routes = Array.isArray(model?.routes) ? model.routes : [];

  const activeTypes = Object.entries(enabledTypes || {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  return (
    <div className="mhsa-mapping-aside">
      <div className="mhsa-mini-panel">
        <div className="mhsa-mini-panel__title">Visible Layers</div>
        <div className="mhsa-mini-row">
          <span>Location types</span>
          <b>{activeTypes.length}</b>
        </div>
        <div className="mhsa-mini-row">
          <span>Zones</span>
          <b>{showZones ? zones.length : 0}</b>
        </div>
        <div className="mhsa-mini-row">
          <span>Edges</span>
          <b>{showEdges ? edges.length : 0}</b>
        </div>
        <div className="mhsa-mini-row">
          <span>Routes</span>
          <b>{showRoutes ? routes.length : 0}</b>
        </div>
      </div>

      <div className="mhsa-mini-panel">
        <div className="mhsa-mini-panel__title">Selection</div>

        {!selection ? (
          <div className="mhsa-dim">
            Click a rendered dot, square, edge, or zone.
          </div>
        ) : (
          <>
            <div className="mhsa-mini-row">
              <span>Kind</span>
              <b>{selection.kind}</b>
            </div>

            {selection.label && (
              <div className="mhsa-mini-row">
                <span>Name</span>
                <b>{selection.label}</b>
              </div>
            )}

            {selection.location_type && (
              <div className="mhsa-mini-row">
                <span>Type</span>
                <b>{selection.location_type}</b>
              </div>
            )}

            {selection.zone_classification && (
              <div className="mhsa-mini-row">
                <span>Zone Class</span>
                <b>{selection.zone_classification}</b>
              </div>
            )}

            <pre className="mhsa-json-preview">
              {JSON.stringify(selection.data || {}, null, 2)}
            </pre>
          </>
        )}
      </div>

      <div className="mhsa-mini-panel">
        <div className="mhsa-mini-panel__title">Next Increment</div>
        <div className="mhsa-dim">
          Add click-to-select package membership, then preview selected
          locations / edges / routes as the XIAO route-local payload.
        </div>
      </div>
    </div>
  );
}

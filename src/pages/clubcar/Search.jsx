/* eslint-disable react/prop-types */

import { useEffect, useMemo, useState } from "react";
import "./mhsa_home.css";
import "./mhsa_mapping.css";

import { ItemLookupInput } from "/src/components/ItemLookupInput";
import { useParams, useNavigate } from "react-router-dom";
import MapOverlay from "/src/components/map/MapOverlay";
import { buildIconsFromPartSearch } from "/src/components/map/search_map_icons";

const DEFAULT_MAP_LAYER_ID = "87403789-d602-4382-8ba1-130efb74dbd2"; // Evans for now

function qtyToIntLabel(qtyText, qtyNum) {
  // prefer qtyText if present (e.g., "12.0000"), else fall back to numeric qty
  const raw =
    qtyText != null && String(qtyText).trim() !== "" ? String(qtyText) : qtyNum;

  const n =
    typeof raw === "number"
      ? raw
      : Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return ""; // nothing displayed if bad/empty
  return String(Math.trunc(n)); // truncate toward zero (12.9 -> 12)
}

function symbologyToClasses(sym) {
  if (!sym || typeof sym !== "object") return [];

  const family = String(sym.family || "").trim();
  const identity = String(sym.identity || "").trim();
  const outline = String(sym.outline || "").trim();
  const anchor = String(sym.anchor || "").trim();
  const states = Array.isArray(sym.states) ? sym.states : [];

  const out = [];

  // family + identity (BEM-ish)
  if (family) out.push(`mi-${family}`);
  if (family && identity) out.push(`mi-${family}--${identity}`);

  // outline
  if (outline) out.push(`mi-outline--${outline}`);

  // anchor utility
  if (anchor === "center") out.push("mi-anchor--center");
  else if (anchor === "top") out.push("mi-anchor--top");
  else if (anchor === "bottom") {
    // default; no class needed
  }

  // states
  for (const s of states) {
    const k = String(s || "").trim();
    if (k) out.push(`mi-state--${k}`);
  }

  return out;
}

function mergeClassTokens(baseClass, extraTokens) {
  const base = String(baseClass || "").trim();
  const baseTokens = base ? base.split(/\s+/).filter(Boolean) : [];
  const extras = Array.isArray(extraTokens) ? extraTokens : [];

  // Start with base tokens
  let tokens = [...baseTokens];

  // If extras contain a specific family identity (mi-<family>--<id>),
  // remove any existing identity tokens for that same family from base.
  for (const t of extras) {
    const m = /^mi-([a-z0-9_-]+)--([a-z0-9_-]+)$/i.exec(String(t));
    if (!m) continue;
    const family = m[1];
    tokens = tokens.filter((x) => !new RegExp(`^mi-${family}--`, "i").test(x));
  }

  // If extras contain an outline/anchor, keep only the last one
  const hasOutline = extras.some((t) => /^mi-outline--/i.test(String(t)));
  if (hasOutline) tokens = tokens.filter((x) => !/^mi-outline--/i.test(x));

  const hasAnchor = extras.some((t) => /^mi-anchor--/i.test(String(t)));
  if (hasAnchor) tokens = tokens.filter((x) => !/^mi-anchor--/i.test(x));

  // Add extras
  tokens.push(...extras);

  // Dedupe, and ensure "mi" appears at most once
  const deduped = Array.from(new Set(tokens.filter(Boolean)));
  const miFirst = deduped.includes("mi")
    ? ["mi", ...deduped.filter((t) => t !== "mi")]
    : deduped;

  return miFirst.join(" ");
}

/**
 * Return a NEW payload where icon_class/cart_icon_class include symbology-derived classes.
 * Non-breaking: if symbology fields are absent, nothing changes.
 */
function applySymbologyToPartSearchPayload(raw) {
  if (!raw || typeof raw !== "object") return raw;

  const containers = (raw.containers || []).map((c) => {
    const symTokens = symbologyToClasses(c.symbology);
    const cartSymTokens = symbologyToClasses(c.cart_symbology);

    return {
      ...c,
      // augment existing legacy classes (do NOT remove them)
      icon_class: mergeClassTokens(c.icon_class, symTokens),
      cart_icon_class: mergeClassTokens(c.cart_icon_class, cartSymTokens),
    };
  });

  const loose_pods = (raw.loose_pods || []).map((p) => {
    const symTokens = symbologyToClasses(p.symbology);
    return {
      ...p,
      icon_class: mergeClassTokens(p.icon_class, symTokens),
    };
  });

  return { ...raw, containers, loose_pods };
}

export default function Search() {
  const backendBase = import.meta.env.VITE_BACKEND_URL;

  const [maplayer, setMaplayer] = useState(null);
  const [mapImageSrc, setMapImageSrc] = useState(
    "/images/clubcar/darkcarbackground.jpg",
  ); // fallback

  useEffect(() => {
    console.log("mapImageSrc changed ->", mapImageSrc);
  }, [mapImageSrc]);

  const [resultsModel, setResultsModel] = useState(null);

  const navigate = useNavigate();
  const { mode: routeMode } = useParams();
  const uiMode = routeMode || "menu";
  const [heroTitle, setHeroTitle] = useState("MHSA Search");

  useEffect(() => {
    const layerId = resultsModel?.map_layer_id || DEFAULT_MAP_LAYER_ID;
    const url = `${backendBase}/mhsa/maplayer/${layerId}/`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        setMaplayer(j);

        // Always update mapImageSrc so MapOverlay remounts on layer change.
        const fallback = "/images/clubcar/darkcarbackground.jpg";
        const base = j?.image_uri || fallback;

        // if base already has "?", append with "&" instead of "?"
        const sep = String(base).includes("?") ? "&" : "?";
        setMapImageSrc(
          `${base}${sep}layer=${encodeURIComponent(j?.id || layerId)}`,
        );
      })
      .catch((e) => {
        console.warn("maplayer fetch failed:", e);

        // Still force a remount attempt (optional but helpful for debugging)
        const base = "/images/clubcar/darkcarbackground.jpg";
        const sep = String(base).includes("?") ? "&" : "?";
        setMapImageSrc(
          `${base}${sep}layer=${encodeURIComponent(layerId)}&err=1`,
        );
      });
  }, [backendBase, resultsModel?.map_layer_id]);

  const hero = useMemo(() => {
    return (
      <div className="mhsa-hero">
        <div className="mhsa-hero-left">
          <h2>{heroTitle}</h2>
          <p>Choose a search type on the right to begin.</p>
        </div>

        <div className="mhsa-hero-right">
          <img
            className="mhsa-hero-img"
            src="/images/clubcar/darkcarbackground.jpg"
            alt="Material Handling Situational Awareness"
            draggable={false}
          />
        </div>
      </div>
    );
  }, [heroTitle]);

  return (
    <div className="mhsa-page mhsa-home">
      <main className="mhsa-main">
        <section className="mhsa-left">
          {resultsModel ? (
            <SearchResults
              resultsModel={resultsModel}
              mapImageSrc={mapImageSrc}
              maplayer={maplayer}
              onPatchResults={(patch) =>
                setResultsModel((prev) => (prev ? { ...prev, ...patch } : prev))
              }
            />
          ) : (
            hero
          )}
        </section>

        <aside className="mhsa-aside">
          {uiMode === "menu" && (
            <SearchMenu
              onPick={(picked) => {
                setResultsModel(null);
                navigate(`/clubcar/search/${picked}`);
                setHeroTitle(
                  picked === "part" ? "Search: PartID" : "MHSA Search",
                );
              }}
            />
          )}

          {uiMode === "part" && (
            <PartIdPanel
              backendBase={backendBase}
              onBack={() => {
                setResultsModel(null);
                setHeroTitle("MHSA Search");
                navigate("/clubcar/mhsa");
              }}
              onResults={(model) => setResultsModel(model)}
            />
          )}

          {uiMode !== "part" && (
            <div className="mhsa-panel">
              <div className="mhsa-panelhdr">
                <h3>Coming Soon</h3>
                <button
                  className="mhsa-linkbtn"
                  onClick={() => navigate("/clubcar/mhsa")}
                >
                  ← Back
                </button>
              </div>
              <div className="mhsa-dim">
                Search mode: <b>{uiMode}</b>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function SearchResults({
  resultsModel,
  mapImageSrc,
  maplayer,
  onPatchResults,
}) {
  const [view, setView] = useState("table");
  if (!resultsModel) return null;

  const { title, type, tables, data, error } = resultsModel;
  const hasMap = (resultsModel?.icons?.length || 0) > 0;

  const parentLayerId =
    maplayer?.parent_id ||
    maplayer?.parent?.id ||
    (typeof maplayer?.parent === "string" ? maplayer.parent : null);

  const canZoomOut = !!parentLayerId;

  const handleZoomOut = () => {
    if (!parentLayerId) return;

    onPatchResults?.({
      map_layer_id: parentLayerId,
      icons: [],
    });
    console.log("[ZoomOut click]", {
      parentLayerId,
      before_layer: resultsModel?.map_layer_id,
    });
    console.log("Zoom out ->", parentLayerId);
    setView("map");
  };

  return (
    <div className="mhsa-results">
      <div className="mhsa-results-header">
        <h3>{title || "Results"}</h3>

        {resultsModel?.map_layer_id && (
          <div className="mhsa-results-meta mhsa-dim">
            layer: {resultsModel.map_layer_id.slice(0, 8)}…
          </div>
        )}

        {(hasMap || view === "map") && (
          <button
            className="mhsa-linkbtn"
            onClick={() => setView(view === "map" ? "table" : "map")}
          >
            {view === "map" ? "Table" : "Map"}
          </button>
        )}
      </div>

      {type === "error" && (
        <div className="mhsa-results-error">{error || "Unknown error"}</div>
      )}

      {resultsModel?.data?.item && (
        <div className="card mhsa-card mb-3">
          <div className="card-body">
            <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
              {resultsModel.data.item.part_number}
            </div>
            <div className="mhsa-dim">{resultsModel.data.item.description}</div>
          </div>
        </div>
      )}

      {view === "map" ? (
        <div className="mhsa-results-body">
          <div className="mhsa-map-stage">
            <MapOverlay
              key={mapImageSrc || "no-map"}
              mapImageSrc={mapImageSrc}
              icons={resultsModel?.icons || []}
            />

            <div className="mhsa-map-legend">
              <div className="mhsa-map-legend-title">
                Legend{" "}
                {maplayer?.layer_type && (
                  <span
                    className={`mhsa-scope-badge mhsa-scope-${String(maplayer.layer_type).toLowerCase()}`}
                  >
                    {String(maplayer.layer_type).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="mhsa-map-legend-row">
                <button
                  className="mhsa-linkbtn"
                  onClick={handleZoomOut}
                  title={
                    canZoomOut
                      ? "Zoom out to parent map"
                      : "No parent map configured yet"
                  }
                >
                  Zoom Out
                </button>

                <button
                  className="mhsa-linkbtn"
                  onClick={() => setView("table")}
                  title="Back to results table"
                >
                  Table
                </button>
              </div>

              <div className="mhsa-map-legend-body mhsa-dim">
                <div>
                  <b>Map:</b> {maplayer?.name || "unknown"}
                </div>

                <div style={{ marginTop: 4 }}>
                  <b>Scope:</b>{" "}
                  {maplayer?.layer_type
                    ? String(maplayer.layer_type).toUpperCase()
                    : "UNKNOWN"}
                </div>

                <div style={{ marginTop: 4 }} className="mhsa-dim">
                  <b>Layer ID:</b>{" "}
                  {resultsModel?.map_layer_id
                    ? `${String(resultsModel.map_layer_id).slice(0, 8)}…`
                    : "unknown"}
                </div>

                <div style={{ marginTop: 6 }}>
                  <b>Icons:</b> {(resultsModel?.icons || []).length}
                </div>

                <div style={{ marginTop: 6 }}>
                  Shapes/colors are CSS-driven (accessibility-friendly). (Next
                  step: cart-type shapes + open/closed state.)
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : Array.isArray(tables) && tables.length > 0 ? (
        <div className="mhsa-results-body">
          {tables.map((t, idx) => (
            <ResultTable key={idx} table={t} />
          ))}
        </div>
      ) : (
        <pre className="mhsa-results-pre">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

function ResultTable({ table }) {
  const { title, columns, rows } = table;

  return (
    <div className="card mhsa-card">
      <div className="card-header mhsa-card-header">
        <div className="mhsa-card-title">{title}</div>
        <div className="mhsa-card-sub">{rows.length} rows</div>
      </div>

      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-dark table-hover mb-0 mhsa-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key || c}>{c.label || c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ridx) => (
                <tr key={ridx}>
                  {columns.map((c) => {
                    const key = c.key || c;
                    return <td key={key}>{r[key] ?? ""}</td>;
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="text-center mhsa-dim py-3"
                  >
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SearchMenu({ onPick }) {
  return (
    <div className="mhsa-panel">
      <h3 className="mhsa-aside-title">Standard Searches</h3>
      <div className="mhsa-menu">
        <button className="mhsa-menu-btn" onClick={() => onPick("part")}>
          PartID (Standard Search)
        </button>
        <button className="mhsa-menu-btn" disabled>
          Description Search
        </button>
        <button className="mhsa-menu-btn" disabled>
          Collecting Dust
        </button>
        <button className="mhsa-menu-btn" disabled>
          Hot Commodity
        </button>
        <button className="mhsa-menu-btn" disabled>
          Parts that have high touches
        </button>
        <button className="mhsa-menu-btn" disabled>
          Open Racks
        </button>
        <button className="mhsa-menu-btn" disabled>
          Warehouse Browse
        </button>
        <button className="mhsa-menu-btn" disabled>
          Scan Events
        </button>
        <button className="mhsa-menu-btn" disabled>
          Transaction Events
        </button>
      </div>
    </div>
  );
}

function PartIdPanel({ backendBase, onBack, onResults }) {
  const [selected, setSelected] = useState(null);

  async function runPartSearch(partNumber) {
    if (!partNumber) return;

    const url = `${backendBase}/mhsa/search/partid?part_number=${encodeURIComponent(
      partNumber,
    )}`;

    const res = await fetch(url);
    if (!res.ok) {
      onResults({
        type: "error",
        title: "Search failed",
        error: `HTTP ${res.status}`,
      });
      return;
    }

    const data = await res.json();
    const item = data.item;

    const containersRows = (data.containers || []).map((c) => ({
      container_uid: c.container_uid,
      qty: c.qty,
      status: c.status,
      placement:
        c.placement === "location"
          ? `Location: ${c.location_name || ""}`
          : c.placement === "cartpod"
            ? `Cart: ${c.cart_name || ""} • Pod: ${c.pod_position_num ?? ""}`
            : "Unplaced",
      detail:
        c.placement === "cartpod"
          ? `${c.cart_location_name ? `@ ${c.cart_location_name}` : ""}${
              c.cart_asset_name ? ` • Asset ${c.cart_asset_name}` : ""
            }`
          : "",
    }));

    const looseRows = (data.loose_pods || []).map((p) => ({
      cart: p.cart_name,
      pod: p.pod_position_num,
      label: p.pod_label || "",
      qty: p.qty,
      where: p.cart_location_name || "",
    }));

    const map_layer_id = DEFAULT_MAP_LAYER_ID;
    const normalized = applySymbologyToPartSearchPayload(data);
    const icons = buildIconsFromPartSearch(normalized, map_layer_id);
    const upgradedIcons = (icons || []).map((ic) => {
      // If buildIconsFromPartSearch already set className, preserve it.
      // If backend provided symbology tokens, append the new cascade.
      const sym = ic?.symbology || ic?.sym || null;

      const extra = symbologyToClasses(sym);

      const base = (ic?.className || "").trim();
      const merged = [
        ...new Set([...(base ? base.split(/\s+/) : []), ...extra]),
      ].join(" ");

      return { ...ic, className: merged };
    });
    console.log("built icons:", icons.length, icons);

    onResults({
      type: "partid",
      title: `PartID: ${item.part_number}`,
      map_layer_id,
      data: normalized,
      icons: upgradedIcons,
      tables: [
        {
          title: "Containers holding this Item",
          columns: [
            { key: "container_uid", label: "Container UID" },
            { key: "qty", label: "Qty" },
            { key: "status", label: "Status" },
            { key: "placement", label: "Placement" },
            { key: "detail", label: "Detail" },
          ],
          rows: containersRows,
        },
        ...(looseRows.length
          ? [
              {
                title: "Loose Pods holding this Item",
                columns: [
                  { key: "cart", label: "Cart" },
                  { key: "pod", label: "Pod" },
                  { key: "label", label: "Label" },
                  { key: "qty", label: "Qty" },
                  { key: "where", label: "Where" },
                ],
                rows: looseRows,
              },
            ]
          : []),
      ],
    });
  }

  return (
    <div className="mhsa-panel">
      <div className="mhsa-panelhdr">
        <h3>PartID</h3>
        <button className="mhsa-linkbtn" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="mhsa-dim">
        Enter a part number. Hints appear as you type. Pick a hint or press
        Enter.
      </div>

      <ItemLookupInput
        backendBase={backendBase}
        minChars={1}
        onPickHint={(h) => {
          setSelected(h);
          runPartSearch(h.part_number);
        }}
        onSubmitPartNumber={(pn) => runPartSearch(pn)}
      />

      {selected && (
        <div className="mhsa-selected">
          <div>
            <b>Selected:</b> {selected.part_number}
          </div>
          <div className="mhsa-dim">{selected.description}</div>
        </div>
      )}
    </div>
  );
}

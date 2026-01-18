/* eslint-disable react/prop-types */

import { useEffect, useMemo, useState } from "react";
import "./mhsa_home.css";
import "./Search.css";
import { ItemLookupInput } from "/src/components/ItemLookupInput";
import { useParams, useNavigate } from "react-router-dom";
import MapOverlay from "/src/components/map/MapOverlay";
import { buildIconsFromPartSearch } from "/src/components/map/search_map_icons";

export default function Search() {
  const backendBase = import.meta.env.VITE_BACKEND_URL;
  // Hard-code Evans layer for now so we can verify /mhsa/maplayer/... response
  // and test Cloudflare CDN by setting MapLayer.image_uri in the DB.
  const MAP_LAYER_ID = "87403789-d602-4382-8ba1-130efb74dbd2";

  const [maplayer, setMaplayer] = useState(null);
  const [mapImageSrc, setMapImageSrc] = useState(
    "/images/clubcar/darkcarbackground.jpg",
  ); // fallback
  const [resultsModel, setResultsModel] = useState(null); // future: { type, data, overlays }

  const navigate = useNavigate();

  const { mode: routeMode } = useParams(); // "part", "description", etc.
  const uiMode = routeMode || "menu"; // single source of truth
  const [heroTitle, setHeroTitle] = useState("MHSA Search");

  useEffect(() => {
    // Only fetch when user is actually looking at results (avoid noise)
    if (!resultsModel) return;

    const url = `${backendBase}/mhsa/maplayer/${MAP_LAYER_ID}/`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        console.log("maplayer JSON (verify br_lat/br_lon):", j);
        setMaplayer(j);
        if (j?.image_uri) setMapImageSrc(j.image_uri); // <-- DB controls CDN vs localhost
      })
      .catch((e) => {
        console.warn("maplayer fetch failed:", e);
      });
  }, [backendBase, resultsModel]);

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
          {/* Left area: hero initially; later: results table and/or map overlays */}
          {resultsModel ? <SearchResults resultsModel={resultsModel} /> : hero}
        </section>

        <aside className="mhsa-aside">
          {uiMode === "menu" && (
            <SearchMenu
              onPick={(picked) => {
                setResultsModel(null);

                // picked values should be URL-friendly: "part", "description", etc.
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

function SearchResults({ resultsModel }) {
  const [view, setView] = useState("table"); // "table" | "map"
  if (!resultsModel) return null;

  const { title, type, tables, data, error } = resultsModel;
  const hasMap = (resultsModel?.icons?.length || 0) > 0;

  return (
    <div className="mhsa-results">
      <div className="mhsa-results-header">
        <h3>{title || "Results"}</h3>
        <div className="mhsa-results-meta">{type}</div>
        {hasMap && (
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

      {/* Preferred: render tables if provided */}
      {view === "map" ? (
        <div className="mhsa-results-body">
          <MapOverlay
            mapImageSrc={mapImageSrc}
            icons={resultsModel?.icons || []}
          />
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
  const [selected, setSelected] = useState(null); // hint selection

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

    // ==============================
    // HARD-CODED MAP LAYER ID (TEMP)
    // ==============================
    // Used by buildIconsFromPartSearch() so we can test maplayer JSON upgrades
    // (origin_lat/origin_lon + br_lat/br_lon + rotation_deg) without wiring
    // up facility selection yet.
    const MAP_LAYER_ID = "87403789-d602-4382-8ba1-130efb74dbd2"; // Evans low_res layer id
    const icons = buildIconsFromPartSearch(data, MAP_LAYER_ID);

    console.log("built icons:", icons.length, icons);

    onResults({
      type: "partid",
      title: `PartID: ${item.part_number}`,
      data,
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
      icons, // ✅ attach icons to resultsModel
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

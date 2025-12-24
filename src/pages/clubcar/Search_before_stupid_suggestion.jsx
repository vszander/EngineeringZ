/* eslint-disable react/prop-types */

import { useMemo, useState } from "react";
import "./mhsa_home.css";
import "./Search.css";
import { ItemLookupInput } from "/src/components/ItemLookupInput";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Search() {
  const backendBase = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const { mode: routeMode } = useParams(); // rename to avoid confusion
  // "part", "description", etc.
  const [uiMode, setUiMode] = useState(routeMode || "part"); // default to PartID
  const [heroTitle, setHeroTitle] = useState("MHSA Search");
  const [resultsModel, setResultsModel] = useState(null); // future: { type, data, overlays }

  const hero = useMemo(() => {
    return (
      <div className="mhsa-hero">
        <div className="mhsa-hero-inner">
          <h2>{heroTitle}</h2>
          <p>Choose a search type on the right to begin.</p>
        </div>
      </div>
    );
  }, [heroTitle]);

  useEffect(() => {
    setUiMode(routeMode || "part");
  }, [routeMode]);

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
                  picked === "part" ? "Search: PartID" : "MHSA Search"
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
  if (!resultsModel) return null;

  const { title, type, tables, data, error } = resultsModel;

  return (
    <div className="mhsa-results">
      <div className="mhsa-results-header">
        <h3>{title || "Results"}</h3>
        <div className="mhsa-results-meta">{type}</div>
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
      {Array.isArray(tables) && tables.length > 0 ? (
        <div className="mhsa-results-body">
          {tables.map((t, idx) => (
            <ResultTable key={idx} table={t} />
          ))}
        </div>
      ) : (
        /* Fallback: show raw payload */
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
  const navigate = useNavigate();

  async function runPartSearch(partNumber) {
    if (!partNumber) return;

    // placeholder endpoint (we implement later)
    const url = `${backendBase}/mhsa/search/partid?part_number=${encodeURIComponent(
      partNumber
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

    // expected future model:
    // { item: {...}, locations:[...], containers:[...], carts:[...], overlays:[...] }
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
    });
  }

  return (
    <div className="mhsa-dark">
      <div className="mhsa-rail">
        <div className="mhsa-search-grid">
          {/* LEFT: results pane / hero */}
          <section className="mhsa-search-left">
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                zIndex: 99999,
                background: "red",
                color: "white",
                padding: 6,
              }}
            >
              SEARCH PAGE DEBUG
            </div>
            <div className="mhsa-hero">
              <div className="mhsa-hero-left">
                <h2>MHSA Search</h2>
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
          </section>

          {/* RIGHT: your existing PartID panel (unchanged logic) */}
          <aside className="mhsa-search-aside">
            <div className="mhsa-panel">
              <div className="mhsa-panelhdr">
                <h3>PartID</h3>
                <button className="mhsa-linkbtn" onClick={onBack}>
                  ← Back
                </button>
              </div>

              <div className="mhsa-dim">
                Enter a part number. Hints appear as you type. Pick a hint or
                press Enter.
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
          </aside>
        </div>
      </div>
    </div>
  );
}

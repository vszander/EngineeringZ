/* eslint-disable react/prop-types */

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./mhsa_home.css";
import "./Search.css"; // reuse your styling
import "./Maintenance.css"; // tiny add-ons (optional, below)
const LS_KEY = "mhsa.maintenance.createCart.defaults";
const DEFAULT_LOC_ID = "2d8a473d-c81d-40d2-81ed-eafd36f481b0";
const DEFAULT_LOC_NAME = "ROCK_sort_1";
const DEFAULT_ICON_URI = "/images/cbcar/Tugger.png";

function loadDefaults() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDefaults(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

function bumpTrailingNumber(s) {
  const m = String(s || "").match(/^(.*?)(\d+)\s*$/);
  if (!m) return s;
  const prefix = m[1];
  const digits = m[2];
  const n = String(parseInt(digits, 10) + 1).padStart(digits.length, "0");
  return `${prefix}${n}`;
}

export default function Maintenance() {
  const backendBase = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const { tool: routeTool } = useParams();

  const tool = routeTool || "menu";

  const [statusHtml, setStatusHtml] = useState("");
  const [resultJson, setResultJson] = useState(null);

  const hero = useMemo(() => {
    return (
      <div className="mhsa-hero">
        <div className="mhsa-hero-left">
          <h2>MHSA Maintenance</h2>
          <p>Pick a maintenance tool on the right to begin.</p>
        </div>

        <div className="mhsa-hero-right">
          <img
            className="mhsa-hero-img"
            src="/images/clubcar/darkcarbackground.jpg"
            alt="MHSA Maintenance"
            draggable={false}
          />
        </div>
      </div>
    );
  }, []);

  return (
    <div className="mhsa-page mhsa-home">
      <main className="mhsa-main">
        {/* LEFT: work/results pane */}
        <section className="mhsa-left">
          {tool === "menu" && hero}

          {tool === "create-cart" && (
            <CreateCartPanel
              backendBase={backendBase}
              onBack={() => navigate("/clubcar/maintenance/menu")}
              onStatusHtml={(html) => setStatusHtml(html || "")}
              onResultJson={(obj) => setResultJson(obj || null)}
            />
          )}

          {tool !== "menu" && tool !== "create-cart" && (
            <div className="mhsa-panel">
              <div className="mhsa-panelhdr">
                <h3>Coming Soon</h3>
                <button
                  className="mhsa-linkbtn"
                  onClick={() => navigate("/clubcar/maintenance/menu")}
                >
                  ← Back
                </button>
              </div>
              <div className="mhsa-dim">
                Maintenance tool: <b>{tool}</b>
              </div>
            </div>
          )}

          {/* Optional: a shared status/result viewer under tools */}
          {(statusHtml || resultJson) && (
            <div className="mhsa-panel" style={{ marginTop: 12 }}>
              <div className="mhsa-panelhdr">
                <h3>Result</h3>
                <button
                  className="mhsa-linkbtn"
                  onClick={() => {
                    setStatusHtml("");
                    setResultJson(null);
                  }}
                >
                  Clear
                </button>
              </div>

              {statusHtml && (
                <div
                  className="mhsa-panelbody"
                  dangerouslySetInnerHTML={{ __html: statusHtml }}
                />
              )}

              {resultJson && (
                <pre className="mhsa-pre">
                  {JSON.stringify(resultJson, null, 2)}
                </pre>
              )}
            </div>
          )}
        </section>

        {/* RIGHT: menu pane */}
        <aside className="mhsa-aside">
          <MaintenanceMenu
            activeTool={tool}
            onPick={(picked) => navigate(`/clubcar/maintenance/${picked}`)}
            onGoHome={() => navigate("/clubcar/mhsa")}
          />
        </aside>
      </main>
    </div>
  );
}

function MaintenanceMenu({ activeTool, onPick, onGoHome }) {
  return (
    <div className="mhsa-panel">
      <div className="mhsa-panelhdr">
        <h3>Maintenance</h3>
        <button className="mhsa-linkbtn" onClick={onGoHome}>
          ← MHSA Home
        </button>
      </div>

      <div className="mhsa-dim">
        Admin tools to maintain carts, pods, containers, and locations without
        psql.
      </div>

      <div className="mhsa-menu">
        <button
          className={`mhsa-menu-btn ${
            activeTool === "create-cart" ? "is-active" : ""
          }`}
          onClick={() => onPick("create-cart")}
        >
          Create Cart + N Pods + Initial Location
        </button>

        <button
          className={`mhsa-menu-btn ${
            activeTool === "move-cart" ? "is-active" : ""
          }`}
          onClick={() => onPick("move-cart")}
        >
          Move Cart to Location (coming soon)
        </button>

        <button
          className={`mhsa-menu-btn ${
            activeTool === "seed-container" ? "is-active" : ""
          }`}
          onClick={() => onPick("seed-container")}
        >
          Create Container + Load Item Qty (coming soon)
        </button>
      </div>
    </div>
  );
}

function CreateCartPanel({ backendBase, onBack, onStatusHtml, onResultJson }) {
  const defaults = loadDefaults();
  const [name, setName] = useState(defaults.name || "");
  const [cartType, setCartType] = useState(defaults.cart_type || "Supermarket");
  const [pods, setPods] = useState(defaults.pod_count ?? 12);
  const [locationId, setLocationId] = useState(
    defaults.initial_location_id || DEFAULT_LOC_ID
  );
  const [locationName, setLocationName] = useState(
    defaults.initial_location_name || DEFAULT_LOC_NAME
  );

  async function submit() {
    onStatusHtml("");
    onResultJson(null);

    // Placeholder endpoint we will implement next:
    // POST `${backendBase}/mhsa/maintenance/cart/create`
    const payload = {
      name: name.trim(),
      cart_type: cartType,
      pod_count: Number(pods),
      // preferred
      initial_location_id: locationId.trim(),

      // optional (nice for logging / human readability)
      initial_location_name: locationName.trim(),

      // future-proof (your backend can ignore it for now if you want)
      icon_uri: DEFAULT_ICON_URI,
    };

    try {
      const url = `${backendBase}/mhsa/maintenance/cart/create`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const data = await res.json();
      saveDefaults({
        name,
        cart_type: cartType,
        pod_count: Number(pods),
        initial_location_name: locationName,
      });

      setName((prev) => bumpTrailingNumber(prev));
      onResultJson(data);
      onStatusHtml(
        `<div style="opacity:.85">Created cart <b>${
          data.cart?.name || ""
        }</b> with <b>${data.pods_created ?? "?"}</b> pods.</div>`
      );
    } catch (e) {
      onStatusHtml(
        `<div style="color:#f2844e">Error: ${String(e.message || e)}</div>`
      );
    }
  }

  return (
    <div className="mhsa-panel">
      <div className="mhsa-panelhdr">
        <h3>Create Cart</h3>
        <button className="mhsa-linkbtn" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="mhsa-dim">
        Creates a new cart, generates <b>N</b> pods, and assigns an initial
        location.
      </div>

      <div className="mhsa-form">
        <div className="mhsa-field">
          <label className="mhsa-label">Cart Name</label>
          <input
            className="mhsa-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. SMKT-CART-001"
          />
        </div>

        <div className="mhsa-field">
          <label className="mhsa-label">Cart Type</label>
          <input
            className="mhsa-input"
            value={cartType}
            onChange={(e) => setCartType(e.target.value)}
            placeholder="e.g. Supermarket"
          />
        </div>

        <div className="mhsa-field">
          <label className="mhsa-label">Pod Count</label>
          <input
            className="mhsa-input"
            type="number"
            min="1"
            max="60"
            value={pods}
            onChange={(e) => setPods(e.target.value)}
          />
        </div>

        <div className="mhsa-field">
          <label className="mhsa-label">Initial Location ID (UUID)</label>
          <input
            className="mhsa-input"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder={DEFAULT_LOC_ID}
          />
        </div>

        <div className="mhsa-field">
          <label className="mhsa-label">Initial Location Name (display)</label>
          <input
            className="mhsa-input"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder={DEFAULT_LOC_NAME}
          />
        </div>

        <div className="mhsa-actions">
          <button className="mhsa-btn" onClick={submit} disabled={!name.trim()}>
            Create
          </button>
          <button
            className="mhsa-btn mhsa-btn-ghost"
            onClick={() => {
              setName("");
              setCartType("Supermarket");
              setPods(12);
              setLocationId(DEFAULT_LOC_ID);
              setLocationName(DEFAULT_LOC_NAME);
            }}
          >
            Reset
          </button>
        </div>

        <div className="mhsa-dim" style={{ marginTop: 8 }}>
          Endpoint to implement next:{" "}
          <code>{backendBase}/mhsa/maintenance/cart/create</code>
        </div>
      </div>
    </div>
  );
}

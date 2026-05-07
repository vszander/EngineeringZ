/* eslint-disable react/prop-types */

import { useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./mhsa_home.css";
//import "./Search.css"; // reuse your styling
//import "./Maintenance.css"; // tiny add-ons (optional, below)
import MoveCarts from "./MoveCarts";

import Swal from "sweetalert2";
const LS_KEY = "mhsa.maintenance.createCart.defaults";
const DEFAULT_ICON_URI = "/images/cbcar/Tugger.png";

function loadDefaults() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

const backendBase = import.meta.env.VITE_BACKEND_URL;

function playBeep(ok = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.value = ok ? 880 : 220; // success high, error low
    g.gain.value = 0.06;

    o.connect(g);
    g.connect(ctx.destination);

    o.start();
    o.stop(ctx.currentTime + (ok ? 0.08 : 0.18));

    o.onended = () => ctx.close();
  } catch {
    // ignore (browser restrictions)
  }
}

function getCsrfToken() {
  const name = "csrftoken=";
  const parts = document.cookie.split(";");
  for (let part of parts) {
    part = part.trim();
    if (part.startsWith(name))
      return decodeURIComponent(part.substring(name.length));
  }
  return "";
}

async function publishDemoImage(
  panelId = "panel-01",
  imageKey = "welcome-demo",
) {
  const formData = new FormData();
  formData.append("image_key", imageKey);

  const response = await fetch(
    `${backendBase}/mhsa/api/epaper/panel/${encodeURIComponent(panelId)}/publish-demo-image/`,
    {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
        Accept: "application/json",
      },
    },
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    console.error("Failed to publish demo image:", data);
    window.alert("Failed to publish demo image.");
    return;
  }

  console.log("Published demo image:", data);
}

export default function Maintenance() {
  const navigate = useNavigate();
  const { tool: routeTool } = useParams();

  const tool = routeTool || "menu";

  const [statusHtml, setStatusHtml] = useState("");
  const [resultJson, setResultJson] = useState(null);
  const [simBusy, setSimBusy] = useState(false);
  const [simMsg, setSimMsg] = useState("");
  const [preset, setPreset] = useState("demo_default");

  async function startSimulation() {
    try {
      setSimBusy(true);
      setSimMsg("Starting simulation...");

      const res = await fetch(`${backendBase}/mhsa/api/simulation/start/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
          Accept: "application/json",
        },
        body: JSON.stringify({
          preset,
          speed: 1.0,
          loop: false,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setSimMsg(data.message || "Simulation started.");

      await Swal.fire({
        icon: "success",
        title: "Simulation started",
        text: data.message || `Preset '${preset}' started.`,
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("startSimulation failed:", err);
      const msg = `Simulation failed: ${err.message}`;
      setSimMsg(msg);

      await Swal.fire({
        icon: "error",
        title: "Simulation failed",
        text: String(err.message || err),
      });
    } finally {
      setSimBusy(false);
    }
  }

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
          {tool === "move-cart" && <MoveCarts />}

          {tool !== "menu" &&
            tool !== "create-cart" &&
            tool !== "move-cart" && (
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

          <SimulationCard
            preset={preset}
            setPreset={setPreset}
            simBusy={simBusy}
            simMsg={simMsg}
            onStart={startSimulation}
          />
        </aside>
      </main>
    </div>
  );
}

function MaintenanceMenu({ activeTool, onPick, onGoHome }) {
  const backendURL = import.meta.env.VITE_BACKEND_URL;
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
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => publishDemoImage("panel-01", "welcome-demo")}
        >
          Publish Welcome Placard
        </button>
        <button
          className={`mhsa-menu-btn ${
            activeTool === "create-cart" ? "is-active" : ""
          }`}
          onClick={() => onPick("create-cart")}
        >
          Create Cart + Pods + Location
        </button>

        <button
          className={`mhsa-menu-btn ${
            activeTool === "move-cart" ? "is-active" : ""
          }`}
          onClick={() => onPick("move-cart")}
        >
          Move Cart
        </button>

        <button
          className={`mhsa-menu-btn ${
            activeTool === "seed-container" ? "is-active" : ""
          }`}
          onClick={() => onPick("seed-container")}
        >
          Create Container + Load Item Qty (coming soon)
        </button>
        <button
          className="btn btn-outline-primary"
          onClick={() =>
            window.open(
              `${backendURL}/mhsa/maintenance/labels/studio/`,
              "labelStudio",
              "width=1200,height=900,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes",
            )
          }
        >
          BarCode Label Studio
        </button>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() =>
            window.open(
              `${backendURL}/mhsa/helper/dropdowns/`,
              "DropdownsHelper",
              "width=1200,height=900,noopener,noreferrer",
            )
          }
        >
          Dropdowns Helper
        </button>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() =>
            window.open(
              `${backendURL}/mhsa/helper/preferences/`,
              "PreferencesHelper",
              "width=1200,height=900,noopener,noreferrer",
            )
          }
        >
          Preferences Helper
        </button>
      </div>
    </div>
  );
}

function SimulationCard({ preset, setPreset, simBusy, simMsg, onStart }) {
  return (
    <div className="maint-card">
      <div className="maint-card__title">Simulation</div>

      <div
        className="maint-row"
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label htmlFor="sim-preset">Preset</label>

        <select
          id="sim-preset"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
          disabled={simBusy}
          className="mhsa-input"
          style={{ maxWidth: 220 }}
        >
          <option value="demo_default">Demo Default</option>
          <option value="demo_mes_heavy">MES Heavy</option>
          <option value="demo_scan_heavy">Scan Heavy</option>
          <option value="demo_tugger_loop">Tugger Loop</option>
        </select>

        <button
          type="button"
          className="mhsa-btn"
          onClick={onStart}
          disabled={simBusy}
        >
          {simBusy ? "Starting..." : "Start Simulation"}
        </button>
      </div>

      {simMsg ? (
        <div className="maint-help-text" style={{ marginTop: "0.75rem" }}>
          {simMsg}
        </div>
      ) : null}
    </div>
  );
}

function CreateCartPanel({ backendBase, onBack, onStatusHtml, onResultJson }) {
  const defaults = loadDefaults();

  const [upcValue, setUPC] = useState("");
  const [cartType, setCartType] = useState(defaults.cart_type || "FrameRails");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const upcRef = useRef(null);

  const toast = Swal.mixin({
    toast: true,
    position: "center",
    showConfirmButton: false,
    timer: 1600,
    timerProgressBar: true,
    showClass: { popup: "" },
    hideClass: { popup: "" },
    didOpen: (t) => {
      t.addEventListener("mouseenter", Swal.stopTimer);
      t.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  function normalizeUPC(v) {
    return (v || "").trim().toUpperCase();
  }

  function isValidUPC(v) {
    // Code39-ish alphanum; tighten later to your exact standard
    return /^[A-Z0-9]{8,32}$/.test(v);
  }

  async function submitFromScan(raw) {
    const upc = normalizeUPC(raw);

    onStatusHtml("");
    onResultJson(null);

    if (!upc) return;

    if (!isValidUPC(upc)) {
      playBeep(false);
      toast.fire({
        icon: "error",
        title: "Invalid code",
        text: upc,
        background: "#d7d8c6",
        color: "#155157",
        iconColor: "#f2844e",
      });
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      name: upc, // ✅ default name to UPC
      upc: upc,
      cart_type: cartType,
      pod_count: 1, // ✅ fixed for this sprint
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
      onResultJson(data);

      playBeep(true);

      toast.fire({
        icon: "success",
        title: "Cart created",
        html: `
          <div style="font-size:.95rem">
            <b>${data?.cart?.name ?? upc}</b>
            <div style="opacity:.85">
              ${
                data?.cart?.current_location_name
                  ? `Assigned to <b>${data.cart.current_location_name}</b>. `
                  : ""
              }
              Pods: <b>${data?.pods_created ?? 1}</b>
            </div>
          </div>
        `,
        background: "#d7d8c6",
        color: "#155157",
        iconColor: "#0c9c89",
      });

      // clear for next scan
      setUPC("");
      requestAnimationFrame(() => upcRef.current?.focus());
    } catch (e) {
      playBeep(false);
      toast.fire({
        icon: "error",
        title: "Create failed",
        text: String(e?.message || e),
        background: "#d7d8c6",
        color: "#155157",
        iconColor: "#f2844e",
      });
      // keep value so they can rescan/adjust
      requestAnimationFrame(() => upcRef.current?.focus());
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleUPCChange(e) {
    setUPC(e.target.value.toUpperCase());
  }

  function handleUPCKeyDown(e) {
    // Many scanners send Enter; some can be configured to send Tab
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      submitFromScan(e.currentTarget.value);
    }
  }
  return (
    <div className="mhsa-panel">
      <div className="mhsa-panelhdr">
        <h3>Create Cart</h3>
        <button className="mhsa-linkbtn" onClick={onBack}>
          ← Back
        </button>
        <span className="mhsa-hdr-sep" />
        <button
          className="mhsa-linkbtn"
          onClick={() =>
            window.open(
              `${backendBase}/mhsa/carts/popup/`,
              "cartPopup",
              "width=1100,height=850,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes",
            )
          }
        >
          Manual Add / Edit Cart
        </button>
      </div>

      <div className="mhsa-panelbody">
        <div className="mhsa-field">
          <label className="mhsa-label">UPC Code (scan here)</label>
          <input
            ref={upcRef}
            className="mhsa-input"
            value={upcValue}
            onChange={handleUPCChange}
            onKeyDown={handleUPCKeyDown}
            placeholder="Scan barcode…"
            autoFocus
            disabled={isSubmitting}
          />
          <div className="mhsa-dim" style={{ marginTop: 6 }}>
            Name will default to the UPC. Pods fixed at <b>1</b> for this
            sprint.
          </div>
        </div>

        <div className="mhsa-field">
          <label className="mhsa-label">Cart Type</label>
          <input
            className="mhsa-input"
            value={cartType}
            onChange={(e) => setCartType(e.target.value)}
            placeholder="e.g. FrameRails"
            disabled={isSubmitting}
          />
        </div>

        {/* Optional manual button (still helpful) */}
        <button
          className="mhsa-btn"
          onClick={() => submitFromScan(upcValue)}
          disabled={isSubmitting || !normalizeUPC(upcValue)}
          style={{ marginTop: 12 }}
        >
          Create (Enter)
        </button>
      </div>
    </div>
  );
}

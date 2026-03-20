// mhsa_hud_ai_panel.js
// React-imported enhancer for Django-rendered AI aside fragment

const DEBUG = true;

import Swal from "sweetalert2";

function log(...args) {
  if (DEBUG) console.log("[MHSA AI PANEL]", ...args);
}

function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function sumWeights(weights, keys) {
  return keys.reduce((acc, key) => acc + (Number(weights[key]) || 0), 0);
}

function sliderPct(value, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (Number(value || 0) / Number(total)) * 100));
}

/*
  Business rule for this sprint:
  - total is fixed (normally 10)
  - active slider keeps requested value as much as possible
  - if total exceeds cap, reduce OTHER sliders in top-to-bottom order
  - if total falls below cap, add back to OTHER sliders in top-to-bottom order
*/
function rebalanceToTotal(next, targetKey, total, keys) {
  const out = {};

  for (const key of keys) {
    out[key] = clampInt(next[key] ?? 0, 0, total);
  }

  let totalNow = sumWeights(out, keys);

  if (totalNow > total) {
    let overflow = totalNow - total;
    const others = influenceOrderFor(targetKey);

    for (const key of others) {
      if (overflow <= 0) break;
      const current = out[key];
      if (current <= 0) continue;

      const take = Math.min(current, overflow);
      out[key] = current - take;
      overflow -= take;
    }

    if (overflow > 0) {
      out[targetKey] = Math.max(0, out[targetKey] - overflow);
    }
  } else if (totalNow < total) {
    let deficit = total - totalNow;
    const others = influenceOrderFor(targetKey);

    for (const key of others) {
      if (deficit <= 0) break;
      const room = total - out[key];
      if (room <= 0) continue;

      const add = Math.min(room, deficit);
      out[key] += add;
      deficit -= add;
    }

    if (deficit > 0) {
      out[targetKey] = Math.min(total, out[targetKey] + deficit);
    }
  }

  return out;
}

function readJsonScriptWithinMount(root, id) {
  if (!root) return {};

  const mount =
    root.closest("#mhsaHudAsideMount") || root.parentElement || document;
  const elInMount = mount.querySelector(`#${CSS.escape(id)}`);
  if (elInMount) {
    try {
      return JSON.parse(elInMount.textContent || "{}");
    } catch (err) {
      log(`JSON parse failed for #${id} inside mount`, err);
      return {};
    }
  }

  const elGlobal = document.getElementById(id);
  if (elGlobal) {
    try {
      return JSON.parse(elGlobal.textContent || "{}");
    } catch (err) {
      log(`JSON parse failed for #${id} in document`, err);
      return {};
    }
  }

  return {};
}

function influenceOrderFor(targetKey) {
  switch (targetKey) {
    case "urgency":
      return ["efficiency", "handling", "footprint"];
    case "efficiency":
      return ["handling", "footprint", "urgency"];
    case "handling":
      return ["footprint", "efficiency", "urgency"];
    case "footprint":
      return ["handling", "efficiency", "urgency"];
    default:
      return ["urgency", "efficiency", "handling", "footprint"].filter(
        (k) => k !== targetKey,
      );
  }
}

function drawRadar(canvas, weights, total, labels) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 320;
  const cssH = canvas.clientHeight || 240;

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = cssW / 2;
  const cy = cssH / 2;
  const R = Math.min(cssW, cssH) * 0.34;

  ctx.clearRect(0, 0, cssW, cssH);

  const axisStroke = "rgba(0, 220, 255, 0.88)";
  const tickStroke = "rgba(0, 220, 255, 0.72)";
  const fillPoly = "rgba(20, 141, 151, 0.18)";
  const strokePoly = "rgba(26, 232, 255, 0.98)";
  const pointFill = "rgba(26, 232, 255, 1)";
  const textFill = "rgba(222, 238, 246, 0.96)";

  // Intended business trade-off orientation:
  // top = urgency, right = handling, bottom = efficiency, left = footprint
  const axisMap = [
    { key: "urgency", angle: -Math.PI / 2, label: labels.urgency || "Urgency" },
    { key: "handling", angle: 0, label: labels.handling || "Handling" },
    {
      key: "efficiency",
      angle: Math.PI / 2,
      label: labels.efficiency || "Efficiency",
    },
    {
      key: "footprint",
      angle: Math.PI,
      label: labels.footprint || "Footprint",
    },
  ];

  // Crosshair axes
  ctx.strokeStyle = axisStroke;
  ctx.lineWidth = 1.25;

  for (const axis of axisMap) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(axis.angle), cy + R * Math.sin(axis.angle));
    ctx.stroke();
  }

  // Tick marks
  ctx.strokeStyle = tickStroke;
  ctx.lineWidth = 1;

  for (const axis of axisMap) {
    const nx = Math.cos(axis.angle + Math.PI / 2);
    const ny = Math.sin(axis.angle + Math.PI / 2);

    for (let step = 1; step <= total; step++) {
      const rr = (R * step) / total;
      const tx = cx + rr * Math.cos(axis.angle);
      const ty = cy + rr * Math.sin(axis.angle);
      const half = 6;

      ctx.beginPath();
      ctx.moveTo(tx - nx * half, ty - ny * half);
      ctx.lineTo(tx + nx * half, ty + ny * half);
      ctx.stroke();
    }
  }

  // Labels
  ctx.fillStyle = textFill;
  ctx.font = "600 12px system-ui, -apple-system, Segoe UI, Roboto, Arial";

  for (const axis of axisMap) {
    const lx = cx + (R + 22) * Math.cos(axis.angle);
    const ly = cy + (R + 22) * Math.sin(axis.angle);

    if (axis.key === "handling") ctx.textAlign = "left";
    else if (axis.key === "footprint") ctx.textAlign = "right";
    else ctx.textAlign = "center";

    if (axis.key === "urgency") ctx.textBaseline = "bottom";
    else if (axis.key === "efficiency") ctx.textBaseline = "top";
    else ctx.textBaseline = "middle";

    ctx.fillText(axis.label, lx, ly);
  }

  // Polygon in axis order
  const points = axisMap.map((axis) => {
    const v = (Number(weights[axis.key]) || 0) / total;
    return {
      x: cx + R * v * Math.cos(axis.angle),
      y: cy + R * v * Math.sin(axis.angle),
    };
  });

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();

  ctx.fillStyle = fillPoly;
  ctx.fill();

  ctx.strokeStyle = strokePoly;
  ctx.lineWidth = 2.25;
  ctx.shadowColor = "rgba(26, 232, 255, 0.38)";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = pointFill;
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readPanelContext(root) {
  const titleText =
    root.querySelector(".mhsa-hud-aside-titletext")?.textContent?.trim() || "";
  const titleLine =
    root.querySelector(".mhsa-hud-aside-title")?.textContent?.trim() || "";

  const partNumberFromTitle = titleLine.includes("•")
    ? titleLine.split("•").pop().trim()
    : "";

  return {
    eventId: root.dataset.eventId || "",
    action: root.dataset.action || "DISPOSITION",
    eventType: root.dataset.eventType || "PARTLOW",
    partNumber: root.dataset.partNumber || partNumberFromTitle || "",
    partDescription:
      root.dataset.partDescription || titleText || "Unknown Part",
    stationCode: root.dataset.stationCode || "05M13",
    cartUpc: root.dataset.cartUpc || "",
    total: Number(root.dataset.total || 10),
  };
}

function getRecommendationPayload(context, guidance) {
  const urgencyBias =
    guidance.urgency >= 4 ? "as soon as practical" : "on next efficient route";
  const tuggerAsset = guidance.efficiency >= 4 ? "Billy" : "Tugger 3";
  const loadStation = guidance.handling >= 4 ? "Bristol_1" : "MilkRun_2";
  const routeId = guidance.efficiency >= 4 ? "13001" : "13007";
  const pickLocation = guidance.urgency >= 4 ? "AB102" : "AB118";

  return {
    pickLocation,
    timingPhrase: urgencyBias,
    tuggerAsset,
    loadStation,
    loadTime: "13:07",
    routeId,
    pouStation: context.stationCode || "05M13",
    pouArrivalTime: guidance.urgency >= 4 ? "13:10" : "13:16",
    nearbyEmptyBins: guidance.footprint <= 2 ? ["05M15", "05M17"] : ["05M14"],
    routeStops: [
      {
        station: "05M02",
        partNumber: "47582268001",
        description: "ASSY, HOLDER, GOLF BAG, MX5",
      },
      {
        station: "05FF2",
        partNumber: "47617178002",
        description: "PLUG, CORD, DC LESTER, 12'",
      },
      {
        station: context.stationCode || "05M13",
        partNumber: context.partNumber || "47787300002",
        description: context.partDescription || "HARNESS, MAIN, GAS, CSMR, 6P",
      },
    ],
  };
}

const PART_CONSTRAINT_FLASHES = [
  "size",
  "weight",
  "on-hand",
  "UOM",
  "POU QTY",
  "Cart Capacity",
];

const AI_STAGES = [
  {
    key: "future_tugger_schedules",
    label: "Analyzing future Tugger schedules",
    duration: 2200,
    kind: "spinner",
  },
  {
    key: "facility_edges_routes",
    label: "Downloading Facility Edges and Routes",
    duration: 1800,
    kind: "spinner",
  },
  {
    key: "tugger_positions",
    label: "Downloading Tugger position data for last hour",
    duration: 2200,
    kind: "spinner",
  },
  {
    key: "preferred_route_metadata",
    label: "Downloading preferred route metadata",
    duration: 1800,
    kind: "spinner",
  },
  {
    key: "part_constraints",
    label: "Analyzing Part constraints",
    duration: 2600,
    kind: "flash-list",
  },
  {
    key: "production_schedule",
    label: "Downloading Production Schedule for next hour",
    duration: 1800,
    kind: "spinner",
  },
  {
    key: "starvation_schedule",
    label: "Downloading Starvation Schedule",
    duration: 1800,
    kind: "spinner",
  },
  {
    key: "manager_guidance",
    label: "Receive Manager Guidance",
    duration: 1600,
    kind: "guidance",
  },
  {
    key: "compare_options",
    label: "Comparing options",
    duration: 4200,
    kind: "progress",
  },
];

function stageListHtml(stages, activeIndex) {
  return `
    <div class="mhsa-ai-swal">
      <div class="mhsa-ai-swal__hero">
        <div class="mhsa-ai-swal__eyebrow">MHSA AI</div>
        <div class="mhsa-ai-swal__title">Building Context Pack</div>
        <div class="mhsa-ai-swal__sub">
          Assembling movement, part, production, and guidance signals
        </div>
      </div>

      <div class="mhsa-ai-swal__steps">
        ${stages
          .map((stage, index) => {
            const state =
              index < activeIndex
                ? "done"
                : index === activeIndex
                  ? "active"
                  : "pending";

            return `
              <div class="mhsa-ai-step mhsa-ai-step--${state}">
                <div class="mhsa-ai-step__icon">
                  ${
                    state === "done"
                      ? "✓"
                      : state === "active"
                        ? '<span class="mhsa-ai-step__spinner"></span>'
                        : "•"
                  }
                </div>
                <div class="mhsa-ai-step__body">
                  <div class="mhsa-ai-step__label">${escapeHtml(stage.label)}</div>
                  <div class="mhsa-ai-step__meta" data-stage-meta="${escapeHtml(stage.key)}"></div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function recommendationCardHtml(context, guidance, recommendation) {
  const nearbyBins = (recommendation.nearbyEmptyBins || [])
    .map((bin) => `<span class="mhsa-ai-chip">${escapeHtml(bin)}</span>`)
    .join("");

  const routeStops = (recommendation.routeStops || [])
    .map(
      (stop) => `
        <div class="mhsa-ai-stop">
          <div class="mhsa-ai-stop__station">${escapeHtml(stop.station)}</div>
          <div class="mhsa-ai-stop__detail">
            ${escapeHtml(stop.partNumber)}
            <span class="mhsa-ai-stop__desc">${escapeHtml(stop.description)}</span>
          </div>
        </div>
      `,
    )
    .join("");

  return `
    <div class="mhsa-ai-rec">
      <div class="mhsa-ai-rec__eyebrow">Recommendation</div>

      <div class="mhsa-ai-rec__headline">
        Part: <strong>${escapeHtml(context.partDescription)}</strong>
      </div>

      <div class="mhsa-ai-rec__hero">
        should be picked from location:
        <span class="mhsa-ai-rec__pill">${escapeHtml(recommendation.pickLocation)}</span>
        <span class="mhsa-ai-rec__timing">${escapeHtml(recommendation.timingPhrase)}</span>
      </div>

      <div class="mhsa-ai-rec__grid">
        <div class="mhsa-ai-rec__card"><div class="mhsa-ai-rec__label">Tugger Asset</div><div class="mhsa-ai-rec__value">${escapeHtml(recommendation.tuggerAsset)}</div></div>
        <div class="mhsa-ai-rec__card"><div class="mhsa-ai-rec__label">Loading Station</div><div class="mhsa-ai-rec__value">${escapeHtml(recommendation.loadStation)}</div></div>
        <div class="mhsa-ai-rec__card"><div class="mhsa-ai-rec__label">Load Time</div><div class="mhsa-ai-rec__value">${escapeHtml(recommendation.loadTime)}</div></div>
        <div class="mhsa-ai-rec__card"><div class="mhsa-ai-rec__label">Route ID</div><div class="mhsa-ai-rec__value">${escapeHtml(recommendation.routeId)}</div></div>
        <div class="mhsa-ai-rec__card"><div class="mhsa-ai-rec__label">POU Station</div><div class="mhsa-ai-rec__value">${escapeHtml(recommendation.pouStation)}</div></div>
        <div class="mhsa-ai-rec__card"><div class="mhsa-ai-rec__label">ETA at POU</div><div class="mhsa-ai-rec__value">${escapeHtml(recommendation.pouArrivalTime)}</div></div>
      </div>

      <div class="mhsa-ai-rec__section">
        <div class="mhsa-ai-rec__sectiontitle">Route stops</div>
        <div class="mhsa-ai-rec__stops">${routeStops}</div>
      </div>

      <div class="mhsa-ai-rec__section">
        <div class="mhsa-ai-rec__sectiontitle">Nearby empty bins</div>
        <div class="mhsa-ai-rec__chips">${nearbyBins || '<span class="mhsa-hud-muted">None noted</span>'}</div>
      </div>

      <div class="mhsa-ai-rec__section">
        <div class="mhsa-ai-rec__sectiontitle">Manager guidance used</div>
        <div class="mhsa-ai-rec__guidance">
          <span class="mhsa-ai-chip">Urgency ${escapeHtml(guidance.urgency)}</span>
          <span class="mhsa-ai-chip">Efficiency ${escapeHtml(guidance.efficiency)}</span>
          <span class="mhsa-ai-chip">Handling ${escapeHtml(guidance.handling)}</span>
          <span class="mhsa-ai-chip">Footprint ${escapeHtml(guidance.footprint)}</span>
        </div>
      </div>
    </div>
  `;
}

function ensureSwalStyles() {
  if (document.getElementById("mhsa-ai-swal-styles")) return;

  const style = document.createElement("style");
  style.id = "mhsa-ai-swal-styles";
  style.textContent = `
    .swal2-popup.mhsa-ai-modal {
      width: 760px !important;
      max-width: 92vw;
      border-radius: 18px;
      background: #1b2430;
      color: #e8edf2;
      box-shadow: 0 24px 70px rgba(0,0,0,0.42);
    }

    .swal2-title,
    .swal2-html-container {
      color: #e8edf2;
    }

    .mhsa-ai-swal,
    .mhsa-ai-rec {
      text-align: left;
      color: #e8edf2;
    }

    .mhsa-ai-swal__eyebrow,
    .mhsa-ai-rec__eyebrow {
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.78;
      margin-bottom: 6px;
      color: #8fd6dd;
    }

    .mhsa-ai-swal__title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #ffffff;
    }

    .mhsa-ai-swal__sub {
      font-size: 13px;
      opacity: 0.88;
      margin-bottom: 18px;
      color: #c6d2db;
    }

    .mhsa-ai-swal__steps {
      display: grid;
      gap: 10px;
    }

    .mhsa-ai-step {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 10px;
      align-items: start;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .mhsa-ai-step--done {
      opacity: 0.95;
      background: rgba(255,255,255,0.03);
    }

    .mhsa-ai-step--active {
      background: rgba(20,141,151,0.18);
      border: 1px solid rgba(93,201,165,0.42);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
    }

    .mhsa-ai-step--pending {
      opacity: 0.62;
    }

    .mhsa-ai-step__icon {
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      font-weight: 700;
      color: #dfe8ee;
    }

    .mhsa-ai-step__spinner {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.20);
      border-top-color: #ffffff;
      display: inline-block;
      animation: mhsaAiSpin 0.9s linear infinite;
    }

    .mhsa-ai-step__label {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #eef4f8;
    }

    .mhsa-ai-step__meta {
      font-size: 12px;
      opacity: 0.9;
      min-height: 16px;
      color: #c8d5dd;
    }

    .mhsa-ai-progress {
      height: 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      overflow: hidden;
      margin-top: 8px;
    }

    .mhsa-ai-progress__bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #148d97, #f2844e);
      transition: width 120ms linear;
    }

    .mhsa-ai-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.10);
      font-size: 12px;
      margin: 3px 6px 3px 0;
      color: #eef4f8;
    }

    .mhsa-ai-rec__headline {
      font-size: 18px;
      margin-bottom: 12px;
      color: #ffffff;
    }

    .mhsa-ai-rec__hero {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 16px;
      color: #dce7ee;
    }

    .mhsa-ai-rec__pill {
      display: inline-block;
      margin: 0 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(20,141,151,0.22);
      border: 1px solid rgba(93,201,165,0.42);
      font-weight: 700;
      color: #ffffff;
    }

    .mhsa-ai-rec__timing {
      display: inline-block;
      margin-left: 8px;
      font-style: italic;
      opacity: 0.95;
      color: #ffd9b8;
    }

    .mhsa-ai-rec__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .mhsa-ai-rec__card {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .mhsa-ai-rec__label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.72;
      margin-bottom: 5px;
      color: #9fb1be;
    }

    .mhsa-ai-rec__value {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
    }

    .mhsa-ai-rec__section {
      margin-top: 14px;
    }

    .mhsa-ai-rec__sectiontitle {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #ffffff;
    }

    .mhsa-ai-stop {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      margin-bottom: 6px;
    }

    .mhsa-ai-stop__station {
      font-weight: 700;
      color: #ffffff;
    }

    .mhsa-ai-stop__detail {
      color: #dce7ee;
    }

    .mhsa-ai-stop__desc {
      opacity: 0.84;
    }

    .swal2-confirm {
      border-radius: 10px !important;
      font-weight: 700 !important;
    }

    .swal2-cancel {
      border-radius: 10px !important;
    }

    @keyframes mhsaAiSpin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function updateStageMeta(stageKey, html) {
  const metaEl = document.querySelector(`[data-stage-meta="${stageKey}"]`);
  if (metaEl) metaEl.innerHTML = html;
}

async function runFlashListStage(stageKey, duration) {
  const perItem = Math.max(
    250,
    Math.floor(duration / PART_CONSTRAINT_FLASHES.length),
  );
  for (const item of PART_CONSTRAINT_FLASHES) {
    updateStageMeta(
      stageKey,
      `Checking <strong>${escapeHtml(item)}</strong> …`,
    );
    await sleep(perItem);
  }
  updateStageMeta(stageKey, `Constraint profile assembled`);
}

async function runGuidanceStage(stageKey, guidance, duration) {
  updateStageMeta(
    stageKey,
    `
    <span class="mhsa-ai-chip">Handling ${escapeHtml(guidance.handling)}</span>
    <span class="mhsa-ai-chip">Urgency ${escapeHtml(guidance.urgency)}</span>
    <span class="mhsa-ai-chip">Footprint ${escapeHtml(guidance.footprint)}</span>
    <span class="mhsa-ai-chip">Efficiency ${escapeHtml(guidance.efficiency)}</span>
    `,
  );
  await sleep(duration);
}

async function runProgressStage(stageKey, duration) {
  updateStageMeta(
    stageKey,
    `
    <div>Evaluating route fit, timing, and line-risk alignment</div>
    <div class="mhsa-ai-progress">
      <div class="mhsa-ai-progress__bar" data-ai-progress-bar="1"></div>
    </div>
    `,
  );

  const bar = document.querySelector("[data-ai-progress-bar='1']");
  if (!bar) {
    await sleep(duration);
    return;
  }

  const started = Date.now();

  await new Promise((resolve) => {
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      bar.style.width = `${pct}%`;

      if (elapsed >= duration) {
        window.clearInterval(timer);
        resolve();
      }
    }, 120);
  });

  updateStageMeta(stageKey, `Best option identified`);
}

async function launchAiFlow(root, guidance) {
  const context = readPanelContext(root);
  const recommendation = getRecommendationPayload(context, guidance);

  log("launchAiFlow", { context, guidance, recommendation });

  ensureSwalStyles();

  await Swal.fire({
    html: stageListHtml(AI_STAGES, 0),
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: true,
    customClass: {
      popup: "mhsa-ai-modal",
    },
    didOpen: async () => {
      for (let index = 0; index < AI_STAGES.length; index += 1) {
        const stage = AI_STAGES[index];
        Swal.update({
          html: stageListHtml(AI_STAGES, index),
        });

        if (stage.kind === "flash-list") {
          await runFlashListStage(stage.key, stage.duration);
        } else if (stage.kind === "guidance") {
          await runGuidanceStage(stage.key, guidance, stage.duration);
        } else if (stage.kind === "progress") {
          await runProgressStage(stage.key, stage.duration);
        } else {
          await sleep(stage.duration);
        }
      }

      await sleep(250);

      Swal.update({
        html: recommendationCardHtml(context, guidance, recommendation),
        showConfirmButton: true,
        confirmButtonText: "Accept Recommendation",
        showCancelButton: true,
        cancelButtonText: "Close",
      });
    },
  });
}

export function initAiAsidePanel(root) {
  if (!root) {
    log("init skipped: no root");
    return;
  }

  if (root.dataset.aiPanelBound === "1") {
    log("init skipped: already bound");
    return;
  }

  root.dataset.aiPanelBound = "1";
  log("binding panel", root);
  console.log(
    "help icons now in DOM =",
    document.querySelectorAll(".mhsa-help-trigger").length,
  );

  const keys = ["urgency", "efficiency", "handling", "footprint"];
  const total = clampInt(root.dataset.total || 10, 1, 100);

  const labels = readJsonScriptWithinMount(root, "ai-labels");
  const defaults = readJsonScriptWithinMount(root, "ai-default");

  let weights = rebalanceToTotal(
    {
      urgency: clampInt(defaults.urgency ?? 3, 0, total),
      efficiency: clampInt(defaults.efficiency ?? 3, 0, total),
      handling: clampInt(defaults.handling ?? 2, 0, total),
      footprint: clampInt(defaults.footprint ?? 2, 0, total),
    },
    "urgency",
    total,
    keys,
  );

  const rows = Array.from(root.querySelectorAll(".mhsa-ai-row"));
  const sumEl = root.querySelector(".mhsa-ai-sum");
  const canvas = root.querySelector(".mhsa-ai-radar");

  log(
    "rows found:",
    rows.length,
    rows.map((row) => row.dataset.key),
  );

  function syncRowVisual(row, key) {
    const slider = row.querySelector(".mhsa-ai-slider");
    const valueEl = row.querySelector(".mhsa-ai-val");
    if (!slider || !valueEl) return;

    const value = Number(weights[key] ?? 0);
    slider.max = String(total);
    slider.value = String(value);
    slider.style.setProperty("--pct", `${sliderPct(value, total)}%`);
    valueEl.textContent = String(value);
  }

  function render() {
    for (const row of rows) {
      const key = row.dataset.key;
      if (!key) continue;
      syncRowVisual(row, key);
    }

    if (sumEl) {
      sumEl.textContent = String(sumWeights(weights, keys));
    }

    drawRadar(canvas, weights, total, {
      urgency: labels.urgency || "Urgency",
      efficiency: labels.efficiency || "Efficiency",
      handling: labels.handling || "Handling",
      footprint: labels.footprint || "Footprint",
    });
  }

  function setWeight(targetKey, newValue) {
    const next = {
      ...weights,
      [targetKey]: clampInt(newValue, 0, total),
    };

    const before = { ...weights };
    weights = rebalanceToTotal(next, targetKey, total, keys);

    log("slider input", {
      targetKey,
      newValue,
      before,
      after: weights,
      sum: sumWeights(weights, keys),
    });

    render();
  }

  // Slider changes
  root.addEventListener("input", (e) => {
    const slider = e.target.closest(".mhsa-ai-slider");
    if (!slider) return;

    const row = slider.closest(".mhsa-ai-row");
    const key = row?.dataset?.key;
    if (!key) return;

    setWeight(key, slider.value);
  });

  root.addEventListener("change", (e) => {
    const slider = e.target.closest(".mhsa-ai-slider");
    if (!slider) return;

    const row = slider.closest(".mhsa-ai-row");
    log("slider change", {
      key: row?.dataset?.key || "",
      value: slider.value,
    });
  });

  // Presets
  const presetStorageKey = "mhsa_ai_presets_v1";
  const presetDefaults = [
    { urgency: 5, efficiency: 2, handling: 2, footprint: 1 },
    { urgency: 4, efficiency: 3, handling: 2, footprint: 1 },
    { urgency: 3, efficiency: 3, handling: 2, footprint: 2 },
    { urgency: 2, efficiency: 4, handling: 2, footprint: 2 },
    { urgency: 2, efficiency: 2, handling: 3, footprint: 3 },
  ];

  let presets = (() => {
    try {
      const raw = localStorage.getItem(presetStorageKey);
      if (!raw) return presetDefaults;

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length === 5
        ? parsed
        : presetDefaults;
    } catch {
      return presetDefaults;
    }
  })();

  function applyPreset(index) {
    const p = presets[index];
    if (!p) return;

    weights = rebalanceToTotal(
      {
        urgency: clampInt(p.urgency ?? 0, 0, total),
        efficiency: clampInt(p.efficiency ?? 0, 0, total),
        handling: clampInt(p.handling ?? 0, 0, total),
        footprint: clampInt(p.footprint ?? 0, 0, total),
      },
      "urgency",
      total,
      keys,
    );

    log("apply preset", index + 1, weights);
    render();
  }

  function savePreset(index) {
    presets[index] = { ...weights };
    try {
      localStorage.setItem(presetStorageKey, JSON.stringify(presets));
      log("preset saved", index + 1, presets[index]);
    } catch (err) {
      log("preset save failed", err);
    }
  }

  let holdTimer = null;
  const HOLD_MS = 650;

  root.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("button[data-preset]");
    if (!btn) return;

    const index = clampInt(btn.dataset.preset, 1, 5) - 1;

    holdTimer = window.setTimeout(() => {
      savePreset(index);
      holdTimer = null;
      btn.classList.add("mhsa-ai-saved");
      window.setTimeout(() => btn.classList.remove("mhsa-ai-saved"), 400);
    }, HOLD_MS);
  });

  root.addEventListener("pointerup", (e) => {
    const btn = e.target.closest("button[data-preset]");
    if (!btn) return;

    const index = clampInt(btn.dataset.preset, 1, 5) - 1;

    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
      applyPreset(index);
    }
  });

  root.addEventListener("pointerleave", () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
  });

  root.addEventListener("pointercancel", () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
  });

  // Run AI button
  root.addEventListener("click", async (e) => {
    const runBtn = e.target.closest("button[data-run-ai]");
    if (!runBtn) return;

    const guidance = {
      urgency: weights.urgency,
      efficiency: weights.efficiency,
      handling: weights.handling,
      footprint: weights.footprint,
    };

    log("run-ai clicked", {
      event_id: root.dataset.eventId || null,
      ...guidance,
      total: sumWeights(weights, keys),
    });

    runBtn.disabled = true;

    try {
      await launchAiFlow(root, guidance);
    } catch (err) {
      console.error("[MHSA AI PANEL] launchAiFlow failed", err);

      await Swal.fire({
        icon: "error",
        title: "AI flow failed",
        text: "The MHSA AI context-pack demo could not be launched.",
      });
    } finally {
      runBtn.disabled = false;
    }
  });

  // Initial paint
  render();

  // Canvas redraw
  if (canvas && "ResizeObserver" in window) {
    const ro = new ResizeObserver(() => render());
    ro.observe(canvas);
  }
}

// Optional debug convenience in DevTools
if (typeof window !== "undefined") {
  window.MHSAHudAiPanel = {
    init: initAiAsidePanel,
  };
}

// mhsa_hud_ai_panel.js
// React-imported enhancer for Django-rendered AI aside fragment

const DEBUG = true;

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
  root.addEventListener("click", (e) => {
    const runBtn = e.target.closest("button[data-run-ai]");
    if (!runBtn) return;

    log("run-ai clicked", {
      event_id: root.dataset.eventId || null,
      urgency: weights.urgency,
      efficiency: weights.efficiency,
      handling: weights.handling,
      footprint: weights.footprint,
      total: sumWeights(weights, keys),
    });
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

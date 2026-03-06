import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * AIWeightsPanel
 * - 4 sliders that always sum to TOTAL (default 10)
 * - preset buttons 1..5 (click apply, long-press save)
 * - live radar chart
 *
 * Props:
 * - total (number) default 10
 * - labels (object) optional
 * - onRun (fn) called with { urgency, efficiency, handling, footprint } (ints summing to total)
 */
export default function AIWeightsPanel({
  total = 10,
  labels = {
    urgency: "Urgency",
    efficiency: "Trip Efficiency",
    handling: "Handling",
    footprint: "Line Footprint",
  },
  onRun,
}) {
  const keys = useMemo(
    () => ["urgency", "efficiency", "handling", "footprint"],
    [],
  );

  // Default "Balanced" weights
  const [w, setW] = useState({
    urgency: 3,
    efficiency: 3,
    handling: 2,
    footprint: 2,
  });

  // Presets (editable via long press)
  const [presets, setPresets] = useState(() => [
    { urgency: 5, efficiency: 2, handling: 2, footprint: 1 }, // 1 Emergency
    { urgency: 4, efficiency: 3, handling: 2, footprint: 1 }, // 2 Fast
    { urgency: 3, efficiency: 3, handling: 2, footprint: 2 }, // 3 Balanced
    { urgency: 2, efficiency: 5, handling: 2, footprint: 1 }, // 4 Efficiency
    { urgency: 2, efficiency: 3, handling: 1, footprint: 4 }, // 5 Lean/Footprint
  ]);

  // --- Helpers --------------------------------------------------------------

  const clampInt = (n, min, max) => Math.max(min, Math.min(max, Math.round(n)));

  const sumWeights = (obj) => keys.reduce((acc, k) => acc + (obj[k] || 0), 0);

  /**
   * Rebalance algorithm:
   * - We set targetKey to newValue (clamped)
   * - Then adjust other keys to keep sum == total
   * - Prefer reducing/increasing "largest" others first (feels natural)
   */
  function rebalance(next, targetKey) {
    // Enforce integer weights, non-negative
    const base = { ...next };
    for (const k of keys) base[k] = clampInt(base[k] ?? 0, 0, total);

    let s = sumWeights(base);
    let delta = total - s; // + means we need to add to others; - means we need to subtract from others

    const others = keys.filter((k) => k !== targetKey);

    // Sort candidates for adjustment:
    // - If we need to subtract (delta < 0), subtract from the largest first
    // - If we need to add (delta > 0), add to the smallest first
    const order =
      delta < 0
        ? [...others].sort((a, b) => base[b] - base[a])
        : [...others].sort((a, b) => base[a] - base[b]);

    // Apply adjustments one unit at a time so it stays stable and intuitive
    while (delta !== 0) {
      let moved = false;

      for (const k of order) {
        if (delta < 0) {
          // subtract 1 if possible
          if (base[k] > 0) {
            base[k] -= 1;
            delta += 1;
            moved = true;
            if (delta === 0) break;
          }
        } else {
          // add 1 if possible (cap to total to avoid runaway)
          if (base[k] < total) {
            base[k] += 1;
            delta -= 1;
            moved = true;
            if (delta === 0) break;
          }
        }
      }

      // If we couldn't move anything (all zeros when subtracting, or all capped when adding),
      // then we must adjust the targetKey itself.
      if (!moved) {
        if (delta < 0 && base[targetKey] > 0) {
          base[targetKey] -= 1;
          delta += 1;
        } else if (delta > 0 && base[targetKey] < total) {
          base[targetKey] += 1;
          delta -= 1;
        } else {
          break;
        }
      }
    }

    // Final normalization (just in case)
    // If sum is off due to caps, fix by adjusting targetKey.
    const finalSum = sumWeights(base);
    if (finalSum !== total) {
      base[targetKey] = clampInt(
        base[targetKey] + (total - finalSum),
        0,
        total,
      );
    }

    return base;
  }

  function setSlider(key, value) {
    const v = clampInt(value, 0, total);
    const next = rebalance({ ...w, [key]: v }, key);
    setW(next);
  }

  function applyPreset(idx) {
    const p = presets[idx];
    // Ensure sums to total (rebalance based on urgency)
    const normalized = rebalance(
      {
        urgency: p.urgency,
        efficiency: p.efficiency,
        handling: p.handling,
        footprint: p.footprint,
      },
      "urgency",
    );
    setW(normalized);
  }

  function savePreset(idx) {
    setPresets((prev) => {
      const next = [...prev];
      next[idx] = { ...w };
      return next;
    });
  }

  // --- Long-press handling for preset buttons -------------------------------

  function useLongPress(onClick, onLongPress, ms = 550) {
    const timerRef = useRef(null);
    const firedRef = useRef(false);

    const start = () => {
      firedRef.current = false;
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress?.();
      }, ms);
    };

    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const end = () => {
      clear();
      if (!firedRef.current) onClick?.();
    };

    return {
      onMouseDown: start,
      onTouchStart: start,
      onMouseUp: end,
      onMouseLeave: clear,
      onTouchEnd: end,
      onTouchCancel: clear,
      onContextMenu: (e) => e.preventDefault(),
    };
  }

  // --- Radar chart -----------------------------------------------------------

  const radarRef = useRef(null);

  useEffect(() => {
    const canvas = radarRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = cssW / 2;
    const cy = cssH / 2;
    const R = Math.min(cssW, cssH) * 0.36;

    ctx.clearRect(0, 0, cssW, cssH);

    // HUD-ish styling (no external CSS required)
    const strokeGrid = "rgba(140, 170, 190, 0.35)";
    const strokeAxis = "rgba(140, 170, 190, 0.55)";
    const fillPoly = "rgba(20, 141, 151, 0.22)"; // your teal-ish brand
    const strokePoly = "rgba(20, 141, 151, 0.9)";
    const txt = "rgba(220, 235, 245, 0.85)";

    // Rings
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring++) {
      const rr = (R * ring) / 4;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = strokeGrid;
      ctx.stroke();
    }

    // Axes (4 axes)
    const axisAngles = [
      -Math.PI / 2, // up (urgency)
      0, // right (efficiency)
      Math.PI / 2, // down (handling)
      Math.PI, // left (footprint)
    ];

    ctx.strokeStyle = strokeAxis;
    for (const a of axisAngles) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      ctx.stroke();
    }

    // Labels
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillStyle = txt;

    const labelList = [
      labels.urgency,
      labels.efficiency,
      labels.handling,
      labels.footprint,
    ];

    for (let i = 0; i < 4; i++) {
      const a = axisAngles[i];
      const lx = cx + (R + 16) * Math.cos(a);
      const ly = cy + (R + 16) * Math.sin(a);

      ctx.textAlign = i === 1 ? "left" : i === 3 ? "right" : "center";
      ctx.textBaseline = i === 0 ? "bottom" : i === 2 ? "top" : "middle";

      ctx.fillText(labelList[i], lx, ly);
    }

    // Polygon points (normalized 0..1 based on total)
    const vals = [
      w.urgency / total,
      w.efficiency / total,
      w.handling / total,
      w.footprint / total,
    ];

    const pts = vals.map((v, i) => {
      const a = axisAngles[i];
      return {
        x: cx + R * v * Math.cos(a),
        y: cy + R * v * Math.sin(a),
      };
    });

    // Fill polygon
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = fillPoly;
    ctx.fill();

    // Stroke polygon
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokePoly;
    ctx.stroke();

    // Corner dots
    ctx.fillStyle = strokePoly;
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [w, total, labels]);

  // --- UI -------------------------------------------------------------------

  const totalNow = sumWeights(w);
  const canRun = totalNow === total;

  const helpText = `
AI Optimization Weights

These sliders express your intent before running an AI workflow.
They always sum to ${total}, forcing real operational trade-offs.

Tip: Hold a preset button to overwrite/save it.
`.trim();

  return (
    <div style={styles.panel}>
      <div style={styles.headerRow}>
        <div style={styles.title}>AI Optimization</div>

        <div style={styles.helpWrap} title={helpText}>
          <span style={styles.helpIcon}>?</span>
        </div>
      </div>

      <div style={styles.bodyGrid}>
        <div style={styles.slidersCol}>
          <SliderRow
            label={labels.urgency}
            value={w.urgency}
            total={total}
            onChange={(v) => setSlider("urgency", v)}
          />
          <SliderRow
            label={labels.efficiency}
            value={w.efficiency}
            total={total}
            onChange={(v) => setSlider("efficiency", v)}
          />
          <SliderRow
            label={labels.handling}
            value={w.handling}
            total={total}
            onChange={(v) => setSlider("handling", v)}
          />
          <SliderRow
            label={labels.footprint}
            value={w.footprint}
            total={total}
            onChange={(v) => setSlider("footprint", v)}
          />

          <div style={styles.totalRow}>
            <div style={styles.totalLabel}>TOTAL</div>
            <div style={styles.totalValue}>
              {totalNow} / {total}
            </div>
          </div>

          <div style={styles.presetsRow}>
            {presets.map((p, i) => {
              const lp = useLongPress(
                () => applyPreset(i),
                () => savePreset(i),
                550,
              );
              return (
                <button key={i} style={styles.presetBtn} {...lp}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div style={styles.actionRow}>
            <button
              style={{
                ...styles.runBtn,
                ...(canRun ? null : styles.runBtnDisabled),
              }}
              disabled={!canRun}
              onClick={() => onRun?.({ ...w })}
            >
              RUN AI
            </button>

            <button style={styles.secondaryBtn} onClick={() => applyPreset(2)}>
              Reset (3)
            </button>
          </div>
        </div>

        <div style={styles.radarCol}>
          <div style={styles.radarFrame}>
            <canvas ref={radarRef} style={styles.radarCanvas} />
          </div>

          <div style={styles.radarHint}>
            Live intent vector (updates in real-time)
          </div>
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, value, total, onChange }) {
  return (
    <div style={styles.sliderRow}>
      <div style={styles.sliderLabel}>{label}</div>

      <div style={styles.sliderTrackRow}>
        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={styles.range}
        />
        <div style={styles.sliderValue}>{value}</div>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    borderRadius: 14,
    padding: 14,
    background: "rgba(18, 24, 30, 0.72)",
    border: "1px solid rgba(120, 150, 170, 0.22)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
    color: "rgba(235, 245, 255, 0.92)",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },

  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    opacity: 0.95,
  },
  helpWrap: {
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "1px solid rgba(140,170,190,0.35)",
    display: "grid",
    placeItems: "center",
    cursor: "help",
    background: "rgba(0,0,0,0.18)",
  },
  helpIcon: {
    fontWeight: 800,
    fontSize: 14,
    opacity: 0.9,
  },

  bodyGrid: {
    display: "grid",
    gridTemplateColumns: "1.15fr 0.85fr",
    gap: 14,
    alignItems: "start",
  },

  slidersCol: {},
  radarCol: {},

  sliderRow: {
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 6,
  },
  sliderTrackRow: {
    display: "grid",
    gridTemplateColumns: "1fr 34px",
    gap: 10,
    alignItems: "center",
  },

  // Range slider look: we keep it simple here (browser default track)
  range: {
    width: "100%",
    accentColor: "#148d97", // fits your brand palette and the screenshot vibe
  },

  sliderValue: {
    textAlign: "right",
    fontSize: 12,
    padding: "4px 6px",
    borderRadius: 8,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(140,170,190,0.18)",
  },

  totalRow: {
    marginTop: 6,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTop: "1px solid rgba(140,170,190,0.18)",
  },
  totalLabel: {
    fontSize: 12,
    letterSpacing: "0.12em",
    opacity: 0.8,
  },
  totalValue: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.95,
  },

  presetsRow: {
    display: "flex",
    gap: 8,
    marginTop: 10,
  },
  presetBtn: {
    width: 34,
    height: 30,
    borderRadius: 10,
    border: "1px solid rgba(140,170,190,0.28)",
    background: "rgba(0,0,0,0.24)",
    color: "rgba(235,245,255,0.92)",
    cursor: "pointer",
    fontWeight: 700,
  },

  actionRow: {
    display: "flex",
    gap: 10,
    marginTop: 12,
  },
  runBtn: {
    flex: 1,
    height: 34,
    borderRadius: 12,
    border: "1px solid rgba(20,141,151,0.75)",
    background: "rgba(20,141,151,0.22)",
    color: "rgba(235,245,255,0.95)",
    fontWeight: 800,
    letterSpacing: "0.08em",
    cursor: "pointer",
  },
  runBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  secondaryBtn: {
    height: 34,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(140,170,190,0.25)",
    background: "rgba(0,0,0,0.22)",
    color: "rgba(235,245,255,0.85)",
    cursor: "pointer",
    fontWeight: 700,
  },

  radarFrame: {
    borderRadius: 14,
    border: "1px solid rgba(140,170,190,0.20)",
    background: "rgba(0,0,0,0.18)",
    padding: 10,
  },
  radarCanvas: {
    width: "100%",
    height: 210,
    display: "block",
  },
  radarHint: {
    marginTop: 8,
    fontSize: 11,
    opacity: 0.75,
    textAlign: "center",
  },
};

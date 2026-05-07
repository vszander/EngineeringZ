import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

const EPAPER_WIDTH = 480;
const EPAPER_HEIGHT = 800;

const COLORS = {
  black: "#111111",
  white: "#ffffff",
  red: "#b00020",
  light: "#ededed",
  mid: "#f4f4f4",
};

function formatTimeOnly(isoValue) {
  if (!isoValue) return "--:--";
  const dt = new Date(isoValue);
  if (Number.isNaN(dt.getTime())) return "--:--";
  return dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatGeneratedAt() {
  return new Date().toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatQty(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeGroups(manifest) {
  const rows = Array.isArray(manifest?.rows) ? manifest.rows : [];
  const pouGroups = Array.isArray(manifest?.pou_groups)
    ? manifest.pou_groups
    : [];
  if (pouGroups.length) return pouGroups;
  return [{ pou: "ALL", rows }];
}

function wrapText(ctx, text, maxWidth) {
  const value = String(text || "");
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const test = `${current} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = words[i];
    }
  }

  lines.push(current);
  return lines;
}

function drawText(ctx, text, x, y, opts = {}) {
  const {
    font = "14px Arial",
    color = COLORS.black,
    align = "left",
    baseline = "top",
  } = opts;

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(String(text ?? ""), x, y);
}

function buildFlightBarcodeValue(flightName) {
  return String(flightName || "").replace(/\s+/g, "");
}

function drawFlightBarcode(ctx, value, x, y, maxWidth = 340, height = 42) {
  if (!value) return;

  const barcodeCanvas = document.createElement("canvas");

  JsBarcode(barcodeCanvas, value, {
    format: "CODE128",
    displayValue: false,
    margin: 0,
    background: "#ffffff",
    lineColor: "#111111",

    // Wider source bars. Whole-ish values are better for ePaper.
    width: 2,
    height,
  });

  const sourceWidth = barcodeCanvas.width;
  const sourceHeight = barcodeCanvas.height;

  if (!sourceWidth || !sourceHeight) return;

  // Target about 40% wider, but do not exceed maxWidth.
  const desiredWidth = sourceWidth * 1.4;
  const drawWidth = Math.min(desiredWidth, maxWidth);
  const scale = drawWidth / sourceWidth;
  const drawHeight = sourceHeight * scale;

  // white backing so it stays crisp on the e-paper preview
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(x - 6, y - 4, drawWidth + 12, drawHeight + 22);

  ctx.drawImage(barcodeCanvas, x, y, drawWidth, drawHeight);

  drawText(ctx, value, x + drawWidth / 2, y + drawHeight + 4, {
    font: "bold 10px Arial",
    color: COLORS.black,
    align: "center",
  });
}

function drawManifestToCanvas(canvas, manifest, options = {}) {
  console.log("[drawManifestToCanvas] start", {
    hasCanvas: !!canvas,
    hasManifest: !!manifest,
    routeLabel: options?.routeLabel,
  });

  if (!canvas || !manifest) return "";

  const routeLabel = options.routeLabel || "Purple";
  const ctx = canvas.getContext("2d");
  console.log("[drawManifestToCanvas] context", {
    hasContext: !!ctx,
  });
  if (!ctx) return "";

  canvas.width = EPAPER_WIDTH;
  canvas.height = EPAPER_HEIGHT;

  ctx.clearRect(0, 0, EPAPER_WIDTH, EPAPER_HEIGHT);

  const flight = manifest?.flight || {};
  const queue = manifest?.queue || {};
  const summary = manifest?.summary || {};
  const groups = normalizeGroups(manifest);

  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, EPAPER_WIDTH, EPAPER_HEIGHT);

  ctx.strokeStyle = COLORS.black;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, EPAPER_WIDTH - 2, EPAPER_HEIGHT - 2);

  const flightName = flight.name || "Flight";
  const barcodeValue = buildFlightBarcodeValue(flightName);

  drawText(ctx, "MHSA FLIGHT MANIFEST", 18, 16, {
    font: "bold 12px Arial",
    color: COLORS.red,
  });

  drawText(ctx, `Route: ${routeLabel}`, 18, 32, {
    font: "bold 14px Arial",
    color: COLORS.red,
  });

  // top-right barcode for tugger driver scan
  // Keep this in the upper-right where it has clean white space.
  drawFlightBarcode(ctx, barcodeValue, 190, 14, 270, 58);

  // Large flight name moves below the barcode/header band.
  drawText(ctx, flightName, 18, 72, {
    font: "bold 28px Arial",
    color: COLORS.black,
  });

  drawText(ctx, `Queue: ${queue.name || ""}`, 18, 50, {
    font: "14px Arial",
    color: COLORS.black,
  });

  drawText(
    ctx,
    `Departure: ${formatTimeOnly(flight.planned_departure_time)} • Status: ${flight.status_label || ""}`,
    18,
    99,
    { font: "14px Arial", color: COLORS.black },
  );

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 132);
  ctx.lineTo(EPAPER_WIDTH, 132);
  ctx.stroke();

  ctx.fillStyle = COLORS.mid;
  ctx.fillRect(0, 116, EPAPER_WIDTH, 54);

  const cards = [
    {
      label: "Assignments",
      value: summary.staged_assignment_count ?? 0,
      x: 18,
    },
    { label: "Carts", value: summary.cart_count ?? 0, x: 164 },
    { label: "Rows", value: summary.row_count ?? 0, x: 310 },
  ];

  cards.forEach((card) => {
    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 1;
    ctx.strokeRect(card.x, 124, 128, 36);

    drawText(ctx, card.label.toUpperCase(), card.x + 8, 129, {
      font: "bold 10px Arial",
      color: COLORS.red,
    });

    drawText(ctx, String(card.value), card.x + 8, 143, {
      font: "bold 18px Arial",
      color: COLORS.black,
    });
  });

  let y = 182;

  const xPOU = 22;
  const xDesc = 102;
  const xPart = 322;
  const xQty = 450;
  const descWidth = 205;

  for (const group of groups) {
    const groupRows = Array.isArray(group?.rows) ? group.rows : [];

    const preparedRows = groupRows.map((row) => {
      ctx.font = "13px Arial";
      const descLines = wrapText(ctx, row.description || "", descWidth);
      const rowHeight = Math.max(28, 10 + descLines.length * 14);
      return { row, descLines, rowHeight };
    });

    const totalRowsHeight = preparedRows.reduce(
      (sum, r) => sum + r.rowHeight,
      0,
    );
    const groupHeight = 28 + 22 + totalRowsHeight;

    if (y + groupHeight + 28 > EPAPER_HEIGHT) break;

    ctx.strokeStyle = COLORS.black;
    ctx.lineWidth = 1;
    ctx.strokeRect(14, y, EPAPER_WIDTH - 28, groupHeight);

    ctx.fillStyle = COLORS.red;
    ctx.fillRect(14, y, EPAPER_WIDTH - 28, 28);

    drawText(ctx, group.pou || "UNASSIGNED", 24, y + 6, {
      font: "bold 16px Arial",
      color: COLORS.white,
    });

    const headerY = y + 28;
    ctx.fillStyle = COLORS.light;
    ctx.fillRect(15, headerY, EPAPER_WIDTH - 30, 22);

    drawText(ctx, "POU", xPOU, headerY + 5, { font: "bold 11px Arial" });
    drawText(ctx, "DESCRIPTION", xDesc, headerY + 5, {
      font: "bold 11px Arial",
    });
    drawText(ctx, "PART NUMBER", xPart, headerY + 5, {
      font: "bold 11px Arial",
    });
    drawText(ctx, "QTY", xQty, headerY + 5, {
      font: "bold 11px Arial",
      align: "right",
    });

    let rowY = headerY + 22;

    preparedRows.forEach(({ row, descLines, rowHeight }) => {
      ctx.beginPath();
      ctx.moveTo(15, rowY);
      ctx.lineTo(EPAPER_WIDTH - 15, rowY);
      ctx.stroke();

      drawText(ctx, row.pou || "", xPOU, rowY + 7, {
        font: "bold 14px Arial",
      });

      descLines.forEach((line, idx) => {
        drawText(ctx, line, xDesc, rowY + 5 + idx * 14, {
          font: "13px Arial",
        });
      });

      drawText(ctx, row.part_number || "", xPart, rowY + 8, {
        font: "11px Arial",
      });

      drawText(ctx, formatQty(row.qty), xQty, rowY + 7, {
        font: "bold 14px Arial",
        align: "right",
      });

      rowY += rowHeight;
    });

    y += groupHeight + 12;
  }

  console.log("[drawManifestToCanvas] manifest payload", {
    flight: manifest?.flight || null,
    queue: manifest?.queue || null,
    summary: manifest?.summary || null,
    groupCount: groups.length,
    rowCount: manifest?.rows?.length || 0,
  });

  ctx.strokeStyle = COLORS.black;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, EPAPER_HEIGHT - 28);
  ctx.lineTo(EPAPER_WIDTH, EPAPER_HEIGHT - 28);
  ctx.stroke();

  drawText(ctx, `Generated ${formatGeneratedAt()}`, 18, EPAPER_HEIGHT - 20, {
    font: "11px Arial",
    color: "#555555",
  });
  const dataUrl = canvas.toDataURL("image/png");

  console.log("[drawManifestToCanvas] end", {
    dataUrlPrefix: dataUrl.slice(0, 32),
    dataUrlLength: dataUrl.length,
  });

  //return dataUrl;

  return canvas.toDataURL("image/png");
}

export default function EpaperManifestRenderer({
  manifest,
  routeLabel = "Purple",
  visible = false,
}) {
  const canvasRef = useRef(null);
  const [pngUrl, setPngUrl] = useState("");
  const [debugMsg, setDebugMsg] = useState("");

  console.log("[EpaperManifestRenderer] render", {
    visible,
    hasManifest: !!manifest,
    routeLabel,
    flightName: manifest?.flight?.name || null,
    rowCount: manifest?.rows?.length || 0,
    groupCount: manifest?.pou_groups?.length || 0,
  });

  useEffect(() => {
    if (!visible) return;
    if (!manifest) {
      setDebugMsg("No manifest provided.");
      setPngUrl("");
      return;
    }
    if (!canvasRef.current) {
      setDebugMsg("Canvas ref not ready.");
      setPngUrl("");
      return;
    }

    try {
      const url = drawManifestToCanvas(canvasRef.current, manifest, {
        routeLabel,
      });
      setPngUrl(url || "");
      setDebugMsg(
        url
          ? `PNG generated (${url.length} chars)`
          : "Canvas rendered, but no data URL returned.",
      );
    } catch (err) {
      console.error("[EpaperManifestRenderer] render failed", err);
      setPngUrl("");
      setDebugMsg(`Render failed: ${err.message || err}`);
    }
  }, [manifest, routeLabel, visible]);

  if (!visible) return null;

  return (
    <div className="ep-printed-wrap">
      <div className="ep-printed-toolbar">
        {pngUrl ? (
          <a
            href={pngUrl}
            download={`${buildFlightBarcodeValue(manifest?.flight?.name || "flight-manifest")}.png`}
            className="ep-toolbar-btn"
          >
            Download PNG
          </a>
        ) : null}
      </div>

      <div className="ep-debug-line">{debugMsg}</div>

      <div className="ep-paper-preview-frame">
        <canvas
          ref={canvasRef}
          width={EPAPER_WIDTH}
          height={EPAPER_HEIGHT}
          style={{ display: "none" }}
        />

        {pngUrl ? (
          <img
            src={pngUrl}
            alt="E-paper manifest preview"
            className="ep-paper-preview-img"
          />
        ) : (
          <div className="ep-loading">Preparing e-paper preview…</div>
        )}
      </div>
    </div>
  );
}

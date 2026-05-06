/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";

function normalizeClassTokens(iconClass) {
  const raw = String(iconClass || "").trim();
  if (!raw) return "";

  // If backend accidentally sent "mi-mi-container-mi-container-custom"
  const spaced = raw.includes(" ") ? raw : raw.replaceAll("-", " ");

  // Tokenize, drop empties, de-dupe
  const toks = spaced
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean);

  const seen = new Set();
  const out = [];
  for (const t of toks) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.join(" ");
}

export default function MapOverlay({
  mapImageSrc,
  icons,
  onIconClick,
  fitMode = "width", // "width" | "native"

  // Coordinate system used by icon x/y values.
  // If omitted, fallback to image natural dimensions.
  coordinateWidth,
  coordinateHeight,
}) {
  mapImageSrc =
    mapImageSrc || "/images/clubcar/TuggerRoutes_ForkZones_low_res.png";

  const imgRef = useRef(null);
  const wrapRef = useRef(null);

  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [rendered, setRendered] = useState({ w: 1, h: 1 });

  const measure = () => {
    const img = imgRef.current;
    if (!img) return;
    const r = img.getBoundingClientRect();
    setRendered({ w: r.width || 1, h: r.height || 1 });
  };

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    setNatural({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    measure();
  };

  useEffect(() => {
    requestAnimationFrame(() => measure());
  }, [mapImageSrc, fitMode]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (imgRef.current) ro.observe(imgRef.current);

    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const toRenderedXY = (xNat, yNat) => {
    const coordW = Number(coordinateWidth) || natural.w || 1;
    const coordH = Number(coordinateHeight) || natural.h || 1;

    return {
      x: (xNat / coordW) * rendered.w,
      y: (yNat / coordH) * rendered.h,
    };
  };

  const normalizedIcons = useMemo(() => {
    const toNum = (v) => {
      if (v == null) return null;
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : null;
    };

    return (icons || [])
      .map((i) => {
        const xNat = toNum(i?.x ?? i?.x_px);
        const yNat = toNum(i?.y ?? i?.y_px);
        if (xNat == null || yNat == null) return null;
        return { ...i, _xNat: xNat, _yNat: yNat };
      })
      .filter(Boolean);
  }, [icons]);

  return (
    <div ref={wrapRef} className="mi-wrap">
      <img
        ref={imgRef}
        className={fitMode === "native" ? "mi-img mi-img--native" : "mi-img"}
        src={mapImageSrc}
        alt="Map"
        draggable={false}
        onLoad={onImgLoad}
      />

      {normalizedIcons.map((i, idx) => {
        const p = toRenderedXY(i._xNat, i._yNat);

        const clickProps =
          typeof onIconClick === "function"
            ? {
                role: "button",
                tabIndex: 0,
                onClick: () => onIconClick(i),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") onIconClick(i);
                },
              }
            : {};

        const cls = normalizeClassTokens(i.iconClass || i.className);
        // Always include base .mi once
        const className = cls.includes("mi") ? cls : `mi ${cls}`.trim();

        return (
          <div
            key={i.key || idx}
            className={`mi ${className}`.trim()}
            title={i.title || ""}
            style={{ left: `${p.x}px`, top: `${p.y}px` }}
            {...clickProps}
          >
            <span className="mi__txt">{i.qtyText}</span>
          </div>
        );
      })}
    </div>
  );
}

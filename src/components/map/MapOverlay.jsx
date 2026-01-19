/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import "./mapicons.css";

export default function MapOverlay({ mapImageSrc, icons }) {
  // If you truly want this hard-coded, keep the next line.
  // But for reusability, I recommend deleting it.
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
    // When src changes, re-measure soon after the browser applies it
    requestAnimationFrame(() => measure());
  }, [mapImageSrc]);

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

  // Convert natural image pixels -> rendered pixels (relative to the displayed image box)
  const toRenderedXY = (xNat, yNat) => {
    return {
      x: (xNat / natural.w) * rendered.w,
      y: (yNat / natural.h) * rendered.h,
    };
  };

  const normalizedIcons = useMemo(() => {
    // Accept x/y or x_px/y_px, as numbers OR numeric strings
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
        className="mi-img"
        src={mapImageSrc}
        alt="Map"
        draggable={false}
        onLoad={onImgLoad}
      />

      {(normalizedIcons || []).map((i, idx) => {
        const p = toRenderedXY(i._xNat, i._yNat);

        return (
          <div
            key={idx}
            className={i.iconClass}
            title={i.title || ""}
            style={{ left: `${p.x}px`, top: `${p.y}px` }}
          >
            <span className="mi__txt">{i.qtyText}</span>
          </div>
        );
      })}
    </div>
  );
}

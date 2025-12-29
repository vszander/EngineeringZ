/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import "./mapicons.css";

export default function MapOverlay({ mapImageSrc, icons }) {
  // If you truly want this hard-coded, keep the next line.
  // But for reusability, I recommend deleting it.
  mapImageSrc = "/images/clubcar/TuggerRoutes_ForkZones_low_res.png";

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
    // Accept either x/y or x_px/y_px from caller
    return (icons || [])
      .map((i) => {
        const xNat = Number.isFinite(i?.x)
          ? i.x
          : Number.isFinite(i?.x_px)
          ? i.x_px
          : null;
        const yNat = Number.isFinite(i?.y)
          ? i.y
          : Number.isFinite(i?.y_px)
          ? i.y_px
          : null;
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

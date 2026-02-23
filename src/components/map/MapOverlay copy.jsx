/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import "./mapicons.css?v=20260120";

export default function MapOverlay({
  mapImageSrc,
  icons,
  onIconClick,
  fitMode = "width",
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

  const toRenderedXY = (xNat, yNat) => {
    return {
      x: (xNat / natural.w) * rendered.w,
      y: (yNat / natural.h) * rendered.h,
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
        className={
          fitMode === "native" ? "mi-img mi-img--native" : "mi-img mi-img--fit"
        }
        src={mapImageSrc}
        alt="Map"
        draggable={false}
        onLoad={onImgLoad}
      />

      {(normalizedIcons || []).map((i, idx) => {
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

        return (
          <div
            key={i.key || idx}
            className={`mi ${String(i.iconClass || "").replaceAll("-", " ")}`}
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

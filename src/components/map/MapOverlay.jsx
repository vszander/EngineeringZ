/* eslint-disable react/prop-types */
import "./mapicons.css";

export default function MapOverlay({ mapImageSrc, icons }) {
  mapImageSrc = "/images/clubcar/TuggerRoutes_ForkZones_low_res.png";
  return (
    <div className="mi-wrap">
      <img className="mi-img" src={mapImageSrc} alt="Map" draggable={false} />
      {(icons || []).map((i, idx) => (
        <div
          key={idx}
          className={i.iconClass}
          title={i.title || ""}
          //style={{ left: `200px`, top: `${40 + idx * 30}px` }}
          style={{ left: `${i.x}px`, top: `${i.y}px` }}
        >
          <span className="mi__txt">{i.qtyText}</span>
        </div>
      ))}
    </div>
  );
}

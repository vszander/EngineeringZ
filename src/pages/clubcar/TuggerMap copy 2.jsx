import { useEffect, useState } from "react";
// TODO: add Navbar and router links once layout is finalized

//import Navbar from "../../components/Navbar";
//import { Link } from "react-router-dom";

import "./TuggerMap.css";

export default function TuggerMap() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/mhsa/asset/T12/position")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <div>Loading map…</div>;

  const { map_x, map_y, heading_deg } = data.location;

  return (
    <div className="map-container">
      <img
        src="/images/clubcar/TuggerRoutes_ForkZones_low_res.png"
        alt="Evans-Consumer Map"
        className="map-image"
      />

      <div
        className="tugger"
        style={{
          left: map_x,
          top: map_y,
          transform: `translate(-50%, -50%) rotate(${heading_deg}deg)`,
        }}
        title={data.asset.asset_id}
      />
    </div>
  );
}

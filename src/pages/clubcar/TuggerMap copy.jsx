import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { Link } from "react-router-dom";

const backendURL = import.meta.env.VITE_BACKEND_URL;

export default function TuggerMap() {
  // Static for now — later updated via websocket / SSE / polling
  const [tugger, setTugger] = useState({
    x: 449,
    y: 200,
    label: "T12",
    mapLayer: "Evans-Consumer",
  });

  // Example: future listener hook (no-op for now)
  useEffect(() => {
    // Later: connect to websocket/SSE and call setTugger({x,y,...})
    // console.log("Backend URL:", backendURL);
  }, []);

  return (
    <>
      <Navbar />

      <div style={{ padding: "16px" }}>
        <div
          style={{
            marginBottom: "12px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0 }}>MHSA Tugger Map</h2>
          <span style={{ opacity: 0.7 }}>|</span>
          <span style={{ opacity: 0.8 }}>MapLayer: {tugger.mapLayer}</span>

          <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              ← Home
            </Link>
            <a
              href={backendURL || "#"}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }}
            >
              Backend
            </a>
          </div>
        </div>

        {/* Layout: Map (left) + Info Panel (right) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: "14px",
            alignItems: "start",
          }}
        >
          {/* MAP AREA */}
          <div
            style={{
              position: "relative",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: "12px",
              overflow: "hidden",
              background: "rgba(0,0,0,0.02)",
            }}
          >
            {/* Map image */}
            <img
              src="/images/clubcar/TuggerRoutes_ForkZones_low_res.png"
              alt="Facility Map"
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                userSelect: "none",
              }}
              draggable={false}
            />

            {/* Tugger icon overlay */}
            <div
              title={`${tugger.label} @ (${tugger.x}, ${tugger.y})`}
              style={{
                position: "absolute",
                left: tugger.x,
                top: tugger.y,
                transform: "translate(-50%, -50%)", // center on coordinate
                width: "34px",
                height: "34px",
                cursor: "pointer",
              }}
              onClick={() => {
                // Later: open details panel / fetch info
                alert(`${tugger.label} clicked\nx=${tugger.x}, y=${tugger.y}`);
              }}
            >
              <img
                src="/images/clubcar/Tugger.png"
                alt="Tugger"
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  pointerEvents: "none",
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* INFO PANEL */}
          <aside
            style={{
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: "12px",
              padding: "14px",
              background: "white",
              minHeight: "300px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>
              Information Panel
            </h3>

            <div style={{ fontSize: "14px", lineHeight: 1.4 }}>
              <div style={{ marginBottom: "10px" }}>
                <strong>Selected Asset:</strong> {tugger.label}
              </div>

              <div style={{ marginBottom: "10px" }}>
                <strong>Position (px):</strong> {tugger.x}, {tugger.y}
              </div>

              <div style={{ marginBottom: "10px" }}>
                <strong>Next:</strong> (static placeholder)
              </div>

              <hr style={{ margin: "14px 0" }} />

              <div style={{ opacity: 0.75 }}>
                Future wiring:
                <ul style={{ marginTop: "8px" }}>
                  <li>WebSocket/SSE listener updates x/y</li>
                  <li>Backend chooses mapLayer</li>
                  <li>
                    AJAX fetch populates tugger train: carts, pods, containers
                  </li>
                  <li>Hover/click shows details and actions</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

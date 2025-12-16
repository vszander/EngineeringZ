import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { Link } from "react-router-dom";

//const backendURL = import.meta.env.VITE_BACKEND_URL;

// --- Constants that match your MHSA seed data ---
const START_X = 449;
const START_Y = 200;
const END_Y = 650;
const STEP_PX = 10; // ~10px per node
const TICK_MS = 1000; // 1 Hz (1 second)

export default function TuggerMap() {
  const [tugger, setTugger] = useState({
    x: START_X,
    y: START_Y,
    label: "T12",
    mapLayer: "Evans-Consumer",
    running: true,
  });

  // 🔁 Simple animation loop (static simulation)
  useEffect(() => {
    if (!tugger.running) return;

    const timer = setInterval(() => {
      setTugger((prev) => {
        const nextY = prev.y + STEP_PX;

        if (nextY > END_Y) {
          return { ...prev, running: false }; // stop at end
        }

        return { ...prev, y: nextY };
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [tugger.running]);

  return (
    <>
      <Navbar />

      <div style={{ padding: "16px" }}>
        <div style={{ marginBottom: "12px", display: "flex", gap: "12px" }}>
          <h2 style={{ margin: 0 }}>MHSA Tugger Map (Simulated)</h2>
          <span style={{ opacity: 0.7 }}>|</span>
          <span>{tugger.mapLayer}</span>

          <div style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
            <Link to="/">← Home</Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: "14px",
          }}
        >
          {/* MAP */}
          <div
            style={{
              position: "relative",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <img
              src="/images/clubcar/TuggerRoutes_ForkZones_low_res.png"
              alt="Facility Map"
              style={{ width: "100%", display: "block" }}
              draggable={false}
            />

            {/* TUGGER */}
            <div
              style={{
                position: "absolute",
                left: tugger.x,
                top: tugger.y,
                transform: "translate(-50%, -50%)",
                width: "34px",
                height: "34px",
                transition: "top 0.6s linear", // ✨ smooth movement
              }}
            >
              <img
                src="/images/clubcar/Tugger.png"
                alt="Tugger"
                style={{ width: "100%", height: "100%" }}
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
            }}
          >
            <h3>Information Panel</h3>

            <div style={{ fontSize: "14px", lineHeight: 1.5 }}>
              <p>
                <strong>Asset:</strong> {tugger.label}
              </p>
              <p>
                <strong>Position (px):</strong> {tugger.x}, {tugger.y}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {tugger.running ? "In Transit" : "Arrived"}
              </p>

              <hr />

              <p style={{ opacity: 0.7 }}>
                Simulation:
                <ul>
                  <li>1 Hz updates</li>
                  <li>~10 px per step</li>
                  <li>Matches seeded Edge graph</li>
                </ul>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

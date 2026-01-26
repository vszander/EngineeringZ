// src/pages/mhsa/ScanEvents.jsx
import React, { useEffect, useState } from "react";

const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const API = {
  recent: (limit = 30) =>
    `${backendURL}/mhsa/api/events/recent/?limit=${encodeURIComponent(limit)}`,
};

function fmtTs(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso || "";
  }
}

export default function ScanEvents() {
  const [rows, setRows] = useState([]);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [auto, setAuto] = useState(true);

  // ✅ THIS is where Option A lives
  async function load() {
    setLoading(true);
    setErr("");

    try {
      const r = await fetch(API.recent(limit), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include", // ← SAME AS NavBar.jsx
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok || !data?.ok) {
        throw new Error(data?.reason || r.statusText);
      }

      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e) {
      setErr(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  // initial + limit change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // auto-refresh
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, limit]);

  return (
    <div className="container-fluid py-3">
      <div className="card">
        <div className="card-body">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900 }}>
                Scan Events
              </div>
              <div className="text-muted">
                Newest first • showing last {limit}
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select"
                style={{ width: 120 }}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              >
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                className="btn btn-primary"
                onClick={load}
                disabled={loading}
              >
                {loading ? "Loading…" : "Refresh"}
              </button>

              <div className="form-check ms-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoRefresh"
                  checked={auto}
                  onChange={(e) => setAuto(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="autoRefresh">
                  Auto
                </label>
              </div>
            </div>
          </div>

          {err ? <div className="alert alert-danger">{err}</div> : null}

          <div className="table-responsive">
            <table
              className="table table-sm table-striped table-hover align-middle"
              style={{ fontSize: "0.78rem" }}
            >
              <thead className="table-light">
                <tr>
                  <th style={{ whiteSpace: "nowrap" }}>Time</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Station</th>
                  <th>Scanner</th>
                  <th>User</th>
                  <th>Cart</th>
                  <th>Location</th>
                  <th>Part</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {fmtTs(r.created_at)}
                    </td>
                    <td>{r.action || ""}</td>
                    <td>{r.event_type}</td>
                    <td>{r.source}</td>
                    <td>{r.station_code || ""}</td>
                    <td>{r.scanner_id || ""}</td>
                    <td>{r.user || ""}</td>
                    <td>{r.cart_upc || ""}</td>
                    <td>{r.location || ""}</td>
                    <td>{r.part_number || ""}</td>
                    <td style={{ textAlign: "right" }}>{r.qty || ""}</td>
                  </tr>
                ))}
                {!rows.length && !loading ? (
                  <tr>
                    <td colSpan={11} className="text-muted">
                      No events found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="text-muted" style={{ fontSize: "0.8rem" }}>
            Next step: add client-side filters (jQuery/DataTables) + server-side
            query params (action, cart, station, time window).
          </div>
        </div>
      </div>
    </div>
  );
}

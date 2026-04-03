import React, { useEffect, useMemo, useState } from "react";
import EpaperManifestRenderer from "./EpaperManifestRenderer";

import "./Flight_Manifest_preview.css";

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

export default function FlightManifestPreview() {
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEprint, setShowEprint] = useState(false);

  const backendBase = import.meta.env.VITE_BACKEND_URL;

  const flightId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("flight_id") || "";
  }, []);

  useEffect(() => {
    async function loadManifest() {
      if (!flightId) {
        setError("Missing flight_id.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const url =
          `${backendBase}/mhsa/api/queue-manager/flight-manifest/` +
          `?flight_id=${encodeURIComponent(flightId)}`;

        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(
            json.error || `Manifest request failed (${res.status})`,
          );
        }

        setManifest(json.manifest || null);
      } catch (err) {
        console.error("[FlightManifestPreview] load failed", err);
        setError(err.message || "Unable to load manifest.");
      } finally {
        setLoading(false);
      }
    }

    loadManifest();
  }, [backendBase, flightId]);

  useEffect(() => {
    console.log("[FlightManifestPreview] state", {
      loading,
      error,
      hasManifest: !!manifest,
      showEprint,
      flightId,
      manifestSummary: manifest?.summary || null,
      manifestGroups: manifest?.pou_groups?.length || 0,
      manifestRows: manifest?.rows?.length || 0,
    });
  }, [loading, error, manifest, showEprint, flightId]);

  if (loading) {
    return (
      <div className="ep-page-shell">
        <div className="ep-device">
          <div className="ep-loading">Loading manifest…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ep-page-shell">
        <div className="ep-device">
          <div className="ep-error">
            <h2>Unable to load manifest</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const flight = manifest?.flight || {};
  const queue = manifest?.queue || {};
  const summary = manifest?.summary || {};
  const pouGroups = Array.isArray(manifest?.pou_groups)
    ? manifest.pou_groups
    : [];
  const rows = Array.isArray(manifest?.rows) ? manifest.rows : [];

  const displayGroups = pouGroups.length ? pouGroups : [{ pou: "ALL", rows }];

  return (
    <div className="ep-page-shell">
      <div className="ep-toolbar">
        <button
          type="button"
          className="ep-toolbar-btn"
          onClick={() => window.print()}
        >
          Print
        </button>

        <button
          type="button"
          className="ep-toolbar-btn ep-toolbar-btn--red"
          onClick={() => {
            console.log("[FlightManifestPreview] e-print toggle click", {
              before: showEprint,
              after: !showEprint,
            });
            setShowEprint((prev) => !prev);
          }}
        >
          {showEprint ? "Hide e-print" : "e-print"}
        </button>
      </div>

      <div className="ep-device">
        <header className="ep-header">
          <div className="ep-kicker">MHSA Flight Manifest</div>
          <h1 className="ep-title">{flight.name || "Flight"}</h1>
          <p className="ep-subtitle">
            Queue: <strong>{queue.name || ""}</strong>
            <span className="ep-route-pill">Route: Purple</span>
            <br />
            Departure:{" "}
            <strong>{formatTimeOnly(flight.planned_departure_time)}</strong>
            {flight.status_label ? (
              <>
                {" "}
                • Status: <strong>{flight.status_label}</strong>
              </>
            ) : null}
          </p>
        </header>

        <section className="ep-summary">
          <div className="ep-summary-card">
            <div className="ep-summary-label">Assignments</div>
            <div className="ep-summary-value">
              {summary.staged_assignment_count ?? 0}
            </div>
          </div>

          <div className="ep-summary-card">
            <div className="ep-summary-label">Carts</div>
            <div className="ep-summary-value">{summary.cart_count ?? 0}</div>
          </div>

          <div className="ep-summary-card">
            <div className="ep-summary-label">Rows</div>
            <div className="ep-summary-value">{summary.row_count ?? 0}</div>
          </div>
        </section>

        <main className="ep-content">
          {displayGroups.map((group) => {
            const groupRows = Array.isArray(group?.rows) ? group.rows : [];

            return (
              <section
                key={`${group.pou}-${groupRows.length}`}
                className="ep-group"
              >
                <div className="ep-group-title">
                  {group.pou || "UNASSIGNED"}
                </div>

                <table className="ep-table">
                  <thead>
                    <tr>
                      <th className="col-pou">POU</th>
                      <th className="col-desc">Description</th>
                      <th className="col-part">Part Number</th>
                      <th className="col-qty">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.length ? (
                      groupRows.map((row, idx) => (
                        <tr
                          key={[
                            row.pou,
                            row.part_number,
                            row.cart_id,
                            row.pod_position,
                            idx,
                          ].join("-")}
                        >
                          <td className="col-pou">{row.pou || ""}</td>
                          <td className="col-desc">{row.description || ""}</td>
                          <td className="col-part">{row.part_number || ""}</td>
                          <td className="col-qty">{formatQty(row.qty)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="ep-empty">
                          No rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            );
          })}
        </main>

        <footer className="ep-footer">Generated {formatGeneratedAt()}</footer>
      </div>

      <EpaperManifestRenderer
        manifest={manifest}
        routeLabel="Purple"
        visible={showEprint}
      />
    </div>
  );
}

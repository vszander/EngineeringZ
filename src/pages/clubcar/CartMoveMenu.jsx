/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useState } from "react";
import MhsaNav from "../../components/MhsaNav";
import "./mhsa_home.css"; // reuse existing skin base
const backendURL = import.meta.env.VITE_BACKEND_URL;

export default function CartMoveMenu() {
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    isStaff: false,
    username: null,
    loaded: false,
  });

  useEffect(() => {
    fetch(`${backendURL}/auth/status/`, { credentials: "include" })
      .then((r) => r.json())
      .then((a) =>
        setAuthStatus({
          isAuthenticated: !!a.isAuthenticated,
          isStaff: !!a.isStaff,
          username: a.username ?? null,
          loaded: true,
        })
      )
      .catch(() => setAuthStatus((s) => ({ ...s, loaded: true })));
  }, []);

  // ---- demo filter state
  const [filterType, setFilterType] = useState("location"); // location | status | zone | text
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("EMPTY");
  const [zone, setZone] = useState("");

  // ---- results + selection + staging
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [carts, setCarts] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [stagedMoves, setStagedMoves] = useState(() => new Map()); // cartId -> dest
  const [dest, setDest] = useState("");

  const selectedCarts = useMemo(
    () => carts.filter((c) => selected.has(c.id)),
    [carts, selected]
  );

  async function runFilter() {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("filter", filterType);
      if (filterType === "location" || filterType === "text")
        params.set("q", query.trim());
      if (filterType === "status") params.set("status", status);
      if (filterType === "zone") params.set("zone", zone);

      const res = await fetch(
        `${backendURL}/mhsa/api/carts/move/search?${params}`,
        {
          credentials: "include",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Search failed");

      setCarts(Array.isArray(data.carts) ? data.carts : []);
      setSelected(new Set());
      setStagedMoves(new Map());
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function toggleCart(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function stageSelected() {
    setError("");
    if (!dest) return setError("Pick a destination first.");
    if (selected.size === 0) return setError("Select at least one cart.");

    setStagedMoves((prev) => {
      const next = new Map(prev);
      for (const c of selectedCarts) next.set(c.id, dest);
      return next;
    });
  }

  async function commit() {
    setError("");
    if (!authStatus.isAuthenticated) return setError("Log in required.");
    if (!authStatus.isStaff) return setError("Commit requires staff/admin.");
    if (!dest) return setError("Destination required.");
    if (stagedMoves.size === 0) return setError("No staged moves.");

    setLoading(true);
    try {
      const payload = {
        target_location_id: dest,
        cart_ids: Array.from(stagedMoves.keys()),
        reason: "tune",
      };

      const res = await fetch(`${backendURL}/mhsa/api/carts/move/commit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Commit failed");

      await runFilter();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mhsa-dark">
      <div className="mhsa-home">
        <MhsaNav authStatus={authStatus} />

        <section className="mhsa-hero" style={{ paddingBottom: 10 }}>
          <div className="mhsa-hero-left">
            <h1 className="mhsa-h1">Cart Move</h1>
            <p className="mhsa-muted">
              Filter carts, stage changes, commit once (staff/admin).
            </p>
          </div>
        </section>

        {/* Two-pane layout uses mhsa-card styling you already have.
            If mhsa_home.css doesn’t yet define mhsa-two-pane,
            we’ll add those classes *into mhsa_home.css* (same skin file). */}
        <div className="mhsa-two-pane">
          {/* LEFT big pane */}
          <div className="mhsa-pane-left">
            <div className="mhsa-card">
              <div className="mhsa-card-title">Results</div>

              {error ? <div className="mhsa-alert">{error}</div> : null}

              <div className="mhsa-table-wrap">
                <table className="mhsa-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Cart</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Current Location</th>
                      <th>Staged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carts.map((c) => {
                      const staged = stagedMoves.get(c.id);
                      return (
                        <tr
                          key={c.id}
                          className={
                            selected.has(c.id) ? "mhsa-row-selected" : ""
                          }
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.has(c.id)}
                              onChange={() => toggleCart(c.id)}
                            />
                          </td>
                          <td>{c.name}</td>
                          <td>{c.cart_type || "-"}</td>
                          <td>{c.status || "-"}</td>
                          <td>
                            {c.current_location_name ||
                              c.current_location_id ||
                              "-"}
                          </td>
                          <td>
                            {staged ? (
                              <span className="mhsa-pill">{staged}</span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!carts.length ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="mhsa-muted"
                          style={{ padding: 12 }}
                        >
                          No results yet. Run a filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT small pane */}
          <div className="mhsa-pane-right">
            <div className="mhsa-card">
              <div className="mhsa-card-title">Filter</div>

              <label className="mhsa-label">Type</label>
              <select
                className="mhsa-input"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="location">Carts at location</option>
                <option value="status">Full / Empty / Waiting</option>
                <option value="zone">Carts in zone</option>
                <option value="text">Text search</option>
              </select>

              {(filterType === "location" || filterType === "text") && (
                <>
                  <label className="mhsa-label">Query</label>
                  <input
                    className="mhsa-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </>
              )}

              {filterType === "status" && (
                <>
                  <label className="mhsa-label">Status</label>
                  <select
                    className="mhsa-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="EMPTY">Empty</option>
                    <option value="FULL">Full</option>
                    <option value="WAITING">Waiting</option>
                  </select>
                </>
              )}

              {filterType === "zone" && (
                <>
                  <label className="mhsa-label">Zone</label>
                  <input
                    className="mhsa-input"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  />
                </>
              )}

              <div className="mhsa-cta-row" style={{ marginTop: 10 }}>
                <button
                  className="mhsa-btn mhsa-btn-primary"
                  onClick={runFilter}
                  disabled={loading}
                >
                  {loading ? "Working..." : "Run filter"}
                </button>
              </div>
            </div>

            <div className="mhsa-card" style={{ marginTop: 12 }}>
              <div className="mhsa-card-title">Move</div>

              <label className="mhsa-label">Destination</label>
              <input
                className="mhsa-input"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
              />

              <div className="mhsa-cta-row" style={{ marginTop: 10 }}>
                <button
                  className="mhsa-btn mhsa-btn-secondary"
                  onClick={stageSelected}
                  disabled={loading}
                >
                  Stage selected
                </button>
              </div>

              <div className="mhsa-divider" />

              <button
                className="mhsa-btn mhsa-btn-primary"
                onClick={commit}
                disabled={
                  !authStatus.isStaff ||
                  loading ||
                  stagedMoves.size === 0 ||
                  !dest
                }
                title={!authStatus.isStaff ? "Staff/admin required" : ""}
              >
                Commit ({stagedMoves.size})
              </button>

              {!authStatus.isStaff && authStatus.loaded ? (
                <p className="mhsa-muted" style={{ marginTop: 8 }}>
                  You can stage moves, but commit requires staff/admin.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="mhsa-footer">
          <div className="mhsa-muted">
            Demo-quality: stage locally, commit once. Next: destination picker +
            map click.
          </div>
        </footer>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import MhsaNav from "../../components/MhsaNav";
import "./cart_move.css"; // optional; you can start with mhsa_home.css variables if preferred

const backendURL = import.meta.env.VITE_BACKEND_URL;

// ---- Helpers
function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeJson(res) {
  return res.text().then((t) => {
    try {
      return JSON.parse(t);
    } catch {
      return { ok: res.ok, raw: t };
    }
  });
}

export default function CartMoveMenu() {
  // Demo-quality auth snapshot (same style as mhsa_home.jsx)
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
      .catch(() =>
        setAuthStatus((s) => ({
          ...s,
          loaded: true,
        }))
      );
  }, []);

  // ---- Filter state
  const [filterType, setFilterType] = useState("location"); // location | status | zone | text
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("EMPTY"); // EMPTY | FULL | WAITING
  const [zone, setZone] = useState(""); // demo: string key; later replaced by preferences
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---- Results
  const [carts, setCarts] = useState([]); // server results
  const [selected, setSelected] = useState(() => new Set()); // cart_id set

  // ---- Staging moves
  const [targetLocation, setTargetLocation] = useState(""); // string id or name (demo)
  const [reason, setReason] = useState("tune"); // optional note

  // A staged move is a local override (cartId -> newLocation)
  const [stagedMoves, setStagedMoves] = useState(() => new Map());

  const selectedCount = selected.size;

  const selectedCarts = useMemo(() => {
    if (!carts?.length || selectedCount === 0) return [];
    const sel = selected;
    return carts.filter((c) => sel.has(c.id));
  }, [carts, selected, selectedCount]);

  const stagedCount = useMemo(() => stagedMoves.size, [stagedMoves]);

  const canCommit =
    authStatus.loaded &&
    authStatus.isAuthenticated &&
    authStatus.isStaff &&
    stagedCount > 0 &&
    !!targetLocation;

  // ---- Search
  async function runSearch() {
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

      const data = await safeJson(res);
      if (!res.ok)
        throw new Error(data?.detail || data?.raw || "Search failed");

      // Expecting: { carts: [{id, name, cart_type, status, current_location_id, current_location_name}] }
      setCarts(Array.isArray(data.carts) ? data.carts : []);
      setSelected(new Set());
      setStagedMoves(new Map());
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ---- Selection
  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(carts.map((c) => c.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // ---- Staging
  function stageMoveForSelection() {
    setError("");
    if (!targetLocation) {
      setError("Pick a destination location first.");
      return;
    }
    if (selectedCount === 0) {
      setError("Select at least one cart.");
      return;
    }

    setStagedMoves((prev) => {
      const next = new Map(prev);
      for (const c of selectedCarts) {
        next.set(c.id, targetLocation);
      }
      return next;
    });
  }

  function unstageMove(cartId) {
    setStagedMoves((prev) => {
      const next = new Map(prev);
      next.delete(cartId);
      return next;
    });
  }

  function clearAllStaged() {
    setStagedMoves(new Map());
  }

  // ---- Commit
  async function commitMoves() {
    setError("");

    if (!authStatus.isAuthenticated) {
      setError("Please log in to commit moves.");
      return;
    }
    if (!authStatus.isStaff) {
      setError("Commit requires staff/admin credentials.");
      return;
    }
    if (!targetLocation) {
      setError("Destination location is required.");
      return;
    }
    if (stagedMoves.size === 0) {
      setError("No staged moves to commit.");
      return;
    }

    const payload = {
      target_location_id: targetLocation,
      cart_ids: Array.from(stagedMoves.keys()),
      reason: reason?.trim() || "tune",
    };

    setLoading(true);
    try {
      const res = await fetch(`${backendURL}/mhsa/api/carts/move/commit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      if (!res.ok)
        throw new Error(data?.detail || data?.raw || "Commit failed");

      // After commit: refresh results (demo-quality)
      await runSearch();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // ---- Render
  return (
    <div className="mhsa-dark">
      <div className="mhsa-home">
        <MhsaNav authStatus={authStatus} />

        <section className="mhsa-hero" style={{ paddingBottom: 12 }}>
          <div className="mhsa-hero-left">
            <h1 className="mhsa-h1">Cart Move</h1>
            <p className="mhsa-p">
              Filter carts, stage destination changes, and commit in one
              transaction.
            </p>
            <p className="mhsa-muted">
              Demo-quality flow: stage locally, commit once. RBAC: commit
              requires staff/admin.
            </p>
          </div>

          <div
            className="mhsa-hero-right"
            style={{ display: "flex", alignItems: "center" }}
          >
            <div className="mhsa-card" style={{ width: "100%" }}>
              <div className="mhsa-card-title">Session</div>
              <div className="mhsa-muted">
                {authStatus.loaded ? (
                  authStatus.isAuthenticated ? (
                    <>
                      Signed in as{" "}
                      <strong>{authStatus.username || "user"}</strong>{" "}
                      {authStatus.isStaff ? (
                        <span className="mhsa-pill">Staff</span>
                      ) : (
                        <span className="mhsa-pill">User</span>
                      )}
                    </>
                  ) : (
                    "Not signed in"
                  )
                ) : (
                  "Checking auth..."
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mhsa-two-pane">
          {/* LEFT: results/table (big) */}
          <div className="mhsa-pane-left">
            <div className="mhsa-card">
              <div className="mhsa-card-title">Results</div>

              <div className="mhsa-toolbar">
                <button
                  className="mhsa-btn mhsa-btn-secondary"
                  onClick={selectAll}
                  disabled={!carts.length}
                >
                  Select all
                </button>
                <button
                  className="mhsa-btn mhsa-btn-secondary"
                  onClick={clearSelection}
                  disabled={!selectedCount}
                >
                  Clear selection
                </button>

                <div className="mhsa-muted" style={{ marginLeft: "auto" }}>
                  {carts.length} carts • {selectedCount} selected •{" "}
                  {stagedCount} staged
                </div>
              </div>

              <div className="mhsa-table-wrap">
                <table className="mhsa-table">
                  <thead>
                    <tr>
                      <th style={{ width: 38 }} />
                      <th>Cart</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Current Location</th>
                      <th>Staged</th>
                      <th style={{ width: 90 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {carts.map((c) => {
                      const isSel = selected.has(c.id);
                      const stagedTo = stagedMoves.get(c.id);
                      return (
                        <tr
                          key={c.id}
                          className={cx(isSel && "mhsa-row-selected")}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={isSel}
                              onChange={() => toggleOne(c.id)}
                              aria-label={`Select ${c.name}`}
                            />
                          </td>
                          <td className="mhsa-strong">{c.name}</td>
                          <td>{c.cart_type || "-"}</td>
                          <td>{c.status || "-"}</td>
                          <td>
                            {c.current_location_name ||
                              c.current_location_id ||
                              "-"}
                          </td>
                          <td>
                            {stagedTo ? (
                              <span className="mhsa-pill">{stagedTo}</span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            {stagedTo ? (
                              <button
                                className="mhsa-btn mhsa-btn-secondary mhsa-btn-xs"
                                onClick={() => unstageMove(c.id)}
                              >
                                Undo
                              </button>
                            ) : (
                              <span className="mhsa-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {!carts.length ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="mhsa-muted"
                          style={{ padding: 14 }}
                        >
                          No results yet. Use the filter panel to search.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {error ? (
                <div className="mhsa-alert" role="alert">
                  {error}
                </div>
              ) : null}
            </div>
          </div>

          {/* RIGHT: controls/actions (small) */}
          <div className="mhsa-pane-right">
            <div className="mhsa-card">
              <div className="mhsa-card-title">Filter</div>

              <label className="mhsa-label">Filter type</label>
              <select
                className="mhsa-input"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="location">Carts at location (keyword)</option>
                <option value="status">Operational state</option>
                <option value="zone">Carts in zone</option>
                <option value="text">Text search</option>
              </select>

              {filterType === "location" || filterType === "text" ? (
                <>
                  <label className="mhsa-label">Query</label>
                  <input
                    className="mhsa-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Station 12, unopened, SeatSC..."
                  />
                </>
              ) : null}

              {filterType === "status" ? (
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
              ) : null}

              {filterType === "zone" ? (
                <>
                  <label className="mhsa-label">Zone</label>
                  <input
                    className="mhsa-input"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="Zone A, Receiving, Line-side..."
                  />
                  <div className="mhsa-muted" style={{ marginTop: 6 }}>
                    Demo: zone is a free-text key. Later: driven by preferences.
                  </div>
                </>
              ) : null}

              <div className="mhsa-toolbar" style={{ marginTop: 10 }}>
                <button
                  className="mhsa-btn mhsa-btn-primary"
                  onClick={runSearch}
                  disabled={loading}
                >
                  {loading ? "Working..." : "Run filter"}
                </button>
              </div>
            </div>

            <div className="mhsa-card" style={{ marginTop: 12 }}>
              <div className="mhsa-card-title">Move</div>

              <label className="mhsa-label">Destination location</label>
              <input
                className="mhsa-input"
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                placeholder="e.g., STATION_12"
              />
              <div className="mhsa-muted" style={{ marginTop: 6 }}>
                Demo: type an ID/name. Next: searchable picker / click-on-map.
              </div>

              <label className="mhsa-label" style={{ marginTop: 10 }}>
                Reason (optional)
              </label>
              <input
                className="mhsa-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="tune / staging / correction"
              />

              <div className="mhsa-toolbar" style={{ marginTop: 10, gap: 8 }}>
                <button
                  className="mhsa-btn mhsa-btn-secondary"
                  onClick={stageMoveForSelection}
                  disabled={loading || !selectedCount}
                >
                  Stage selected → destination
                </button>

                <button
                  className="mhsa-btn mhsa-btn-secondary"
                  onClick={clearAllStaged}
                  disabled={loading || stagedCount === 0}
                >
                  Clear staged
                </button>
              </div>

              <div className="mhsa-divider" />

              <button
                className={cx(
                  "mhsa-btn",
                  "mhsa-btn-primary",
                  !canCommit && "mhsa-btn-disabled"
                )}
                onClick={commitMoves}
                disabled={!canCommit || loading}
                title={
                  !authStatus.isAuthenticated
                    ? "Log in required"
                    : !authStatus.isStaff
                    ? "Staff/admin required to commit"
                    : stagedCount === 0
                    ? "Stage at least one move"
                    : !targetLocation
                    ? "Pick a destination"
                    : ""
                }
              >
                Commit {stagedCount ? `(${stagedCount})` : ""}
              </button>

              {!authStatus.isStaff && authStatus.loaded ? (
                <div className="mhsa-muted" style={{ marginTop: 8 }}>
                  You can stage moves, but commit requires staff/admin.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="mhsa-footer">
          <div className="mhsa-muted">
            Tip: run a filter, select a few carts, stage destination, then
            commit once.
          </div>
        </footer>
      </div>
    </div>
  );
}

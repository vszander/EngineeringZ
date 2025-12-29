/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import "./mhsa_home.css";
import "./Search.css";
import Swal from "sweetalert2";

const MAP_IMAGE_SRC = "/images/clubcar/TuggerRoutes_ForkZones_low_res.png"; // hard-coded for now
const MAP_LAYER_ID = "87403789-d602-4382-8ba1-130efb74dbd2"; // Evans low_res layer id (your sample)

const toast = Swal.mixin({
  toast: true,
  position: "center",
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
  showClass: { popup: "" },
  hideClass: { popup: "" },
  didOpen: (t) => {
    t.addEventListener("mouseenter", Swal.stopTimer);
    t.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

function toastOk(html) {
  toast.fire({
    icon: "success",
    title: "Success",
    html,
    background: "#d7d8c6",
    color: "#155157",
    iconColor: "#0c9c89",
  });
}
function toastWarn(html) {
  toast.fire({
    icon: "warning",
    title: "Heads up",
    html,
    background: "#d7d8c6",
    color: "#155157",
    iconColor: "#f2844e",
  });
}
function toastErr(text) {
  toast.fire({
    icon: "error",
    title: "Error",
    text,
    background: "#d7d8c6",
    color: "#155157",
    iconColor: "#f2844e",
  });
}

/**
 * Draft move model:
 * pendingMoves[cart_id] = {
 *   from_location_id, from_location_name,
 *   // EITHER:
 *   to_location_id, to_location_name,
 *   // OR "create new":
 *   create_location: { x_px, y_px, map_layer_id }
 * }
 *
 * Undo action:
 * { cart_id, prev_draft, new_draft }
 */

export default function MoveCarts() {
  const backendBase = import.meta.env.VITE_BACKEND_URL;

  const [loading, setLoading] = useState(false);
  const [carts, setCarts] = useState([]);
  const [locations, setLocations] = useState([]); // staging locations (for future snap-to)
  const [filter, setFilter] = useState("staging"); // future: dropdown options
  const [createNewOnDrop, setCreateNewOnDrop] = useState(true);

  const [pendingMoves, setPendingMoves] = useState(() => ({}));
  const [undoStack, setUndoStack] = useState(() => []);

  // map sizing / coordinate scaling
  const mapWrapRef = useRef(null);
  const mapImgRef = useRef(null);
  const [mapRect, setMapRect] = useState(null);
  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 });

  const dirtyCount = useMemo(
    () => Object.keys(pendingMoves).length,
    [pendingMoves]
  );
  const canUndo = undoStack.length > 0;

  function pushUndo(action) {
    setUndoStack((prev) => [action, ...prev].slice(0, 20));
  }

  function normalizeCart(c) {
    // Accept either:
    // c.current_location.{x_px,y_px} OR c.current_location_x_px style
    const loc = c.current_location || null;
    const x = loc?.x_px ?? c.current_location_x_px ?? null;
    const y = loc?.y_px ?? c.current_location_y_px ?? null;

    return {
      id: String(c.id),
      name: c.name || "",
      cart_type: c.cart_type || "",
      current_location_id: loc?.id ?? c.current_location_id ?? "",
      current_location_name: loc?.name ?? c.current_location_name ?? "",
      current_x_px: x,
      current_y_px: y,
    };
  }

  async function loadData() {
    setLoading(true);
    try {
      const cartsUrl = `${backendBase}/mhsa/maintenance/carts?location_type=${encodeURIComponent(
        filter
      )}&include_location_xy=1`;

      const locsUrl = `${backendBase}/mhsa/maintenance/locations?location_type=${encodeURIComponent(
        filter
      )}`;

      const [cRes, lRes] = await Promise.all([fetch(cartsUrl), fetch(locsUrl)]);
      if (!cRes.ok)
        throw new Error(`Carts HTTP ${cRes.status}: ${await cRes.text()}`);
      if (!lRes.ok)
        throw new Error(`Locations HTTP ${lRes.status}: ${await lRes.text()}`);

      const cartsJson = await cRes.json();
      const locsJson = await lRes.json();

      const rawCarts = Array.isArray(cartsJson?.carts)
        ? cartsJson.carts
        : Array.isArray(cartsJson)
        ? cartsJson
        : [];
      const rawLocs = Array.isArray(locsJson?.locations)
        ? locsJson.locations
        : Array.isArray(locsJson)
        ? locsJson
        : [];

      setCarts(rawCarts.map(normalizeCart));
      setLocations(rawLocs);

      toastOk(
        `<div style="opacity:.9">Loaded <b>${rawCarts.length}</b> ${filter} carts.</div>`
      );
    } catch (e) {
      toastErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Track rendered size for coordinate mapping
  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setMapRect({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function onMapImageLoad() {
    const img = mapImgRef.current;
    if (!img) return;
    setImgNatural({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });

    const wrap = mapWrapRef.current;
    if (wrap) {
      const r = wrap.getBoundingClientRect();
      setMapRect({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      });
    }
  }

  function xyToScreen(x_px, y_px) {
    // map image is scaled to fit the wrapper width; assume coords match natural image coordinates
    if (!mapRect) return { x: 0, y: 0 };
    const sx = (x_px / imgNatural.w) * mapRect.width;
    const sy = (y_px / imgNatural.h) * mapRect.height;
    return { x: sx, y: sy };
  }

  function screenToXy(clientX, clientY) {
    if (!mapRect) return { x_px: 0, y_px: 0 };

    const localX = Math.max(0, Math.min(mapRect.width, clientX - mapRect.left));
    const localY = Math.max(0, Math.min(mapRect.height, clientY - mapRect.top));

    const x_px = Math.round((localX / mapRect.width) * imgNatural.w);
    const y_px = Math.round((localY / mapRect.height) * imgNatural.h);
    return { x_px, y_px };
  }

  function setDraftForCart(cart, draft) {
    setPendingMoves((prev) => {
      const prevDraft = prev[cart.id] || null;

      pushUndo({
        cart_id: cart.id,
        prev_draft: prevDraft,
        new_draft: draft,
      });

      const next = { ...prev };
      if (!draft) {
        delete next[cart.id];
        return next;
      }
      next[cart.id] = draft;
      return next;
    });
  }

  function undo() {
    const last = undoStack[0];
    if (!last) return;
    setUndoStack((prev) => prev.slice(1));
    setPendingMoves((prev) => {
      const next = { ...prev };
      if (!last.prev_draft) delete next[last.cart_id];
      else next[last.cart_id] = last.prev_draft;
      return next;
    });
  }

  function discardAll() {
    if (dirtyCount === 0) return toastWarn("No draft moves to discard.");
    setPendingMoves({});
    setUndoStack([]);
    toastWarn(
      `<div style="opacity:.9">Discarded <b>${dirtyCount}</b> draft move(s).</div>`
    );
  }

  async function commit() {
    const moves = Object.entries(pendingMoves).map(([cart_id, m]) => {
      if (m?.create_location) {
        return {
          cart_id,
          create_location: {
            name: "AUTO",
            location_type: "point",
            x_px: m.create_location.x_px,
            y_px: m.create_location.y_px,
            map_layer_id: m.create_location.map_layer_id || MAP_LAYER_ID,
          },
        };
      }
      return { cart_id, to_location_id: m.to_location_id };
    });

    if (moves.length === 0) return toastWarn("No draft moves to commit.");

    setLoading(true);
    try {
      const res = await fetch(
        `${backendBase}/mhsa/maintenance/cart/move-batch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moves }),
        }
      );

      const txt = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt}`);

      toastOk(
        `<div style="opacity:.92">Committed <b>${moves.length}</b> move(s).</div>`
      );

      setPendingMoves({});
      setUndoStack([]);
      await loadData();
    } catch (e) {
      toastErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Compose the “effective” location/xy used for rendering on map
  const effectiveCarts = useMemo(() => {
    return carts.map((c) => {
      const draft = pendingMoves[c.id];

      if (draft?.create_location) {
        return {
          ...c,
          is_dirty: true,
          effective_x_px: draft.create_location.x_px,
          effective_y_px: draft.create_location.y_px,
          effective_where: `NEW @ (${draft.create_location.x_px}, ${draft.create_location.y_px})`,
        };
      }

      // For now, only show draft coords when creating new locations.
      // Later, when snap-to existing location is added, we'll swap to that location's x/y.
      return {
        ...c,
        is_dirty: Boolean(draft),
        effective_x_px: c.current_x_px,
        effective_y_px: c.current_y_px,
        effective_where:
          draft?.to_location_name ?? c.current_location_name ?? "",
      };
    });
  }, [carts, pendingMoves]);

  // Drag handling (minimal, no dependencies)
  const [draggingId, setDraggingId] = useState(null);

  function onIconPointerDown(e, cart) {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(cart.id);

    // capture pointer so we keep receiving moves
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function onIconPointerMove(e) {
    if (!draggingId) return;
    e.preventDefault();

    const cart = carts.find((c) => c.id === draggingId);
    if (!cart) return;

    const { x_px, y_px } = screenToXy(e.clientX, e.clientY);

    if (createNewOnDrop) {
      setPendingMoves((prev) => ({
        ...prev,
        [cart.id]: {
          from_location_id: cart.current_location_id || null,
          from_location_name: cart.current_location_name || null,
          create_location: { x_px, y_px, map_layer_id: MAP_LAYER_ID },
        },
      }));
    } else {
      // future: snap-to existing location logic
      // For now, still store create_location so you can test drag end-to-end
      setPendingMoves((prev) => ({
        ...prev,
        [cart.id]: {
          from_location_id: cart.current_location_id || null,
          from_location_name: cart.current_location_name || null,
          create_location: { x_px, y_px, map_layer_id: MAP_LAYER_ID },
        },
      }));
    }
  }

  function onIconPointerUp(e) {
    if (!draggingId) return;
    e.preventDefault();
    setDraggingId(null);

    // Push a real undo event at end of drag:
    // Convert current pendingMoves[draggingId] into an undo record by calling setDraftForCart()
    const cart = carts.find((c) => c.id === draggingId);
    if (!cart) return;
    const draft = pendingMoves[draggingId] || null;
    setDraftForCart(cart, draft);

    toastOk(
      `<div style="opacity:.9">Drafted move for <b>${cart.name}</b>.</div>`
    );
  }

  return (
    <div className="mhsa-results">
      <div className="mhsa-results-header">
        <h3>Maintenance: Move Carts (Map)</h3>

        <div className="mhsa-results-meta">
          Draft: <b>{dirtyCount}</b> • Undo: <b>{undoStack.length}</b>/20
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="mhsa-linkbtn"
            onClick={undo}
            disabled={!canUndo || loading}
          >
            Undo
          </button>
          <button
            className="mhsa-linkbtn"
            onClick={discardAll}
            disabled={dirtyCount === 0 || loading}
          >
            Discard
          </button>
          <button
            className="mhsa-linkbtn"
            onClick={commit}
            disabled={dirtyCount === 0 || loading}
          >
            Commit
          </button>
        </div>
      </div>

      <div className="mhsa-results-body">
        {/* Controls */}
        <div className="card mhsa-card mb-3">
          <div
            className="card-body"
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="mhsa-dim" style={{ marginBottom: 6 }}>
                Filter
              </div>
              <select
                className="form-select form-select-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                disabled={loading}
              >
                <option value="staging">staging</option>
                {/* future */}
                <option value="all" disabled>
                  all (coming soon)
                </option>
              </select>
            </div>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                margin: 0,
              }}
            >
              <input
                type="checkbox"
                checked={createNewOnDrop}
                onChange={(e) => setCreateNewOnDrop(e.target.checked)}
                disabled={loading}
              />
              <span>
                Create new location on drop{" "}
                <span className="mhsa-dim">(first use case)</span>
              </span>
            </label>

            <button
              className="mhsa-linkbtn"
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </button>

            <div className="mhsa-dim" style={{ marginLeft: "auto" }}>
              Drag a cart icon to draft a new position. Commit saves everything.
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="card mhsa-card mb-3">
          <div className="card-header mhsa-card-header">
            <div className="mhsa-card-title">Evans (low_res)</div>
            <div className="mhsa-card-sub">
              {loading ? "Working…" : `${effectiveCarts.length} carts`}
            </div>
          </div>

          <div className="card-body" style={{ padding: 12 }}>
            <div
              ref={mapWrapRef}
              style={{
                position: "relative",
                width: "100%",
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.25)",
              }}
              onPointerMove={onIconPointerMove}
              onPointerUp={onIconPointerUp}
            >
              <img
                ref={mapImgRef}
                src={MAP_IMAGE_SRC}
                alt="Evans map"
                draggable={false}
                onLoad={onMapImageLoad}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  userSelect: "none",
                }}
              />

              {/* Icons */}
              {effectiveCarts.map((c) => {
                if (c.effective_x_px == null || c.effective_y_px == null)
                  return null;

                const pos = xyToScreen(c.effective_x_px, c.effective_y_px);
                const isDragging = draggingId === c.id;

                return (
                  <div
                    key={c.id}
                    onPointerDown={(e) => onIconPointerDown(e, c)}
                    title={`${c.name} (${c.cart_type})`}
                    style={{
                      position: "absolute",
                      left: pos.x,
                      top: pos.y,
                      transform: "translate(-50%, -50%)",
                      width: 28,
                      height: 28,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      cursor: "grab",
                      userSelect: "none",
                      border: c.is_dirty
                        ? "1px solid rgba(242,196,95,0.7)"
                        : "1px solid rgba(255,255,255,0.35)",
                      background: c.is_dirty
                        ? "rgba(242,196,95,0.22)"
                        : "rgba(20,141,151,0.25)",
                      boxShadow: isDragging
                        ? "0 0 0 2px rgba(255,255,255,0.18)"
                        : "0 10px 24px rgba(0,0,0,0.45)",
                      fontWeight: 800,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.92)",
                      pointerEvents: "auto",
                    }}
                  >
                    {/* simple icon glyph for now */}⛟
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Table stays (confirmation / contract) */}
        <div className="card mhsa-card">
          <div className="card-header mhsa-card-header">
            <div className="mhsa-card-title">Staging Carts</div>
            <div className="mhsa-card-sub">{effectiveCarts.length} rows</div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-dark table-hover mb-0 mhsa-table">
                <thead>
                  <tr>
                    <th>Cart</th>
                    <th>Type</th>
                    <th>Current Location</th>
                    <th>Current (x,y)</th>
                    <th>Draft</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveCarts.map((c) => {
                    const draft = pendingMoves[c.id] || null;
                    const draftText = draft?.create_location
                      ? `NEW @ (${draft.create_location.x_px}, ${draft.create_location.y_px})`
                      : draft?.to_location_name || "";

                    return (
                      <tr
                        key={c.id}
                        style={
                          c.is_dirty
                            ? { outline: "1px solid rgba(242,196,95,0.18)" }
                            : undefined
                        }
                      >
                        <td style={{ fontWeight: 800 }}>
                          {c.name}{" "}
                          {c.is_dirty && (
                            <span style={{ marginLeft: 8, opacity: 0.8 }}>
                              (draft)
                            </span>
                          )}
                        </td>
                        <td>{c.cart_type}</td>
                        <td>{c.current_location_name}</td>
                        <td className="mhsa-dim">
                          {c.current_x_px != null && c.current_y_px != null
                            ? `${c.current_x_px}, ${c.current_y_px}`
                            : "—"}
                        </td>
                        <td>
                          {draftText || <span className="mhsa-dim">—</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {effectiveCarts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center mhsa-dim py-3">
                        No staging carts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: 12, opacity: 0.75 }}>
              Draft moves are local only. <b>Commit</b> persists (and will later
              write CartPodEvent records).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

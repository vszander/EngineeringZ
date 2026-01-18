/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import "./mhsa_home.css";
//import "./Search.css";
//import "./Maintenance.css"; // tiny add-ons (optional, below)
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const MAP_IMAGE_SRC = "/images/clubcar/TuggerRoutes_ForkZones_low_res.png";
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

export default function Carts() {
  const backendBase = import.meta.env.VITE_BACKEND_URL;
  // MapLayer-driven image (DB controls Cloudflare vs local)
  const [mapImageSrc, setMapImageSrc] = useState(MAP_IMAGE_SRC); // fallback to current constant
  const [maplayer, setMaplayer] = useState(null);

  const navigate = useNavigate();

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

  // Filter text
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const url = `${backendBase}/mhsa/maplayer/${MAP_LAYER_ID}/`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        console.log("Carts maplayer JSON:", j);
        setMaplayer(j);
        if (j?.image_uri) setMapImageSrc(j.image_uri);
      })
      .catch((e) => console.warn("Carts maplayer fetch failed:", e));
  }, [backendBase]);

  // Example: whatever array you render in the table/map.
  // Replace `rows` with your actual list (carts, results, etc.)
  const rows = useMemo(() => {
    // TODO: return your current dataset
    return carts || [];
  }, [carts]);

  const filteredRows = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return rows;

    if (filter === "zone") {
      return rows.filter((r) =>
        String(
          r.zone_name ||
            r.location_zone ||
            r.current_location_zone ||
            r.zone ||
            "",
        )
          .toLowerCase()
          .includes(q),
      );
    }

    if (filter === "part") {
      return rows.filter((r) =>
        String(r.part_number || r.item_part_number || r.pn || "")
          .toLowerCase()
          .includes(q),
      );
    }

    // staging (current behavior) — keep as-is for now
    return rows;
  }, [rows, filter, filterText]);

  // Build hint list based on dropdown selection
  const hintList = useMemo(() => {
    const uniq = new Set();

    if (filter === "zone") {
      rows.forEach((r) => {
        const v = r?.current_location?.zone;
        if (v && v !== "none") {
          uniq.add(String(v).trim());
        }
      });
    } else if (filter === "part") {
      // placeholder for later when part data exists
      rows.forEach((r) => {
        const v = r?.part_number;
        if (v) uniq.add(String(v).trim());
      });
    }

    return Array.from(uniq).sort((a, b) => a.localeCompare(b));
  }, [filter, rows]);

  const onGoHome = () => {
    // pick the route you use for the MHSA workflow menu / home
    navigate("/clubcar"); // or "/clubcar/workflow", etc.
  };

  const dirtyCount = useMemo(
    () => Object.keys(pendingMoves).length,
    [pendingMoves],
  );
  const canUndo = undoStack.length > 0;
  const dragCartIdRef = useRef(null);
  const dragPrevDraftRef = useRef(null);
  const [selectedCartId, setSelectedCartId] = useState(null);

  // optional: for showing selected outline
  const selectedCartIdRef = useRef(null);
  useEffect(() => {
    selectedCartIdRef.current = selectedCartId;
  }, [selectedCartId]);

  function pushUndo(action) {
    setUndoStack((prev) => [action, ...prev].slice(0, 20));
  }

  function normalizeCart(c) {
    const loc = c?.current_location || null;

    return {
      id: String(c?.id || ""),
      name: c?.name || "",
      cart_type: c?.cart_type || "",

      current_location_id: loc?.id ?? null,
      current_location_name: loc?.name ?? null,
      current_x_px: Number.isFinite(loc?.x_px) ? loc.x_px : null,
      current_y_px: Number.isFinite(loc?.y_px) ? loc.y_px : null,
      current_map_layer_id: loc?.map_layer_id ?? null,
    };
  }

  function xyToLocal(x_px, y_px) {
    const img = mapImgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return { x: 0, y: 0 };

    const r = img.getBoundingClientRect();
    return {
      x: (x_px / img.naturalWidth) * r.width,
      y: (y_px / img.naturalHeight) * r.height,
    };
  }

  function clientToXy(clientX, clientY) {
    const img = mapImgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight)
      return { x_px: 0, y_px: 0 };

    const r = img.getBoundingClientRect();

    // coordinates within the displayed image
    const localX = Math.max(0, Math.min(r.width, clientX - r.left));
    const localY = Math.max(0, Math.min(r.height, clientY - r.top));

    // convert back to natural image pixels
    return {
      x_px: Math.round((localX / r.width) * img.naturalWidth),
      y_px: Math.round((localY / r.height) * img.naturalHeight),
    };
  }

  function ensureDraft(cartId) {
    const cart = carts.find((c) => c.id === cartId);
    if (!cart) return null;

    const existing = pendingMoves[cartId];
    if (existing?.create_location) return existing;

    // create a draft at current location if available
    if (cart.current_x_px == null || cart.current_y_px == null) return null;

    const draft = {
      from_location_id: cart.current_location_id || null,
      from_location_name: cart.current_location_name || null,
      create_location: {
        x_px: cart.current_x_px,
        y_px: cart.current_y_px,
        map_layer_id: MAP_LAYER_ID,
      },
    };

    // IMPORTANT: no undo push here
    setPendingMoves((prev) => ({ ...prev, [cartId]: draft }));
    return draft;
  }

  function nudgeSelected(dx, dy) {
    const cartId = selectedCartIdRef.current;
    if (!cartId) return;

    // Ensure a draft exists
    const existing = pendingMoves[cartId] || ensureDraft(cartId);
    if (!existing?.create_location) return;

    setPendingMoves((prev) => {
      const cur = prev[cartId];
      if (!cur?.create_location) return prev;

      const x = cur.create_location.x_px ?? 0;
      const y = cur.create_location.y_px ?? 0;

      return {
        ...prev,
        [cartId]: {
          ...cur,
          create_location: {
            ...cur.create_location,
            x_px: x + dx,
            y_px: y + dy,
          },
        },
      };
    });
  }

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("filter", filter); // "zone"
      params.set("new", "1"); // keep if you need it

      // send selected map layer
      params.set("map_layer_id", MAP_LAYER_ID);

      // send zone text when the filter is zone
      if (filter === "zone" && filterText.trim()) {
        params.set("zone", filterText.trim()); // e.g. "Staging" or "3"
      }

      const url = `${backendBase}/mhsa/maintenance/cart/move/getcarts?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`GetCarts HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();

      const rawCarts = Array.isArray(data?.carts) ? data.carts : [];
      setCarts(rawCarts.map(normalizeCart));

      // optional (until snap-to is implemented)
      setLocations([]);

      toastOk(
        `<div style="opacity:.9">Loaded <b>${rawCarts.length}</b> ${
          data?.filter || filter
        } carts.</div>`,
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

  // listen for keyboard 'nudges'
  useEffect(() => {
    function onKeyDown(e) {
      if (!selectedCartIdRef.current) return;

      // prevent page scrolling on arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      } else {
        return;
      }

      const step = e.altKey ? 50 : e.shiftKey ? 10 : 1;

      switch (e.key) {
        case "ArrowLeft":
          nudgeSelected(-step, 0);
          break;
        case "ArrowRight":
          nudgeSelected(step, 0);
          break;
        case "ArrowUp":
          nudgeSelected(0, -step);
          break;
        case "ArrowDown":
          nudgeSelected(0, step);
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
    // NOTE: depends on nudgeSelected; keep it stable or wrap with useCallback if needed
  }, [pendingMoves, carts]);

  function onMapImageLoad() {
    const img = mapImgRef.current;
    if (!img) return;
    setImgNatural({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
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
      `<div style="opacity:.9">Discarded <b>${dirtyCount}</b> draft move(s).</div>`,
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
        `${backendBase}/mhsa/maintenance/cart/move/commit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moves }),
        },
      );

      const txt = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt}`);

      toastOk(
        `<div style="opacity:.92">Committed <b>${moves.length}</b> move(s).</div>`,
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

    dragCartIdRef.current = cart.id;
    dragPrevDraftRef.current = pendingMoves[cart.id] || null;

    setDraggingId(cart.id);

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

    const { x_px, y_px } = clientToXy(e.clientX, e.clientY);

    // LIVE update only — no undo bookkeeping here
    setPendingMoves((prev) => ({
      ...prev,
      [cart.id]: {
        from_location_id: cart.current_location_id || null,
        from_location_name: cart.current_location_name || null,
        create_location: { x_px, y_px, map_layer_id: MAP_LAYER_ID },
      },
    }));
  }

  function onIconPointerUp(e) {
    const cartId = dragCartIdRef.current;
    if (!cartId) return;

    e.preventDefault();

    const cart = carts.find((c) => c.id === cartId);
    const finalDraft = pendingMoves[cartId] || null;
    const prevDraft = dragPrevDraftRef.current || null;

    // Push ONE undo event for the whole drag
    pushUndo({
      cart_id: cartId,
      prev_draft: prevDraft,
      new_draft: finalDraft,
    });

    // clear drag refs/state
    dragCartIdRef.current = null;
    dragPrevDraftRef.current = null;
    setDraggingId(null);

    if (cart) {
      toastOk(
        `<div style="opacity:.9">Drafted move for <b>${cart.name}</b>.</div>`,
      );
    }
  }

  return (
    <div className="mhsa-results">
      <div className="mhsa-results-header">
        <div className="mhsa-results-titleRow">
          <h3 style={{ margin: 0 }}>Carts</h3>

          <button className="mhsa-linkbtn" onClick={onGoHome}>
            ← MHSA Home
          </button>
        </div>
        <div className="mhsa-results-meta">
          Locate and adjust cart positions
        </div>

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
                onChange={(e) => {
                  const next = e.target.value;
                  setFilter(next);
                  setFilterText(""); // reset text when switching filter type
                }}
                disabled={loading}
              >
                <option value="staging">staging</option>

                {/* new */}
                <option value="zone">zone</option>
                <option value="part">part number</option>

                {/* future */}
                <option value="all" disabled>
                  all (coming soon)
                </option>
              </select>
            </div>

            {/* new: filter text box with hints */}
            <div style={{ minWidth: 240 }}>
              <div className="mhsa-dim" style={{ marginBottom: 6 }}>
                {filter === "zone"
                  ? "Zone"
                  : filter === "part"
                    ? "Part Number"
                    : "Filter Text"}
              </div>

              <input
                className="form-control form-control-sm"
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                disabled={loading || filter === "staging"}
                placeholder={
                  filter === "zone"
                    ? "Type a zone…"
                    : filter === "part"
                      ? "Type a part number…"
                      : "—"
                }
                list="mhsa-filter-hints"
              />

              <datalist id="mhsa-filter-hints">
                {hintList.slice(0, 50).map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>

              {filter === "staging" && (
                <div className="mhsa-dim" style={{ marginTop: 6 }}>
                  (staging filter doesn’t use text yet)
                </div>
              )}
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
                style={{ display: "none" }}
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
                src={mapImageSrc}
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

                const pos = xyToLocal(c.effective_x_px, c.effective_y_px);
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

          <div
            className="card-body"
            style={{
              padding: 12,
              maxHeight: "60vh", // tweak: 55–70vh usually feels good
              overflow: "auto",
            }}
          >
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

/* /src/components/map/search_map_icons.js */

function toFiniteNumber(v) {
  if (v == null) return null;
  const n =
    typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function qtyToIntLabel(qtyText, qtyNum) {
  const raw =
    qtyText != null && String(qtyText).trim() !== "" ? qtyText : qtyNum;

  const n = toFiniteNumber(raw);
  if (!Number.isFinite(n)) return "";
  return String(Math.trunc(n));
}

function cleanToken(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueClassString(tokens) {
  return Array.from(
    new Set(
      tokens
        .flatMap((t) => String(t || "").split(/\s+/))
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ).join(" ");
}

function symbologyToIconClass(sym, fallbackClass = "") {
  const tokens = ["mi", fallbackClass];

  if (sym && typeof sym === "object") {
    const family = cleanToken(sym.family);
    const identity = cleanToken(sym.identity);
    const outline = cleanToken(sym.outline);
    const anchor = cleanToken(sym.anchor);
    const states = Array.isArray(sym.states) ? sym.states : [];

    if (family) tokens.push(`mi-${family}`);
    if (family && identity) tokens.push(`mi-${family}--${identity}`);
    if (outline) tokens.push(`mi-outline--${outline}`);

    if (anchor === "center") tokens.push("mi-anchor--center");
    if (anchor === "top") tokens.push("mi-anchor--top");

    for (const s of states) {
      const state = cleanToken(s);
      if (state) tokens.push(`mi-state--${state}`);
    }
  }

  return uniqueClassString(tokens);
}

function getRowLocation(row) {
  return row?.location || row?.cart?.location || null;
}

function getRowLayerId(row) {
  const loc = getRowLocation(row);

  return (
    loc?.map_layer_id ||
    row?.map_layer_id ||
    row?.location_map_layer_id ||
    row?.cart_map_layer_id ||
    null
  );
}

function getRowXY(row) {
  const loc = getRowLocation(row);

  const x = toFiniteNumber(
    row?.x_px ?? row?.x ?? row?.map_x ?? loc?.x_px ?? loc?.x ?? loc?.map_x,
  );

  const y = toFiniteNumber(
    row?.y_px ?? row?.y ?? row?.map_y ?? loc?.y_px ?? loc?.y ?? loc?.map_y,
  );

  return { x, y };
}

function defaultContainerIconClass(c) {
  const rawType = cleanToken(c?.container_type || c?.container_type_code);

  if (rawType === "dry_van" || rawType === "dry-van" || rawType === "dryvan") {
    return "mi mi-container mi-container--dryvan";
  }

  if (rawType) {
    return `mi mi-container mi-container--${rawType}`;
  }

  return "mi mi-container mi-container--unknown";
}

function defaultCartIconClass(row) {
  const cartClass = row?.cart_icon_class || row?.icon_class || "";
  if (cartClass) return `mi ${cartClass}`;

  const cartCategory = cleanToken(
    row?.cart_category || row?.cart?.cart_category || "unknown",
  );
  return `mi mi-cart mi-cart--${cartCategory || "unknown"}`;
}

function containerTitle(c) {
  const loc = getRowLocation(c);
  const uid =
    c?.container_uid || c?.container_name || c?.container_id || "Container";
  const locName = c?.location_name || loc?.name || c?.cart_location_name || "";
  const qty = qtyToIntLabel(c?.qty, c?.qty_num);
  const qtyPart = qty ? ` · Qty ${qty}` : "";
  const locPart = locName ? ` @ ${locName}` : "";
  return `${uid}${qtyPart}${locPart}`;
}

function cartTitle(c) {
  const loc = getRowLocation(c);
  const cartName = c?.cart_name || c?.cart?.name || "Cart";
  const locName = c?.cart_location_name || loc?.name || "";
  const qty = qtyToIntLabel(c?.qty, c?.qty_num);
  const qtyPart = qty ? ` · Qty ${qty}` : "";
  const locPart = locName ? ` @ ${locName}` : "";
  return `${cartName}${qtyPart}${locPart}`;
}

/**
 * Build MapOverlay icons from /mhsa/search/partid payload.
 *
 * MapOverlay expects:
 *   x or x_px
 *   y or y_px
 *   iconClass
 *   qtyText
 *   title
 */
export function buildIconsFromPartSearch(payload, activeMapLayerId) {
  const icons = [];
  const activeLayer = activeMapLayerId ? String(activeMapLayerId) : null;

  const containers = Array.isArray(payload?.containers)
    ? payload.containers
    : [];

  for (const c of containers) {
    const rowLayer = getRowLayerId(c);
    const layerMatches =
      !activeLayer || !rowLayer || String(rowLayer) === activeLayer;

    if (!layerMatches) continue;

    const { x, y } = getRowXY(c);
    if (x == null || y == null) continue;

    /*
      Placement rule:
      - If the item container is directly at a Location, render the container.
      - If the item container is inside a cartpod, render the cart location
        because that is the physical thing visible on this map.
    */
    const isCartPod = c?.placement === "cartpod";

    const fallbackClass = isCartPod
      ? defaultCartIconClass(c)
      : c?.icon_class || c?.iconClass || defaultContainerIconClass(c);

    const sym = isCartPod ? c?.cart_symbology || c?.symbology : c?.symbology;

    icons.push({
      key: isCartPod
        ? `cart-${c?.cart_id || c?.cart_name || c?.container_id || icons.length}`
        : `container-${c?.container_id || c?.container_uid || icons.length}`,

      x_px: x,
      y_px: y,

      qtyText: qtyToIntLabel(c?.qty, c?.qty_num),
      title: isCartPod ? cartTitle(c) : containerTitle(c),

      iconClass: symbologyToIconClass(sym, fallbackClass),

      symbology: sym,
      raw: c,
      kind: isCartPod ? "cart" : "container",
    });
  }

  const loosePods = Array.isArray(payload?.loose_pods)
    ? payload.loose_pods
    : [];

  for (const p of loosePods) {
    const rowLayer = getRowLayerId(p);
    const layerMatches =
      !activeLayer || !rowLayer || String(rowLayer) === activeLayer;

    if (!layerMatches) continue;

    const { x, y } = getRowXY(p);
    if (x == null || y == null) continue;

    const fallbackClass = defaultCartIconClass(p);

    icons.push({
      key: `loose-pod-${p?.cartpod_id || p?.cart_id || p?.cart_name || icons.length}`,
      x_px: x,
      y_px: y,
      qtyText: qtyToIntLabel(p?.qty, p?.qty_num),
      title: cartTitle(p),
      iconClass: symbologyToIconClass(p?.symbology, fallbackClass),
      symbology: p?.symbology,
      raw: p,
      kind: "loose_pod",
    });
  }

  return icons;
}

function qtyToIntLabel(qtyText, qtyNum) {
  // prefer qtyText if present (e.g., "12.0000"), else fall back to numeric qty
  const raw =
    qtyText != null && String(qtyText).trim() !== "" ? String(qtyText) : qtyNum;

  const n =
    typeof raw === "number"
      ? raw
      : Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return ""; // nothing displayed if bad/empty
  return String(Math.trunc(n)); // truncate toward zero (12.9 -> 12)
}

export function buildIconsFromPartSearch(data, mapLayerId) {
  const icons = [];

  // Containers
  for (const c of data.containers || []) {
    const loc = c.location;
    if (!loc) continue;
    if (loc.map_layer_id !== mapLayerId) continue;
    if (loc.map_x == null || loc.map_y == null) continue;

    const qtyInt = qtyToIntLabel(c.qty, c.qty); // handles number or string

    icons.push({
      x: Number(loc.map_x),
      y: Number(loc.map_y),
      qtyText: qtyInt, // ✅ integer-only label
      iconClass: c.icon_class, // comes from backend
      title: `${c.container_uid} @ ${loc.name}\nQty: ${qtyInt}\n${c.container_type} / ${c.status}`,
    });
  }

  // Loose pods (we plot the cart location)
  for (const lp of data.loose_pods || []) {
    const loc = lp.location || lp.cart?.location;
    if (!loc) continue;
    if (loc.map_layer_id !== mapLayerId) continue;
    if (loc.map_x == null || loc.map_y == null) continue;

    const qtyInt = qtyToIntLabel(lp.qty, lp.qty);

    icons.push({
      x: Number(loc.map_x),
      y: Number(loc.map_y),
      qtyText: qtyInt, // ✅ integer-only label
      iconClass: lp.icon_class, // comes from backend
      title: `${lp.cart_name} @ ${loc.name}\nPod: ${lp.pod_label}\nQty: ${qtyInt}`,
    });
  }

  return icons;
}

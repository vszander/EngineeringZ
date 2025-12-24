export function buildIconsFromPartSearch(data, mapLayerId) {
  const icons = [];

  // Containers
  for (const c of data.containers || []) {
    const loc = c.location;
    if (!loc) continue;
    if (loc.map_layer_id !== mapLayerId) continue;
    if (loc.map_x == null || loc.map_y == null) continue;

    icons.push({
      x: Number(loc.map_x),
      y: Number(loc.map_y),
      qtyText: String(c.qty ?? ""),
      iconClass: c.icon_class, // comes from backend
      title: `${c.container_uid} @ ${loc.name}\nQty: ${c.qty}\n${c.container_type} / ${c.status}`,
    });
  }

  // Loose pods (we plot the cart location)
  for (const lp of data.loose_pods || []) {
    const loc = lp.location || lp.cart?.location;
    if (!loc) continue;
    if (loc.map_layer_id !== mapLayerId) continue;
    if (loc.map_x == null || loc.map_y == null) continue;

    icons.push({
      x: Number(loc.map_x),
      y: Number(loc.map_y),
      qtyText: String(lp.qty ?? ""),
      iconClass: lp.icon_class, // comes from backend
      title: `${lp.cart_name} @ ${loc.name}\nPod: ${lp.pod_label}\nQty: ${lp.qty}`,
    });
  }

  return icons;
}

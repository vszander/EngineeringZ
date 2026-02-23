export function buildIconsFromCockpitSummary(summary, mapLayerId) {
  const icons = [];
  if (!summary) return icons;

  const pushIfMappable = (base) => {
    const x = base?.x ?? base?.x_px ?? base?.map_x;
    const y = base?.y ?? base?.y_px ?? base?.map_y;
    if (x == null || y == null) return;
    if (base?.map_layer_id && String(base.map_layer_id) !== String(mapLayerId))
      return;

    icons.push({
      key: `${base.kind}:${base.entityId}`,
      kind: base.kind,
      entityId: base.entityId,
      summary: base.summary || {},
      x: Number(x),
      y: Number(y),
      qtyText: base.qtyText || "",
      iconClass: base.iconClass, // should be driven by container_type/carttype.code backend-side (or mapped here)
      title: base.title || "",
    });
  };

  // Expected summary shapes (we’ll align to your endpoint)
  for (const c of summary?.containers || []) {
    // c should already include loc fields and styling class OR type code to map to class
    pushIfMappable({
      kind: "container",
      entityId: c.id || c.container_uid,
      map_layer_id: c.location?.map_layer_id,
      map_x: c.location?.map_x,
      map_y: c.location?.map_y,
      qtyText: c.qty != null ? String(c.qty) : "",
      iconClass: c.icon_class || c.iconClass || "mi mi-container",
      title: c.title || `${c.container_uid || c.id}`,
      summary: c,
    });
  }

  for (const cart of summary?.carts || []) {
    pushIfMappable({
      kind: "cart",
      entityId: cart.id || cart.cart_uid,
      map_layer_id: cart.location?.map_layer_id,
      map_x: cart.location?.map_x,
      map_y: cart.location?.map_y,
      qtyText: "",
      iconClass: cart.icon_class || cart.iconClass || "mi mi-cart",
      title: cart.title || `${cart.cart_uid || cart.id}`,
      summary: cart,
    });
  }

  return icons;
}

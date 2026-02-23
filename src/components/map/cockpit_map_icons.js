// src/components/map/cockpit_map_icons.js

export function buildIconsFromCockpitSummary(summaryModel, mapLayerId) {
  // TEMP: if no summary yet, return a couple of demo icons so Cockpit is alive.
  if (!summaryModel) {
    return [
      {
        key: "demo:container:1",
        kind: "container",
        entityId: "DEMO_CONTAINER_1",
        x: 1200,
        y: 900,
        iconClass: "mi mi-container", // pick an existing class from mapicons.css
        title: "Demo Container",
        qtyText: "12",
        summary: { container_type: "tote", qty: 12 },
      },
      {
        key: "demo:cart:1",
        kind: "cart",
        entityId: "DEMO_CART_1",
        x: 1400,
        y: 980,
        iconClass: "mi mi-cart", // pick an existing class from mapicons.css
        title: "Demo Cart",
        qtyText: "",
        summary: { carttype_code: "TUGGER" },
      },
    ];
  }

  // REAL: when summary exists, map summaryModel.containers/carts/etc -> icons[]
  const icons = [];

  for (const c of summaryModel?.containers || []) {
    if (!c?.x_px || !c?.y_px) continue;
    icons.push({
      key: `container:${c.id}`,
      kind: "container",
      entityId: c.id,
      x: c.x_px,
      y: c.y_px,
      iconClass: c.iconClass || "mi mi-container",
      title: c.title || c.name || `Container ${c.id}`,
      qtyText: c.qty != null ? String(c.qty) : "",
      summary: c,
    });
  }

  for (const cart of summaryModel?.carts || []) {
    if (!cart?.x_px || !cart?.y_px) continue;
    icons.push({
      key: `cart:${cart.id}`,
      kind: "cart",
      entityId: cart.id,
      x: cart.x_px,
      y: cart.y_px,
      iconClass: cart.iconClass || "mi mi-cart",
      title: cart.title || cart.name || `Cart ${cart.id}`,
      qtyText: "",
      summary: cart,
    });
  }

  return icons;
}

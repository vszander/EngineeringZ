// src/components/map/mhsa_hud_pins.js
import { Popover } from "bootstrap";

/* global window, document, console */

console.log("[MHSA PINS] loaded ✅ Popover =", Popover);

const backendBase = import.meta.env.VITE_BACKEND_URL;

let openPopover = null;
let ignoreCloseUntil = 0;

function popTemplate() {
  return `
    <div class="popover mhsa-popover" role="tooltip">
      <div class="popover-arrow"></div>
      <h3 class="popover-header"></h3>
      <div class="popover-body"></div>
    </div>
  `;
}

function closeOpenPopover() {
  if (!openPopover) return;
  try {
    openPopover.hide();
    openPopover.dispose();
  } catch (e) {
    console.warn("[MHSA PINS] closeOpenPopover error:", e);
  }
  openPopover = null;
}

async function fetchPinContext(eventId) {
  const url = `${backendBase}/mhsa/api/events/pin-context/${encodeURIComponent(eventId)}/`;
  //  const url = `/mhsa/api/events/pin-context/${encodeURIComponent(eventId)}/`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  // helpful debug if auth/403 etc
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`pin-context returned non-JSON (HTTP ${res.status})`);
  }
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `pin-context HTTP ${res.status}`);
  }
  return data;
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildBodyHtml(ctx) {
  return `
    <div class="mhsa-pop-row">
      <div class="mhsa-pop-k">Alert</div>
      <div class="mhsa-pop-v">${esc(ctx.action || "")}</div>

      <div class="mhsa-pop-k">Cart</div>
      <div class="mhsa-pop-v">${esc(ctx.cart_upc || "")}</div>

      <div class="mhsa-pop-k">Qty</div>
      <div class="mhsa-pop-v">${esc(ctx.qty_label ?? ctx.qty ?? "")}</div>

      <div class="mhsa-pop-k">Station</div>
      <div class="mhsa-pop-v">${esc(ctx.station_code || "")}</div>

      <div class="mhsa-pop-k">Age</div>
      <div class="mhsa-pop-v">${esc(ctx.age_label || "")}</div>
    </div>

    <div class="mhsa-pop-actions">
      <button class="mhsa-btn mhsa-btn--primary"
              data-disposition
              data-event-id="${esc(ctx.id)}">
        Disposition…
      </button>
      <button class="mhsa-btn" data-quick="SNOOZE" data-event-id="${esc(ctx.id)}">Snooze</button>
      <button class="mhsa-btn" data-quick="BENIGN" data-event-id="${esc(ctx.id)}">Benign</button>
    </div>
  `;
}

async function openPinPopover(el) {
  const eventId = el.getAttribute("data-event-id");
  if (!eventId) return;

  closeOpenPopover();

  const backendBase =
    window.__BACKEND_BASE__ ||
    import.meta.env.VITE_BACKEND_BASE ||
    "http://localhost:8000";

  const url = `${backendBase}/mhsa/api/events/pin-context/${encodeURIComponent(eventId)}/`;

  // create & show immediately
  const pop = new Popover(el, {
    trigger: "manual",
    html: true,
    placement: "auto",
    container: "body",
    template: popTemplate(),
    title: "Loading…",
    content: `<div class="mhsa-pop-v">Fetching…</div>`,
    sanitize: false,
  });

  pop.show();
  openPopover = pop;
  ignoreCloseUntil = Date.now() + 350;

  console.log("[MHSA PINS] fetch", url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });

    const data = await res.json();
    console.log("[MHSA PINS] pin-context", res.status, data);

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    // ✅ Bootstrap-5-safe: the tip element is attached to the popover instance
    const tip = pop.tip || document.querySelector(".popover");

    if (!tip) throw new Error("Popover tip not found in DOM");

    const title = `${data.item_description || "(no description)"} • ${data.part_number || "(no part)"}`;

    const header = tip.querySelector(".popover-header");
    const body = tip.querySelector(".popover-body");

    if (header) header.textContent = title;

    if (body) {
      body.innerHTML = `
            <div class="mhsa-pop-row">
            <div class="mhsa-pop-k">Alert</div><div class="mhsa-pop-v">${data.action || ""}</div>
            <div class="mhsa-pop-k">Cart</div><div class="mhsa-pop-v">${data.cart_upc || ""}</div>
            <div class="mhsa-pop-k">Qty</div><div class="mhsa-pop-v">${data.qty_label ?? data.qty ?? ""}</div>
            <div class="mhsa-pop-k">Age</div><div class="mhsa-pop-v">${data.age_label || ""}</div>
            </div>
            <div class="mhsa-pop-actions">
            <button class="mhsa-btn mhsa-btn--primary" data-disposition data-event-id="${data.id}">
                Disposition…
            </button>
            </div>
        `;
    }
  } catch (e) {
    const tip = pop.tip || document.querySelector(".popover");
    if (tip) {
      const header = tip.querySelector(".popover-header");
      const body = tip.querySelector(".popover-body");
      if (header) header.textContent = "Error";
      if (body) body.textContent = e.message || String(e);
    }
  }
}

function installPinPopovers() {
  if (window.__mhsaPinsInstalled) {
    console.log("[MHSA PINS] already installed; skipping");
    return;
  }
  window.__mhsaPinsInstalled = true;

  console.log("[MHSA PINS] installing click handler ✅");

  document.addEventListener(
    "click",
    (ev) => {
      const pin = ev.target.closest("[data-mhsa-pin]");
      const insidePop = ev.target.closest(".mhsa-popover");

      console.log("[MHSA PINS] click target =", ev.target, "pin =", pin);

      if (pin) {
        ev.preventDefault();
        ev.stopPropagation();
        console.log("[MHSA PINS] pin click ✅");
        openPinPopover(pin);
        return;
      }

      if (Date.now() < ignoreCloseUntil) return;
      if (!insidePop) closeOpenPopover();
    },
    true, // capture
  );
}

// ---------------------------------------------
// HUD Aside Ajax (Disposition button)
// ---------------------------------------------
document.addEventListener(
  "click",
  async (ev) => {
    const btn = ev.target.closest("[data-disposition-key][data-event-id]");
    if (!btn) return;

    ev.preventDefault();
    ev.stopPropagation();

    const eventId = btn.getAttribute("data-event-id");
    const key = btn.getAttribute("data-disposition-key");

    console.log("[MHSA PINS] disposition button clicked", {
      eventId,
      key,
    });

    try {
      const backendBase =
        window.__BACKEND_BASE__ ||
        import.meta.env.VITE_BACKEND_BASE ||
        "http://localhost:8000";

      const url = `${backendBase}/mhsa/api/events/pin-aside/${encodeURIComponent(eventId)}/`;

      console.log("[MHSA PINS] calling aside endpoint:", url);

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      console.log("[MHSA PINS] response status:", res.status);

      const data = await res.json();

      console.log("[MHSA PINS] response json:", data);

      if (!res.ok || data?.ok === false) {
        console.error("[MHSA PINS] aside error:", data);
        return;
      }

      // For now: just log the returned HTML length
      console.log("[MHSA PINS] aside HTML length:", data.html?.length);

      // OPTIONAL: temporary test render directly into a known aside container
      const aside = document.querySelector("#mhsa-hud-aside");
      if (aside && data.html) {
        aside.innerHTML = data.html;
        console.log("[MHSA PINS] aside injected into #mhsa-hud-aside ✅");
      } else {
        console.warn("[MHSA PINS] #mhsa-hud-aside not found");
      }
    } catch (err) {
      console.error("[MHSA PINS] fetch failed:", err);
    }
  },
  true,
);

// ---------------------------------------------
// Disposition button → fetch aside fragment → notify HUD
// ---------------------------------------------
document.addEventListener(
  "click",
  async (ev) => {
    const btn = ev.target.closest("[data-disposition][data-event-id]");
    if (!btn) return;

    ev.preventDefault();
    ev.stopPropagation();

    const eventId = btn.getAttribute("data-event-id");

    console.log("[MHSA PINS] Disposition… clicked", { eventId });

    const backendBase =
      window.__BACKEND_BASE__ ||
      import.meta.env.VITE_BACKEND_BASE ||
      "http://localhost:8000";

    const url = `${backendBase}/mhsa/api/events/pin-aside/${encodeURIComponent(eventId)}/`;

    console.log("[MHSA PINS] fetching aside:", url);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      console.log("[MHSA PINS] aside status:", res.status);

      const data = await res.json();
      console.log("[MHSA PINS] aside json:", data);

      if (!res.ok || data?.ok === false) {
        console.error("[MHSA PINS] aside error payload:", data);
        return;
      }

      // Notify HUD to render server HTML in the info panel
      window.dispatchEvent(
        new CustomEvent("mhsa:hud:setInfoHtml", {
          detail: {
            eventId,
            html: data.html || "",
          },
        }),
      );

      console.log("[MHSA PINS] dispatched mhsa:hud:setInfoHtml ✅", {
        eventId,
        htmlLen: (data.html || "").length,
      });
    } catch (err) {
      console.error("[MHSA PINS] aside fetch failed ❌", err);
    }
  },
  true,
);

installPinPopovers();

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

  const pop = openPopover;
  openPopover = null;

  try {
    // Avoid hide() → async complete() path (where tooltip.js blows up)
    // Dispose is sufficient and avoids transition callbacks.
    pop.dispose();
  } catch (e) {
    console.warn("[MHSA PINS] closeOpenPopover dispose error:", e);
  }

  // Extra safety: ensure tip removed if Bootstrap left it behind
  try {
    const tip = pop.tip || document.querySelector(".popover.mhsa-popover");
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
  } catch (_) {}
}

async function openPinPopover(el) {
  const eventId = el.getAttribute("data-event-id");
  if (!eventId) return;

  closeOpenPopover();

  //const backendBase =
  // window.__BACKEND_BASE__ ||
  //   import.meta.env.VITE_BACKEND_URL ||
  //   "http://localhost:8000";

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
    animation: false, // ✅ prevents async transition cleanup in tooltip.js
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

document.addEventListener("DOMContentLoaded", function () {
  const helpTriggers = document.querySelectorAll(".mhsa-help-trigger");
  console.log("event-loaded...", helpTriggers.length);

  helpTriggers.forEach((el) => {
    new Popover(el, {
      html: true,
      sanitize: false,
      container: "body",
      trigger: "click",
      placement: "left",
    });
  });
});

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
    const key = (btn.getAttribute("data-disposition-key") || "").trim();

    console.log("[MHSA PINS] disposition button clicked", { eventId, key });

    // const backendBase =
    //  window.__BACKEND_BASE__ ||
    //    import.meta.env.VITE_BACKEND_URL ||
    //    "http://localhost:8000";

    const url = `${backendBase}/mhsa/api/events/pin-aside/${encodeURIComponent(eventId)}/`;

    console.log("[MHSA PINS] calling aside endpoint:", url);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "text/html" },
        credentials: "include",
      });

      console.log("[MHSA PINS] response status:", res.status);

      const html = await res.text(); // ✅ consume body ONCE

      window.dispatchEvent(
        new CustomEvent("mhsa:hud:setInfoHtml", {
          detail: { eventId, html },
        }),
      );

      closeOpenPopover();
    } catch (err) {
      console.error("[MHSA PINS] aside fetch failed ❌", err);
    }
  },
  true,
);
installPinPopovers();

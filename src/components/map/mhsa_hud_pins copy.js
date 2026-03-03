// mhsa_hud_pins.js (Vite / npm bootstrap module version)
import { Popover } from "bootstrap";

/* global window, document, console */

console.log("[MHSA PINS] mhsa_hud_pins.js loaded ✅", new Date().toISOString());

let openPopover = null;
let closeTimer = null;

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

function scheduleClose(ms = 350) {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => closeOpenPopover(), ms);
}

function cancelClose() {
  clearTimeout(closeTimer);
}

async function fetchPinContext(eventId) {
  const url = `/mhsa/api/events/pin-context/${encodeURIComponent(eventId)}/`;
  console.log("[MHSA PINS] fetch:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.warn("[MHSA PINS] pin-context error:", res.status, data);
    throw new Error(`pin-context HTTP ${res.status}`);
  }
  return data;
}

function escapeHtml(s) {
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
      <div class="mhsa-pop-v">${escapeHtml(ctx.action || "")}</div>

      <div class="mhsa-pop-k">Cart</div>
      <div class="mhsa-pop-v">${escapeHtml(ctx.cart_upc || "")}</div>

      <div class="mhsa-pop-k">Qty</div>
      <div class="mhsa-pop-v">${escapeHtml(ctx.qty_label || ctx.qty || "")}</div>

      <div class="mhsa-pop-k">Station</div>
      <div class="mhsa-pop-v">${escapeHtml(ctx.station_code || "")}</div>

      <div class="mhsa-pop-k">Age</div>
      <div class="mhsa-pop-v">${escapeHtml(ctx.age_label || "")}</div>
    </div>

    <div class="mhsa-pop-actions">
      <button class="mhsa-btn mhsa-btn--primary" data-disposition data-event-id="${escapeHtml(ctx.id)}">
        Disposition…
      </button>
      <button class="mhsa-btn" data-quick="SNOOZE" data-event-id="${escapeHtml(ctx.id)}">Snooze</button>
      <button class="mhsa-btn" data-quick="BENIGN" data-event-id="${escapeHtml(ctx.id)}">Benign</button>
    </div>
  `;
}

async function openPinPopover(el) {
  const eventId = el.getAttribute("data-event-id");
  console.log("[MHSA PINS] pin clicked, eventId =", eventId);

  if (!eventId) return;

  closeOpenPopover();

  // Create popover (note: el is defined here ✅)
  const pop = new Popover(el, {
    trigger: "manual",
    html: true,
    placement: "auto",
    container: "body",
    template: popTemplate(),
    title: "Loading…",
    content: `<div class="mhsa-pop-v">Fetching…</div>`,
    sanitize: false, // we escape ourselves
  });

  pop.show();
  openPopover = pop;

  try {
    const ctx = await fetchPinContext(eventId);

    const title = `${ctx.item_description || "(no description)"} • ${ctx.part_number || "(no part)"}`;

    const tip = pop.getTipElement();
    tip.querySelector(".popover-header").textContent = title;
    tip.querySelector(".popover-body").innerHTML = buildBodyHtml(ctx);

    // hover grace close
    tip.addEventListener("mouseenter", cancelClose);
    tip.addEventListener("mouseleave", () => scheduleClose(350));
    el.addEventListener("mouseenter", cancelClose);
    el.addEventListener("mouseleave", () => scheduleClose(350));
  } catch (e) {
    console.error("[MHSA PINS] openPinPopover error:", e);
    try {
      const tip = pop.getTipElement();
      tip.querySelector(".popover-header").textContent = "Error";
      tip.querySelector(".popover-body").textContent = e.message || String(e);
    } catch (_ignored) {}
  }
}

function installPinPopovers() {
  if (window.__mhsaPinsInstalled) return;
  window.__mhsaPinsInstalled = true;

  console.log("[MHSA PINS] installing document click handler ✅");

  document.addEventListener(
    "click",
    (ev) => {
      const pin = ev.target.closest("[data-mhsa-pin]");
      const insidePop = ev.target.closest(".mhsa-popover");

      if (pin) {
        ev.preventDefault();
        ev.stopPropagation();
        openPinPopover(pin);
        return;
      }

      if (!insidePop) closeOpenPopover();
    },
    true, // capture helps if other handlers stop bubbling
  );

  // delegate popover button actions
  document.addEventListener("click", (ev) => {
    const disp = ev.target.closest("[data-disposition]");
    if (disp) {
      const eventId = disp.getAttribute("data-event-id");
      window.dispatchEvent(
        new CustomEvent("mhsa:pin:selected", { detail: { eventId } }),
      );
      closeOpenPopover();
      return;
    }
    const quick = ev.target.closest("[data-quick]");
    if (quick) {
      console.log(
        "[MHSA PINS] quick action",
        quick.getAttribute("data-quick"),
        quick.getAttribute("data-event-id"),
      );
      closeOpenPopover();
    }
  });
}

installPinPopovers();

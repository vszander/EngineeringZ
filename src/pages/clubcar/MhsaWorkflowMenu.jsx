import React from "react";
import { Link } from "react-router-dom";
import MhsaNav from "../../components/MhsaNav";

/**
 * MHSA Workflow Menu
 * - Touch-friendly "big button" menu
 * - Intended as the landing page for general users
 * - Keeps maintenance tooling separate
 *
 * Notes:
 * - Uses inline styles to avoid CSS import/order issues during dev.
 * - Wraps in mhsa-dark so your theme tokens apply when available.
 */
export default function MhsaWorkflowMenu() {
  const tiles = [
    {
      title: "Find / Locate Carts",
      subtitle: "Filter carts, view on map, and stage moves",
      icon: "🔭",
      to: "/clubcar/carts",
      enabled: true,
    },
    {
      title: "Scan",
      subtitle: "Hands-off keyboard workflows (Fill Cart, etc.)",
      icon: "📟",
      to: "/clubcar/scan",
      enabled: false, // flip later
    },
    {
      title: "Watch",
      subtitle: "Alerts and stale / waiting carts (coming soon)",
      icon: "👀",
      to: "/clubcar/watch",
      enabled: false,
    },
    {
      title: "Relationships / ERD",
      subtitle: "Data model & rules reference (login may be required)",
      icon: "🧩",
      to: "/clubcar/relationships",
      enabled: true,
    },
  ];

  return (
    <div className="mhsa-dark" style={S.page}>
      {/* Keep your MHSA navbar consistent */}
      <MhsaNav />

      <div style={S.wrap}>
        <div style={S.headerRow}>
          <div>
            <div style={S.h1}>MHSA Workflows</div>
            <div style={S.sub}>
              Choose a workflow. This is the operator-friendly entry point.
            </div>
          </div>

          <div style={S.headerRight}>
            <Link to="/clubcar/mhsa" style={S.smallLink}>
              ← MHSA Home
            </Link>
          </div>
        </div>

        <div style={S.grid}>
          {tiles.map((t) => (
            <div key={t.title} style={S.card}>
              <div style={S.cardTop}>
                <div style={S.icon}>{t.icon}</div>
                <div style={S.cardTitle}>{t.title}</div>
              </div>

              <div style={S.cardSub}>{t.subtitle}</div>

              <div style={S.cardBottom}>
                {t.enabled ? (
                  <Link to={t.to} style={S.primaryBtn}>
                    Open →
                  </Link>
                ) : (
                  <button type="button" style={S.disabledBtn} disabled>
                    Coming soon
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Optional "maintenance" block (you can remove if you want) */}
        <div style={S.foot}>
          <div style={S.footTitle}>Admin / Maintenance</div>
          <div style={S.footSub}>
            Maintenance tools remain available via the MHSA navbar for staff.
          </div>
          <div style={S.footBtns}>
            <Link
              to="/clubcar/maintenance/move-cart"
              style={{ ...S.secondaryBtn, textDecoration: "none" }}
            >
              Move Carts (Maintenance) →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    // If your theme tokens load, these will look correct.
    // If not, this still forces a dark background so you don't get “cream”.
    background:
      "radial-gradient(900px 520px at 25% 12%, rgba(183,154,93,0.10), transparent 62%), " +
      "radial-gradient(900px 620px at 62% 34%, rgba(183,154,93,0.06), transparent 62%), " +
      "var(--mhsa-bg, #121417)",
    color: "var(--mhsa-text, rgba(255,255,255,.92))",
    fontFamily: 'var(--mhsa-font-body, "Roboto", Helvetica, Arial, sans-serif)',
  },
  wrap: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "18px 18px 40px",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  h1: {
    fontSize: 28,
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
    marginBottom: 6,
    color: "var(--mhsa-heading, var(--mhsa-gold, #b79a5d))",
    fontWeight: 700,
  },
  sub: {
    color: "var(--mhsa-text-muted, rgba(255,255,255,.68))",
    fontSize: 14,
  },
  smallLink: {
    color: "var(--mhsa-link, rgba(183,154,93,.95))",
    textDecoration: "none",
    fontSize: 14,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--mhsa-border, rgba(255,255,255,.10))",
    background: "var(--mhsa-surface, rgba(0,0,0,.25))",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
    marginTop: 14,
  },
  card: {
    borderRadius: "var(--mhsa-radius, 14px)",
    border: "1px solid var(--mhsa-border, rgba(255,255,255,.10))",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02)), var(--mhsa-surface, #171a1f)",
    boxShadow: "var(--mhsa-shadow, 0 10px 30px rgba(0,0,0,0.35))",
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 170,
  },
  cardTop: { display: "flex", alignItems: "center", gap: 10 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    border: "1px solid var(--mhsa-border, rgba(255,255,255,.10))",
    background:
      "color-mix(in srgb, var(--mhsa-accent, #b79a5d) 14%, transparent)",
    fontSize: 22,
  },
  cardTitle: { fontSize: 16, fontWeight: 700 },
  cardSub: {
    color: "var(--mhsa-text-muted, rgba(255,255,255,.68))",
    fontSize: 13,
    lineHeight: 1.4,
    flex: 1,
  },
  cardBottom: { display: "flex", justifyContent: "flex-end" },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 12px",
    borderRadius: 12,
    border:
      "1px solid color-mix(in srgb, var(--mhsa-accent, #b79a5d) 35%, transparent)",
    background:
      "color-mix(in srgb, var(--mhsa-accent, #b79a5d) 18%, transparent)",
    color: "var(--mhsa-text, rgba(255,255,255,.92))",
    textDecoration: "none",
    fontWeight: 700,
    minWidth: 120,
  },
  disabledBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--mhsa-border, rgba(255,255,255,.10))",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.45)",
    fontWeight: 700,
    minWidth: 120,
    cursor: "not-allowed",
  },
  foot: {
    marginTop: 18,
    padding: 16,
    borderRadius: "var(--mhsa-radius, 14px)",
    border: "1px solid var(--mhsa-border, rgba(255,255,255,.10))",
    background: "var(--mhsa-surface-2, #14181d)",
  },
  footTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "var(--mhsa-heading, var(--mhsa-gold, #b79a5d))",
    marginBottom: 6,
  },
  footSub: {
    color: "var(--mhsa-text-muted, rgba(255,255,255,.68))",
    fontSize: 13,
    marginBottom: 12,
  },
  footBtns: { display: "flex", gap: 10, flexWrap: "wrap" },
  secondaryBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--mhsa-border, rgba(255,255,255,.10))",
    background: "rgba(0,0,0,0.12)",
    color: "var(--mhsa-text, rgba(255,255,255,.92))",
    fontWeight: 700,
  },
};

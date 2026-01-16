import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../components/mhsa.theme.clubcar.css";

/**
 * MHSA top bar navigation.
 * RBAC:
 * - authStatus.isAuthenticated => show MHSA app links
 * - authStatus.isStaff => show Maintenance
 *
 * Usage:
 * <MhsaNav authStatus={authStatus} />
 */
export default function MhsaNav({ authStatus }) {
  const location = useLocation();

  const isAuthed = !!authStatus?.isAuthenticated;
  const isStaff = !!authStatus?.isStaff;

  const items = [
    { label: "MHSA Home", to: "/clubcar/mhsa", show: true },
    { label: "Tugger Map", to: "/clubcar/tugger-map", show: true },
    { label: "ERD (login)", to: "/clubcar/relationships", show: true },

    // New page you’re about to build
    { label: "Cart Move", to: "/clubcar/cart-move", show: isAuthed },

    // Future: scanner workflows (keep hidden until ready if you want)
    { label: "Scan", to: "/clubcar/scan", show: isAuthed },

    // Staff-only
    {
      label: "Maintenance",
      to: "/clubcar/maintenance",
      show: isAuthed && isStaff,
    },
  ].filter((x) => x.show);

  return (
    <header className="mhsa-topbar">
      <div className="mhsa-brand">
        <div className="mhsa-brand-title">MHSA</div>
        <div className="mhsa-brand-subtitle">
          Material Handling Situational Awareness
        </div>
      </div>

      <nav className="mhsa-actions" aria-label="MHSA navigation">
        {items.map((item) => {
          const active =
            location.pathname === item.to ||
            (item.to !== "/clubcar/mhsa" &&
              location.pathname.startsWith(item.to));

          return (
            <Link
              key={item.to}
              className={`mhsa-link ${active ? "mhsa-link--active" : ""}`}
              to={item.to}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

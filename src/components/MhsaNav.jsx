import React from "react";
import { Link, useLocation } from "react-router-dom";
//import "../components/mhsa.theme.clubcar.css";

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
    { label: "HUD", to: "/clubcar/hud", show: true },
    { label: "ERD (login)", to: "/clubcar/relationships", show: true },

    // New page you’re about to build
    { label: "Cockpit", to: "/clubcar/cockpit", show: isAuthed },

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
    <>
      <style>
        {`
        .mhsa-pil-img {
          display: block;
          width: clamp(96px, 12vw, 172px);
          max-width: 100%;
          height: auto;
          object-fit: contain;
          opacity: 0.94;
          filter:
            drop-shadow(0 0.18rem 0.35rem rgba(0, 0, 0, 0.42))
            drop-shadow(0 0 0.22rem rgba(240, 173, 41, 0.16));
          transform: translateY(1px);
          user-select: none;
        }

        @media (max-width: 640px) {
          .mhsa-pil-img {
            width: clamp(86px, 26vw, 132px);
          }
        }
      `}
      </style>
      <header className="mhsa-topbar">
        <div className="mhsa-brand">
          <div className="mhsa-brand-title">
            <img
              className="mhsa-pil-img"
              src="/images/clubcar/MHSA_3d_pil.png"
              alt="Material Handling Situational Awareness"
              draggable={false}
            />
          </div>
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
    </>
  );
}

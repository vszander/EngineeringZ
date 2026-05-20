import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
//import "../components/mhsa.theme.clubcar.css";

const backendBase =
  import.meta.env.VITE_BACKEND_URL || "https://backend.engineering-z.com";

/**
 * MHSA top bar navigation.
 * RBAC:
 * - authStatus.isAuthenticated => show MHSA app links
 * - authStatus.isStaff => show Maintenance
 *
 * Usage:
 * <MhsaNav authStatus={authStatus} />
 */

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
  return "";
}

function normalizeAuthStatus(authStatus) {
  if (!authStatus) {
    return {
      isAuthenticated: false,
      isStaff: false,
      username: "",
    };
  }

  // New /auth/status/ shape:
  // {
  //   ok: true,
  //   authenticated: true,
  //   user: {
  //     username: "...",
  //     is_staff: true,
  //     is_superuser: true
  //   }
  // }
  if ("authenticated" in authStatus || "user" in authStatus) {
    return {
      isAuthenticated: authStatus.authenticated === true,
      isStaff:
        authStatus.user?.is_staff === true ||
        authStatus.user?.is_superuser === true,
      username: authStatus.user?.username || "",
    };
  }

  // Legacy shape:
  // {
  //   isAuthenticated: true,
  //   isStaff: true,
  //   username: "..."
  // }
  return {
    isAuthenticated: authStatus.isAuthenticated === true,
    isStaff: authStatus.isStaff === true,
    username: authStatus.username || "",
  };
}

export default function MhsaNav({ authStatus }) {
  const location = useLocation();

  const [localAuthStatus, setLocalAuthStatus] = useState(
    authStatus || {
      isAuthenticated: false,
      isStaff: false,
      username: null,
    },
  );

  useEffect(() => {
    let alive = true;

    fetch(`${backendBase}/auth/status/`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return;
        console.log("[MhsaNav] fetched auth/status", data);
        setLocalAuthStatus(data);
      })
      .catch((err) => {
        console.warn("[MhsaNav] auth/status failed", err);
      });

    return () => {
      alive = false;
    };
  }, [location.pathname]);

  const normalizedAuth = normalizeAuthStatus(localAuthStatus);

  const isAuthed = normalizedAuth.isAuthenticated;
  const isStaff = normalizedAuth.isStaff;

  const items = [
    { label: "MHSA Home", to: "/clubcar/mhsa", show: isAuthed },
    { label: "Engineering-Z", to: "/", show: true },
    { label: "HUD", to: "/clubcar/hud", show: isAuthed },
    { label: "ERD", to: "/clubcar/relationships", show: isAuthed },
    { label: "Cockpit", to: "/clubcar/cockpit", show: isAuthed },
    { label: "Scan", to: "/clubcar/scan", show: isAuthed },

    {
      label: "Maintenance",
      to: "/clubcar/maintenance",
      show: isAuthed && isStaff,
    },
  ].filter((x) => x.show);

  async function handleLogout(event) {
    event.preventDefault();

    try {
      // Ensure CSRF cookie exists.
      await fetch(`${backendBase}/auth/csrf/`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const csrfToken = getCookie("csrftoken");

      await fetch(`${backendBase}/auth/logout-json/`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.warn("[MhsaNav] logout failed or incomplete", err);
    } finally {
      window.location.href = "/";
    }
  }

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
          {isAuthed && (
            <a href="/" className="mhsa-link" onClick={handleLogout}>
              Log Out
            </a>
          )}
        </nav>
      </header>
    </>
  );
}

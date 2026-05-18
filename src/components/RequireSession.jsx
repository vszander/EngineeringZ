// src/components/auth/RequireSession.jsx

import { useEffect, useState } from "react";
import { fetchSessionStatus } from "../api/authSession";
// top level of RequireSession.jsx
console.log("[RequireSession module] loaded");

const backendBase = import.meta.env.VITE_BACKEND_URL || "";

export default function RequireSession({ children, staffOnly = false }) {
  const [state, setState] = useState({
    loading: true,
    isAuthenticated: false,
    isStaff: false,
    username: "",
  });

  useEffect(() => {
    let alive = true;

    console.log("[RequireSession] checking backend session");

    fetch(`${backendBase}/backend/auth/status`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        console.log("[RequireSession] response", {
          status: res.status,
          data,
        });

        if (!alive) return;

        setState({
          loading: false,
          isAuthenticated: !!data.isAuthenticated,
          isStaff: !!data.isStaff,
          username: data.username || "",
        });
      })
      .catch((err) => {
        console.warn("[RequireSession] failed", err);

        if (!alive) return;

        setState({
          loading: false,
          isAuthenticated: false,
          isStaff: false,
          username: "",
        });
      });

    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="container py-4">
        <div className="alert alert-secondary mb-0">
          Checking MHSA session...
        </div>
      </div>
    );
  }

  if (!state.isAuthenticated) {
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );

    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          <strong>Login required.</strong> Please sign in to access MHSA.
        </div>

        <a
          className="btn btn-primary"
          href={`${backendBase}/accounts/login/?next=${next}`}
        >
          Sign in
        </a>
      </div>
    );
  }

  if (staffOnly && !state.isStaff) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger mb-0">
          Staff access is required for this page.
        </div>
      </div>
    );
  }

  return children;
}

// src/components/auth/RequireSession.jsx

import { useEffect, useState } from "react";

import { useEffect, useState } from "react";

const backendBase =
  import.meta.env.VITE_BACKEND_URL || "https://backend.engineering-z.com";

console.log("[RequireSession module] loaded");

export default function RequireSession({ children, staffOnly = false }) {
  const [state, setState] = useState({
    loading: true,
    isAuthenticated: false,
    isStaff: false,
    username: "",
    checked: false,
  });

  console.log("[RequireSession] render", state);

  useEffect(() => {
    let alive = true;

    const url = `${backendBase}/auth/status/`;

    console.log("[RequireSession] checking", url);

    fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));

        console.log("[RequireSession] backend response", {
          status: res.status,
          data,
        });

        if (!alive) return;

        setState({
          loading: false,
          checked: true,
          isAuthenticated: data.isAuthenticated === true,
          isStaff: data.isStaff === true,
          username: data.username || "",
        });
      })
      .catch((err) => {
        console.warn("[RequireSession] session check failed", err);

        if (!alive) return;

        setState({
          loading: false,
          checked: true,
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
          href={`${backendBase}/auth?mode=login&next=${next}`}
        >
          Sign in
        </a>

        <div className="text-muted small mt-3">
          Session check completed. User is not authenticated.
        </div>
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

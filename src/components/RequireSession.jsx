// src/components/auth/RequireSession.jsx

import { useEffect, useState } from "react";
import { fetchSessionStatus } from "../api/authSession";
// top level of RequireSession.jsx
console.log("[RequireSession module] loaded");

export default function RequireSession({ children, staffOnly = false }) {
  const [state, setState] = useState({
    loading: true,
    authenticated: false,
    user: null,
  });

  // inside component body
  console.log("[RequireSession] mounted");

  useEffect(() => {
    let alive = true;

    fetchSessionStatus()
      .then((data) => {
        if (!alive) return;

        setState({
          loading: false,
          authenticated: !!data.authenticated,
          user: data.user || null,
        });
      })
      .catch(() => {
        if (!alive) return;

        setState({
          loading: false,
          authenticated: false,
          user: null,
        });
      });

    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="container py-4">
        <div className="alert alert-secondary mb-0">Checking session...</div>
      </div>
    );
  }

  if (!state.authenticated) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          <strong>Login required.</strong> Please sign in to access MHSA.
        </div>
        <a className="btn btn-primary" href="/accounts/login/">
          Sign in
        </a>
      </div>
    );
  }

  if (staffOnly && !state.user?.is_staff) {
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

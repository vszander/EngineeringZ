// src/components/ProtectedMhsaPage.jsx

import { useEffect, useState } from "react";

const backendBase =
  import.meta.env.VITE_BACKEND_URL || "https://backend.engineering-z.com";

export default function ProtectedMhsaPage({
  children,
  staffOnly = false,
  redirectToLogin = true,
}) {
  const [state, setState] = useState({
    loading: true,
    isAuthenticated: false,
    isStaff: false,
    username: "",
  });

  useEffect(() => {
    let alive = true;

    async function checkSession() {
      try {
        const res = await fetch(`${backendBase}/auth/status/`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!alive) return;

        setState({
          loading: false,
          isAuthenticated: data.isAuthenticated === true,
          isStaff: data.isStaff === true,
          username: data.username || "",
        });
      } catch (err) {
        console.warn("[ProtectedMhsaPage] auth check failed", err);

        if (!alive) return;

        setState({
          loading: false,
          isAuthenticated: false,
          isStaff: false,
          username: "",
        });
      }
    }

    checkSession();

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

    if (redirectToLogin) {
      window.location.href = `${backendBase}/accounts/cover-login/?next=${next}`;
      return null;
    }

    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          <strong>Login required.</strong> Please sign in to access MHSA.
        </div>

        <a
          className="btn btn-primary"
          href={`${backendBase}/auth?next=${next}`}
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
          Staff access is required for this MHSA page.
        </div>
      </div>
    );
  }

  return children;
}

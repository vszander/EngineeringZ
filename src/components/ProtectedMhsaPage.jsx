// src/components/ProtectedMhsaPage.jsx

import { useEffect, useState } from "react";

const backendBase =
  import.meta.env.VITE_BACKEND_URL || "https://backend.engineering-z.com";

function normalizeAuthStatus(auth) {
  if (!auth) {
    return {
      isAuthenticated: false,
      isStaff: false,
      username: "",
      loginUrl: "/auth",
    };
  }

  // New /auth/status/ shape
  if ("authenticated" in auth || "user" in auth) {
    return {
      isAuthenticated: auth.authenticated === true,
      isStaff: auth.user?.is_staff === true || auth.user?.is_superuser === true,
      username: auth.user?.username || "",
      loginUrl: auth.user?.login_url || "/auth",
    };
  }

  // Legacy shape
  return {
    isAuthenticated: auth.isAuthenticated === true,
    isStaff: auth.isStaff === true,
    username: auth.username || "",
    loginUrl: auth.loginUrl || "/auth",
  };
}

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
    error: "",
  });

  useEffect(() => {
    let alive = true;

    const url = `${backendBase}/auth/status/`;

    console.log("[ProtectedMhsaPage] checking", url);

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
        const normalized = normalizeAuthStatus(data);

        console.log("[ProtectedMhsaPage] raw auth", data);
        console.log("[ProtectedMhsaPage] normalized auth", normalized);

        if (!alive) return;

        setState({
          loading: false,
          isAuthenticated: normalized.isAuthenticated,
          isStaff: normalized.isStaff,
          username: normalized.username,
          error: "",
        });
      })
      .catch((err) => {
        console.warn("[ProtectedMhsaPage] auth/status failed", err);

        if (!alive) return;

        setState({
          loading: false,
          isAuthenticated: false,
          isStaff: false,
          username: "",
          error: "Unable to verify authentication.",
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

    if (redirectToLogin) {
      window.location.href = `/auth?next=${next}`;
      return null;
    }

    return (
      <div className="container py-4">
        <div className="alert alert-warning">
          <strong>Login required.</strong> Please sign in to access MHSA.
        </div>

        <a className="btn btn-primary" href={`/auth?next=${next}`}>
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

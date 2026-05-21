// src/pages/Authentication.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const backendBase =
  import.meta.env.VITE_BACKEND_URL || "https://backend.engineering-z.com";

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
  return "";
}

function normalizeNextPath(nextValue) {
  if (!nextValue) return "/clubcar/mhsa";

  // Only allow local app redirects.
  // This avoids open-redirect behavior such as ?next=https://badsite.com
  if (!nextValue.startsWith("/")) return "/clubcar/mhsa";
  if (nextValue.startsWith("//")) return "/clubcar/mhsa";

  return nextValue;
}

function loadTurnstileScript() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }

    const existing = document.querySelector(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(window.turnstile));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = reject;

    document.head.appendChild(script);
  });
}

export default function Authentication() {
  const location = useLocation();
  const navigate = useNavigate();

  const turnstileContainerRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const nextPath = useMemo(
    () => normalizeNextPath(params.get("next")),
    [params],
  );

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [turnstileToken, setTurnstileToken] = useState("");

  const [status, setStatus] = useState({
    checking: true,
    submitting: false,
    message: "",
    turnstileReady: false,
  });

  useEffect(() => {
    let alive = true;

    async function checkExistingSession() {
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

        if (data.isAuthenticated === true) {
          navigate(nextPath || "/clubcar/mhsa", { replace: true });
          return;
        }

        setStatus((prev) => ({
          ...prev,
          checking: false,
        }));
      } catch (err) {
        console.warn("[Authentication] status check failed", err);

        if (!alive) return;

        setStatus((prev) => ({
          ...prev,
          checking: false,
          message:
            "Unable to confirm current session. You can still try to sign in.",
        }));
      }
    }

    checkExistingSession();

    return () => {
      alive = false;
    };
  }, [navigate, nextPath]);

  useEffect(() => {
    let alive = true;

    async function renderTurnstile() {
      if (status.checking) return;
      if (!turnstileSiteKey) {
        console.warn("[Authentication] VITE_TURNSTILE_SITE_KEY is not set.");
        setStatus((prev) => ({
          ...prev,
          turnstileReady: false,
          message:
            "Cloudflare verification is not configured. Please contact the administrator.",
        }));
        return;
      }

      if (!turnstileContainerRef.current) return;
      if (turnstileWidgetIdRef.current) return;

      try {
        const turnstile = await loadTurnstileScript();

        if (!alive || !turnstileContainerRef.current) return;

        turnstileWidgetIdRef.current = turnstile.render(
          turnstileContainerRef.current,
          {
            sitekey: turnstileSiteKey,
            theme: "dark",
            callback: (token) => {
              setTurnstileToken(token || "");
              setStatus((prev) => ({
                ...prev,
                turnstileReady: true,
                message: "",
              }));
            },
            "expired-callback": () => {
              setTurnstileToken("");
              setStatus((prev) => ({
                ...prev,
                turnstileReady: false,
                message: "Cloudflare verification expired. Please try again.",
              }));
            },
            "error-callback": () => {
              setTurnstileToken("");
              setStatus((prev) => ({
                ...prev,
                turnstileReady: false,
                message:
                  "Cloudflare verification failed to load. Please refresh and try again.",
              }));
            },
          },
        );
      } catch (err) {
        console.warn("[Authentication] Turnstile script failed", err);

        if (!alive) return;

        setStatus((prev) => ({
          ...prev,
          turnstileReady: false,
          message:
            "Cloudflare verification could not be loaded. Please refresh and try again.",
        }));
      }
    }

    renderTurnstile();

    return () => {
      alive = false;

      try {
        if (window.turnstile && turnstileWidgetIdRef.current) {
          window.turnstile.remove(turnstileWidgetIdRef.current);
          turnstileWidgetIdRef.current = null;
        }
      } catch (err) {
        console.warn("[Authentication] Turnstile cleanup failed", err);
      }
    };
  }, [status.checking]);

  function resetTurnstile() {
    try {
      if (window.turnstile && turnstileWidgetIdRef.current) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
    } catch (err) {
      console.warn("[Authentication] Turnstile reset failed", err);
    }

    setTurnstileToken("");
    setStatus((prev) => ({
      ...prev,
      turnstileReady: false,
    }));
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function ensureCsrfCookie() {
    const res = await fetch(`${backendBase}/auth/csrf/`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) {
      throw new Error("Unable to initialize secure login.");
    }

    return getCookie("csrftoken");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      Swal.fire({
        icon: "warning",
        title: "Missing credentials",
        text: "Please enter your username/email and password.",
      });
      return;
    }

    if (!turnstileToken) {
      Swal.fire({
        icon: "warning",
        title: "Verification required",
        text: "Please complete the Cloudflare verification before signing in.",
      });
      return;
    }

    setStatus((prev) => ({
      ...prev,
      submitting: true,
      message: "",
    }));

    try {
      const csrfToken = await ensureCsrfCookie();

      const res = await fetch(`${backendBase}/auth/login-json/`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          username,
          password,
          turnstileToken,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Invalid username or password.");
      }

      Swal.fire({
        icon: "success",
        title: "Signed in",
        text: "Authentication successful.",
        timer: 900,
        showConfirmButton: false,
      });

      setTimeout(() => {
        navigate(normalizeNextPath(data.redirectTo || nextPath), {
          replace: true,
        });
      }, 900);
    } catch (err) {
      console.warn("[Authentication] login failed", err);

      resetTurnstile();

      setStatus((prev) => ({
        ...prev,
        submitting: false,
        message: err.message || "Login failed.",
      }));

      Swal.fire({
        icon: "error",
        title: "Login failed",
        text: err.message || "Please check your credentials and try again.",
      });
    }
  }

  if (status.checking) {
    return (
      <main style={styles.shell}>
        <div style={styles.overlay} />
        <section style={styles.card}>
          <div style={styles.brandKicker}>Engineering Z</div>
          <h1 style={styles.title}>Checking session...</h1>
          <p style={styles.copy}>
            Please wait while we confirm your authentication status.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.shell}>
      <div style={styles.overlay} />

      <section style={styles.card} aria-label="Authentication form">
        <div style={styles.brandKicker}>Engineering Z</div>

        <h1 style={styles.title}>Sign in</h1>

        <p style={styles.copy}>
          Access protected Engineering Z and MHSA tools with your authorized
          account.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label} htmlFor="username">
            Username or email
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={form.username}
            onChange={handleChange}
            disabled={status.submitting}
            style={styles.input}
          />

          <label style={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            disabled={status.submitting}
            style={styles.input}
          />

          <div style={styles.turnstileBox}>
            <div ref={turnstileContainerRef} />
          </div>

          {status.message ? (
            <div style={styles.errorBox}>{status.message}</div>
          ) : null}

          <button
            type="submit"
            disabled={
              status.submitting || !turnstileToken || !status.turnstileReady
            }
            style={{
              ...styles.button,
              opacity:
                status.submitting || !turnstileToken || !status.turnstileReady
                  ? 0.7
                  : 1,
              cursor:
                status.submitting || !turnstileToken || !status.turnstileReady
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {status.submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={styles.footerNote}>
          Successful authentication establishes a secure Django session. No
          session token is stored in React.
        </div>
      </section>
    </main>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    width: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px",
    backgroundImage: "url('/images/background.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(135deg, rgba(7, 18, 22, 0.84), rgba(10, 22, 27, 0.68))",
    zIndex: 0,
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "430px",
    padding: "32px",
    borderRadius: "22px",
    background: "rgba(15, 26, 31, 0.92)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.42)",
    color: "#f7f4ec",
    backdropFilter: "blur(10px)",
  },
  brandKicker: {
    fontSize: "0.8rem",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "#f0ad29",
    marginBottom: "12px",
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: "2rem",
    lineHeight: 1.1,
    color: "#ffffff",
  },
  copy: {
    marginTop: "12px",
    marginBottom: "24px",
    color: "rgba(255, 255, 255, 0.74)",
    lineHeight: 1.45,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  label: {
    fontSize: "0.84rem",
    color: "rgba(255, 255, 255, 0.82)",
    fontWeight: 700,
    marginTop: "6px",
  },
  input: {
    width: "100%",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "12px",
    padding: "12px 14px",
    background: "rgba(255, 255, 255, 0.08)",
    color: "#ffffff",
    outline: "none",
    fontSize: "1rem",
  },
  turnstileBox: {
    marginTop: "10px",
    minHeight: "70px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    padding: "8px",
  },
  errorBox: {
    marginTop: "8px",
    padding: "10px 12px",
    borderRadius: "12px",
    background: "rgba(220, 53, 69, 0.16)",
    border: "1px solid rgba(220, 53, 69, 0.38)",
    color: "#ffd7dc",
    fontSize: "0.9rem",
  },
  button: {
    marginTop: "12px",
    border: 0,
    borderRadius: "14px",
    padding: "12px 16px",
    background: "#f0ad29",
    color: "#1b1b1b",
    fontWeight: 800,
    fontSize: "1rem",
    boxShadow: "0 12px 30px rgba(240, 173, 41, 0.22)",
  },
  footerNote: {
    marginTop: "18px",
    fontSize: "0.78rem",
    color: "rgba(255, 255, 255, 0.52)",
    lineHeight: 1.4,
  },
};

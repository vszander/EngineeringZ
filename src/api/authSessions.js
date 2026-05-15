// src/api/authSession.js

const backendBase = import.meta.env.VITE_BACKEND_URL;

export async function fetchSessionStatus() {
  const res = await fetch(`${backendBase}/mhsa/api/auth/session/`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      authenticated: false,
      user: null,
      status: res.status,
    };
  }

  return await res.json();
}

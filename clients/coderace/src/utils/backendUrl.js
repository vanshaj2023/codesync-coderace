// In production this app is served by the same server that hosts the API and sockets,
// so the page's own origin is the backend. VITE_BACKEND_URL overrides it, and the dev
// server (a different port) points at the local backend.
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : window.location.origin);

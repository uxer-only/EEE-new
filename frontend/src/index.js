import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Purge any previously installed PWA service worker + its cached bundle.
// (The app used to be installable; a stale SW can keep serving an old build.)
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;

  const cleanup = Promise.all([
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {}),
    ('caches' in window
      ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      : Promise.resolve()
    ).catch(() => {}),
  ]);

  // If a stale SW was controlling this page, force a one-time reload so the
  // freshly-fetched assets take over. Guarded to avoid reload loops.
  if (hadController && !sessionStorage.getItem('sw_purged')) {
    cleanup.then(() => {
      sessionStorage.setItem('sw_purged', '1');
      window.location.reload();
    });
  }
}

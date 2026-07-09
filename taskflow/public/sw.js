/* Ergon service worker — instalowalność PWA + fokus po kliknięciu powiadomienia. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// przelot sieciowy; aplikacja ma własny cache stanu w localStorage
self.addEventListener("fetch", () => {});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if ("focus" in c) return c.focus();
        }
        return self.clients.openWindow("/");
      })
  );
});

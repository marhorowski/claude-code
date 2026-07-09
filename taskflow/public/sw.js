/* Ergon service worker — PWA + powiadomienia Pulsu z przyciskami odpowiedzi. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// przelot sieciowy; aplikacja ma własny cache stanu w localStorage
self.addEventListener("fetch", () => {});

async function deliverAnswer(answer) {
  const list = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  if (list.length) {
    // aplikacja działa — przekaż odpowiedź do zapisania
    for (const c of list) c.postMessage({ type: "pulse-answer", answer });
    return;
  }
  // aplikacja zamknięta — otwórz z parametrem, App zapisze przy starcie
  await self.clients.openWindow(`/?pulse=${answer}`);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action;
  if (action === "realize" || action === "waste") {
    event.waitUntil(deliverAnswer(action));
    return;
  }
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

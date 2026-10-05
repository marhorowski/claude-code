/**
 * Odbiera zgłoszenia z formularza na trifecta-agency.pl/vsl-alchemik
 * i dopisuje je do pierwszej zakładki arkusza „Zgłoszenia — Alchemik Zmiany (VSL)”.
 *
 * Instalacja: w arkuszu Rozszerzenia → Apps Script → wklej ten kod → Zapisz →
 * Wdróż → Nowe wdrożenie → Typ: Aplikacja internetowa →
 * Wykonuj jako: Ja, Kto ma dostęp: Każdy → Wdróż → skopiuj URL kończący się na /exec.
 */
function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return ContentService.createTextOutput("ok"); // honeypot

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
      new Date(),
      clean(p.name),
      "'" + clean(p.phone), // apostrof: Sheets nie zamieni numeru na liczbę
      clean(p.email),
      clean(p.business),
      clean(p.consent),
      clean(p.page),
    ]);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput("ok");
}

// Ucina długie wpisy i blokuje wstrzykiwanie formuł (=, +, -, @ na początku)
function clean(v) {
  v = String(v || "").slice(0, 500);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

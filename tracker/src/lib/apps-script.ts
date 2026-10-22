// Kod Google Apps Script wklejany do arkusza klienta (Rozszerzenia → Apps Script).
// Odbiera wpisy z aplikacji, trzyma je w zakładkach z danymi i buduje zakładki z formułami.
// Bez znaków ` w treści — całość jest zwykłym napisem.

const SOURCE = String.raw`/**
 * KPI-Tracker — synchronizacja z arkuszem.
 * Nie zmieniaj tego pliku ręcznie. Wdrożenie: Wdróż → Nowe wdrożenie → Aplikacja internetowa,
 * „Wykonaj jako: Ja”, „Kto ma dostęp: Każdy”. Adres /exec wklej w KPI-Tracker na stronie klienta.
 */
var SECRET = "__SECRET__";
var RAW = { marketing: "Marketing", setting: "Setting", sales: "Sprzedaż" };
var AREAS = ["marketing", "setting", "sales"];
var META = [["id", "ID wpisu"], ["dateFrom", "Data od"], ["dateTo", "Data do"], ["week", "Tydzień (od pon.)"], ["month", "Miesiąc"]];
var TAIL = [["notes", "Uwagi"], ["updatedAt", "Ostatnia zmiana"]];
var WEEK_COL = 4, MONTH_COL = 5, FIRST_FIELD_COL = 6;

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return reply({ ok: false, error: "Nieprawidłowy klucz — wklej skrypt jeszcze raz z KPI-Tracker." });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (body.action === "setup") setup(ss, body.schema, body.entries);
    else if (body.action === "upsert") upsert(ss, body.schema, body.entry);
    else if (body.action === "delete") removeRow(ss, body.area, body.id);
    else return reply({ ok: false, error: "Nieznana akcja: " + body.action });
    return reply({ ok: true, name: ss.getName() });
  } catch (err) {
    return reply({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return reply({ ok: true, info: "KPI-Tracker: skrypt działa." });
}

function reply(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheetFor(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function columnsFor(schema, area) {
  var fields = schema.fields[area].map(function (f) { return [f.key, f.label + " (" + f.unit + ")"]; });
  return META.concat(fields, TAIL);
}

/** Zakładka z danymi: nagłówki z aplikacji, kolumny dat jako tekst (RRRR-MM-DD), żeby się nie przestawiały. */
function rawSheet(ss, schema, area) {
  var sh = sheetFor(ss, RAW[area]);
  var cols = columnsFor(schema, area);
  sh.getRange(1, 1, 1, cols.length).setValues([cols.map(function (c) { return c[1]; })]).setFontWeight("bold");
  sh.setFrozenRows(1);
  sh.getRange(2, 1, sh.getMaxRows() - 1, MONTH_COL).setNumberFormat("@");
  return { sh: sh, cols: cols };
}

function toRow(cols, entry) {
  return cols.map(function (c) {
    var k = c[0];
    if (entry.values && Object.prototype.hasOwnProperty.call(entry.values, k)) return entry.values[k];
    return entry[k] === undefined || entry[k] === null ? "" : entry[k];
  });
}

function findRow(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function upsert(ss, schema, entry) {
  var r = rawSheet(ss, schema, entry.area);
  var row = toRow(r.cols, entry);
  var at = findRow(r.sh, entry.id);
  if (at < 0) at = r.sh.getLastRow() + 1;
  r.sh.getRange(at, 1, 1, row.length).setValues([row]);
}

function removeRow(ss, area, id) {
  var sh = ss.getSheetByName(RAW[area]);
  if (!sh) return;
  var at = findRow(sh, id);
  if (at > 0) sh.deleteRow(at);
}

/** Pełna synchronizacja: przepisuje dane i od nowa buduje zakładki z formułami. */
function setup(ss, schema, entries) {
  AREAS.forEach(function (area) {
    var r = rawSheet(ss, schema, area);
    var last = r.sh.getLastRow();
    if (last > 1) r.sh.getRange(2, 1, last - 1, r.sh.getMaxColumns()).clearContent();
    var rows = entries.filter(function (e) { return e.area === area; }).map(function (e) { return toRow(r.cols, e); });
    if (rows.length) r.sh.getRange(2, 1, rows.length, r.cols.length).setValues(rows);
  });
  buildAggregate(ss, schema, "Tygodniowo", WEEK_COL, "Tydzień (od pon.)");
  buildAggregate(ss, schema, "Miesięcznie", MONTH_COL, "Miesiąc");
  buildSummary(ss, schema);
  ["Arkusz1", "Sheet1"].forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
}

function letter(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function q(name) {
  return "'" + name + "'";
}

/** Kolumny pól w zakładkach z formułami: wszystkie obszary po kolei. */
function aggFields(schema) {
  var out = [];
  AREAS.forEach(function (area) {
    schema.fields[area].forEach(function (f, i) {
      out.push({ key: f.key, label: f.label + " (" + f.unit + ")", area: area, rawCol: FIRST_FIELD_COL + i });
    });
  });
  return out;
}

/**
 * Wiersz na tydzień / miesiąc (najnowszy na górze). Pola: SUMIF po zakładkach z danymi.
 * Wskaźniki: (suma pól) / (suma pól) × mnożnik, puste przy dzieleniu przez zero — jak w aplikacji.
 */
function buildAggregate(ss, schema, name, periodCol, periodLabel) {
  var sh = sheetFor(ss, name);
  sh.clear();
  var fields = aggFields(schema);
  var headers = [periodLabel]
    .concat(fields.map(function (f) { return f.label; }))
    .concat(schema.metrics.map(function (m) { return m.label + " (" + m.unit + ")"; }));
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
  sh.setFrozenRows(1);
  sh.setFrozenColumns(1);

  var pc = letter(periodCol);
  var stack = AREAS.map(function (a) { return q(RAW[a]) + "!" + pc + "2:" + pc; }).join(";");
  sh.getRange("A2").setFormula("=IFERROR(SORT(UNIQUE(FILTER({" + stack + "},{" + stack + "}<>\"\")),1,FALSE),\"\")");

  var colOf = {};
  fields.forEach(function (f, i) {
    var c = letter(2 + i);
    colOf[f.key] = c;
    var src = q(RAW[f.area]) + "!";
    var rc = letter(f.rawCol);
    sh.getRange(c + "2").setFormula(
      "=ARRAYFORMULA(IF($A2:$A=\"\",,SUMIF(" + src + "$" + pc + "$2:$" + pc + ",$A2:$A," + src + rc + "$2:" + rc + ")))"
    );
  });

  schema.metrics.forEach(function (m, i) {
    var c = letter(2 + fields.length + i);
    var sum = function (keys) { return "(" + keys.map(function (k) { return colOf[k] + "2:" + colOf[k]; }).join("+") + ")"; };
    var expr = m.den.length
      ? "IFERROR(" + sum(m.num) + "/" + sum(m.den) + "*" + m.mult + ",\"\")"
      : sum(m.num) + "*" + m.mult;
    sh.getRange(c + "2").setFormula("=ARRAYFORMULA(IF($A2:$A=\"\",," + expr + "))");
    sh.getRange(c + "2:" + c).setNumberFormat("0.00");
  });
}

/** Ostatni okres z danymi obok poprzedniego, dla tygodni i miesięcy. */
function buildSummary(ss, schema) {
  var sh = sheetFor(ss, "Podsumowanie");
  sh.clear();
  var labels = aggFields(schema).map(function (f) { return f.label; })
    .concat(schema.metrics.map(function (m) { return m.label + " (" + m.unit + ")"; }));
  sh.getRange(1, 1, 1, 7).setValues([["Pozycja", "Ostatni tydzień", "Poprzedni tydzień", "Zmiana", "Ostatni miesiąc", "Poprzedni miesiąc", "Zmiana"]]).setFontWeight("bold");
  var W = q("Tygodniowo") + "!", M = q("Miesięcznie") + "!";
  sh.getRange(2, 1, 1, 7).setFormulas([[
    "=\"Okres\"",
    "=IFERROR(INDEX(" + W + "A:A,2),\"\")", "=IFERROR(INDEX(" + W + "A:A,3),\"\")", "=\"\"",
    "=IFERROR(INDEX(" + M + "A:A,2),\"\")", "=IFERROR(INDEX(" + M + "A:A,3),\"\")", "=\"\"",
  ]]);
  var rows = labels.map(function (label, i) {
    var c = letter(2 + i), r = 3 + i;
    return [
      "=\"" + label.replace(/"/g, "\"\"") + "\"",
      "=IFERROR(INDEX(" + W + c + ":" + c + ",2),\"\")", "=IFERROR(INDEX(" + W + c + ":" + c + ",3),\"\")", "=IFERROR(B" + r + "/C" + r + "-1,\"\")",
      "=IFERROR(INDEX(" + M + c + ":" + c + ",2),\"\")", "=IFERROR(INDEX(" + M + c + ":" + c + ",3),\"\")", "=IFERROR(E" + r + "/F" + r + "-1,\"\")",
    ];
  });
  sh.getRange(3, 1, rows.length, 7).setFormulas(rows);
  sh.getRange(3, 2, rows.length, 2).setNumberFormat("0.00");
  sh.getRange(3, 5, rows.length, 2).setNumberFormat("0.00");
  sh.getRange(3, 4, rows.length, 1).setNumberFormat("0.0%");
  sh.getRange(3, 7, rows.length, 1).setNumberFormat("0.0%");
  sh.setFrozenRows(2);
  sh.setFrozenColumns(1);
}
`;

/** Kod skryptu z tajnym kluczem danego klienta. */
export function appsScriptSource(secret: string): string {
  return SOURCE.replace("__SECRET__", secret);
}

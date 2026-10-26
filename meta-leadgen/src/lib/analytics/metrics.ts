export type Totals = {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  bookings: number;
};

export type Metrics = Totals & {
  cpl: number | null; // koszt leada
  cpb: number | null; // koszt umówionego spotkania
  ctr: number | null; // % CTR (link)
  cpm: number | null;
  cpc: number | null;
  optinRate: number | null; // % kliknięć, które zostawiły kontakt
  bookingRate: number | null; // % leadów, które umówiły spotkanie
};

export const emptyTotals = (): Totals => ({ spend: 0, impressions: 0, clicks: 0, leads: 0, bookings: 0 });

export function addInto(target: Totals, row: Totals): Totals {
  target.spend += row.spend;
  target.impressions += row.impressions;
  target.clicks += row.clicks;
  target.leads += row.leads;
  target.bookings += row.bookings;
  return target;
}

export function sumTotals(rows: Totals[]): Totals {
  return rows.reduce((acc, r) => addInto(acc, r), emptyTotals());
}

const ratio = (a: number, b: number, k = 1) => (b > 0 ? (a / b) * k : null);

export function derive(t: Totals): Metrics {
  return {
    ...t,
    cpl: ratio(t.spend, t.leads),
    cpb: ratio(t.spend, t.bookings),
    ctr: ratio(t.clicks, t.impressions, 100),
    cpm: ratio(t.spend, t.impressions, 1000),
    cpc: ratio(t.spend, t.clicks),
    optinRate: ratio(t.leads, t.clicks, 100),
    bookingRate: ratio(t.bookings, t.leads, 100),
  };
}

// Zmiana procentowa; null gdy brak bazy do porównania.
export function change(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

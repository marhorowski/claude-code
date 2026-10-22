export type KpiStatus = "GOD" | "GREEN" | "ORANGE" | "RED";

export function getKpiStatus(
  value: number,
  target: number,
  lowerIsBetter = false
): KpiStatus {
  if (target === 0) return "GREEN";

  const ratio = value / target;

  if (lowerIsBetter) {
    if (ratio <= 0.8) return "GOD";     // ≤ 80% celu = 125% efektywności
    if (ratio <= 1.11) return "GREEN";  // ≤ 111% = ≥ 90% efektywności
    if (ratio <= 1.67) return "ORANGE"; // ≤ 167% = ≥ 60% efektywności
    return "RED";
  } else {
    if (ratio >= 1.25) return "GOD";    // ≥ 125% celu
    if (ratio >= 0.9) return "GREEN";   // ≥ 90% celu
    if (ratio >= 0.6) return "ORANGE";  // ≥ 60% celu
    return "RED";
  }
}

export function getStatusColor(status: KpiStatus): string {
  switch (status) {
    case "GOD":    return "#EAB308";
    case "GREEN":  return "#22C55E";
    case "ORANGE": return "#F97316";
    case "RED":    return "#EF4444";
  }
}

export function getStatusBg(status: KpiStatus): string {
  switch (status) {
    case "GOD":    return "bg-yellow-500/20 border-yellow-500/40";
    case "GREEN":  return "bg-green-500/20 border-green-500/40";
    case "ORANGE": return "bg-orange-500/20 border-orange-500/40";
    case "RED":    return "bg-red-500/20 border-red-500/40";
  }
}

export function getStatusLabel(status: KpiStatus): string {
  switch (status) {
    case "GOD":    return "GOD MODE 🥇";
    case "GREEN":  return "Na torze 🟢";
    case "ORANGE": return "Poniżej planu 🟠";
    case "RED":    return "Krytyczny 🔴";
  }
}

// --- Closing ---
export function calcSUR(attended: number, planned: number): number {
  if (planned === 0) return 0;
  return (attended / planned) * 100;
}

export function calcCP(closings: number, attended: number): number {
  if (attended === 0) return 0;
  return (closings / attended) * 100;
}

// closings = pierwsze domknięcia + domknięcia z follow-upów
export function calcTotalClosings(closings: number, followUpClosings: number): number {
  return closings + followUpClosings;
}

// --- Setting ---
export function calcPickupRate(conductedCalls: number, callsMade: number): number {
  if (callsMade === 0) return 0;
  return (conductedCalls / callsMade) * 100;
}

export function calcBookingRate(booked: number, calls: number): number {
  if (calls === 0) return 0;
  return (booked / calls) * 100;
}

// --- Marketing ---
export function calcCPM(adSpend: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (adSpend / impressions) * 1000;
}

export function calcCTR(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

export function calcCPC(adSpend: number, clicks: number): number {
  if (clicks === 0) return 0;
  return adSpend / clicks;
}

export function calcCPL(adSpend: number, leads: number): number {
  if (leads === 0) return 0;
  return adSpend / leads;
}

export function calcVslBookingRate(vslBooked: number, leads: number): number {
  if (leads === 0) return 0;
  return (vslBooked / leads) * 100;
}

export function calcCostPerCallMarketing(adSpend: number, vslBooked: number): number {
  if (vslBooked === 0) return 0;
  return adSpend / vslBooked;
}

// --- Cross-department ---
export function calcCombinedBookingRate(meetingsBooked: number, vslBooked: number, leads: number): number {
  if (leads === 0) return 0;
  return ((meetingsBooked + vslBooked) / leads) * 100;
}

export function calcLeadToCloseRate(closings: number, followUpClosings: number, leads: number): number {
  if (leads === 0) return 0;
  return ((closings + followUpClosings) / leads) * 100;
}

export function calcTotalCostPerCall(adSpend: number, meetingsBooked: number, vslBooked: number): number {
  const totalCalls = meetingsBooked + vslBooked;
  if (totalCalls === 0) return 0;
  return adSpend / totalCalls;
}

// --- Legacy ---
export function calcLTS(closings: number, leads: number): number {
  if (leads === 0) return 0;
  return (closings / leads) * 100;
}

export function isOnTrack(
  currentRevenue: number,
  weeklyTarget: number,
  weekStart: Date,
  now: Date = new Date()
): boolean {
  const dayOfWeek = now.getDay();
  const adjustedDay = dayOfWeek === 0 ? 5 : Math.min(dayOfWeek, 5);
  const workedDays = Math.max(0, adjustedDay);
  const expectedProgress = workedDays / 5;
  const actualProgress = weeklyTarget > 0 ? currentRevenue / weeklyTarget : 0;
  return actualProgress >= expectedProgress;
}

export function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 -
      3 +
      ((week1.getDay() + 6) % 7)) /
      7
  ) + 1;
  return { week, year: d.getFullYear() };
}

export function getWeekBounds(weekNumber: number, year: number): { start: Date; end: Date } {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - jan4Day);

  const weekStart = new Date(week1Start);
  weekStart.setDate(week1Start.getDate() + (weekNumber - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { start: weekStart, end: weekEnd };
}

export function getQuarterFromMonth(month: number): number {
  return Math.ceil(month / 3);
}

export function getMonthsForQuarter(quarter: number): number[] {
  return [(quarter - 1) * 3 + 1, (quarter - 1) * 3 + 2, quarter * 3];
}

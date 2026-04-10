export type KpiStatus = "GOD" | "GREEN" | "ORANGE" | "RED";

export function getKpiStatus(
  value: number,
  target: number,
  lowerIsBetter = false
): KpiStatus {
  if (target === 0) return "GREEN";

  const ratio = value / target;

  if (lowerIsBetter) {
    if (ratio <= 0.5) return "GOD";
    if (ratio <= 1) return "GREEN";
    if (ratio <= 1.5) return "ORANGE";
    return "RED";
  } else {
    if (ratio >= 1.5) return "GOD";
    if (ratio >= 1) return "GREEN";
    if (ratio >= 0.5) return "ORANGE";
    return "RED";
  }
}

export function getStatusColor(status: KpiStatus): string {
  switch (status) {
    case "GOD":
      return "#EAB308";
    case "GREEN":
      return "#22C55E";
    case "ORANGE":
      return "#F97316";
    case "RED":
      return "#EF4444";
  }
}

export function getStatusBg(status: KpiStatus): string {
  switch (status) {
    case "GOD":
      return "bg-yellow-500/20 border-yellow-500/40";
    case "GREEN":
      return "bg-green-500/20 border-green-500/40";
    case "ORANGE":
      return "bg-orange-500/20 border-orange-500/40";
    case "RED":
      return "bg-red-500/20 border-red-500/40";
  }
}

export function getStatusLabel(status: KpiStatus): string {
  switch (status) {
    case "GOD":
      return "GOD MODE 🥇";
    case "GREEN":
      return "Na torze 🟢";
    case "ORANGE":
      return "Poniżej planu 🟠";
    case "RED":
      return "Krytyczny 🔴";
  }
}

export function calcSUR(attended: number, planned: number): number {
  if (planned === 0) return 0;
  return (attended / planned) * 100;
}

export function calcCP(closings: number, attended: number): number {
  if (attended === 0) return 0;
  return (closings / attended) * 100;
}

export function calcLTS(closings: number, leads: number): number {
  if (leads === 0) return 0;
  return (closings / leads) * 100;
}

export function calcCPL(adSpend: number, leads: number): number {
  if (leads === 0) return 0;
  return adSpend / leads;
}

export function calcBookingRate(booked: number, calls: number): number {
  if (calls === 0) return 0;
  return (booked / calls) * 100;
}

export function isOnTrack(
  currentRevenue: number,
  weeklyTarget: number,
  weekStart: Date,
  now: Date = new Date()
): boolean {
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
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

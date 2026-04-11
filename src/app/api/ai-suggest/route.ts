import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { KNOWLEDGE_BASE } from "@/lib/knowledge";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "LIDER") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Brak klucza ANTHROPIC_API_KEY w zmiennych środowiskowych" }, { status: 500 });
  }

  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "Brak clientId" }, { status: 400 });

  // Fetch last 4 weeks of data
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const [dailyForms, weeklyForms, kpiTargets, salesSettings, existingBottlenecks] = await Promise.all([
    prisma.dailyForm.findMany({
      where: { clientId, date: { gte: fourWeeksAgo } },
      include: { user: true },
      orderBy: { date: "desc" },
    }),
    prisma.weeklyForm.findMany({
      where: { clientId },
      orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
      take: 8,
    }),
    prisma.kpiTarget.findMany({ where: { clientId } }),
    prisma.salesSettings.findFirst({ where: { clientId } }),
    prisma.bottleneck.findMany({
      where: { clientId, status: { not: "RESOLVED" } },
    }),
  ]);

  // Calculate aggregated metrics
  const totalPlanned = dailyForms.reduce((s, f) => s + (f.plannedMeetings ?? 0), 0);
  const totalAttended = dailyForms.reduce((s, f) => s + (f.attendedMeetings ?? 0), 0);
  const totalClosings = dailyForms.reduce((s, f) => s + (f.closings ?? 0), 0);
  const totalRevenue = dailyForms.reduce((s, f) => s + (f.revenue ?? 0), 0);
  const totalLeads = dailyForms.reduce((s, f) => s + (f.dailyLeads ?? 0), 0);
  const totalAdSpend = dailyForms.reduce((s, f) => s + (f.dailyAdSpend ?? 0), 0);
  const totalClicks = dailyForms.reduce((s, f) => s + (f.dailyClicks ?? 0), 0);
  const totalImpressions = dailyForms.reduce((s, f) => s + (f.dailyImpressions ?? 0), 0);
  const totalVsl = dailyForms.reduce((s, f) => s + (f.vslMeetingsBooked ?? 0), 0);

  const sur = totalPlanned > 0 ? (totalAttended / totalPlanned) * 100 : null;
  const cp = totalAttended > 0 ? (totalClosings / totalAttended) * 100 : null;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
  const cpl = totalLeads > 0 && totalAdSpend > 0 ? totalAdSpend / totalLeads : null;
  const cac = totalClosings > 0 && totalAdSpend > 0 ? totalAdSpend / totalClosings : null;
  const lts = totalLeads > 0 && totalClosings > 0 ? (totalClosings / totalLeads) * 100 : null;

  const recentWeekly = weeklyForms.slice(0, 4);
  const weeklyRevenue = recentWeekly.reduce((s, w) => s + w.totalRevenue, 0);
  const weeklyAdSpend = recentWeekly.reduce((s, w) => s + (w.adSpend ?? 0), 0);
  const roas = weeklyAdSpend > 0 ? weeklyRevenue / weeklyAdSpend : null;

  // Get targets
  const getTarget = (code: string) => kpiTargets.find(t => t.code === code)?.target;

  const dataContext = `
## Dane klienta — ostatnie 28 dni

### Wskaźniki sprzedażowe:
- SUR (Show Up Rate): ${sur !== null ? sur.toFixed(1) + "%" : "brak danych"} | Cel: ${getTarget("SUR") ?? 90}%
- CP (Closing %): ${cp !== null ? cp.toFixed(1) + "%" : "brak danych"} | Cel: ${getTarget("CP") ?? 75}%
- Zamknięcia: ${totalClosings}
- Przychód: ${totalRevenue.toLocaleString("pl-PL")} PLN

### Wskaźniki marketingowe:
- CTR: ${ctr !== null ? ctr.toFixed(2) + "%" : "brak danych"} | Standard: 3%
- CPL (Koszt/lead): ${cpl !== null ? cpl.toFixed(0) + " PLN" : "brak danych"} | Standard: ~12 PLN
- Ilość leadów: ${totalLeads}
- Wyświetlenia reklamy: ${totalImpressions}
- Kliknięcia: ${totalClicks}
- Zapisy VSL: ${totalVsl}
- Ad Spend: ${totalAdSpend.toLocaleString("pl-PL")} PLN
- ROAS: ${roas !== null ? roas.toFixed(2) + "x" : "brak danych"} | Standard: 2x

### Wskaźniki finansowe:
- CAC: ${cac !== null ? cac.toFixed(0) + " PLN" : "brak danych"}
- LTS (Lead to Sale): ${lts !== null ? lts.toFixed(2) + "%" : "brak danych"} | Standard: 1%

### Ustawienia sprzedaży:
- Deal size: ${salesSettings?.dealSize ?? 0} PLN
- Lead → spotkanie: ${salesSettings?.leadToMeetingRate ?? 0}%

### Istniejące aktywne bottlenecki:
${existingBottlenecks.map(b => `- [${b.kpiCode}] ${b.title}`).join("\n") || "Brak"}
`;

  const prompt = `Jesteś ekspertem od analizy KPI dla biznesów opartych na generowaniu leadów i sprzedaży. Przeanalizuj poniższe dane i wygeneruj listę bottlenecków (wąskich gardeł) do naprawy.

${dataContext}

## Baza wiedzy (SOPy i standardy):
${KNOWLEDGE_BASE}

## Zadanie:
Na podstawie danych powyżej zidentyfikuj maksymalnie 3 najważniejsze bottlenecki, które wymagają uwagi. Skup się na wskaźnikach, które są poniżej standardu lub wykazują problemy.

Dla każdego bottlenecku wygeneruj konkretne zadania na ten tydzień (NIE ogólne porady — konkretne działania do wdrożenia).

Odpowiedz WYŁĄCZNIE w formacie JSON (bez markdown, bez dodatkowego tekstu):
{
  "suggestions": [
    {
      "kpiCode": "KOD_KPI",
      "title": "Krótki tytuł problemu (max 60 znaków)",
      "description": "Opis problemu z danymi (2-3 zdania, odwołaj się do konkretnych liczb z danych)",
      "actions": ["Konkretne zadanie 1 na ten tydzień", "Konkretne zadanie 2 na ten tydzień", "Konkretne zadanie 3 na ten tydzień"]
    }
  ]
}

Jeśli wszystkie wskaźniki są dobre, zwróć: {"suggestions": []}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Nieprawidłowa odpowiedź AI");

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("AI suggest error:", err);
    return NextResponse.json({ error: err.message || "Błąd AI" }, { status: 500 });
  }
}

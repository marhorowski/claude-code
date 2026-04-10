import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * KPI Standards — 26 Keys Reference Values
 * Based on universal business benchmarks.
 * Grading: Red < 50% | Orange 50-99% | Green 100-149% | God Mode 150%+
 * INVERTED metrics: lower is better (grading reversed)
 */
const ALL_KPI_TARGETS = [
  // ═══════════════════════════════════════════════
  // FINANCE — Universal
  // ═══════════════════════════════════════════════
  {
    code: "ROAS",
    label: "ROAS — Return on Ad Spend",
    target: 2,
    unit: "x",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Finance",
    note: "Paid Lead Gen & Liquidated. Dla Organic zastąp przez ROTI",
  },
  {
    code: "GP",
    label: "GP — Gross Profit Margin",
    target: 65,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Finance",
  },
  {
    code: "LTV_CAC",
    label: "LTV:CAC — Lifetime Value to CAC Ratio",
    target: 4,
    unit: ":1",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Finance",
  },
  {
    code: "LTV",
    label: "LTV — Lifetime Value",
    target: 0,
    unit: "PLN",
    period: "QUARTERLY",
    lowerIsBetter: false,
    category: "Finance",
    note: "Model-dependent: Low-ticket, Mid-ticket coaching, High-ticket",
  },
  {
    code: "ALPVC",
    label: "ALPVC — Avg Lifetime Profit per Client",
    target: 0,
    unit: "PLN",
    period: "QUARTERLY",
    lowerIsBetter: false,
    category: "Finance",
    note: "GP% × AOV × avg purchases × retention",
  },
  {
    code: "CAC",
    label: "CAC — Customer Acquisition Cost",
    target: 0,
    unit: "PLN",
    period: "MONTHLY",
    lowerIsBetter: true,
    category: "Finance",
    note: "Model-dependent. Cel: poniżej 25% AOV",
  },
  {
    code: "RPE",
    label: "RPE — Revenue Per Employee",
    target: 0,
    unit: "PLN",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Finance",
    note: "Model-dependent. Solo: 100-500K / Mały team: 150-400K/os",
  },

  // ═══════════════════════════════════════════════
  // SALES — Universal (Inbound)
  // ═══════════════════════════════════════════════
  {
    code: "SUR",
    label: "SUR — Show Up Rate",
    target: 90,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Sales",
    note: "Inbound standard: 90%. Outbound: 70%",
  },
  {
    code: "CP",
    label: "CP — Closing Percentage",
    target: 60,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Sales",
    note: "Inbound standard: 60%. Outbound: 30%",
  },
  {
    code: "ATTS",
    label: "ATTS — Avg Time to Sale",
    target: 30,
    unit: "dni",
    period: "MONTHLY",
    lowerIsBetter: true,
    category: "Sales",
    note: "Inbound: 30 dni. Outbound: 60 dni. God Mode Inbound: poniżej 15 dni",
  },

  // ═══════════════════════════════════════════════
  // OPERATIONS — Universal
  // ═══════════════════════════════════════════════
  {
    code: "RR",
    label: "RR — Refund Rate",
    target: 0.5,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: true,
    category: "Operations",
    note: "God Mode: poniżej 0.20%",
  },
  {
    code: "DR",
    label: "DR — Dispute / Chargeback Rate",
    target: 0.1,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: true,
    category: "Operations",
    note: "Powyżej 1% = ryzyko utraty procesora płatności!",
  },

  // ═══════════════════════════════════════════════
  // MARKETING — Paid Lead Gen
  // ═══════════════════════════════════════════════
  {
    code: "MER",
    label: "MER — Marketing Efficiency Ratio",
    target: 3,
    unit: "x",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Paid Lead Gen",
    note: "Przychód ÷ całkowity spend marketingowy",
  },
  {
    code: "CPM",
    label: "CPM — Cost per 1000 Impressions",
    target: 50,
    unit: "$",
    period: "WEEKLY",
    lowerIsBetter: true,
    category: "Paid Lead Gen",
    note: "God Mode: poniżej $25",
  },
  {
    code: "CTR",
    label: "CTR — Click-Through Rate",
    target: 3,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Paid Lead Gen",
  },
  {
    code: "CPLC",
    label: "CPLC — Cost per Link Click",
    target: 3,
    unit: "$",
    period: "WEEKLY",
    lowerIsBetter: true,
    category: "Paid Lead Gen",
    note: "God Mode: poniżej $1.50",
  },
  {
    code: "OIR",
    label: "OIR — Opt-In Rate",
    target: 25,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Paid Lead Gen",
  },
  {
    code: "CPL",
    label: "CPL — Cost per Lead",
    target: 40,
    unit: "PLN",
    period: "WEEKLY",
    lowerIsBetter: true,
    category: "Paid Lead Gen",
    note: "Standard USD: $10. God Mode USD: poniżej $5",
  },
  {
    code: "EOR",
    label: "EOR — Email Open Rate",
    target: 25,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Paid Lead Gen",
    note: "Sekwencja nurturująca",
  },
  {
    code: "ECR",
    label: "ECR — Email Click Rate",
    target: 3,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Paid Lead Gen",
  },
  {
    code: "APLR",
    label: "APLR — Application / Book Rate",
    target: 5,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Paid Lead Gen",
    note: "Leady które bookują rozmowę",
  },
  {
    code: "LTS",
    label: "LTS — Lead to Sale",
    target: 1,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Paid Lead Gen",
    note: "God Mode: 1.5%+. Organic standard: 2%",
  },
  {
    code: "AOV",
    label: "AOV — Average Order Value",
    target: 0,
    unit: "PLN",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Paid Lead Gen",
    note: "Model-dependent",
  },
  {
    code: "AR",
    label: "AR — Ascension Rate",
    target: 5,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Paid Lead Gen",
    note: "Klienci front-end którzy kupują backend",
  },

  // ═══════════════════════════════════════════════
  // MARKETING — Liquidated funnel
  // ═══════════════════════════════════════════════
  {
    code: "CVR",
    label: "CVR — Conversion Rate (Sales Page)",
    target: 5,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Liquidated",
  },
  {
    code: "CAR",
    label: "CAR — Cart Abandonment Rate",
    target: 50,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: true,
    category: "Liquidated",
    note: "God Mode: poniżej 30%",
  },
  {
    code: "BTR",
    label: "BTR — Bump Take Rate",
    target: 50,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Liquidated",
  },
  {
    code: "OTOTR",
    label: "OTOTR — One-Time Offer Take Rate",
    target: 30,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Liquidated",
  },

  // ═══════════════════════════════════════════════
  // MARKETING — Organic (Universal)
  // ═══════════════════════════════════════════════
  {
    code: "ROTI",
    label: "ROTI — Return on Time Invested",
    target: 100,
    unit: "PLN/h",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Organic",
    note: "Przychód ÷ godziny marketingowe. God Mode: 200+ PLN/h",
  },
  {
    code: "TER",
    label: "TER — Time Efficiency Ratio",
    target: 1,
    unit: "x",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Organic",
    note: "ROTI ÷ target hourly rate",
  },
  {
    code: "TAC",
    label: "TAC — Time to Acquire Client",
    target: 20,
    unit: "h",
    period: "MONTHLY",
    lowerIsBetter: true,
    category: "Organic",
    note: "God Mode: poniżej 10h",
  },
  {
    code: "RRC",
    label: "RRC — Referral Rate",
    target: 20,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Organic",
  },

  // ═══════════════════════════════════════════════
  // MARKETING — Organic: Outbound DM
  // ═══════════════════════════════════════════════
  {
    code: "DMVOL",
    label: "DMVOL — DM Volume / tydzień",
    target: 25,
    unit: "szt",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic DM",
  },
  {
    code: "DMOPR",
    label: "DMOPR — Open / Accept Rate",
    target: 30,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic DM",
    note: "Outbound: 30%. Inbound: 50%",
  },
  {
    code: "DMTRR",
    label: "DMTRR — Transition Rate",
    target: 40,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic DM",
  },
  {
    code: "DMDCR",
    label: "DMDCR — Discovery Rate",
    target: 50,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic DM",
  },
  {
    code: "DMBCR",
    label: "DMBCR — Book Call Rate",
    target: 30,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic DM",
    note: "Outbound: 30%. Inbound: 50%",
  },

  // ═══════════════════════════════════════════════
  // MARKETING — Organic: Cold Email
  // ═══════════════════════════════════════════════
  {
    code: "EVOL",
    label: "EVOL — Email Volume / tydzień",
    target: 25,
    unit: "szt",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic Email",
    note: "Mode A High-Touch: 10-40/tydzień. Mode B Auto: 200-400/miesiąc",
  },
  {
    code: "ERR",
    label: "ERR — Email Reply Rate",
    target: 5,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic Email",
    note: "Mode A: 5%. Mode B Automated: 2%",
  },
  {
    code: "EQR",
    label: "EQR — Email Qualification Rate",
    target: 40,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic Email",
    note: "Mode A: 40%. Mode B: 30%",
  },
  {
    code: "EBCR",
    label: "EBCR — Email Book Call Rate",
    target: 50,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic Email",
    note: "Mode A: 50%. Mode B: 40%",
  },
  {
    code: "EDELR",
    label: "EDELR — Email Deliverability Rate",
    target: 98,
    unit: "%",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic Email",
    note: "Mode A: 98%. Mode B: 95%. Poniżej 80% = krytyczne",
  },

  // ═══════════════════════════════════════════════
  // MARKETING — Organic: Content
  // ═══════════════════════════════════════════════
  {
    code: "AUDG",
    label: "AUDG — Audience Growth Rate",
    target: 5,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Organic Content",
    note: "Miesięcznie",
  },
  {
    code: "ENGE",
    label: "ENGE — Engagement Rate",
    target: 3,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Organic Content",
  },
  {
    code: "CF",
    label: "CF — Content Frequency",
    target: 5,
    unit: "szt/tydz",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic Content",
    note: "Posty tygodniowo. God Mode: 8+",
  },
  {
    code: "IDMR",
    label: "IDMR — Inbound DM Rate",
    target: 0.5,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Organic Content",
    note: "% wielkości audience miesięcznie",
  },
  {
    code: "C2L",
    label: "C2L — Content to Lead Rate",
    target: 2,
    unit: "szt",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Organic Content",
    note: "Leady na opublikowany post",
  },
  {
    code: "CREF",
    label: "CREF — Content Referral Rate",
    target: 15,
    unit: "%",
    period: "MONTHLY",
    lowerIsBetter: false,
    category: "Organic Content",
  },

  // ═══════════════════════════════════════════════
  // SALES — Volumes (Weekly)
  // ═══════════════════════════════════════════════
  {
    code: "LEADS",
    label: "Liczba leadów",
    target: 0,
    unit: "szt",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Sales Volume",
    note: "Ustaw cel odpowiedni dla klienta",
  },
  {
    code: "MEETINGS_BOOKED",
    label: "Umówione spotkania",
    target: 0,
    unit: "szt",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Sales Volume",
  },
  {
    code: "MEETINGS_ATTENDED",
    label: "Odbyłe spotkania",
    target: 0,
    unit: "szt",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Sales Volume",
  },
  {
    code: "CLOSINGS",
    label: "Zamknięcia",
    target: 0,
    unit: "szt",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Sales Volume",
  },
  {
    code: "REVENUE",
    label: "Przychód zakontraktowany",
    target: 0,
    unit: "PLN",
    period: "WEEKLY",
    lowerIsBetter: false,
    category: "Sales Volume",
    note: "Ustaw cel tygodniowy klienta",
  },
];

async function main() {
  console.log("🌱 Seedowanie bazy danych — BLANK APP...\n");

  // Create default client template
  const client = await prisma.client.upsert({
    where: { id: "default-client" },
    update: {},
    create: {
      id: "default-client",
      name: "Mój Pierwszy Klient",
      strategy: "Paid Lead Gen",
    },
  });

  console.log(`✅ Klient szablonowy "${client.name}" utworzony.`);

  // Seed all KPI targets with universal standards
  let count = 0;
  for (const t of ALL_KPI_TARGETS) {
    const seedId = `kpi-${t.code.toLowerCase()}-${client.id}`;
    await prisma.kpiTarget.upsert({
      where: { id: seedId },
      update: { target: t.target, label: t.label },
      create: {
        id: seedId,
        clientId: client.id,
        code: t.code,
        label: t.label,
        target: t.target,
        unit: t.unit,
        period: t.period,
        lowerIsBetter: t.lowerIsBetter,
      },
    });
    count++;
  }

  console.log(`✅ ${count} KPI targets załadowanych (26 Keys standard).`);

  // NOTE: Brak danych historycznych — aplikacja jest pusta do zapełnienia
  console.log("✅ Aplikacja jest pusta — gotowa na wprowadzanie danych.");

  // Create admin user
  const adminPassword = await bcrypt.hash("Admin2026!", 12);
  const liderPassword = await bcrypt.hash("Lider2026!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@firma.pl" },
    update: {},
    create: {
      email: "admin@firma.pl",
      password: adminPassword,
      name: "Administrator",
      role: "ADMIN",
    },
  });

  const lider = await prisma.user.upsert({
    where: { email: "lider@firma.pl" },
    update: {},
    create: {
      email: "lider@firma.pl",
      password: liderPassword,
      name: "Lider Sprzedaży",
      role: "LIDER",
    },
  });

  // Assign client access
  await prisma.clientAccess.upsert({
    where: { userId_clientId: { userId: admin.id, clientId: client.id } },
    update: {},
    create: { userId: admin.id, clientId: client.id },
  });

  await prisma.clientAccess.upsert({
    where: { userId_clientId: { userId: lider.id, clientId: client.id } },
    update: {},
    create: { userId: lider.id, clientId: client.id },
  });

  console.log("✅ Użytkownicy utworzeni.");

  console.log("\n" + "=".repeat(60));
  console.log("🎉 SEEDOWANIE ZAKOŃCZONE — PUSTA APLIKACJA GOTOWA!");
  console.log("=".repeat(60));
  console.log("\n📋 DANE DO LOGOWANIA:");
  console.log("─".repeat(40));
  console.log("👤 ADMIN");
  console.log("   Email: admin@firma.pl");
  console.log("   Hasło: Admin2026!");
  console.log("");
  console.log("👤 LIDER SPRZEDAŻY");
  console.log("   Email: lider@firma.pl");
  console.log("   Hasło: Lider2026!");
  console.log("─".repeat(40));
  console.log("⚠️  ZMIEŃ HASŁA I NAZWĘ KLIENTA W USTAWIENIACH!");
  console.log("\n📌 Następne kroki:");
  console.log("   1. Zaloguj się jako Admin");
  console.log("   2. W Ustawienia → Klienci — edytuj nazwę klienta");
  console.log("   3. W Ustawienia → Cele KPI — ustaw cele dla klienta");
  console.log("   4. Dodaj użytkowników (closerów, setterów)");
  console.log("   5. Zacznij wpisywać dane w formularzach dziennych");
  console.log("=".repeat(60) + "\n");
}

main()
  .catch((e) => {
    console.error("❌ Błąd seedowania:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

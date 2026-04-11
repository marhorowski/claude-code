import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// One-time setup endpoint — seeds the database
// Protected by a secret token to prevent unauthorized access
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: "Nieautoryzowany dostęp" }, { status: 401 });
  }

  // Check if already seeded
  const existingUser = await prisma.user.findFirst();
  if (existingUser) {
    return NextResponse.json({ message: "Baza danych już jest skonfigurowana", status: "already_done" });
  }

  try {
    // Create default client
    const client = await prisma.client.create({
      data: {
        id: "default-client",
        name: "Mój Pierwszy Klient",
        strategy: "Paid Lead Gen",
      },
    });

    // All KPI targets
    const targets = [
      // Finance
      { code: "ROAS", label: "ROAS — Return on Ad Spend", target: 2, unit: "x", period: "MONTHLY", lowerIsBetter: false },
      { code: "GP", label: "GP — Gross Profit Margin", target: 65, unit: "%", period: "MONTHLY", lowerIsBetter: false },
      { code: "LTV_CAC", label: "LTV:CAC Ratio", target: 4, unit: ":1", period: "MONTHLY", lowerIsBetter: false },
      { code: "LTV", label: "LTV — Lifetime Value", target: 0, unit: "PLN", period: "QUARTERLY", lowerIsBetter: false },
      { code: "CAC", label: "CAC — Customer Acquisition Cost", target: 0, unit: "PLN", period: "MONTHLY", lowerIsBetter: true },
      { code: "RPE", label: "RPE — Revenue Per Employee", target: 0, unit: "PLN", period: "MONTHLY", lowerIsBetter: false },
      // Sales
      { code: "SUR", label: "SUR — Show Up Rate", target: 90, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "CP", label: "CP — Closing Percentage", target: 60, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "ATTS", label: "ATTS — Avg Time to Sale", target: 30, unit: "dni", period: "MONTHLY", lowerIsBetter: true },
      // Operations
      { code: "RR", label: "RR — Refund Rate", target: 0.5, unit: "%", period: "MONTHLY", lowerIsBetter: true },
      { code: "DR", label: "DR — Dispute / Chargeback Rate", target: 0.1, unit: "%", period: "MONTHLY", lowerIsBetter: true },
      // Paid Lead Gen
      { code: "MER", label: "MER — Marketing Efficiency Ratio", target: 3, unit: "x", period: "MONTHLY", lowerIsBetter: false },
      { code: "CPM", label: "CPM — Cost per 1000 Impressions", target: 50, unit: "$", period: "WEEKLY", lowerIsBetter: true },
      { code: "CTR", label: "CTR — Click-Through Rate", target: 3, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "CPLC", label: "CPLC — Cost per Link Click", target: 3, unit: "$", period: "WEEKLY", lowerIsBetter: true },
      { code: "OIR", label: "OIR — Opt-In Rate", target: 25, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "CPL", label: "CPL — Cost per Lead", target: 40, unit: "PLN", period: "WEEKLY", lowerIsBetter: true },
      { code: "EOR", label: "EOR — Email Open Rate", target: 25, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "ECR", label: "ECR — Email Click Rate", target: 3, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "APLR", label: "APLR — Application / Book Rate", target: 5, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "LTS", label: "LTS — Lead to Sale", target: 1, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "AOV", label: "AOV — Average Order Value", target: 0, unit: "PLN", period: "MONTHLY", lowerIsBetter: false },
      { code: "AR", label: "AR — Ascension Rate", target: 5, unit: "%", period: "MONTHLY", lowerIsBetter: false },
      // Liquidated
      { code: "CVR", label: "CVR — Conversion Rate (Sales Page)", target: 5, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "CAR", label: "CAR — Cart Abandonment Rate", target: 50, unit: "%", period: "MONTHLY", lowerIsBetter: true },
      { code: "BTR", label: "BTR — Bump Take Rate", target: 50, unit: "%", period: "MONTHLY", lowerIsBetter: false },
      { code: "OTOTR", label: "OTOTR — One-Time Offer Take Rate", target: 30, unit: "%", period: "MONTHLY", lowerIsBetter: false },
      // Organic
      { code: "ROTI", label: "ROTI — Return on Time Invested", target: 100, unit: "PLN/h", period: "MONTHLY", lowerIsBetter: false },
      { code: "TER", label: "TER — Time Efficiency Ratio", target: 1, unit: "x", period: "MONTHLY", lowerIsBetter: false },
      { code: "TAC", label: "TAC — Time to Acquire Client", target: 20, unit: "h", period: "MONTHLY", lowerIsBetter: true },
      { code: "RRC", label: "RRC — Referral Rate", target: 20, unit: "%", period: "MONTHLY", lowerIsBetter: false },
      // Organic DM
      { code: "DMVOL", label: "DMVOL — DM Volume / tydzień", target: 25, unit: "szt", period: "WEEKLY", lowerIsBetter: false },
      { code: "DMOPR", label: "DMOPR — Open / Accept Rate", target: 30, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "DMTRR", label: "DMTRR — Transition Rate", target: 40, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "DMDCR", label: "DMDCR — Discovery Rate", target: 50, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "DMBCR", label: "DMBCR — Book Call Rate", target: 30, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      // Organic Email
      { code: "EVOL", label: "EVOL — Email Volume / tydzień", target: 25, unit: "szt", period: "WEEKLY", lowerIsBetter: false },
      { code: "ERR", label: "ERR — Email Reply Rate", target: 5, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "EQR", label: "EQR — Email Qualification Rate", target: 40, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "EBCR", label: "EBCR — Email Book Call Rate", target: 50, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      { code: "EDELR", label: "EDELR — Email Deliverability Rate", target: 98, unit: "%", period: "WEEKLY", lowerIsBetter: false },
      // Organic Content
      { code: "AUDG", label: "AUDG — Audience Growth Rate", target: 5, unit: "%", period: "MONTHLY", lowerIsBetter: false },
      { code: "ENGE", label: "ENGE — Engagement Rate", target: 3, unit: "%", period: "MONTHLY", lowerIsBetter: false },
      { code: "CF", label: "CF — Content Frequency", target: 5, unit: "szt/tydz", period: "WEEKLY", lowerIsBetter: false },
      { code: "IDMR", label: "IDMR — Inbound DM Rate", target: 0.5, unit: "%", period: "MONTHLY", lowerIsBetter: false },
      { code: "C2L", label: "C2L — Content to Lead Rate", target: 2, unit: "szt", period: "WEEKLY", lowerIsBetter: false },
      { code: "CREF", label: "CREF — Content Referral Rate", target: 15, unit: "%", period: "MONTHLY", lowerIsBetter: false },
      // Sales Volume
      { code: "LEADS", label: "Liczba leadów", target: 0, unit: "szt", period: "WEEKLY", lowerIsBetter: false },
      { code: "MEETINGS_BOOKED", label: "Umówione spotkania", target: 0, unit: "szt", period: "WEEKLY", lowerIsBetter: false },
      { code: "MEETINGS_ATTENDED", label: "Odbyłe spotkania", target: 0, unit: "szt", period: "WEEKLY", lowerIsBetter: false },
      { code: "CLOSINGS", label: "Zamknięcia", target: 0, unit: "szt", period: "WEEKLY", lowerIsBetter: false },
      { code: "REVENUE", label: "Przychód zakontraktowany", target: 0, unit: "PLN", period: "WEEKLY", lowerIsBetter: false },
    ];

    for (const t of targets) {
      await prisma.kpiTarget.create({
        data: { clientId: client.id, ...t },
      });
    }

    // Create users
    const adminPassword = await bcrypt.hash("Admin2026!", 12);
    const liderPassword = await bcrypt.hash("Lider2026!", 12);

    const admin = await prisma.user.create({
      data: { email: "admin@firma.pl", password: adminPassword, name: "Administrator", role: "ADMIN" },
    });

    const lider = await prisma.user.create({
      data: { email: "lider@firma.pl", password: liderPassword, name: "Lider Sprzedaży", role: "LIDER" },
    });

    await prisma.clientAccess.create({ data: { userId: admin.id, clientId: client.id } });
    await prisma.clientAccess.create({ data: { userId: lider.id, clientId: client.id } });

    return NextResponse.json({
      success: true,
      message: "Baza danych skonfigurowana pomyślnie!",
      login: {
        admin: { email: "admin@firma.pl", haslo: "Admin2026!" },
        lider: { email: "lider@firma.pl", haslo: "Lider2026!" },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no-key" }, { status: 501 });
  }

  const body = await req.json();
  const client = new Anthropic({ apiKey });

  const prompt = `Jesteś brutalnie szczerym coachem wysokiej skuteczności. Twój podopieczny buduje agencję i prowadzi journal. Dostajesz jego odpowiedzi na pytania refleksyjne oraz twarde dane z aplikacji (czas skupionej pracy, ukończone zadania, "puls potencjału" — ile razy w ciągu dnia przyznał, że realizuje potencjał vs marnuje czas, nawyki).

Dane (JSON):
${JSON.stringify(body, null, 2)}

Napisz po polsku ocenę tego ${body.type === "week" ? "tygodnia" : "dnia"} (max 180 słów):
1. Zderz jego odpowiedzi z twardymi danymi — wskaż bez litości każdą niespójność i samooszukiwanie.
2. Doceń wyłącznie realny postęp (fakty, nie intencje).
3. Zakończ 2-3 konkretnymi rozkazami na ${body.type === "week" ? "następny tydzień" : "jutro"} — krótkie, wykonalne, mierzalne.
Ton: bezpośredni, ostry, ale w służbie zwycięstwa — nie poniżaj, pchaj do przodu. Zero coachingowego lania wody, zero komplementów na wyrost.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "api-error" }, { status: 502 });
  }
}

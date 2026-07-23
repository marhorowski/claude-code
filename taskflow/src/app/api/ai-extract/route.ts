import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

/**
 * Wyodrębnia zadania z dowolnego tekstu (dyktowanie / wklejona transkrypcja).
 * Zwraca [{ title, dueOffset, estimateMin }] — dueOffset to liczba dni od dziś
 * (0 = dziś, 1 = jutro, 7 = za tydzień, null = bez daty).
 */
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const body = await req.json();
  const text: string = (body.text ?? "").toString().slice(0, 8000);
  if (!text.trim()) return NextResponse.json({ tasks: [] });

  if (!apiKey) {
    // fallback bez klucza: rozbij po liniach / zdaniach
    return NextResponse.json({ tasks: heuristic(text) });
  }

  try {
    const client = new Anthropic({ apiKey });
    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Dziś jest ${today}. Poniżej jest zapis myśli / dyktowania / transkrypcji po polsku. Wyodrębnij z niego pojedyncze, konkretne zadania do zrobienia.

Tekst:
"""
${text}
"""

Zwróć WYŁĄCZNIE JSON w formacie:
{"tasks":[{"title":"...", "dueOffset": <liczba dni od dziś albo null>, "estimateMin": <szacowany czas w minutach albo null>}]}

Reguły:
- title: krótki, imperatywny (np. "Zadzwonić do księgowej"), po polsku.
- dueOffset: 0=dziś, 1=jutro, 2..=za tyle dni. "w tym tygodniu"→dueOffset do najbliższego piątku. Jeśli brak terminu → null.
- estimateMin: jeśli w tekście jest sugestia czasu lub da się rozsądnie oszacować; inaczej null.
- Pomijaj rzeczy, które nie są zadaniami (dygresje, komentarze).
- Zwróć sam JSON, bez komentarza.`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.tasks)) {
        return NextResponse.json({ tasks: parsed.tasks });
      }
    }
    return NextResponse.json({ tasks: heuristic(text) });
  } catch {
    return NextResponse.json({ tasks: heuristic(text) });
  }
}

function heuristic(
  text: string
): { title: string; dueOffset: number | null; estimateMin: number | null }[] {
  return text
    .split(/[\n•\-–]|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && s.length < 200)
    .slice(0, 40)
    .map((s) => {
      let dueOffset: number | null = null;
      const low = s.toLowerCase();
      // uwaga: \b nie działa po polskich znakach (ś), więc bez granic słowa
      if (/pojutrze/.test(low)) dueOffset = 2;
      else if (/jutro/.test(low)) dueOffset = 1;
      else if (/dziś|dzisiaj/.test(low)) dueOffset = 0;
      else if (/w tym tygodniu|ten tydzie|w tygodniu/.test(low)) dueOffset = 3;
      const estMatch = low.match(/(\d+)\s*(min|minut)/);
      const hMatch = low.match(/(\d+)\s*(h|godz)/);
      const estimateMin = estMatch
        ? Number(estMatch[1])
        : hMatch
        ? Number(hMatch[1]) * 60
        : null;
      return {
        title: s.replace(/^\W+/, "").slice(0, 120),
        dueOffset,
        estimateMin,
      };
    });
}

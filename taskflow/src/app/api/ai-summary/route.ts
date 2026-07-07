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

  const prompt = `Jesteś asystentem produktywności. Użytkownik kończy dzień pracy. Dane dnia (JSON):
${JSON.stringify(body, null, 2)}

Napisz po polsku krótkie podsumowanie dnia (max 120 słów): 1) ile przepracował i co ukończył, 2) jedna konkretna obserwacja (np. estymacje vs rzeczywisty czas), 3) 1-2 praktyczne wytyczne na jutro. Ton: ciepły, konkretny, bez lania wody.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: "api-error" }, { status: 502 });
  }
}

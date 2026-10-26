import { NextResponse } from "next/server";
import { syncClient } from "@/lib/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await syncClient(params.id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { checkBasicAuth } from "@/lib/auth";

export function middleware(req: NextRequest) {
  if (checkBasicAuth(req.headers.get("authorization"), process.env.ADMIN_PASSWORD)) return NextResponse.next();
  return new NextResponse("Wymagane logowanie", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Panel", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/panel/:path*"] };

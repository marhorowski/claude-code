import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "lg_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET musi mieć min. 32 znaki.");
  return new TextEncoder().encode(s);
}

export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const value = await new SignJWT({ role: "team" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  return { value, maxAge: MAX_AGE };
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

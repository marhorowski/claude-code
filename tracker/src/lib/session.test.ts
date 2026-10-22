import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";
import { hashPassword, verifyPassword } from "./passwords";

const future = () => Math.floor(Date.now() / 1000) + 3600;

describe("sesja", () => {
  it("podpisana sesja wraca bez zmian", async () => {
    const s = { uid: "u1", role: "CLIENT" as const, cid: "c1", exp: future() };
    expect(await verifySession(await signSession(s))).toEqual(s);
  });

  it("odrzuca podrobioną, wygasłą i pustą sesję", async () => {
    const token = await signSession({ uid: "u1", role: "CLIENT", cid: "c1", exp: future() });
    const [, sig] = token.split(".");
    const forged = `${btoa(JSON.stringify({ uid: "u1", role: "ADMIN", cid: null, exp: future() }))}.${sig}`;
    expect(await verifySession(forged)).toBeNull();
    expect(await verifySession(await signSession({ uid: "u1", role: "ADMIN", cid: null, exp: 1 }))).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("smieci")).toBeNull();
  });
});

describe("hasła", () => {
  it("weryfikuje tylko poprawne hasło", async () => {
    const hash = await hashPassword("tajne-haslo");
    expect(hash).not.toContain("tajne-haslo");
    expect(await verifyPassword("tajne-haslo", hash)).toBe(true);
    expect(await verifyPassword("inne-haslo", hash)).toBe(false);
  });
});

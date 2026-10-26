// Minimalny klient Graph API: paginacja, ponawianie przy limitach, czytelne błędy.

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80000, 80003, 80004, 80014]);

export class MetaApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public subcode?: number,
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

export function metaToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new MetaApiError("Brak tokenu Meta. Ustaw zmienną META_ACCESS_TOKEN w Vercel.");
  return token;
}

function apiVersion(): string {
  return process.env.META_API_VERSION || "v23.0";
}

function friendlyMessage(code: number | undefined, subcode: number | undefined, raw: string): string {
  if (code === 190) return "Token Meta wygasł lub jest nieprawidłowy. Wygeneruj nowy token i podmień META_ACCESS_TOKEN.";
  if (code === 10 || code === 200 || (code !== undefined && code >= 200 && code < 300))
    return "Brak uprawnień do tego konta reklamowego. Sprawdź, czy token (System User) ma przypisane konto i uprawnienie ads_read.";
  if (code !== undefined && RATE_LIMIT_CODES.has(code))
    return "Meta chwilowo ogranicza liczbę zapytań do tego konta. Spróbuj ponownie za kilka minut.";
  if (code === 100 && subcode === 33) return "Konto reklamowe nie istnieje albo token nie ma do niego dostępu.";
  return `Błąd Meta API: ${raw}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Params = Record<string, string | number | boolean | object | undefined>;

function buildUrl(pathOrUrl: string, params: Params): string {
  if (pathOrUrl.startsWith("https://")) return pathOrUrl; // paging.next zawiera już wszystko
  const url = new URL(`https://graph.facebook.com/${apiVersion()}/${pathOrUrl.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return url.toString();
}

export async function graphGet<T = any>(pathOrUrl: string, params: Params = {}): Promise<T> {
  const url = buildUrl(pathOrUrl, params);
  const token = metaToken();
  let attempt = 0;
  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    } catch (e) {
      if (attempt++ < 3) {
        await sleep(2000 * 2 ** attempt);
        continue;
      }
      throw new MetaApiError(`Nie udało się połączyć z Meta API: ${(e as Error).message}`);
    }
    const body = await res.json().catch(() => ({}));
    if (res.ok && !body.error) return body as T;

    const err = body.error ?? {};
    const code: number | undefined = err.code;
    const retryable = res.status >= 500 || (code !== undefined && RATE_LIMIT_CODES.has(code)) || err.is_transient;
    if (retryable && attempt++ < 3) {
      await sleep(3000 * 2 ** attempt);
      continue;
    }
    throw new MetaApiError(friendlyMessage(code, err.error_subcode, err.message ?? `HTTP ${res.status}`), code, err.error_subcode);
  }
}

export async function graphGetAll<T = any>(path: string, params: Params = {}, maxPages = 200): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = path;
  let first = true;
  for (let page = 0; next && page < maxPages; page++) {
    const body: { data?: T[]; paging?: { next?: string } } = await graphGet(next, first ? params : {});
    first = false;
    out.push(...(body.data ?? []));
    next = body.paging?.next ?? null;
  }
  return out;
}

export type AdAccountInfo = {
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
  business?: { name: string };
};

const ACCOUNT_FIELDS = "account_id,name,currency,timezone_name,account_status,business{name}";

export async function testConnection() {
  const me = await graphGet<{ id: string; name: string }>("me", { fields: "id,name" });
  const accounts = await graphGetAll<AdAccountInfo>("me/adaccounts", { fields: ACCOUNT_FIELDS, limit: 200 });
  return { me, accounts };
}

export function normalizeAccountId(input: string): string {
  return input.trim().replace(/^act_/, "").replace(/\D/g, "");
}

export async function getAdAccount(accountId: string): Promise<AdAccountInfo> {
  return graphGet<AdAccountInfo>(`act_${normalizeAccountId(accountId)}`, { fields: ACCOUNT_FIELDS });
}

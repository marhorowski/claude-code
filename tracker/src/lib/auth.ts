// Tymczasowa ochrona panelu hasłem (login: admin) do etapu z kontami klientów.
export const ADMIN_USER = "admin";

export function checkBasicAuth(header: string | null, password: string | undefined): boolean {
  if (!password) return process.env.NODE_ENV !== "production";
  if (!header?.startsWith("Basic ")) return false;
  const decoded = atob(header.slice(6));
  const sep = decoded.indexOf(":");
  return decoded.slice(0, sep) === ADMIN_USER && decoded.slice(sep + 1) === password;
}

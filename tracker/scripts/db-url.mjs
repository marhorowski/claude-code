// Aplikacja trzyma swoje tabele w osobnym schemacie "tracker",
// żeby nie mieszać się z innymi aplikacjami podpiętymi do tej samej bazy Neon.
const SCHEMA = "tracker";

function withSchema(raw) {
  if (!raw) return undefined;
  const url = new URL(raw);
  url.searchParams.set("schema", SCHEMA);
  return url.toString();
}

export function resolveDatabaseUrls(env = process.env) {
  const pooled =
    env.TRACKER_DATABASE_URL ??
    env.database_url_POSTGRES_PRISMA_URL ??
    env.POSTGRES_PRISMA_URL;
  const direct =
    env.TRACKER_DIRECT_URL ??
    env.database_url_POSTGRES_URL_NON_POOLING ??
    env.POSTGRES_URL_NON_POOLING ??
    pooled;
  return { url: withSchema(pooled), directUrl: withSchema(direct) };
}

export function applyDatabaseEnv(env = process.env) {
  const { url, directUrl } = resolveDatabaseUrls(env);
  if (url) env.TRACKER_DATABASE_URL = url;
  if (directUrl) env.TRACKER_DIRECT_URL = directUrl;
  return Boolean(url);
}

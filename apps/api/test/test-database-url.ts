const TEST_SUFFIX = "_test";

// Integration specs wipe tables: they must never reach the dev database. Without an explicit
// DATABASE_URL_TEST, the dev URL is reused with a "_test" database name.
export function resolveTestDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const devUrl = env.DATABASE_URL;
  const explicitUrl = env.DATABASE_URL_TEST;

  if (explicitUrl) {
    if (devUrl && databaseName(explicitUrl) === databaseName(devUrl) && sameServer(explicitUrl, devUrl)) {
      throw new Error("DATABASE_URL_TEST pointe sur la base de dev : les tests la videraient.");
    }
    return explicitUrl;
  }

  if (!devUrl) {
    throw new Error("DATABASE_URL (ou DATABASE_URL_TEST) doit etre defini pour les tests d'integration.");
  }

  const url = new URL(devUrl);
  const name = databaseName(devUrl);
  if (!name.endsWith(TEST_SUFFIX)) {
    url.pathname = `/${name}${TEST_SUFFIX}`;
  }
  return url.toString();
}

function databaseName(connectionString: string): string {
  return new URL(connectionString).pathname.replace(/^\//, "");
}

function sameServer(a: string, b: string): boolean {
  return new URL(a).host === new URL(b).host;
}

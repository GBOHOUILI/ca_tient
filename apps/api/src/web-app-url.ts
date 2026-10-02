const LOCAL_WEB_APP_URL = "http://localhost:3000";

// WEB_APP_URL may list several addresses of the web app, comma-separated (e.g. the custom domain
// and the Netlify address during a switch). All are allowed for CORS; the first one is where
// FedaPay sends the user back after paying.
export function corsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const urls = (env.WEB_APP_URL ?? "")
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return urls.length > 0 ? urls : [LOCAL_WEB_APP_URL];
}

export function primaryWebAppUrl(env: NodeJS.ProcessEnv = process.env): string {
  return corsOrigins(env)[0];
}

let csrfToken: string | null = null;
let csrfFetchedAt = 0;
const CSRF_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchCsrf(basePath: string): Promise<string> {
  const res = await fetch(`${basePath}/csrf`, { method: "GET", headers: { "accept": "application/json" } });
  if (!res.ok) throw new Error(`csrf_fetch_failed:${res.status}`);
  const data = (await res.json()) as { csrfToken?: string };
  if (!data?.csrfToken) throw new Error("csrf_missing_token");
  csrfToken = data.csrfToken;
  csrfFetchedAt = Date.now();
  return csrfToken;
}

export async function ensureCsrf(basePath = "/api/auth"): Promise<string> {
  if (csrfToken && Date.now() - csrfFetchedAt < CSRF_TTL_MS) return csrfToken;
  return fetchCsrf(basePath);
}

export function invalidateCsrf() {
  csrfToken = null;
  csrfFetchedAt = 0;
}


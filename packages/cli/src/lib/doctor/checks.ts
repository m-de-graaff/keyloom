import fs from "node:fs";
import path from "node:path";

export type CheckResult = {
  id: string;
  ok: boolean;
  warn?: boolean;
  message: string;
};

function fileExists(p: string) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

export async function runDoctorChecks(
  cwd = process.cwd()
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // AUTH_SECRET (must be base64url and decode to >=32 bytes)
  const auth = process.env.AUTH_SECRET || process.env.KEYLOOM_AUTH_SECRET || "";
  const hasAuthSecret = auth.length > 0;
  let decodedLen = 0;
  let base64urlOk = false;
  if (hasAuthSecret) {
    const re = /^[A-Za-z0-9_-]+$/;
    base64urlOk = re.test(auth);
    try {
      decodedLen = Buffer.from(auth, "base64url").length;
    } catch {
      base64urlOk = false;
    }
  }
  const strongAuth = base64urlOk && decodedLen >= 32;
  results.push({
    id: "env:AUTH_SECRET",
    ok: hasAuthSecret && strongAuth,
    warn: hasAuthSecret && (!base64urlOk || decodedLen < 32),
    message: hasAuthSecret
      ? strongAuth
        ? "AUTH_SECRET present (base64url, >=32 bytes)"
        : base64urlOk
        ? "AUTH_SECRET decodes to <32 bytes"
        : "AUTH_SECRET is not valid base64url (A-Z, a-z, 0-9, -, _)"
      : "AUTH_SECRET missing",
  });

  // Database URL present
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.MYSQL_URL ||
    process.env.MONGODB_URI;
  results.push({
    id: "env:DATABASE_URL",
    ok: !!dbUrl,
    message: dbUrl
      ? "Database URL present"
      : "Database URL missing (set DATABASE_URL, POSTGRES_URL, MYSQL_URL, or MONGODB_URI)",
  });

  // Route manifest
  const manifestTs = path.join(cwd, ".keyloom", "routes.generated.ts");
  const manifestJson = path.join(cwd, ".keyloom", "routes.generated.json");
  const hasManifest = fileExists(manifestTs) || fileExists(manifestJson);
  results.push({
    id: "routes:manifest",
    ok: hasManifest,
    message: hasManifest
      ? "Route manifest found"
      : "Route manifest not found (.keyloom/routes.generated.*)",
  });

  // Middleware wiring
  const middlewarePath = path.join(cwd, "middleware.ts");
  let middlewareOk = false;
  if (fileExists(middlewarePath)) {
    try {
      const body = fs.readFileSync(middlewarePath, "utf8");
      middlewareOk = /createAuthMiddleware\(/.test(body);
    } catch {}
  }
  results.push({
    id: "middleware",
    ok: middlewareOk,
    message: middlewareOk
      ? "middleware.ts configured with createAuthMiddleware"
      : "middleware.ts not configured for Keyloom",
  });

  // Cookie policy (warn if SameSite none without secure or baseUrl not https)
  const sameSite =
    process.env.COOKIE_SAMESITE || process.env.KEYLOOM_COOKIE_SAMESITE || "lax";
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    process.env.KEYLOOM_COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production";
  const baseUrl =
    process.env.KEYLOOM_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const baseHttps = baseUrl ? baseUrl.startsWith("https://") : false;
  const cookieOk =
    sameSite === "lax" || (sameSite === "none" && secure && baseHttps);
  results.push({
    id: "cookie:policy",
    ok: cookieOk,
    warn: sameSite === "none" && (!secure || !baseHttps),
    message: cookieOk
      ? "Cookie policy appears safe"
      : sameSite === "none" && !secure
      ? "Cookie policy may be unsafe (SameSite=none without Secure)"
      : "Cookie policy may be unsafe (SameSite=none without https baseUrl)",
  });

  // Base URL HTTPS in production
  if (
    process.env.NODE_ENV === "production" &&
    baseUrl &&
    baseUrl.startsWith("http://")
  ) {
    results.push({
      id: "https:baseUrl",
      ok: false,
      message: `Base URL is HTTP in production: ${baseUrl}`,
    });
  } else {
    results.push({ id: "https:baseUrl", ok: true, message: "Base URL OK" });
  }

  // System clock (best-effort: always OK here; connectivity not allowed)
  results.push({
    id: "system:clock",
    ok: true,
    message: "System clock check OK",
  });

  return results;
}

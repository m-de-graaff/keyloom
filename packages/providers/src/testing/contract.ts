import type { OAuthProvider, Tokens } from "@keyloom/core/oauth/types";
import { lintProviderShape } from "../factory";

export type ProviderContractResult = {
  ok: boolean;
  errors: string[];
};

/**
 * Minimal contract test for a provider object shape.
 * Intended for use in user-land tests: expect(runProviderContract(provider).ok).toBe(true)
 */
export function runProviderContract(provider: OAuthProvider & Record<string, any>): ProviderContractResult {
  const { ok, errors } = lintProviderShape(provider);
  return { ok, errors };
}

/**
 * Utility to map OpenID-like userinfo to Keyloom Profile shape.
 */
export function mapOidcProfile(raw: any, _tokens: Tokens) {
  return {
    id: raw.sub ?? String(raw.id ?? ""),
    email: raw.email ?? null,
    name: raw.name ?? null,
    image: raw.picture ?? null,
    emailVerified: raw.email_verified ?? undefined,
  };
}

/**
 * A very small mock server for testing OAuth flows end-to-end.
 * For simplicity, it uses the Node HTTP module.
 */
export async function startMockOAuthServer(port = 9756) {
  const http = await import("node:http");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    if (url.pathname === "/authorize") {
      const redirectUri = url.searchParams.get("redirect_uri")!;
      const state = url.searchParams.get("state") || "state";
      const code = "mock_code";
      res.statusCode = 302;
      res.setHeader("location", `${redirectUri}?code=${code}&state=${encodeURIComponent(state)}`);
      res.end();
      return;
    }
    if (url.pathname === "/token" && req.method === "POST") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ access_token: "mock_access", token_type: "bearer", id_token: undefined }));
      return;
    }
    if (url.pathname === "/userinfo") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ sub: "u1", email: "user@example.com", name: "Test User", picture: null }));
      return;
    }
    res.statusCode = 404;
    res.end("not found");
  });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  return {
    url: `http://localhost:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}


import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createKeystore,
  exportPublicJwks,
  importPrivateKey,
  signJwtWithKey,
  newAccessClaims,
} from "@keyloom/core/jwt";
import { verifyJwtToken } from "./jwt-server";

// Simple helper to mock fetch
function mockFetchOnce(data: any, ok = true) {
  const json = async () => data;
  (globalThis as any).fetch = vi.fn().mockResolvedValue({ ok, json });
}

describe("nextjs/jwt-server verifyJwtToken", () => {
  const issuer = "https://example.com";
  const jwksUrl = `${issuer}/.well-known/jwks.json`;

  let kid: string;
  let jwks: any;
  let privKey: CryptoKey;

  beforeAll(async () => {
    const keystore = await createKeystore("EdDSA");
    kid = keystore.active.kid;
    jwks = exportPublicJwks(keystore);
    privKey = await importPrivateKey(keystore.active.privateJwk, "EdDSA");
  });

  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("verifies a valid token against JWKS", async () => {
    const claims = newAccessClaims({ iss: issuer, sub: "user-1", ttlSec: 600 });
    const token = await signJwtWithKey(claims, privKey, kid, "EdDSA");

    // Mock JWKS fetch
    mockFetchOnce(jwks);

    const result = await verifyJwtToken(token, {
      jwksUrl,
      expectedIssuer: issuer,
      clockSkewSec: 60,
    });

    expect(result.valid).toBe(true);
    expect(result.claims?.sub).toBe("user-1");
  });

  it("fails verification with wrong issuer", async () => {
    const claims = newAccessClaims({ iss: issuer, sub: "user-2", ttlSec: 600 });
    const token = await signJwtWithKey(claims, privKey, kid, "EdDSA");

    mockFetchOnce(jwks);

    const result = await verifyJwtToken(token, {
      jwksUrl,
      expectedIssuer: "https://other.example.com",
      clockSkewSec: 60,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid issuer|issuer/i);
  });
});

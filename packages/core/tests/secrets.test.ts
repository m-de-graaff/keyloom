import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSecrets,
  deriveJwtSecret,
  generateSecret,
  getEffectiveJwtSecret,
  getJwksPath,
  getSecretsFromEnv,
  getSecretsManager,
  initializeSecrets,
  resetSecretsManager,
  SecretsManager,
  validateSecrets,
} from "../src/secrets";

afterEach(() => {
  Reflect.deleteProperty(process.env, "AUTH_SECRET");
  Reflect.deleteProperty(process.env, "JWT_SECRET");
  Reflect.deleteProperty(process.env, "JWKS_PATH");
  resetSecretsManager();
  vi.restoreAllMocks();
});

describe("secrets utilities", () => {
  it("validates base64url format and minimum decoded length", () => {
    expect(() => validateSecrets({ authSecret: "" } as any)).toThrow(
      "required"
    );
    // Not base64url characters
    expect(() => validateSecrets({ authSecret: "not+base64/" } as any)).toThrow(
      "base64url"
    );
    // Base64url but too short when decoded (e.g., 16 bytes)
    const short = generateSecret(16);
    expect(() => validateSecrets({ authSecret: short } as any)).toThrow(
      "at least 32 bytes"
    );
    // Valid strong secret (>=32 bytes)
    const strong = generateSecret(32);
    expect(() => validateSecrets({ authSecret: strong } as any)).not.toThrow();
  });

  it("derives deterministic secrets", () => {
    const seed = "super-secret-value-123456";
    const derived1 = deriveJwtSecret(seed);
    const derived2 = deriveJwtSecret(seed);
    expect(derived1).toBe(derived2);
  });

  it("reads secrets from env and allows overrides", () => {
    process.env.AUTH_SECRET = generateSecret(32);
    process.env.JWT_SECRET = "jwt-secret-value-987654";
    process.env.JWKS_PATH = "/tmp/jwks.json";
    const envSecrets = getSecretsFromEnv();
    expect(envSecrets).toMatchObject({
      authSecret: expect.any(String),
      jwtSecret: "jwt-secret-value-987654",
      jwksPath: "/tmp/jwks.json",
    });

    const merged = createSecrets({
      authSecret: generateSecret(32),
    });
    expect(getEffectiveJwtSecret(merged)).toBe("jwt-secret-value-987654");

    Reflect.deleteProperty(process.env, "JWT_SECRET");
    const override = generateSecret(32);
    const derived = createSecrets({
      authSecret: override,
    });
    expect(getEffectiveJwtSecret(derived)).toBe(deriveJwtSecret(override));
  });
  it("createSecrets prioritizes explicit overrides", () => {
    process.env.AUTH_SECRET = generateSecret(32);
    process.env.JWT_SECRET = "env-jwt-secret-987654";
    process.env.JWKS_PATH = "/env/jwks.json";
    const override = generateSecret(32);
    const secrets = createSecrets({
      authSecret: override,
      jwtSecret: "explicit-jwt",
      jwksPath: "/custom/jwks.json",
    });
    expect(secrets).toMatchObject({
      authSecret: override,
      jwtSecret: "explicit-jwt",
      jwksPath: "/custom/jwks.json",
    });
  });

  it("manages secrets lifecycle via SecretsManager", () => {
    const envSecret = generateSecret(32);
    process.env.AUTH_SECRET = envSecret;
    const manager = new SecretsManager({});
    expect(manager.getAuthSecret()).toBe(envSecret);
    const hash = manager.createTokenHash("token");
    expect(manager.verifyTokenHash("token", hash)).toBe(true);
    const changed = generateSecret(32);
    manager.updateSecrets({
      authSecret: changed,
      jwksPath: "/jwks.json",
    });
    expect(manager.getJwksPath()).toBe("/jwks.json");
    expect(manager.getJwtSecret()).toBe(deriveJwtSecret(changed));
  });

  it("handles global secrets manager", () => {
    process.env.AUTH_SECRET = generateSecret(32);
    const manager = getSecretsManager();
    const same = getSecretsManager();
    expect(manager).toBe(same);
    const reset = generateSecret(32);
    const fresh = initializeSecrets({
      authSecret: reset,
    });
    expect(fresh.getAuthSecret()).toBe(reset);
  });

  it("generates sufficiently random secrets", () => {
    const secret = generateSecret(16);
    expect(secret).toHaveLength(22);
    expect(/^[A-Za-z0-9_-]+$/.test(secret)).toBe(true);
  });

  it("getJwksPath falls back to default", () => {
    expect(
      getJwksPath({ authSecret: "secret-value-123456" }, "default.json")
    ).toBe("default.json");
    expect(
      getJwksPath({
        authSecret: "secret-value-123456",
        jwksPath: "custom.json",
      })
    ).toBe("custom.json");
  });
});

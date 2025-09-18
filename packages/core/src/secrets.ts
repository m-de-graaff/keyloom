import { createHash, randomBytes } from "node:crypto";

/**
 * JWT secrets configuration
 */
export interface JwtSecrets {
  authSecret: string;
  jwtSecret?: string;
  jwksPath?: string;
}

/**
 * Validate secrets configuration
 */
export function validateSecrets(secrets: JwtSecrets): void {
  if (!secrets.authSecret) {
    throw new Error("AUTH_SECRET is required");
  }

  // Enforce base64url-encoded secret with minimum 32 bytes decoded length
  const b64re = /^[A-Za-z0-9_-]+$/;
  if (!b64re.test(secrets.authSecret)) {
    throw new Error(
      "AUTH_SECRET must be base64url-encoded (A-Z, a-z, 0-9, -, _)"
    );
  }
  let decodedLen = 0;
  try {
    decodedLen = Buffer.from(secrets.authSecret, "base64url").length;
  } catch {
    throw new Error("AUTH_SECRET is not valid base64url");
  }
  if (decodedLen < 32) {
    throw new Error("AUTH_SECRET must decode to at least 32 bytes");
  }

  // Warn about default secret in development
  if (secrets.authSecret === "dev-secret-change-in-production") {
    console.warn("⚠️  Using default AUTH_SECRET. Change this in production!");
  }
}

/**
 * Generate a secure random secret
 */
export function generateSecret(length = 32): string {
  return randomBytes(length).toString("base64url");
}

/**
 * Derive JWT signing key from auth secret
 */
export function deriveJwtSecret(
  authSecret: string,
  purpose = "jwt-signing"
): string {
  return createHash("sha256")
    .update(authSecret)
    .update(purpose)
    .digest("base64url");
}

/**
 * Get secrets from environment variables
 */
export function getSecretsFromEnv(): JwtSecrets {
  const authSecret = process.env.AUTH_SECRET || process.env.KEYLOOM_AUTH_SECRET;

  if (!authSecret) {
    throw new Error("AUTH_SECRET environment variable is required");
  }

  const out: JwtSecrets = { authSecret };
  const jwtSecret = process.env.JWT_SECRET || process.env.KEYLOOM_JWT_SECRET;
  if (jwtSecret !== undefined) out.jwtSecret = jwtSecret;
  const jwksPath = process.env.JWKS_PATH || process.env.KEYLOOM_JWKS_PATH;
  if (jwksPath !== undefined) out.jwksPath = jwksPath;
  return out;
}

/**
 * Create secrets configuration with validation
 */
export function createSecrets(secrets: Partial<JwtSecrets>): JwtSecrets {
  const envSecrets = getSecretsFromEnv();

  const finalSecrets: JwtSecrets = {
    authSecret: secrets.authSecret ?? envSecrets.authSecret,
  };

  const jwtSecret = secrets.jwtSecret ?? envSecrets.jwtSecret;
  if (jwtSecret !== undefined) finalSecrets.jwtSecret = jwtSecret;
  const jwksPath = secrets.jwksPath ?? envSecrets.jwksPath;
  if (jwksPath !== undefined) finalSecrets.jwksPath = jwksPath;

  validateSecrets(finalSecrets);
  return finalSecrets;
}

/**
 * Get effective JWT secret (derived from auth secret if not provided)
 */
export function getEffectiveJwtSecret(secrets: JwtSecrets): string {
  return secrets.jwtSecret || deriveJwtSecret(secrets.authSecret);
}

/**
 * Get JWKS file path with defaults
 */
export function getJwksPath(
  secrets: JwtSecrets,
  defaultPath = "./jwks.json"
): string {
  return secrets.jwksPath || defaultPath;
}

/**
 * Secrets manager for JWT operations
 */
export class SecretsManager {
  private secrets: JwtSecrets;

  constructor(secrets: Partial<JwtSecrets> = {}) {
    this.secrets = createSecrets(secrets);
  }

  getAuthSecret(): string {
    return this.secrets.authSecret;
  }

  getJwtSecret(): string {
    return getEffectiveJwtSecret(this.secrets);
  }

  getJwksPath(): string {
    return getJwksPath(this.secrets);
  }

  updateSecrets(newSecrets: Partial<JwtSecrets>): void {
    this.secrets = createSecrets({
      ...this.secrets,
      ...newSecrets,
    });
  }

  /**
   * Generate HMAC for refresh token hashing
   */
  createTokenHash(token: string): string {
    return createHash("sha256")
      .update(token)
      .update(this.secrets.authSecret)
      .digest("hex");
  }

  /**
   * Verify token hash
   */
  verifyTokenHash(token: string, hash: string): boolean {
    const expectedHash = this.createTokenHash(token);
    return expectedHash === hash;
  }

  /**
   * Create a derived key for specific purposes
   */
  deriveKey(purpose: string, length = 32): string {
    const derived = createHash("sha256")
      .update(this.secrets.authSecret)
      .update(purpose)
      .digest();

    return derived.subarray(0, length).toString("base64url");
  }
}

/**
 * Global secrets manager instance
 */
let globalSecretsManager: SecretsManager | null = null;

/**
 * Get or create global secrets manager
 */
export function getSecretsManager(
  secrets?: Partial<JwtSecrets>
): SecretsManager {
  if (!globalSecretsManager) {
    globalSecretsManager = new SecretsManager(secrets);
  }
  return globalSecretsManager;
}

/**
 * Initialize global secrets manager
 */
export function initializeSecrets(
  secrets: Partial<JwtSecrets>
): SecretsManager {
  globalSecretsManager = new SecretsManager(secrets);
  return globalSecretsManager;
}

/**
 * Reset global secrets manager (for testing)
 */
export function resetSecretsManager(): void {
  globalSecretsManager = null;
}

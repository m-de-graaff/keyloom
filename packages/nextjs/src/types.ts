import type { KeyloomConfig } from "@keyloom/core";
import type { NextRequest } from "next/server";

export type NextKeyloomHooks = {
  /**
   * Optional request-level hook executed for all Keyloom API routes.
   * Return a Response to short-circuit (e.g., custom deny/redirect), or void to continue.
   */
  onRequest?: (ctx: {
    kind: RequestKind;
    req: NextRequest;
  }) => Promise<Response | undefined> | Response | undefined;
};

export type RequestKind =
  | "session"
  | "csrf"
  | "oauth_start"
  | "oauth_callback"
  | "register"
  | "login"
  | "logout"
  | "unknown";

export type NextKeyloomConfig = KeyloomConfig & {
  // JWT-specific configuration
  sessionStrategy?: "database" | "jwt";
  jwt?: {
    KEYLOOM_JWT_JWKS_URL?: string;
    KEYLOOM_JWT_ISSUER?: string;
    KEYLOOM_JWT_AUDIENCE?: string;
    KEYLOOM_JWT_CLOCK_SKEW_SEC?: string;
  };
  /** Optional hooks for custom validation or metrics */
  hooks?: NextKeyloomHooks;
};

export type RuntimeCtx = {
  config: NextKeyloomConfig;
  adapter: unknown; // created from config.adapter factory if needed
};

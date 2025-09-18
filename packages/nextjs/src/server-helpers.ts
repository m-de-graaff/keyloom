import { ORG_COOKIE_NAME } from "@keyloom/core";
import { getCurrentSession } from "@keyloom/core/runtime/current-session";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseCookieValue } from "./cookies";
import { createJwtConfig, getJwtSession } from "./jwt-server";
import type { NextKeyloomConfig } from "./types";

// Module-local cache of adapter/config to avoid re-instantiations
let _config: NextKeyloomConfig | undefined;
let _adapter: any;

function ensure(config?: NextKeyloomConfig) {
  if (config) _config = config;
  if (!_config) throw new Error("Keyloom config not provided");
  if (!_adapter) _adapter = _config.adapter;
  return { config: _config, adapter: _adapter };
}

export async function getSession(config?: NextKeyloomConfig) {
  const { config: cfg, adapter } = ensure(config);

  // Check if JWT strategy is enabled
  if (cfg.sessionStrategy === "jwt" && cfg.jwt) {
    const jwtConfig = createJwtConfig(cfg.jwt);
    const result = await getJwtSession(jwtConfig);
    return { session: result.session, user: result.user };
  }

  // Fallback to database session strategy
  const cookieHeader = (await headers()).get("cookie") ?? cookies().toString();
  const sid = parseCookieValue(cookieHeader);
  const { session, user } = await getCurrentSession(sid, adapter);
  return { session, user };
}

export async function getUser(config?: NextKeyloomConfig) {
  const out = await getSession(config);
  return out.user;
}

// Server-side guard for App Router
export async function guard(
  rule?: {
    visibility?: "public" | "private" | `role:${string}`;
    roles?: string[];
    org?: boolean | "required";
    redirectTo?: string;
  },
  config?: NextKeyloomConfig
) {
  const { config: cfg, adapter } = ensure(config);

  const isPublic = rule?.visibility === "public";
  if (isPublic) return;

  let session: any = null;
  let user: any = null;

  // Check if JWT strategy is enabled
  if (cfg.sessionStrategy === "jwt" && cfg.jwt) {
    const jwtConfig = createJwtConfig(cfg.jwt);
    const result = await getJwtSession(jwtConfig);
    session = result.session;
    user = result.user;
  } else {
    // Fallback to database session strategy
    const cookieHeader =
      (await headers()).get("cookie") ?? cookies().toString();
    const sid = parseCookieValue(cookieHeader);
    const sessionResult = await getCurrentSession(sid, adapter);
    session = sessionResult.session;
    user = sessionResult.user;
  }

  if (!session || !user) return redirect(rule?.redirectTo ?? "/sign-in");

  const needsRole =
    (rule?.roles && rule.roles.length > 0) ||
    rule?.visibility?.startsWith("role:");
  if (needsRole) {
    const need = rule?.visibility?.startsWith("role:")
      ? [rule.visibility.slice(5)]
      : (rule?.roles as string[]);

    // If role is checked, require an active org unless explicitly disabled
    const orgRequired = rule?.org === "required" || rule?.org === true || true;

    if (cfg?.rbac?.enabled === false) {
      // Skip org/role checks if RBAC is disabled
      return { session, user };
    }

    const cookieHeader =
      (await headers()).get("cookie") ?? cookies().toString();
    const orgId = parseCookieValue(cookieHeader, ORG_COOKIE_NAME);
    if (orgRequired && !orgId) return redirect("/select-org");

    const m = await adapter.getMembership(user.id, orgId);
    if (!m || !need.includes(m.role)) return redirect("/403");

    return { session, user, role: m.role as string, orgId };
  }

  if (rule?.org === "required" && cfg?.rbac?.enabled !== false) {
    const cookieHeader =
      (await headers()).get("cookie") ?? cookies().toString();
    const orgId = parseCookieValue(cookieHeader, ORG_COOKIE_NAME);
    if (!orgId) return redirect("/select-org");
    return { session, user, orgId };
  }

  return { session, user };
}

import { ORG_COOKIE_NAME } from "@keyloom/core";
import { headers } from "next/headers";
import { parseCookieValue } from "./cookies";

export function getActiveOrgId() {
  return parseCookieValue((headers() as any).get("cookie"), ORG_COOKIE_NAME);
}

export function setActiveOrgCookie(orgId: string) {
  return `${ORG_COOKIE_NAME}=${encodeURIComponent(
    orgId
  )}; Path=/; SameSite=Lax; HttpOnly; Secure; Max-Age=15552000`;
}

export async function getRoleForUser(
  userId: string,
  orgId: string,
  adapter: any
) {
  const m = await adapter.getMembership(userId, orgId);
  return m?.role ?? null;
}

export async function withRole(
  action: () => Promise<Response>,
  opts: {
    requiredRoles?: string[];
    requiredPermission?: string;
    permMap?: Record<string, string[]>;
    getUser: () => Promise<{ id: string } | null>;
    adapter: any;
    orgId?: string | null;
    onDenied?: () => Response;
    rbacEnabled?: boolean;
  }
) {
  // If RBAC is disabled, skip role/org checks
  if (opts.rbacEnabled === false) {
    return action();
  }

  const user = await opts.getUser();
  if (!user)
    return opts.onDenied
      ? opts.onDenied()
      : new Response("unauthorized", { status: 401 });
  const orgId = opts.orgId ?? getActiveOrgId();
  if (!orgId)
    return opts.onDenied
      ? opts.onDenied()
      : new Response("select_org", { status: 400 });
  const role = await getRoleForUser(user.id, orgId, opts.adapter);
  if (!role)
    return opts.onDenied
      ? opts.onDenied()
      : new Response("forbidden", { status: 403 });
  if (opts.requiredRoles?.length && !opts.requiredRoles.includes(role))
    return new Response("forbidden", { status: 403 });
  if (opts.requiredPermission && opts.permMap) {
    const allowed = (opts.permMap[opts.requiredPermission] ?? []).includes(
      role
    );
    if (!allowed) return new Response("forbidden", { status: 403 });
  }
  return action();
}

import { ORG_COOKIE_NAME } from "@keyloom/core";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseCookieValue } from "./cookies-edge";
import type { KeyloomRouteRule, KeyloomRoutesManifest } from "./route-types";
import type { NextKeyloomConfig } from "./types";

type Options = {
  publicRoutes?: (string | RegExp)[];
  routes?: KeyloomRoutesManifest;
  // Optional edge verification (perfs lower): fetch /api/auth/session
  verifyAtEdge?: boolean;
  afterAuth?: (ctx: {
    authed: boolean;
    req: NextRequest;
    next: () => NextResponse;
    redirect: (to: string) => NextResponse;
  }) => NextResponse;
};

function isPublic(urlPath: string, rules: (string | RegExp)[] = []) {
  return rules.some((r) =>
    typeof r === "string"
      ? urlPath === r || urlPath.startsWith(r)
      : r.test(urlPath)
  );
}

function compilePattern(pat: string): RegExp {
  const segs = pat.split("/").filter((s) => s.length > 0);
  const reSegs = segs.map((s) => {
    if (s === "*") return ".*";
    if (s.startsWith(":")) return "[^/]+";
    // escape regex chars
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  const body = reSegs.join("/");
  return new RegExp(`^/${body}/?$`);
}

export function createAuthMiddleware(
  config: NextKeyloomConfig,
  opts: Options = {}
) {
  const compiled = (opts.routes?.entries ?? [])
    .slice()
    .sort((a, b) => b.specificity - a.specificity)
    .map((e) => ({ re: compilePattern(e.pattern), entry: e }));

  function handleUnauthorized(
    rule: KeyloomRouteRule,
    url: URL,
    isApi: boolean
  ) {
    if (isApi && rule.mode === "401") {
      return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const to = rule.redirectTo ?? "/sign-in";
    return NextResponse.redirect(new URL(to, url));
  }

  return async (req: NextRequest, _ev: NextFetchEvent) => {
    const url = req.nextUrl;
    const isStatic =
      url.pathname.startsWith("/_next") ||
      url.pathname.match(/\.(?:ico|png|jpg|svg|css|js|txt|map)$/);
    if (isStatic) return NextResponse.next();

    const cookieHeader = req.headers.get("cookie");

    // If manifest provided, use it; otherwise fallback to legacy publicRoutes behavior
    if (compiled.length > 0) {
      const hit = compiled.find((c) => c.re.test(url.pathname));
      if (!hit) return NextResponse.next();
      const rule = hit.entry.rule;
      const isApi = url.pathname.startsWith("/api");

      if (rule.visibility === "public") return NextResponse.next();

      const sid = parseCookieValue(cookieHeader);
      let authed = !!sid;

      const verify = rule.verify ?? "cookie";
      if (authed && verify !== "cookie") {
        try {
          const r = await fetch(new URL("/api/auth/session", url).toString(), {
            headers: { cookie: cookieHeader ?? "" },
          });
          const j = await r.json();
          authed = !!j?.session;
        } catch {
          authed = false;
        }
      }

      if (!authed) return handleUnauthorized(rule, url, isApi);

      if (rule.org === "required" && config?.rbac?.enabled !== false) {
        const orgId = parseCookieValue(cookieHeader, ORG_COOKIE_NAME);
        if (!orgId) return NextResponse.redirect(new URL("/select-org", url));
      }

      // Edge cannot DB-check role by default; allow through. Server-side guard should enforce roles/membership.
      return NextResponse.next();
    }

    // Legacy behavior
    const publicHit = isPublic(url.pathname, opts.publicRoutes);
    const sid = parseCookieValue(cookieHeader);
    let authed = !!sid;

    if (!publicHit && opts.verifyAtEdge && sid) {
      try {
        const r = await fetch(new URL("/api/auth/session", url).toString(), {
          headers: { cookie: cookieHeader ?? "" },
        });
        const j = await r.json();
        authed = !!j?.session;
      } catch {
        authed = false;
      }
    }

    const next = () => NextResponse.next();
    const redirect = (to: string) => NextResponse.redirect(new URL(to, url));

    if (opts.afterAuth) return opts.afterAuth({ authed, req, next, redirect });

    if (!publicHit && !authed) return redirect("/sign-in");
    return next();
  };
}

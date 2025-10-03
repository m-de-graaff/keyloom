import { argon2idHasher, completeOAuth, startOAuth } from "@keyloom/core";
import { issueVerificationToken } from "@keyloom/core/tokens/verification";
import { issueCsrfToken, validateDoubleSubmit } from "@keyloom/core/guard/csrf";
import { rateLimit } from "@keyloom/core/guard/rate-limit";
import { getCurrentSession } from "@keyloom/core/runtime/current-session";
import { login as doLogin } from "@keyloom/core/runtime/login";
import { logout as doLogout } from "@keyloom/core/runtime/logout";
import { register as doRegister } from "@keyloom/core/runtime/register";
import { requestMagicLink, verifyMagicLink } from "@keyloom/core/magic-link";
import { createEmailServiceFromEnv } from "@keyloom/core/email";
// Test the new combined runtime import
import {
  register as testRegister,
  login as testLogin,
  logout as testLogout,
} from "@keyloom/core/runtime";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseCookieValue, setSessionCookieHeader } from "./cookies";
import { matchApiPath } from "./routing";
import { createJwtConfig, getJwtSession } from "./jwt-server";
import type { NextKeyloomConfig } from "./types";

// Lazily memoize adapter (per module instance)
let _adapter: any;
function getAdapter(config: NextKeyloomConfig) {
  if (!_adapter) _adapter = config.adapter;
  return _adapter;
}

function resolveProvider(config: NextKeyloomConfig, id: string) {
  const p = (config as any).providers?.find((x: any) => x.id === id);
  if (!p) throw new Error(`provider_not_found:${id}`);
  return p;
}

function resolveJwtEnv(
  config: NextKeyloomConfig
): Record<string, string> | null {
  const anyCfg: any = config as any;
  if (anyCfg.sessionStrategy !== "jwt") return null;
  if (anyCfg.jwt && anyCfg.jwt.KEYLOOM_JWT_JWKS_URL) return anyCfg.jwt;
  const base = anyCfg.baseUrl as string | undefined;
  const issuer = anyCfg.jwt?.issuer || base;
  if (!base || !issuer) return null;
  return {
    KEYLOOM_JWT_JWKS_URL: `${String(base).replace(
      /\/$/,
      ""
    )}/.well-known/jwks.json`,
    KEYLOOM_JWT_ISSUER: issuer,
  };
}

export function createNextHandler(config: NextKeyloomConfig) {
  const GET = async (req: NextRequest) => {
    const url = new URL(req.url);
    const match = matchApiPath(url.pathname);
    const adapter = getAdapter(config);

    // Plugin route handling (GET)
    if (Array.isArray(config.plugins)) {
      const route = config.plugins.find(
        (r) => r.method === "GET" && r.path.test(url.pathname)
      );
      if (route) {
        const out = await route.handler(req as any, { config, adapter } as any);
        return out as any;
      }
    }

    if (!match)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Optional global hook (Node runtime)
    if (config.hooks?.onRequest) {
      const hookResp = await config.hooks.onRequest({
        kind: (match.kind as any) ?? "unknown",
        req,
      });
      if (hookResp) return hookResp as any;
    }

    if (match.kind === "session") {
      // Support both DB and JWT strategy
      const envLike = resolveJwtEnv(config);
      if (envLike) {
        try {
          const jwtCfg = createJwtConfig(envLike);
          const out = await getJwtSession(jwtCfg, req);
          return NextResponse.json({ session: out.session, user: out.user });
        } catch {
          return NextResponse.json({ session: null, user: null });
        }
      }
      const sid = parseCookieValue(req.headers.get("cookie"));
      const out = await getCurrentSession(sid, adapter);
      return NextResponse.json(out);
    }

    if (match.kind === "csrf") {
      const token = issueCsrfToken();
      const res = NextResponse.json({ csrfToken: token });
      res.headers.append(
        "Set-Cookie",
        `__keyloom_csrf=${token}; Path=/; SameSite=Lax; HttpOnly; Secure`
      );
      return res;
    }

    // --- OAUTH START ---
    if (match.kind === "oauth_start") {
      const provider = resolveProvider(config, match.provider);
      const callbackPath = `/api/auth/oauth/${provider.id}/callback`;
      const callbackUrl = url.searchParams.get("callbackUrl") ?? undefined;

      const authSecret = (config as any).secrets?.authSecret;
      if (typeof authSecret !== "string" || !authSecret) {
        throw new Error("auth_secret_required");
      }
      const startOpts: any = {
        provider,
        baseUrl: (config as any).baseUrl,
        callbackPath,
        secrets: { authSecret },
      };
      if (typeof callbackUrl === "string") startOpts.callbackUrl = callbackUrl;

      const { authorizeUrl, stateCookie } = await startOAuth(startOpts);

      const res = NextResponse.redirect(authorizeUrl);
      res.headers.append("Set-Cookie", stateCookie);
      return res;
    }

    if (match.kind === "oauth_callback") {
      const provider = resolveProvider(config, match.provider);
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");
      if (!code || !stateParam)
        return NextResponse.json(
          { error: "invalid_callback" },
          { status: 400 }
        );

      const stateCookie = parseCookieValue(
        req.headers.get("cookie"),
        "__keyloom_oauth"
      );
      const callbackPath = `/api/auth/oauth/${provider.id}/callback`;

      // If user already signed-in, link provider to that user
      const existingSid = parseCookieValue(req.headers.get("cookie"));
      const current = existingSid
        ? await getCurrentSession(existingSid, adapter)
        : null;

      const authSecret = (config as any).secrets?.authSecret;
      if (typeof authSecret !== "string" || !authSecret) {
        throw new Error("auth_secret_required");
      }
      const completeOpts: any = {
        provider,
        adapter,
        baseUrl: (config as any).baseUrl,
        callbackPath,
        stateCookie,
        stateParam,
        code,
        secrets: { authSecret },
      };
      if (current?.user?.id) completeOpts.linkToUserId = current.user.id;

      const { session, redirectTo } = await completeOAuth(completeOpts);

      const absoluteRedirect = new URL(
        redirectTo,
        (config as any).baseUrl
      ).toString();
      const res = NextResponse.redirect(absoluteRedirect);
      res.headers.append(
        "Set-Cookie",
        setSessionCookieHeader(session.id, {
          sameSite: (config as any).cookie?.sameSite ?? "lax",
        })
      );
      res.headers.append(
        "Set-Cookie",
        `__keyloom_oauth=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure`
      );
      return res;
    }

    // Magic link verification via GET (when user clicks email link)
    if (match.kind === "magic_link_verify") {
      // Rate limiting for GET magic link verification
      const ip =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const rlKey = `magic_verify_get:${ip}`;
      if (!rateLimit(rlKey, { capacity: 10, refillPerSec: 0.5 })) {
        const errorUrl = new URL("/auth/error", url.origin);
        errorUrl.searchParams.set("error", "rate_limited");
        return NextResponse.redirect(errorUrl);
      }

      const email = url.searchParams.get("email");
      const token = url.searchParams.get("token");
      const redirectTo = url.searchParams.get("redirectTo");

      if (!email || !token) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }

      const result = await verifyMagicLink({ email, token }, { adapter });

      if (!result.success) {
        // Redirect to error page or return error
        const errorUrl = new URL("/auth/error", url.origin);
        errorUrl.searchParams.set(
          "error",
          result.error || "magic_link_verification_failed"
        );
        return NextResponse.redirect(errorUrl);
      }

      // Set session cookie and redirect
      const finalRedirectTo = redirectTo || "/";
      const redirectUrl = new URL(finalRedirectTo, url.origin);
      const res = NextResponse.redirect(redirectUrl);

      if (result.session) {
        res.headers.append(
          "Set-Cookie",
          setSessionCookieHeader(result.session.id, {
            sameSite: (config as any).cookie?.sameSite ?? "lax",
          })
        );
      }

      return res;
    }

    return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
  };

  const POST = async (req: NextRequest) => {
    const url = new URL(req.url);
    const match = matchApiPath(url.pathname);
    const adapter = getAdapter(config);

    // Plugin route handling (POST)
    if (Array.isArray(config.plugins)) {
      const route = config.plugins.find(
        (r) => r.method === "POST" && r.path.test(url.pathname)
      );
      if (route) {
        const out = await route.handler(req as any, { config, adapter } as any);
        return out as any;
      }
    }

    if (!match)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Optional global hook (Node runtime)
    if (config.hooks?.onRequest) {
      const hookResp = await config.hooks.onRequest({
        kind: (match.kind as any) ?? "unknown",
        req,
      });
      if (hookResp) return hookResp as any;
    }

    // Apple and some IdPs can POST back the callback (response_mode=form_post)
    if (match.kind === "oauth_callback") {
      const provider = resolveProvider(config, match.provider);
      const form = await (req as any).formData?.();
      const code = form?.get ? form.get("code") : null;
      const stateParam = form?.get ? form.get("state") : null;
      if (!code || !stateParam)
        return NextResponse.json(
          { error: "invalid_callback" },
          { status: 400 }
        );

      const stateCookie = parseCookieValue(
        req.headers.get("cookie"),
        "__keyloom_oauth"
      );
      const callbackPath = `/api/auth/oauth/${provider.id}/callback`;

      // If user already signed-in, link provider to that user
      const existingSid = parseCookieValue(req.headers.get("cookie"));
      const current = existingSid
        ? await getCurrentSession(existingSid, adapter)
        : null;

      const authSecret = (config as any).secrets?.authSecret;
      if (typeof authSecret !== "string" || !authSecret) {
        throw new Error("auth_secret_required");
      }
      const completeOpts: any = {
        provider,
        adapter,
        baseUrl: (config as any).baseUrl,
        callbackPath,
        stateCookie,
        stateParam: String(stateParam),
        code: String(code),
        secrets: { authSecret },
      };
      if (current?.user?.id) completeOpts.linkToUserId = current.user.id;

      const { session, redirectTo } = await completeOAuth(completeOpts);

      const absoluteRedirect = new URL(
        redirectTo,
        (config as any).baseUrl
      ).toString();
      const res = NextResponse.redirect(absoluteRedirect);
      res.headers.append(
        "Set-Cookie",
        setSessionCookieHeader(session.id, {
          sameSite: (config as any).cookie?.sameSite ?? "lax",
        })
      );
      res.headers.append(
        "Set-Cookie",
        `__keyloom_oauth=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly; Secure`
      );
      return res;
    }

    // CSRF double-submit for all other POSTs
    const cookieToken = parseCookieValue(
      req.headers.get("cookie"),
      "__keyloom_csrf"
    );
    const headerToken = req.headers.get("x-keyloom-csrf");
    if (!validateDoubleSubmit({ cookieToken, headerToken })) {
      return NextResponse.json({ error: "csrf" }, { status: 403 });
    }

    if (match.kind === "register") {
      const { email, password } = await req.json();
      const out = await doRegister(
        { email, password, requireEmailVerify: false },
        { adapter, hasher: argon2idHasher }
      );
      return NextResponse.json({
        userId: out.user.id,
        requiresVerification: out.requiresVerification,
      });
    }

    if (match.kind === "login") {
      const { email, password } = await req.json();
      const loginInput: any = { email, password };
      if (typeof (config as any).session?.ttlMinutes === "number") {
        loginInput.ttlMinutes = (config as any).session.ttlMinutes;
      }
      const { session } = await doLogin(loginInput, {
        adapter,
        hasher: argon2idHasher,
      });
      const res = NextResponse.json({ sessionId: session.id });
      res.headers.append(
        "Set-Cookie",
        setSessionCookieHeader(session.id, {
          sameSite: config.cookie?.sameSite ?? "lax",
        })
      );
      return res;
    }

    if (match.kind === "logout") {
      const sid = parseCookieValue(req.headers.get("cookie"));
      if (sid) await doLogout(sid, adapter);
      const res = NextResponse.json({ ok: true });
      res.headers.append(
        "Set-Cookie",
        setSessionCookieHeader("", {
          maxAgeSec: 0,
          sameSite: config.cookie?.sameSite ?? "lax",
        })
      );
      return res;
    }

    // Password reset request
    if (match.kind === "password_request") {
      const { email } = await req.json();
      if (!email)
        return NextResponse.json({ error: "invalid_email" }, { status: 400 });
      const vt = issueVerificationToken(String(email), 15);
      await (adapter as any).createVerificationToken({
        identifier: vt.identifier,
        token: (vt as any).token,
        expiresAt: vt.expiresAt,
      });
      // In real apps, send email with vt.token
      return NextResponse.json({ ok: true });
    }

    // Password reset perform
    if (match.kind === "password_reset") {
      const { identifier, token, newPassword } = await req.json();
      if (!identifier || !token || !newPassword)
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      const used = await (adapter as any).useVerificationToken(
        String(identifier),
        String(token)
      );
      if (!used)
        return NextResponse.json({ error: "invalid_token" }, { status: 400 });
      const user = await (adapter as any).getUserByEmail(String(identifier));
      if (!user)
        return NextResponse.json({ error: "user_not_found" }, { status: 404 });
      const hash = await argon2idHasher.hash(String(newPassword));
      if (typeof (adapter as any).updateCredential === "function") {
        await (adapter as any).updateCredential(user.id, hash);
      } else if (typeof (adapter as any).createCredential === "function") {
        await (adapter as any).createCredential(user.id, hash);
      }
      return NextResponse.json({ ok: true });
    }

    // Email verification
    if (match.kind === "email_verify") {
      const { identifier, token } = await req.json();
      if (!identifier || !token)
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      const used = await (adapter as any).useVerificationToken(
        String(identifier),
        String(token)
      );
      if (!used)
        return NextResponse.json({ error: "invalid_token" }, { status: 400 });
      const user = await (adapter as any).getUserByEmail(String(identifier));
      if (user)
        await (adapter as any).updateUser(user.id, {
          emailVerified: new Date(),
        });
      return NextResponse.json({ ok: true });
    }

    // Magic link request
    if (match.kind === "magic_link_request") {
      // Rate limiting for magic link requests (more restrictive than login)
      const ip =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const rlKey = `magic_link:${ip}`;
      if (!rateLimit(rlKey, { capacity: 3, refillPerSec: 0.1 })) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }

      const { email, redirectTo, ttlMinutes } = await req.json();
      if (!email)
        return NextResponse.json({ error: "invalid_email" }, { status: 400 });

      // Get email service from environment or config
      const emailService = createEmailServiceFromEnv();
      if (!emailService) {
        return NextResponse.json(
          { error: "email_service_not_configured" },
          { status: 500 }
        );
      }

      const baseUrl = (config as any).baseUrl || url.origin;
      const appName = (config as any).appName || "Keyloom App";

      const result = await requestMagicLink(
        { email: String(email), redirectTo, ttlMinutes },
        { adapter, emailService, baseUrl, appName }
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "magic_link_request_failed" },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true, email: result.email });
    }

    // Magic link verification
    if (match.kind === "magic_link_verify") {
      // Rate limiting for magic link verification attempts
      const ip =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const rlKey = `magic_verify:${ip}`;
      if (!rateLimit(rlKey, { capacity: 10, refillPerSec: 0.5 })) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }

      const { email, token, sessionTtlMinutes } = await req.json();
      if (!email || !token)
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });

      const result = await verifyMagicLink(
        { email: String(email), token: String(token), sessionTtlMinutes },
        { adapter }
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "magic_link_verification_failed" },
          { status: 400 }
        );
      }

      // Set session cookie
      const res = NextResponse.json({
        ok: true,
        user: result.user,
        sessionId: result.session?.id,
      });

      if (result.session) {
        res.headers.append(
          "Set-Cookie",
          setSessionCookieHeader(result.session.id, {
            sameSite: (config as any).cookie?.sameSite ?? "lax",
          })
        );
      }

      return res;
    }

    return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
  };

  return { GET, POST };
}

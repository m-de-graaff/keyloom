import { PrismaAdapter } from "@keyloom/adapters";
import * as core from "@keyloom/core";
import * as Prisma from "@prisma/client";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { createRefreshTokenStore } from "../prisma-refresh-store";

declare module "fastify" {
  interface FastifyRequest {
    cookies?: { __keyloom_csrf?: string };
  }
}

import { clearSessionCookie, setSessionCookie } from "../cookies";
import type { Env } from "../env";
import {
  clearJwtCookies,
  extractRefreshToken,
  setJwtCookies,
} from "../jwt-cookies";
import { getJwtService, initializeJwtService } from "../jwt-service";
import { initializeGlobalKeystore } from "../keystore";
import { setupJwks } from "./jwks";

export function buildServer(env: Env) {
  const app = Fastify({ trustProxy: true });
  const db = new (Prisma as any).PrismaClient();
  const adapter = PrismaAdapter(db);
  const baseAdapter = adapter as unknown as core.Adapter;
  const credAdapter = adapter as unknown as core.Adapter & {
    getCredentialByUserId(userId: core.ID): Promise<{ hash: string } | null>;
    createCredential(
      userId: core.ID,
      hash: string
    ): Promise<{ id: core.ID; userId: core.ID }>;
  };
  const hasher = core.argon2idHasher;

  // Initialize JWT components if using JWT strategy
  let _jwtService: ReturnType<typeof getJwtService> | null = null;
  if (env.SESSION_STRATEGY === "jwt") {
    // Initialize keystore
    const ksOpts: {
      jwksPath?: string;
      alg?: core.jwt.JwtAlg;
      rotationDays?: number;
      overlapDays?: number;
    } = {
      alg: env.JWT_ALGORITHM || "EdDSA",
      rotationDays: env.KEY_ROTATION_DAYS || 90,
      overlapDays: env.KEY_OVERLAP_DAYS || 7,
    };
    if (env.JWKS_PATH) ksOpts.jwksPath = env.JWKS_PATH;
    initializeGlobalKeystore(ksOpts).catch(console.error);

    // Initialize JWT service
    const refreshTokenStore = createRefreshTokenStore(db);
    _jwtService = initializeJwtService(env, refreshTokenStore);

    // Setup JWKS endpoints
    setupJwks(app);
  }

  app.get("/v1/auth/csrf", async (_req, reply) => {
    const t = core.csrf.issueCsrfToken();
    reply.header(
      "Set-Cookie",
      `__keyloom_csrf=${t}; Path=/; SameSite=Lax; HttpOnly; Secure`
    );
    return { csrfToken: t };
  });

  app.post(
    "/v1/auth/register",
    async (
      req: FastifyRequest<{
        Body: { email: string; password: string };
        Reply: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const ip = req.ip;
      const rlKey = `reg:${ip}`;
      if (!core.rateLimit.rateLimit(rlKey, { capacity: 5, refillPerSec: 0.2 }))
        return reply.code(429).send({ error: "rate_limited" });

      const ok = core.csrf.validateDoubleSubmit({
        cookieToken: req.cookies?.__keyloom_csrf ?? null,
        headerToken: req.headers["x-keyloom-csrf"] as string,
      });
      if (!ok) return reply.code(403).send({ error: "csrf" });

      const { email, password } = req.body ?? {
        email: undefined as unknown as string,
        password: undefined as unknown as string,
      };
      const out = await core.register(
        { email, password, requireEmailVerify: false },
        { adapter: credAdapter, hasher }
      );
      return {
        userId: out.user.id,
        requiresVerification: out.requiresVerification,
      };
    }
  );

  app.post(
    "/v1/auth/login",
    async (
      req: FastifyRequest<{
        Body: { email: string; password: string };
        Reply: unknown;
      }>,
      reply: FastifyReply
    ) => {
      const ip = req.ip;
      const rlKey = `login:${ip}`;
      if (!core.rateLimit.rateLimit(rlKey, { capacity: 10, refillPerSec: 1 }))
        return reply.code(429).send({ error: "rate_limited" });

      const ok = core.csrf.validateDoubleSubmit({
        cookieToken: req.cookies?.__keyloom_csrf ?? null,
        headerToken: req.headers["x-keyloom-csrf"] as string,
      });
      if (!ok) return reply.code(403).send({ error: "csrf" });

      const { email, password } = req.body ?? {
        email: undefined as unknown as string,
        password: undefined as unknown as string,
      };

      if (env.SESSION_STRATEGY === "jwt") {
        // JWT strategy - issue tokens
        const { user } = await core.login(
          { email, password },
          { adapter: credAdapter, hasher }
        );
        const jwtSvc = getJwtService();
        const loginMeta: { ip?: string; userAgent?: string } = { ip: req.ip };
        if (typeof req.headers["user-agent"] === "string")
          loginMeta.userAgent = req.headers["user-agent"];
        const tokens = await jwtSvc.issueTokens(user.id, loginMeta);

        const cookieOpts = env.COOKIE_DOMAIN
          ? { domain: env.COOKIE_DOMAIN }
          : {};
        setJwtCookies(
          reply,
          tokens,
          {
            accessTTLSec: tokens.accessTTLSec,
            refreshTTLSec: tokens.refreshTTLSec,
          },
          {
            ...cookieOpts,
            sameSite: env.COOKIE_SAMESITE,
          }
        );

        return {
          accessToken: tokens.accessToken,
          userId: user.id,
        };
      } else {
        // Database strategy - create session
        const { session } = await core.login(
          { email, password },
          { adapter: credAdapter, hasher }
        );
        const cookieOpts = env.COOKIE_DOMAIN
          ? { domain: env.COOKIE_DOMAIN }
          : {};
        setSessionCookie(reply, session.id, {
          ...cookieOpts,
          sameSite: env.COOKIE_SAMESITE,
        });
        return { sessionId: session.id };
      }
    }
  );

  // JWT token refresh endpoint
  app.post(
    "/v1/auth/token",
    async (
      req: FastifyRequest<{ Body?: { refreshToken?: string } }>,
      reply: FastifyReply
    ) => {
      if (env.SESSION_STRATEGY !== "jwt") {
        return reply.code(404).send({ error: "endpoint_not_available" });
      }

      try {
        const refreshToken = extractRefreshToken(req.headers.cookie, req.body);
        if (!refreshToken) {
          return reply.code(401).send({ error: "refresh_token_required" });
        }

        const jwtSvc = getJwtService();
        const refreshMeta: { ip?: string; userAgent?: string } = { ip: req.ip };
        if (typeof req.headers["user-agent"] === "string")
          refreshMeta.userAgent = req.headers["user-agent"];
        const tokens = await jwtSvc.refreshTokens(refreshToken, refreshMeta);

        const cookieOpts = env.COOKIE_DOMAIN
          ? { domain: env.COOKIE_DOMAIN }
          : {};
        setJwtCookies(
          reply,
          tokens,
          {
            accessTTLSec: tokens.accessTTLSec,
            refreshTTLSec: tokens.refreshTTLSec,
          },
          {
            ...cookieOpts,
            sameSite: env.COOKIE_SAMESITE,
          }
        );

        return {
          accessToken: tokens.accessToken,
          userId: tokens.userId,
        };
      } catch (error) {
        console.error("Token refresh error:", error);
        const cookieOpts = env.COOKIE_DOMAIN
          ? { domain: env.COOKIE_DOMAIN }
          : {};
        clearJwtCookies(reply, {
          ...cookieOpts,
          sameSite: env.COOKIE_SAMESITE,
        });
        return reply.code(401).send({ error: "invalid_refresh_token" });
      }
    }
  );

  app.post(
    "/v1/auth/logout",
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (env.SESSION_STRATEGY === "jwt") {
        // JWT strategy - clear cookies and optionally revoke refresh tokens
        const cookieOpts = env.COOKIE_DOMAIN
          ? { domain: env.COOKIE_DOMAIN }
          : {};
        clearJwtCookies(reply, {
          ...cookieOpts,
          sameSite: env.COOKIE_SAMESITE,
        });
        return { ok: true };
      } else {
        // Database strategy - delete session
        const cookie = (req.headers.cookie ?? "")
          .split("; ")
          .find((s) => s.startsWith("__keyloom_session="));
        const sid = cookie?.split("=")[1] ?? null;
        if (sid) await core.logout(sid, baseAdapter);
        const cookieOpts = env.COOKIE_DOMAIN
          ? { domain: env.COOKIE_DOMAIN }
          : {};
        clearSessionCookie(reply, {
          ...cookieOpts,
          sameSite: env.COOKIE_SAMESITE,
        });
        return { ok: true };
      }
    }
  );

  app.get(
    "/v1/auth/session",
    async (req: FastifyRequest, reply: FastifyReply) => {
      // Rate limit session validation; higher threshold than login to fit common polling
      {
        const ip = req.ip;
        const rlKey = `session:${ip}`;
        // Example: capacity 60, refill 5 tokens/sec (~300 req/min steady)
        if (!core.rateLimit.rateLimit(rlKey, { capacity: 60, refillPerSec: 5 }))
          return reply.code(429).send({ error: "rate_limited" });
      }

      if (env.SESSION_STRATEGY === "jwt") {
        // JWT strategy - verify access token
        try {
          const { extractAccessToken } = await import("../jwt-cookies");
          const { verifyJwtFull, getPublicKeysForVerification } = await import(
            "@keyloom/core/jwt"
          );
          const { getKeystoreManager } = await import("../keystore");

          const accessToken = extractAccessToken(
            req.headers.authorization,
            req.headers.cookie
          );
          if (!accessToken) {
            return { session: null, user: null };
          }

          const keystoreManager = getKeystoreManager();
          const keystore = keystoreManager.getKeystore();
          const publicKeys = getPublicKeysForVerification(keystore);

          const verifyOpts: {
            clockSkewSec?: number;
            expectedIssuer?: string;
            expectedAudience?: string | string[];
          } = {};
          if (env.JWT_ISSUER) verifyOpts.expectedIssuer = env.JWT_ISSUER;
          if (env.JWT_AUDIENCE) verifyOpts.expectedAudience = env.JWT_AUDIENCE;
          if (typeof env.JWT_CLOCK_SKEW_SEC === "number")
            verifyOpts.clockSkewSec = env.JWT_CLOCK_SKEW_SEC;
          const { claims } = await verifyJwtFull(
            accessToken,
            publicKeys,
            verifyOpts
          );

          // Get user from database
          const user = await adapter.getUser(claims.sub);
          if (!user) {
            return { session: null, user: null };
          }

          return {
            session: {
              id: claims.sid || claims.sub,
              userId: claims.sub,
              expiresAt: new Date(claims.exp * 1000),
            },
            user: { id: user.id, email: user.email },
          };
        } catch (error) {
          console.error("JWT verification error:", error);
          return { session: null, user: null };
        }
      } else {
        // Database strategy - check session
        const cookie = (req.headers.cookie ?? "")
          .split("; ")
          .find((s) => s.startsWith("__keyloom_session="));
        const sid = cookie?.split("=")[1] ?? null;
        const { session, user } = await core.getCurrentSession(
          sid,
          baseAdapter
        );
        return {
          session,
          user: user ? { id: user.id, email: user.email } : null,
        };
      }
    }
  );

  return app;
}

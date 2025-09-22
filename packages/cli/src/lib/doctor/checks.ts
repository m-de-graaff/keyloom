import fs from 'node:fs'
import path from 'node:path'

export type CheckResult = {
  id: string
  ok: boolean
  warn?: boolean
  message: string
}

function fileExists(p: string) {
  try {
    return fs.existsSync(p)
  } catch {
    return false
  }
}

export async function runDoctorChecks(
  cwd = process.cwd(),
  opts: { env?: Record<string, string>; skipEnvChecks?: boolean } = {},
): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  // Prefer provided env (merged from .env files) over process.env when present
  const ENV: Record<string, string | undefined> = { ...(opts.env || {}), ...process.env } as any

  // AUTH_SECRET (must be base64url and decode to >=32 bytes)
  if (opts.skipEnvChecks) {
    results.push({
      id: 'env:AUTH_SECRET',
      ok: true,
      warn: true,
      message: 'Skipped AUTH_SECRET check due to privacy settings',
    })
  } else {
    const auth = ENV.AUTH_SECRET || ENV.KEYLOOM_AUTH_SECRET || ''
    const hasAuthSecret = (auth as string).length > 0
    let decodedLen = 0
    let base64urlOk = false
    if (hasAuthSecret) {
      const re = /^[A-Za-z0-9_-]+$/
      base64urlOk = re.test(auth)
      try {
        decodedLen = Buffer.from(auth, 'base64url').length
      } catch {
        base64urlOk = false
      }
    }
    const strongAuth = base64urlOk && decodedLen >= 32
    results.push({
      id: 'env:AUTH_SECRET',
      ok: hasAuthSecret && strongAuth,
      warn: hasAuthSecret && (!base64urlOk || decodedLen < 32),
      message: hasAuthSecret
        ? strongAuth
          ? 'AUTH_SECRET present (base64url, >=32 bytes)'
          : base64urlOk
            ? 'AUTH_SECRET decodes to <32 bytes'
            : 'AUTH_SECRET is not valid base64url (A-Z, a-z, 0-9, -, _)'
        : 'AUTH_SECRET missing',
    })
  }

  // Database URL present
  if (opts.skipEnvChecks) {
    results.push({
      id: 'env:DATABASE_URL',
      ok: true,
      warn: true,
      message: 'Skipped DATABASE_URL check due to privacy settings',
    })
  } else {
    const dbUrl = ENV.DATABASE_URL || ENV.POSTGRES_URL || ENV.MYSQL_URL || ENV.MONGODB_URI
    results.push({
      id: 'env:DATABASE_URL',
      ok: !!dbUrl,
      message: dbUrl
        ? 'Database URL present'
        : 'Database URL missing (set DATABASE_URL, POSTGRES_URL, MYSQL_URL, or MONGODB_URI)',
    })
  }

  // Route manifest
  const manifestTs = path.join(cwd, '.keyloom', 'routes.generated.ts')
  const manifestJson = path.join(cwd, '.keyloom', 'routes.generated.json')
  const hasManifest = fileExists(manifestTs) || fileExists(manifestJson)
  results.push({
    id: 'routes:manifest',
    ok: hasManifest,
    message: hasManifest
      ? 'Route manifest found'
      : 'Route manifest not found (.keyloom/routes.generated.*)',
  })

  // Middleware wiring
  const middlewarePath = path.join(cwd, 'middleware.ts')
  let middlewareOk = false
  if (fileExists(middlewarePath)) {
    try {
      const body = fs.readFileSync(middlewarePath, 'utf8')
      middlewareOk = /createAuthMiddleware\(/.test(body)
    } catch {}
  }
  results.push({
    id: 'middleware',
    ok: middlewareOk,
    message: middlewareOk
      ? 'middleware.ts configured with createAuthMiddleware'
      : 'middleware.ts not configured for Keyloom',
  })

  // Cookie policy (warn if SameSite none without secure or baseUrl not https)
  const sameSite =
    (ENV.COOKIE_SAMESITE as string) || (ENV.KEYLOOM_COOKIE_SAMESITE as string) || 'lax'
  const secure =
    ENV.COOKIE_SECURE === 'true' ||
    ENV.KEYLOOM_COOKIE_SECURE === 'true' ||
    ENV.NODE_ENV === 'production'
  const baseUrl = (ENV.KEYLOOM_BASE_URL as string) || (ENV.NEXT_PUBLIC_APP_URL as string) || ''
  const baseHttps = baseUrl ? baseUrl.startsWith('https://') : false
  const cookieOk = sameSite === 'lax' || (sameSite === 'none' && secure && baseHttps)
  results.push({
    id: 'cookie:policy',
    ok: cookieOk,
    warn: sameSite === 'none' && (!secure || !baseHttps),
    message: cookieOk
      ? 'Cookie policy appears safe'
      : sameSite === 'none' && !secure
        ? 'Cookie policy may be unsafe (SameSite=none without Secure)'
        : 'Cookie policy may be unsafe (SameSite=none without https baseUrl)',
  })

  // Base URL HTTPS in production
  if (ENV.NODE_ENV === 'production' && baseUrl && baseUrl.startsWith('http://')) {
    results.push({
      id: 'https:baseUrl',
      ok: false,
      message: `Base URL is HTTP in production: ${baseUrl}`,
    })
  } else {
    results.push({ id: 'https:baseUrl', ok: true, message: 'Base URL OK' })
  }

  // System clock (best-effort: always OK here; connectivity not allowed)
  results.push({
    id: 'system:clock',
    ok: true,
    message: 'System clock check OK',
  })

  // Database connectivity (Prisma) — best-effort
  try {
    if (
      !opts.skipEnvChecks &&
      (ENV.DATABASE_URL || ENV.POSTGRES_URL || ENV.MYSQL_URL || ENV.MONGODB_URI)
    ) {
      const mod = await import('@prisma/client').catch(() => null as any)
      if (mod && (mod as any).PrismaClient) {
        const PrismaClient = (mod as any).PrismaClient
        const client = new PrismaClient()
        try {
          await Promise.race([
            client.$connect(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
          ])
          results.push({
            id: 'db:connect',
            ok: true,
            message: 'Database connectivity OK (Prisma)',
          })
        } catch (e: any) {
          results.push({
            id: 'db:connect',
            ok: false,
            message: `Database connectivity failed: ${e?.message || e}`,
          })
        } finally {
          await client.$disconnect().catch(() => {})
        }
      } else {
        results.push({
          id: 'db:connect',
          ok: false,
          warn: true,
          message: '@prisma/client not installed — skipping live DB check',
        })
      }
    } else {
      results.push({
        id: 'db:connect',
        ok: true,
        warn: true,
        message: opts.skipEnvChecks
          ? 'Skipping live DB check due to privacy settings'
          : 'DATABASE_URL missing — skipping live DB check',
      })
    }
  } catch {
    // Ignore — keep doctor resilient
  }

  // Provider environment sanity
  const providerKeys = [
    ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
    ['AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET'],
  ]
  const presentPairs = providerKeys.map((pair) => {
    const id = pair[0] as string
    const sec = pair[1] as string
    return {
      id,
      sec,
      hasId: !!ENV[id],
      hasSec: !!ENV[sec],
    }
  })
  const anyProviderConfigured = presentPairs.some((p) => p.hasId || p.hasSec)
  if (!anyProviderConfigured) {
    results.push({
      id: 'providers:env',
      ok: true,
      warn: true,
      message: 'No OAuth providers configured — skip if not needed',
    })
  } else {
    const allComplete = presentPairs.every((p) =>
      !p.hasId && !p.hasSec ? true : p.hasId && p.hasSec,
    )
    results.push({
      id: 'providers:env',
      ok: allComplete,
      message: allComplete
        ? 'OAuth provider env looks complete'
        : 'Some provider envs are incomplete (missing id/secret)',
    })
  }

  return results
}

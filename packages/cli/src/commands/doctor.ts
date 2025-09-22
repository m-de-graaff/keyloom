import { runDoctorChecks } from '../lib/doctor/checks'
import { banner, section, step, ui, spinner } from '../lib/ui'

function parseArgs(args: string[]) {
  const out: {
    json?: boolean
    strict?: boolean
    fix?: boolean
    yes?: boolean
    cwd?: string
    skipEnvConsent?: boolean
    noEnvAccess?: boolean
  } = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--json') out.json = true
    else if (a === '--strict') out.strict = true
    else if (a === '--fix') out.fix = true
    else if (a === '--yes') out.yes = true
    else if (a === '--cwd') out.cwd = args[++i]
    else if (a === '--skip-env-consent') out.skipEnvConsent = true
    else if (a === '--no-env-access') out.noEnvAccess = true
  }
  return out
}

function parseEnvContent(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = body.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    v = v.replace(/\\n/g, '\n')
    out[m[1]] = v
  }
  return out
}

function readEnvFiles(cwd: string): Record<string, string> {
  const fs = require('node:fs') as typeof import('node:fs')
  const path = require('node:path') as typeof import('node:path')
  const envName = process.env.NODE_ENV || 'development'
  const order = [
    path.join(cwd, '.env'),
    path.join(cwd, `.env.${envName}`),
    path.join(cwd, `.env.${envName}.local`),
    path.join(cwd, '.env.local'),
  ]
  const env: Record<string, string> = {}
  for (const p of order) {
    try {
      if (!fs.existsSync(p)) continue
      const body = fs.readFileSync(p, 'utf8')
      const parsed = parseEnvContent(body)
      // Later files override earlier ones
      Object.assign(env, parsed)
    } catch {}
  }
  return env
}

export async function doctorCommand(args: string[]) {
  const flags = parseArgs(args)
  const cwd = flags.cwd || process.cwd()

  // Determine consent to read .env files
  const path = await import('node:path')
  const fs = await import('node:fs')
  const { upsertJson } = await import('../lib/fs')

  const skipByFlag = !!(flags.skipEnvConsent || flags.noEnvAccess)
  const configPath = path.join(cwd, '.keyloom', 'config.json')
  let storedConsent: boolean | undefined
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      storedConsent = data?.doctor?.envAccessConsent
    }
  } catch {}

  let consent = false
  if (skipByFlag) {
    consent = false
  } else if (typeof storedConsent === 'boolean') {
    consent = storedConsent
  } else if (!flags.json) {
    const inquirer = (await import('inquirer')).default
    const ans = await inquirer.prompt<{ ok: boolean }>([
      {
        name: 'ok',
        type: 'confirm',
        message:
          'Do you grant Keyloom permission to read your local .env files for analysis? (Nothing is uploaded - this is only for local validation purposes)',
        default: true,
      },
    ])
    consent = !!ans.ok
    try {
      const current = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
        : {}
      const next = {
        ...current,
        doctor: { ...(current.doctor || {}), envAccessConsent: consent },
      }
      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      fs.writeFileSync(configPath, JSON.stringify(next, null, 2) + '\n', 'utf8')
    } catch {}
  } else {
    // JSON mode, no prompt
    consent = false
  }

  const envFromFiles = consent ? readEnvFiles(cwd) : undefined
  const checkOpts = consent ? { env: envFromFiles } : { skipEnvChecks: true }

  // JSON mode: machine-friendly output
  let checks = await runDoctorChecks(cwd, checkOpts as any)
  if (flags.fix && !flags.json) {
    await applyFixes(cwd, checks, { yes: !!flags.yes })
    // re-run after fixes
    checks = await runDoctorChecks(cwd, checkOpts as any)
  }
  if (flags.json) {
    console.log(JSON.stringify({ ok: checks.every((c) => c.ok), checks }, null, 2))
    return
  }

  banner('Keyloom Doctor')

  step(1, 3, 'Project context')
  ui.info(`cwd: ${cwd}`)
  ui.info(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  ui.info(
    consent
      ? 'Env file access: enabled (local read only)'
      : 'Env file access: disabled (privacy mode)',
  )

  step(2, 3, 'Running checks')
  const s = spinner('Evaluating environment and wiring')
  try {
    // We already have checks computed above; simulate spinner work
    await new Promise((r) => setTimeout(r, 200))
    s.succeed('Checks complete')
  } catch {
    s.fail('Checks encountered an error')
  }

  section('Results')
  let okAll = true
  for (const c of checks) {
    okAll &&= c.ok
    if (c.ok) ui.success(`${c.id} — ${c.message}`)
    else if (c.warn) ui.warn(`${c.id} — ${c.message}`)
    else ui.error(`${c.id} — ${c.message}`)
  }

  section('Summary')
  if (okAll) {
    ui.success('All checks passed')
  } else {
    ui.warn('Some checks failed or require attention; see above')
  }

  // Helpful docs
  section('Documentation')
  ui.info('Keyloom docs: https://keyloom.markdegraaff.com/docs')
  if (!okAll) {
    const suggestions = new Set<string>()
    for (const c of checks) {
      if (c.ok) continue
      if (c.id === 'env:AUTH_SECRET') suggestions.add('Environment variables — AUTH_SECRET')
      if (c.id === 'env:DATABASE_URL') suggestions.add('Database setup — DATABASE_URL')
      if (c.id === 'routes:manifest') suggestions.add('Routes manifest generation')
      if (c.id === 'middleware') suggestions.add('Next.js middleware wiring')
      if (c.id === 'cookie:policy') suggestions.add('Cookie configuration & security')
      if (c.id === 'https:baseUrl') suggestions.add('Base URL and HTTPS')
    }
    for (const s of suggestions) ui.info(`- ${s}`)
    ui.info('Tip: run `keyloom doctor --fix` to auto-apply common fixes.')
  }
}

async function applyFixes(
  cwd: string,
  checks: Awaited<ReturnType<typeof runDoctorChecks>>,
  opts: { yes?: boolean } = {},
) {
  const { writeFileSafe } = await import('../lib/fs')
  const fs = await import('node:fs')
  const path = await import('node:path')
  const crypto = await import('node:crypto')
  const inquirer = (await import('inquirer')).default

  const s = spinner('Applying fixes')
  try {
    // 1) AUTH_SECRET generation or reformat
    const authCheck = checks.find((c) => c.id === 'env:AUTH_SECRET')
    if (authCheck && (!authCheck.ok || authCheck.warn)) {
      const doFix = opts.yes
        ? true
        : (
            await inquirer.prompt<{ ok: boolean }>([
              {
                name: 'ok',
                type: 'confirm',
                message: 'Generate and write a secure AUTH_SECRET to .env.local (or .env)?',
                default: true,
              },
            ])
          ).ok
      if (doFix) {
        const secret = crypto.randomBytes(32).toString('base64url')
        // Prefer .env.local if exists or create it
        const envLocal = path.join(cwd, '.env.local')
        const envFile = fs.existsSync(envLocal) ? envLocal : path.join(cwd, '.env')
        let body = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : ''
        if (/^AUTH_SECRET=/m.test(body)) {
          body = body.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${secret}`)
        } else {
          if (body && !body.endsWith('\n')) body += '\n'
          body += `AUTH_SECRET=${secret}\n`
        }
        writeFileSafe(envFile, body, { onExists: 'overwrite' as any })
        ui.success(`Updated AUTH_SECRET in ${path.basename(envFile)}`)
      }
    }

    // 2) Basic keyloom.config.ts stub if missing
    const configPath = path.join(cwd, 'keyloom.config.ts')
    if (!fs.existsSync(configPath)) {
      const doFix = opts.yes
        ? true
        : (
            await inquirer.prompt<{ ok: boolean }>([
              {
                name: 'ok',
                type: 'confirm',
                message: 'Create keyloom.config.ts stub with PrismaAdapter(db)?',
                default: true,
              },
            ])
          ).ok
      if (doFix) {
        const code = `import { PrismaAdapter } from '@keyloom/adapters'\nimport { PrismaClient } from '@prisma/client'\n\nconst db = new PrismaClient()\nexport default {\n  adapter: PrismaAdapter(db),\n  baseUrl: process.env.NEXT_PUBLIC_APP_URL!,\n}\n`
        writeFileSafe(configPath, code, { onExists: 'skip' })
        ui.success('Created keyloom.config.ts stub')
      }
    }

    // 3) Suggest route manifest generation if missing (no auto-run)
    const routesCheck = checks.find((c) => c.id === 'routes:manifest')
    if (routesCheck && !routesCheck.ok) {
      ui.warn('Route manifest not found. You can generate it with:')
      ui.info('  keyloom routes --out .keyloom/routes.generated.ts')
    }

    // 4) Suggest/Stub middleware wiring if missing
    const mwCheck = checks.find((c) => c.id === 'middleware')
    if (mwCheck && !mwCheck.ok) {
      const mwPath = path.join(cwd, 'middleware.ts')
      if (!fs.existsSync(mwPath)) {
        const doFix = opts.yes
          ? true
          : (
              await inquirer.prompt<{ ok: boolean }>([
                {
                  name: 'ok',
                  type: 'confirm',
                  message: 'Create middleware.ts stub using Keyloom default middleware?',
                  default: true,
                },
              ])
            ).ok
        if (doFix) {
          const mwCode = `export { default } from '@keyloom/nextjs/middleware'\n`
          writeFileSafe(mwPath, mwCode, { onExists: 'skip' })
          ui.success('Created middleware.ts stub using Keyloom default middleware')
        }
      } else {
        ui.warn('middleware.ts exists but might not be configured. See docs.')
      }
    }

    s.succeed('Fixes applied')
  } catch (e: any) {
    s.fail('Failed to apply some fixes')
    ui.error(e?.message || String(e))
  }
}

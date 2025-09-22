import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { writeFileSafe } from '../lib/fs'
import { detectAdapter, generateMigration } from './generate'

import { Command } from 'commander'
import inquirer from 'inquirer'
import { banner, section, step, ui, spinner, detection, withCapturedStdout, list } from '../lib/ui'
import {
  installPackages,
  getMissingPackages,
  buildInstallCommand,
  readPackageJson,
} from '../lib/pm'
import { resolveInitDeps, type AdapterChoice, type ProviderChoice } from '../lib/deps'

import { detectNext, detectRouter, detectPackageManager } from '../lib/detect'
import { generateRoutes } from '../lib/index'

function parseArgs(args: string[]) {
  const out: {
    cwd?: string
    yes?: boolean
    preset?: string
    session?: 'database' | 'jwt'
    adapter?: string
    providers?: string[]
    rbac?: boolean
    pm?: string
  } = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--cwd') out.cwd = args[++i]
    else if (a === '--yes' || a === '-y') out.yes = true
    else if (a.startsWith('--preset=')) out.preset = a.split('=')[1]
    else if (a === '--preset') out.preset = args[++i]
    else if (a.startsWith('--session=')) out.session = a.split('=')[1] as any
    else if (a === '--session') out.session = args[++i] as any
    else if (a.startsWith('--adapter=')) out.adapter = a.split('=')[1]
    else if (a === '--adapter') out.adapter = args[++i]
    else if (a.startsWith('--providers=')) out.providers = a.split('=')[1].split(',')
    else if (a === '--providers') out.providers = args[++i].split(',')
    else if (a === '--rbac') out.rbac = true
    else if (a.startsWith('--pm=')) out.pm = a.split('=')[1]
    else if (a === '--pm') out.pm = args[++i]
  }
  return out
}

function detectTs(cwd: string) {
  return fs.existsSync(path.join(cwd, 'tsconfig.json'))
}

function detectPkgManager(cwd: string) {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn'
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun'
  return 'npm'
}

function createConfigBody(opts: {
  ts: boolean
  session: 'database' | 'jwt'
  adapter: string
  providers?: string[]
  issuer?: string
  rbac: boolean
  roles?: string[]
  permissions?: string[]
}) {
  const ext = opts.ts ? 'ts' : 'js'
  const lines: string[] = []
  lines.push("import { defineKeyloom } from '@keyloom/core/config'")

  // Adapter imports and setup
  if (opts.adapter === 'prisma') {
    lines.push("import { PrismaAdapter } from '@keyloom/adapters'")
    lines.push("import { PrismaClient } from '@prisma/client'")
    lines.push('const client = new PrismaClient()')
  } else if (opts.adapter.startsWith('drizzle')) {
    lines.push('// TODO: import drizzle adapter for your dialect and client instance')
  } else if (opts.adapter === 'postgres') {
    lines.push('// TODO: import and setup postgres adapter')
  } else if (opts.adapter === 'mysql2') {
    lines.push('// TODO: import and setup mysql2 adapter')
  } else if (opts.adapter === 'mongo') {
    lines.push('// TODO: import and setup mongo adapter')
  }

  // Provider imports
  const provs = new Set(opts.providers || [])
  if (provs.has('github')) lines.push("import github from '@keyloom/providers/github'")
  if (provs.has('google')) lines.push("import google from '@keyloom/providers/google'")
  if (provs.has('discord')) lines.push("import discord from '@keyloom/providers/discord'")

  // Begin config
  lines.push('\nexport default defineKeyloom({')
  lines.push(`  session: { strategy: '${opts.session}' },`)

  // Adapter usage
  if (opts.adapter === 'prisma') {
    lines.push('  adapter: PrismaAdapter(client),')
  } else {
    lines.push('  // adapter: <your-adapter>(...),')
  }

  // Providers array
  if (provs.size > 0) {
    lines.push('  providers: [')
    if (provs.has('github'))
      lines.push(
        '    github({ clientId: process.env.GITHUB_CLIENT_ID!, clientSecret: process.env.GITHUB_CLIENT_SECRET! }),',
      )
    if (provs.has('google'))
      lines.push(
        '    google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),',
      )
    if (provs.has('discord'))
      lines.push(
        '    discord({ clientId: process.env.DISCORD_CLIENT_ID!, clientSecret: process.env.DISCORD_CLIENT_SECRET! }),',
      )
    lines.push('  ],')
  }

  // RBAC (optional)
  if (opts.rbac) {
    const roles = JSON.stringify(opts.roles || ['admin', 'user'])
    const perms = JSON.stringify(opts.permissions || ['read', 'write'])
    lines.push(`  rbac: { enabled: true, roles: ${roles}, permissions: ${perms} },`)
  }

  // JWT extras (optional)
  if (opts.session === 'jwt') {
    lines.push(`  jwt: { issuer: '${opts.issuer || 'http://localhost:3000'}' },`)
    lines.push('  secrets: { authSecret: process.env.AUTH_SECRET! },')
  }

  lines.push('})')
  lines.push('')

  return { ext, body: lines.join('\n') }
}

function createHandlerBody(router: 'app' | 'pages', ts: boolean) {
  if (router === 'app') {
    return `import { createNextHandler } from '@keyloom/nextjs'\nimport config from '../../../../keyloom.config'\nexport const { GET, POST } = createNextHandler(config)\n`
  }
  // pages
  return `import type { NextApiRequest, NextApiResponse } from 'next'\nimport { createPagesApiHandler } from '@keyloom/nextjs'\nimport config from '../../../keyloom.config'\nconst handler = createPagesApiHandler(config)\nexport default async function auth(req: NextApiRequest, res: NextApiResponse) {\n  return handler(req as any, res as any)\n}\n`
}

function createMiddlewareBody(ts: boolean) {
  return `import { createAuthMiddleware } from '@keyloom/nextjs'\nimport routes from './.keyloom/routes.generated'\nimport config from './keyloom.config'\nexport default createAuthMiddleware(config, { routes })\n`
}

function createEnvExample(opts: { providers: string[]; session: 'database' | 'jwt' }) {
  const lines = [
    `# Keyloom\n# AUTH_SECRET must be base64url and decode to 32 bytes\nAUTH_SECRET=${randomBytes(
      32,
    ).toString('base64url')}\n`,
    `# Database (update to match your DB)\nDATABASE_URL=postgresql://user:password@localhost:5432/mydb?schema=public\n`,
  ]
  if (opts.session === 'jwt') {
    lines.push(`# JWT\nKEYLOOM_JWT_ISSUER=http://localhost:3000\n`)
  }
  if (opts.providers.includes('google')) {
    lines.push(`# Google\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\n`)
  }
  if (opts.providers.includes('github')) {
    lines.push(`# GitHub\nGITHUB_CLIENT_ID=\nGITHUB_CLIENT_SECRET=\n`)
  }
  if (opts.providers.includes('discord')) {
    lines.push(`# Discord\nDISCORD_CLIENT_ID=\nDISCORD_CLIENT_SECRET=\n`)
  }
  return lines.join('\n')
}

export async function initCommand(args: string[]) {
  // Parse flags with commander (keeps backward-compat with manual flags)
  const program = new Command()
    .allowUnknownOption(true)
    .option('--cwd <path>')
    .option('-y, --yes')
    .option('--preset <name>')
    .option('--session <strategy>')
    .option('--adapter <name>')
    .option('--providers <list>')
    .option('--rbac')
    .option('--pm <manager>')
  try {
    program.parse(['node', 'init', ...args], { from: 'user' })
  } catch {}
  const opt = program.opts() as any
  const base = parseArgs(args)
  const flags = { ...base, ...opt } as {
    cwd?: string
    yes?: boolean
    preset?: string
    session?: 'database' | 'jwt'
    adapter?: AdapterChoice
    providers?: string[]
    rbac?: boolean
  }
  if (typeof opt.providers === 'string') flags.providers = opt.providers.split(',')

  const cwd = flags.cwd || process.cwd()
  // Project detection banner (before the stepper)
  const isNext = detectNext(cwd)
  const routerKind = detectRouter(cwd) // 'next-app' | 'next-pages' | 'none'
  const detectionMsg = isNext
    ? routerKind === 'next-app'
      ? 'Next.js App Router project detected'
      : routerKind === 'next-pages'
        ? 'Next.js Pages Router project detected'
        : 'Next.js project detected'
    : 'Generic Node.js project detected'
  detection(detectionMsg)

  banner('Keyloom Init')

  // Step 1: Detect & configure
  const total = 6
  step(1, total, 'Project configuration')
  const ts = detectTs(cwd)
  const includeNext = isNext
  const routerForFiles: 'app' | 'pages' = routerKind === 'next-pages' ? 'pages' : 'app'
  const detectedAdapter = detectAdapter(cwd) as AdapterChoice

  const answers = flags.yes
    ? {}
    : await inquirer.prompt([
        {
          name: 'session',
          type: 'list',
          message: 'Session strategy',
          choices: ['database', 'jwt'],
          default: flags.session || 'database',
        },
        {
          name: 'adapter',
          type: 'list',
          message: 'Database adapter',
          choices: ['prisma', 'drizzle-pg', 'drizzle-mysql', 'postgres', 'mysql2', 'mongo'],
          default: flags.adapter || detectedAdapter,
        },
        {
          name: 'providers',
          type: 'checkbox',
          message: 'OAuth providers',
          choices: [
            { name: 'GitHub', value: 'github' },
            { name: 'Google', value: 'google' },
            { name: 'Discord', value: 'discord' },
          ],
          default: flags.providers || [],
        },
        {
          name: 'rbacEnabled',
          type: 'confirm',
          message: 'Enable RBAC (Role-Based Access Control)?',
          default: flags.rbac ?? true,
        },
        {
          name: 'rbacSetup',
          type: 'confirm',
          message: 'Setup default roles and permissions?',
          default: true,
          when: (ans: any) => ans.rbacEnabled,
        },
        {
          name: 'rbacRoles',
          type: 'checkbox',
          message: 'Select roles to create',
          choices: ['admin', 'user', 'moderator'],
          default: ['admin', 'user'],
          when: (ans: any) => ans.rbacEnabled && ans.rbacSetup,
        },
        {
          name: 'rbacRolesCustom',
          type: 'input',
          message: 'Custom roles (comma-separated, optional)',
          when: (ans: any) => ans.rbacEnabled && ans.rbacSetup,
        },
        {
          name: 'rbacPerms',
          type: 'checkbox',
          message: 'Select permissions to define',
          choices: ['read', 'write', 'delete', 'manage_users'],
          default: ['read', 'write'],
          when: (ans: any) => ans.rbacEnabled && ans.rbacSetup,
        },
        {
          name: 'rbacPermsCustom',
          type: 'input',
          message: 'Custom permissions (comma-separated, optional)',
          when: (ans: any) => ans.rbacEnabled && ans.rbacSetup,
        },
      ])

  const session = (flags.session || (answers as any).session || 'database') as 'database' | 'jwt'
  const adapter = (flags.adapter || (answers as any).adapter || detectedAdapter) as AdapterChoice
  const providers = (flags.providers || (answers as any).providers || []) as ProviderChoice[]
  const rbacEnabled = flags.rbac ?? (answers as any).rbacEnabled ?? true
  const setup = (answers as any).rbacSetup ?? true
  const rolesParsed = ((answers as any).rbacRolesCustom || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
  const permsParsed = ((answers as any).rbacPermsCustom || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
  const roles =
    rbacEnabled && setup
      ? Array.from(
          new Set<string>([...(((answers as any).rbacRoles || []) as string[]), ...rolesParsed]),
        )
      : undefined
  const permissions =
    rbacEnabled && setup
      ? Array.from(
          new Set<string>([...(((answers as any).rbacPerms || []) as string[]), ...permsParsed]),
        )
      : undefined

  ui.info(
    `Detected: TypeScript=${ts ? 'yes' : 'no'}, Router=${includeNext ? routerForFiles : 'none'}`,
  )

  // Step 2: Install dependencies
  step(2, total, 'Install dependencies')
  const deps = resolveInitDeps({ adapter, providers, includeNextjs: includeNext })
  const manager = await detectPackageManager(cwd, (flags as any).pm)
  const missing = getMissingPackages(cwd, deps)
  if (missing.length) {
    const manualCmd = buildInstallCommand(manager as any, missing)
    const s = spinner(`Installing ${missing.length} package(s): ${missing.join(', ')}`)
    try {
      await installPackages({ cwd, manager: manager as any, packages: missing })
      s.succeed('Dependencies installed')
    } catch (e: any) {
      s.fail(`Failed to install dependencies with ${manager}`)
      ui.error(e?.stack || String(e))
      ui.warn('To install manually, run:')
      ui.info(manualCmd)
      process.exit(1)
    }
  } else {
    ui.info('All required dependencies already present.')
  }
  // Verify @keyloom/core is resolvable from cwd
  try {
    const req = createRequire(path.join(cwd, 'package.json'))
    req.resolve('@keyloom/core')
  } catch {
    ui.error("Failed to resolve '@keyloom/core' after installation.")
    const minimal = ['@keyloom/core'] as string[]
    if (includeNext) minimal.push('@keyloom/nextjs')
    if (adapter) minimal.push('@keyloom/adapters')
    const manualCmd = buildInstallCommand(manager as any, minimal)
    ui.warn('To install manually, run:')
    ui.info(manualCmd)
    process.exit(1)
  }

  // Step 3: keyloom.config
  step(3, total, 'Generate configuration')
  const cfgOpts: any = { ts, session, adapter, rbac: rbacEnabled, providers }
  if (roles && roles.length) cfgOpts.roles = roles
  if (permissions && permissions.length) cfgOpts.permissions = permissions
  const { ext, body } = createConfigBody(cfgOpts)
  const created: Array<{ path: string; skipped: boolean }> = []
  const configPath = path.join(cwd, `keyloom.config.${ext}`)
  created.push(writeFileSafe(configPath, body))
  ui.success(`Wrote ${configPath}`)

  // Step 4: Handlers, middleware, env
  step(4, total, 'Scaffold files')
  const handlerPath = (() => {
    if (routerForFiles === 'app') {
      return path.join(cwd, 'app', 'api', 'auth', '[...keyloom]', `route.${ext}`)
    } else {
      const file = `[...keyloom].${ext}`
      return path.join(cwd, 'pages', 'api', 'auth', file)
    }
  })()
  created.push(writeFileSafe(handlerPath, createHandlerBody(routerForFiles, ts)))
  ui.success(`Wrote ${handlerPath}`)

  const middlewarePath = path.join(cwd, `middleware.${ext}`)
  created.push(writeFileSafe(middlewarePath, createMiddlewareBody(ts)))
  ui.success(`Wrote ${middlewarePath}`)

  const envExamplePath = path.join(cwd, '.env.example')
  created.push(writeFileSafe(envExamplePath, createEnvExample({ providers, session })))
  ui.success(`Wrote ${envExamplePath}`)

  // Step 5: Migration artifacts
  step(5, total, 'Generate migration artifacts')
  const s = spinner('Generating migration scaffolding')
  try {
    const { logs } = await withCapturedStdout(() => generateMigration(adapter as any))
    s.succeed('Generated migration artifacts')
    if (logs && logs.length) {
      const preview = logs.slice(0, 5)
      list(preview, 'Details:')
      if (logs.length > 5) ui.info(`... (${logs.length - 5} more)`)
    }
  } catch (e) {
    s.fail('Failed to generate migrations')
    ui.error(String(e))
  }

  // Step 6: Generate route manifest
  step(6, total, 'Generate route manifest')
  const sRoutes = spinner('Scanning and generating routes')
  try {
    const res = await generateRoutes({ cwd })
    sRoutes.succeed('Route manifest generated')
    ui.success(`Wrote ${res.outTs}`)
    ui.success(`Wrote ${res.outJson}`)
  } catch (e) {
    sRoutes.fail('Failed to generate routes manifest')
    ui.warn(String(e))
  }

  // Post-Init Validation
  section('Validation')
  if (includeNext && !detectNext(cwd)) {
    ui.warn(
      "Next.js not detected in this project. Ensure 'next' is listed in dependencies and installed.",
    )
  }
  const pkg = readPackageJson(cwd)
  const hasCore = Boolean(
    pkg?.dependencies?.['@keyloom/core'] || pkg?.devDependencies?.['@keyloom/core'],
  )
  if (!hasCore) {
    ui.warn(
      "'@keyloom/core' was not found in dependencies. Add it with your package manager if you encounter resolution errors.",
    )
  }

  // Summary
  section('Summary')
  const added = created.filter((x) => !x.skipped).map((x) => x.path)
  if (added.length) ui.success(`Created ${added.length} file(s)`)
  ui.info('Next steps:')
  ui.info('- Configure your adapter and providers in keyloom.config')
  ui.info('- Set environment variables in .env')
  ui.info('- Run your database migrations')
}

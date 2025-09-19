import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { ensureDir, writeFileSafe } from "../lib/fs";
import { detectAdapter, generateMigration } from "./generate";

import { Command } from "commander";
import inquirer from "inquirer";
import { banner, section, step, ui, spinner, detection, withCapturedStdout, list } from "../lib/ui";
import { installPackages, getMissingPackages, buildInstallCommand } from "../lib/pm";
import { resolveInitDeps, type AdapterChoice, type ProviderChoice } from "../lib/deps";

import { detectNext, detectRouter, detectPackageManager } from "../lib/detect";
import { generateRoutes } from "../lib/index";

function parseArgs(args: string[]) {
  const out: {
    cwd?: string;
    yes?: boolean;
    preset?: string;
    session?: "database" | "jwt";
    adapter?: string;
    providers?: string[];
    rbac?: boolean;
  } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--cwd") out.cwd = args[++i];
    else if (a === "--yes" || a === "-y") out.yes = true;
    else if (a.startsWith("--preset=")) out.preset = a.split("=")[1];
    else if (a === "--preset") out.preset = args[++i];
    else if (a.startsWith("--session=")) out.session = a.split("=")[1] as any;
    else if (a === "--session") out.session = args[++i] as any;
    else if (a.startsWith("--adapter=")) out.adapter = a.split("=")[1];
    else if (a === "--adapter") out.adapter = args[++i];
    else if (a.startsWith("--providers="))
      out.providers = a.split("=")[1].split(",");
    else if (a === "--providers") out.providers = args[++i].split(",");
    else if (a === "--rbac") out.rbac = true;
  }
  return out;
}


function detectTs(cwd: string) {
  return fs.existsSync(path.join(cwd, "tsconfig.json"));
}

function ensureTsIncludesTypesDir(tsconfigPath: string) {
  try {
    const raw = fs.readFileSync(tsconfigPath, 'utf8');
    const json = JSON.parse(raw);
    const include: string[] = Array.isArray(json.include) ? json.include : [];
    if (!include.includes('types')) {
      json.include = [...include, 'types'];
      fs.writeFileSync(tsconfigPath, JSON.stringify(json, null, 2) + '\n');
      return true;
    }
  } catch {}
  return false;
}

function detectPkgManager(cwd: string) {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "bun.lockb"))) return "bun";
  return "npm";
}

function createConfigBody(opts: {
  ts: boolean;
  session: "database" | "jwt";
  adapter: string;
  issuer?: string;
  rbac: boolean;
  roles?: string[];
  permissions?: string[];
}) {
  const ext = opts.ts ? "ts" : "js";
  const header = `import { defineKeyloom } from '@keyloom/core'\n`;
  const adapterImport =
    opts.adapter === "prisma"
      ? `// TODO: import your Prisma client and pass to prismaAdapter\n// import { prismaAdapter } from '@keyloom/adapters'\n// import { PrismaClient } from '@prisma/client'\n// const client = new PrismaClient()\n`
      : opts.adapter.startsWith("drizzle")
      ? `// TODO: import your Drizzle client and pass to adapter\n// import { createDrizzleAdapter } from '@keyloom/adapter-drizzle'\n`
      : opts.adapter === "postgres"
      ? `// TODO: import and configure Postgres adapter\n// import { postgresAdapter } from '@keyloom/adapters-postgres'\n`
      : opts.adapter === "mysql2"
      ? `// TODO: import and configure MySQL2 adapter\n// import { mysql2Adapter } from '@keyloom/adapters-mysql2'\n`
      : opts.adapter === "mongo"
      ? `// TODO: import and configure Mongo adapter\n// import { mongoAdapter } from '@keyloom/adapters-mongo'\n`
      : `// TODO: configure adapter\n`;
  const adapterConfig = `// adapter: prismaAdapter({ client }),\n`;
  const jwtBlock =
    opts.session === "jwt"
      ? `,\n  jwt: {\n    issuer: '${opts.issuer || "http://localhost:3000"}',\n  }\n`
      : "";
  let rbacBlock = "";
  if (opts.rbac) {
    const roles = JSON.stringify(opts.roles || ["admin", "user"]);
    const perms = JSON.stringify(opts.permissions || ["read", "write"]);
    rbacBlock = `,\n  rbac: { enabled: true, roles: ${roles}, permissions: ${perms} }\n`;
  }
  const body = `${header}${adapterImport}\nexport default defineKeyloom({\n  session: { strategy: '${opts.session}' }${jwtBlock}${rbacBlock}})\n`;
  return { ext, body };
}

function createHandlerBody(router: "app" | "pages", ts: boolean) {
  if (router === "app") {
    return `import { createNextHandler } from '@keyloom/nextjs'\nimport config from '../../../../keyloom.config'\nexport const { GET, POST } = createNextHandler(config)\n`;
  }
  // pages
  return `import type { NextApiRequest, NextApiResponse } from 'next'\nimport { createPagesApiHandler } from '@keyloom/nextjs'\nimport config from '../../../keyloom.config'\nconst handler = createPagesApiHandler(config)\nexport default async function auth(req: NextApiRequest, res: NextApiResponse) {\n  return handler(req as any, res as any)\n}\n`;
}

function createMiddlewareBody(ts: boolean) {
  return `import { createAuthMiddleware } from '@keyloom/nextjs'\nimport routes from './.keyloom/routes.generated'\nimport config from './keyloom.config'\nexport default createAuthMiddleware(config, { routes })\n`;
}

function createEnvExample(opts: {
  providers: string[];
  session: "database" | "jwt";
}) {
  const lines = [
    `# Keyloom\nAUTH_SECRET=${randomBytes(32).toString("hex")}\n`,
    `# Database (update to match your DB)\nDATABASE_URL=postgresql://user:password@localhost:5432/mydb?schema=public\n`,
  ];
  if (opts.session === "jwt") {
    lines.push(`# JWT\nKEYLOOM_JWT_ISSUER=http://localhost:3000\n`);
  }
  if (opts.providers.includes("google")) {
    lines.push(`# Google\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\n`);
  }
  if (opts.providers.includes("github")) {
    lines.push(`# GitHub\nGITHUB_CLIENT_ID=\nGITHUB_CLIENT_SECRET=\n`);
  }
  if (opts.providers.includes("discord")) {
    lines.push(`# Discord\nDISCORD_CLIENT_ID=\nDISCORD_CLIENT_SECRET=\n`);
  }
  return lines.join("\n");
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
    .option('--rbac');
  try { program.parse(['node','init', ...args], { from: 'user' }); } catch {}
  const opt = program.opts() as any;
  const base = parseArgs(args);
  const flags = { ...base, ...opt } as {
    cwd?: string; yes?: boolean; preset?: string;
    session?: 'database' | 'jwt'; adapter?: AdapterChoice; providers?: string[]; rbac?: boolean;
  };
  if (typeof opt.providers === 'string') flags.providers = opt.providers.split(',');

  const cwd = flags.cwd || process.cwd();
  // Project detection banner (before the stepper)
  const isNext = detectNext(cwd);
  const routerKind = detectRouter(cwd); // 'next-app' | 'next-pages' | 'none'
  const detectionMsg = isNext
    ? routerKind === 'next-app'
      ? 'Next.js App Router project detected'
      : routerKind === 'next-pages'
        ? 'Next.js Pages Router project detected'
        : 'Next.js project detected'
    : 'Generic Node.js project detected';
  detection(detectionMsg);

  banner('Keyloom Init');

  // Step 1: Detect & configure
  const total = 7;
  step(1, total, 'Project configuration');
  const ts = detectTs(cwd);
  const includeNext = isNext;
  const routerForFiles: 'app' | 'pages' = routerKind === 'next-pages' ? 'pages' : 'app';
  const detectedAdapter = detectAdapter(cwd) as AdapterChoice;

  const answers = flags.yes ? {} : await inquirer.prompt([
    { name: 'session', type: 'list', message: 'Session strategy', choices: ['database','jwt'], default: flags.session || 'database' },
    { name: 'adapter', type: 'list', message: 'Database adapter', choices: ['prisma','drizzle-pg','drizzle-mysql','postgres','mysql2','mongo'], default: flags.adapter || detectedAdapter },
    { name: 'providers', type: 'checkbox', message: 'OAuth providers', choices: [
        { name: 'GitHub', value: 'github' },
        { name: 'Google', value: 'google' },
        { name: 'Discord', value: 'discord' },
      ], default: flags.providers || [] },
    { name: 'rbacEnabled', type: 'confirm', message: 'Enable RBAC (Role-Based Access Control)?', default: flags.rbac ?? true },
    { name: 'rbacSetup', type: 'confirm', message: 'Setup default roles and permissions?', default: true, when: (ans: any) => ans.rbacEnabled },
    { name: 'rbacRoles', type: 'checkbox', message: 'Select roles to create', choices: ['admin','user','moderator'], default: ['admin','user'], when: (ans: any) => ans.rbacEnabled && ans.rbacSetup },
    { name: 'rbacRolesCustom', type: 'input', message: 'Custom roles (comma-separated, optional)', when: (ans: any) => ans.rbacEnabled && ans.rbacSetup },
    { name: 'rbacPerms', type: 'checkbox', message: 'Select permissions to define', choices: ['read','write','delete','manage_users'], default: ['read','write'], when: (ans: any) => ans.rbacEnabled && ans.rbacSetup },
    { name: 'rbacPermsCustom', type: 'input', message: 'Custom permissions (comma-separated, optional)', when: (ans: any) => ans.rbacEnabled && ans.rbacSetup },
  ]);

  const session = (flags.session || (answers as any).session || 'database') as 'database' | 'jwt';
  const adapter = (flags.adapter || (answers as any).adapter || detectedAdapter) as AdapterChoice;
  const providers = (flags.providers || (answers as any).providers || []) as ProviderChoice[];
  const rbacEnabled = flags.rbac ?? (answers as any).rbacEnabled ?? true;
  const setup = (answers as any).rbacSetup ?? true;
  const rolesParsed = ((answers as any).rbacRolesCustom || '')
    .split(',').map((s: string) => s.trim()).filter(Boolean);
  const permsParsed = ((answers as any).rbacPermsCustom || '')
    .split(',').map((s: string) => s.trim()).filter(Boolean);
  const roles = rbacEnabled && setup ? Array.from(new Set<string>([...(((answers as any).rbacRoles || []) as string[]), ...rolesParsed])) : undefined;
  const permissions = rbacEnabled && setup ? Array.from(new Set<string>([...(((answers as any).rbacPerms || []) as string[]), ...permsParsed])) : undefined;

  ui.info(`Detected: TypeScript=${ts ? 'yes' : 'no'}, Router=${includeNext ? routerForFiles : 'none'}`);

  // Step 2: Install dependencies
  step(2, total, 'Install dependencies');
  const deps = resolveInitDeps({ adapter, providers, includeNextjs: includeNext });
  const missing = getMissingPackages(cwd, deps);
  if (missing.length) {
    const manager = detectPackageManager(cwd);
    const manualCmd = buildInstallCommand(manager as any, missing);
    const s = spinner(`Installing ${missing.length} package(s): ${missing.join(', ')}`);
    try {
      await installPackages({ cwd, manager: manager as any, packages: missing });
      s.succeed('Dependencies installed');
    } catch (e) {
      s.fail(`Failed to install dependencies with ${manager}`);
      const msg: string = (String(e) || '').split('\n')[0] || 'Unknown error';
      ui.error(msg);
      ui.warn('To install manually, run:');
      ui.info(manualCmd);
    }
  } else {
    ui.info('All required dependencies already present.');
  }

  // Step 3: keyloom.config
  step(3, total, 'Generate configuration');
  const cfgOpts: any = { ts, session, adapter, rbac: rbacEnabled };
  if (roles && roles.length) cfgOpts.roles = roles;
  if (permissions && permissions.length) cfgOpts.permissions = permissions;
  const { ext, body } = createConfigBody(cfgOpts);
  const created: Array<{ path: string; skipped: boolean }> = [];
  const configPath = path.join(cwd, `keyloom.config.${ext}`);
  created.push(writeFileSafe(configPath, body));
  ui.success(`Wrote ${configPath}`);

  // Step 4: Handlers, middleware, env
  step(4, total, 'Scaffold files');
  const handlerPath = (() => {
    if (routerForFiles === 'app') {
      return path.join(cwd, 'app', 'api', 'auth', '[...keyloom]', `route.${ext}`);
    } else {
      const file = `[...keyloom].${ext}`;
      return path.join(cwd, 'pages', 'api', 'auth', file);
    }
  })();
  created.push(writeFileSafe(handlerPath, createHandlerBody(routerForFiles, ts)));
  ui.success(`Wrote ${handlerPath}`);

  const middlewarePath = path.join(cwd, `middleware.${ext}`);
  created.push(writeFileSafe(middlewarePath, createMiddlewareBody(ts)));
  ui.success(`Wrote ${middlewarePath}`);

  const envExamplePath = path.join(cwd, '.env.example');
  created.push(writeFileSafe(envExamplePath, createEnvExample({ providers, session })));
  ui.success(`Wrote ${envExamplePath}`);

  // Step 5: Migration artifacts
  step(5, total, 'Generate migration artifacts');
  const s = spinner('Generating migration scaffolding');
  try {
    const { logs } = await withCapturedStdout(() => generateMigration(adapter as any));
    s.succeed('Generated migration artifacts');
    if (logs && logs.length) {
      const preview = logs.slice(0, 5);
      list(preview, 'Details:');
      if (logs.length > 5) ui.info(`... (${logs.length - 5} more)`);
    }
  } catch (e) {
    s.fail('Failed to generate migrations');
    ui.error(String(e));
  }

  // Step 6: Generate route manifest
  step(6, total, 'Generate route manifest');
  const sRoutes = spinner('Scanning and generating routes');
  try {
    const res = await generateRoutes({ cwd });
    sRoutes.succeed('Route manifest generated');
    ui.success(`Wrote ${res.outTs}`);
    ui.success(`Wrote ${res.outJson}`);
  } catch (e) {
    sRoutes.fail('Failed to generate routes manifest');
    ui.warn(String(e));
  }

  // Step 7: Ensure TypeScript declarations (fallback until packages ship .d.ts)
  if (ts) {
    step(7, total, 'Ensure TypeScript declarations');
    const sTypes = spinner('Checking installed Keyloom type declarations');
    try {
      const coreDts = path.join(cwd, 'node_modules', '@keyloom', 'core', 'dist', 'index.d.ts');
      const nextDts = path.join(cwd, 'node_modules', '@keyloom', 'nextjs', 'dist', 'index.d.ts');
      const routeDts = path.join(cwd, 'node_modules', '@keyloom', 'nextjs', 'dist', 'route-types.d.ts');
      const needShim = !fs.existsSync(coreDts) || !fs.existsSync(nextDts) || !fs.existsSync(routeDts);
      if (needShim) {
        const typesDir = path.join(cwd, 'types');
        ensureDir(typesDir);
        const shimPath = path.join(typesDir, 'keyloom-shims.d.ts');
        if (!fs.existsSync(shimPath)) {
          const shim = "declare module '@keyloom/core';\n" +
                       "declare module '@keyloom/nextjs';\n" +
                       "declare module '@keyloom/nextjs/route-types';\n";
          fs.writeFileSync(shimPath, shim);
        }
        ensureTsIncludesTypesDir(path.join(cwd, 'tsconfig.json'));
        sTypes.succeed('Added local Keyloom type shims');
        ui.info('Temporary until packages include .d.ts');
      } else {
        sTypes.succeed('Keyloom packages include type declarations');
      }
    } catch (e) {
      sTypes.fail('Failed to verify/add type declarations');
      ui.warn(String(e));
    }
  }

  // Summary
  section('Summary');
  const added = created.filter((x) => !x.skipped).map((x) => x.path);
  if (added.length) ui.success(`Created ${added.length} file(s)`);
  ui.info('Next steps:');
  ui.info('- Configure your adapter and providers in keyloom.config');
  ui.info('- Set environment variables in .env');
  ui.info('- Run your database migrations');
}

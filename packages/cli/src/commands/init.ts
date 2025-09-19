import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { ensureDir, writeFileSafe } from "../lib/fs";
import { detectAdapter, generateMigration } from "./generate";

import { Command } from "commander";
import inquirer from "inquirer";
import { banner, section, step, ui, spinner } from "../lib/ui";
import { installPackages, getMissingPackages } from "../lib/pm";
import { resolveInitDeps, type AdapterChoice, type ProviderChoice } from "../lib/deps";

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

function detectNextEnv(cwd: string) {
  const hasApp = fs.existsSync(path.join(cwd, "app"));
  const hasPages = fs.existsSync(path.join(cwd, "pages"));
  return { router: hasApp ? "app" : hasPages ? "pages" : "app" } as const;
}

function detectTs(cwd: string) {
  return fs.existsSync(path.join(cwd, "tsconfig.json"));
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
      ? `,\n  jwt: {\n    issuer: '${
          opts.issuer || "http://localhost:3000"
        }',\n  }\n`
      : "";
  const rbacLine = opts.rbac ? ",\n  rbac: { enabled: true }\n" : "";
  const body = `${header}${adapterImport}\nexport default defineKeyloom({\n  session: { strategy: '${opts.session}' }${jwtBlock}${rbacLine}})\n`;
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
  const lines = [`# Keyloom\nAUTH_SECRET=${randomBytes(32).toString("hex")}\n`];
  if (opts.session === "jwt") {
    lines.push(`# JWT\nKEYLOOM_JWT_ISSUER=http://localhost:3000\n`);
  }
  if (opts.providers.includes("google")) {
    lines.push(`# Google\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\n`);
  }
  if (opts.providers.includes("github")) {
    lines.push(`# GitHub\nGITHUB_CLIENT_ID=\nGITHUB_CLIENT_SECRET=\n`);
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
  banner('Keyloom Init');

  // Step 1: Detect & configure
  const total = 5;
  step(1, total, 'Project configuration');
  const ts = detectTs(cwd);
  const nextEnv = detectNextEnv(cwd);
  const includeNext = nextEnv.router === 'app' || nextEnv.router === 'pages';
  const detectedAdapter = detectAdapter(cwd) as AdapterChoice;

  const answers = flags.yes ? {} : await inquirer.prompt([
    { name: 'session', type: 'list', message: 'Session strategy', choices: ['database','jwt'], default: flags.session || 'database' },
    { name: 'adapter', type: 'list', message: 'Database adapter', choices: ['prisma','drizzle-pg','drizzle-mysql','postgres','mysql2','mongo'], default: flags.adapter || detectedAdapter },
    { name: 'providers', type: 'checkbox', message: 'OAuth providers', choices: [
        { name: 'GitHub', value: 'github' },
        { name: 'Google', value: 'google' },
        { name: 'Discord', value: 'discord' },
      ], default: flags.providers || [] },
  ]);

  const session = (flags.session || (answers as any).session || 'database') as 'database' | 'jwt';
  const adapter = (flags.adapter || (answers as any).adapter || detectedAdapter) as AdapterChoice;
  const providers = (flags.providers || (answers as any).providers || []) as ProviderChoice[];
  const rbac = flags.rbac ?? true;
  ui.info(`Detected: TypeScript=${ts ? 'yes' : 'no'}, Router=${nextEnv.router}`);

  // Step 2: Install dependencies
  step(2, total, 'Install dependencies');
  const deps = resolveInitDeps({ adapter, providers, includeNextjs: includeNext });
  const missing = getMissingPackages(cwd, deps);
  if (missing.length) {
    const s = spinner(`Installing ${missing.length} package(s): ${missing.join(', ')}`);
    try {
      const manager = detectPkgManager(cwd) as any;
      await installPackages({ cwd, manager, packages: missing });
      s.succeed('Dependencies installed');
    } catch (e) {
      s.fail('Failed to install dependencies');
      ui.warn('You can install manually with your package manager.');
    }
  } else {
    ui.info('All required dependencies already present.');
  }

  // Step 3: keyloom.config
  step(3, total, 'Generate configuration');
  const { ext, body } = createConfigBody({ ts, session, adapter, rbac });
  const created: Array<{ path: string; skipped: boolean }> = [];
  const configPath = path.join(cwd, `keyloom.config.${ext}`);
  created.push(writeFileSafe(configPath, body));
  ui.success(`Wrote ${configPath}`);

  // Step 4: Handlers, middleware, env
  step(4, total, 'Scaffold files');
  const handlerPath = (() => {
    if (nextEnv.router === 'app') {
      return path.join(cwd, 'app', 'api', 'auth', '[...keyloom]', `route.${ext}`);
    } else {
      const file = `[...keyloom].${ext}`;
      return path.join(cwd, 'pages', 'api', 'auth', file);
    }
  })();
  created.push(writeFileSafe(handlerPath, createHandlerBody(nextEnv.router, ts)));
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
  try { await generateMigration(adapter as any); s.succeed('Generated migration artifacts'); }
  catch { s.fail('Failed to generate migrations'); }

  // Summary
  section('Summary');
  const added = created.filter((x) => !x.skipped).map((x) => x.path);
  if (added.length) ui.success(`Created ${added.length} file(s)`);
  ui.info('Next steps:');
  ui.info('- Configure your adapter and providers in keyloom.config');
  ui.info('- Set environment variables in .env');
  ui.info('- Run your database migrations');
}

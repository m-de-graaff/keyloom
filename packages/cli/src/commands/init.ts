import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { ensureDir, writeFileSafe } from "../lib/fs";
import { detectAdapter, generateMigration } from "./generate";

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
  const flags = parseArgs(args);
  const cwd = flags.cwd || process.cwd();
  const ts = detectTs(cwd);
  const next = detectNextEnv(cwd);
  const adapter = (flags.adapter as any) || detectAdapter(cwd);
  const session = (flags.session as any) || "database";
  const providers = flags.providers || [];
  const rbac = flags.rbac ?? true;

  console.log("keyloom init");

  // keyloom.config
  const { ext, body } = createConfigBody({ ts, session, adapter, rbac });
  const configPath = path.join(cwd, `keyloom.config.${ext}`);
  writeFileSafe(configPath, body);
  console.log(`✔ Wrote ${configPath}`);

  // handler
  const handlerPath = (() => {
    if (next.router === "app") {
      return path.join(
        cwd,
        "app",
        "api",
        "auth",
        "[...keyloom]",
        `route.${ext}`
      );
    } else {
      const file = `[...keyloom].${ext}`;
      return path.join(cwd, "pages", "api", "auth", file);
    }
  })();
  writeFileSafe(handlerPath, createHandlerBody(next.router, ts));
  console.log(`✔ Wrote ${handlerPath}`);

  // middleware
  const middlewarePath = path.join(cwd, `middleware.${ext}`);
  writeFileSafe(middlewarePath, createMiddlewareBody(ts));
  console.log(`✔ Wrote ${middlewarePath}`);

  // env example
  const envExamplePath = path.join(cwd, ".env.example");
  writeFileSafe(envExamplePath, createEnvExample({ providers, session }));
  console.log(`✔ Wrote ${envExamplePath}`);

  // migrations (generator only)
  await generateMigration(adapter as any);
  console.log("✔ Generated migration artifacts (adapter-aware)");

  console.log("Initialization complete.");
}

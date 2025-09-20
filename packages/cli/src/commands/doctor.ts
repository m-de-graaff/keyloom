import { runDoctorChecks } from "../lib/doctor/checks";
import { banner, section, step, ui, spinner } from "../lib/ui";

function parseArgs(args: string[]) {
  const out: {
    json?: boolean;
    strict?: boolean;
    fix?: boolean;
    yes?: boolean;
    cwd?: string;
  } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") out.json = true;
    else if (a === "--strict") out.strict = true;
    else if (a === "--fix") out.fix = true;
    else if (a === "--yes") out.yes = true;
    else if (a === "--cwd") out.cwd = args[++i];
  }
  return out;
}

export async function doctorCommand(args: string[]) {
  const flags = parseArgs(args);
  const cwd = flags.cwd || process.cwd();

  // JSON mode: machine-friendly output
  let checks = await runDoctorChecks(cwd);
  if (flags.fix && !flags.json) {
    await applyFixes(cwd, checks, { yes: !!flags.yes });
    // re-run after fixes
    checks = await runDoctorChecks(cwd);
  }
  if (flags.json) {
    console.log(
      JSON.stringify({ ok: checks.every((c) => c.ok), checks }, null, 2)
    );
    return;
  }

  banner("Keyloom Doctor");

  step(1, 3, "Project context");
  ui.info(`cwd: ${cwd}`);
  ui.info(`NODE_ENV: ${process.env.NODE_ENV || "development"}`);

  step(2, 3, "Running checks");
  const s = spinner("Evaluating environment and wiring");
  try {
    // We already have checks computed above; simulate spinner work
    await new Promise((r) => setTimeout(r, 200));
    s.succeed("Checks complete");
  } catch {
    s.fail("Checks encountered an error");
  }

  section("Results");
  let okAll = true;
  for (const c of checks) {
    okAll &&= c.ok;
    if (c.ok) ui.success(`${c.id} — ${c.message}`);
    else if (c.warn) ui.warn(`${c.id} — ${c.message}`);
    else ui.error(`${c.id} — ${c.message}`);
  }

  section("Summary");
  if (okAll) {
    ui.success("All checks passed");
  } else {
    ui.warn("Some checks failed or require attention; see above");
  }

  // Helpful docs
  section("Documentation");
  ui.info("Keyloom docs: https://keyloom.markdegraaff.com/docs");
  if (!okAll) {
    const suggestions = new Set<string>();
    for (const c of checks) {
      if (c.ok) continue;
      if (c.id === "env:AUTH_SECRET")
        suggestions.add("Environment variables — AUTH_SECRET");
      if (c.id === "env:DATABASE_URL")
        suggestions.add("Database setup — DATABASE_URL");
      if (c.id === "routes:manifest")
        suggestions.add("Routes manifest generation");
      if (c.id === "middleware") suggestions.add("Next.js middleware wiring");
      if (c.id === "cookie:policy")
        suggestions.add("Cookie configuration & security");
      if (c.id === "https:baseUrl") suggestions.add("Base URL and HTTPS");
    }
    for (const s of suggestions) ui.info(`- ${s}`);
    ui.info("Tip: run `keyloom doctor --fix` to auto-apply common fixes.");
  }
}

async function applyFixes(
  cwd: string,
  checks: Awaited<ReturnType<typeof runDoctorChecks>>,
  opts: { yes?: boolean } = {}
) {
  const { writeFileSafe } = await import("../lib/fs");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const crypto = await import("node:crypto");
  const inquirer = (await import("inquirer")).default;

  const s = spinner("Applying fixes");
  try {
    // 1) AUTH_SECRET generation or reformat
    const authCheck = checks.find((c) => c.id === "env:AUTH_SECRET");
    if (authCheck && (!authCheck.ok || authCheck.warn)) {
      const doFix = opts.yes
        ? true
        : (
            await inquirer.prompt<{ ok: boolean }>([
              {
                name: "ok",
                type: "confirm",
                message:
                  "Generate and write a secure AUTH_SECRET to .env.local (or .env)?",
                default: true,
              },
            ])
          ).ok;
      if (doFix) {
        const secret = crypto.randomBytes(32).toString("base64url");
        // Prefer .env.local if exists or create it
        const envLocal = path.join(cwd, ".env.local");
        const envFile = fs.existsSync(envLocal)
          ? envLocal
          : path.join(cwd, ".env");
        let body = fs.existsSync(envFile)
          ? fs.readFileSync(envFile, "utf8")
          : "";
        if (/^AUTH_SECRET=/m.test(body)) {
          body = body.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${secret}`);
        } else {
          if (body && !body.endsWith("\n")) body += "\n";
          body += `AUTH_SECRET=${secret}\n`;
        }
        writeFileSafe(envFile, body, { onExists: "overwrite" as any });
        ui.success(`Updated AUTH_SECRET in ${path.basename(envFile)}`);
      }
    }

    // 2) Basic keyloom.config.ts stub if missing
    const configPath = path.join(cwd, "keyloom.config.ts");
    if (!fs.existsSync(configPath)) {
      const doFix = opts.yes
        ? true
        : (
            await inquirer.prompt<{ ok: boolean }>([
              {
                name: "ok",
                type: "confirm",
                message:
                  "Create keyloom.config.ts stub with PrismaAdapter(db)?",
                default: true,
              },
            ])
          ).ok;
      if (doFix) {
        const code = `import { PrismaAdapter } from '@keyloom/adapters'\nimport { PrismaClient } from '@prisma/client'\n\nconst db = new PrismaClient()\nexport default {\n  adapter: PrismaAdapter(db),\n  baseUrl: process.env.NEXT_PUBLIC_APP_URL!,\n}\n`;
        writeFileSafe(configPath, code, { onExists: "skip" });
        ui.success("Created keyloom.config.ts stub");
      }
    }

    // 3) Suggest route manifest generation if missing (no auto-run)
    const routesCheck = checks.find((c) => c.id === "routes:manifest");
    if (routesCheck && !routesCheck.ok) {
      ui.warn("Route manifest not found. You can generate it with:");
      ui.info("  keyloom routes --out .keyloom/routes.generated.ts");
    }

    // 4) Suggest/Stub middleware wiring if missing
    const mwCheck = checks.find((c) => c.id === "middleware");
    if (mwCheck && !mwCheck.ok) {
      const mwPath = path.join(cwd, "middleware.ts");
      if (!fs.existsSync(mwPath)) {
        const doFix = opts.yes
          ? true
          : (
              await inquirer.prompt<{ ok: boolean }>([
                {
                  name: "ok",
                  type: "confirm",
                  message:
                    "Create middleware.ts stub using Keyloom default middleware?",
                  default: true,
                },
              ])
            ).ok;
        if (doFix) {
          const mwCode = `export { default } from '@keyloom/nextjs/middleware'\n`;
          writeFileSafe(mwPath, mwCode, { onExists: "skip" });
          ui.success(
            "Created middleware.ts stub using Keyloom default middleware"
          );
        }
      } else {
        ui.warn("middleware.ts exists but might not be configured. See docs.");
      }
    }

    s.succeed("Fixes applied");
  } catch (e: any) {
    s.fail("Failed to apply some fixes");
    ui.error(e?.message || String(e));
  }
}

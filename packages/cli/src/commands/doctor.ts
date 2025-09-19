import { runDoctorChecks } from "../lib/doctor/checks";
import { banner, section, step, ui, spinner } from "../lib/ui";

function parseArgs(args: string[]) {
  const out: { json?: boolean; strict?: boolean; cwd?: string } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json") out.json = true;
    else if (a === "--strict") out.strict = true;
    else if (a === "--cwd") out.cwd = args[++i];
  }
  return out;
}

export async function doctorCommand(args: string[]) {
  const flags = parseArgs(args);
  const cwd = flags.cwd || process.cwd();

  // JSON mode: machine-friendly output
  const checks = await runDoctorChecks(cwd);
  if (flags.json) {
    console.log(JSON.stringify({ ok: checks.every((c) => c.ok), checks }, null, 2));
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
      if (c.id === 'env:AUTH_SECRET') suggestions.add("Environment variables — AUTH_SECRET");
      if (c.id === 'env:DATABASE_URL') suggestions.add("Database setup — DATABASE_URL");
      if (c.id === 'routes:manifest') suggestions.add("Routes manifest generation");
      if (c.id === 'middleware') suggestions.add("Next.js middleware wiring");
      if (c.id === 'cookie:policy') suggestions.add("Cookie configuration & security");
      if (c.id === 'https:baseUrl') suggestions.add("Base URL and HTTPS");
    }
    for (const s of suggestions) ui.info(`- ${s}`);
  }
}

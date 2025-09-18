import { runDoctorChecks } from "../lib/doctor/checks";

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
  const checks = await runDoctorChecks(cwd);

  if (flags.json) {
    console.log(
      JSON.stringify({ ok: checks.every((c) => c.ok), checks }, null, 2)
    );
    return;
  }

  console.log("keyloom doctor");
  let okAll = true;
  for (const c of checks) {
    okAll &&= c.ok;
    const status = c.ok ? "✔" : c.warn ? "!" : "✖";
    console.log(`${status} ${c.id} — ${c.message}`);
  }
  console.log(okAll ? "All checks passed" : "Some checks failed; see above");
}

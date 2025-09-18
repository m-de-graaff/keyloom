import { generateMigration, detectAdapter } from "./generate";
import { spawn } from "node:child_process";

function parseArgs(args: string[]) {
  const out: { cwd?: string; dryRun?: boolean; force?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--cwd") out.cwd = args[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--force") out.force = true;
  }
  return out;
}

function run(cmd: string, argv: string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const p = spawn(cmd, argv, { cwd, stdio: "inherit", shell: true });
    p.on("close", (code) => resolve(code ?? 1));
  });
}

export async function migrateCommand(args: string[]) {
  const flags = parseArgs(args);
  const cwd = flags.cwd || process.cwd();
  const adapter = detectAdapter(cwd);

  console.log(`Detected adapter: ${adapter}`);

  const gen = await generateMigration(adapter);
  console.log(`Generated migration artifacts in ${cwd}`);

  if (flags.dryRun) {
    console.log("Dry run: not executing migration commands.");
    return;
  }

  switch (adapter) {
    case "prisma": {
      const code = await run(
        "npx",
        ["prisma", "migrate", "dev", "--name", "keyloom_rbac"],
        cwd
      );
      if (code !== 0) throw new Error("Prisma migrate failed");
      break;
    }
    case "drizzle-pg":
    case "drizzle-mysql": {
      const code = await run("npx", ["drizzle-kit", "migrate"], cwd);
      if (code !== 0) throw new Error("Drizzle migrate failed");
      break;
    }
    case "postgres":
    case "mysql2": {
      console.log(
        "Run your SQL DDL against the database using your preferred tool."
      );
      break;
    }
    case "mongo": {
      console.log(
        "Run the generated Mongo migration script with your mongo client."
      );
      break;
    }
  }

  console.log("Migration complete.");
}

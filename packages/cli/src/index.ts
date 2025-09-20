export async function run(argv: string[]) {
  const [, , cmd, ...args] = argv;
  switch (cmd) {
    case "routes": {
      const { routesCommand } = await import("./commands/routes");
      await routesCommand(args);
      return;
    }
    case "init": {
      const { initCommand } = await import("./commands/init");
      await initCommand(args);
      return;
    }
    case "migrate": {
      const { migrateCommand } = await import("./commands/migrate");
      await migrateCommand(args);
      return;
    }
    case "doctor": {
      const { doctorCommand } = await import("./commands/doctor");
      await doctorCommand(args);
      return;
    }
    case "generate": {
      const { generateCommand } = await import("./commands/generate");
      await generateCommand(args);
      return;
    }
    case "ui": {
      const { uiCommand } = await import("./commands/ui");
      await uiCommand(args);
      return;
    }
    case "scaffold": {
      const { scaffoldCommand } = await import("./commands/scaffold");
      await scaffoldCommand(args);
      return;
    }

    default: {
      console.log("keyloom CLI");
      console.log("Usage:");
      console.log("  keyloom init [options]");
      console.log("  keyloom migrate [options]");
      console.log(
        "  keyloom routes [--out <file>] [--include <glob>] [--exclude <glob>]"
      );
      console.log("  keyloom doctor [--json] [--strict]");
      console.log("  keyloom generate migration");
      console.log(
        "  keyloom scaffold [login|register|admin|settings|forgot-password|reset-password|verify-email|setup-2fa|verify-2fa] [--router app|pages]"
      );
      process.exit(cmd ? 1 : 0);
    }
  }
}

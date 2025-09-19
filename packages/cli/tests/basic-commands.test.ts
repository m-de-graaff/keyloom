import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

// Mock package manager to avoid real installs in tests
vi.mock("../src/lib/pm", () => ({
  installPackages: vi.fn(async () => {}),
  getMissingPackages: vi.fn(() => []),
  buildInstallCommand: vi.fn(() => "pm add"),
}));

const logOutput = () => {
  const lines: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((msg?: unknown) => {
    lines.push(String(msg));
  });
  return { lines, spy };
};

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "keyloom-cli-"));
}

describe("basic commands", () => {
  it("initCommand scaffolds files", async () => {
    const { initCommand } = await import("../src/commands/init");
    const cwd = tmp();
    fs.mkdirSync(path.join(cwd, "app"), { recursive: true });
    const { lines, spy } = logOutput();
    await initCommand(["--yes", "--cwd", cwd]);
    spy.mockRestore();
    expect(lines.some((l) => l.toLowerCase().includes("keyloom init"))).toBe(true);
    expect(
      fs.existsSync(path.join(cwd, "keyloom.config.ts")) ||
        fs.existsSync(path.join(cwd, "keyloom.config.js"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(cwd, "middleware.ts")) ||
        fs.existsSync(path.join(cwd, "middleware.js"))
    ).toBe(true);
  }, 20000);

  it("migrateCommand dry-run works", async () => {
    const { migrateCommand } = await import("../src/commands/migrate");
    const cwd = tmp();
    const { lines, spy } = logOutput();
    await migrateCommand(["--cwd", cwd, "--dry-run"]);
    spy.mockRestore();
    expect(lines.some((l) => l.includes("Detected adapter"))).toBe(true);
  });

  it("doctorCommand runs checks", async () => {
    const { doctorCommand } = await import("../src/commands/doctor");
    const cwd = tmp();
    const { lines, spy } = logOutput();
    await doctorCommand(["--cwd", cwd]);
    spy.mockRestore();
    expect(lines.some((l) => l.toLowerCase().includes("keyloom doctor"))).toBe(true);
  });
});

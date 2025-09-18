import { afterEach, describe, expect, it } from "vitest";
import { runDoctorChecks } from "../src/lib/doctor/checks";

afterEach(() => {
  delete process.env.AUTH_SECRET;
});

describe("doctor checks", () => {
  it("reports missing auth secret", async () => {
    const results = await runDoctorChecks();
    const auth = results.find((r) => r.id === "env:AUTH_SECRET");
    expect(auth?.ok).toBe(false);
    expect(auth?.message).toContain("missing");
  });

  it("reports present auth secret", async () => {
    process.env.AUTH_SECRET = Buffer.from("x".repeat(32)).toString("base64url");
    const results = await runDoctorChecks();
    const auth = results.find((r) => r.id === "env:AUTH_SECRET");
    expect(auth?.ok).toBe(true);
    expect(auth?.message).toContain("present");
  });
});

import { describe, expect, it } from "vitest";
import mysqlAdapter from "../src";

describe("mysql2 adapter (factory)", () => {
  it("returns an adapter object with capabilities", async () => {
    const client = { query: async () => [] } as any;
    const a = mysqlAdapter(client);
    expect(a).toBeTruthy();
    expect(a.capabilities).toBeTruthy();
    const hc = await a.healthCheck();
    expect(hc.status === "healthy" || hc.status === "unhealthy").toBe(true);
  });
});

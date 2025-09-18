import { describe, expect, it } from "vitest";
import postgresAdapter from "../src";

describe("postgres adapter (factory)", () => {
  it("returns an adapter object with capabilities", async () => {
    const client = { query: async () => ({ rows: [] }) } as any;
    const a = postgresAdapter(client);
    expect(a).toBeTruthy();
    expect(a.capabilities).toBeTruthy();
    const hc = await a.healthCheck();
    expect(hc.status === "healthy" || hc.status === "unhealthy").toBe(true);
  });
});

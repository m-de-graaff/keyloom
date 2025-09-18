import { describe, expect, it } from "vitest";
import mongoAdapter from "../src";

describe("mongo adapter (factory)", () => {
  it("returns an adapter object with capabilities", async () => {
    const db = {
      collection: () => ({
        findOne: async () => null,
        insertOne: async () => ({}),
        updateOne: async () => ({}),
        deleteOne: async () => ({}),
      }),
    } as any;
    const a = mongoAdapter(db);
    expect(a).toBeTruthy();
    expect(a.capabilities).toBeTruthy();
    const hc = await a.healthCheck();
    expect(hc.status === "healthy" || hc.status === "unhealthy").toBe(true);
  });
});

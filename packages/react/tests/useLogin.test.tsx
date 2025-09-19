import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SessionProvider } from "@keyloom/react";
import { useLogin } from "@keyloom/react";

describe("useLogin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockImplementation((input: any, init?: any) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/auth/csrf")) {
        return Promise.resolve({ ok: true, json: async () => ({ csrfToken: "t" }) } as any);
      }
      if (url.endsWith("/api/auth/login") && init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ sessionId: "s" }) } as any);
      }
      if (url.endsWith("/api/auth/session")) {
        return Promise.resolve({ ok: true, json: async () => ({ session: { id: "s" }, user: { id: "u", email: "a@b.co", createdAt: new Date(), updatedAt: new Date() } }) } as any);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as any);
    });
  });

  it("performs credential login and refreshes session", async () => {
    const wrapper = ({ children }: any) => <SessionProvider>{children}</SessionProvider>;
    const { result } = renderHook(() => useLogin(), { wrapper });
    await act(async () => {
      const out = await result.current.login({ email: "a@b.co", password: "pw" });
      expect(out.ok).toBe(true);
    });
  });
});


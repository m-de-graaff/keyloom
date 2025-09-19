import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SessionProvider, useSession } from "@keyloom/react";

describe("useSession", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ session: null, user: null }) } as any);
  });

  it("returns unauthenticated by default", async () => {
    const wrapper = ({ children }: any) => <SessionProvider>{children}</SessionProvider>;
    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.data.user).toBeNull();
  });
});


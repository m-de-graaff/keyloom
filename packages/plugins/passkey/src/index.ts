import type { KeyloomPlugin, NextRoute } from "@keyloom/core/plugins";
import { useAuthBasePath } from "@keyloom/react";
import { useCallback, useState } from "react";

// ---- Server plugin ----
export function createPasskeyPlugin(): KeyloomPlugin {
  const routes: NextRoute[] = [
    {
      method: "GET",
      kind: "passkey_supported",
      path: /\/api\/auth\/passkey\/supported$/,
      handler: async () => new Response(JSON.stringify({ ok: true, supported: true }), { status: 200, headers: { "content-type": "application/json" } }),
    },
    {
      method: "POST",
      kind: "passkey_begin_registration",
      path: /\/api\/auth\/passkey\/register\/begin$/,
      handler: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            options: { publicKey: { rp: { name: "Keyloom" }, user: { id: "0", name: "user", displayName: "User" }, challenge: "", pubKeyCredParams: [{ type: "public-key", alg: -7 }] } },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        ),
    },
    {
      method: "POST",
      kind: "passkey_finish_registration",
      path: /\/api\/auth\/passkey\/register\/finish$/,
      handler: async () => new Response(JSON.stringify({ ok: false, error: "not_implemented" }), { status: 501, headers: { "content-type": "application/json" } }),
    },
    {
      method: "POST",
      kind: "passkey_begin_auth",
      path: /\/api\/auth\/passkey\/authenticate\/begin$/,
      handler: async () => new Response(JSON.stringify({ ok: false, error: "not_implemented" }), { status: 501, headers: { "content-type": "application/json" } }),
    },
    {
      method: "POST",
      kind: "passkey_finish_auth",
      path: /\/api\/auth\/passkey\/authenticate\/finish$/,
      handler: async () => new Response(JSON.stringify({ ok: false, error: "not_implemented" }), { status: 501, headers: { "content-type": "application/json" } }),
    },
  ];

  return { name: "passkey", nextRoutes: () => routes };
}

// ---- Client hooks (React) ----
export function usePasskey() {
  const basePath = useAuthBasePath();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | { message: string }>(null);
  const supported = typeof window !== "undefined" && !!(window as any).PublicKeyCredential;

  const signIn = useCallback(async () => {
    if (!supported) return { ok: false, error: "not_supported" } as const;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${basePath}/passkey/authenticate/begin`, { method: "POST" });
      if (!res.ok) return { ok: false, error: `begin_failed:${res.status}` } as const;
      // Real-world: navigator.credentials.get with returned options
      return { ok: false, error: "not_implemented" } as const;
    } catch (e) {
      setError({ message: "Passkey sign-in failed" });
      return { ok: false, error: "error" } as const;
    } finally {
      setLoading(false);
    }
  }, [basePath, supported]);

  return { supported, signIn, loading, error };
}

export function usePasskeyRegistration() {
  const basePath = useAuthBasePath();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | { message: string }>(null);
  const supported = typeof window !== "undefined" && !!(window as any).PublicKeyCredential;

  const register = useCallback(async () => {
    if (!supported) return { ok: false, error: "not_supported" } as const;
    setLoading(true);
    setError(null);
    try {
      const begin = await fetch(`${basePath}/passkey/register/begin`, { method: "POST" });
      if (!begin.ok) return { ok: false, error: `begin_failed:${begin.status}` } as const;
      // TODO: navigator.credentials.create
      return { ok: false, error: "not_implemented" } as const;
    } catch (e) {
      setError({ message: "Passkey registration failed" });
      return { ok: false, error: "error" } as const;
    } finally {
      setLoading(false);
    }
  }, [basePath, supported]);

  return { supported, register, loading, error };
}

export function usePasskeyList() {
  // Placeholder; would GET user's passkeys
  return { passkeys: [] as Array<{ id: string; label?: string }>, refresh: async () => {} };
}

export function usePasskeyDelete() {
  const [loading, setLoading] = useState(false);
  const remove = useCallback(async (_id: string) => {
    setLoading(true);
    try {
      // TODO: POST delete to server when implemented
      return { ok: false, error: "not_implemented" } as const;
    } finally {
      setLoading(false);
    }
  }, []);
  return { remove, loading };
}


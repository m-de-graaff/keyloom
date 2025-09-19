import { useCallback, useMemo, useState } from "react";
import { useSessionContext } from "./context/SessionContext";
import type {
  AuthError,
  AuthFormState,
  AuthStatus,
  EmailVerifyParams,
  LoginParams,
  OAuthParams,
  PasswordRequestParams,
  PasswordResetParams,
  RegisterParams,
  Session,
  SessionResponse,
  User,
} from "./types";
import { authFetch } from "./utils/api";

// Core session hooks
export function useSession(): { data: SessionResponse; status: AuthStatus; error: AuthError; refresh: () => Promise<void> } {
  const { status, session, user, error, refresh } = useSessionContext();
  return { data: { session, user }, status, error, refresh };
}

export function useSessionStatus(): AuthStatus {
  return useSessionContext().status;
}

export function useUser(): { user: User; loading: boolean; error: AuthError } {
  const { user, status, error } = useSessionContext();
  return { user, loading: status === "loading", error };
}

// Utilities
async function getSessionInternal(basePath: string): Promise<SessionResponse> {
  const res = await fetch(`${basePath}/session`, { headers: { accept: "application/json" } });
  if (!res.ok) return { session: null, user: null };
  return (await res.json()) as SessionResponse;
}

export function useSessionRefresh() {
  const { refresh } = useSessionContext();
  return { refresh };
}

// Authentication hooks
export function useLogin() {
  const { basePath, setData } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError>(null);

  const login = useCallback(
    async (params: LoginParams): Promise<{ ok: boolean; session?: Session }> => {
      setLoading(true);
      setError(null);
      try {
        if (params.provider && params.provider !== "credentials") {
          const url = new URL(`${basePath}/oauth/${params.provider}/start`, window.location.origin);
          if (params.callbackUrl) url.searchParams.set("callbackUrl", params.callbackUrl);
          window.location.href = url.toString();
          return { ok: true };
        }
        const res = await authFetch(`${basePath}/login`, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ email: params.email, password: params.password }),
        });
        if (!res.ok) throw new Error(`login_failed:${res.status}`);
        // After login, refresh session
        const data = await getSessionInternal(basePath);
        setData(data);
        return { ok: true, session: data.session };
      } catch (e) {
        setError({ message: "Login failed", cause: e });
        return { ok: false };
      } finally {
        setLoading(false);
      }
    },
    [basePath, setData]
  );

  return { login, loading, error };
}

export function useLogout() {
  const { basePath, setData } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError>(null);
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${basePath}/logout`, { method: "POST", headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`logout_failed:${res.status}`);
      const data = await getSessionInternal(basePath);
      setData(data);
      return { ok: true };
    } catch (e) {
      setError({ message: "Logout failed", cause: e });
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [basePath, setData]);

  return { logout, loading, error };
}

export function useRegister() {
  const { basePath, setData } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError>(null);

  const register = useCallback(async (params: RegisterParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${basePath}/register`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ email: params.email, password: params.password }),
      });
      if (!res.ok) throw new Error(`register_failed:${res.status}`);
      const data = await getSessionInternal(basePath);
      setData(data);
      return { ok: true };
    } catch (e) {
      setError({ message: "Registration failed", cause: e });
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [basePath, setData]);

  return { register, loading, error };
}

export function useOAuth() {
  const { basePath } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError>(null);
  const login = useCallback(async ({ provider, callbackUrl }: OAuthParams) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${basePath}/oauth/${provider}/start`, window.location.origin);
      if (callbackUrl) url.searchParams.set("callbackUrl", callbackUrl);
      window.location.href = url.toString();
    } catch (e) {
      setError({ message: "OAuth start failed", cause: e });
    } finally {
      setLoading(false);
    }
  }, [basePath]);
  return { login, loading, error };
}

// Email verification
export function useEmailVerification() {
  const { basePath } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError>(null);
  const verify = useCallback(async ({ identifier, token }: EmailVerifyParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${basePath}/email/verify`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ identifier, token }),
      });
      if (!res.ok) throw new Error(`email_verify_failed:${res.status}`);
      return { ok: true };
    } catch (e) {
      setError({ message: "Email verification failed", cause: e });
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [basePath]);
  return { verify, loading, error };
}

// Password reset
export function usePasswordReset() {
  const { basePath } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError>(null);

  const request = useCallback(async ({ email }: PasswordRequestParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${basePath}/password/request`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`password_request_failed:${res.status}`);
      return { ok: true };
    } catch (e) {
      setError({ message: "Password reset request failed", cause: e });
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  const reset = useCallback(async ({ identifier, token, newPassword }: PasswordResetParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${basePath}/password/reset`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ identifier, token, newPassword }),
      });
      if (!res.ok) throw new Error(`password_reset_failed:${res.status}`);
      return { ok: true };
    } catch (e) {
      setError({ message: "Password reset failed", cause: e });
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  return { request, reset, loading, error };
}

// Forms & UI helpers
export function useAuthForm<T extends Record<string, any>>(initial: T): AuthFormState<T> {
  const [values, setValues] = useState<T>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AuthError>(null);
  const setValue = useCallback(<K extends keyof T>(k: K, v: T[K]) => setValues((prev) => ({ ...prev, [k]: v })), []);
  const reset = useCallback(() => { setValues(initial); setError(null); setSubmitting(false); }, [initial]);
  const submit = useCallback(async (fn: (values: T) => Promise<void>) => {
    setSubmitting(true);
    setError(null);
    try { await fn(values); } catch (e) { setError({ message: "Submission failed", cause: e }); } finally { setSubmitting(false); }
  }, [values]);
  return useMemo(() => ({ values, setValue, submit, submitting, error, reset }), [values, setValue, submit, submitting, error, reset]);
}

export function useAuthRedirect() {
  return {
    redirect(to: string) {
      if (typeof window !== "undefined") window.location.href = to;
    },
  };
}

export function useAuthError() {
  const { error } = useSessionContext();
  const [localError, setLocalError] = useState<AuthError>(null);
  return { error: localError ?? error, setError: setLocalError };
}

export function useAuthGuard({ requireAuth = true, redirectTo = "/login" }: { requireAuth?: boolean; redirectTo?: string } = {}) {
  const { status } = useSessionContext();
  const { redirect } = useAuthRedirect();
  const allowed = !requireAuth || status === "authenticated";
  if (typeof window !== "undefined" && !allowed && status === "unauthenticated") {
    redirect(redirectTo);
  }
  return { allowed, status };
}

export function usePermissions() {
  // Placeholder: When RBAC info is included in session, expose it here.
  const { user } = useSessionContext();
  return { hasRole: (_role: string) => !!user, roles: [] as string[] };
}

export function useProfile() {
  const { user } = useSessionContext();
  return { user };
}

// Top-level utilities (non-hook)
export async function getSession(basePath = "/api/auth"): Promise<SessionResponse> {
  return getSessionInternal(basePath);
}

export async function signIn(params: LoginParams, basePath = "/api/auth") {
  const ctx = { basePath } as any;
  // Lightweight util; prefer useLogin in components
  if (params.provider && params.provider !== "credentials") {
    const url = new URL(`${basePath}/oauth/${params.provider}/start`, window.location.origin);
    if (params.callbackUrl) url.searchParams.set("callbackUrl", params.callbackUrl);
    window.location.href = url.toString();
    return { ok: true };
  }
  const res = await authFetch(`${basePath}/login`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email: params.email, password: params.password }),
  });
  return { ok: res.ok };
}

export async function signOut(basePath = "/api/auth") {
  const res = await authFetch(`${basePath}/logout`, { method: "POST", headers: { accept: "application/json" } });
  return { ok: res.ok };
}


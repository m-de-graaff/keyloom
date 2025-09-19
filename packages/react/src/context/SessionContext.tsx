import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthError, AuthStatus, Session, SessionResponse, User } from "../types";

export type SessionContextValue = {
  status: AuthStatus;
  session: Session;
  user: User;
  error: AuthError;
  refresh: () => Promise<void>;
  setData: (data: SessionResponse) => void;
  basePath: string;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export type SessionProviderProps = {
  children: React.ReactNode;
  /** Defaults to /api/auth */
  basePath?: string;
  /** If provided and you SSR, hydrates initial state to avoid loading flash */
  initialData?: SessionResponse | null;
  /** Poll for session in background (ms). Set 0/undefined to disable */
  refreshInterval?: number;
  /** Refetch on window focus */
  refetchOnWindowFocus?: boolean;
};

async function fetchSession(basePath: string): Promise<SessionResponse> {
  const res = await fetch(`${basePath}/session`, { headers: { accept: "application/json" } });
  if (!res.ok) return { session: null, user: null };
  return (await res.json()) as SessionResponse;
}

export function SessionProvider({ children, basePath = "/api/auth", initialData, refreshInterval = 0, refetchOnWindowFocus = true }: SessionProviderProps) {
  const [status, setStatus] = useState<AuthStatus>(initialData ? (initialData.session ? "authenticated" : "unauthenticated") : "loading");
  const [session, setSession] = useState<Session>(initialData?.session ?? null);
  const [user, setUser] = useState<User>(initialData?.user ?? null);
  const [error, setError] = useState<AuthError>(null);
  const timer = useRef<number | null>(null);

  const setData = useCallback((data: SessionResponse) => {
    setSession(data.session);
    setUser(data.user);
    setStatus(data.session ? "authenticated" : "unauthenticated");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSession(basePath);
      setError(null);
      setData(data);
    } catch (e) {
      setError({ message: "Failed to refresh session", cause: e });
      setStatus("unauthenticated");
      setSession(null);
      setUser(null);
    }
  }, [basePath, setData]);

  // initial fetch if needed
  useEffect(() => {
    if (!initialData) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // polling
  useEffect(() => {
    if (!refreshInterval) return;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => void refresh(), refreshInterval) as unknown as number;
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [refreshInterval, refresh]);

  // refetch on focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetchOnWindowFocus, refresh]);

  const value = useMemo<SessionContextValue>(() => ({ status, session, user, error, refresh, setData, basePath }), [status, session, user, error, refresh, basePath]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessionContext must be used inside <SessionProvider>");
  return ctx;
}

export function useAuthBasePath(): string {
  return useSessionContext().basePath;
}


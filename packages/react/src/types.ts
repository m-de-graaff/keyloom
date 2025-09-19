import type { Session as CoreSession, User as CoreUser } from "@keyloom/core";

export type Session = CoreSession | null;
export type User = CoreUser | null;

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthError = {
  code?: string;
  message: string;
  cause?: unknown;
} | null;

export type SessionResponse = { session: Session; user: User };

export type AuthFetchOptions = RequestInit & { csrf?: boolean };

export type LoginParams = { email?: string; password?: string; provider?: string; callbackUrl?: string };
export type RegisterParams = { email: string; password: string };
export type OAuthParams = { provider: string; callbackUrl?: string };
export type PasswordRequestParams = { email: string };
export type PasswordResetParams = { identifier: string; token: string; newPassword: string };
export type EmailVerifyParams = { identifier: string; token: string };

export type AuthFormState<T> = {
  values: T;
  setValue<K extends keyof T>(k: K, v: T[K]): void;
  submit(fn: (values: T) => Promise<void>): Promise<void>;
  submitting: boolean;
  error: AuthError;
  reset(): void;
};


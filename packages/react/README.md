# @keyloom/react

React hooks and utilities for Keyloom authentication with automatic CSRF, session management, and SSR safety.

Quick start:

```tsx
import { SessionProvider, useLogin, useSession } from "@keyloom/react";

export function App({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function LoginButton() {
  const { login, loading } = useLogin();
  return (
    <button disabled={loading} onClick={() => login({ email: "a@b.co", password: "pw" })}>
      Sign in
    </button>
  );
}

export function UserInfo() {
  const { data, status } = useSession();
  if (status === "loading") return <p>Loading…</p>;
  if (!data.user) return <p>Signed out</p>;
  return <pre>{JSON.stringify(data.user, null, 2)}</pre>;
}
```


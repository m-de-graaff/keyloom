"use client";
import * as React from "react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { FieldErrorText, FormRow } from "../primitives/form";

export function SignUpForm({
  redirectTo = "/",
  endpoint = "/api/auth/register",
  onSuccess,
}: {
  redirectTo?: string;
  endpoint?: string;
  onSuccess?: (res: any) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function score(pw: string) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s, 4);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Sign up failed");
      onSuccess?.(json);
      if (redirectTo) window.location.href = redirectTo;
    } catch (err: any) {
      setError(err.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormRow label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormRow>
      <FormRow label="Password" htmlFor="password">
        <div className="space-y-2">
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-help"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className="h-1 w-full rounded bg-muted">
            <div
              className={`h-1 rounded transition-all ${
                score(password) <= 1
                  ? "w-1/4 bg-danger"
                  : score(password) === 2
                  ? "w-2/4 bg-warning"
                  : score(password) === 3
                  ? "w-3/4 bg-primary"
                  : "w-full bg-success"
              }`}
            />
          </div>
          <p id="password-help" className="text-xs text-muted-foreground">
            Use at least 8 characters with a mix of letters, numbers, and
            symbols.
          </p>
        </div>
      </FormRow>
      <FormRow label="Confirm Password" htmlFor="confirm">
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={
            confirm.length > 0 && confirm !== password ? true : undefined
          }
        />
      </FormRow>
      {confirm.length > 0 && confirm !== password && (
        <FieldErrorText error="Passwords do not match" />
      )}
      {error && <FieldErrorText error={error} />}
      <Button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

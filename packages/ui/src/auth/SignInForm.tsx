"use client";
import * as React from "react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { FieldErrorText, FormRow } from "../primitives/form";

export function SignInForm({
  redirectTo = "/",
  endpoint = "/api/auth/login",
  onSuccess,
}: {
  redirectTo?: string;
  endpoint?: string;
  onSuccess?: (res: any) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [remember, setRemember] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json.error || json.message || "Sign in failed");
      onSuccess?.(json);
      if (redirectTo) window.location.href = redirectTo;
    } catch (err: any) {
      setError(err.message || "Sign in failed");
      // focus the first error field
      const first = document.querySelector<HTMLInputElement>(
        'input:invalid, [aria-invalid="true"]'
      );
      first?.focus();
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
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
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
      </FormRow>
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Remember me</span>
        </label>
        <a
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          Forgot password?
        </a>
      </div>
      {error && <FieldErrorText error={error} />}
      <Button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        aria-live="polite"
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

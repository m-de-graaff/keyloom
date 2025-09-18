"use client";
import * as React from "react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { FieldErrorText, FormRow } from "../primitives/form";

export function ForgotPasswordForm({
  endpoint = "/api/auth/forgot-password",
  onSuccess,
}: {
  endpoint?: string;
  onSuccess?: (res: any) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.message || "Request failed");
      setSent(true);
      onSuccess?.(json);
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="grid gap-2 text-center">
        <h2 className="text-lg font-medium">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a password reset link to {email}.
        </p>
      </div>
    );
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
      {error && <FieldErrorText error={error} />}
      <Button type="submit" disabled={loading} aria-busy={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}


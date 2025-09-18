"use client";
import * as React from "react";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { FieldErrorText, FormRow } from "../primitives/form";

export function MagicLinkForm({
  endpoint = "/api/auth/magic-link",
  onSent,
}: {
  endpoint?: string;
  onSent?: (res: any) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

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
      if (!res.ok) throw new Error(json.error || "Failed to send magic link");
      setSent(true);
      onSent?.(json);
    } catch (err: any) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  if (sent)
    return (
      <p className="text-sm text-muted-foreground">
        Check your email for a sign-in link.
      </p>
    );

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormRow label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormRow>
      {error && <FieldErrorText error={error} />}
      <Button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send magic link"}
      </Button>
    </form>
  );
}

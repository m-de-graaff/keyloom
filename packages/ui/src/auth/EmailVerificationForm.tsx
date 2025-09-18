"use client";
import * as React from "react";
import { Button } from "../components/button";
import { FieldErrorText } from "../primitives/form";

export function EmailVerificationForm({
  email,
  resendEndpoint = "/api/auth/verification/resend",
  onResent,
}: {
  email?: string;
  resendEndpoint?: string;
  onResent?: (res: any) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function resend() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(resendEndpoint, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.message || "Resend failed");
      setSent(true);
      onResent?.(json);
    } catch (err: any) {
      setError(err.message || "Resend failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 text-center">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">Verify your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a verification link {email ? `to ${email}` : "to your email"}.
        </p>
      </div>
      {error && <FieldErrorText error={error} />}
      <Button onClick={resend} disabled={loading || sent} aria-busy={loading}>
        {sent ? "Sent!" : loading ? "Sending…" : "Resend email"}
      </Button>
    </div>
  );
}


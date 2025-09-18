"use client";
import * as React from "react";
import { AuthLayout } from "../AuthLayout";
import { Providers, type Provider } from "../Providers";
import { SignInForm } from "../SignInForm";

export function SignInPage({
  providers,
  callbackUrl,
  onSuccess,
  title = "Welcome back",
  subtitle = "Sign in to your account",
}: {
  providers?: Provider[];
  callbackUrl?: string;
  onSuccess?: (res: any) => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      footer={
        <span>
          Don't have an account?{" "}
          <a className="text-primary hover:underline" href="/sign-up">
            Create one
          </a>
        </span>
      }
    >
      {providers && providers.length > 0 && (
        <div className="grid gap-2">
          <Providers
            providers={providers}
            {...(callbackUrl ? { callbackUrl } : {})}
          />
          <div className="relative text-center text-xs text-muted-foreground">
            <span className="bg-background px-2">or continue with email</span>
            <div className="absolute left-0 right-0 top-1/2 -z-10 h-px -translate-y-1/2 bg-border" />
          </div>
        </div>
      )}
      <SignInForm {...(onSuccess ? { onSuccess } : {})} />
    </AuthLayout>
  );
}

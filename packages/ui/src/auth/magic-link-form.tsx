"use client";

import React, { useState, useContext } from "react";
import { Button } from "../components/button";
import { Input } from "../components/input";
import { Label } from "../components/label";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { AuthUIProviderContext } from "../lib/auth-ui-provider";
import type { FetchError } from "../types/fetch-error";

export interface MagicLinkFormProps {
  /** Custom API endpoint for magic link request */
  requestEndpoint?: string;
  /** Custom redirect URL after successful authentication */
  redirectTo?: string;
  /** Custom TTL for magic link in minutes */
  ttlMinutes?: number;
  /** Initial email value */
  email?: string;
  /** Custom CSS classes */
  className?: string;
  /** Custom success handler */
  onSuccess?: (result: any) => void;
  /** Custom error handler */
  onError?: (error: FetchError) => void;
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string;
    form?: string;
    input?: string;
    button?: string;
    success?: string;
    error?: string;
  };
}

export function MagicLinkForm({
  requestEndpoint = "/api/auth/magic-link/request",
  redirectTo = "/",
  ttlMinutes = 15,
  email: initialEmail = "",
  className,
  onSuccess,
  onError,
  classNames,
}: MagicLinkFormProps) {
  const context = useContext(AuthUIProviderContext);
  const { localization, toast, navigate, viewPaths, basePath } = context || {};

  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(requestEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          redirectTo,
          ttlMinutes,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          result.error || result.message || "Failed to send magic link";
        throw new Error(errorMessage);
      }

      setIsSuccess(true);

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message:
            localization?.MAGIC_LINK_SENT ||
            "Magic link sent! Check your email.",
        });
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send magic link";
      setError(errorMessage);

      // Show error toast
      if (toast) {
        toast({
          variant: "error",
          message: errorMessage,
        });
      }

      // Call custom error handler
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    if (navigate && viewPaths?.auth?.signIn) {
      navigate(viewPaths.auth.signIn);
    } else if (typeof window !== "undefined") {
      window.location.href = `${basePath || ""}/sign-in`;
    }
  };

  if (isSuccess) {
    return (
      <div className={`space-y-6 ${className || ""}`}>
        <div className={`text-center space-y-4 ${classNames?.success || ""}`}>
          <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {localization?.MAGIC_LINK_SENT_TITLE || "Check your email"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {localization?.MAGIC_LINK_SENT_DESCRIPTION ||
                `We've sent a magic link to ${email}. Click the link in the email to sign in.`}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>
              {localization?.MAGIC_LINK_EXPIRES ||
                `The link will expire in ${ttlMinutes} minutes.`}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleBackToSignIn}
            className={classNames?.button}
          >
            {localization?.BACK_TO_SIGN_IN || "Back to sign in"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ""}`}>
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          {localization?.MAGIC_LINK_TITLE || "Sign in with magic link"}
        </h2>
        <p className="text-muted-foreground">
          {localization?.MAGIC_LINK_DESCRIPTION ||
            "Enter your email address and we'll send you a magic link to sign in."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`space-y-4 ${classNames?.form || ""}`}
      >
        <div className="space-y-2">
          <Label htmlFor="email">
            {localization?.EMAIL_LABEL || "Email address"}
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={localization?.EMAIL_PLACEHOLDER || "Enter your email"}
            required
            disabled={isLoading}
            className={classNames?.input}
          />
        </div>

        {error && (
          <div
            className={`text-sm text-destructive ${classNames?.error || ""}`}
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !email}
          className={`w-full ${classNames?.button || ""}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {localization?.SENDING_MAGIC_LINK || "Sending magic link..."}
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              {localization?.SEND_MAGIC_LINK || "Send magic link"}
            </>
          )}
        </Button>
      </form>

      <div className="text-center">
        <Button
          variant="ghost"
          onClick={handleBackToSignIn}
          className="text-sm"
        >
          {localization?.BACK_TO_SIGN_IN || "Back to sign in"}
        </Button>
      </div>
    </div>
  );
}

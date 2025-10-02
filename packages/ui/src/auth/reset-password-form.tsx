"use client";

import * as React from "react";
import { useState, useContext, useEffect } from "react";
import clsx from "clsx";
import { EyeIcon, EyeOffIcon, Loader2, CheckIcon } from "lucide-react";
import { AuthUIProviderContext } from "../lib/auth-ui-provider";
import { Button } from "../components/button";
import { Input } from "../components/input";
import { FormRow, FieldErrorText } from "../primitives/form";
import { getSearchParam } from "../lib/utils";
import type { FetchError } from "../types";

export interface ResetPasswordFormProps {
  /** Custom API endpoint for reset password */
  endpoint?: string;
  /** Custom redirect URL after successful reset */
  redirectTo?: string;
  /** Reset token (if not provided, will be extracted from URL) */
  token?: string;
  /** Custom CSS classes */
  className?: string;
  /** Whether to show password strength indicator */
  showPasswordStrength?: boolean;
  /** Custom success handler */
  onSuccess?: (result: any) => void;
  /** Custom error handler */
  onError?: (error: FetchError) => void;
  /** Custom CSS classes for different parts */
  classNames?: {
    form?: string;
    field?: string;
    input?: string;
    button?: string;
    error?: string;
    success?: string;
    passwordStrength?: string;
    signInLink?: string;
  };
}

export function ResetPasswordForm({
  endpoint = "/api/auth/reset-password",
  redirectTo = "/auth/sign-in",
  token: tokenProp,
  className,
  showPasswordStrength = true,
  onSuccess,
  onError,
  classNames,
}: ResetPasswordFormProps) {
  const context = useContext(AuthUIProviderContext);
  const { localization, toast, navigate, viewPaths, basePath } = context || {};

  const [token, setToken] = useState(tokenProp || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract token from URL if not provided
  useEffect(() => {
    if (!tokenProp) {
      const urlToken = getSearchParam("token");
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, [tokenProp]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 4);
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!token) {
      setError(
        localization?.INVALID_RESET_TOKEN || "Invalid or missing reset token"
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        localization?.PASSWORDS_DO_NOT_MATCH || "Passwords do not match"
      );
      return;
    }

    if (password.length < 8) {
      setError(
        localization?.PASSWORD_TOO_SHORT ||
          "Password must be at least 8 characters"
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          result.error || result.message || "Failed to reset password";
        throw new Error(errorMessage);
      }

      setIsSuccess(true);

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message:
            localization?.PASSWORD_RESET_SUCCESS ||
            "Password reset successfully!",
        });
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result);
      } else {
        // Default behavior: redirect after a short delay
        setTimeout(() => {
          if (navigate) {
            navigate(redirectTo);
          } else if (typeof window !== "undefined") {
            window.location.href = redirectTo;
          }
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to reset password";
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

  // Build sign in URL
  const signInUrl = viewPaths?.auth?.["sign-in"]
    ? `${basePath}/${viewPaths.auth["sign-in"]}`
    : "/auth/sign-in";

  if (isSuccess) {
    return (
      <div
        className={clsx(
          "text-center space-y-4",
          classNames?.success,
          className
        )}
      >
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {localization?.PASSWORD_RESET_SUCCESS ||
              "Password reset successfully!"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {localization?.PASSWORD_RESET_SUCCESS_DESCRIPTION ||
              "Your password has been updated. You can now sign in with your new password."}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {localization?.REDIRECTING_TO_SIGN_IN || "Redirecting to sign in..."}
        </p>

        <a
          href={signInUrl}
          className={clsx(
            "inline-flex items-center text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded",
            classNames?.signInLink
          )}
        >
          {localization?.CONTINUE_TO_SIGN_IN || "Continue to sign in"} →
        </a>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={clsx("text-center space-y-4", className)}>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-destructive">
            {localization?.INVALID_RESET_LINK || "Invalid reset link"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {localization?.INVALID_RESET_LINK_DESCRIPTION ||
              "This password reset link is invalid or has expired. Please request a new one."}
          </p>
        </div>

        <a
          href={
            viewPaths?.auth?.["forgot-password"]
              ? `${basePath}/${viewPaths.auth["forgot-password"]}`
              : "/auth/forgot-password"
          }
          className={clsx(
            "inline-flex items-center text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded",
            classNames?.signInLink
          )}
        >
          {localization?.REQUEST_NEW_RESET_LINK || "Request new reset link"} →
        </a>
      </div>
    );
  }

  const isFormValid =
    password &&
    confirmPassword &&
    password === confirmPassword &&
    password.length >= 8;

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx("space-y-4", classNames?.form, className)}
      noValidate
    >
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">
          {localization?.RESET_PASSWORD || "Reset your password"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {localization?.RESET_PASSWORD_DESCRIPTION ||
            "Enter your new password below."}
        </p>
      </div>

      {/* Password Field */}
      <FormRow
        label={localization?.NEW_PASSWORD || "New password"}
        htmlFor="reset-password"
        className={classNames?.field}
      >
        <div className="space-y-2">
          <div className="relative">
            <Input
              id="reset-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                localization?.PASSWORD_PLACEHOLDER || "Enter your new password"
              }
              className={clsx("pr-10", classNames?.input)}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {showPasswordStrength && password && (
            <div className={clsx("space-y-1", classNames?.passwordStrength)}>
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < passwordStrength
                        ? strengthColors[passwordStrength]
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {localization?.PASSWORD_STRENGTH || "Password strength"}:{" "}
                {strengthLabels[passwordStrength]}
              </p>
            </div>
          )}
        </div>
      </FormRow>

      {/* Confirm Password Field */}
      <FormRow
        label={localization?.CONFIRM_PASSWORD || "Confirm password"}
        htmlFor="reset-confirm-password"
        className={classNames?.field}
      >
        <div className="relative">
          <Input
            id="reset-confirm-password"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={
              localization?.CONFIRM_PASSWORD_PLACEHOLDER ||
              "Confirm your new password"
            }
            className={clsx("pr-10", classNames?.input)}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </FormRow>

      {/* Error Message */}
      {error && <FieldErrorText error={error} className={classNames?.error} />}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || !isFormValid}
        className={clsx("w-full", classNames?.button)}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {localization?.RESET_PASSWORD || "Reset password"}
      </Button>

      {/* Back to Sign In Link */}
      <div className="text-center">
        <a
          href={signInUrl}
          className={clsx(
            "inline-flex items-center text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded",
            classNames?.signInLink
          )}
        >
          ← {localization?.BACK_TO_SIGN_IN || "Back to sign in"}
        </a>
      </div>
    </form>
  );
}

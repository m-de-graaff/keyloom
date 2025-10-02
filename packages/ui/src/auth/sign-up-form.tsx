"use client";

import * as React from "react";
import { useState, useContext } from "react";
import clsx from "clsx";
import { EyeIcon, EyeOffIcon, Loader2, CheckIcon, XIcon } from "lucide-react";
import { AuthUIProviderContext } from "../lib/auth-ui-provider";
import { Button } from "../components/button";
import { Input } from "../components/input";
import { Checkbox } from "../components/checkbox";
import { FormRow, FieldErrorText } from "../primitives/form";
import type { FetchError } from "../types";

export interface SignUpFormProps {
  /** Custom redirect URL after successful sign up */
  redirectTo?: string;
  /** Custom API endpoint for sign up */
  endpoint?: string;
  /** Custom CSS classes */
  className?: string;
  /** Whether to show name fields */
  showNameFields?: boolean;
  /** Whether to require name fields */
  requireName?: boolean;
  /** Whether to show terms and conditions checkbox */
  showTermsCheckbox?: boolean;
  /** Terms and conditions URL */
  termsUrl?: string;
  /** Privacy policy URL */
  privacyUrl?: string;
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
    checkbox?: string;
    link?: string;
    error?: string;
    passwordStrength?: string;
  };
}

export function SignUpForm({
  redirectTo = "/",
  endpoint = "/api/auth/register",
  className,
  showNameFields = true,
  requireName = false,
  showTermsCheckbox = true,
  termsUrl = "/terms",
  privacyUrl = "/privacy",
  showPasswordStrength = true,
  onSuccess,
  onError,
  classNames,
}: SignUpFormProps) {
  const context = useContext(AuthUIProviderContext);
  const { localization, toast, navigate, nameRequired } = context || {};

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (password !== confirmPassword) {
      setError(
        localization?.PASSWORDS_DO_NOT_MATCH || "Passwords do not match"
      );
      return;
    }

    if (showTermsCheckbox && !acceptTerms) {
      setError(
        localization?.MUST_ACCEPT_TERMS ||
          "You must accept the terms and conditions"
      );
      return;
    }

    if (
      (requireName || nameRequired) &&
      (!firstName.trim() || !lastName.trim())
    ) {
      setError(
        localization?.NAME_REQUIRED || "First and last name are required"
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
          email,
          password,
          ...(showNameFields && {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          }),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Sign up failed";
        throw new Error(errorMessage);
      }

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message:
            localization?.SIGN_UP_SUCCESS || "Account created successfully!",
        });
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result);
      } else {
        // Default behavior: redirect
        if (navigate) {
          navigate(redirectTo);
        } else if (typeof window !== "undefined") {
          window.location.href = redirectTo;
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Sign up failed";
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

  const isFormValid =
    email &&
    password &&
    password === confirmPassword &&
    (!showTermsCheckbox || acceptTerms) &&
    (!(requireName || nameRequired) || (firstName.trim() && lastName.trim()));

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx("grid gap-4", classNames?.form, className)}
      noValidate
    >
      {/* Name Fields */}
      {showNameFields && (
        <div className="grid grid-cols-2 gap-4">
          <FormRow
            label={localization?.FIRST_NAME || "First name"}
            htmlFor="signup-firstname"
            className={classNames?.field}
          >
            <Input
              id="signup-firstname"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required={requireName || nameRequired}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={localization?.FIRST_NAME_PLACEHOLDER || "First name"}
              className={classNames?.input}
              disabled={isLoading}
            />
          </FormRow>

          <FormRow
            label={localization?.LAST_NAME || "Last name"}
            htmlFor="signup-lastname"
            className={classNames?.field}
          >
            <Input
              id="signup-lastname"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required={requireName || nameRequired}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={localization?.LAST_NAME_PLACEHOLDER || "Last name"}
              className={classNames?.input}
              disabled={isLoading}
            />
          </FormRow>
        </div>
      )}

      {/* Email Field */}
      <FormRow
        label={localization?.EMAIL || "Email"}
        htmlFor="signup-email"
        className={classNames?.field}
      >
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={localization?.EMAIL_PLACEHOLDER || "Enter your email"}
          className={classNames?.input}
          disabled={isLoading}
        />
      </FormRow>

      {/* Confirm Password Field */}
      <FormRow
        label={localization?.CONFIRM_PASSWORD || "Confirm password"}
        htmlFor="signup-confirm-password"
        className={classNames?.field}
      >
        <div className="relative">
          <Input
            id="signup-confirm-password"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={
              localization?.CONFIRM_PASSWORD_PLACEHOLDER ||
              "Confirm your password"
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

          {/* Password match indicator */}
          {confirmPassword && (
            <div className="absolute inset-y-0 right-8 flex items-center pr-2">
              {password === confirmPassword ? (
                <CheckIcon className="h-4 w-4 text-green-500" />
              ) : (
                <XIcon className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
      </FormRow>

      {/* Terms and Conditions */}
      {showTermsCheckbox && (
        <div className="flex items-start space-x-2">
          <Checkbox
            id="accept-terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked === true)}
            className={clsx("mt-0.5", classNames?.checkbox)}
            disabled={isLoading}
          />
          <label
            htmlFor="accept-terms"
            className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
          >
            {localization?.ACCEPT_TERMS || "I agree to the"}{" "}
            <a
              href={termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                "text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded",
                classNames?.link
              )}
            >
              {localization?.TERMS_OF_SERVICE || "Terms of Service"}
            </a>{" "}
            and{" "}
            <a
              href={privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                "text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded",
                classNames?.link
              )}
            >
              {localization?.PRIVACY_POLICY || "Privacy Policy"}
            </a>
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && <FieldErrorText error={error} className={classNames?.error} />}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || !isFormValid}
        className={classNames?.button}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {localization?.CREATE_ACCOUNT || "Create account"}
      </Button>
    </form>
  );
}

"use client"

import * as React from "react"
import { useState, useContext } from "react"
import clsx from "clsx"
import { Loader2, CheckIcon } from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Button } from "../components/button"
import { Input } from "../components/input"
import { FormRow, FieldErrorText } from "../primitives/form"
import type { FetchError } from "../types"

export interface ForgotPasswordFormProps {
  /** Custom API endpoint for forgot password */
  endpoint?: string
  /** Custom CSS classes */
  className?: string
  /** Custom success handler */
  onSuccess?: (result: any) => void
  /** Custom error handler */
  onError?: (error: FetchError) => void
  /** Custom CSS classes for different parts */
  classNames?: {
    form?: string
    field?: string
    input?: string
    button?: string
    error?: string
    success?: string
    backLink?: string
  }
}

export function ForgotPasswordForm({
  endpoint = "/api/auth/forgot-password",
  className,
  onSuccess,
  onError,
  classNames,
}: ForgotPasswordFormProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, toast, viewPaths, basePath } = context || {}

  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to send reset email"
        throw new Error(errorMessage)
      }

      setIsSuccess(true)

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.RESET_EMAIL_SENT || "Password reset email sent!",
        })
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send reset email"
      setError(errorMessage)

      // Show error toast
      if (toast) {
        toast({
          variant: "error",
          message: errorMessage,
        })
      }

      // Call custom error handler
      if (onError) {
        onError(err)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Build sign in URL
  const signInUrl = viewPaths?.auth?.["sign-in"] 
    ? `${basePath}/${viewPaths.auth["sign-in"]}`
    : "/auth/sign-in"

  if (isSuccess) {
    return (
      <div className={clsx("text-center space-y-4", classNames?.success, className)}>
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {localization?.CHECK_YOUR_EMAIL || "Check your email"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {localization?.RESET_EMAIL_SENT_DESCRIPTION || 
              `We've sent a password reset link to ${email}`}
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            {localization?.DIDNT_RECEIVE_EMAIL || "Didn't receive the email? Check your spam folder or"}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsSuccess(false)
              setEmail("")
            }}
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
          >
            {localization?.TRY_AGAIN || "try again"}
          </button>
        </div>

        <a
          href={signInUrl}
          className={clsx(
            "inline-flex items-center text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded",
            classNames?.backLink
          )}
        >
          ← {localization?.BACK_TO_SIGN_IN || "Back to sign in"}
        </a>
      </div>
    )
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      className={clsx("space-y-4", classNames?.form, className)}
      noValidate
    >
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">
          {localization?.FORGOT_PASSWORD || "Forgot your password?"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {localization?.FORGOT_PASSWORD_DESCRIPTION || 
            "Enter your email address and we'll send you a link to reset your password."}
        </p>
      </div>

      {/* Email Field */}
      <FormRow 
        label={localization?.EMAIL || "Email"} 
        htmlFor="forgot-email"
        className={classNames?.field}
      >
        <Input
          id="forgot-email"
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

      {/* Error Message */}
      {error && (
        <FieldErrorText 
          error={error} 
          className={classNames?.error}
        />
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading || !email}
        className={clsx("w-full", classNames?.button)}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {localization?.SEND_RESET_EMAIL || "Send reset email"}
      </Button>

      {/* Back to Sign In Link */}
      <div className="text-center">
        <a
          href={signInUrl}
          className={clsx(
            "inline-flex items-center text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded",
            classNames?.backLink
          )}
        >
          ← {localization?.BACK_TO_SIGN_IN || "Back to sign in"}
        </a>
      </div>
    </form>
  )
}

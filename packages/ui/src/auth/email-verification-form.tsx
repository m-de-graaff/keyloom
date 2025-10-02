"use client"

import * as React from "react"
import { useState, useContext, useEffect } from "react"
import clsx from "clsx"
import { Loader2, CheckIcon, MailIcon, RefreshCwIcon } from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Button } from "../components/button"
import { getSearchParam } from "../lib/utils"
import type { FetchError } from "../types"

export interface EmailVerificationFormProps {
  /** Custom API endpoint for email verification */
  verifyEndpoint?: string
  /** Custom API endpoint for resending verification email */
  resendEndpoint?: string
  /** Custom redirect URL after successful verification */
  redirectTo?: string
  /** Verification token (if not provided, will be extracted from URL) */
  token?: string
  /** Email address (if not provided, will be extracted from URL or context) */
  email?: string
  /** Custom CSS classes */
  className?: string
  /** Custom success handler */
  onSuccess?: (result: any) => void
  /** Custom error handler */
  onError?: (error: FetchError) => void
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string
    success?: string
    error?: string
    button?: string
    resendButton?: string
    signInLink?: string
  }
}

export function EmailVerificationForm({
  verifyEndpoint = "/api/auth/verify-email",
  resendEndpoint = "/api/auth/resend-verification",
  redirectTo = "/",
  token: tokenProp,
  email: emailProp,
  className,
  onSuccess,
  onError,
  classNames,
}: EmailVerificationFormProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, toast, navigate, viewPaths, basePath } = context || {}

  const [token, setToken] = useState(tokenProp || "")
  const [email, setEmail] = useState(emailProp || "")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Extract token and email from URL if not provided
  useEffect(() => {
    if (!tokenProp) {
      const urlToken = getSearchParam("token")
      if (urlToken) {
        setToken(urlToken)
      }
    }
    
    if (!emailProp) {
      const urlEmail = getSearchParam("email")
      if (urlEmail) {
        setEmail(urlEmail)
      }
    }
  }, [tokenProp, emailProp])

  // Auto-verify if token is present
  useEffect(() => {
    if (token && !isSuccess && !isVerifying) {
      handleVerify()
    }
  }, [token])

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleVerify = async () => {
    if (!token) return

    setError(null)
    setIsVerifying(true)

    try {
      const response = await fetch(verifyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Email verification failed"
        throw new Error(errorMessage)
      }

      setIsSuccess(true)

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.EMAIL_VERIFIED_SUCCESS || "Email verified successfully!",
        })
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result)
      } else {
        // Default behavior: redirect after a short delay
        setTimeout(() => {
          if (navigate) {
            navigate(redirectTo)
          } else if (typeof window !== "undefined") {
            window.location.href = redirectTo
          }
        }, 2000)
      }
    } catch (err: any) {
      const errorMessage = err.message || "Email verification failed"
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
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return

    setError(null)
    setIsResending(true)

    try {
      const response = await fetch(resendEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to resend verification email"
        throw new Error(errorMessage)
      }

      // Start cooldown
      setResendCooldown(60)

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.VERIFICATION_EMAIL_SENT || "Verification email sent!",
        })
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to resend verification email"
      setError(errorMessage)

      // Show error toast
      if (toast) {
        toast({
          variant: "error",
          message: errorMessage,
        })
      }
    } finally {
      setIsResending(false)
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
            {localization?.EMAIL_VERIFIED_SUCCESS || "Email verified successfully!"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {localization?.EMAIL_VERIFIED_SUCCESS_DESCRIPTION || 
              "Your email has been verified. You can now access your account."}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {localization?.REDIRECTING || "Redirecting..."}
        </p>

        <Button
          onClick={() => {
            if (navigate) {
              navigate(redirectTo)
            } else if (typeof window !== "undefined") {
              window.location.href = redirectTo
            }
          }}
          className={classNames?.button}
        >
          {localization?.CONTINUE || "Continue"}
        </Button>
      </div>
    )
  }

  return (
    <div className={clsx("text-center space-y-6", classNames?.container, className)}>
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
          <MailIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          {localization?.VERIFY_EMAIL || "Verify your email"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {email ? (
            <>
              {localization?.VERIFICATION_EMAIL_SENT_TO || "We've sent a verification email to"}{" "}
              <span className="font-medium text-foreground">{email}</span>
            </>
          ) : (
            localization?.VERIFICATION_EMAIL_SENT_DESCRIPTION || 
            "We've sent you a verification email. Please check your inbox and click the verification link."
          )}
        </p>
      </div>

      {/* Manual verify button (if token is available but verification failed) */}
      {token && !isSuccess && (
        <Button
          onClick={handleVerify}
          disabled={isVerifying}
          className={classNames?.button}
        >
          {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {localization?.VERIFY_EMAIL || "Verify email"}
        </Button>
      )}

      {/* Error Message */}
      {error && (
        <div className={clsx("text-sm text-destructive", classNames?.error)}>
          {error}
        </div>
      )}

      {/* Resend verification email */}
      {email && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {localization?.DIDNT_RECEIVE_EMAIL || "Didn't receive the email?"}
          </p>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className={classNames?.resendButton}
          >
            {isResending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="mr-2 h-4 w-4" />
            )}
            {resendCooldown > 0 
              ? `${localization?.RESEND_IN || "Resend in"} ${resendCooldown}s`
              : localization?.RESEND_EMAIL || "Resend email"
            }
          </Button>
        </div>
      )}

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
    </div>
  )
}

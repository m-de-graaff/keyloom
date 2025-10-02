"use client"

import * as React from "react"
import { useState, useContext } from "react"
import clsx from "clsx"
import { EyeIcon, EyeOffIcon, Loader2 } from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Button } from "../components/button"
import { Input } from "../components/input"
import { Checkbox } from "../components/checkbox"
import { FormRow, FieldErrorText } from "../primitives/form"
import type { FetchError } from "../types"

export interface SignInFormProps {
  /** Custom redirect URL after successful sign in */
  redirectTo?: string
  /** Custom API endpoint for sign in */
  endpoint?: string
  /** Custom CSS classes */
  className?: string
  /** Whether to show "Remember me" checkbox */
  showRememberMe?: boolean
  /** Whether to show "Forgot password" link */
  showForgotPassword?: boolean
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
    checkbox?: string
    link?: string
    error?: string
  }
}

export function SignInForm({
  redirectTo = "/",
  endpoint = "/api/auth/login",
  className,
  showRememberMe = true,
  showForgotPassword = true,
  onSuccess,
  onError,
  classNames,
}: SignInFormProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, toast, navigate, viewPaths, basePath } = context || {}

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Sign in failed"
        throw new Error(errorMessage)
      }

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.SIGN_IN_SUCCESS || "Successfully signed in!",
        })
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result)
      } else {
        // Default behavior: redirect
        if (navigate) {
          navigate(redirectTo)
        } else if (typeof window !== "undefined") {
          window.location.href = redirectTo
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Sign in failed"
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

  // Build forgot password URL
  const forgotPasswordUrl = viewPaths?.auth?.["forgot-password"] 
    ? `${basePath}/${viewPaths.auth["forgot-password"]}`
    : "/auth/forgot-password"

  return (
    <form 
      onSubmit={handleSubmit} 
      className={clsx("grid gap-4", classNames?.form, className)}
      noValidate
    >
      {/* Email Field */}
      <FormRow 
        label={localization?.EMAIL || "Email"} 
        htmlFor="signin-email"
        className={classNames?.field}
      >
        <Input
          id="signin-email"
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

      {/* Password Field */}
      <FormRow 
        label={localization?.PASSWORD || "Password"} 
        htmlFor="signin-password"
        className={classNames?.field}
      >
        <div className="relative">
          <Input
            id="signin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={localization?.PASSWORD_PLACEHOLDER || "Enter your password"}
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
      </FormRow>

      {/* Remember Me & Forgot Password */}
      {(showRememberMe || showForgotPassword) && (
        <div className="flex items-center justify-between">
          {showRememberMe && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className={classNames?.checkbox}
                disabled={isLoading}
              />
              <label 
                htmlFor="remember-me" 
                className="text-sm text-muted-foreground cursor-pointer"
              >
                {localization?.REMEMBER_ME || "Remember me"}
              </label>
            </div>
          )}
          
          {showForgotPassword && (
            <a
              href={forgotPasswordUrl}
              className={clsx(
                "text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded",
                classNames?.link
              )}
            >
              {localization?.FORGOT_PASSWORD || "Forgot password?"}
            </a>
          )}
        </div>
      )}

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
        disabled={isLoading || !email || !password}
        className={classNames?.button}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {localization?.SIGN_IN || "Sign in"}
      </Button>
    </form>
  )
}

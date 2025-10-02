"use client"

import * as React from "react"
import { useContext, useEffect } from "react"
import clsx from "clsx"
import { Loader2 } from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { useAuthenticate } from "../hooks/use-authenticate"
import type { AuthView } from "../types"

export interface RedirectToSignInProps {
  /** Children to render if user is authenticated */
  children: React.ReactNode
  /** Custom auth view to redirect to */
  authView?: AuthView
  /** Custom redirect URL after authentication */
  redirectTo?: string
  /** Custom loading component */
  loading?: React.ReactNode
  /** Custom unauthenticated component */
  fallback?: React.ReactNode
  /** Whether to show loading state */
  showLoading?: boolean
  /** Custom CSS classes */
  className?: string
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string
    loading?: string
    fallback?: string
  }
}

export function RedirectToSignIn({
  children,
  authView = "sign-in",
  redirectTo,
  loading,
  fallback,
  showLoading = true,
  className,
  classNames,
}: RedirectToSignInProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}

  const { isAuthenticated, isPending } = useAuthenticate({
    authView,
    enabled: true,
  })

  // Custom redirect URL handling
  useEffect(() => {
    if (redirectTo && typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href)
      if (!currentUrl.searchParams.has("redirectTo")) {
        currentUrl.searchParams.set("redirectTo", redirectTo)
        window.history.replaceState({}, "", currentUrl.toString())
      }
    }
  }, [redirectTo])

  // Show loading state while checking authentication
  if (isPending) {
    if (loading) {
      return <>{loading}</>
    }

    if (showLoading) {
      return (
        <div className={clsx(
          "flex min-h-screen items-center justify-center",
          classNames?.container,
          className
        )}>
          <div className={clsx(
            "flex flex-col items-center space-y-4",
            classNames?.loading
          )}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {localization?.CHECKING_AUTHENTICATION || "Checking authentication..."}
            </p>
          </div>
        </div>
      )
    }

    return null
  }

  // Show fallback if user is not authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return (
        <div className={clsx(classNames?.fallback, className)}>
          {fallback}
        </div>
      )
    }

    // Default fallback - this typically won't be reached because useAuthenticate
    // will redirect to the auth page, but it's here as a safety net
    return (
      <div className={clsx(
        "flex min-h-screen items-center justify-center",
        classNames?.container,
        className
      )}>
        <div className={clsx(
          "text-center space-y-4",
          classNames?.fallback
        )}>
          <h2 className="text-lg font-semibold">
            {localization?.AUTHENTICATION_REQUIRED || "Authentication required"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {localization?.REDIRECTING_TO_SIGN_IN || "Redirecting to sign in..."}
          </p>
        </div>
      </div>
    )
  }

  // User is authenticated, render children
  return <>{children}</>
}

// Higher-order component version
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<RedirectToSignInProps, 'children'>
) {
  const WrappedComponent = (props: P) => {
    return (
      <RedirectToSignIn {...options}>
        <Component {...props} />
      </RedirectToSignIn>
    )
  }

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook version for more control
export function useRequireAuth(options?: {
  authView?: AuthView
  redirectTo?: string
  onUnauthenticated?: () => void
}) {
  const { authView = "sign-in", redirectTo, onUnauthenticated } = options || {}
  
  const { isAuthenticated, isPending, user } = useAuthenticate({
    authView,
    enabled: true,
  })

  useEffect(() => {
    if (!isPending && !isAuthenticated && onUnauthenticated) {
      onUnauthenticated()
    }
  }, [isPending, isAuthenticated, onUnauthenticated])

  useEffect(() => {
    if (redirectTo && typeof window !== "undefined") {
      const currentUrl = new URL(window.location.href)
      if (!currentUrl.searchParams.has("redirectTo")) {
        currentUrl.searchParams.set("redirectTo", redirectTo)
        window.history.replaceState({}, "", currentUrl.toString())
      }
    }
  }, [redirectTo])

  return {
    isAuthenticated,
    isPending,
    user,
    isLoading: isPending,
  }
}

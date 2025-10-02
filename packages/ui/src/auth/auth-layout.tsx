"use client"

import * as React from "react"
import { useContext } from "react"
import clsx from "clsx"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Card } from "../components/card"

export interface AuthLayoutProps {
  /** Page title */
  title?: string
  /** Page subtitle/description */
  subtitle?: string
  /** Main content */
  children: React.ReactNode
  /** Footer content (typically links to other auth pages) */
  footer?: React.ReactNode
  /** Custom CSS classes */
  className?: string
  /** Layout variant */
  variant?: 'card' | 'full' | 'minimal'
  /** Card size (only applies to 'card' variant) */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show a logo */
  showLogo?: boolean
  /** Custom logo component */
  logo?: React.ReactNode
  /** Background pattern or image */
  background?: 'none' | 'grid' | 'gradient' | 'image'
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string
    card?: string
    header?: string
    title?: string
    subtitle?: string
    content?: string
    footer?: string
    logo?: string
  }
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  className,
  variant = 'card',
  size = 'md',
  showLogo = false,
  logo,
  background = 'none',
  classNames,
}: AuthLayoutProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}

  // Container styles based on variant
  const containerStyles = {
    card: "flex min-h-screen items-center justify-center bg-background px-4 py-8",
    full: "min-h-screen bg-background",
    minimal: "min-h-screen bg-background p-4",
  }[variant]

  // Card size styles
  const cardSizeStyles = {
    sm: "w-full max-w-sm",
    md: "w-full max-w-md", 
    lg: "w-full max-w-lg",
  }[size]

  // Background styles
  const backgroundStyles = {
    none: "",
    grid: "bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:20px_20px]",
    gradient: "bg-gradient-to-br from-background via-background to-muted/20",
    image: "bg-cover bg-center bg-no-repeat",
  }[background]

  const renderContent = () => (
    <>
      {/* Logo */}
      {showLogo && (
        <div className={clsx("flex justify-center mb-6", classNames?.logo)}>
          {logo || (
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">K</span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      {(title || subtitle) && (
        <header className={clsx("mb-6 space-y-2 text-center", classNames?.header)}>
          {title && (
            <h1 className={clsx(
              "text-xl font-semibold tracking-tight text-foreground",
              classNames?.title
            )}>
              {title}
            </h1>
          )}
          {subtitle && (
            <p className={clsx("text-sm text-muted-foreground", classNames?.subtitle)}>
              {subtitle}
            </p>
          )}
        </header>
      )}

      {/* Main Content */}
      <div className={clsx("space-y-6", classNames?.content)}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <footer className={clsx("mt-6 text-center text-sm", classNames?.footer)}>
          {footer}
        </footer>
      )}
    </>
  )

  if (variant === 'card') {
    return (
      <div className={clsx(
        containerStyles,
        backgroundStyles,
        classNames?.container,
        className
      )}>
        <Card className={clsx(
          cardSizeStyles,
          "border shadow-lg",
          classNames?.card
        )}>
          <div className="p-6 sm:p-8">
            {renderContent()}
          </div>
        </Card>
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={clsx(
        containerStyles,
        backgroundStyles,
        "flex flex-col",
        classNames?.container,
        className
      )}>
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className={cardSizeStyles}>
            {renderContent()}
          </div>
        </div>
      </div>
    )
  }

  // Minimal variant
  return (
    <div className={clsx(
      containerStyles,
      backgroundStyles,
      classNames?.container,
      className
    )}>
      <div className={clsx("mx-auto", cardSizeStyles)}>
        {renderContent()}
      </div>
    </div>
  )
}

// Convenience components for common auth layout patterns
export interface AuthPageProps extends Omit<AuthLayoutProps, 'children'> {
  children: React.ReactNode
}

export function SignInLayout(props: AuthPageProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}
  
  return (
    <AuthLayout
      title={localization?.SIGN_IN || "Welcome back"}
      subtitle={localization?.SIGN_IN_SUBTITLE || "Sign in to your account"}
      {...props}
    />
  )
}

export function SignUpLayout(props: AuthPageProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}
  
  return (
    <AuthLayout
      title={localization?.CREATE_ACCOUNT || "Create your account"}
      subtitle={localization?.SIGN_UP_SUBTITLE || "Start your journey with us"}
      {...props}
    />
  )
}

export function ForgotPasswordLayout(props: AuthPageProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}
  
  return (
    <AuthLayout
      title={localization?.FORGOT_PASSWORD || "Forgot your password?"}
      subtitle={localization?.FORGOT_PASSWORD_SUBTITLE || "We'll help you reset it"}
      {...props}
    />
  )
}

export function ResetPasswordLayout(props: AuthPageProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}
  
  return (
    <AuthLayout
      title={localization?.RESET_PASSWORD || "Reset your password"}
      subtitle={localization?.RESET_PASSWORD_SUBTITLE || "Enter your new password"}
      {...props}
    />
  )
}

export function VerifyEmailLayout(props: AuthPageProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}
  
  return (
    <AuthLayout
      title={localization?.VERIFY_EMAIL || "Verify your email"}
      subtitle={localization?.VERIFY_EMAIL_SUBTITLE || "Check your inbox for a verification link"}
      variant="minimal"
      {...props}
    />
  )
}

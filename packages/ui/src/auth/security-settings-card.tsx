"use client"

import * as React from "react"
import { useState, useContext } from "react"
import clsx from "clsx"
import { 
  ShieldIcon, 
  KeyIcon, 
  SmartphoneIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2,
  CheckIcon,
  AlertTriangleIcon,
  LockIcon
} from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Button } from "../components/button"
import { Input } from "../components/input"
import { Card } from "../components/card"
import { Badge } from "../components/badge"
import { FormRow, FieldErrorText } from "../primitives/form"
import type { FetchError } from "../types"

export interface SecuritySettingsCardProps {
  /** User security data */
  user?: {
    id?: string
    email?: string | null
    emailVerified?: boolean
    twoFactorEnabled?: boolean
    lastPasswordChange?: Date | string
    activeSessions?: number
    [key: string]: any
  }
  /** Card variant */
  variant?: 'password' | 'two-factor' | 'sessions' | 'overview'
  /** Custom CSS classes */
  className?: string
  /** API endpoints */
  endpoints?: {
    changePassword?: string
    enable2FA?: string
    disable2FA?: string
    getSessions?: string
    revokeSession?: string
  }
  /** Custom success handler */
  onSuccess?: (result: any) => void
  /** Custom error handler */
  onError?: (error: FetchError) => void
  /** Custom CSS classes for different parts */
  classNames?: {
    card?: string
    header?: string
    title?: string
    description?: string
    content?: string
    field?: string
    actions?: string
    button?: string
    error?: string
    badge?: string
  }
}

export function SecuritySettingsCard({
  user,
  variant = 'overview',
  className,
  endpoints = {},
  onSuccess,
  onError,
  classNames,
}: SecuritySettingsCardProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, toast } = context || {}

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handlePasswordChange = async () => {
    setError(null)

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError(localization?.ALL_FIELDS_REQUIRED || "All fields are required")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(localization?.PASSWORDS_DO_NOT_MATCH || "Passwords do not match")
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setError(localization?.PASSWORD_TOO_SHORT || "Password must be at least 8 characters")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(endpoints.changePassword || "/api/account/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to change password"
        throw new Error(errorMessage)
      }

      // Reset form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.PASSWORD_CHANGED || "Password changed successfully!",
        })
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to change password"
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

  const handleToggle2FA = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const endpoint = user?.twoFactorEnabled 
        ? endpoints.disable2FA || "/api/account/disable-2fa"
        : endpoints.enable2FA || "/api/account/enable-2fa"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to update 2FA settings"
        throw new Error(errorMessage)
      }

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: user?.twoFactorEnabled 
            ? localization?.TWO_FACTOR_DISABLED || "Two-factor authentication disabled"
            : localization?.TWO_FACTOR_ENABLED || "Two-factor authentication enabled",
        })
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update 2FA settings"
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

  const renderPasswordSection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{localization?.CHANGE_PASSWORD || "Change Password"}</h4>
          <p className="text-sm text-muted-foreground">
            {user?.lastPasswordChange 
              ? `${localization?.LAST_CHANGED || "Last changed"}: ${new Date(user.lastPasswordChange).toLocaleDateString()}`
              : localization?.PASSWORD_NEVER_CHANGED || "Password has never been changed"
            }
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <FormRow
          label={localization?.CURRENT_PASSWORD || "Current password"}
          htmlFor="current-password"
          className={classNames?.field}
        >
          <div className="relative">
            <Input
              id="current-password"
              type={showCurrentPassword ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder={localization?.ENTER_CURRENT_PASSWORD || "Enter your current password"}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            >
              {showCurrentPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </FormRow>

        <FormRow
          label={localization?.NEW_PASSWORD || "New password"}
          htmlFor="new-password"
          className={classNames?.field}
        >
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder={localization?.ENTER_NEW_PASSWORD || "Enter your new password"}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </FormRow>

        <FormRow
          label={localization?.CONFIRM_PASSWORD || "Confirm password"}
          htmlFor="confirm-password"
          className={classNames?.field}
        >
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder={localization?.CONFIRM_NEW_PASSWORD || "Confirm your new password"}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </FormRow>

        <Button
          onClick={handlePasswordChange}
          disabled={isLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
          className={classNames?.button}
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {localization?.CHANGE_PASSWORD || "Change Password"}
        </Button>
      </div>
    </div>
  )

  const render2FASection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SmartphoneIcon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h4 className="font-medium">{localization?.TWO_FACTOR_AUTH || "Two-Factor Authentication"}</h4>
            <p className="text-sm text-muted-foreground">
              {localization?.TWO_FACTOR_DESCRIPTION || "Add an extra layer of security to your account"}
            </p>
          </div>
        </div>
        <Badge 
          variant={user?.twoFactorEnabled ? "default" : "secondary"}
          className={classNames?.badge}
        >
          {user?.twoFactorEnabled 
            ? localization?.ENABLED || "Enabled"
            : localization?.DISABLED || "Disabled"
          }
        </Badge>
      </div>

      <Button
        variant={user?.twoFactorEnabled ? "outline" : "default"}
        onClick={handleToggle2FA}
        disabled={isLoading}
        className={classNames?.button}
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {user?.twoFactorEnabled 
          ? localization?.DISABLE_2FA || "Disable 2FA"
          : localization?.ENABLE_2FA || "Enable 2FA"
        }
      </Button>
    </div>
  )

  const renderOverviewSection = () => (
    <div className="space-y-6">
      {/* Email verification status */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "p-2 rounded-full",
            user?.emailVerified ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
          )}>
            {user?.emailVerified ? <CheckIcon className="h-4 w-4" /> : <AlertTriangleIcon className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="font-medium">{localization?.EMAIL_VERIFICATION || "Email Verification"}</h4>
            <p className="text-sm text-muted-foreground">
              {user?.emailVerified 
                ? localization?.EMAIL_VERIFIED || "Your email is verified"
                : localization?.EMAIL_NOT_VERIFIED || "Your email is not verified"
              }
            </p>
          </div>
        </div>
        <Badge 
          variant={user?.emailVerified ? "default" : "secondary"}
          className={classNames?.badge}
        >
          {user?.emailVerified 
            ? localization?.VERIFIED || "Verified"
            : localization?.UNVERIFIED || "Unverified"
          }
        </Badge>
      </div>

      {/* Password security */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100 text-blue-600">
            <LockIcon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-medium">{localization?.PASSWORD_SECURITY || "Password Security"}</h4>
            <p className="text-sm text-muted-foreground">
              {user?.lastPasswordChange 
                ? `${localization?.LAST_CHANGED || "Last changed"}: ${new Date(user.lastPasswordChange).toLocaleDateString()}`
                : localization?.PASSWORD_NEVER_CHANGED || "Password has never been changed"
              }
            </p>
          </div>
        </div>
      </div>

      {/* Two-factor authentication */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "p-2 rounded-full",
            user?.twoFactorEnabled ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
          )}>
            <SmartphoneIcon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-medium">{localization?.TWO_FACTOR_AUTH || "Two-Factor Authentication"}</h4>
            <p className="text-sm text-muted-foreground">
              {user?.twoFactorEnabled 
                ? localization?.TWO_FACTOR_ENABLED_DESC || "Extra security is enabled"
                : localization?.TWO_FACTOR_DISABLED_DESC || "Add extra security to your account"
              }
            </p>
          </div>
        </div>
        <Badge 
          variant={user?.twoFactorEnabled ? "default" : "secondary"}
          className={classNames?.badge}
        >
          {user?.twoFactorEnabled 
            ? localization?.ENABLED || "Enabled"
            : localization?.DISABLED || "Disabled"
          }
        </Badge>
      </div>

      {/* Active sessions */}
      {user?.activeSessions !== undefined && (
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100 text-purple-600">
              <ShieldIcon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-medium">{localization?.ACTIVE_SESSIONS || "Active Sessions"}</h4>
              <p className="text-sm text-muted-foreground">
                {localization?.ACTIVE_SESSIONS_COUNT?.replace('{count}', user.activeSessions.toString()) || 
                  `${user.activeSessions} active session${user.activeSessions !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={classNames?.badge}>
            {user.activeSessions}
          </Badge>
        </div>
      )}
    </div>
  )

  const getCardTitle = () => {
    switch (variant) {
      case 'password':
        return localization?.PASSWORD_SETTINGS || "Password Settings"
      case 'two-factor':
        return localization?.TWO_FACTOR_AUTH || "Two-Factor Authentication"
      case 'sessions':
        return localization?.ACTIVE_SESSIONS || "Active Sessions"
      default:
        return localization?.SECURITY_OVERVIEW || "Security Overview"
    }
  }

  const getCardDescription = () => {
    switch (variant) {
      case 'password':
        return localization?.PASSWORD_SETTINGS_DESC || "Manage your account password and security"
      case 'two-factor':
        return localization?.TWO_FACTOR_SETTINGS_DESC || "Secure your account with two-factor authentication"
      case 'sessions':
        return localization?.SESSIONS_SETTINGS_DESC || "Manage your active sessions and devices"
      default:
        return localization?.SECURITY_OVERVIEW_DESC || "Overview of your account security settings"
    }
  }

  return (
    <Card className={clsx("p-6", classNames?.card, className)}>
      {/* Header */}
      <div className={clsx("mb-6", classNames?.header)}>
        <div className="flex items-center gap-3 mb-2">
          <ShieldIcon className="h-5 w-5 text-primary" />
          <h3 className={clsx("text-lg font-semibold", classNames?.title)}>
            {getCardTitle()}
          </h3>
        </div>
        <p className={clsx("text-sm text-muted-foreground", classNames?.description)}>
          {getCardDescription()}
        </p>
      </div>

      {/* Content */}
      <div className={clsx("space-y-6", classNames?.content)}>
        {variant === 'password' && renderPasswordSection()}
        {variant === 'two-factor' && render2FASection()}
        {variant === 'overview' && renderOverviewSection()}

        {/* Error message */}
        {error && (
          <FieldErrorText error={error} className={classNames?.error} />
        )}
      </div>
    </Card>
  )
}

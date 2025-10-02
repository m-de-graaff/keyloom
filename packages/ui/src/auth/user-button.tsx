"use client"

import * as React from "react"
import { useContext } from "react"
import clsx from "clsx"
import { 
  ChevronDownIcon, 
  UserIcon, 
  SettingsIcon, 
  LogOutIcon,
  CreditCardIcon,
  BuildingIcon,
  KeyIcon,
  ShieldIcon
} from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { UserAvatar } from "./user-avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "../components/dropdown-menu"

export interface UserButtonProps {
  /** User data */
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
  }
  /** Custom sign out endpoint */
  signOutEndpoint?: string
  /** Custom sign out handler */
  onSignOut?: () => void
  /** Whether to show user info in the button */
  showUserInfo?: boolean
  /** Whether to show the dropdown arrow */
  showArrow?: boolean
  /** Avatar size */
  avatarSize?: 'xs' | 'sm' | 'md' | 'lg'
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline'
  /** Custom CSS classes */
  className?: string
  /** Custom menu items */
  menuItems?: Array<{
    key: string
    label: string
    icon?: React.ComponentType<{ className?: string }>
    href?: string
    onClick?: () => void
    separator?: boolean
  }>
  /** Whether to show default menu items */
  showDefaultItems?: boolean
  /** Custom CSS classes for different parts */
  classNames?: {
    button?: string
    avatar?: string
    userInfo?: string
    menu?: string
    menuItem?: string
    separator?: string
  }
}

export function UserButton({
  user,
  signOutEndpoint = "/api/auth/logout",
  onSignOut,
  showUserInfo = true,
  showArrow = true,
  avatarSize = 'sm',
  variant = 'default',
  className,
  menuItems = [],
  showDefaultItems = true,
  classNames,
}: UserButtonProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, toast, navigate, account, organization } = context || {}

  const handleSignOut = async () => {
    try {
      // Call custom sign out handler first
      if (onSignOut) {
        onSignOut()
        return
      }

      // Default sign out behavior
      await fetch(signOutEndpoint, { method: "POST" })
      
      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.SIGNED_OUT || "Signed out successfully",
        })
      }

      // Reload page or redirect
      if (typeof window !== "undefined") {
        window.location.reload()
      }
    } catch (error) {
      console.error("Sign out error:", error)
      
      // Show error toast
      if (toast) {
        toast({
          variant: "error",
          message: localization?.SIGN_OUT_ERROR || "Failed to sign out",
        })
      }
    }
  }

  // Default menu items
  const defaultItems = showDefaultItems ? [
    {
      key: "profile",
      label: localization?.PROFILE || "Profile",
      icon: UserIcon,
      href: account ? `${account.basePath}/${account.viewPaths.profile}` : "/account/profile",
    },
    {
      key: "settings",
      label: localization?.SETTINGS || "Settings", 
      icon: SettingsIcon,
      href: account ? `${account.basePath}/${account.viewPaths.security}` : "/account/settings",
    },
    ...(account?.viewPaths["api-keys"] ? [{
      key: "api-keys",
      label: localization?.API_KEYS || "API Keys",
      icon: KeyIcon,
      href: `${account.basePath}/${account.viewPaths["api-keys"]}`,
    }] : []),
    ...(organization ? [{
      key: "organizations",
      label: localization?.ORGANIZATIONS || "Organizations",
      icon: BuildingIcon,
      href: `${organization.basePath}`,
    }] : []),
    ...(account?.viewPaths.billing ? [{
      key: "billing",
      label: localization?.BILLING || "Billing",
      icon: CreditCardIcon,
      href: `${account.basePath}/${account.viewPaths.billing}`,
    }] : []),
    {
      key: "separator-1",
      separator: true,
    },
    {
      key: "sign-out",
      label: localization?.SIGN_OUT || "Sign out",
      icon: LogOutIcon,
      onClick: handleSignOut,
    },
  ] : []

  // Combine default and custom menu items
  const allMenuItems = [...defaultItems, ...menuItems]

  // Button variant styles
  const buttonVariants = {
    default: "inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    ghost: "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    outline: "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  }

  // User display name
  const displayName = user?.name || user?.username || user?.email || localization?.ACCOUNT || "Account"
  const displayEmail = user?.email && user?.email !== displayName ? user?.email : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={clsx(
            buttonVariants[variant],
            classNames?.button,
            className
          )}
          aria-label={localization?.USER_MENU || "User menu"}
        >
          <UserAvatar
            user={user}
            size={avatarSize}
            className={classNames?.avatar}
          />
          
          {showUserInfo && (
            <div className={clsx(
              "hidden sm:flex sm:flex-col sm:items-start sm:text-left",
              classNames?.userInfo
            )}>
              <span className="text-sm font-medium truncate max-w-[120px]">
                {displayName}
              </span>
              {displayEmail && (
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {displayEmail}
                </span>
              )}
            </div>
          )}
          
          {showArrow && (
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className={clsx("w-56", classNames?.menu)}
      >
        {/* User info header (mobile) */}
        {showUserInfo && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                {displayEmail && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {displayEmail}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className={classNames?.separator} />
          </>
        )}

        {/* Menu items */}
        {allMenuItems.map((item) => {
          if (item.separator) {
            return (
              <DropdownMenuSeparator 
                key={item.key} 
                className={classNames?.separator}
              />
            )
          }

          const Icon = item.icon

          if (item.href) {
            return (
              <DropdownMenuItem key={item.key} asChild>
                <a 
                  href={item.href}
                  className={clsx("flex items-center", classNames?.menuItem)}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  {item.label}
                </a>
              </DropdownMenuItem>
            )
          }

          return (
            <DropdownMenuItem
              key={item.key}
              onClick={item.onClick}
              className={clsx("flex items-center", classNames?.menuItem)}
            >
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              {item.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

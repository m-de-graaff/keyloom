"use client"

import * as React from "react"
import { useContext } from "react"
import clsx from "clsx"
import { UserIcon } from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Avatar, AvatarFallback, AvatarImage } from "../components/avatar"

export interface UserAvatarProps {
  /** User data */
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
  }
  /** Avatar size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Custom avatar URL (overrides user.image) */
  src?: string
  /** Custom alt text */
  alt?: string
  /** Custom fallback text (overrides generated initials) */
  fallback?: string
  /** Whether to show a border */
  showBorder?: boolean
  /** Whether to show online status indicator */
  showStatus?: boolean
  /** Online status */
  status?: 'online' | 'offline' | 'away' | 'busy'
  /** Custom CSS classes */
  className?: string
  /** Custom CSS classes for different parts */
  classNames?: {
    avatar?: string
    image?: string
    fallback?: string
    status?: string
  }
  /** Click handler */
  onClick?: () => void
}

export function UserAvatar({
  user,
  size = 'md',
  src,
  alt,
  fallback,
  showBorder = false,
  showStatus = false,
  status = 'offline',
  className,
  classNames,
  onClick,
}: UserAvatarProps) {
  const context = useContext(AuthUIProviderContext)
  const { avatar: avatarConfig } = context || {}

  // Size mappings
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8", 
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
    "2xl": "h-20 w-20",
  }

  const statusSizeClasses = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5", 
    lg: "h-3 w-3",
    xl: "h-4 w-4",
    "2xl": "h-5 w-5",
  }

  // Generate initials from user data
  const generateInitials = () => {
    if (fallback) return fallback

    const name = user?.name || user?.username || user?.email
    if (!name) return "?"

    // If it's an email, use the part before @
    const displayName = name.includes("@") ? name.split("@")[0] : name

    // Generate initials from name
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return displayName.slice(0, 2).toUpperCase()
  }

  // Determine avatar source
  const avatarSrc = src || user?.image || undefined

  // Generate alt text
  const avatarAlt = alt || user?.name || user?.username || user?.email || "User avatar"

  // Status indicator colors
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-yellow-500", 
    busy: "bg-red-500",
  }

  const initials = generateInitials()

  return (
    <div className={clsx("relative inline-block", className)}>
      <Avatar
        className={clsx(
          sizeClasses[size],
          showBorder && "ring-2 ring-background ring-offset-2 ring-offset-background",
          onClick && "cursor-pointer hover:opacity-80 transition-opacity",
          classNames?.avatar
        )}
        onClick={onClick}
      >
        {avatarSrc ? (
          <AvatarImage
            src={avatarSrc}
            alt={avatarAlt}
            className={classNames?.image}
          />
        ) : null}
        <AvatarFallback
          className={clsx(
            "bg-muted text-muted-foreground font-medium",
            classNames?.fallback
          )}
        >
          {initials.length > 0 ? (
            <span className={clsx(
              size === 'xs' ? "text-xs" :
              size === 'sm' ? "text-xs" :
              size === 'md' ? "text-sm" :
              size === 'lg' ? "text-base" :
              size === 'xl' ? "text-lg" :
              "text-xl"
            )}>
              {initials}
            </span>
          ) : (
            <UserIcon className={clsx(
              size === 'xs' ? "h-3 w-3" :
              size === 'sm' ? "h-4 w-4" :
              size === 'md' ? "h-5 w-5" :
              size === 'lg' ? "h-6 w-6" :
              size === 'xl' ? "h-8 w-8" :
              "h-10 w-10"
            )} />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Status Indicator */}
      {showStatus && (
        <div
          className={clsx(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            statusSizeClasses[size],
            statusColors[status],
            classNames?.status
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  )
}

// Avatar group component for showing multiple users
export interface UserAvatarGroupProps {
  /** Array of users */
  users: Array<{
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
  }>
  /** Maximum number of avatars to show */
  max?: number
  /** Avatar size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Custom CSS classes */
  className?: string
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string
    avatar?: string
    more?: string
  }
  /** Click handler for individual avatars */
  onAvatarClick?: (user: any, index: number) => void
  /** Click handler for "more" indicator */
  onMoreClick?: () => void
}

export function UserAvatarGroup({
  users,
  max = 5,
  size = 'md',
  className,
  classNames,
  onAvatarClick,
  onMoreClick,
}: UserAvatarGroupProps) {
  const visibleUsers = users.slice(0, max)
  const remainingCount = users.length - max

  const spacingClasses = {
    xs: "-space-x-1",
    sm: "-space-x-1.5",
    md: "-space-x-2",
    lg: "-space-x-2.5", 
    xl: "-space-x-3",
    "2xl": "-space-x-4",
  }

  return (
    <div className={clsx(
      "flex items-center",
      spacingClasses[size],
      classNames?.container,
      className
    )}>
      {visibleUsers.map((user, index) => (
        <UserAvatar
          key={user.id || index}
          user={user}
          size={size}
          showBorder
          className={classNames?.avatar}
          onClick={() => onAvatarClick?.(user, index)}
        />
      ))}
      
      {remainingCount > 0 && (
        <div
          className={clsx(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-background cursor-pointer hover:bg-muted/80 transition-colors",
            {
              xs: "h-6 w-6 text-xs",
              sm: "h-8 w-8 text-xs",
              md: "h-10 w-10 text-sm",
              lg: "h-12 w-12 text-base",
              xl: "h-16 w-16 text-lg",
              "2xl": "h-20 w-20 text-xl",
            }[size],
            classNames?.more
          )}
          onClick={onMoreClick}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

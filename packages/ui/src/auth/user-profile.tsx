"use client"

import * as React from "react"
import { useContext } from "react"
import clsx from "clsx"
import { 
  MailIcon, 
  CalendarIcon, 
  MapPinIcon, 
  LinkIcon,
  BuildingIcon,
  UserIcon,
  EditIcon,
  VerifiedIcon
} from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { UserAvatar } from "./user-avatar"
import { Button } from "../components/button"
import { Badge } from "../components/badge"

export interface UserProfileProps {
  /** User data */
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
    bio?: string | null
    website?: string | null
    location?: string | null
    company?: string | null
    jobTitle?: string | null
    createdAt?: Date | string
    emailVerified?: boolean
    role?: string
    [key: string]: any
  }
  /** Layout variant */
  variant?: 'card' | 'inline' | 'minimal'
  /** Avatar size */
  avatarSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Whether to show edit button */
  showEditButton?: boolean
  /** Whether to show all available fields */
  showAllFields?: boolean
  /** Custom fields to display */
  fields?: Array<{
    key: string
    label: string
    value?: any
    icon?: React.ComponentType<{ className?: string }>
    render?: (value: any) => React.ReactNode
  }>
  /** Custom CSS classes */
  className?: string
  /** Edit button click handler */
  onEdit?: () => void
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string
    header?: string
    avatar?: string
    info?: string
    name?: string
    username?: string
    bio?: string
    fields?: string
    field?: string
    editButton?: string
    badge?: string
  }
}

export function UserProfile({
  user,
  variant = 'card',
  avatarSize = 'lg',
  showEditButton = false,
  showAllFields = true,
  fields = [],
  className,
  onEdit,
  classNames,
}: UserProfileProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}

  if (!user) {
    return (
      <div className={clsx(
        "flex items-center justify-center p-8 text-center",
        classNames?.container,
        className
      )}>
        <div className="space-y-2">
          <UserIcon className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {localization?.NO_USER_DATA || "No user data available"}
          </p>
        </div>
      </div>
    )
  }

  // Default fields to show
  const defaultFields = showAllFields ? [
    {
      key: "email",
      label: localization?.EMAIL || "Email",
      value: user.email,
      icon: MailIcon,
    },
    {
      key: "location",
      label: localization?.LOCATION || "Location",
      value: user.location,
      icon: MapPinIcon,
    },
    {
      key: "website",
      label: localization?.WEBSITE || "Website",
      value: user.website,
      icon: LinkIcon,
      render: (value: string) => (
        <a 
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {value}
        </a>
      ),
    },
    {
      key: "company",
      label: localization?.COMPANY || "Company",
      value: user.company,
      icon: BuildingIcon,
    },
    {
      key: "jobTitle",
      label: localization?.JOB_TITLE || "Job Title",
      value: user.jobTitle,
      icon: UserIcon,
    },
    {
      key: "createdAt",
      label: localization?.JOINED || "Joined",
      value: user.createdAt,
      icon: CalendarIcon,
      render: (value: Date | string) => {
        const date = typeof value === 'string' ? new Date(value) : value
        return date.toLocaleDateString()
      },
    },
  ].filter(field => field.value) : []

  // Combine default and custom fields
  const allFields = [...defaultFields, ...fields].filter(field => field.value)

  // Display name and username
  const displayName = user.name || user.username || localization?.UNNAMED_USER || "Unnamed User"
  const username = user.username && user.username !== user.name ? user.username : undefined

  const renderContent = () => (
    <>
      {/* Header with avatar and basic info */}
      <div className={clsx(
        variant === 'inline' ? "flex items-center gap-4" : "text-center space-y-4",
        classNames?.header
      )}>
        <UserAvatar
          user={user}
          size={avatarSize}
          className={classNames?.avatar}
        />
        
        <div className={clsx(
          variant === 'inline' ? "flex-1 text-left" : "space-y-2",
          classNames?.info
        )}>
          <div className="flex items-center gap-2 justify-center">
            <h2 className={clsx(
              "text-lg font-semibold",
              classNames?.name
            )}>
              {displayName}
            </h2>
            {user.emailVerified && (
              <VerifiedIcon className="h-4 w-4 text-blue-500" />
            )}
            {user.role && (
              <Badge variant="secondary" className={classNames?.badge}>
                {user.role}
              </Badge>
            )}
          </div>
          
          {username && (
            <p className={clsx(
              "text-sm text-muted-foreground",
              classNames?.username
            )}>
              @{username}
            </p>
          )}
          
          {user.bio && (
            <p className={clsx(
              "text-sm text-muted-foreground max-w-md mx-auto",
              variant === 'inline' && "mx-0",
              classNames?.bio
            )}>
              {user.bio}
            </p>
          )}
        </div>

        {/* Edit button */}
        {showEditButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className={clsx(
              variant === 'inline' ? "ml-auto" : "mx-auto",
              classNames?.editButton
            )}
          >
            <EditIcon className="h-4 w-4 mr-2" />
            {localization?.EDIT || "Edit"}
          </Button>
        )}
      </div>

      {/* Additional fields */}
      {allFields.length > 0 && (
        <div className={clsx(
          "space-y-3",
          variant === 'card' && "border-t pt-4",
          classNames?.fields
        )}>
          {allFields.map((field) => {
            const Icon = field.icon
            const value = field.render ? field.render(field.value) : field.value

            return (
              <div
                key={field.key}
                className={clsx(
                  "flex items-center gap-3 text-sm",
                  classNames?.field
                )}
              >
                {Icon && (
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-muted-foreground min-w-0 shrink-0">
                  {field.label}:
                </span>
                <span className="font-medium truncate">
                  {value}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )

  if (variant === 'minimal') {
    return (
      <div className={clsx("space-y-4", classNames?.container, className)}>
        {renderContent()}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={clsx(
        "flex items-start gap-4 p-4 rounded-lg border bg-card",
        classNames?.container,
        className
      )}>
        {renderContent()}
      </div>
    )
  }

  // Card variant (default)
  return (
    <div className={clsx(
      "p-6 rounded-lg border bg-card space-y-6",
      classNames?.container,
      className
    )}>
      {renderContent()}
    </div>
  )
}

// Compact user profile for lists and small spaces
export interface UserProfileCompactProps {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
    role?: string
  }
  /** Whether to show email */
  showEmail?: boolean
  /** Whether to show role badge */
  showRole?: boolean
  /** Avatar size */
  avatarSize?: 'xs' | 'sm' | 'md'
  /** Custom CSS classes */
  className?: string
  /** Click handler */
  onClick?: () => void
}

export function UserProfileCompact({
  user,
  showEmail = true,
  showRole = false,
  avatarSize = 'sm',
  className,
  onClick,
}: UserProfileCompactProps) {
  if (!user) return null

  const displayName = user.name || user.username || user.email || "Unknown User"
  const displayEmail = showEmail && user.email && user.email !== displayName ? user.email : undefined

  return (
    <div
      className={clsx(
        "flex items-center gap-3",
        onClick && "cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <UserAvatar user={user} size={avatarSize} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {displayName}
          </p>
          {showRole && user.role && (
            <Badge variant="secondary" className="text-xs">
              {user.role}
            </Badge>
          )}
        </div>
        {displayEmail && (
          <p className="text-xs text-muted-foreground truncate">
            {displayEmail}
          </p>
        )}
      </div>
    </div>
  )
}

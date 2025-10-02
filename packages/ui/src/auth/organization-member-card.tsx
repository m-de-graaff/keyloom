"use client"

import * as React from "react"
import { useState, useContext } from "react"
import clsx from "clsx"
import { 
  MoreHorizontalIcon, 
  CrownIcon, 
  ShieldIcon,
  UserIcon,
  MailIcon,
  CalendarIcon,
  TrashIcon,
  EditIcon,
  UserXIcon,
  Loader2
} from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { UserAvatar } from "./user-avatar"
import { Button } from "../components/button"
import { Badge } from "../components/badge"
import { Card } from "../components/card"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../components/dropdown-menu"
import type { FetchError } from "../types"

export interface OrganizationMember {
  id: string
  userId: string
  name?: string | null
  email?: string | null
  image?: string | null
  username?: string | null
  role: string
  joinedAt?: Date | string
  lastActive?: Date | string
  status?: 'active' | 'invited' | 'suspended'
}

export interface OrganizationMemberCardProps {
  /** Member data */
  member: OrganizationMember
  /** Current user's role in the organization */
  currentUserRole?: string
  /** Current user's ID */
  currentUserId?: string
  /** Card variant */
  variant?: 'card' | 'list' | 'compact'
  /** Whether to show member actions */
  showActions?: boolean
  /** Custom CSS classes */
  className?: string
  /** API endpoints */
  endpoints?: {
    updateRole?: string
    removeMember?: string
    resendInvite?: string
  }
  /** Custom role change handler */
  onRoleChange?: (member: OrganizationMember, newRole: string) => void
  /** Custom remove member handler */
  onRemoveMember?: (member: OrganizationMember) => void
  /** Custom resend invite handler */
  onResendInvite?: (member: OrganizationMember) => void
  /** Custom success handler */
  onSuccess?: (result: any) => void
  /** Custom error handler */
  onError?: (error: FetchError) => void
  /** Custom CSS classes for different parts */
  classNames?: {
    card?: string
    avatar?: string
    info?: string
    name?: string
    email?: string
    role?: string
    meta?: string
    actions?: string
    button?: string
    menu?: string
    menuItem?: string
  }
}

export function OrganizationMemberCard({
  member,
  currentUserRole,
  currentUserId,
  variant = 'card',
  showActions = true,
  className,
  endpoints = {},
  onRoleChange,
  onRemoveMember,
  onResendInvite,
  onSuccess,
  onError,
  classNames,
}: OrganizationMemberCardProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, toast } = context || {}

  const [isLoading, setIsLoading] = useState(false)

  // Check if current user can manage this member
  const canManageMember = () => {
    if (!currentUserRole || !currentUserId) return false
    if (member.userId === currentUserId) return false // Can't manage self
    
    const roleHierarchy = { owner: 3, admin: 2, member: 1 }
    const currentUserLevel = roleHierarchy[currentUserRole as keyof typeof roleHierarchy] || 0
    const memberLevel = roleHierarchy[member.role as keyof typeof roleHierarchy] || 0
    
    return currentUserLevel > memberLevel
  }

  // Role icons and colors
  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return CrownIcon
      case 'admin':
        return ShieldIcon
      default:
        return UserIcon
    }
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const handleRoleChange = async (newRole: string) => {
    if (onRoleChange) {
      onRoleChange(member, newRole)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(endpoints.updateRole || `/api/organization/members/${member.id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to update member role"
        throw new Error(errorMessage)
      }

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.MEMBER_ROLE_UPDATED || "Member role updated successfully",
        })
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update member role"

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

  const handleRemoveMember = async () => {
    if (onRemoveMember) {
      onRemoveMember(member)
      return
    }

    if (!confirm(localization?.CONFIRM_REMOVE_MEMBER || "Are you sure you want to remove this member?")) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(endpoints.removeMember || `/api/organization/members/${member.id}`, {
        method: "DELETE",
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to remove member"
        throw new Error(errorMessage)
      }

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.MEMBER_REMOVED || "Member removed successfully",
        })
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to remove member"

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

  const handleResendInvite = async () => {
    if (onResendInvite) {
      onResendInvite(member)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(endpoints.resendInvite || `/api/organization/members/${member.id}/resend-invite`, {
        method: "POST",
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to resend invite"
        throw new Error(errorMessage)
      }

      // Show success toast
      if (toast) {
        toast({
          variant: "success",
          message: localization?.INVITE_RESENT || "Invite resent successfully",
        })
      }

      // Call custom success handler
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to resend invite"

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

  const RoleIcon = getRoleIcon(member.role)
  const displayName = member.name || member.username || member.email || localization?.UNNAMED_USER || "Unnamed User"
  const displayEmail = member.email && member.email !== displayName ? member.email : undefined

  const renderMemberInfo = () => (
    <>
      <UserAvatar
        user={member}
        size={variant === 'compact' ? 'sm' : 'md'}
        className={classNames?.avatar}
      />
      
      <div className={clsx("flex-1 min-w-0", classNames?.info)}>
        <div className="flex items-center gap-2">
          <p className={clsx(
            "font-medium truncate",
            variant === 'compact' ? "text-sm" : "text-base",
            classNames?.name
          )}>
            {displayName}
          </p>
          {member.userId === currentUserId && (
            <Badge variant="outline" className="text-xs">
              {localization?.YOU || "You"}
            </Badge>
          )}
        </div>
        
        {displayEmail && (
          <p className={clsx(
            "text-muted-foreground truncate",
            variant === 'compact' ? "text-xs" : "text-sm",
            classNames?.email
          )}>
            {displayEmail}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          <Badge 
            variant="secondary" 
            className={clsx(
              "text-xs",
              getRoleColor(member.role),
              classNames?.role
            )}
          >
            <RoleIcon className="h-3 w-3 mr-1" />
            {member.role}
          </Badge>
          
          {member.status === 'invited' && (
            <Badge variant="outline" className="text-xs">
              {localization?.INVITED || "Invited"}
            </Badge>
          )}
          
          {member.status === 'suspended' && (
            <Badge variant="destructive" className="text-xs">
              {localization?.SUSPENDED || "Suspended"}
            </Badge>
          )}
        </div>
        
        {(member.joinedAt || member.lastActive) && (
          <div className={clsx(
            "flex items-center gap-4 mt-2 text-muted-foreground",
            variant === 'compact' ? "text-xs" : "text-sm",
            classNames?.meta
          )}>
            {member.joinedAt && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <span>
                  {localization?.JOINED || "Joined"} {new Date(member.joinedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {member.lastActive && (
              <div className="flex items-center gap-1">
                <span>
                  {localization?.LAST_ACTIVE || "Last active"} {new Date(member.lastActive).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )

  const renderActions = () => {
    if (!showActions || !canManageMember()) return null

    return (
      <div className={clsx("flex items-center", classNames?.actions)}>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className={classNames?.button}
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className={classNames?.menu}>
            {/* Role changes */}
            {member.role !== 'admin' && currentUserRole === 'owner' && (
              <DropdownMenuItem
                onClick={() => handleRoleChange('admin')}
                className={classNames?.menuItem}
              >
                <ShieldIcon className="mr-2 h-4 w-4" />
                {localization?.MAKE_ADMIN || "Make admin"}
              </DropdownMenuItem>
            )}
            
            {member.role !== 'member' && (
              <DropdownMenuItem
                onClick={() => handleRoleChange('member')}
                className={classNames?.menuItem}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                {localization?.MAKE_MEMBER || "Make member"}
              </DropdownMenuItem>
            )}
            
            {/* Resend invite for invited members */}
            {member.status === 'invited' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleResendInvite}
                  className={classNames?.menuItem}
                >
                  <MailIcon className="mr-2 h-4 w-4" />
                  {localization?.RESEND_INVITE || "Resend invite"}
                </DropdownMenuItem>
              </>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Remove member */}
            <DropdownMenuItem
              onClick={handleRemoveMember}
              className={clsx("text-destructive", classNames?.menuItem)}
            >
              <UserXIcon className="mr-2 h-4 w-4" />
              {localization?.REMOVE_MEMBER || "Remove member"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className={clsx(
        "flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors",
        classNames?.card,
        className
      )}>
        {renderMemberInfo()}
        {renderActions()}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={clsx(
        "flex items-center gap-2 p-2",
        classNames?.card,
        className
      )}>
        {renderMemberInfo()}
        {renderActions()}
      </div>
    )
  }

  // Card variant (default)
  return (
    <Card className={clsx("p-4", classNames?.card, className)}>
      <div className="flex items-start gap-3">
        {renderMemberInfo()}
        {renderActions()}
      </div>
    </Card>
  )
}

"use client"

import * as React from "react"
import { useState, useContext } from "react"
import clsx from "clsx"
import { 
  BuildingIcon, 
  ChevronDownIcon, 
  CheckIcon,
  PlusIcon,
  SettingsIcon,
  LogOutIcon,
  CrownIcon,
  ShieldIcon,
  UserIcon
} from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Button } from "../components/button"
import { Badge } from "../components/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "../components/dropdown-menu"

export interface Organization {
  id: string
  name: string
  slug?: string
  image?: string | null
  role: string
  memberCount?: number
  description?: string
}

export interface OrganizationSwitcherProps {
  /** Current organization */
  currentOrganization?: Organization
  /** Available organizations */
  organizations?: Organization[]
  /** Whether to show user's personal account */
  showPersonalAccount?: boolean
  /** Personal account data */
  personalAccount?: {
    id: string
    name: string
    email?: string
    image?: string | null
  }
  /** Custom CSS classes */
  className?: string
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show organization info in button */
  showOrgInfo?: boolean
  /** Whether to show the dropdown arrow */
  showArrow?: boolean
  /** Maximum width for organization names */
  maxWidth?: string
  /** Custom organization switch handler */
  onOrganizationSwitch?: (organization: Organization | null) => void
  /** Custom create organization handler */
  onCreateOrganization?: () => void
  /** Custom manage organization handler */
  onManageOrganization?: (organization: Organization) => void
  /** Custom leave organization handler */
  onLeaveOrganization?: (organization: Organization) => void
  /** Custom CSS classes for different parts */
  classNames?: {
    button?: string
    menu?: string
    menuItem?: string
    separator?: string
    orgInfo?: string
    badge?: string
  }
}

export function OrganizationSwitcher({
  currentOrganization,
  organizations = [],
  showPersonalAccount = true,
  personalAccount,
  className,
  variant = 'default',
  size = 'md',
  showOrgInfo = true,
  showArrow = true,
  maxWidth = "200px",
  onOrganizationSwitch,
  onCreateOrganization,
  onManageOrganization,
  onLeaveOrganization,
  classNames,
}: OrganizationSwitcherProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, organization: orgContext } = context || {}

  const handleSwitch = (org: Organization | null) => {
    if (onOrganizationSwitch) {
      onOrganizationSwitch(org)
    } else {
      // Default behavior - redirect to organization
      const path = org 
        ? `${orgContext?.basePath || '/organization'}/${org.slug || org.id}`
        : '/account'
      window.location.href = path
    }
  }

  const handleCreateOrg = () => {
    if (onCreateOrganization) {
      onCreateOrganization()
    } else {
      // Default behavior - redirect to create organization page
      window.location.href = `${orgContext?.basePath || '/organization'}/create`
    }
  }

  const handleManageOrg = (org: Organization) => {
    if (onManageOrganization) {
      onManageOrganization(org)
    } else {
      // Default behavior - redirect to organization settings
      window.location.href = `${orgContext?.basePath || '/organization'}/${org.slug || org.id}/settings`
    }
  }

  const handleLeaveOrg = (org: Organization) => {
    if (onLeaveOrganization) {
      onLeaveOrganization(org)
    }
  }

  // Role icons
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

  // Role colors
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'text-yellow-600'
      case 'admin':
        return 'text-blue-600'
      default:
        return 'text-muted-foreground'
    }
  }

  // Button variant styles
  const buttonVariants = {
    default: "inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    ghost: "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    outline: "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  }

  // Current display info
  const currentDisplay = currentOrganization || personalAccount
  const displayName = currentOrganization?.name || personalAccount?.name || localization?.PERSONAL_ACCOUNT || "Personal Account"
  const displayImage = currentOrganization?.image || personalAccount?.image

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={clsx(
            buttonVariants[variant],
            classNames?.button,
            className
          )}
          style={{ maxWidth }}
          aria-label={localization?.SWITCH_ORGANIZATION || "Switch organization"}
        >
          {/* Organization/Account Image */}
          {displayImage ? (
            <img 
              src={displayImage} 
              alt={displayName}
              className="h-5 w-5 rounded"
            />
          ) : (
            <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
              {currentOrganization ? (
                <BuildingIcon className="h-3 w-3 text-primary-foreground" />
              ) : (
                <UserIcon className="h-3 w-3 text-primary-foreground" />
              )}
            </div>
          )}
          
          {showOrgInfo && (
            <div className={clsx(
              "flex flex-col items-start text-left min-w-0",
              classNames?.orgInfo
            )}>
              <span className="text-sm font-medium truncate">
                {displayName}
              </span>
              {currentOrganization && (
                <span className="text-xs text-muted-foreground">
                  {currentOrganization.role}
                </span>
              )}
            </div>
          )}
          
          {showArrow && (
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground ml-auto" />
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className={clsx("w-64", classNames?.menu)}
      >
        {/* Personal Account */}
        {showPersonalAccount && personalAccount && (
          <>
            <DropdownMenuLabel className="font-normal">
              {localization?.PERSONAL_ACCOUNT || "Personal Account"}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => handleSwitch(null)}
              className={clsx("flex items-center justify-between", classNames?.menuItem)}
            >
              <div className="flex items-center gap-3">
                {personalAccount.image ? (
                  <img 
                    src={personalAccount.image} 
                    alt={personalAccount.name}
                    className="h-6 w-6 rounded"
                  />
                ) : (
                  <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{personalAccount.name}</p>
                  {personalAccount.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {personalAccount.email}
                    </p>
                  )}
                </div>
              </div>
              {!currentOrganization && (
                <CheckIcon className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
            
            {organizations.length > 0 && (
              <DropdownMenuSeparator className={classNames?.separator} />
            )}
          </>
        )}

        {/* Organizations */}
        {organizations.length > 0 && (
          <>
            <DropdownMenuLabel className="font-normal">
              {localization?.ORGANIZATIONS || "Organizations"}
            </DropdownMenuLabel>
            {organizations.map((org) => {
              const RoleIcon = getRoleIcon(org.role)
              const isActive = currentOrganization?.id === org.id
              
              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSwitch(org)}
                  className={clsx("flex items-center justify-between", classNames?.menuItem)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {org.image ? (
                      <img 
                        src={org.image} 
                        alt={org.name}
                        className="h-6 w-6 rounded"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                        <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{org.name}</p>
                        <RoleIcon className={clsx("h-3 w-3", getRoleColor(org.role))} />
                      </div>
                      {org.memberCount && (
                        <p className="text-xs text-muted-foreground">
                          {org.memberCount} {localization?.MEMBERS || "members"}
                        </p>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <CheckIcon className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </>
        )}

        <DropdownMenuSeparator className={classNames?.separator} />

        {/* Actions */}
        <DropdownMenuItem
          onClick={handleCreateOrg}
          className={clsx("flex items-center", classNames?.menuItem)}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {localization?.CREATE_ORGANIZATION || "Create organization"}
        </DropdownMenuItem>

        {/* Current organization actions */}
        {currentOrganization && (
          <>
            <DropdownMenuItem
              onClick={() => handleManageOrg(currentOrganization)}
              className={clsx("flex items-center", classNames?.menuItem)}
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              {localization?.MANAGE_ORGANIZATION || "Manage organization"}
            </DropdownMenuItem>

            {currentOrganization.role !== 'owner' && (
              <DropdownMenuItem
                onClick={() => handleLeaveOrg(currentOrganization)}
                className={clsx("flex items-center text-destructive", classNames?.menuItem)}
              >
                <LogOutIcon className="mr-2 h-4 w-4" />
                {localization?.LEAVE_ORGANIZATION || "Leave organization"}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

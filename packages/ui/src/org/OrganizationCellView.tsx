"use client"

import * as React from "react"
import { cn } from "../lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "../components/avatar"

export function OrganizationCellView({
  organization,
  isPending,
  localization,
  className,
}: {
  organization?: {
    id: string
    name?: string | null
    slug?: string | null
    logo?: string | null
    createdAt?: Date
  }
  isPending?: boolean
  localization?: Partial<Record<string, string>>
  className?: string
}) {
  if (isPending) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Avatar className="h-8 w-8" />
        <div className="grid gap-1">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (!organization) return null

  const initials = (organization.name || organization.slug || "?").slice(0, 2).toUpperCase()

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className="h-8 w-8">
        {organization.logo ? (
          <AvatarImage src={organization.logo} alt={organization.name || organization.slug || "Org"} />
        ) : (
          <AvatarFallback>{initials}</AvatarFallback>
        )}
      </Avatar>
      <div className="grid leading-tight">
        <span className="text-sm font-medium text-foreground">{organization.name || organization.slug || localization?.ORGANIZATION || "Organization"}</span>
        {organization.slug && <span className="text-xs text-muted-foreground">{organization.slug}</span>}
      </div>
    </div>
  )
}


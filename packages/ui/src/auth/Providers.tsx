"use client"

import * as React from "react"
import { useContext } from "react"
import clsx from "clsx"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { ProviderButton } from "./provider-button"
import type { OAuthProviderUIConfig } from "../types"

export interface ProvidersProps {
  /** List of OAuth providers to display */
  providers?: OAuthProviderUIConfig[]
  /** Custom callback URL after authentication */
  callbackUrl?: string
  /** Custom CSS classes */
  className?: string
  /** Layout direction */
  direction?: 'vertical' | 'horizontal'
  /** Button variant for all providers */
  variant?: 'default' | 'outline' | 'ghost'
  /** Button size for all providers */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show provider icons */
  showIcons?: boolean
  /** Whether to show provider names */
  showNames?: boolean
  /** Maximum number of providers to show before collapsing */
  maxVisible?: number
  /** Custom separator between providers (for horizontal layout) */
  separator?: React.ReactNode
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string
    provider?: string
    separator?: string
    showMore?: string
  }
  /** Custom click handler for individual providers */
  onProviderClick?: (provider: OAuthProviderUIConfig, e: React.MouseEvent) => void
}

export function Providers({
  providers: providersProp,
  callbackUrl,
  className,
  direction = 'vertical',
  variant = 'default',
  size = 'md',
  showIcons = true,
  showNames = true,
  maxVisible,
  separator,
  classNames,
  onProviderClick,
}: ProvidersProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}
  
  // Get providers from context if not provided
  const contextProviders = context?.social?.providers || []
  const providers = providersProp || contextProviders

  const [showAll, setShowAll] = React.useState(false)

  if (!providers?.length) {
    return null
  }

  // Determine which providers to show
  const visibleProviders = maxVisible && !showAll 
    ? providers.slice(0, maxVisible)
    : providers
  
  const hasMore = maxVisible && providers.length > maxVisible && !showAll

  // Container styles based on direction
  const containerStyles = {
    vertical: "flex flex-col gap-2",
    horizontal: "flex flex-wrap items-center gap-2",
  }[direction]

  const handleProviderClick = (provider: OAuthProviderUIConfig) => (e: React.MouseEvent) => {
    if (onProviderClick) {
      onProviderClick(provider, e)
    }
  }

  return (
    <div className={clsx(containerStyles, classNames?.container, className)}>
      {visibleProviders.map((provider, index) => (
        <React.Fragment key={provider.id}>
          {/* Add separator for horizontal layout (except for first item) */}
          {direction === 'horizontal' && index > 0 && separator && (
            <div className={clsx("flex items-center", classNames?.separator)}>
              {separator}
            </div>
          )}
          
          <ProviderButton
            provider={provider}
            callbackUrl={callbackUrl}
            variant={variant}
            size={size}
            showIcon={showIcons}
            showName={showNames}
            onClick={handleProviderClick(provider)}
            className={classNames?.provider}
          />
        </React.Fragment>
      ))}
      
      {/* Show more button if there are hidden providers */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={clsx(
            "flex h-10 items-center justify-center gap-2 rounded-md border border-dashed border-border bg-transparent px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            classNames?.showMore
          )}
        >
          {localization?.SHOW_MORE_PROVIDERS || `Show ${providers.length - maxVisible!} more`}
        </button>
      )}
    </div>
  )
}

// Divider component for separating providers from other auth methods
export interface ProviderDividerProps {
  /** Custom text for the divider */
  text?: string
  /** Custom CSS classes */
  className?: string
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string
    line?: string
    text?: string
  }
}

export function ProviderDivider({
  text,
  className,
  classNames,
}: ProviderDividerProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization } = context || {}
  
  const dividerText = text || localization?.OR_CONTINUE_WITH_EMAIL || "or continue with email"

  return (
    <div className={clsx("relative text-center", classNames?.container, className)}>
      <div className={clsx(
        "absolute left-0 right-0 top-1/2 -z-10 h-px -translate-y-1/2 bg-border",
        classNames?.line
      )} />
      <span className={clsx(
        "bg-background px-2 text-xs text-muted-foreground",
        classNames?.text
      )}>
        {dividerText}
      </span>
    </div>
  )
}

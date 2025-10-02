"use client"

import * as React from "react"
import { useState, useContext } from "react"
import clsx from "clsx"
import { 
  BuildingIcon, 
  UsersIcon, 
  SettingsIcon, 
  CreditCardIcon,
  ShieldIcon,
  KeyIcon,
  MailIcon,
  MenuIcon,
  XIcon
} from "lucide-react"
import { AuthUIProviderContext } from "../lib/auth-ui-provider"
import { Button } from "../components/button"
import { Card } from "../components/card"
import type { OrganizationView as OrganizationViewType } from "../types"

export interface OrganizationViewProps {
  /** Current active view */
  currentView?: OrganizationViewType
  /** Organization data */
  organization?: {
    id?: string
    name?: string
    slug?: string
    description?: string
    image?: string
    memberCount?: number
    role?: string
    [key: string]: any
  }
  /** Custom CSS classes */
  className?: string
  /** Layout variant */
  variant?: 'sidebar' | 'tabs' | 'mobile'
  /** Whether to show navigation */
  showNavigation?: boolean
  /** Custom navigation items */
  navigationItems?: Array<{
    key: OrganizationViewType
    label: string
    icon?: React.ComponentType<{ className?: string }>
    href?: string
    disabled?: boolean
    requiresRole?: string[]
  }>
  /** Main content */
  children: React.ReactNode
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string
    navigation?: string
    sidebar?: string
    tabs?: string
    mobileMenu?: string
    navItem?: string
    content?: string
  }
  /** Navigation item click handler */
  onNavigate?: (view: OrganizationViewType) => void
}

export function OrganizationView({
  currentView = 'overview',
  organization,
  className,
  variant = 'sidebar',
  showNavigation = true,
  navigationItems,
  children,
  classNames,
  onNavigate,
}: OrganizationViewProps) {
  const context = useContext(AuthUIProviderContext)
  const { localization, organization: orgContext } = context || {}
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Default navigation items
  const defaultNavigationItems = [
    {
      key: 'overview' as OrganizationViewType,
      label: localization?.OVERVIEW || "Overview",
      icon: BuildingIcon,
      href: orgContext ? `${orgContext.basePath}/${orgContext.viewPaths.overview}` : "/organization",
    },
    {
      key: 'members' as OrganizationViewType,
      label: localization?.MEMBERS || "Members",
      icon: UsersIcon,
      href: orgContext ? `${orgContext.basePath}/${orgContext.viewPaths.members}` : "/organization/members",
    },
    {
      key: 'invitations' as OrganizationViewType,
      label: localization?.INVITATIONS || "Invitations",
      icon: MailIcon,
      href: orgContext ? `${orgContext.basePath}/${orgContext.viewPaths.invitations}` : "/organization/invitations",
    },
    {
      key: 'settings' as OrganizationViewType,
      label: localization?.SETTINGS || "Settings",
      icon: SettingsIcon,
      href: orgContext ? `${orgContext.basePath}/${orgContext.viewPaths.settings}` : "/organization/settings",
      requiresRole: ['admin', 'owner'],
    },
    {
      key: 'billing' as OrganizationViewType,
      label: localization?.BILLING || "Billing",
      icon: CreditCardIcon,
      href: orgContext ? `${orgContext.basePath}/${orgContext.viewPaths.billing}` : "/organization/billing",
      requiresRole: ['admin', 'owner'],
    },
    {
      key: 'security' as OrganizationViewType,
      label: localization?.SECURITY || "Security",
      icon: ShieldIcon,
      href: orgContext ? `${orgContext.basePath}/${orgContext.viewPaths.security}` : "/organization/security",
      requiresRole: ['admin', 'owner'],
    },
    {
      key: 'api-keys' as OrganizationViewType,
      label: localization?.API_KEYS || "API Keys",
      icon: KeyIcon,
      href: orgContext ? `${orgContext.basePath}/${orgContext.viewPaths["api-keys"]}` : "/organization/api-keys",
      requiresRole: ['admin', 'owner'],
    },
  ]

  const navItems = navigationItems || defaultNavigationItems

  // Filter navigation items based on user role
  const filteredNavItems = navItems.filter(item => {
    if (!item.requiresRole) return true
    if (!organization?.role) return false
    return item.requiresRole.includes(organization.role)
  })

  const handleNavigate = (view: OrganizationViewType, href?: string) => {
    if (onNavigate) {
      onNavigate(view)
    } else if (href) {
      window.location.href = href
    }
    setIsMobileMenuOpen(false)
  }

  const renderNavigationItem = (item: typeof filteredNavItems[0], isMobile = false) => {
    const Icon = item.icon
    const isActive = currentView === item.key
    
    return (
      <button
        key={item.key}
        onClick={() => handleNavigate(item.key, item.href)}
        disabled={item.disabled}
        className={clsx(
          "flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
          item.disabled && "opacity-50 cursor-not-allowed",
          isMobile && "text-base py-3",
          classNames?.navItem
        )}
      >
        {Icon && <Icon className={clsx("h-4 w-4", isMobile && "h-5 w-5")} />}
        {item.label}
      </button>
    )
  }

  const renderSidebarNavigation = () => (
    <nav className={clsx(
      "w-64 space-y-1 p-4",
      classNames?.sidebar,
      classNames?.navigation
    )}>
      {/* Organization header */}
      {organization && (
        <div className="mb-6 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {organization.image ? (
              <img 
                src={organization.image} 
                alt={organization.name}
                className="h-8 w-8 rounded"
              />
            ) : (
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                <BuildingIcon className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{organization.name}</p>
              <p className="text-xs text-muted-foreground">
                {organization.memberCount} {localization?.MEMBERS || "members"}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {filteredNavItems.map(item => renderNavigationItem(item))}
    </nav>
  )

  const renderTabsNavigation = () => (
    <nav className={clsx(
      "border-b border-border",
      classNames?.tabs,
      classNames?.navigation
    )}>
      <div className="flex space-x-8 px-4">
        {filteredNavItems.map(item => {
          const Icon = item.icon
          const isActive = currentView === item.key
          
          return (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.key, item.href)}
              disabled={item.disabled}
              className={clsx(
                "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground",
                item.disabled && "opacity-50 cursor-not-allowed",
                classNames?.navItem
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )

  const renderMobileNavigation = () => (
    <>
      {/* Mobile menu button */}
      <div className="flex items-center justify-between p-4 border-b lg:hidden">
        <div className="flex items-center gap-3">
          {organization?.image ? (
            <img 
              src={organization.image} 
              alt={organization.name}
              className="h-6 w-6 rounded"
            />
          ) : (
            <BuildingIcon className="h-6 w-6 text-muted-foreground" />
          )}
          <h1 className="text-lg font-semibold">
            {organization?.name || filteredNavItems.find(item => item.key === currentView)?.label || localization?.ORGANIZATION || "Organization"}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className={clsx(
            "fixed left-0 top-0 h-full w-80 bg-background border-r shadow-lg",
            classNames?.mobileMenu
          )}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                {organization?.image ? (
                  <img 
                    src={organization.image} 
                    alt={organization.name}
                    className="h-6 w-6 rounded"
                  />
                ) : (
                  <BuildingIcon className="h-6 w-6 text-muted-foreground" />
                )}
                <h2 className="text-lg font-semibold">
                  {organization?.name || localization?.ORGANIZATION || "Organization"}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <XIcon className="h-5 w-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-2">
              {filteredNavItems.map(item => renderNavigationItem(item, true))}
            </nav>
          </div>
        </div>
      )}
    </>
  )

  if (variant === 'tabs') {
    return (
      <div className={clsx("min-h-screen bg-background", classNames?.container, className)}>
        {showNavigation && renderTabsNavigation()}
        <main className={clsx("p-4", classNames?.content)}>
          {children}
        </main>
      </div>
    )
  }

  if (variant === 'mobile') {
    return (
      <div className={clsx("min-h-screen bg-background", classNames?.container, className)}>
        {showNavigation && renderMobileNavigation()}
        <main className={clsx("p-4", classNames?.content)}>
          {children}
        </main>
      </div>
    )
  }

  // Sidebar variant (default)
  return (
    <div className={clsx(
      "min-h-screen bg-background flex",
      classNames?.container,
      className
    )}>
      {showNavigation && (
        <aside className="border-r border-border bg-muted/10">
          {renderSidebarNavigation()}
        </aside>
      )}
      <main className={clsx("flex-1 p-6", classNames?.content)}>
        {children}
      </main>
    </div>
  )
}

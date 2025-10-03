"use client";

import * as React from "react";
import { useState, useContext } from "react";
import clsx from "clsx";
import {
  UserIcon,
  ShieldIcon,
  KeyIcon,
  CreditCardIcon,
  BuildingIcon,
  SettingsIcon,
  DownloadIcon,
  TrashIcon,
  MenuIcon,
  XIcon,
} from "lucide-react";
import { AuthUIProviderContext } from "../lib/auth-ui-provider";
import { Button } from "../components/button";
import { Card } from "../components/card";
import type { AccountView as AccountViewType } from "../types";

export interface AccountViewProps {
  /** Current active view */
  currentView?: AccountViewType;
  /** Custom CSS classes */
  className?: string;
  /** Layout variant */
  variant?: "sidebar" | "tabs" | "mobile";
  /** Whether to show navigation */
  showNavigation?: boolean;
  /** Custom navigation items */
  navigationItems?: Array<{
    key: AccountViewType;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    href?: string;
    disabled?: boolean;
  }>;
  /** Main content */
  children: React.ReactNode;
  /** Custom CSS classes for different parts */
  classNames?: {
    container?: string;
    navigation?: string;
    sidebar?: string;
    tabs?: string;
    mobileMenu?: string;
    navItem?: string;
    content?: string;
  };
  /** Navigation item click handler */
  onNavigate?: (view: AccountViewType) => void;
}

export function AccountView({
  currentView = "profile",
  className,
  variant = "sidebar",
  showNavigation = true,
  navigationItems,
  children,
  classNames,
  onNavigate,
}: AccountViewProps) {
  const context = useContext(AuthUIProviderContext);
  const { localization, account } = context || {};

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Default navigation items
  const defaultNavigationItems = [
    {
      key: "profile" as AccountViewType,
      label: localization?.PROFILE || "Profile",
      icon: UserIcon,
      href: account
        ? `${account.basePath}/${account.viewPaths.profile}`
        : "/account/profile",
      disabled: false,
    },
    {
      key: "security" as AccountViewType,
      label: localization?.SECURITY || "Security",
      icon: ShieldIcon,
      href: account
        ? `${account.basePath}/${account.viewPaths.security}`
        : "/account/security",
      disabled: false,
    },
    {
      key: "api-keys" as AccountViewType,
      label: localization?.API_KEYS || "API Keys",
      icon: KeyIcon,
      href: account
        ? `${account.basePath}/${account.viewPaths["api-keys"]}`
        : "/account/api-keys",
      disabled: false,
    },
    {
      key: "organizations" as AccountViewType,
      label: localization?.ORGANIZATIONS || "Organizations",
      icon: BuildingIcon,
      href: account
        ? `${account.basePath}/${account.viewPaths.organizations}`
        : "/account/organizations",
      disabled: false,
    },
    {
      key: "billing" as AccountViewType,
      label: localization?.BILLING || "Billing",
      icon: CreditCardIcon,
      href: account
        ? `${account.basePath}/${account.viewPaths.billing}`
        : "/account/billing",
      disabled: false,
    },
    {
      key: "preferences" as AccountViewType,
      label: localization?.PREFERENCES || "Preferences",
      icon: SettingsIcon,
      href: account
        ? `${account.basePath}/${account.viewPaths.preferences}`
        : "/account/preferences",
      disabled: false,
    },
    {
      key: "data-export" as AccountViewType,
      label: localization?.DATA_EXPORT || "Data Export",
      icon: DownloadIcon,
      href: account
        ? `${account.basePath}/${account.viewPaths["data-export"]}`
        : "/account/data-export",
    },
    {
      key: "delete-account" as AccountViewType,
      label: localization?.DELETE_ACCOUNT || "Delete Account",
      icon: TrashIcon,
      href: account
        ? `${account.basePath}/${account.viewPaths["delete-account"]}`
        : "/account/delete",
    },
  ];

  const navItems = navigationItems || defaultNavigationItems;

  const handleNavigate = (view: AccountViewType, href?: string) => {
    if (onNavigate) {
      onNavigate(view);
    } else if (href) {
      window.location.href = href;
    }
    setIsMobileMenuOpen(false);
  };

  const renderNavigationItem = (
    item: (typeof navItems)[0],
    isMobile = false
  ) => {
    const Icon = item.icon;
    const isActive = currentView === item.key;

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
    );
  };

  const renderSidebarNavigation = () => (
    <nav
      className={clsx(
        "w-64 space-y-1 p-4",
        classNames?.sidebar,
        classNames?.navigation
      )}
    >
      {navItems.map((item) => renderNavigationItem(item))}
    </nav>
  );

  const renderTabsNavigation = () => (
    <nav
      className={clsx(
        "border-b border-border",
        classNames?.tabs,
        classNames?.navigation
      )}
    >
      <div className="flex space-x-8 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.key;

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
          );
        })}
      </div>
    </nav>
  );

  const renderMobileNavigation = () => (
    <>
      {/* Mobile menu button */}
      <div className="flex items-center justify-between p-4 border-b lg:hidden">
        <h1 className="text-lg font-semibold">
          {navItems.find((item) => item.key === currentView)?.label ||
            localization?.ACCOUNT ||
            "Account"}
        </h1>
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
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className={clsx(
              "fixed left-0 top-0 h-full w-80 bg-background border-r shadow-lg",
              classNames?.mobileMenu
            )}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {localization?.ACCOUNT || "Account"}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <XIcon className="h-5 w-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-2">
              {navItems.map((item) => renderNavigationItem(item, true))}
            </nav>
          </div>
        </div>
      )}
    </>
  );

  if (variant === "tabs") {
    return (
      <div
        className={clsx(
          "min-h-screen bg-background",
          classNames?.container,
          className
        )}
      >
        {showNavigation && renderTabsNavigation()}
        <main className={clsx("p-4", classNames?.content)}>{children}</main>
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div
        className={clsx(
          "min-h-screen bg-background",
          classNames?.container,
          className
        )}
      >
        {showNavigation && renderMobileNavigation()}
        <main className={clsx("p-4", classNames?.content)}>{children}</main>
      </div>
    );
  }

  // Sidebar variant (default)
  return (
    <div
      className={clsx(
        "min-h-screen bg-background flex",
        classNames?.container,
        className
      )}
    >
      {showNavigation && (
        <aside className="border-r border-border bg-muted/10">
          {renderSidebarNavigation()}
        </aside>
      )}
      <main className={clsx("flex-1 p-6", classNames?.content)}>
        {children}
      </main>
    </div>
  );
}

"use client";

import * as React from "react";
import { useContext } from "react";
import clsx from "clsx";
import { AuthUIProviderContext } from "../lib/auth-ui-provider";
import { ProviderIcons } from "../icons";
import type { OAuthProviderUIConfig } from "../types";

export interface ProviderButtonProps {
  /** OAuth provider configuration */
  provider: OAuthProviderUIConfig;
  /** Custom callback URL after authentication */
  callbackUrl?: string;
  /** Custom CSS classes */
  className?: string;
  /** Custom click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Custom children to override default text */
  children?: React.ReactNode;
  /** Button variant style */
  variant?: "default" | "outline" | "ghost";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Whether to show provider icon */
  showIcon?: boolean;
  /** Whether to show provider name */
  showName?: boolean;
  /** Custom CSS classes for different parts */
  classNames?: {
    button?: string;
    icon?: string;
    text?: string;
  };
}

export function ProviderButton({
  provider,
  callbackUrl,
  className,
  onClick,
  children,
  variant = "default",
  size = "md",
  showIcon = true,
  showName = true,
  classNames,
}: ProviderButtonProps) {
  const context = useContext(AuthUIProviderContext);
  const { basePath, localization, navigate } = context || {};

  const Icon = provider.icon ?? ProviderIcons[provider.id];

  // Build the OAuth start URL
  const authUrl = `/api/auth/oauth/${encodeURIComponent(provider.id)}/start${
    callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
  }`;

  // Provider-specific brand styling
  const brandStyles: Record<string, string> = {
    github:
      "border-[#111827] bg-[#111827] text-white hover:bg-[#0b1220] focus-visible:ring-white/40",
    gitlab:
      "bg-[#e24329] text-white border-[#e24329] hover:bg-[#d63324] focus-visible:ring-[#e24329]/40",
    google:
      "bg-white text-[#111827] border-[#e5e7eb] hover:bg-[#f9fafb] focus-visible:ring-[#4285f4]/40",
    microsoft:
      "bg-white text-[#111827] border-[#e5e7eb] hover:bg-[#f9fafb] focus-visible:ring-[#0078d4]/40",
    twitter:
      "bg-[#0ea5e9] text-white border-[#0ea5e9] hover:bg-[#0284c7] focus-visible:ring-[#0ea5e9]/40",
    discord:
      "bg-[#5865f2] text-white border-[#5865f2] hover:bg-[#4752c4] focus-visible:ring-[#5865f2]/40",
    apple:
      "bg-black text-white border-black hover:bg-gray-800 focus-visible:ring-white/40",
    facebook:
      "bg-[#1877f2] text-white border-[#1877f2] hover:bg-[#166fe5] focus-visible:ring-[#1877f2]/40",
  };

  // Base button styles
  const baseStyles =
    "flex items-center justify-center gap-2 rounded-md border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50";

  // Size variants
  const sizeStyles = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  }[size];

  // Variant styles (when not using brand-specific styling)
  const variantStyles = {
    default: "bg-background text-foreground border-border hover:bg-muted",
    outline: "bg-transparent text-foreground border-border hover:bg-muted",
    ghost: "bg-transparent text-foreground border-transparent hover:bg-muted",
  }[variant];

  // Use brand styling if available, otherwise use variant styling
  const brandStyle = brandStyles[provider.id];
  const buttonStyles = brandStyle || variantStyles;

  // Default provider name formatting
  const providerName =
    provider.name || provider.id.charAt(0).toUpperCase() + provider.id.slice(1);
  const defaultText =
    localization?.CONTINUE_WITH_PROVIDER?.replace("{provider}", providerName) ||
    `Continue with ${providerName}`;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      return;
    }

    // Default behavior: navigate to OAuth URL
    if (navigate) {
      e.preventDefault();
      navigate(authUrl);
    }
  };

  return (
    <button
      type="button"
      className={clsx(
        baseStyles,
        sizeStyles,
        buttonStyles,
        classNames?.button,
        className
      )}
      onClick={handleClick}
      data-provider={provider.id}
      aria-label={`Sign in with ${providerName}`}
    >
      {showIcon && Icon && (
        <Icon
          width={16}
          height={16}
          aria-hidden="true"
          className={clsx("shrink-0", classNames?.icon)}
        />
      )}
      {showName && (
        <span className={clsx("truncate", classNames?.text)}>
          {children || defaultText}
        </span>
      )}
    </button>
  );
}

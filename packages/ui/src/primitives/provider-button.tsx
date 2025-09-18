import * as React from "react";
import clsx from "clsx";
import { ProviderIcons } from "../icons";

export type ProviderButtonProps = {
  id: string;
  children?: React.ReactNode;
  href?: string;
  callbackUrl?: string | undefined;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export function ProviderButton({
  id,
  children,
  href,
  callbackUrl,
  className,
  onClick,
  icon,
}: ProviderButtonProps) {
  const Icon = icon ?? ProviderIcons[id];
  const to =
    href ??
    `/api/auth/oauth/${encodeURIComponent(id)}/start${
      callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
    }`;
  const brand: Record<string, string> = {
    github:
      "border-[#111827] bg-[#111827] text-white hover:bg-[#0b1220] focus-visible:ring-white/40",
    gitlab: "bg-[#e24329] text-white border-[#e24329] hover:bg-[#d63324]",
    google: "bg-white text-[#111827] border-[#e5e7eb] hover:bg-[#f9fafb]",
    microsoft: "bg-white text-[#111827] border-[#e5e7eb] hover:bg-[#f9fafb]",
    twitter: "bg-[#0ea5e9] text-white border-[#0ea5e9] hover:bg-[#0284c7]",
  };
  const base =
    "flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";
  return (
    <a
      href={to}
      data-provider={id}
      className={clsx(base, brand[id] ?? undefined, className)}
      onClick={onClick}
    >
      {Icon && <Icon width={16} height={16} aria-hidden="true" />}
      <span>
        {children ?? `Continue with ${id[0]?.toUpperCase()}${id.slice(1)}`}
      </span>
    </a>
  );
}
